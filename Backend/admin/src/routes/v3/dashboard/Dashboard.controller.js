const _ = require('underscore');
const moment = require('moment-timezone');

const DashboardModel = require('./Dashboard.model');
const EmpService = require('./services/Employee.service');
const DashboardValidator = require('./Dashboard.validator');
const actionsTracker = require('../services/actionsTracker');
const { dashboardMessages, transferMessages } = require("../../../utils/helpers/LanguageTranslate");
const jobs = require('../../../jobs/');
const redis = require('../auth/services/redis.service');
const Comman = require('../../../utils/helpers/Common');
const { translate } = require('../../../utils/messageTranslation')
const config = require('../../../../../config/config');
const passwordService = require('../auth/services/password.service');

const maskingIP = require('../../../utils/helpers/IPMasking');

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const timesByDate = (data, date, timezone) => {
    date = new Date(date)
    const day = DAYS[date.getDay()];
    const shift = data[day];

    if (!shift || !shift.status) {
        return {};
    }
    let endDate = date;
    if (Comman.isEndInNextDay(shift.time.start, shift.time.end)) {
        endDate = moment(date, "YYYY-MM-DD").add(1, 'day');
    } else {
        return {};
    }

    return {
        start: Comman.setDateTime(date, shift.time.start, timezone),
        end: Comman.setDateTime(endDate, shift.time.end, timezone),
    };
}

class DashboardController {
    /**
     * Get organization registered,suspended,absent,online, offline and idle users.
     *
     * @function getEmployees
     * @memberof DashboardController
     * @param {*} req
     * @param {*} res
     * @param {*} next
     * @returns {array} -  user list or error .
     **/
    async getEmployees(req, res, next) {
        try {
            actionsTracker(req, 'Dashboard employees requested.');
            const organization_id = req.decoded.organization_id;
            const {
                date
            } = await DashboardValidator.getAbsentEmployee().validateAsync(req.query);
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;
            let [registeredEmp, suspendedEmp, absentEmp, onlineEmp, offlineEmp, idealEmp] = await Promise.all([
                DashboardModel.getRegisteredEmp(organization_id, manager_id, to_assigned_role),
                DashboardModel.getSuspendedEmp(organization_id, manager_id, to_assigned_role),
                DashboardModel.getAbsentEmp(organization_id, manager_id, date, to_assigned_role),
                DashboardModel.getOnlineEmp(organization_id, manager_id, date, to_assigned_role),
                DashboardModel.getOfflineEmp(organization_id, manager_id, date, to_assigned_role),
                getidealtime(organization_id, manager_id, date, to_assigned_role, next)
            ]);
            /**To get employee status those exists with shift and fixed mode with midday exists */
            const previousday = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
            let [onlinePrevDayEmp, offlinePrevDayEmp, idealPrevDayEmp] = await Promise.all([
                DashboardModel.getOnlineEmp(organization_id, manager_id, previousday, to_assigned_role),
                DashboardModel.getOfflineEmp(organization_id, manager_id, previousday, to_assigned_role),
                getidealtime(organization_id, manager_id, previousday, to_assigned_role, next)
            ]);

            let isAutoShift = config.AUTO_SHIFT_FEATURES.includes(organization_id);

            /**Check employee exists with midday shift and fixed mode */
            offlinePrevDayEmp = getPrevDayEmpWithShiftAndFixed(offlinePrevDayEmp, previousday, true, 'offline');
            onlinePrevDayEmp = getPrevDayEmpWithShiftAndFixed(onlinePrevDayEmp, previousday, true, 'online', isAutoShift);
            idealPrevDayEmp = getPrevDayEmpWithShiftAndFixed(idealPrevDayEmp, previousday, false, 'idle');

            /**Make user as unic possibility with duplicates exists in two dates */
            absentEmp = removeDuplicates(absentEmp, [...offlinePrevDayEmp, ...onlinePrevDayEmp, ...idealPrevDayEmp]);
            onlineEmp = onlinePrevDayEmp.length > 0 ? arrayUnique([...onlineEmp, ...onlinePrevDayEmp]) : onlineEmp;
            offlineEmp = offlinePrevDayEmp.length > 0 ? arrayUnique([...offlineEmp, ...offlinePrevDayEmp]) : offlineEmp;
            offlineEmp = removeDuplicates(offlineEmp, onlineEmp);
            idealEmp = idealPrevDayEmp.length > 0 ? arrayUnique([...idealEmp, ...idealPrevDayEmp]) : idealEmp;

            const onlineEmps = getOnlineUsers(onlineEmp, idealEmp);
            const idleEmps = getOnlineUsers(idealEmp, offlineEmp);
            if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
                absentEmp = getUnicEmployeeByEmpcode(absentEmp, [...onlineEmps, ...offlineEmp, ...idleEmps]);
            }
            return res.json({
                code: 200,
                data: {
                    registeredEmp,
                    suspendedEmp,
                    absentEmp,
                    onlineEmps,
                    offlineEmp,
                    idleEmps
                },
                message: 'Dashboard Employees',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }


    async projManageVal(req, res, next) {
        try {
            const {organization_id, username,user_id, first_name, last_name, email, contact_number, address} = req.decoded;
            const encryptData = {organization_id, username, user_id, first_name, last_name, email, contact_number, address}
            const encryptedToken = passwordService.encrypt(JSON.stringify(encryptData), process.env.WORKFORCE_PASSWORD);
            res.json({
                code: 200,
                data: {
                    encryptedToken:encryptedToken,
                },
                message: 'WorkForce Access Token',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    // Get Employees with rate Limit routes Start here
    async getEmployeesRateLimit(req, res, next) {
        try {
            const organization_id = req.decoded.organization_id;
            if(!req.tailored) {
                let requestTime = await redis.getAsync(`employees-status-${organization_id}`);
                if(requestTime) return res.status(429).json({code: 429, error: null, message: "You have reached maximum retries. Please try again after one minute"})
                if(!requestTime) {
                    await redis.setAsync(
                        `employees-status-${organization_id}`,
                        Date.now(),
                        'EX',
                        60
                    );
                }
            }
            const {
                date
            } = await DashboardValidator.getAbsentEmployee().validateAsync(req.query);
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;
            let [registeredEmp, absentEmp, onlineEmp, offlineEmp, idealEmp] = await Promise.all([
                DashboardModel.getRegisteredEmp(organization_id, manager_id, to_assigned_role),
                //DashboardModel.getSuspendedEmp(organization_id, manager_id, to_assigned_role),
                DashboardModel.getAbsentEmp(organization_id, manager_id, date, to_assigned_role),
                DashboardModel.getOnlineEmp(organization_id, manager_id, date, to_assigned_role),
                DashboardModel.getOfflineEmp(organization_id, manager_id, date, to_assigned_role),
                getidealtime(organization_id, manager_id, date, to_assigned_role, next)
            ]);
            let suspendedEmp = registeredEmp.filter(element => element.status == 2);
            
            /**To get employee status those exists with shift and fixed mode with midday exists */
            const previousday = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
            let [onlinePrevDayEmp, offlinePrevDayEmp, idealPrevDayEmp] = await Promise.all([
                DashboardModel.getOnlineEmp(organization_id, manager_id, previousday, to_assigned_role),
                DashboardModel.getOfflineEmp(organization_id, manager_id, previousday, to_assigned_role),
                getidealtime(organization_id, manager_id, previousday, to_assigned_role, next)
            ]);
            /**Check employee exists with midday shift and fixed mode */
            offlinePrevDayEmp = getPrevDayEmpWithShiftAndFixed(offlinePrevDayEmp, previousday, true, 'offline');
            onlinePrevDayEmp = getPrevDayEmpWithShiftAndFixed(onlinePrevDayEmp, previousday, true, 'online');
            idealPrevDayEmp = getPrevDayEmpWithShiftAndFixed(idealPrevDayEmp, previousday, false, 'idle');

            /**Make user as unic possibility with duplicates exists in two dates */
            absentEmp = removeDuplicates(absentEmp, [...offlinePrevDayEmp, ...onlinePrevDayEmp, ...idealPrevDayEmp]);
            onlineEmp = onlinePrevDayEmp.length > 0 ? arrayUnique([...onlineEmp, ...onlinePrevDayEmp]) : onlineEmp;
            offlineEmp = offlinePrevDayEmp.length > 0 ? arrayUnique([...offlineEmp, ...offlinePrevDayEmp]) : offlineEmp;
            offlineEmp = removeDuplicates(offlineEmp, onlineEmp);
            idealEmp = idealPrevDayEmp.length > 0 ? arrayUnique([...idealEmp, ...idealPrevDayEmp]) : idealEmp;

            const onlineEmps = getOnlineUsers(onlineEmp, idealEmp);
            const idleEmps = getOnlineUsers(idealEmp, offlineEmp);
            if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
                absentEmp = getUnicEmployeeByEmpcode(absentEmp, [...onlineEmps, ...offlineEmp, ...idleEmps]);
            }

            return res.status(200).json({
                code: 200,
                data: {
                    registeredEmp,
                    suspendedEmp,
                    absentEmp,
                    onlineEmps,
                    offlineEmp,
                    idleEmps,
                    registeredEmpCount : registeredEmp.length,
                    suspendedEmpCount : suspendedEmp.length,
                    absentEmpCount : absentEmp.length,
                    onlineEmpCount : onlineEmps.length,
                    offlineEmpCount : offlineEmp.length,
                    idleEmpCount : idleEmps.length,
                },
                message: 'Dashboard Employees',
                error: null
            });
        } catch (err) {
            return res.status(500).json({
                code: 500,
                error: err.message || 'Internal Server Error',
                message: 'Error fetching employees data',
                data: null
            });
        }
    }
// Get Employees with rate Limit routes end here

    async getEmployees_old(req, res, next) {
        try {
            actionsTracker(req, 'Dashboard employees requested.');
            const organization_id = req.decoded.organization_id;
            const {
                date
            } = await DashboardValidator.getAbsentEmployee().validateAsync(req.query);
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;
            const empData = await Promise.all([
                DashboardModel.getRegisteredEmp(organization_id, manager_id, to_assigned_role),
                DashboardModel.getSuspendedEmp(organization_id, manager_id, to_assigned_role),
                DashboardModel.getAbsentEmp(organization_id, manager_id, date, to_assigned_role),
                DashboardModel.getOnlineEmp(organization_id, manager_id, date, to_assigned_role),
                DashboardModel.getOfflineEmp(organization_id, manager_id, date, to_assigned_role),
                getidealtime(organization_id, manager_id, date, to_assigned_role)
            ]);

            const [registeredEmp, suspendedEmp, absentEmp, onlineEmp, offlineEmp, idealEmp] = empData;
            const onlineEmps = getOnlineUsers(onlineEmp, idealEmp)
            const idleEmps = getOnlineUsers(idealEmp, offlineEmp)
            return res.json({
                code: 200,
                data: {
                    registeredEmp,
                    suspendedEmp,
                    absentEmp,
                    onlineEmps,
                    offlineEmp,
                    idleEmps
                },
                message: 'Dashboard Employees',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }


    async getEmployeeProductivity(req, res, next) {
        try {
            actionsTracker(req, 'Dashboard employees productivity requested (?).', [req.query]);
            const {
                location_id,
                department_id,
                from_date,
                to_date
            } = await DashboardValidator.getEmployeeProductivity().validateAsync(req.query);
            const organization_id = req.decoded.organization_id;
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;
            let search_type, search_data;
            if (department_id) {
                search_type = 'department';
                search_data = department_id;
            } else if (location_id) {
                search_type = 'location';
                search_data = location_id;
            } else {
                search_type = 'organization';
                search_data = organization_id;
            }

            let empProductivity = [];
            let role_type = 'Admin',
                role_id = organization_id;
            if (manager_id) {
                role_type = 'Manager';
                role_id = manager_id;

                search_data = _.pluck(
                    await DashboardModel.getEmpOfDeptLocOrOrgByType(search_type, search_data, role_type, role_id, to_assigned_role),
                    'employee_id'
                );
            }
            empProductivity = await DashboardModel.getEmployeeProductivity({
                search_type,
                search_data,
                from_date,
                to_date,
                role_type
            });

            if (empProductivity.length > 0) {
                const employees = await DashboardModel.getEmployeesName(_.pluck(empProductivity, '_id'));

                empProductivity = empProductivity.map(item => {
                    const employee = employees.find(x => x.id === item._id);

                    if (!employee) return null;
                    const data = {
                        name: employee.name,
                        ...item,
                        total_duration: (item.productive_duration + item.non_productive_duration + item.neutral_duration)
                    }
                    delete data._id;
                    return data;
                }).filter(x => x);
            }

            return res.json({
                code: empProductivity.length === 0 ? 404 : 200,
                data: empProductivity,
                message: 'Employee Productivity',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    async getLocationProductivity(req, res, next) {
        try {
            actionsTracker(req, 'Dashboard location productivity requested (?).', [req.query]);
            const {
                location_id,
                from_date,
                to_date
            } = await DashboardValidator.getLocationProductivity().validateAsync(req.query);
            const organization_id = req.decoded.organization_id;
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;

            let search_type, search_data;
            if (location_id) {
                search_type = 'location';
                search_data = location_id;
            } else {
                search_type = 'organization';
                search_data = organization_id;
            }

            let locationProductivity = [];
            let role_type = 'Admin',
                role_id = organization_id;
            if (manager_id) {
                role_type = 'Manager';
                role_id = manager_id;

                search_data = _.pluck(
                    await DashboardModel.getEmpOfDeptLocOrOrgByType(search_type, search_data, role_type, role_id, to_assigned_role),
                    'employee_id'
                );
            }
            locationProductivity = await DashboardModel.getLocationProductivity({
                search_type,
                search_data,
                from_date,
                to_date,
                role_type
            });

            if (locationProductivity.length > 0) {
                const locations = await DashboardModel.getLocationName(_.pluck(locationProductivity, '_id'));

                locationProductivity = locationProductivity.map(item => {
                    const location = locations.find(x => x.id === item._id);
                    const data = {
                        name: location ? location.name : '',
                        ...item,
                        total_duration: (item.productive_duration + item.non_productive_duration + item.neutral_duration)
                    }
                    delete data._id;
                    return data;
                });
            }

            return res.json({
                code: locationProductivity.length === 0 ? 404 : 200,
                data: locationProductivity,
                message: 'Location Productivity',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    async getDepartmentProductivity(req, res, next) {
        actionsTracker(req, 'Dashboard department productivity requested (?).', [req.query]);
        try {
            const {
                department_id,
                from_date,
                to_date
            } = await DashboardValidator.getDepartmentProductivity().validateAsync(req.query);
            const organization_id = req.decoded.organization_id;
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;

            let search_type, search_data;
            if (department_id) {
                search_type = 'department';
                search_data = department_id;
            } else {
                search_type = 'organization';
                search_data = organization_id;
            }

            let departmentProductivity = [];
            let role_type = 'Admin',
                role_id = organization_id;
            if (manager_id) {
                role_type = 'Manager';
                role_id = manager_id;

                search_data = _.pluck(
                    await DashboardModel.getEmpOfDeptLocOrOrgByType(search_type, search_data, role_type, role_id, to_assigned_role),
                    'employee_id'
                );
            }
            departmentProductivity = await DashboardModel.getDepartmentProductivity({
                search_type,
                search_data,
                from_date,
                to_date,
                role_type
            });

            if (departmentProductivity.length > 0) {
                const departments = await DashboardModel.getDepartmentName(_.pluck(departmentProductivity, '_id'));

                departmentProductivity = departmentProductivity.map(item => {
                    const department = departments.find(x => x.id === item._id)
                    const data = {
                        name: department ? department.name : '',
                        ...item,
                        total_duration: (item.productive_duration + item.non_productive_duration + item.neutral_duration)
                    }
                    delete data._id;
                    return data;
                });
            }

            return res.json({
                code: departmentProductivity.length === 0 ? 404 : 200,
                data: departmentProductivity,
                message: 'Department Productivity',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    async getOrganizationProductivity(req, res, next) {
        try {
            actionsTracker(req, 'Dashboard organisation productivity requested (?).', [req.query]);
            const {
                date
            } = await DashboardValidator.getOrganizationProductivity().validateAsync(req.query);
            const organization_id = req.decoded.organization_id;
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;

            let search_data = organization_id,
                search_type = 'organization';
            let role_type = 'Admin',
                role_id = organization_id;
            if (manager_id) {
                role_type = 'Manager';
                role_id = manager_id;

                search_data = _.pluck(
                    await DashboardModel.getEmpOfDeptLocOrOrgByType(search_type, search_data, role_type, role_id, to_assigned_role),
                    'employee_id'
                );
            }
            const [
                [todayProductivity],
                [weekProductivity]
            ] = await Promise.all([
                DashboardModel.getOrganizationProductivity({
                    role_type,
                    search_data,
                    from_date: date,
                    to_date: date
                }),
                DashboardModel.getOrganizationProductivity({
                    role_type,
                    search_data,
                    from_date: moment(date).startOf('week').format('YYYY-MM-DD'),
                    to_date: date
                })
            ]);
            // const [[todayProductivity], [weekProductivity]] = await Promise.all([
            //     DashboardModel.getOrganizationProductivity(organization_id, date, date),
            //     DashboardModel.getOrganizationProductivity(organization_id, moment(date).startOf('week').format('YYYY-MM-DD'), date)
            // ]);

            const results = {
                productive_duration: todayProductivity ? todayProductivity.productive_duration : 0,
                non_productive_duration: todayProductivity ? todayProductivity.non_productive_duration : 0,
                total_duration: weekProductivity ? weekProductivity.productive_duration : 0
            }

            return res.json({
                code: 200,
                data: results,
                message: 'Organization Productivity',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    async getActiveDays(req, res, next) {
        try {
            actionsTracker(req, 'Dashboard activity days requested (?).', [req.query]);
            const {
                location_id,
                department_id,
                from_date,
                to_date
            } = await DashboardValidator.getActiveDays().validateAsync(req.query);
            const organization_id = req.decoded.organization_id;
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;

            let search_type, search_data;
            if (department_id) {
                search_type = 'department';
                search_data = department_id;
            } else if (location_id) {
                search_type = 'location';
                search_data = location_id;
            } else {
                search_type = 'organization';
                search_data = organization_id;
            }

            const employee_ids = manager_id ?
                _.pluck(await DashboardModel.getEmployeesManager(search_type, search_data, manager_id, to_assigned_role), 'employee_id') :
                _.pluck(await DashboardModel.getEmployees(search_type, search_data), 'employee_id');

            const employeeActivities = await DashboardModel.getActiveEmployeesCount(employee_ids, from_date, to_date);

            const result = employeeActivities.map(item => {
                return {
                    date: moment(item.date).format('YYYY-MM-DD'),
                    total_employees: employee_ids.length,
                    active_employees: item.activeEmployeesCount,
                    percentage: (item.activeEmployeesCount / employee_ids.length) * 100
                }
            })

            return res.json({
                code: result.length === 0 ? 404 : 200,
                data: result,
                message: 'Active Days Percentage',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    async getTopAppWeb(req, res, next) {
        try {
            actionsTracker(req, 'Dashboard top web application requested (?).', [req.query]);
            let {
                type,
                start_date,
                end_date
            } = await DashboardValidator.getTopAppWeb().validateAsync(req.query);
            const organization_id = req.decoded.organization_id;
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;

            let search_data = [organization_id];
            if (manager_id) {
                search_data = _.pluck(await DashboardModel.getEmployeesManager('organization', organization_id, manager_id, to_assigned_role), 'employee_id')
            }

            let topAppWebs = await DashboardModel.getTopAppWeb({
                type,
                manager_id,
                search_data,
                start_date,
                end_date
            });
            const total_duration = topAppWebs.reduce((sum, {
                duration
            }) => sum + duration, 0);

            topAppWebs = topAppWebs.map(item => {
                const data = {
                    ...item,
                    percentage: ((item.duration / total_duration) * 100).toFixed(2),
                    idle_percentage: ((item.idle_duration / total_duration) * 100).toFixed(2)
                }
                // delete data._id;

                return data;
            });

            // topAppWebs = [
            //     {
            //         "duration": 60,
            //         "name": "us04web.zoom.us",
            //         "percentage": "58.82"
            //     },
            //     {
            //         "duration": 34,
            //         "name": "sociobards.atlassian.net",
            //         "percentage": "33.33"
            //     },
            //     {
            //         "duration": 8,
            //         "name": "donate.mozilla.org",
            //         "percentage": "7.84"
            //     }
            // ];
            // if (type === 1) {
            //     topAppWebs = [
            //         {
            //             "duration": 60,
            //             "name": "telegram",
            //             "percentage": "58.82"
            //         },
            //         {
            //             "duration": 34,
            //             "name": "postman",
            //             "percentage": "33.33"
            //         },
            //         {
            //             "duration": 8,
            //             "name": "vs code",
            //             "percentage": "7.84"
            //         }
            //     ];
            // }

            let ipMaskingOrgId = process.env.IP_MASKING_ORG_ID.split(",");
            if (ipMaskingOrgId.includes(String(organization_id))){
                topAppWebs = topAppWebs.map(x => {
                    x.name = maskingIP(x.name);
                    return x;
                });
            }

            return res.json({
                code: 200,
                data: topAppWebs,
                message: type === 1 ? 'top apps' : 'top websites',
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    async getPerformance(req, res, next) {
        try {
            actionsTracker(req, 'Dashboard performance requested (?).', [req.query]);
            let {
                category,
                type,
                start_date,
                end_date
            } = await DashboardValidator.getPerformance().validateAsync(req.query);
            const {
                organization_id,
                language,
                productive_hours
            } = req.decoded;
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;

            let search_data = [organization_id];
            if (manager_id) {
                search_data = _.pluck(await DashboardModel.getEmployeesManager('organization', organization_id, manager_id, to_assigned_role), 'employee_id')
            }

            let performance = await DashboardModel.getPerformance({
                category,
                type,
                manager_id,
                search_data,
                start_date,
                end_date
            });

            if (performance.length > 0) {
                const loc_dept_data = category === 'location' ?
                    await DashboardModel.getLocationName(_.pluck(performance, '_id')) :
                    await DashboardModel.getDepartmentName(_.pluck(performance, '_id'))

                const total_duration = performance.reduce((sum, {
                    duration
                }) => sum + duration, 0);
                const totaldays = moment(end_date).diff(moment(start_date), 'days') + 1;
                performance = performance.map(item => {
                    const loc_dept = loc_dept_data.find(x => x.id === item._id);
                    let percentage, idle_percentage;
                    if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
                        percentage = ((item.duration / (30600 * item.count)) * 100).toFixed(2);
                        idle_percentage = ((item.idle_duration / (30600 * item.count)) * 100).toFixed(2);
                    } else if (productive_hours !== 0) {
                        percentage = ((item.duration / (productive_hours * item.count)) * 100).toFixed(2);
                        idle_percentage = ((item.idle_duration / (productive_hours * item.count)) * 100).toFixed(2);
                    } else {
                        percentage = ((item.duration / total_duration) * 100).toFixed(2);
                        idle_percentage = ((item.idle_duration / total_duration) * 100).toFixed(2);
                    }
                    if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString())) {
                        if (+(percentage) > 100) percentage = 100;
                        if (+(idle_percentage) > 100) idle_percentage = 100;
                    }
                    const data = {
                        name: loc_dept ? loc_dept.name : '',
                        ...item,
                        percentage: isNaN(percentage) ? 0 : percentage,
                        idle_percentage: isNaN(idle_percentage) ? 0 : idle_percentage,
                    }
                    delete data._id;
                    return data;
                });
            }
            performance = performance.filter(item => item.duration !== 0);


            return res.json({
                code: 200,
                data: performance,
                message: category === 'location' ? dashboardMessages.find(x => x.id === "2")[language] || dashboardMessages.find(x => x.id === "2")["en"] : dashboardMessages.find(x => x.id === "3")[language] || dashboardMessages.find(x => x.id === "3")["en"],
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    async getProductiveAndNonProductive(req, res, next) {
        try {
            actionsTracker(req, 'Dashboard productive/non productive requested (?).', [req.query]);
            let {
                location_id,
                department_id,
                from_date,
                to_date,
                type
            } = await DashboardValidator.productive().validateAsync(req.query);
            const {
                organization_id,
                language,
                productive_hours
            } = req.decoded;
            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;
            let employee_ids = null;
            if (location_id === 'null') {
                location_id = null;
            }
            if (department_id === 'null') {
                department_id = null;
            }

            if (manager_id) {
                employee_ids = _.pluck(await DashboardModel.getAssignedEmployees(location_id, department_id, manager_id, to_assigned_role), 'employee_id');
            }

            let data = await DashboardModel.getProAndNonProductive(organization_id, location_id, department_id, from_date, to_date, manager_id, employee_ids, type);

            data = data.filter(item => item.duration !== 0);

            let ids = _.pluck(data, '_id');
            if (data.length === 0) return res.json({
                code: 404,
                data: null,
                message: dashboardMessages.find(x => x.id === "1")[language] || dashboardMessages.find(x => x.id === "1")["en"],
                error: null
            });

            let employees = await DashboardModel.getEmployeesData(ids);
            const totaldays = moment(to_date).diff(moment(from_date), 'days') + 1;

            const result = data.map(item => {
                const obj = employees.find(o => o.id === item._id);
                if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
                    let percentage = (item.duration / (30600 * totaldays)) * 100;
                    let idle_percentage = (item.idle_duration / (30600 * totaldays)) * 100;
                    if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString())) {
                        if (+(percentage) > 100) percentage = 100;
                        if (+(idle_percentage) > 100) idle_percentage = 100;
                    }
                    return {
                        duration: item.duration,
                        idle_duration: item.idle_duration,
                        percentage,
                        idle_percentage,
                        ...obj
                    }
                } else if (productive_hours !== 0) {
                    let percentage = (item.duration / (productive_hours * totaldays)) * 100;
                    let idle_percentage = (item.idle_duration / (productive_hours * totaldays)) * 100;
                    if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString())) {
                        if (+(percentage) > 100) percentage = 100;
                        if (+(idle_percentage) > 100) idle_percentage = 100;
                    }
                    return {
                        duration: item.duration,
                        idle_duration: item.idle_duration,
                        percentage,
                        idle_percentage,
                        ...obj
                    }
                } else {
                    let percentage = (item.duration / (item.productive_duration + item.non_productive_duration + item.neutral_duration + item.idle_duration + item.break_duration)) * 100;
                    let idle_percentage = (item.idle_percentage / (item.productive_duration + item.non_productive_duration + item.neutral_duration + item.idle_duration + item.break_duration)) * 100;
                    if (config?.cappingProductivityOrgs.split(',').includes(organization_id.toString())) {
                        if (+(percentage) > 100) percentage = 100;
                        if (+(idle_percentage) > 100) idle_percentage = 100;
                    }
                    return {
                        duration: item.duration,
                        idle_duration: item.idle_duration,
                        percentage,
                        idle_percentage,
                        ...obj
                    }
                }
            });

            return res.json({
                code: result.length === 0 ? 404 : 200,
                data: result,
                message: 'data',
                error: null
            });

        } catch (err) {
            console.log('====', err);
            next(err);
        }
    }
    /**
         * Organization activity with today,yesterday and week.
         *
         * @function getActivityBreakdown
         * @memberof DashboardController
         * @param {*} req
         * @param {*} res
         * @param {*} next
         * @returns {Object} -  organization activity or error .
         * @see also {@link `${process.env.API_URL_DEV}/api/v3/explorer/#/Dashboard/get_dashboard_activity_breakdown`}
         */
    async getActivityBreakdown(req, res, next) {
        try {
            actionsTracker(req, 'Dashboard activity breakdown requested (?).', [req.query]);
            const {
                from_date,
                to_date,
                type
            } = await DashboardValidator.activityBeakdown().validateAsync(req.query);

            const manager_id = req.decoded.employee_id || null;
            const to_assigned_role = req.decoded.role_id || null;
            let employee_ids = null;
            const {
                organization_id,
                language,
                productive_hours
            } = req.decoded;


            const yesterday = moment(to_date).subtract(1, "days").format('YYYY-MM-DD');
            if (manager_id) {
                let location_id = null;
                let department_id = null;
                employee_ids = _.pluck(await DashboardModel.getAssignedEmployees(location_id, department_id, manager_id, to_assigned_role), 'employee_id');
            }

            let [todays, yesterdays, thisWeek] = await Promise.all([
                DashboardModel.getActivityBreakdown(organization_id, to_date, to_date, manager_id, employee_ids, type),
                DashboardModel.getActivityBreakdown(organization_id, yesterday, yesterday, manager_id, employee_ids, type),
                DashboardModel.getActivityBreakdown(organization_id, from_date, to_date, manager_id, employee_ids, type),
            ]);
            if (type == 'organization') {
                if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
                    if (todays.length > 0) {
                        todays[0].productivePer = ((todays[0].productive_duration / (30600 * todays[0].count)) * 100);
                        todays[0].nonProductivePer = ((todays[0].non_productive_duration / (30600 * todays[0].count)) * 100);
                    }
                    if (yesterdays.length > 0) {
                        yesterdays[0].productivePer = ((yesterdays[0].productive_duration / (30600 * yesterdays[0].count)) * 100);
                        yesterdays[0].nonProductivePer = ((yesterdays[0].non_productive_duration / (30600 * yesterdays[0].count)) * 100);
                    }

                    if (thisWeek.length > 0) {
                        thisWeek[0].productivePer = ((thisWeek[0].productive_duration / (30600 * thisWeek[0].count)) * 100);
                        thisWeek[0].nonProductivePer = ((thisWeek[0].non_productive_duration / (30600 * thisWeek[0].count)) * 100);
                    }
                } else if (productive_hours !== 0) {
                    if (todays.length > 0) {
                        todays[0].productivePer = ((todays[0].productive_duration / (productive_hours * todays[0].count)) * 100);
                        todays[0].nonProductivePer = ((todays[0].non_productive_duration / (productive_hours * todays[0].count)) * 100);
                        todays[0].neutralPer = ((todays[0].neutral_duration / (productive_hours * todays[0].count)) * 100);
                    }
                    if (yesterdays.length > 0) {
                        yesterdays[0].productivePer = ((yesterdays[0].productive_duration / (productive_hours * yesterdays[0].count)) * 100);
                        yesterdays[0].nonProductivePer = ((yesterdays[0].non_productive_duration / (productive_hours * yesterdays[0].count)) * 100);
                        yesterdays[0].neutralPer = ((yesterdays[0].neutral_duration / (productive_hours * yesterdays[0].count)) * 100);
                    }

                    if (thisWeek.length > 0) {
                        thisWeek[0].productivePer = ((thisWeek[0].productive_duration / (productive_hours * thisWeek[0].count)) * 100);
                        thisWeek[0].nonProductivePer = ((thisWeek[0].non_productive_duration / (productive_hours * thisWeek[0].count)) * 100);
                        thisWeek[0].neutralPer = ((thisWeek[0].neutral_duration / (productive_hours * thisWeek[0].count)) * 100);
                    }
                }
            } else if (type == 'employee') {
                let empIds = _.unique([..._.pluck(todays, '_id'), ..._.pluck(yesterday, '_id'), ..._.pluck(thisWeek, '_id')]);
                let employeeData = [];
                if (empIds.length) {
                    employeeData = await DashboardModel.getEmployeeData({ orgId: organization_id, empIds });
                }
                const employees = {};
                for await (const employee of employeeData) {
                    employees[employee.id] = employee;
                }
                todays = todays.map(today => {
                    const emp = employees[today._id];
                    if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
                        today.productivePer = ((today.productive_duration / (30600 * today.count)) * 100);
                        today.nonProductivePer = ((today.non_productive_duration / (30600 * today.count)) * 100);
                    } else if (productive_hours !== 0) {
                        today[0].productivePer = ((today[0].productive_duration / (productive_hours * today[0].count)) * 100);
                        today[0].nonProductivePer = ((today[0].non_productive_duration / (productive_hours * today[0].count)) * 100);
                        today[0].neutralPer = ((today[0].neutral_duration / (productive_hours * today[0].count)) * 100);
                    }
                    return { ...today, ...emp };
                });
                yesterdays = yesterdays.map(yesterday => {
                    const emp = employees[yesterday._id];
                    if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
                        yesterday.productivePer = ((yesterday.productive_duration / (30600 * yesterday.count)) * 100);
                        yesterday.nonProductivePer = ((yesterday.non_productive_duration / (30600 * yesterday.count)) * 100);
                    } else if (productive_hours !== 0) {
                        yesterday.productivePer = ((yesterday.productive_duration / (productive_hours * yesterday.count)) * 100);
                        yesterday.nonProductivePer = ((yesterday.non_productive_duration / (productive_hours * yesterday.count)) * 100);
                        yesterday.neutralPer = ((yesterday.neutral_duration / (productive_hours * yesterday.count)) * 100);
                    }
                    return { ...yesterday, ...emp };
                });
                thisWeek = thisWeek.map(week => {
                    const emp = employees[week._id];
                    if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
                        week.productivePer = ((week.productive_duration / (30600 * week.count)) * 100);
                        week.nonProductivePer = ((week.non_productive_duration / (30600 * week.count)) * 100);
                    } else if (productive_hours !== 0) {
                        week.productivePer = ((week.productive_duration / (productive_hours * week.count)) * 100);
                        week.nonProductivePer = ((week.non_productive_duration / (productive_hours * week.count)) * 100);
                        week.neutralPer = ((week.neutral_duration / (productive_hours * week.count)) * 100);
                    }
                    return { ...week, ...emp };
                });
            }
            let todaysCount, yesterdaysCount, thisWeekCount =0;
            if (todays.length) todaysCount = todays[0].count;  
            if (yesterdays.length) yesterdaysCount = yesterdays[0].count;  
            if (thisWeek.length) thisWeekCount = thisWeek[0].count;  
            let data = {
                todays,
                yesterdays,
                thisWeek
            };

            if (config.activityBreakDownAverage.split(',').includes(String(organization_id))){
                Object.keys(data).map((key) => {
                    let count = key === 'todays' ? todaysCount : key === 'yesterdays' ? yesterdaysCount : thisWeekCount;
                    if (data[key].length === 0) return;
                    if (data[key][0]['productive_duration']) data[key][0]['productive_duration'] = data[key][0]['productive_duration'] / count;
                    if (data[key][0]['non_productive_duration']) data[key][0]['non_productive_duration'] = data[key][0]['non_productive_duration'] / count;
                    if (data[key][0]['neutral_duration']) data[key][0]['neutral_duration'] = data[key][0]['neutral_duration'] / count;
                    if (data[key][0]['idle_duration']) data[key][0]['idle_duration'] = data[key][0]['idle_duration'] / count;
                    if (data[key][0]['office_time']) data[key][0]['office_time'] = data[key][0]['office_time'] / count;
                    if (data[key][0]['computer_activities_time']) data[key][0]['computer_activities_time'] = data[key][0]['computer_activities_time'] / count;
                });
            }
            /* Productivity Capping for Activity BreakDown */
            if (config.cappingProductivityOrgs.split(',').includes(String(organization_id))) {
                Object.keys(data).map((key) => {
                    if (data[key].length === 0) return;
                    if (data[key][0]['productivePer'] > 100) data[key][0]['productivePer'] = 100;
                    if (data[key][0]['nonProductivePer'] > 100) data[key][0]['nonProductivePer'] = 100;
                    if (data[key][0]['neutralPer'] > 100) data[key][0]['neutralPer'] = 100;
                    if (data[key][0]['activePer'] > 100) data[key][0]['activePer'] = 100;
                    if (data[key][0]['idlePer'] > 100) data[key][0]['idlePer'] = 100;
                });
            }
            return res.json({
                code: 200,
                data: data,
                message: 'Activity breakdown data',
                error: null
            });
        } catch (err) {
            console.log('====', err);
            next(err);
        }

    }

    async getIdealUserDetails(req, res, next) {
        try {
            // const { redis } = jobs;
            const organization_id = req.decoded.organization_id;
            const date = req.query.date;
            const attendance_id = req.query.attendance_id

            if (attendance_id) {
                let ideal_user = JSON.parse(await redis.getAsync(`ideal.${attendance_id}`));
                return res.json({
                    code: 200,
                    data: ideal_user,
                    message: 'ideal user data from redis',
                    error: null
                });
            } else {
                let present_employees = await DashboardModel.getIdealEmp(organization_id, date)
                let attendance_ids = [];
                let result = [];
                present_employees.map(x => {
                    attendance_ids.push(x.attendance_id)
                })
                for (const attendance_id of attendance_ids) {
                    let ideal_user = JSON.parse(await redis.getAsync(`ideal.${attendance_id}`));
                    if (ideal_user != null) result.push(ideal_user)
                }
                return res.json({
                    code: 200,
                    data: result,
                    message: 'ideal user data from redis',
                    error: null
                });
            }
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get web app reports for the top productive and non productive employees
     * @function getWebAppActivities
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    async getWebAppActivities(req, res, next) {
        try {
            const { organization_id, language, productive_hours, role_id, employee_id: managerId } = req.decoded;
            let { employeeIds, location_id, department_id, startDate, endDate, skip, limit, appId } = await DashboardValidator.getWebAppActivities().validateAsync(req.body);

            let employeeData = await DashboardModel.getProductiveEmployees({ location_id, department_id, managerId, role_id, organization_id, employeeIds, location_id, department_id });
            if (employeeData.length == 0) return res.json({ code: 400, data: null, error: null, message: translate(dashboardMessages, "1", language) });
            employeeIds = _.pluck(employeeData, "employee_id");

            let [webAppActivities, webAppActivitiesCount] = await Promise.all([
                DashboardModel.getWebAppActivities({ organization_id, employeeIds, startDate, endDate, skip, limit, appId }),
                DashboardModel.getWebAppActivities({ organization_id, employeeIds, startDate, endDate, isCountQuery: true, appId })
            ])
            webAppActivitiesCount = webAppActivitiesCount && webAppActivitiesCount.length > 0 ? webAppActivitiesCount[0].count : 0
            if (webAppActivitiesCount == 0) return res.json({ code: 400, data: null, error: null, message: translate(dashboardMessages, "1", language) });  
            webAppActivities = webAppActivities.map(item => {
                let userData = employeeData.find(entity => entity.employee_id == item.employee_id)
                return { ...item, ...userData }
            })

            let ipMaskingOrgId = process.env.IP_MASKING_ORG_ID.split(",");
            if (ipMaskingOrgId.includes(String(organization_id))){
                webAppActivities = webAppActivities.map(x => {
                    x.appName = maskingIP(x.appName);
                    return x;
                });
            }

            return res.json({ code: 200, data: { skipValue: skip + limit, webAppActivitiesCount, webAppActivities }, error: null, message: translate(transferMessages, "1", language) });
        } catch (err) {
            next(err);
        }

    }
    /**
     *  Get application websites names
     * @function getWebApps
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    getWebApps = async (req, res, next) => {
        try {
            const { organization_id, language, employee_id: managerId, role_id } = req.decoded
            let { employeeIds, type, appIds, employee,
                location_id, department_id, startDate, endDate } = await DashboardValidator.getWebApp().validateAsync(req.body);
            console.log(employeeIds, type, appIds, employee,
                location_id, department_id, startDate, endDate)
            let employeeData = [];
            /**Get employee data if required */
            if (employee || location_id || department_id || employeeIds) {
                employeeData = await DashboardModel.getProductiveEmployees({ location_id, department_id, managerId, role_id, organization_id, employeeIds, location_id, department_id, employee });
                if (!employeeData || employeeData.length == 0) return res.json({ code: 400, data: null, error: null, message: translate(dashboardMessages, "1", language) });
            }
            employeeIds = employeeData.length ? _.pluck(employeeData, "employee_id") : [];
            /** Get applications and websites */
            let webApps = await DashboardModel.getWebApps({
                employeeIds, employee, type, appIds,
                startDate, endDate, organization_id
            });

            if (webApps.length == 0) return res.json({ code: 400, data: null, error: null, message: translate(dashboardMessages, "1", language) });
            
            let ipMaskingOrgId = process.env.IP_MASKING_ORG_ID.split(",");
            if (ipMaskingOrgId.includes(String(organization_id))){
                webApps = webApps.map(x => {
                    x.name = maskingIP(x.name);
                    return x;
                });
            }
            
            return res.json({ code: 200, data: webApps, error: null, message: translate(transferMessages, "1", language) });

        } catch (err) {
            next(err)
        }

    }

}

/**
     * fetch idle users
     *
     * @function getidealtime
     * @memberof DashboardController
     * @return {Promise<Object>} with idle user data null.
     */

const getidealtime = async (organization_id, manager_id, date, to_assigned_role, next) => {
    try {
        // let attendance_ids = [];
        const present_employees = await DashboardModel.getIdealEmp(organization_id, date, manager_id, to_assigned_role)
        // attendance_ids = present_employees.map(x => ({ attendance_id: x.attendance_id, idleTime: x.idleTime }));
        let result = [];
        const attendanceChank = _.chunk(present_employees, 100);
        for (const chunk of attendanceChank) {
            const promiseMap = chunk.map(index => redis.getAsync(`ideal.${index.attendance_id}`));
            let idleUserRaw = await Promise.all(promiseMap);
            idleUserRaw = idleUserRaw.filter(x => x);
            for (let ideal_user of idleUserRaw) {
                ideal_user = JSON.parse(ideal_user);
                if (ideal_user != null) {
                    const user = present_employees.find(x => x.attendance_id == ideal_user.attendance_id)
                    const idleTime = user ? user.idleTime : process.env.IDLE_MINUTES  // assign default idle time of 15 mins 
                    const old_time = moment(ideal_user.last_ideal_start_from);
                    const new_time = moment(ideal_user.last_ideal_end_to);
                    const difference = moment.duration(new_time.diff(old_time));
                    if (difference.asSeconds() >= idleTime * 60 && moment(new Date().toISOString()).subtract(idleTime, 'minutes').utc().isBetween(moment(old_time), moment(new_time), null, [])) {
                        result.push(user)
                    }
                }
            }
        }
        // for (const index of attendance_ids) {
        //     const ideal_user = JSON.parse(await redis.getAsync(`ideal.${index.attendance_id}`));
        //     if (ideal_user != null) {
        //         index.idleTime = index.idleTime ? index.idleTime : process.env.IDLE_MINUTES  // assign default idle time of 15 mins 
        //         const old_time = moment(ideal_user.last_ideal_start_from);
        //         const new_time = moment(ideal_user.last_ideal_end_to);
        //         const difference = moment.duration(new_time.diff(old_time));
        //         if (difference.asSeconds() >= index.idleTime * 60 && moment(new Date().toISOString()).subtract(index.idleTime, 'minutes').utc().isBetween(moment(old_time), moment(new_time), null, [])) {
        //             result.push(present_employees.find(x => x.attendance_id == index.attendance_id))
        //         }
        //     }
        // }
        return result
    } catch (err) {
        next(err)
    }
}

function getOnlineUsers(onlineEmp, offlineEmp) {
    try {
        let props = ['id', 'name', 'email', 'photo_path', 'location_id', 'location_name', 'department_id', 'department_name', 'emp_code'];

        let result = onlineEmp.filter(onlineUser => {
            // filter out (!) items in result2
            return !offlineEmp.some(offlineUser => {
                return onlineUser.id === offlineUser.id; // assumes unique id
            });
        }).map(user => {
            // use reduce to make objects with only the required properties
            // and map to apply this to the filtered array as a whole
            return props.reduce((newUser, name) => {
                newUser[name] = user[name];
                return newUser;
            }, {});
        });
        return result;
    } catch (err) {
        next(err);
    }
}
const getPrevDayEmpWithShiftAndFixed = (employees, date, endTimeCheck = true, tag, isAutoShift = false) => {
    const now = moment().utc();
    return employees.reduce((users, user) => {
        let shift = {}
        if (JSON.parse(user.trackingMode) == 'fixed') {
            shift = timesByDate(JSON.parse(user.tracking), date, user.timezone);
        } else if (user.shift) {
            shift = timesByDate(JSON.parse(user.shift), date, user.timezone);
        }
        if(tag == 'online', endTimeCheck == true && isAutoShift) {
            users.push(user);
        }
        /**Check end time exists with shift */
        if (shift.start && endTimeCheck && tag == 'online' && moment(user.end_time).isBetween(shift.start, shift.end)) {
            /**for online check */
            users.push(user);
        } else if (shift.start && endTimeCheck && tag == 'offline' && moment(user.end_time).isBetween(shift.start, shift.end) && now.isBefore(shift.end)) {
            /**for offline check */
            users.push(user);
        } else if (shift.start && !endTimeCheck && 'idle') {
            /**for idle check */
            users.push(user);
        }
        return users;
    }, []);
}

const removeDuplicates = (finalUsers, tempUser) => {
    return finalUsers.reduce((users, user) => {
        if (!tempUser.some(e => e.id == user.id)) {
            users.push(user);
        }
        return users;
    }, []);
}

const arrayUnique = (employees) => {
    return employees.reduce((unique, emp) => {
        if (!unique.some(e => e.id == emp.id)) {
            if (emp.tracking) {
                delete emp.tracking;
                delete emp.shift;
            }
            unique.push(emp);
        }
        return unique;
    }, []);
}

const getUnicEmployeeByEmpcode = (absentUser, tempUser) => {
    return absentUser.reduce((users, user) => {
        if (!tempUser.some(e => e.emp_code == user.emp_code)) {
            users.push(user);
        }
        return users;
    }, []);
}
module.exports = new DashboardController;

(async () => {
    const date = '2021-02-01';
    let offline = await DashboardModel.getOfflineEmp(1, null, date, null);
    offline = offline.reduce((users, user) => {
        let shift = {}
        if (JSON.parse(user.trackingMode) == 'fixed') {
            shift = timesByDate(JSON.parse(user.tracking), date, user.timezone);
        } else if (user.shift) {
            shift = timesByDate(JSON.parse(user.shift), date, user.timezone);
        }
        // console.log(shift, '---------------', user);
        if (shift.start && moment(user.end_time).isBetween(shift.start, shift.end)) {
            console.log('-------', users)
            users.push(user);
        }
        return users;
    }, []);
    console.log('------------------', offline)
    // for (const user of offline) {
    //     let shift = {}
    //     if (JSON.parse(user.trackingMode) == 'fixed') {
    //         shift = await timesByDate(JSON.parse(user.tracking), date, user.timezone);
    //     } else if (user.shift) {
    //         shift = await timesByDate(JSON.parse(user.shift), date, user.timezone);
    //     }
    //     console.log(shift, '---------------', user);
    //     if (shift.start) {
    //         console.log(moment(user.end_time).isBetween(shift.start, shift.end));
    //     }

    //     // JSON.parse(user.shift)
    //     // console.log('--------', user);
    //     // console.log('--------', JSON.parse(user.trackingMode));
    // }
})