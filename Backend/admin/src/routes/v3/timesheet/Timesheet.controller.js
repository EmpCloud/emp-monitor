const _ = require('underscore');
const moment = require('moment');
const TimeSheetModel = require('./Timesheet.model');
const TimeSheetValidator = require('./Timesheet.validator');

const sendResponse = require('../../../utils/myService').sendResponse;
const actionsTracker = require('../services/actionsTracker');
const { timesheetMessages } = require("../../../utils/helpers/LanguageTranslate");
const BreakActivityModel = require('../../../models/break_request.schema');

const config = require('../../../../../config/config');
const redis = require('../auth/services/redis.service');

const timesheetReport = ({ userData, userProductivity, organization_id, productive_hours, employee_avg, avg }) => {
    const productivityByUser = {};
    for (const productivity of userProductivity) {
        if (employee_avg == true || avg == true) {
            productivityByUser[`${productivity.employee_id}`] = productivity;
        } else {
            productivityByUser[`${productivity.date}:${productivity.employee_id}`] = productivity;
        }
    }
    userData.forEach((user) => {
        if (avg == true) {
            const {
                productive_duration = 0, non_productive_duration = 0, neutral_duration = 0,
                idle_duration = 0, break_duration = 0, offline_time = 0, date, count = 1
            } = productivityByUser[`${user.id}`] || {};
            Object.assign(user, {
                productive_duration, non_productive_duration, neutral_duration,
                idle_duration, break_duration, date
            });

            user.details = user.details ? JSON.parse(user.details) : null;
            user.computer_activities_time = user.productive_duration + user.non_productive_duration + user.neutral_duration;
            user.office_time = user.computer_activities_time + user.idle_duration + user.break_duration + offline_time;
            user.offline = (user.total_time - user.office_time) / count;
            // user.offline=offline_time==0? user.total_time - user.office_time:user.total_time - user.office_time-offline_time;

            user.productivity = process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString()) ?
                (user.productive_duration / (30600 * count)) * 100
                : (productive_hours ? (user.productive_duration / (productive_hours * count)) * 100 : (user.productive_duration / user.office_time) * 100);
            if (isNaN(user.productivity)) user.productivity = 0;
            if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString()) && +(user.productivity) > 100) {
                user.productivity = 100
            }
            user.productive_duration = user.productive_duration / count;
            user.non_productive_duration = user.non_productive_duration / count;
            user.neutral_duration = user.neutral_duration / count;
            user.idle_duration = user.idle_duration / count;
            user.total_time = user.total_time / count;
            user.office_time = user.office_time / count;
            user.computer_activities_time = user.computer_activities_time / count;
            user.count = count;

            if(config?.UNPRODUCTIVE_PERCENTAGE_TIME_SHEET?.split(',')?.includes(organization_id.toString())) {
                user.unproductive = productive_hours ? (user.non_productive_duration / (productive_hours * count)) * 100 : (user.non_productive_duration / user.office_time) * 100;
                user.unproductive = user.unproductive.toFixed(2);
            }

            return user;
        } else if (employee_avg == true) {
            const {
                productive_duration = 0, non_productive_duration = 0, neutral_duration = 0,
                idle_duration = 0, break_duration = 0, offline_time = 0, date, count = 1
            } = productivityByUser[`${user.id}`] || {};
            Object.assign(user, {
                productive_duration, non_productive_duration, neutral_duration,
                idle_duration, break_duration, date
            });

            user.computer_activities_time = user.productive_duration + user.non_productive_duration + user.neutral_duration;
            user.office_time = user.computer_activities_time + user.idle_duration + user.break_duration + offline_time;
            user.offline = user.total_time - user.office_time;
            // user.offline=offline_time==0? user.total_time - user.office_time:user.total_time - user.office_time-offline_time;
            user.date = date;
            user.details = user.details ? JSON.parse(user.details) : null;
            user.productivity = process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString()) ?
                (user.productive_duration / (30600 * count)) * 100
                : (productive_hours ? (user.productive_duration / (productive_hours * count)) * 100 : (user.productive_duration / user.office_time) * 100);
            if (isNaN(user.productivity)) user.productivity = 0;
            user.count = count;
            if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString()) && +(user.productivity) > 100) {
                user.productivity = 100
            }

            if(config?.UNPRODUCTIVE_PERCENTAGE_TIME_SHEET?.split(',')?.includes(organization_id.toString())) {
                user.unproductive = productive_hours ? (user.non_productive_duration / (productive_hours * count)) * 100 : (user.non_productive_duration / user.office_time) * 100;
                user.unproductive = user.unproductive.toFixed(2);
            }

            return user;

        } else {
            const {
                productive_duration = 0, non_productive_duration = 0, neutral_duration = 0,
                idle_duration = 0, break_duration = 0, offline_time = 0
            } = productivityByUser[`${user.date}:${user.id}`] || {};
            Object.assign(user, {
                productive_duration, non_productive_duration, neutral_duration,
                idle_duration, break_duration,
            });

            user.details = user.details ? JSON.parse(user.details) : null;
            user.computer_activities_time = user.productive_duration + user.non_productive_duration + user.neutral_duration;
            user.office_time = user.computer_activities_time + user.idle_duration + user.break_duration + offline_time;
            user.offline = user.total_time - user.office_time;
            // user.offline=offline_time==0? user.total_time - user.office_time:user.total_time - user.office_time-offline_time;

            user.productivity = process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString()) ?
                (user.productive_duration / 30600) * 100
                : (productive_hours ? (user.productive_duration / productive_hours) * 100 : (user.productive_duration / user.office_time) * 100);
            if (isNaN(user.productivity)) user.productivity = 0;
            if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString()) && +(user.productivity) > 100) {
                user.productivity = 100
            }
            
            if(config?.UNPRODUCTIVE_PERCENTAGE_TIME_SHEET?.split(',')?.includes(organization_id.toString())) {
                user.unproductive = productive_hours ? (user.non_productive_duration / (productive_hours)) * 100 : (user.non_productive_duration / user.office_time) * 100;
                user.unproductive = user.unproductive.toFixed(2);
            }

            return user;
        }
    });
    return userData;
};


const enumerateDaysBetweenDates = (startDate, endDate) => {
    let now = startDate.clone(), dates = [];
    while (now.isSameOrBefore(endDate)) {
        dates.push(now.format('YYYY-MM-DD'));
        now.add(1, 'days');
    }
    return dates.reverse();
};
/**
 * @function addAbsentUserData
 * @param {Object} timesheetData
 * @param {Object} allUsersData
 * @param {totalDaysList} allUsersData
 * @returns {Object}  timesheet
 */
const addAbsentUserData = ({ timesheetData, allUsersData, totalDaysList, employee_avg, avg }) => {
    try {
        let timesheet = [];
        const items = _.pluck(timesheetData, 'id');
        const unique_employee_ids = Array.from(new Set(items));
        let absentDefaults = {
            attendance_id: null,
            start_time: null,
            end_time: null,
            total_time: null,
            productive_duration: null,
            non_productive_duration: null,
            neutral_duration: null,
            idle_duration: null,
            break_duration: null,
            computer_activities_time: null,
            office_time: null,
            offline: null,
            productivity: null
        }

        if (employee_avg == true || avg == true) {
            let dataRemoved = allUsersData.filter((el) => {
                if (!unique_employee_ids.includes(el.id)) {
                    return el;
                }
            });
            dataRemoved = dataRemoved.map(itr => ({ ...itr, date: totalDaysList[0], ...absentDefaults }))
            timesheet = timesheet.concat(timesheetData, dataRemoved)
            return timesheet;
        } else {
            for (const date of totalDaysList) {
                let singleDayDate = timesheetData.filter(itr => employee_avg == true ? itr.date.includes(date) : itr.date == date);
                let absentUsers = _.difference(_.pluck(allUsersData, "id"), _.pluck(singleDayDate, "id"))
                absentUsers = absentUsers.map(item => {
                    item = allUsersData.find(i => i.id == item);
                    item = {
                        ...item,
                        date,
                        ...absentDefaults
                    }
                    return item
                })
                timesheet = timesheet.concat(singleDayDate, absentUsers)
            }
            return timesheet;
        }

    } catch (err) {
        return timesheetData
    }
}

class TimeSheetController {
    async getTimesheet(req, res, next) {
        try {
            if (req.decoded.role === 'Employee') {
                // An Employee may only ever see their OWN timesheet. We scope the
                // query to their employee_id from the session. If the session has
                // no employee_id (null/0/undefined), DO NOT fall through — leaving
                // it null makes the validator coerce it to 0 ("all employees"),
                // which would leak the entire organization's timesheet to a single
                // employee. Reject with a clear error instead.
                if (!req.decoded.employee_id) {
                    const lang = req.decoded.language;
                    return sendResponse(
                        res, 400, null,
                        (timesheetMessages.find(x => x.id === "1") || {})[lang] ||
                        (timesheetMessages.find(x => x.id === "1") || {})["en"] ||
                        'Your account is not linked to an employee record. Please re-login or contact your administrator.',
                        null
                    );
                }
                req.query.employee_id = req.decoded.employee_id;
            }
            // Only treat the caller as a manager when their role actually
            // is Manager. Admins (and any other non-manager role) should
            // see the full org and skip the "assigned employees" filter,
            // otherwise the API rejects with "No Employee Assigned to
            // this account!" the moment an admin lists all employees.
            const isManagerRole = req.decoded.role === 'Manager';
            const { organization_id, role_id, productive_hours, language } = req.decoded;
            const manager_id = isManagerRole ? (req.decoded.employee_id || null) : null;

            let {
                location_id, department_id, employee_id, start_date, end_date, absent, employee_avg, avg, shift_id
            } = await TimeSheetValidator.getTimesheet().validateAsync(req.query);

            const startDateStr = moment(start_date).format('YYYY-MM-DD');
            const endDateStr = moment(end_date).format('YYYY-MM-DD');
            actionsTracker(
                req, 'Get all users from attendance to timesheet breakup (?).',
                [{ location_id, department_id, employee_id, start_date, end_date }],
            );

            let totalDaysList, allUsersData;
            if (absent === 1) {
                allUsersData = await TimeSheetModel.getUser({ organization_id, location_id, department_id, manager_id, role_id, employee_id, shift_id  });

                let allEmpIds = _.pluck(allUsersData, 'id');
                const allUniqueEmployeeIds = Array.from(new Set(allEmpIds))

                let assigneeName = await TimeSheetModel.getAssignedToData(allUniqueEmployeeIds)
                allUsersData = allUsersData.map(ele => {
                    let filtered = assigneeName ? assigneeName.filter(x => x.employee_id == ele.id) : null;
                    ele['AssignedTo'] = filtered.length > 0 ? filtered[0].name : null
                    return ele;
                })
                totalDaysList = await enumerateDaysBetweenDates(moment(start_date), moment(end_date))
            }
            if (manager_id && employee_id === 0) {
                let employee_ids = _.pluck(
                    await TimeSheetModel.getEmployeeAssignedToManager(manager_id, role_id), 'employee_id',
                );
                if (employee_ids.length === 0) {
                    return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "1")[language] || timesheetMessages.find(x => x.id === "1")["en"], null);
                }
                
               shift_id = Number(shift_id);
                if (!Number.isNaN(shift_id) && shift_id !== -1) {
                    employee_ids = _.pluck(
                        await TimeSheetModel.getEmployeeByShift({ shift_id, organization_id, employee_ids }),
                        "id"
                    )
                    if (employee_ids.length === 0) {
                        return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "1")[language] || timesheetMessages.find(x => x.id === "1")["en"], null);
                    }
                }

                let [userData, userProductivity] = await Promise.all([
                    TimeSheetModel.getAttendanceManager({
                        organization_id, location_id, department_id, employee_ids,
                        start_date: startDateStr, end_date: endDateStr,
                    }),
                    TimeSheetModel.GetProductivityDataManager({
                        location_id, department_id, employee_ids, start_date: startDateStr, end_date: endDateStr, employee_avg, absent, avg
                    }),
                ]);
                if (userData.length === 0) return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "3")[language] || timesheetMessages.find(x => x.id === "3")["en"], null);

                let data_array = []
                const items = _.pluck(userData, 'id');
                const unique_employee_ids = Array.from(new Set(items))
                let assignedName = await TimeSheetModel.getAssignedToData(unique_employee_ids)
                if (userData.length > 0) {
                    if (employee_avg == false && avg == false) {
                        userData.map(item => {
                            let filtered = assignedName.filter(x => x.employee_id == item.id);
                            item['AssignedTo'] = filtered[0].name ? filtered[0].name : null
                            return item
                        })
                    } else {
                        const items = _.pluck(userData, 'id',);
                        const unique_employee_ids = Array.from(new Set(items))
                        unique_employee_ids.forEach((id) => {
                            let total_hours = 0; let final;
                            userData.map(item => {
                                if (item.id == id) {
                                    total_hours += item.total_time
                                    final = item;
                                    final['total_time'] = total_hours
                                }
                            })
                            let filtered = assignedName ? assignedName.filter(x => x.employee_id == final.id) : null;
                            final['AssignedTo'] = filtered.length > 0 ? filtered[0].name : null
                            data_array.push(final)
                        })
                        userData = data_array;
                    }
                }

                let timesheetData = await timesheetReport({ userData, userProductivity, organization_id, productive_hours, employee_avg, avg })
                timesheetData = absent === 1 ? await addAbsentUserData({ timesheetData, allUsersData, totalDaysList, employee_avg, avg }) : timesheetData;
                if (timesheetData.length === 0) return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "3")[language] || timesheetMessages.find(x => x.id === "3")["en"], null);
                let results =  await addBreakDurationT(timesheetData, start_date, end_date, organization_id);
                results = await addMobileUsageDuration(results, start_date, end_date, organization_id, true);
                if(config.SORT_ALL_REPORTS_USER_WISE.includes(organization_id)) {
                    results = results.sort((a, b) => {
                        return a.id - b.id;
                    });
                }
                return sendResponse(
                    res, 200,
                    { user_data: results }, timesheetMessages.find(x => x.id === "4")[language] || timesheetMessages.find(x => x.id === "4")["en"], null
                );
            }

            if (manager_id && employee_id !== manager_id) {
                const [assignedEmp] = await TimeSheetModel.checkEmployeeAssignedToManager(employee_id, manager_id, role_id);
                if (!assignedEmp) {
                    return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "5")[language] || timesheetMessages.find(x => x.id === "5")["en"], null);
                }
            }

            let [userData, userProductivity] = await Promise.all([
                TimeSheetModel.getAttendanceUsingFilter({
                    organization_id, location_id, department_id, employee_id,
                    start_date: startDateStr, end_date: endDateStr, shift_id
                }),

                TimeSheetModel.GetProductivityData({
                    location_id, department_id, employee_id,
                    start_date: startDateStr, end_date: endDateStr, organization_id, employee_avg, absent, avg
                })
            ]);
            if (userData.length === 0) return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "3")[language] || timesheetMessages.find(x => x.id === "3")["en"], null);

            let data_array = []
            const items = _.pluck(userData, 'id');
            const unique_employee_ids = Array.from(new Set(items))
            let assignedName = await TimeSheetModel.getAssignedToData(unique_employee_ids)
            if (userData.length > 0) {
                if (employee_avg == false && avg == false) {
                    userData.map(item => {
                        let filtered = assignedName ? assignedName.filter(x => x.employee_id == item.id) : null;
                        item['AssignedTo'] = filtered.length > 0 ? filtered[0].name : null
                        return item
                    })
                } else {
                    const items = _.pluck(userData, 'id',);
                    const unique_employee_ids = Array.from(new Set(items))
                    unique_employee_ids.forEach((id) => {
                        let total_hours = 0; let final;
                        userData.map(item => {
                            if (item.id == id) {
                                total_hours += item.total_time
                                final = item;
                                final['total_time'] = total_hours
                            }
                        })
                        let filtered = assignedName ? assignedName.filter(x => x.employee_id == final.id) : null;
                        final['AssignedTo'] = filtered.length > 0 ? filtered[0].name : null
                        data_array.push(final)
                    })
                    userData = data_array;
                }
            }
            let timesheetData = await timesheetReport({ userData, userProductivity, organization_id, productive_hours, employee_avg, avg })

            timesheetData = absent === 1 ? await addAbsentUserData({ timesheetData, allUsersData, totalDaysList, employee_avg, avg }) : timesheetData;
            if (timesheetData.length === 0) return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "3")[language] || timesheetMessages.find(x => x.id === "3")["en"], null);
            let results = await addBreakDurationT(timesheetData, start_date, end_date, organization_id);
            results = await addMobileUsageDuration(results, start_date, end_date, organization_id, true);
            if(config.SORT_ALL_REPORTS_USER_WISE.includes(organization_id)) {
                results = results.sort((a, b) => {
                    return a.id - b.id;
                });
            }
            return sendResponse(
                res, 200,
                { user_data: results }, timesheetMessages.find(x => x.id === "4")[language] || timesheetMessages.find(x => x.id === "4")["en"], null
            );
        } catch (err) {
            next(err);
        }
    }

    async getTimesheetData(req, res, next) {
        try {
            if (req.decoded.role === 'Employee') {
                req.query.employee_id = req.decoded.employee_id;
            }

            const { organization_id, role_id, productive_hours } = req.decoded;

            const language = req.decoded.language;
            // Manager-only filter — see getTimesheet() above for context.
            const isManagerRole = req.decoded.role === 'Manager';
            const manager_id = isManagerRole ? (req.decoded.employee_id || null) : null;
            let { location_id, department_id, employee_id, start_date, end_date, skip, limit, sortColumn, sortOrder, name, shift_id } = await TimeSheetValidator.getTimesheetValidation().validateAsync(req.query);
            start_date = moment(start_date).format('YYYY-MM-DD');
            end_date = moment(end_date).format('YYYY-MM-DD');

            actionsTracker(req, 'Get all users from attendance to timesheet breakup (?).', [{
                location_id, department_id, employee_id, start_date, end_date,
            }]);

            let employee_ids = [];
            if (manager_id && employee_id === 0) {
                employee_ids = _.pluck(await TimeSheetModel.getEmployeeAssignedToManager(manager_id, role_id), 'employee_id');

                if (employee_ids.length === 0) {
                    return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "1")[language] || timesheetMessages.find(x => x.id === "1")["en"], null);
                }
            }
            shift_id = Number(shift_id);
            let column;
            let order;
            if (sortOrder === 'D') {
                order = `DESC`;
            } else {
                order = `ASC`;
            }

            switch (sortColumn) {
                case 'Start Time':
                    column = 'ea.start_time';
                    break;
                case 'End Time':
                    column = 'ea.end_time';
                    break;
                case 'Location':
                    column = 'ol.name';
                    break;
                case 'Department':
                    column = 'od.name';
                    break;
                case 'Email':
                    column = 'u.a_email';
                    break;
                case 'Full Name':
                    column = 'u.first_name';
                    break;
                case 'Employee Code':
                    column = 'e.emp_code';
                    break;
                case 'Office Time':
                    column = 'office_time';
                    break;
                case 'Total Time':
                    column = 'total_time';
                    break;
                case 'Active Hours':
                    column = 'computer_activities_time';
                    break;
                case 'Productive':
                    column = 'productive_duration';
                    break;
                case 'Unproductive':
                    column = 'non_productive_duration';
                    break;
                case 'Neutral':
                    column = 'neutral_duration';
                    break;
                case 'Break':
                    column = 'break_duration';
                    break;
                case 'Idle':
                    column = 'idle_duration';
                    break;
                case 'Productivity':
                    column = 'productivity';
                    break;
                default:
                    sortColumn = 'Default'
                    column = 'ea.date';
                    order = `DESC`;
                    break;
            }
            let userData;
            let productivity;
            let result;
            let total_count;
            if (['ea.date', 'ea.start_time', 'u.first_name', 'ea.end_time', 'e.emp_code', 'ol.name', 'od.name', 'u.a_email', 'TIMESTAMPDIFF(second,ea.start_time,ea.end_time)'].includes(column)) {
                let empids = [];
                let dates = [];
                userData = await TimeSheetModel.getAttendance({
                    organization_id, location_id, department_id, employee_id, start_date, end_date, skip, limit,
                    employee_ids, column, order, empids, dates, name,
                });
                if (userData.length === 0) return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "3")[language] || timesheetMessages.find(x => x.id === "3")["en"], null);

                empids = _.pluck(userData, 'id');
                dates = _.pluck(userData, 'date')
                total_count = userData[0].total_count;

                productivity = await TimeSheetModel.GetProductivity({
                    location_id, department_id, employee_id, organization_id, empids, dates, column, order,
                    start_date, end_date, employee_ids, productive_hours
                });
                result = userData.map((user, i) => {
                    let temp = productivity.find(element => (element.date === user.date && element.employee_id === user.id))
                    if (temp) {
                        delete temp.total_count;
                        if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString()) && +(temp.productivity) > 100) {
                            temp.productivity = 100;
                        }
                        if(config?.UNPRODUCTIVE_PERCENTAGE_TIME_SHEET?.split(',')?.includes(organization_id.toString())) {
                            temp.unproductive = productive_hours ? (temp.non_productive_duration / (productive_hours)) * 100 : (temp.non_productive_duration / temp.office_time) * 100;
                            temp.unproductive = temp.unproductive.toFixed(2);
                        }
                        return {
                            ...temp,
                            ...user,
                            details: user.details ? JSON.parse(user.details) : null,
                            offline: user.total_time - temp.office_time
                        };
                    } else {
                        if(config?.UNPRODUCTIVE_PERCENTAGE_TIME_SHEET?.split(',')?.includes(organization_id.toString())) {
                            user.unproductive = 0;
                        }
                        return {
                            ...user,
                            details: user.details ? JSON.parse(user.details) : null,
                            productive_duration: 0,
                            non_productive_duration: 0,
                            neutral_duration: 0,
                            idle_duration: 0,
                            break_duration: 0,
                            computer_activities_time: 0,
                            office_time: 0,
                            productivity: 0,
                            offline: user.total_time - 0,
                        };
                    }
                });
            } else {
                let empids = [];
                let dates = [];
                const [productivity, Count] = await Promise.all([
                    TimeSheetModel.GetProductivity({
                        location_id, department_id, employee_id, organization_id, empids, dates, start_date,
                        end_date, skip, limit, column, order, employee_ids, productive_hours
                    }),
                    TimeSheetModel.GetProductivityCount({
                        location_id, department_id, employee_id, organization_id, empids, dates, start_date,
                        end_date, skip, limit, column, order, employee_ids,
                    })
                ]);
                total_count = Count;
                if (productivity.length === 0) return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "3")[language] || timesheetMessages.find(x => x.id === "3")["en"], null);
                empids = _.pluck(productivity, 'employee_id');
                dates = _.pluck(productivity, 'date');
                userData = await TimeSheetModel.getAttendance({
                    organization_id, location_id, department_id, employee_id, start_date, end_date,
                    employee_ids, empids, dates,
                });

                result = productivity.map((element, i) => {
                    let temp = userData.find(user => (element.date === user.date && element.employee_id === user.id));
                    if (temp) {
                        delete temp.total_count;
                        if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString()) && +(element?.productivity) > 100) {
                            element.productivity = 100;
                        }
                        if(config?.UNPRODUCTIVE_PERCENTAGE_TIME_SHEET?.split(',')?.includes(organization_id.toString())) {
                            temp.unproductive = productive_hours ? (temp.non_productive_duration / (productive_hours)) * 100 : (temp.non_productive_duration / temp.office_time) * 100;
                            temp.unproductive = temp.unproductive.toFixed(2);
                        }
                        // return { ...element, ...temp, offline: user.total_time - temp.office_time };
                        return {
                            ...element,
                            ...temp,
                            details: temp.details ? JSON.parse(temp.details) : null,
                            offline: temp.total_time - element.office_time
                        };
                    }
                });
            }
            result = await addBreakDurationT(result, start_date, end_date, organization_id, employee_id);
            result = await addMobileUsageDuration(result, start_date, end_date, organization_id);
            if(config.SORT_ALL_REPORTS_USER_WISE.includes(organization_id)) {
                result = result.sort((a, b) => {
                    return a.id - b.id;
                });
            }
            return sendResponse(res, 200, {
                user_data: result,
                totalCount: total_count,
                hasMoreData: (skip + limit) >= total_count ? false : true,
                skipValue: skip + limit,
                limit: limit
            }, timesheetMessages.find(x => x.id === "4")[language] || timesheetMessages.find(x => x.id === "4")["en"], null);
        } catch (err) {
            next(err);
        }
    }

    async getTimesheetDataCustom(req, res, next) {
        try {
            if (req.decoded.role === 'Employee') {
                req.query.employee_id = req.decoded.employee_id;
            }

            const { organization_id, role_id, productive_hours } = req.decoded;
            if(!req.tailored) {
                let requestTime = await redis.getAsync(`employee-timesheet-${organization_id}`);
                if(requestTime) return res.status(429).json({code: 429, error: null, message: "You have reached maximum retries. Please try again after 30 minutes"})
                if(!requestTime) {
                    await redis.setAsync(
                        `employee-timesheet-${organization_id}`,
                        Date.now(),
                        'EX',
                        30 * 60
                    );
                }
            }

            const language = req.decoded.language;
            // Manager-only filter — see getTimesheet() above for context.
            const isManagerRole = req.decoded.role === 'Manager';
            const manager_id = isManagerRole ? (req.decoded.employee_id || null) : null;
            let { location_id, department_id, employee_id, start_date, end_date, skip, limit, sortColumn, sortOrder, name } = await TimeSheetValidator.getTimesheetValidationCustom().validateAsync(req.query);
            start_date = moment(start_date).format('YYYY-MM-DD');
            end_date = moment(end_date).format('YYYY-MM-DD');
            let diff = moment(end_date).diff(moment(start_date), 'days');
            if (diff >= 31) {
                return res.status(400).json({
                    code: 400,
                    data: null,
                    message: timesheetMessages.find(x => x.id === "2")[language] || timesheetMessages.find(x => x.id === "2")["en"],
                    error: "Date difference should not be more then 30 days."
                });
            }
            limit = "";
            skip = "";
            location_id = 0;
            department_id = 0;
            employee_id = 0;

            let employee_ids = [];
            if (manager_id && employee_id === 0) {
                employee_ids = _.pluck(await TimeSheetModel.getEmployeeAssignedToManager(manager_id, role_id), 'employee_id');

                if (employee_ids.length === 0) {
                    return res.status(400).json({
                        code: 400,
                        data: null,
                        message: timesheetMessages.find(x => x.id === "1")[language] || timesheetMessages.find(x => x.id === "1")["en"],
                        error: "No employees assigned to this manager."
                    });
                }
            }
            let column;
            let order;
            if (sortOrder === 'D') {
                order = `DESC`;
            } else {
                order = `ASC`;
            }

            switch (sortColumn) {
                case 'Start Time':
                    column = 'ea.start_time';
                    break;
                case 'End Time':
                    column = 'ea.end_time';
                    break;
                case 'Location':
                    column = 'ol.name';
                    break;
                case 'Department':
                    column = 'od.name';
                    break;
                case 'Email':
                    column = 'u.a_email';
                    break;
                case 'Full Name':
                    column = 'u.first_name';
                    break;
                case 'Employee Code':
                    column = 'e.emp_code';
                    break;
                case 'Office Time':
                    column = 'office_time';
                    break;
                case 'Total Time':
                    column = 'total_time';
                    break;
                case 'Active Hours':
                    column = 'computer_activities_time';
                    break;
                case 'Productive':
                    column = 'productive_duration';
                    break;
                case 'Unproductive':
                    column = 'non_productive_duration';
                    break;
                case 'Neutral':
                    column = 'neutral_duration';
                    break;
                case 'Break':
                    column = 'break_duration';
                    break;
                case 'Idle':
                    column = 'idle_duration';
                    break;
                case 'Productivity':
                    column = 'productivity';
                    break;
                default:
                    sortColumn = 'Default'
                    column = 'ea.date';
                    order = `DESC`;
                    break;
            }
            let userData;
            let productivity;
            let result;
            let total_count;
            if (['ea.date', 'ea.start_time', 'u.first_name', 'ea.end_time', 'e.emp_code', 'ol.name', 'od.name', 'u.a_email', 'TIMESTAMPDIFF(second,ea.start_time,ea.end_time)', 'total_time'].includes(column)) {
                let empids = [];
                let dates = [];
                userData = await TimeSheetModel.getAttendance({
                    organization_id, location_id, department_id, employee_id, start_date, end_date, skip, limit,
                    employee_ids, column, order, empids, dates, name,
                });
                if (userData.length === 0) return res.status(400).json({
                    code: 400,
                    data: null,
                    message: timesheetMessages.find(x => x.id === "3")[language] || timesheetMessages.find(x => x.id === "3")["en"],
                    error: "No data found for the given criteria."
                });

                empids = _.pluck(userData, 'id');
                dates = _.pluck(userData, 'date')
                total_count = userData[0].total_count;

                productivity = await TimeSheetModel.GetProductivity({
                    location_id, department_id, employee_id, organization_id, empids, dates, column, order,
                    start_date, end_date, employee_ids, productive_hours
                });
                result = userData.map((user, i) => {
                    let temp = productivity.find(element => (element.date === user.date && element.employee_id === user.id))
                    if (temp) {
                        delete temp.total_count;
                        return {
                            ...temp,
                            ...user,
                            details: user.details ? JSON.parse(user.details) : null,
                            offline: user.total_time - temp.office_time
                        };
                    } else {
                        return {
                            ...user,
                            details: user.details ? JSON.parse(user.details) : null,
                            productive_duration: 0,
                            non_productive_duration: 0,
                            neutral_duration: 0,
                            idle_duration: 0,
                            break_duration: 0,
                            computer_activities_time: 0,
                            office_time: 0,
                            productivity: 0,
                            offline: user.total_time - 0,
                        };
                    }
                });
            } else {
                let empids = [];
                let dates = [];
                const [productivity, Count] = await Promise.all([
                    TimeSheetModel.GetProductivity({
                        location_id, department_id, employee_id, organization_id, empids, dates, start_date,
                        end_date, skip, limit, column, order, employee_ids, productive_hours
                    }),
                    TimeSheetModel.GetProductivityCount({
                        location_id, department_id, employee_id, organization_id, empids, dates, start_date,
                        end_date, skip, limit, column, order, employee_ids,
                    })
                ]);
                total_count = Count;
                if (productivity.length === 0) return res.status(400).json({
                    code: 400,
                    data: null,
                    message: timesheetMessages.find(x => x.id === "3")[language] || timesheetMessages.find(x => x.id === "3")["en"],
                    error: "No data found for the given criteria."
                });
                empids = _.pluck(productivity, 'employee_id');
                dates = _.pluck(productivity, 'date');
                userData = await TimeSheetModel.getAttendance({
                    organization_id, location_id, department_id, employee_id, start_date, end_date,
                    employee_ids, empids, dates,
                });

                result = productivity.map((element, i) => {
                    let temp = userData.find(user => (element.date === user.date && element.employee_id === user.id));
                    if (temp) {
                        delete temp.total_count;
                        // return { ...element, ...temp, offline: user.total_time - temp.office_time };
                        return {
                            ...element,
                            ...temp,
                            details: temp.details ? JSON.parse(temp.details) : null,
                            offline: temp.total_time - element.office_time
                        };
                    }
                });
            }

            result = await addBreakDurationT(result, start_date, end_date, organization_id, employee_id);
            result = await addMobileUsageDuration(result, start_date, end_date, organization_id);
            return res.status(200).json({
                code: 200,
                data: {
                    user_data: result,
                    totalCount: total_count,
                },
                message: timesheetMessages.find(x => x.id === "4")[language] || timesheetMessages.find(x => x.id === "4")["en"],
                error: null
            });
        } catch (err) {
            console.log(err)
            return res.status(500).json({
                code: 500,
                data: null,
                message: "Something went wrong while fetching timesheet data.",
                error: "Internal Server Error"
            });
        }
    }

    async getUnProductiveEmployees(req, res, next) {
        try {
            if (req.decoded.role === 'Employee') {
                req.query.employee_id = req.decoded.employee_id;
            }

            const { organization_id, role_id, productive_hours } = req.decoded;

            const language = req.decoded.language;
            // Manager-only filter — see getTimesheet() above for context.
            const isManagerRole = req.decoded.role === 'Manager';
            const manager_id = isManagerRole ? (req.decoded.employee_id || null) : null;
            let { location_id, department_id, employee_id, start_date, end_date, skip, limit, sortColumn, sortOrder, name } = await TimeSheetValidator.getTimesheetValidationCustom().validateAsync(req.query);
            start_date = moment(start_date).format('YYYY-MM-DD');
            end_date = moment(end_date).format('YYYY-MM-DD');
            limit = "";
            skip = "";
            location_id = 0;
            department_id = 0;
            employee_id = 0;

            let employee_ids = [];
            if (manager_id && employee_id === 0) {
                employee_ids = _.pluck(await TimeSheetModel.getEmployeeAssignedToManager(manager_id, role_id), 'employee_id');

                if (employee_ids.length === 0) {
                    return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "1")[language] || timesheetMessages.find(x => x.id === "1")["en"], null);
                }
            }
            let column;
            let order;
            if (sortOrder === 'D') {
                order = `DESC`;
            } else {
                order = `ASC`;
            }

            sortColumn = 'Default'
            column = 'ea.date';
            order = `DESC`;

            let userData;
            let productivity;
            let result;
            let total_count;

            let empids = [];
            let dates = [];
            userData = await TimeSheetModel.getAttendance({
                organization_id, location_id, department_id, employee_id, start_date, end_date, skip, limit,
                employee_ids, column, order, empids, dates, name,
            });
            if (userData.length === 0) return sendResponse(res, 400, null, timesheetMessages.find(x => x.id === "3")[language] || timesheetMessages.find(x => x.id === "3")["en"], null);

            empids = _.pluck(userData, 'id');
            dates = _.pluck(userData, 'date');
            total_count = userData[0].total_count;

            productivity = await TimeSheetModel.GetProductivity({
                location_id, department_id, employee_id, organization_id, empids, dates, column, order,
                start_date, end_date, employee_ids, productive_hours
            });
            result = userData.map((user, i) => {
                let temp = productivity.find(element => (element.date === user.date && element.employee_id === user.id))
                if (temp) {
                    delete temp.total_count;
                    return {
                        ...temp,
                        ...user,
                        details: user.details ? JSON.parse(user.details) : null,
                        offline: user.total_time - temp.office_time
                    };
                } else {
                    return {
                        ...user,
                        details: user.details ? JSON.parse(user.details) : null,
                        productive_duration: 0,
                        non_productive_duration: 0,
                        neutral_duration: 0,
                        idle_duration: 0,
                        break_duration: 0,
                        computer_activities_time: 0,
                        office_time: 0,
                        productivity: 0,
                        offline: user.total_time - 0,
                    };
                }
            });

            let unique_EMPIds = _.pluck(result, "employee_id")?.reduce(function (acc, curr) {
                if (!acc.includes(curr))
                    acc.push(curr);
                return acc;
            }, []);

            result = result?.reduce(function (results, org) {
                (results[org.id] = results[org.id] || []).push(org);
                return results;
            }, {})

            let unProdEmployeeobj = {};

            unique_EMPIds.map((item) => {
                let count = 0
                // For Employees Work for 6 days or more than 6 days
                if (result[item].length >= 6) {
                    result[item].map((x) => {
                        if (x.productivity < 60) count++;
                    })
                    if (count >= 4) {
                        unProdEmployeeobj[item] = result[item];
                    }
                }
                // For Employees work for 5 days or more than 5 days
                else if (result[item].length == 5) {
                    result[item].map((x) => {
                        if (x.productivity < 60) count++;
                    })
                    if (count >= 3) {
                        unProdEmployeeobj[item] = result[item];
                    }
                }
                else if (result[item].length == 4) {
                    result[item].map((x) => {
                        if (x.productivity < 60) count++;
                    })
                    if (count >= 2) {
                        unProdEmployeeobj[item] = result[item];
                    }
                }
                else if (result[item].length == 3) {
                    result[item].map((x) => {
                        if (x.productivity < 60) count++;
                    })
                    if (count >= 1) {
                        unProdEmployeeobj[item] = result[item];
                    }
                }
                // For Employees Who worked for less than 3 days
                else {
                    result[item].map((x) => {
                        if (x.productivity < 60) count++;
                    })
                    if (count != 0) {
                        unProdEmployeeobj[item] = result[item];
                    }
                }
            })

            let unProdEmployee = [];

            for (const attendance of Object.values(unProdEmployeeobj)) {
                let temp = {
                    employee_id: attendance[0].employee_id,
                    department: attendance[0].department,
                    location: attendance[0].location,
                    first_name: attendance[0].first_name,
                    last_name: attendance[0].last_name,
                    emp_code: attendance[0].emp_code,
                }
                let details = {};
                attendance.map((item) => {
                    details[item.date] = Math.round(item?.productivity * 100) / 100;
                });
                temp["details"] = details;
                unProdEmployee.push(temp);
            }
            return sendResponse(res, 200, {
                user_data: unProdEmployee,
            }, timesheetMessages.find(x => x.id === "4")[language] || timesheetMessages.find(x => x.id === "4")["en"], null);
        } catch (err) {
            next(err);
        }
    }

    async getEmployeeTimesheetBreakUp(req, res, next) {
        try {
            const { attendance_id } = await TimeSheetValidator.getEmployeeTimesheetBreakUp().validateAsync(req.query);
            const language = req.decoded.language;

            actionsTracker(req, 'Timesheet %i breakup details', [attendance_id]);

            const timesheetData = await TimeSheetModel.getEmployeeTimesheetBreakUp(attendance_id);
            if (timesheetData.length === 0) return sendResponse(res, 404, null, timesheetMessages.find(x => x.id === "3")[language] || timesheetMessages.find(x => x.id === "3")["en"], null);

            return sendResponse(res, 200, { user_data: timesheetData, }, timesheetMessages.find(x => x.id === "4")[language] || timesheetMessages.find(x => x.id === "4")["en"], null);
        } catch (err) {
            next(err);
        }
    }

    async getActiveTimeAttendance(req, res, next) {
        try {
            let { organization_id, productive_hours } = req.decoded;
            let { location_id, department_id, employee_id, skip, limit, date} = await TimeSheetValidator.getActiveTimeAttendanceValidation().validateAsync(req.query);

            let [PR_REPORTS, Employee_Details] = await Promise.all([
                TimeSheetModel.getEmployeeProductivityReport({ location_id, department_id, employee_id,productive_hours, date, organization_id,  count: false }),
                TimeSheetModel.getEmployeeDetails({ location_id, department_id, employee_id, date, productive_hours, organization_id,  count: false })
            ])

            for (let empDetails of Employee_Details) {
                let temp = PR_REPORTS.find(i => i.employee_id === empDetails.id);
                if(!temp) continue;
                empDetails['activity_data'] = {};
                empDetails['total_time'] = 0;
                for(let dates of getDatesInMonthYear(`${date}`)) {
                    let active_time = PR_REPORTS.find(i => i.employee_id === empDetails.id && i.date === dates)?.active_duration || null;
                    empDetails['activity_data'][dates.split('-')[2]] = active_time;
                    empDetails['total_time'] += active_time;
                }
            }

            return res.json({ code : 200, message: "Success", data: Employee_Details, error: null });
        }
        catch (err) {
            next(err);
        }
    }
}
const addBreakDurationT = async (result, start_date, end_date, organization_id) => {
    for (let item of result) {
        let breakTime = await BreakActivityModel.aggregate([
            {
                $match: {
                    organization_id: organization_id,
                    employee_id: item.employee_id || item.id,
                    date: { '$gte': start_date, '$lte': end_date },
                }
            }
        ]);

        if (breakTime?.length) {
            start_date = moment(start_date).format('YYYY-MM-DD');
            end_date = moment(end_date).format('YYYY-MM-DD');
            let breakData = breakTime.reduce((t, x) => {
                if (typeof item.date == 'object') { // if date is in array of dates
                    if (item.date.find(i => moment(i).diff(moment(start_date), 'days') >= 0 && moment(i).diff(moment(end_date), 'days') <= 0 && i == x.date)) t += x.offline_time;
                } else { // if single date
                    if (x.date == item.date && x.status == 1) t += x.offline_time;
                }
                return t;
            }, 0);
            item.break_duration = breakData;
        }
    }
    return result;
}

const addMobileUsageDuration = async (results, start_date, end_date, organization_id, is_single_employee) => {
    let employee_ids = Array.from(new Set(_.pluck(results, 'employee_id')));
    if (is_single_employee) {
        employee_ids = Array.from(new Set(_.pluck(results, 'id')));
    }
    let startTime = moment(start_date).add(-1, "day").utc().toISOString();
    let endTime = moment(end_date).add(2, "day").utc().toISOString();
    let taskResponse = await TimeSheetModel.getTaskDetails(startTime, endTime, employee_ids);
    const currentTime = moment();
    
    for (const result of results) {
        let mobileUsageDuration = 0;
        // Detect active attendance: start_time equals end_time (total_time is 0)
        const isActiveAttendance = moment(result.start_time).isSame(moment(result.end_time));
        const effectiveEndTime = isActiveAttendance ? currentTime : moment(result.end_time);
        
        let filteredTasks = taskResponse.filter(task => task.assigned_user === result.employee_id);
        if (is_single_employee) {
            filteredTasks = taskResponse.filter(task => task.assigned_user === result.id);
        }
        for (const filteredTask of filteredTasks) {
            for (const iterator of filteredTask.task_working_status) {
                if(iterator.is_desktop_task) continue;
                
                // Use current time as task end_time if task has no end_time (active task)
                const taskEndTime = iterator.end_time ? moment(iterator.end_time) : currentTime;
                
                if (moment(iterator.start_time).isBetween(result.start_time, effectiveEndTime) && taskEndTime.isBetween(result.start_time, effectiveEndTime)) {
                    mobileUsageDuration += taskEndTime.diff(moment(iterator.start_time), 'seconds');
                }
                else if (!moment(iterator.start_time).isBetween(result.start_time, effectiveEndTime) && taskEndTime.isBetween(result.start_time, effectiveEndTime)) {
                    mobileUsageDuration += taskEndTime.diff(moment(result.start_time), 'seconds');
                }
                else if (moment(iterator.start_time).isBetween(result.start_time, effectiveEndTime) && !taskEndTime.isBetween(result.start_time, effectiveEndTime)) {
                    mobileUsageDuration += effectiveEndTime.diff(moment(iterator.start_time), 'seconds');
                }
                else if (moment(iterator.start_time).startOf('second').isSame(moment(result.start_time).startOf('second')) && taskEndTime.startOf('second').isSame(effectiveEndTime.startOf('second'))) {  
                    mobileUsageDuration += effectiveEndTime.startOf('second').diff(moment(iterator.start_time).startOf('second'), 'seconds');  
                }
            }
        }
        result.mobileUsageDuration = mobileUsageDuration;
    }
    return results;
}

function getDatesInMonthYear(input) {
    const year = input.slice(0, 4);
    const month = input.slice(4);
    
    const startDate = moment(`${year}-${month}-01`);
    const endDate = moment(startDate).endOf('month');
    
    const dates = [];
    let currentDate = moment(startDate);
    
    while (currentDate <= endDate) {
      dates.push(currentDate.format('YYYY-MM-DD'));
      currentDate = currentDate.add(1, 'day');
    }
  
    return dates;
}


module.exports = new TimeSheetController;