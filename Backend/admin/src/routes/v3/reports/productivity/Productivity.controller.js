const _ = require('underscore');
const moment = require('moment');
const momentTz = require('moment-timezone');
const axios = require('axios');


const PrService = require('./Productivity.model');
const PrValidator = require('./Productivity.validator');
const Common = require('../../../../utils/helpers/Common');
const actionsTracker = require('../../services/actionsTracker');
const sendResponse = require('../../../../utils/myService').sendResponse;
const { reportMessage } = require("../../../../utils/helpers/LanguageTranslate");
const config = require('../../../../../../config/config');

class PrController {
    async getProductivity(req, res, next) {
        try {
            actionsTracker(req, 'Productivity report requested (?).', [req.query]);
            let manager_id = req.decoded.employee_id || null;
            if (req.decoded.role === 'Employee') {
                req.query.employee_id = req?.decoded?.employee_id?.toString();
            } else if (req.query.employee_id == req.decoded.employee_id) {
                manager_id = null;
            }

            const { organization_id, role_id, language, productive_hours } = req.decoded;
            let { location_id, department_id, employee_id, startDate, endDate, nonAdminId } = await PrValidator.getProductivity().validateAsync(req.query);
            if (nonAdminId) manager_id = nonAdminId;
            let employee_ids = null;
            let search_type, search_value;
            if (employee_id) {
                employee_id = employee_id.split(',').map(x => +x);
                search_type = "employee_id";
                search_value = employee_id;
            } else if (department_id) {
                search_type = "department_id";
                search_value = department_id;
            } else if (location_id) {
                search_type = "location_id";
                search_value = location_id;
            } else {
                search_type = "organization";
                search_value = organization_id;
            }
            if( employee_id && nonAdminId) {
                let isEmployeeAssigned = await PrService.getEmployeeAssignedNonAdminId(employee_id, nonAdminId);
                if (isEmployeeAssigned.length === 0) {
                    return sendResponse(res, 400, null, reportMessage.find(x => x.id === "1")[language] || reportMessage.find(x => x.id === "1")["en"], null);
                }
            }
            if (manager_id && req.decoded.role !== 'Employee') {
                employee_ids = _.pluck(await PrService.getEmployeeAssignedToManager(manager_id, role_id), 'employee_id');

                if (employee_ids.length === 0) {
                    return sendResponse(res, 400, null, reportMessage.find(x => x.id === "1")[language] || reportMessage.find(x => x.id === "1")["en"], null);
                }
            }
            const productivity = await PrService.getProductivity({ search_type, search_value, startDate, endDate, employee_ids });
            let total_computer_activities_time = 0;
            let total_office_time = 0;
            let total_custom_time = 0;
            let total_custom_time_special = 0;
            let total_productive_duration = 0;
            let isSpecialOrg = process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString());
            const respObj = productivity.map(item => {
                let computer_activities_time = item.productive_duration + item.non_productive_duration + item.neutral_duration;
                let office_time = computer_activities_time + item.idle_duration + item.break_duration + item.offline_time;
                let productivity = 0;
                if (isSpecialOrg) {
                    /**Productivity caluculation for special organization */
                    productivity = isNaN(item.productive_duration / (30600 * item.count)) ? 0 : ((item.productive_duration / (30600 * item.count)) * 100);
                    total_custom_time_special += 30600 * item.count;
                } else {
                    productivity = item.productive_duration ? (item.productive_duration / ((productive_hours ? productive_hours * item.count : 0) || office_time) * 100) : 0;
                }
                total_computer_activities_time += computer_activities_time;
                total_office_time += office_time;
                total_custom_time += productive_hours * item.count;
                total_productive_duration += item.productive_duration;
                if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString()) && +(productivity) > 100) {
                    productivity = 100;
                }

                return {
                    date: Common.yyyymmdd_to_yyyy_mm_dd(item.yyyymmdd),
                    total_duration: item.productive_duration + item.non_productive_duration + item.neutral_duration,
                    productive_duration: item.productive_duration,
                    non_productive_duration: item.non_productive_duration,
                    neutral_duration: item.neutral_duration,
                    computer_activities_time: computer_activities_time,
                    office_time,
                    productivity,
                    idle_duration: item.idle_duration
                }
            });
            let productive = {};
            if (isSpecialOrg) {
                productive = { total_computer_activities_time, total_office_time, total_productivity: isNaN(total_productive_duration / total_custom_time_special) ? 0 : ((total_productive_duration / total_custom_time_special) * 100), total_productive_duration };
            } else {
                productive = { total_computer_activities_time, total_office_time, total_productivity: isNaN(total_productive_duration / total_custom_time) ? 0 : ((total_productive_duration / total_custom_time) * 100), total_productive_duration };
            }

            if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString()) && +(productive.total_productivity) > 100) {
                productive.total_productivity = 100;
            }
            respObj.sort(function (element_1, element_2) {
                var small_date = new Date(element_1.date), large_date = new Date(element_2.date);
                return large_date - small_date;
            });

            if (req.query.employee_id) {
                // startDate, endDate,
                for (const reportData of respObj) {
                    let [employee_timezone] = await PrService.getEmployeeTimezone(req.query.employee_id, organization_id);

                    // Parse the provided date in the user's timezone
                    const start_time = momentTz.tz(reportData.date, 'YYYY-MM-DD', employee_timezone.timezone || 'UTC');
                    const end_time = momentTz.tz(reportData.date, 'YYYY-MM-DD', employee_timezone.timezone || 'UTC');
                    start_time.startOf('day');
                    end_time.startOf('day');

                    let mobileUsages = await PrService.getEmployeeMobileUsage(req.query.employee_id, organization_id, start_time.utc().add('-1', 'minute').toISOString(), end_time.utc().add('1', 'day').add('1', 'minute').toISOString());
                    let totalMobileUsage = 0;
                    for (const { task_working_status } of mobileUsages) {
                        for (const task of task_working_status) {
                            if(task.is_desktop_task) continue;
                            if(moment(task.start_time).isBetween(start_time.utc(), end_time.utc()) && moment(task.end_time).isBetween(start_time.utc(), end_time.utc())) {
                                totalMobileUsage += moment(task.end_time).diff(moment(task.start_time), 'seconds');
                            }
                        }
                    }
                    reportData.mobileUsageDuration = totalMobileUsage;
                }
            }

            return res.json({ code: 200, data: respObj, production_data: productive, message: 'Productivity.', error: null });
        } catch (err) {
            next(err);
        }
    }
    async getProductivityList(req, res, next) {
        try {
            actionsTracker(req, 'Productivity list requested (?).', [req.query]);
            const { organization_id, role_id, language, productive_hours } = req.decoded;
            let { page, skip, limit, location_id, department_id, employee_id, startDate, endDate, sortOrder, sortColumn, nonAdminId } = await PrValidator.getProductivityList().validateAsync(req.query);
            const manager_id = req.decoded.employee_id || nonAdminId || null;
            let employee_ids = null;
            // Pagination
            let startIndex;
            let endIndex;
            if (page) {
                startIndex = (page - 1) * limit;
                endIndex = page * limit;
            } else {
                startIndex = skip;
                endIndex = skip + limit;
            }
            let total = 0;
            let search_type, search_value;

            if (employee_id) {
                if (employee_id === 'All') { search_type = 'employee'; search_value = 'All'; }
                else {
                    employee_id = employee_id.split(',').map(x => +x);
                    search_type = 'employee'; search_value = employee_id;
                }
            } else if (department_id) {
                if (department_id === 'All') { search_type = 'department'; search_value = 'All'; }
                else { search_type = 'department'; search_value = department_id; }
            } else if (location_id) {
                if (location_id === 'All') { search_type = 'location'; search_value = 'All'; }
                else { search_type = 'location'; search_value = location_id; }
            } else {
                search_type = 'organization';
                search_value = organization_id;
            }
            if( employee_id && nonAdminId) {
                let isEmployeeAssigned = await PrService.getEmployeeAssignedNonAdminId(employee_id, nonAdminId);
                if (isEmployeeAssigned.length === 0) {
                    return sendResponse(res, 400, null, reportMessage.find(x => x.id === "1")[language] || reportMessage.find(x => x.id === "1")["en"], null);
                }
            }
            if (manager_id) {
                employee_ids = _.pluck(await PrService.getEmployeeAssignedToManager(manager_id, role_id), 'employee_id');

                if (employee_ids.length === 0) {
                    return sendResponse(res, 400, null, reportMessage.find(x => x.id === "1")[language] || reportMessage.find(x => x.id === "1")["en"], null);
                }
                if(employee_id !== 'All' && employee_id && employee_ids?.includes(employee_id?.length !== 0 ? employee_id[0] : 0)) {
                    employee_ids = employee_id;
                }
            }
            let column = null;
            let order = null;
            if (sortOrder === 'D') {
                order = `DESC`;
            } else {
                order = `ASC`;
            }
            switch (sortColumn) {
                case 'Name':
                    column = 'name';
                    break;
                case 'Office Time':
                    column = 'office_time';
                    break;
                case 'Productive':
                    column = 'productive_duration';
                    break;
                case 'Productivity':
                    column = 'productivity';
                    break;
                case 'Unproductive':
                    column = 'non_productive_duration';
                    break;
                case 'Unproductivity':
                    column = 'unproductivity';
                    break;
                case 'Neutral':
                    column = 'neutral_duration';
                    break;
            }

            let tempIds = [];
            let names;
            if (sortColumn == 'Name') {
                names = await PrService.getNames({ ids: [], search_type, name: column, startIndex, limit, organization_id, search_value, employee_ids, order, startDate, endDate });
                tempIds = _.pluck(names, 'id');
                if (tempIds.length === 0) return res.json({ code: 200, total: 0, pagination: {}, data: [], hasMoreData: false, message: 'Productivity List.', error: null });
                let results = await PrService.getProductivityList({ organization_id, search_type, search_value, startIndex, limit, startDate, endDate, employee_ids, order, column, tempIds, productive_hours })
                total = names[0].total;
                names = names.map(item => {
                    const nameData = results.find(x => x._id === item.id)
                    if (nameData) {
                        return { name: item.name, ...nameData }
                    } else {
                        return { "productive_duration": 0, "non_productive_duration": 0, "neutral_duration": 0, "idle_duration": 0, "break_duration": 0, "office_time": 0, "computer_activities_time": 0, "productivity": 0, "unproductivity": 0, "name": item.name }
                    }
                });
                return res.json({ code: 200, total, data: names, hasMoreData: endIndex >= total ? false : true, skipValue: endIndex, message: 'Productivity List.', error: null });
            }
            let [count, results] = await Promise.all([
                PrService.getProductivityListCount({ organization_id, search_type, search_value, startDate, endDate, employee_ids }),
                PrService.getProductivityList({ organization_id, search_type, search_value, startIndex, limit, startDate, endDate, employee_ids, order, column, tempIds, productive_hours })
            ]);

            if (results.length > 0) {
                names = await PrService.getNames({ ids: _.pluck(results, '_id'), search_type });

                results = results.map(item => {
                    if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString())) {
                        if (+(item.productivity) > 100) item.productivity = 100;
                        if (+(item.unproductivity) > 100) item.unproductivity = 100;
                    }
                    const nameData = names.find(x => x.id === item._id)
                    const data = { ...item, name: nameData ? nameData.name : '' }
                    delete data._id;

                    return data;
                })

                results = results.filter((itr) => {
                    return itr.name != "";
                })


            }

            if (count.length === 0) {
                total = 0;
            } else {
                total = count[0].total;
            }

            // Pagination result
            const pagination = {};

            if (startIndex > 0) {
                pagination.prev = { page: page - 1, };
            }

            if (endIndex < total) {
                pagination.next = { page: page + 1, };
            }
            res.json({
                code: 200,
                total,
                pagination,
                data: results,
                hasMoreData: endIndex >= total ? false : true,
                skipValue: endIndex,
                limit: limit,
                message: 'Productivity List.',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    async getProductivityListForDownload(req, res, next) {
        try {
            const { organization_id, role_id, language, productive_hours } = req.decoded;
            let { location_id, department_id, employee_id, startDate, endDate, nonAdminId } = await PrValidator.getProductivityListForDownload().validateAsync(req.query);
            const manager_id = req.decoded.employee_id || nonAdminId || null;
            let employee_ids = null;

            let search_type, search_value;

            if (employee_id) {
                if (employee_id === 'All') { search_type = 'employee'; search_value = 'All'; }
                else {
                    employee_id = employee_id.split(',').map(x => +x);
                    search_type = 'employee'; search_value = employee_id;
                }
            } else if (department_id) {
                if (department_id === 'All') { search_type = 'department'; search_value = 'All'; }
                else { search_type = 'department'; search_value = department_id; }
            } else if (location_id) {
                if (location_id === 'All') { search_type = 'location'; search_value = 'All'; }
                else { search_type = 'location'; search_value = location_id; }
            } else {
                search_type = 'organization';
                search_value = organization_id;
            }
            if( employee_id && nonAdminId) {
                let isEmployeeAssigned = await PrService.getEmployeeAssignedNonAdminId(employee_id, nonAdminId);
                if (isEmployeeAssigned.length === 0) {
                    return sendResponse(res, 400, null, reportMessage.find(x => x.id === "1")[language] || reportMessage.find(x => x.id === "1")["en"], null);
                }
            }
            if (manager_id) {
                employee_ids = _.pluck(await PrService.getEmployeeAssignedToManager(manager_id, role_id), 'employee_id');

                if (employee_ids.length === 0) {
                    return sendResponse(res, 400, null, reportMessage.find(x => x.id === "1")[language] || reportMessage.find(x => x.id === "1")["en"], null);
                }
                if(employee_id !== 'All' && employee_id && employee_ids?.includes(employee_id?.length !== 0 ? employee_id[0] : 0)) {
                    employee_ids = employee_id;
                }
            }

            let results = await PrService.getProductivityListForDownload({ organization_id, search_type, search_value, startDate, endDate, employee_ids, productive_hours })

            if (results.length > 0) {
                const names = await PrService.getNames({ ids: _.pluck(results, '_id'), search_type });

                results = results.map(item => {
                    if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString())) {
                         if (+(item.productivity) > 100) item.productivity = 100;
                         if (+(item.unproductivity) > 100) item.unproductivity = 100;
                    }
                    const nameData = names.find(x => x.id === item._id)
                    const data = {
                        // computer_activities_time: item.productive_duration + item.non_productive_duration + item.neutral_duration,
                        // office_time: item.productive_duration + item.non_productive_duration + item.neutral_duration + item.idle_duration + item.break_duration,
                        // productivity: isNaN(item.productive_duration / (item.productive_duration + item.non_productive_duration + item.neutral_duration + item.idle_duration + item.break_duration)) ? 0 : ((item.productive_duration / (item.productive_duration + item.non_productive_duration + item.neutral_duration + item.idle_duration + item.break_duration)) * 100),
                        ...item,
                        name: nameData ? nameData.name : ''
                    }
                    delete data._id;

                    return data;
                });

                results = results.filter((itr) => {
                    return itr.name != "";
                })

            }
            return res.json({
                code: 200,
                data: results,
                message: 'Productivity List.',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    async getAnomalyDetection(req, res, next) {

        const organization_id = req.decoded.organization_id;
        let language = req.decoded.language;
        let validate;
        try {
            validate = await PrValidator.getAnomalyData().validateAsync(req.body);
        } catch (error) {
            return res.json({ code: 400, data: null, message: reportMessage.find(x => x.id === "2")[language] || reportMessage.find(x => x.id === "2")["en"], error: error.message });
        }
        let { role_id, shift_id, location_id, department_id, startDate, endDate, sortColumn, sortOrder, employee_ids } = validate;
        //role and shift filter
        let employeeIds = _.pluck(await PrService.getEmployeeIds(role_id, shift_id, organization_id), 'employee_id');
        if (employeeIds.length > 0) {
            employeeIds.concat(employee_ids);
        }
        const data = await PrService.getProductivityPercentageModel(organization_id, startDate, endDate, location_id, department_id, employee_ids, limit, skip, sortColumn, sortOrder);
        if (data.length > 0) {
            return sendResponse(res, 400, null, reportMessage.find(x => x.id === "13")[language] || reportMessage.find(x => x.id === "13")["en"], reportMessage.find(x => x.id === "13")[language] || reportMessage.find(x => x.id === "13")["en"]);
        }
        try {
            const response = await axios.post(process.env.ANOMALY_DETECTION_URL, { data });
            return sendResponse(res, 200, response.data, reportMessage.find(x => x.id === "17")[language] || reportMessage.find(x => x.id === "17")["en"], null);
        } catch (err) {
            return sendResponse(res, 400, null, reportMessage.find(x => x.id === "15")[language] || reportMessage.find(x => x.id === "15")["en"], reportMessage.find(x => x.id === "15")[language] || reportMessage.find(x => x.id === "15")["en"]);
        }
    }

    async getProductivityNew(req, res, next) {
        let { organization_id, productive_hours, employee_id: Manager_ID } = req.decoded;
        try {
            let { startDate, endDate, employee_id, location_id = "All", department_id, skip = 0, limit = 20 } = req.query;
            skip = +skip;
            limit = +limit;
            if(employee_id) employee_id = +employee_id;
            if(department_id) department_id = +department_id;
            if(location_id !== "All") location_id = +location_id;

            let result = [], resultCount = 0;
            let specificEmployeeId = [];
            if(Manager_ID) {
                let assigned_employees_id = await PrService.getEmployeeAssignedToManager(Manager_ID);
                specificEmployeeId = _.pluck(assigned_employees_id, 'employee_id');
            }

            [result, resultCount] = await Promise.all([
                PrService.getEmployeeProductivityData(organization_id, location_id, department_id, employee_id, startDate, endDate, skip, limit, specificEmployeeId, Manager_ID),
                PrService.getEmployeeProductivityDataCount(organization_id, location_id, department_id, employee_id, startDate, endDate, specificEmployeeId, Manager_ID),
            ])

            let _location_id = [], _department_id = [], _employee_id = [], _employee_d = [];
            let detailsData = [];

            if(location_id == "All") {
                // _id is location_id
                _location_id = _.pluck(result, "_id");
                if(_location_id.length) detailsData = await PrService.getLocationData(_location_id, organization_id);
            }
            else if (location_id !== "All" && (!department_id && !employee_id)) {
                // _id is department_id
                _department_id = _.pluck(result, "_id");
                if(_department_id.length) detailsData = await PrService.getDepartmentData(_department_id, organization_id);
            }
            else if (location_id !== "All" && (department_id && !employee_id)) {
                // _id is employee_id
                _employee_id = _.pluck(result, "_id");
                if(_employee_id.length) detailsData = await PrService.getEmployeeData(_employee_id, organization_id);
            }
            else if (location_id !== "All" && (department_id && employee_id)) {
                // _id is date
                _employee_d = _.pluck(result, "employee_id");
                if(_employee_d.length) detailsData = await PrService.getEmployeeData(_employee_d, organization_id);
            }

            for (const item of result) {
                if(_employee_d.length == 0) {
                    item.name = detailsData.filter(i => i.id == item._id)[0]?.name;
                    item.computer_name = null;
                    item.username = null;
                }
                else {
                    let temp = detailsData.filter(i => i.id == item.employee_id)[0];
                    item.full_name = temp?.name;
                    item.computer_name = temp?.computer_name;
                    item.username = temp?.username;
                    item.name = item?.date;
                }
                item.productivity = ((item.productive_duration/productive_hours * 100)/item.count).toFixed(2) ;
                item.unproductivity = (((item.non_productive_duration)/productive_hours * 100)/item.count).toFixed(2);
            }

            return res.json({
                code: 200,
                total: resultCount[0]?.myCount ?? 0,
                data: result,
                message: 'Productivity List.',
                error: null
            });
        }
        catch (err) {
            console.log(err);
            next(err);
        }
    }

    async getProductivityListNew(req, res, next) {
        let { organization_id, productive_hours, employee_id: Manager_ID } = req.decoded;
        try {
            let { startDate, endDate, employee_id, location_id = "All", department_id, skip = 0, limit = 10 } = req.query;
            skip = +skip;
            limit = +limit;
            if(employee_id) employee_id = +employee_id;
            if(department_id) department_id = +department_id;
            if(location_id !== "All") location_id = +location_id;

            let result = [], resultCount = 0;

            let specificEmployeeId = [];
            if(Manager_ID) {
                let assigned_employees_id = await PrService.getEmployeeAssignedToManager(Manager_ID);
                specificEmployeeId = _.pluck(assigned_employees_id, 'employee_id');
            }

            [result, resultCount] = await Promise.all([
                PrService.getEmployeeProductivityData(organization_id, location_id, department_id, employee_id, startDate, endDate, skip, limit, specificEmployeeId, Manager_ID),
                PrService.getEmployeeProductivityDataCount(organization_id, location_id, department_id, employee_id, startDate, endDate, specificEmployeeId, Manager_ID),
            ])

            let _location_id = [], _department_id = [], _employee_id = [], _employee_d = [];
            let detailsData = [];

            if(location_id == "All") {
                // _id is location_id
                _location_id = _.pluck(result, "_id");
                if(_location_id.length) detailsData = await PrService.getLocationData(_location_id, organization_id);
            }
            else if (location_id !== "All" && (!department_id && !employee_id)) {
                // _id is department_id
                _department_id = _.pluck(result, "_id");
                if(_department_id.length) detailsData = await PrService.getDepartmentData(_department_id, organization_id);
            }
            else if (location_id !== "All" && (department_id && !employee_id)) {
                // _id is employee_id
                _employee_id = _.pluck(result, "_id");
                if(_employee_id.length) detailsData = await PrService.getEmployeeData(_employee_id, organization_id);
            }
            else if (location_id !== "All" && (department_id && employee_id)) {
                // _id is date
                _employee_d = _.pluck(result, "employee_id");
                if(_employee_d.length) detailsData = await PrService.getEmployeeData(_employee_d, organization_id);
            }

            for (const item of result) {
                if(_employee_d.length == 0) {
                    let temp = detailsData.filter(i => i.id == item._id)[0];
                    item.name = temp?.name;
                    item.computer_name = temp?.computer_name;
                    item.username = temp?.username;
                }
                else {
                    let temp = detailsData.filter(i => i.id == item.employee_id)[0];
                    item.full_name = temp?.name;
                    item.computer_name = temp?.computer_name;
                    item.username = temp?.username;
                    item.name = item?.date;
                }
                item.productivity = ((item.productive_duration/productive_hours * 100)/item.count).toFixed(2) ;
                item.unproductivity = (((item.non_productive_duration)/productive_hours * 100)/item.count).toFixed(2);
            }

            return res.json({
                code: 200,
                total: resultCount[0]?.myCount ?? 0,
                data: result,
                message: 'Productivity List.',
                error: null
            });
        }
        catch (err) {
            console.log(err);
            next(err);
        }
    }

    async getProductivityListForDownloadNew(req, res, next) {
        let { organization_id, productive_hours, employee_id: Manager_ID } = req.decoded;
        try {
            let { startDate, endDate, employee_id, location_id = "All", department_id, is_aligned_by_date = 'false' } = req.query;

            if (employee_id) employee_id = +employee_id;
            if (department_id) department_id = +department_id;
            if (location_id !== "All") location_id = +location_id;

            let finalArray = [];
            let finalCount = 0;

            let specificEmployeeId = [];
            if(Manager_ID) {
                let assigned_employees_id = await PrService.getEmployeeAssignedToManager(Manager_ID);
                specificEmployeeId = _.pluck(assigned_employees_id, 'employee_id');
            }

            if (is_aligned_by_date == "false" || is_aligned_by_date == "") {

                let result = [], resultCount = 0;

                if(config.PRODUCTIVITY_REPORT_FOR_ALL_USERS_DOWNLOAD.includes(organization_id)) {
                    let detailsData = [];
                    [result, resultCount] = await Promise.all([
                        PrService.getEmployeeProductivityDataAll(organization_id, startDate, endDate, specificEmployeeId),
                        PrService.getEmployeeProductivityDataCountAll(organization_id, startDate, endDate, specificEmployeeId),
                    ])
                    
                    let employeeId = _.pluck(result, "_id");
                    if (employeeId.length) detailsData = await PrService.getEmployeeData(employeeId, organization_id);
                    for (const item of result) {
                        let temp = detailsData.find(i => i.id == item._id);
                        item.full_name = temp?.name;
                        item.computer_name = temp?.computer_name;
                        item.username = temp?.username;
                        item.productivity = ((item.productive_duration/productive_hours * 100)/item.count).toFixed(2) ;
                        item.unproductivity = (((item.non_productive_duration)/productive_hours * 100)/item.count).toFixed(2);
                    }
                    return res.json({
                        code: 200,
                        total: resultCount[0]?.myCount ?? 0,
                        data: result,
                        message: 'Productivity List.',
                        error: null
                    });
                }

                [result, resultCount] = await Promise.all([
                    PrService.getEmployeeProductivityData(organization_id, location_id, department_id, employee_id, startDate, endDate, null, null, specificEmployeeId, Manager_ID),
                    PrService.getEmployeeProductivityDataCount(organization_id, location_id, department_id, employee_id, startDate, endDate, specificEmployeeId, Manager_ID),
                ])

                let _location_id = [], _department_id = [], _employee_id = [], _employee_d = [];
                let detailsData = [];

                if (location_id == "All") {
                    // _id is location_id
                    _location_id = _.pluck(result, "_id");
                    if (_location_id.length) detailsData = await PrService.getLocationData(_location_id, organization_id);
                }
                else if (location_id !== "All" && (!department_id && !employee_id)) {
                    // _id is department_id
                    _department_id = _.pluck(result, "_id");
                    if (_department_id.length) detailsData = await PrService.getDepartmentData(_department_id, organization_id);
                }
                else if (location_id !== "All" && (department_id && !employee_id)) {
                    // _id is employee_id
                    _employee_id = _.pluck(result, "_id");
                    if (_employee_id.length) detailsData = await PrService.getEmployeeData(_employee_id, organization_id);
                }
                else if (location_id !== "All" && (department_id && employee_id)) {
                    // _id is date
                    _employee_d = _.pluck(result, "employee_id");
                    if (_employee_d.length) detailsData = await PrService.getEmployeeData(_employee_d, organization_id);
                }

                for (const item of result) {
                    if(_employee_d.length == 0) {
                        let temp = detailsData.filter(i => i.id == item._id)[0];
                        item.name = temp?.name;
                        item.computer_name = temp?.computer_name;
                        item.username = temp?.username;
                    }
                    else {
                        let temp = detailsData.filter(i => i.id == item.employee_id)[0];
                        item.full_name = temp?.name;
                        item.computer_name = temp?.computer_name;
                        item.username = temp?.username;
                        item.name = item?.date;
                    }
                    item.productivity = ((item.productive_duration/productive_hours * 100)/item.count).toFixed(2) ;
                    item.unproductivity = (((item.non_productive_duration)/productive_hours * 100)/item.count).toFixed(2);
                }

                return res.json({
                    code: 200,
                    total: resultCount[0]?.myCount ?? 0,
                    data: result,
                    message: 'Productivity List.',
                    error: null
                });
            }
            else {
                let inBetweenDates = getDatesBetween(new Date(startDate), new Date(endDate));
                for (const dates of inBetweenDates) {
                    let result = [], resultCount = 0;

                    [result, resultCount] = await Promise.all([
                        PrService.getEmployeeProductivityData(organization_id, location_id, department_id, employee_id, dates, dates, null, null, specificEmployeeId, Manager_ID),
                        PrService.getEmployeeProductivityDataCount(organization_id, location_id, department_id, employee_id, dates, dates, specificEmployeeId, Manager_ID),
                    ])

                    let _location_id = [], _department_id = [], _employee_id = [], _employee_d = [];
                    let detailsData = [];

                    if (location_id == "All") {
                        // _id is location_id
                        _location_id = _.pluck(result, "_id");
                        if (_location_id.length) detailsData = await PrService.getLocationData(_location_id, organization_id);
                    }
                    else if (location_id !== "All" && (!department_id && !employee_id)) {
                        // _id is department_id
                        _department_id = _.pluck(result, "_id");
                        if (_department_id.length) detailsData = await PrService.getDepartmentData(_department_id, organization_id);
                    }
                    else if (location_id !== "All" && (department_id && !employee_id)) {
                        // _id is employee_id
                        _employee_id = _.pluck(result, "_id");
                        if (_employee_id.length) detailsData = await PrService.getEmployeeData(_employee_id, organization_id);
                    }
                    else if (location_id !== "All" && (department_id && employee_id)) {
                        // _id is date
                        _employee_d = _.pluck(result, "employee_id");
                        if (_employee_d.length) detailsData = await PrService.getEmployeeData(_employee_d, organization_id);
                    }

                    for (const item of result) {
                        if(_employee_d.length == 0) {
                            item.name = detailsData.filter(i => i.id == item._id)[0]?.name;
                            item.computer_name = null;
                            item.username = null;
                        }
                        else {
                            let temp = detailsData.filter(i => i.id == item.employee_id)[0];
                            item.full_name = temp?.name;
                            item.computer_name = temp?.computer_name;
                            item.username = temp?.username;
                            item.name = item?.date;
                        }
                        item.s_date = moment(dates).format('YYYY-MM-DD');
                        item.productivity = ((item.productive_duration/productive_hours * 100)/item.count).toFixed(2) ;
                        item.unproductivity = (((item.non_productive_duration)/productive_hours * 100)/item.count).toFixed(2);
                    }

                    finalArray = [...finalArray, ...result];
                    finalCount += resultCount[0]?.myCount;
                }
                return res.json({
                    code: 200,
                    total: finalCount,
                    data: finalArray,
                    message: 'Productivity List.',
                    error: null
                });
            }

        }
        catch (err) {
            console.log(err);
            next(err);
        }
    }

}

module.exports = new PrController;


function getDatesBetween(start_date, end_date) {
    let dates = [];
    let current_date = new Date(start_date);
    while (current_date <= end_date) {
        dates.push(new Date(current_date));
        current_date.setDate(current_date.getDate() + 1);
    }
    return dates;
}