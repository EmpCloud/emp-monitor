
const moment = require('moment-timezone');
const _ = require('underscore')
const Validator = require('./validator');
const { sendResponse } = require('../../../../utils/myService');
const { translate } = require(`${utilsFolder}/messageTranslation`);
const { organizationMessages, activityRequeat, userMessages, commonMessages } = require(`${utilsFolder}/helpers/LanguageTranslate`);
const { Model } = require('./model');
const EmployeeReportsModel = require('../../reports/employee/EmployeeReports.model');
const { logger: Logger } = require('../../../../logger/Logger');

const maskingIP = require('../../../../utils/helpers/IPMasking');
const configFile = require('../../../../../../config/config');

const toTimezoneDate = (inputDateTime, timezone) => {
    let myDate = moment(inputDateTime);
    let userLocalDate = myDate.tz(timezone).set({
        date: myDate.get('date'),
        month: myDate.get('month'),
        year: myDate.get('year'),
        hour: myDate.get('hour'),
        minute: myDate.get('minute'),
        second: myDate.get('second')
    });
    return userLocalDate.format('YYYY-MM-DD HH:mm:ss');
};

/**
 * Activity request controller
 *@class Controller
 */

class Controller {

    /**
     * Create activity modification request
     * 
     * @function create
     * @memberof  Controller
     * @param {*} req 
     * @param {*} res 
     * @returns {object} request list
     */
    static async create(req, res) {
        const { language, organization_id, timezone, user_id } = req.decoded;
        try {
            const { value, error } = Validator.create(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);
            let { reason, date, start_time, end_time, employee_id, activity_ids, attendance_id } = value;
            date = moment(date).format('YYYY-MM-DD');
            const getEployee = await Model.getEmployees({ organization_id, employee_ids: [employee_id] })
            if (!getEployee || getEployee.length == 0) return sendResponse(res, 400, null, translate(userMessages, "10", language), null);
            // const request = await Model.getByEmployee({ employee_id, date, start_time, end_time })
            // if (request) return sendResponse(res, 400, null, translate(activityRequeat, "2", language), null);

            // Get Employee Activites
            let employeeActivities = await Model.getEmployeeActivityByIds(activity_ids);
            if (!employeeActivities.length) return sendResponse(res, 400, null, translate(activityRequeat, "13", language), null);
            let status = 0; // 0 - Pending 1 - Approved 2 - Decline
            
            /* This Below condition check for admin and non admin auto approval for time claim request and 
                if anyone failed to approve goes to pending request 
                Case 1 :- Admin Enable & Manager1 Enable to status accept
                Case 2 :- Admin Enable & Manager1 Enable & Manager2 Enable to status accept
                Case 3 :- Admin Enable & Manager1 Disable to status pending
                Case 4 :- Admin Enable & Manager1 Enable & Manager2 Disable to status pending
            */
            let isApprovedOrg = await Model.isApprovedOrg(organization_id);
            isApprovedOrg = isApprovedOrg[0].auto_accept_time_claim;
            let assignedAdminId = await Model.getAssignedAdminId(user_id);
            assignedAdminId = _.pluck(assignedAdminId, "non_admin_id");
            let condition;
            let getNonAdminApproval;
            if (assignedAdminId.length != 0) {
                getNonAdminApproval = await Model.getNonAdminApproval(assignedAdminId);
                getNonAdminApproval = _.pluck(getNonAdminApproval, "auto_accept_time_claim");
            }
            else getNonAdminApproval = [];

            getNonAdminApproval.push(isApprovedOrg);
            condition = getNonAdminApproval.filter(x => x == "false");
            if (condition.length == 0) status = 1;
            

            let insertRequest = await Model.create({ employee_id, organization_id, reason, date, start_time, end_time, activities: employeeActivities, attendance_id, type: 1 });
            if (!insertRequest) return sendResponse(res, 400, insertRequest, translate(activityRequeat, "3", language), null);


            if (status == 1) {
                await alterActivityTC(req, res, insertRequest);
            }
            insertRequest._doc.name = getEployee[0].name;

            const [adminDate] = await Model.getAdminData(organization_id);
            let managersList = await Model.getApprovers({ organization_id, employee_ids: [employee_id] });
            managersList = managersList.length > 0 ? managersList : [];
            if (managersList.length == 0) managersList.push({ ...adminDate, role: "admin" })
            insertRequest._doc = {
                name: getEployee[0].name,
                ...insertRequest._doc,
                approvers: managersList
                // start_time: moment(insertRequest._doc.start_time).tz(timezone).format("YYYY-MM-DD HH:MM:ss"),
                // end_time: moment(insertRequest._doc.end_time).tz(timezone).format("YYYY-MM-DD HH:MM:ss"),
            }
            return sendResponse(res, 200, insertRequest, translate(activityRequeat, "4", language), null);
        } catch (err) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return sendResponse(res, 401, null, translate(activityRequeat, "1", language), null);
        }
    }
    /**
     * Create activity modification request
     *
     * @function createOffline
     * @memberof  Controller
     * @param {*} req
     * @param {*} res
     * @returns {object} request list
     */
    static createOffline = async (req, res) => {
        const { language, organization_id: organizationId, timezone, user_id } = req.decoded;
        try {
            const { value, error } = Validator.offline(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);
            let { reason, date, employee_id: employeeId, offlineTime } = value;
            date = moment(date).format('YYYY-MM-DD');

            const getEployee = await Model.getEmployeeDetails({ organizationId, employee_ids: [employeeId], date })
            if (!getEployee || getEployee.length == 0) return sendResponse(res, 400, null, translate(userMessages, "10", language), null);

            let previousReqTime = await Model.getPreviousReqTime({ organizationId, employee_id: employeeId, date, type: 2 })

            let totalOfflineTime = await this.getOfflineTime({ organizationId, employeeId, date })

            if (previousReqTime.length > 0) totalOfflineTime = totalOfflineTime - previousReqTime[0].totalTime

            if (totalOfflineTime < offlineTime) return sendResponse(res, 400, null, translate(activityRequeat, "cant claim", language), null)
            
            let status = 0; // 0 - Pending 1 - Approved 2 - Decline
            /* This Below condition check for admin and non admin auto approval for time claim request and 
                if anyone failed to approve goes to pending request 
                Case 1 :- Admin Enable & Manager1 Enable to status accept
                Case 2 :- Admin Enable & Manager1 Enable & Manager2 Enable to status accept
                Case 3 :- Admin Enable & Manager1 Disable to status pending
                Case 4 :- Admin Enable & Manager1 Enable & Manager2 Disable to status pending
            */
            let isApprovedOrg = await Model.isApprovedOrg(organizationId);
            isApprovedOrg = isApprovedOrg[0].auto_accept_time_claim;
            let assignedAdminId = await Model.getAssignedAdminId(user_id);
            assignedAdminId = _.pluck(assignedAdminId, "non_admin_id");
            let condition;
            let getNonAdminApproval;
            if (assignedAdminId.length != 0) {
                getNonAdminApproval = await Model.getNonAdminApproval(assignedAdminId);
                getNonAdminApproval = _.pluck(getNonAdminApproval, "auto_accept_time_claim");
            }
            else getNonAdminApproval = [];

            getNonAdminApproval.push(isApprovedOrg);
            condition = getNonAdminApproval.filter(x => x=="false");
            if (condition.length == 0) status = 1;

            let insertRequest = await Model.create({ status, employee_id: employeeId, organization_id: organizationId, reason, date, attendance_id: getEployee[0].attendance_id, type: 2, offline_time: offlineTime });
            if (!insertRequest) return sendResponse(res, 400, insertRequest, translate(activityRequeat, "3", language), null);
            if(status == 1){
                await alterOfflineActivityTimeClaim({ req, res, request: insertRequest, offlineTime });
            }
            insertRequest._doc.name = getEployee[0].name;
            const [adminDate] = await Model.getAdminData(organizationId);
            let managersList = await Model.getApprovers({ organization_id: organizationId, employee_ids: [employeeId] });
            managersList = managersList.length > 0 ? managersList : [];
            managersList.push({ ...adminDate, role: "admin" })
            insertRequest._doc = {
                name: getEployee[0].name,
                ...insertRequest._doc,
                approvers: managersList
            }
            return sendResponse(res, 200, insertRequest, translate(activityRequeat, "4", language), null);
        } catch (err) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return sendResponse(res, 401, null, translate(activityRequeat, "1", language), null);
        }
    }

    static createOfflineRequestNew = async (req, res) => {
        try {
            let { employee_id: employeeId, organization_id: organizationId, language = "en", user_id } = req.decoded;
            let { offline_data: offlineData } = req.body;
            if (!offlineData?.length) return res.json({ code: 404, message: "Data is required", error: "Not Found" });

            // validation
            const { value, error } = Validator.offlineRequest(offlineData);
            if (error) return res.json({ code: 400, message: error.details[0].message, error: "Validation Error" });

            // get full offline data chunk here
            let [attendance] = await Model.getAttendanceId({ date: moment(value[0].date).format("YYYY-MM-DD"), employeeId, organizationId });

            if (!attendance) return res.json({ code: 400, data: null, message: translate(commonMessages, "2", language), })
            const { id: attendanceId, timezone, department_id } = attendance;

            let activities = await Model.getEmployeeActivities({ attendanceId });
            let finalActivities = await this.spliceNegativeEntities(activities);
            let { offlineEntities, totalOfflineTime } = await this.getOfflineActivities({ finalActivities });
            let previousReqTime = await Model.getTimeClaimRequest({ organizationId, employee_id: employeeId, date: moment(value[0].date).format("YYYY-MM-DD"), type: 2, status: [1, 2] });
            let previousBreakTime = await Model.getPreviousReqBreakTime({ organizationId, employee_id: employeeId, date: moment(value[0].date).format("YYYY-MM-DD"), type: 2 })
            let status = 0; // 0 - Pending 1 - Approved 2 - Decline
            /* This Below condition check for admin and non admin auto approval for time claim request and 
                if anyone failed to approve goes to pending request 
                Case 1 :- Admin Enable & Manager1 Enable to status accept
                Case 2 :- Admin Enable & Manager1 Enable & Manager2 Enable to status accept
                Case 3 :- Admin Enable & Manager1 Disable to status pending
                Case 4 :- Admin Enable & Manager1 Enable & Manager2 Disable to status pending
            */
            
                let isApprovedOrg = await Model.isApprovedOrg(organizationId);
                isApprovedOrg = isApprovedOrg[0].auto_accept_time_claim;
                let assignedAdminId = await Model.getAssignedAdminId(user_id);
                assignedAdminId = _.pluck(assignedAdminId, "non_admin_id");
                let condition;
                let getNonAdminApproval;
                if (assignedAdminId.length != 0) {
                    getNonAdminApproval = await Model.getNonAdminApproval(assignedAdminId);
                    getNonAdminApproval = _.pluck(getNonAdminApproval, "auto_accept_time_claim");
                }
                else getNonAdminApproval = [];

                getNonAdminApproval.push(isApprovedOrg);
                condition = getNonAdminApproval.filter(x => x == "false");
            if (condition.length == 0) status = 1;
            
            offlineData = offlineData.reduce((arr, item) => {
                if (!arr.some(i => moment(i.start_time).isSame(item.start_time))) {
                    item.offline_time = moment(item.end_time).diff(item.start_time, 'seconds');
                    arr.push(item);
                }
                return arr;
            }, []);
            

            const insertedData = [];
            for (let item of offlineData) {
                /**
                 * check for offline chunk present in db 
                 * if chunk not present then skip inserting
                 */
                const index = offlineEntities.findIndex(i => moment(i.from).isSame(item.start_time) && moment(i.to).isSame(item.end_time));
                if (index === -1) continue;
                /**
                 * check for offline chunk already created in db 
                 * if created already created for break time then skip inserting
                 */
                const indexDb = previousReqTime.findIndex(i => moment(i.start_time).isSame(item.start_time) && moment(i.end_time).isSame(item.end_time));
                if (indexDb > -1) continue;
                /**
                 * check for offline chunk already created in db 
                 * if created already created for offline time claim then skip inserting
                 */
                const indexDbBreak = previousBreakTime.findIndex(i => moment(i.start_time).isSame(item.start_time) && moment(i.end_time).isSame(item.end_time));
                if (indexDbBreak > -1) continue;

                let { reason, date, start_time, end_time, offline_time: offlineTime } = item;
                date = moment(date).format('YYYY-MM-DD');

                const getEployee = await Model.getEmployeeDetails({ organizationId, employee_ids: [employeeId], date });
                if (!getEployee || getEployee.length == 0) return sendResponse(res, 400, null, translate(userMessages, "10", language), null);

                if (previousReqTime.length > 0) totalOfflineTime = totalOfflineTime - previousReqTime[0].totalTime;

                if (totalOfflineTime < offlineTime) return sendResponse(res, 400, null, translate(activityRequeat, "cant claim", language), null);

                let insertRequest = await Model.create({
                    status,
                    employee_id: employeeId,
                    organization_id: organizationId,
                    reason, date,
                    attendance_id: getEployee[0].attendance_id,
                    type: 2,
                    offline_time: offlineTime,
                    start_time,
                    end_time
                });
                if (!insertRequest) return sendResponse(res, 400, insertRequest, translate(activityRequeat, "3", language), null);
                if (status == 1) {
                    await alterOfflineActivityTimeClaim({ req, res, request: insertRequest, offlineTime });
                }
                insertRequest._doc.name = getEployee[0].name;
                const [adminDate] = await Model.getAdminData(organizationId);
                let managersList = await Model.getApprovers({ organization_id: organizationId, employee_ids: [employeeId] });
                managersList = managersList.length > 0 ? managersList : [];
                managersList.push({ ...adminDate, role: "admin" })
                insertRequest._doc = {
                    name: getEployee[0].name,
                    ...insertRequest._doc,
                    approvers: managersList
                }
                insertedData.push(insertRequest);
            }
            return sendResponse(res, 200, insertedData, translate(activityRequeat, "4", language), null);
        } catch (error) {
            return res.json({ code: 400, error: error.message });
        }
    }


    /**
     * Get activity modifiction request
     * 
     * @function create
     * @memberof  Controller
     * @param {*} req 
     * @param {*} res 
     * @returns {object} request list or error 
     */
    static async get_old(req, res) {
        const { organization_id, language, employee_id: toAssignId, role_id, timezone, first_name, last_name } = req.decoded;
        try {
            let userIds;
            let assingeeIds;
            const { value, error } = Validator.getWiithFilter(req.query);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);

            let { from_date, to_date, start_time, end_time, order, sortColumn, skip, limit, search, status, employee_id } = value;
            from_date = from_date ? moment(from_date).format('YYYY-MM-DD') : from_date;
            to_date = to_date ? moment(to_date).format('YYYY-MM-DD') : to_date;
            if (toAssignId) {
                assingeeIds = _.pluck(await EmployeeReportsModel.getEmployeeAssignedToManager(toAssignId, role_id), 'employee_id')
                assingeeIds.push(toAssignId)
            }
            if (search) {
                userIds = _.pluck(await Model.getEmployeesByName({ organization_id, search, toAssignId, role_id }), "id");

                if (toAssignId && first_name && last_name) {
                    let full_name = first_name + " " + last_name;
                    full_name = full_name.toLowerCase()
                    let isSearch = full_name.includes(search.toLowerCase())
                    if (isSearch) {
                        userIds.push(toAssignId);
                    }
                }
            }
            let [activitrequests, totalCount] = await Promise.all([
                Model.getWithFilter({ from_date, to_date, assingeeIds, status, employee_ids: userIds, organization_id, start_time, end_time, order, sortColumn, skip, limit, search, employee_id }),
                Model.requestCount({ from_date, to_date, assingeeIds, status, employee_ids: userIds, organization_id, start_time, end_time, search, employee_id })
            ])
            if (!activitrequests || activitrequests.length === 0) return sendResponse(res, 400, null, translate(activityRequeat, "6", language), null);
            userIds = _.pluck(activitrequests, "employee_id");
            let employeeData = await Model.getEmployees({ organization_id, employee_ids: userIds })
            if (!employeeData || employeeData.length === 0) return sendResponse(res, 400, null, translate(activityRequeat, "6", language), null);


            let managersList = await Model.getApprovers({ organization_id, employee_ids: userIds });
            managersList = managersList.length > 0 ? managersList : [];

            activitrequests = activitrequests.map(item => ({ ...item, ...employeeData.find(i => i.id === item.employee_id) }))
            let approverIds = _.pluck(activitrequests, "approved_by");
            approverIds = approverIds.filter(i => i != null);
            approverIds = _.unique(approverIds)
            const requestApprovers = approverIds.length !== 0 ? await Model.getUsers(approverIds) : [];
            const [adminDate] = await Model.getAdminData(organization_id);
            activitrequests = activitrequests.map(itr => (
                {
                    ...itr,
                    start_time: toTimezoneDate(itr.start_time, timezone),
                    end_time: toTimezoneDate(itr.end_time, timezone),
                    createdAt: toTimezoneDate(itr.createdAt, timezone),
                    approver_name: requestApprovers.find(item => itr.approved_by == item.id) ? requestApprovers.find(item => itr.approved_by == item.id).name : null,
                    approvers: managersList.filter(i => i.employee_id == itr.employee_id)

                }))
            activitrequests = activitrequests.map(i => ({ ...i, approvers: [...i.approvers, { ...adminDate, role: "admin" }] }))

            /** loop to add the activites to activityrequest */
            let activities = [];
            for (let i = 0; i < activitrequests.length; i++) {
                let currentActivity = activitrequests[i];
                let filter = {};
                if (currentActivity.attendance_id) filter = { attendanceId: currentActivity.attendance_id, ...filter };
                if (currentActivity.activities) filter = { activityIds: _.pluck(currentActivity.activities, "activity_id"), ...filter };
                currentActivity.activities = await Model.getActivities({ ...filter });
                activitrequests[i] = currentActivity;
                activities = activities.concat(currentActivity.activities)
            }

            /** Adding productivity status to application and domains */
            if (activities.length !== 0) {
                let domainIds = _.pluck(activities.filter(i => i.domain_id !== null), "domain_id");
                let appIds = _.pluck(activities.filter(i => i.domain_id === null), "application_id");
                appIds = domainIds.length !== 0 ? appIds.concat(domainIds) : appIds;
                const productivityStatus = await Model.getAppProductivitystatus(appIds);
                activitrequests = activitrequests.map(item => {
                    let entity;
                    if (item.activities.length > 0) {
                        entity = {
                            ...item, activities: item.activities.map(i => {
                                let prodStatus = productivityStatus.find(itr => {
                                    if (i.domain_id !== null) {
                                        return itr.application_id.toString() == i.domain_id.toString()
                                    } else {
                                        return itr.application_id.toString() == i.application_id.toString()
                                    }
                                })
                                let status;
                                if (prodStatus.type == 1) {
                                    status = prodStatus.rules[0].status;
                                } else if (prodStatus.type == 2) {
                                    status = prodStatus.rules.find(role => role.deptId == item.department_id) ? prodStatus.rules.find(role => role.deptId == item.department_id).status : 0
                                }
                                return { ...i, status }
                            })
                        }
                    } else {
                        entity = item
                    }
                    return entity
                })
            }
            return sendResponse(res, 200, { activitrequests, totalCount, skipCount: skip + limit }, translate(activityRequeat, "7", language), null);
        } catch (err) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), null);
        }
    }

    /**
    * Update activity modifiction request
    * 
    * @function update
    * @memberof  Controller
    * @param {*} req 
    * @param {*} res 
    * @return {object} requestData or error
    */
    static update = async (req, res) => {
        const { organization_id, user_id, is_admin, language, permissionData = [], first_name, last_name } = req.decoded;
        try {
            const { value, error } = Validator.update(req.body);

            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);
            let { reason, date, start_time, end_time, status, id, employee_id, activity_ids } = value;
            // Scope the lookup by organization_id so an approve/decline can only
            // touch a request in the caller's own org (prevents cross-tenant
            // action by guessing another org's request ObjectId).
            const request = await Model.getRequestById({ id, employee_id, organization_id });
            if (!request) return sendResponse(res, 400, null, translate(activityRequeat, "13", language), null);
            if (request.status === 1) return sendResponse(res, 400, null, translate(activityRequeat, "8", language), null);
            if (status == 1) {
                return this.alterActivity(req, res, id, request)
            }
            if (status === 0 || status) {
                if (!is_admin) {
                    const permission = permissionData.find(obj => obj.permission === 'activity_alter_process');
                    if (!permission) {
                        let message = translate(activityRequeat, "12", language)
                        return res.json({
                            code: 400,
                            data: null,
                            message,
                            error: message
                        });
                    }
                }
            }
            date = date ? moment(date).format("YYYY-MM-DD") : date;
            let employeeActivities;
            request.activities.map((item) => {
                activity_ids.push(`${item.activity_id}`);
            });
            if (activity_ids.length > 0) {
                employeeActivities = await Model.getEmployeeActivityByIds(activity_ids);
                if (!employeeActivities.length) return sendResponse(res, 400, null, translate(activityRequeat, "13", language), null);
            }

            const updateDate = await Model.update({ activity_ids, reason, date, start_time, end_time, status, approved_by: user_id, id, activities: employeeActivities, organization_id });
            if (status) req.body = { ...req.body, approved_by: user_id, approver_name: first_name + " " + last_name }
            if (updateDate) return sendResponse(res, 200, req.body, translate(activityRequeat, "9", language), null);
            return sendResponse(res, 400, null, translate(activityRequeat, "19", language), null);
        } catch (err) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), null);
        }
    }

    /**
    * Update idle to active activity
    * 
    * @function alterActivity
    * @memberof  Controller
    * @param {*} req 
    * @param {*} res 
    * @return {object} success or error
    */
    static async alterActivity(req, res, id, request) {
        const { organization_id, permissionData = [], is_admin, user_id, language, first_name, last_name } = req.decoded;

        /**Check permission */
        if (!is_admin) {
            const permission = permissionData.find(obj => obj.permission === 'activity_alter_process');
            if (!permission) {
                let message = translate(activityRequeat, "12", language)
                return res.json({
                    code: 400,
                    data: null,
                    message,
                    error: message
                });
            }
        }
        try {
            const { employee_id, start_time: startTime, end_time: endTime, date, attendance_id, activities } = request;

            const [attendance] = await Model.getAttendance({ date, employeeId: employee_id, organizationId: organization_id })
            if (!attendance) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "15", language),
                error: "Attendance not found."
            });

            let activityIds = _.pluck(activities, "activity_id");
            if (activityIds.length == 0) return res.json({ code: 400, data: null, message: "activity not found,", error: null })

            /**Get employee activities based start and end time */
            const employeeActivities = await Model.getEmployeeActivity({ attendanceId: attendance_id, activityIds });
            if (employeeActivities.length === 0) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "16", language),
                error: "Activity not found."
            });

            /**Get employee productivity report */
            const prReport = await Model.getEmployeeProductivity({ date, employeeId: employee_id });
            if (!prReport) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "16", language),
                error: "Activity not found."
            });

            const newActivities = [];
            /**Process employee activities idle to active */
            for (const activity of employeeActivities) {
                if (activity.total_duration == activity.active_seconds) continue;
                const idle = activity.total_duration - activity.active_seconds;
                activity.active_seconds += idle;
                /**Get apllication status */
                const status = await Model.findApplicationProductivityStatus({ applicationId: activity.domain_id ? activity.domain_id : activity.application_id, departmentId: attendance.department_id });
                prReport.idle_duration -= idle;
                prReport['productive_duration'] += status == 1 ? idle : 0;
                prReport['non_productive_duration'] += status == 2 ? idle : 0;
                prReport['neutral_duration'] += status == 0 ? idle : 0;

                const oldtaskIndex = prReport.tasks.findIndex(task => prReport.tasks[0].task_id === activity.task_id);
                if (oldtaskIndex >= 0) {
                    prReport.tasks[oldtaskIndex].pro += status == 1 ? idle : 0;
                    prReport.tasks[oldtaskIndex].non += status == 2 ? idle : 0;
                    prReport.tasks[oldtaskIndex].neu += status == 0 ? idle : 0;
                    prReport.tasks[oldtaskIndex].idle -= idle;

                    // Tasks
                    prReport.tasks[0].applications.forEach((app, i) => {
                        const appIndex = prReport.tasks[oldtaskIndex].applications.findIndex(x => x.application_id.toString() === activity.application_id.toString())

                        if (appIndex >= 0) {
                            prReport.tasks[oldtaskIndex].applications[appIndex].pro += status == 1 ? idle : 0;
                            prReport.tasks[oldtaskIndex].applications[appIndex].non += status == 2 ? idle : 0;
                            prReport.tasks[oldtaskIndex].applications[appIndex].neu += status == 0 ? idle : 0;
                            prReport.tasks[oldtaskIndex].applications[appIndex].idle -= idle;
                        }
                    });
                }

                // Apps
                prReport.applications.forEach((app, i) => {
                    const oldAppIndex = prReport.applications.findIndex(app => prReport.applications[i].application_id.toString() === activity.application_id.toString());
                    if (oldAppIndex >= 0) {
                        prReport.applications[oldAppIndex].pro += status == 1 ? idle : 0;
                        prReport.applications[oldAppIndex].non += status == 2 ? idle : 0;
                        prReport.applications[oldAppIndex].neu += status == 0 ? idle : 0;
                        prReport.applications[oldAppIndex].idle -= idle;
                        const oldTaskIndex = prReport.applications[oldAppIndex].tasks.findIndex(x => x.task_id.toString() === activity.task_id.toString());
                        if (oldTaskIndex >= 0) {
                            prReport.applications[oldAppIndex].tasks[oldTaskIndex].pro += status == 1 ? idle : 0;
                            prReport.applications[oldAppIndex].tasks[oldTaskIndex].non += status == 2 ? idle : 0;
                            prReport.applications[oldAppIndex].tasks[oldTaskIndex].neu += status == 0 ? idle : 0;
                            prReport.applications[oldAppIndex].tasks[oldTaskIndex].idle -= idle;
                        }
                    }
                })
                newActivities.push(activity);
            }

            if (newActivities.length === 0) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "17", language),
                error: "Activity not found."
            });
            Promise.all(
                newActivities.map(async (activity) => {
                    await activity.save();
                })
            );
            await prReport.save();
            request.status = 1;
            request.approved_by = user_id;
            if (req.body.reason) request.reason = req.body.reason;

            await request.save();

            return res.json({
                code: 200,
                data: { ...request._doc, approver_name: first_name + " " + last_name },
                message: translate(activityRequeat, "18", language),
                error: null
            })
        } catch (err) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "5", language),
                error: err
            });
        }
    }

    /**
    * Delete activity request
    * 
    * @function delete
    * @memberof  Controller
    * @param {*} req 
    * @param {*} res 
    * @return {object} requestData or error
    */
    static async delete(req, res) {
        const { organization_id, language } = req.decoded;
        try {
            const { value: { id }, error } = Validator.delete(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);

            const deletedResponse = await Model.delete({ organization_id, id });
            if (!deletedResponse || deletedResponse.deletedCount === 0) return sendResponse(res, 200, null, translate(activityRequeat, "10", language), null)

            return sendResponse(res, 200, null, translate(activityRequeat, "11", language), null);
        } catch (err) {
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), err.message);
        }
    }

    /**
    * Get Web Apps of employee
    * 
    * @function getActivities
    * @memberof  Controller
    * @param {*} req 
    * @param {*} res 
    * @return {object} requestData or error
    */
    static async getActivities_old(req, res) {
        const { organization_id: organizationId, language, employee_id, department_id = null } = req.decoded;
        try {
            const { value, error } = Validator.activities(req.query);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);

            const { date, start_time: startTime, end_time: endTime } = value;
            const [attendance] = await Model.getAttendance({ date, employeeId: employee_id, organizationId });
            if (!attendance) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "15", language),
                error: "Attendance not found."
            });

            let activities = await Model.getActivities({ attendanceId: attendance.id, startTime, endTime });
            activities = activities.map((a) => {
                return { ...a, application: a.app.name, web: a.domain ? a.domain.name : null, timezone: attendance.timezone, attendance_id: attendance.id }
            })

            if (activities.length == 0) return sendResponse(res, 400, null, "No activity found.", null);

            /** Adding productivity ranking to web and apps  */
            if (employee_id && department_id) {
                let domainIds = _.pluck(activities.filter(i => i.domain_id !== null), "domain_id");
                let appIds = _.pluck(activities.filter(i => i.domain_id === null), "application_id");
                appIds = domainIds.length !== 0 ? appIds.concat(domainIds) : appIds;
                const productivityStatus = await Model.getAppProductivitystatus(_.unique(appIds));
                activities = activities.map(item => {
                    let productivity = item.domain_id == null ? productivityStatus.find(i => i.application_id.toString() === item.application_id.toString())
                        : productivityStatus.find(i => i.application_id.toString() === item.domain_id.toString())
                    let status = null;
                    if (productivity) {
                        if (productivity.type == 1) {
                            status = productivity.rules[0].status;
                        } else if (productivity.type == 2) {
                            status = productivity.rules.find(itr => itr.deptId === department_id) ? productivity.rules.find(itr => itr.deptId === department_id).status : 0
                        }
                    }
                    return { ...item, status }
                });
            }

            return res.json({
                code: 200,
                data: activities,
                message: 'Success',
                error: null
            });
        } catch (err) {
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), err.message);
        }
    }
    /**
        * Get Web Apps of employee
        *
        * @function getActivities
        * @memberof  Controller
        * @param {*} req
        * @param {*} res
        * @return {object} requestData or error
        */
    static getActivities = async (req, res) => {
        const { organization_id: organizationId, language, employee_id, department_id = null, timezone } = req.decoded;
        try {
            const { value, error } = Validator.activities(req.query);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);

            let { date, start_time: startTime, end_time: endTime, type } = value;
            const [attendance] = await Model.getAttendance({ date, employeeId: employee_id, organizationId });
            if (!attendance) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "15", language),
                error: "Attendance not found."
            });

            //type 2 => claim offline
            if (type === 2) {
                date = moment(date).format('YYYY-MM-DD');
                let { employee_id: employeeId, organization_id: organizationId, language = "en", user_id } = req.decoded;

                // get full offline data chunk here
                let [attendance] = await Model.getAttendanceId({ date: moment(date).format("YYYY-MM-DD"), employeeId, organizationId });

                if (!attendance) return res.json({ code: 400, data: null, message: translate(commonMessages, "2", language), })
                const { id: attendanceId, timezone, department_id } = attendance;

                let activities = await Model.getEmployeeActivities({ attendanceId });
                let finalActivities = await this.spliceNegativeEntities(activities);
                let { offlineEntities, totalOfflineTime } = await this.getOfflineActivities({ finalActivities });

                let previousReqBreakTime = await Model.getPreviousReqBreakTime({ organizationId, employee_id: employeeId, date: moment(date).format("YYYY-MM-DD") });
                let previousTimeClaimRequest = await Model.getTimeClaimRequest({ organization_id: organizationId, employee_id: employeeId, date: moment(date).format("YYYY-MM-DD"), type: 2, attendanceId,  status: [1,0] })
                offlineEntities = offlineEntities.filter(item => {
                    if (previousReqBreakTime.findIndex(i => moment(i.start_time).isSame(item.from) && moment(i.end_time).isSame(item.to)) === -1 && previousTimeClaimRequest.findIndex(i => moment(i.start_time).isSame(item.from) && moment(i.end_time).isSame(item.to)) === -1) return true;
                });

                return res.json({ code: 200, data: { offlineEntities, totalOfflineTime, timezone }, message: 'Success.' })
            }
            else {
                let oldActivityId = [];
                const oldRequestedData = await Model.getOldRequest({employee_id, organization_id: organizationId, date: moment(date).format('YYYY-MM-DD'), type: 1, attendance_id: attendance.id});
                if (oldRequestedData.length != 0) {
                    oldRequestedData.map((item)=>{
                        item?.activities?.map(i=> {
                            oldActivityId.push(String(i?.activity_id))
                        })
                    })
                }
          
                let activities = await Model.getActivities({ attendanceId: attendance.id, startTime, endTime });
                activities = activities.map((a) => {
                    return { ...a, application: a.app.name, web: a.domain ? a.domain.name : null, timezone: attendance.timezone, attendance_id: attendance.id }
                })

                if (activities.length == 0) return sendResponse(res, 400, null, "No activity found.", null);

                /** Adding productivity ranking to web and apps  */
                if (employee_id && department_id) {
                    let domainIds = _.pluck(activities.filter(i => i.domain_id !== null), "domain_id");
                    let appIds = _.pluck(activities.filter(i => i.domain_id === null), "application_id");
                    appIds = domainIds.length !== 0 ? appIds.concat(domainIds) : appIds;
                    const productivityStatus = await Model.getAppProductivitystatus(_.unique(appIds));
                    activities = activities.map(item => {
                        let productivity = item.domain_id == null ? productivityStatus.find(i => i.application_id.toString() === item.application_id.toString())
                            : productivityStatus.find(i => i.application_id.toString() === item.domain_id.toString())
                        let status = null;
                        if (productivity) {
                            if (productivity.type == 1) {
                                status = productivity.rules[0].status;
                            } else if (productivity.type == 2) {
                                status = productivity.rules.find(itr => itr.deptId === department_id) ? productivity.rules.find(itr => itr.deptId === department_id).status : 0
                            }
                        }
                        return { ...item, status }
                    });
                }

                let ipMaskingOrgId = process.env.IP_MASKING_ORG_ID.split(",");
                if (ipMaskingOrgId.includes(String(organizationId))){
                    activities = activities.map(x => {
                        x.url = maskingIP(x.url);
                        return x;
                    });
                }

                if(oldActivityId.length !== 0) {
                    activities = activities.map((item)=>{
                        if (oldActivityId.includes(String(item._id)) == false){
                            return item;
                        }
                    })
                }

                return res.json({
                    code: 200,
                    data: activities,
                    message: 'Success',
                    error: null
                });
            }
        } catch (err) {
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), err.message);
        }
    }

    /**
     * Get activity modification request
     *
     * @function create
     * @memberof  Controller
     * @param {*} req
     * @param {*} res
     * @returns {object} request list or error
     */
    static async get(req, res) {
        let { organization_id, language, employee_id: toAssignId, role_id, timezone, first_name, last_name } = req.decoded;
        try {
            let userIds;
            let assingeeIds;
            const { value, error } = Validator.getWiithFilter(req.query);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);
            if (req.body.nonAdminId) toAssignId=req.body.nonAdminId;
            let { from_date, to_date, start_time, end_time, order, sortColumn, skip, limit, search, status, employee_id, type } = value;
            from_date = from_date ? moment(from_date).format('YYYY-MM-DD') : from_date;
            to_date = to_date ? moment(to_date).format('YYYY-MM-DD') : to_date;
            /** Fetching employee list which is assign to manages roles */
            if (toAssignId) {
                assingeeIds = _.pluck(await EmployeeReportsModel.getEmployeeAssignedToManager(toAssignId, role_id), 'employee_id')
                assingeeIds.push(toAssignId);
            }
            
            // ! Commented this code due to all data was not going to admin due to this code.
            // else {
            //     /** Fetching non assigned employee list */
            //     assingeeIds = _.pluck(await Model.getNonAssignedUsers(organization_id), "id");
            // }

            if (search) {
                userIds = _.pluck(await Model.getEmployeesByName({ organization_id, search, toAssignId, role_id }), "id");

                /** Filter the non assigned employee to any managers in admin login  */
                //! not need anymore for admin as no assigneeIds for admin 
                //// userIds = !toAssignId ? userIds.filter(x => assingeeIds.includes(x)) : userIds
                if (toAssignId && first_name && last_name) {
                    let full_name = first_name + " " + last_name;
                    full_name = full_name.toLowerCase()
                    let isSearch = full_name.includes(search.toLowerCase())
                    if (isSearch) {
                        userIds.push(toAssignId);
                    }
                }
                if (toAssignId) assingeeIds = userIds;
            }

            let [activitrequests, totalCount] = await Promise.all([
                Model.getWithFilter({ from_date, to_date, assingeeIds, status, employee_ids: userIds, organization_id, start_time, end_time, order, sortColumn, skip, limit, search, employee_id, type }),
                Model.requestCount({ from_date, to_date, assingeeIds, status, employee_ids: userIds, organization_id, start_time, end_time, search, employee_id, type })
            ])
            if (!activitrequests || activitrequests.length === 0) return sendResponse(res, 400, null, translate(activityRequeat, "6", language), null);
            userIds = _.pluck(activitrequests, "employee_id");
            let employeeData = await Model.getEmployees({ organization_id, employee_ids: userIds })

            if (!employeeData || employeeData.length === 0) return sendResponse(res, 400, null, translate(activityRequeat, "6", language), null);


            let managersList = await Model.getApprovers({ organization_id, employee_ids: userIds });

            managersList = managersList.length > 0 ? managersList : [];

            activitrequests = activitrequests.map(item => ({ ...item, ...employeeData.find(i => i.id === item.employee_id) }))
            let approverIds = _.pluck(activitrequests, "approved_by");

            approverIds = approverIds.filter(i => i != null);
            approverIds = _.unique(approverIds)
            const requestApprovers = approverIds.length !== 0 ? await Model.getUsers(approverIds) : [];
            const [adminDate] = await Model.getAdminData(organization_id);
            activitrequests = activitrequests.map(itr => (
                {
                    ...itr,
                    start_time: toTimezoneDate(itr.start_time, timezone),
                    end_time: toTimezoneDate(itr.end_time, timezone),
                    createdAt: toTimezoneDate(itr.createdAt, timezone),
                    approver_name: requestApprovers.find(item => itr.approved_by == item.id) ? requestApprovers.find(item => itr.approved_by == item.id).name : null,
                    approvers: managersList.filter(i => i.employee_id == itr.employee_id)

                }))
            // activitrequests = activitrequests.map(i => ({ ...i, approvers: [...i.approvers, { ...adminDate, role: "admin" }] }))

            /** Adding admin as approver in approver list if employee isn't assigned to anyone */
            activitrequests = activitrequests.map(i => {
                let result;
                result = { ...i, approvers: [...i.approvers,] }
                if (result.approvers.length == 0) {
                    result.approvers = [{ ...adminDate, role: "admin" }]
                }
                return result;
            })
            /** loop to add the activites to activityrequest */
            let activities = [];
            if (type === 1) {
                for (let i = 0; i < activitrequests.length; i++) {
                    let currentActivity = activitrequests[i];
                    let filter = {};
                    if (currentActivity.attendance_id) filter = { attendanceId: currentActivity.attendance_id, ...filter };
                    if (currentActivity.activities) filter = { activityIds: _.pluck(currentActivity.activities, "activity_id"), ...filter };
                    currentActivity.activities = await Model.getActivities({ ...filter });
                    activitrequests[i] = currentActivity;
                    activities = activities.concat(currentActivity.activities)
                }
            }


            /** Adding productivity status to application and domains */
            if (activities.length !== 0) {
                let domainIds = _.pluck(activities.filter(i => i.domain_id !== null), "domain_id");
                let appIds = _.pluck(activities.filter(i => i.domain_id === null), "application_id");
                appIds = domainIds.length !== 0 ? appIds.concat(domainIds) : appIds;
                const productivityStatus = await Model.getAppProductivitystatus(appIds);
                activitrequests = activitrequests.map(item => {
                    let entity;
                    if (item.activities.length > 0) {
                        entity = {
                            ...item, activities: item.activities.map(i => {
                                let prodStatus = productivityStatus.find(itr => {
                                    if (i.domain_id !== null) {
                                        return itr.application_id.toString() == i.domain_id.toString()
                                    } else {
                                        return itr.application_id.toString() == i.application_id.toString()
                                    }
                                })
                                let status;
                                if (prodStatus.type == 1) {
                                    status = prodStatus.rules[0].status;
                                } else if (prodStatus.type == 2) {
                                    status = prodStatus.rules.find(role => role.deptId == item.department_id) ? prodStatus.rules.find(role => role.deptId == item.department_id).status : 0
                                }
                                return { ...i, status }
                            })
                        }
                    } else {
                        entity = item
                    }
                    return entity
                })
            }



            let ipMaskingOrgId = process.env.IP_MASKING_ORG_ID.split(",");
            if (ipMaskingOrgId.includes(String(organization_id))){
                activitrequests = activitrequests?.map(x => {
                    x.activities = x?.activities?.map(y => {
                        y.url = maskingIP(y?.url);
                        return y;
                    })
                    return x;
                });
            }

            if (type === 4 && activitrequests.length) {
                let task_ids = _.pluck(activitrequests, 'task_id').filter(i => i && i != '0');
                if(task_ids.length) {
                    let tasksDetails = await Model.getTaskClaim(task_ids);
                    for (const aRequest of activitrequests) {
                        let task = tasksDetails.find(x => x._id == aRequest.task_id);
                        aRequest.task = task;
                    }
                }
            }

            return sendResponse(res, 200, { activitrequests, totalCount, skipCount: skip + limit }, translate(activityRequeat, "7", language), null);
        } catch (err) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), null);
        }
    }

    /**
     * update the request(approve/decline)
     *
     * @function updateOfflineRequest
     * @memberof  Controller
     * @param {*} req
     * @param {*} res
     * @returns {object} request list or error
     */
    static updateOfflineRequest = async (req, res) => {
        const { organization_id: organizationId, user_id, is_admin, language, permissionData = [], first_name, last_name } = req.decoded;
        try {
            const { value, error } = Validator.updateOfflineHours(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);
            let { reason, date, status, id, employee_id, offlineTime, request_type = 0 } = value;
            const request = await Model.getRequestById({ id, employee_id, organization_id: organizationId });

            if (!request) return sendResponse(res, 400, null, translate(activityRequeat, "13", language), null);
            if (request.status === 1) return sendResponse(res, 400, null, translate(activityRequeat, "8", language), null);
            if (status == 1) {
                return this.alterOfflineActivity({ req, res, id, request, offlineTime, request_type })
            }
            if (status === 0 || status) {
                if (!is_admin) {
                    const permission = permissionData.find(obj => obj.permission === 'activity_alter_process');
                    if (!permission) {
                        let message = translate(activityRequeat, "12", language)
                        return res.json({
                            code: 400,
                            data: null,
                            message,
                            error: message
                        });
                    }
                }
            }
            date = date ? moment(date).format("YYYY-MM-DD") : date;
            let updateData
            if (!status) {
                let previousReqTime = await Model.getPreviousReqTime({ organizationId, employee_id, date, type: 2, id });
                let totalOfflineTime = await this.getOfflineTime({ organizationId, employeeId: employee_id, date })
                if (previousReqTime.length > 0) totalOfflineTime = totalOfflineTime - previousReqTime[0].totalTime
                if (totalOfflineTime < offlineTime) return sendResponse(res, 400, null, translate(activityRequeat, "cant claim", language), null)
                updateData = await Model.update({ reason, date, status, approved_by: user_id, id, offlineTime, organization_id: organizationId });
            }
            else updateData = await Model.update({ reason, date, status, approved_by: user_id, id, organization_id: organizationId });



            if (status) req.body = { ...req.body, approved_by: user_id, approver_name: first_name + " " + last_name }
            if (updateData) return sendResponse(res, 200, req.body, translate(activityRequeat, "9", language), null);

            return sendResponse(res, 400, null, translate(activityRequeat, "19", language), null);
        } catch (err) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), null);
        }
    }

    static updateOfflineRequestNew = async (req, res) => {
        try {
            const { organization_id: organizationId, user_id, is_admin, language, permissionData = [], first_name, last_name } = req.decoded;
            const { value, error } = Validator.updateOfflineHours(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);
            let { reason, date, status, id, employee_id, offlineTime } = value;

            if (!is_admin) {
                const permission = permissionData.find(obj => obj.permission === 'activity_alter_process');
                if (!permission) {
                    let message = translate(activityRequeat, "12", language)
                    return res.json({
                        code: 400,
                        data: null,
                        message,
                        error: message
                    });
                }
            }
            const request = await Model.getRequestById({ id, employee_id, organization_id: organizationId });

            if (!request) return sendResponse(res, 400, null, translate(activityRequeat, "13", language), null);
            if (request.status === 1) return sendResponse(res, 400, null, translate(activityRequeat, "8", language), null);
            if (status == 1) {
                return this.alterOfflineActivity({ req, res, id, request, offlineTime })
            }

            date = date ? moment(date).format("YYYY-MM-DD") : date;
            let updateData
            if (!status) {
                let previousReqTime = await Model.getPreviousReqTime({ organizationId, employee_id, date, type: 2, id });
                let totalOfflineTime = await this.getOfflineTime({ organizationId, employeeId: employee_id, date })
                if (previousReqTime.length > 0) totalOfflineTime = totalOfflineTime - previousReqTime[0].totalTime
                if (totalOfflineTime < offlineTime) return sendResponse(res, 400, null, translate(activityRequeat, "cant claim", language), null)
                updateData = await Model.update({ reason, date, status, approved_by: user_id, id, offlineTime, organization_id: organizationId });
            }
            else updateData = await Model.update({ reason, date, status, approved_by: user_id, id, organization_id: organizationId });

            if (status) req.body = { ...req.body, approved_by: user_id, approver_name: first_name + " " + last_name }
            if (updateData) return sendResponse(res, 200, req.body, translate(activityRequeat, "9", language), null);

            return sendResponse(res, 400, null, translate(activityRequeat, "19", language), null);
        }
        catch (error) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), null);
        }
    }

    /**
    * Update offline to office activity
    * 
    * @function alterOfflineActivity
    * @memberof  Controller
    * @param {*} req 
    * @param {*} res 
    * @return {object} success or error
    */
    static async alterOfflineActivity({ req, res, id, request, offlineTime, request_type = 0 }) {
        const { organization_id, permissionData = [], is_admin, user_id, language, first_name, last_name } = req.decoded;
        /**Check permission */
        if (!is_admin) {
            const permission = permissionData.find(obj => obj.permission === 'activity_alter_process');
            if (!permission) {
                let message = translate(activityRequeat, "12", language)
                return res.json({
                    code: 400,
                    data: null,
                    message,
                    error: message
                });
            }
        }
        try {
            const { employee_id, date, attendance_id } = request;
            const prReport = await Model.getEmployeeProductivity({ date, employeeId: employee_id });
            const [attendanceData] = await Model.getAttendance({ date, employeeId: employee_id, organizationId: organization_id });
            if (!prReport) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "16", language),
                error: "Activity not found."
            });

            if (configFile.TIME_CLAIM_UPDATE_OFFICE_TIME_SEGRGATION.includes(organization_id)) {
                let [resp] = await Model.checkIfApplicationExist(organization_id);
                if (!resp) resp = await Model.createApplicationTimeClaim(organization_id);

                await Model.addEmployeeActivities({
                    employee_id,
                    organization_id,
                    attendance_id: attendanceData.id,
                    title: "Time Claim",
                    task_id: 0,
                    project_id: 0,
                    start_time: request.start_time,
                    end_time: request.end_time,
                    application_id: resp.application_id,
                    total_duration: moment(request.end_time).diff(moment(request.start_time), 'seconds'),
                    active_seconds: moment(request.end_time).diff(moment(request.start_time), 'seconds'),
                    keystrokes_count: 0,
                    mouseclicks_count: 0,
                    mousemovement_count: 0,
                    keystrokes: "",
                    idleData: [],
                    activeData: [{
                        start_time: request.start_time,
                        end_time: request.end_time,
                    }],
                    application_id: resp._id
                });
                if (request_type == 0) {
                    prReport.productive_duration = prReport.productive_duration + offlineTime;
                    await prReport.save();
                }
                else if (request_type == 1) {
                    prReport.non_productive_duration = prReport.non_productive_duration + offlineTime;
                    await prReport.save();
                }
                else if (request_type == 2) {
                    prReport.neutral_duration = prReport.neutral_duration + offlineTime;
                    await prReport.save();
                }
                request.status = 1;
                request.approved_by = user_id;
                if (req.body.reason) request.reason = req.body.reason;
                request.save();
                return res.json({
                    code: 200,
                    data: { ...request._doc, approver_name: first_name + " " + last_name },
                    message: translate(activityRequeat, "18", language),
                    error: null
                })
            }
            else {
                prReport.offline_time = prReport.offline_time + offlineTime;
                await prReport.save();
                request.status = 1;
                request.approved_by = user_id;
                if (req.body.reason) request.reason = req.body.reason;
                request.save();
                return res.json({
                    code: 200,
                    data: { ...request._doc, approver_name: first_name + " " + last_name },
                    message: translate(activityRequeat, "18", language),
                    error: null
                })
            }
        } catch (err) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "5", language),
                error: err
            });
        }
    }
    /**
    * get offline time
    *
    * @function getOfflineTime
    * @memberof  Controller
    * @param {Number} organizationId
    * @param {Number} employeeId
    * @param {String} date
    * @return {Number} total offline time
    */
    static getOfflineTime = async ({ organizationId, employeeId, date }) => {
        let [totalActiveHours] = await Model.getTotalTime({ organizationId, employeeId, date });
        let [officeHours] = await Model.getOfflineTime({ organizationId, employeeId, date });
        const offlineSeconds = totalActiveHours.total_time - officeHours.office_time
        return offlineSeconds
    }

    static getRequestCount = async (req, res) => {
        const { organization_id, employee_id: toAssignId, role_id } = req.decoded;
        let assingeeIds= [];
        try {
            if (toAssignId) {
                assingeeIds = _.pluck(await EmployeeReportsModel.getEmployeeAssignedToManager(toAssignId, role_id), 'employee_id')
                assingeeIds.push(toAssignId)
            }
            // else {      //! (Bugfix) Commented as non usable for admin because only non assigned user list will show
            //     /** Fetching non assigned employee list */
            //     assingeeIds = _.pluck(await Model.getNonAssignedUsers(organization_id), "id");
            // }
            let idleRequests = await this.getNotificationCount({ organization_id, type: 1, assingeeIds });
            let offlineRequests = await this.getNotificationCount({ organization_id, type: 2, assingeeIds });
            let breakRequests = await this.getNotificationCount({ organization_id, type: 3, assingeeIds });
            return res.json({ code: 200, data: { idleRequests, offlineRequests, breakRequests } })
        }
        catch (error) {
            return res.json({ code: 500, data: null, message: 'some error occured' })
        }
    }

    static getNotificationCount = async ({ organization_id, type, assingeeIds }) => {
        let requests = await Model.getRequestCount({ organization_id, type, assingeeIds });
        let declinedRequests = 0;
        let approvedRequests = 0;
        let pendingRequests = 0;
        let totalRequests = 0;
        if (requests.length > 0) {
            for (let i = 0; i < requests.length; i++) {
                if (requests[i].status == 2) declinedRequests = requests[i].totalCount;
                if (requests[i].status == 1) approvedRequests = requests[i].totalCount;
                if (requests[i].status == 0) pendingRequests = requests[i].totalCount;

            }
            totalRequests = declinedRequests + approvedRequests + pendingRequests;
        }
        type = type == 1 ? "idle" : type == 2 ? "offline" : "break";

        return { declinedRequests, approvedRequests, pendingRequests, totalRequests, type }

    }

    /**
     *  get Offline Breakdown 
     * @function getOfflineBreakdown
     * @memberof  Controller
     * @param {*} req 
     * @param {*} res 
     * @returns {*} offline and office time activities breakdown
     */
    static getOfflineBreakdown = async (req, res) => {
        let { organization_id: organizationId, language } = req.decoded;
        let { employeeId, date } = req.query;
        try {
            let [attendance] = await Model.getAttendanceId({ date, employeeId, organizationId });
            if (!attendance) return res.json({ code: 400, data: null, message: translate(commonMessages, "2", language), })
            const { id: attendanceId, timezone, department_id } = attendance;

            let activities = await Model.getEmployeeActivities({ attendanceId });
            let startTime = moment(date).add(-1, "day").utc().toISOString();
            let endTime = moment(date).add(2, "day").utc().toISOString();
            let mobileTask = await Model.getTaskDetails(startTime, endTime, [+employeeId]);

            let finalActivities = await this.spliceNegativeEntities(activities);
            let { offlineEntities, totalOfflineTime } = await this.getOfflineActivities({ finalActivities })
            let { activeEntities, totalActiveTime } = await this.getActiveActivities({ finalActivities });
            let attendanceTimeClaim = await Model.getAttendanceTimeClaimRequest(startTime, endTime, employeeId, organizationId);
            let manualTimeClaim = []
            attendanceTimeClaim.map(i => {
                manualTimeClaim.push({
                    from: moment(i.start_time),
                    to: moment(i.end_time),
                })
            })

            let {
                totalProductiveTime, totalUnProductiveTime, totalNeturalTime, totalIdleTime, productiveEntities, unProductiveEntities, neturalEntities, idleEntities
            } = await this.getActivityBreakDown({ finalActivities, employeeId, department_id });

            if (!productiveEntities.length && !unProductiveEntities.length && !neturalEntities.length && !idleEntities.length) {
                let mobileUsageEntities = [];
                if(mobileTask.length == 0) return res.json({ code: 200, data: { timezone, totalOfflineTime, totalActiveTime, activeEntities, offlineEntities, isNewGraphData: false, mobileUsageEntities, manualTimeClaim }, message: translate(commonMessages, "1", language) });
                for (const { task_working_status } of mobileTask) {
                    for (const task_working_statu of task_working_status) {
                        if(task_working_statu.is_desktop_task) continue;
                        mobileUsageEntities.push({
                            from: task_working_statu.start_time,
                            to: task_working_statu.end_time,
                        })
                    }
                }

                const currentDate = moment.tz(date, timezone);
                const midnightInTimezone = currentDate.clone().startOf('day');
                const midnightInUTC = midnightInTimezone.clone().utc();
                const formattedUTCStart = midnightInUTC.toISOString();
                const formattedUTCEnd = midnightInUTC.clone().add(1, 'day').toISOString();
                            

                let myFinishedData = [];
                for (const mobileEn of mobileUsageEntities) {
                    if( (moment(mobileEn.from).isBetween(moment(formattedUTCStart), moment(formattedUTCEnd)) || moment(mobileEn.from).isSame(moment(formattedUTCStart))) && (moment(mobileEn.to).isBetween(moment(formattedUTCStart), moment(formattedUTCEnd)) || moment(mobileEn.to).isSame(moment(formattedUTCEnd)))) {
                        myFinishedData.push({
                            from: moment(mobileEn.from),
                            to: moment(mobileEn.to),
                        })
                    }
                    else if(moment(formattedUTCStart).isBetween(moment(mobileEn.from), moment(mobileEn.to))) {
                        myFinishedData.push({
                            from: moment(formattedUTCStart),
                            to: moment(mobileEn.to),
                        })
                    }
                    else if (moment(formattedUTCEnd).isBetween(moment(mobileEn.from), moment(mobileEn.to))) {
                        myFinishedData.push({
                            from: moment(mobileEn.from),
                            to: moment(formattedUTCEnd),
                        })
                    }
                }

                let intervals = myFinishedData.map(interval => ({
                    from: moment(interval.from),
                    to: moment(interval.to)
                }));

                intervals = intervals.map(entry => ({
                    from: moment(entry.from),
                    to: moment(entry.to),
                })).sort((a, b) => a.from - b.from);


                const missingIntervals = [];
                for (let i = 0; i < intervals.length - 1; i++) {
                    const currentEnd = intervals[i].to;
                    const nextStart = intervals[i + 1].from;
                
                    if (currentEnd.isBefore(nextStart)) {
                        missingIntervals.push({
                            from: currentEnd.toISOString(),
                            to: nextStart.toISOString()
                        });
                    }
                }

                if(missingIntervals.length > 0) return res.json({ code: 200, data: { timezone, totalOfflineTime, totalActiveTime, activeEntities, offlineEntities: missingIntervals, isNewGraphData: false, mobileUsageEntities: intervals, manualTimeClaim }, message: translate(commonMessages, "1", language) });
                return res.json({ code: 200, data: { timezone, totalOfflineTime, totalActiveTime, activeEntities, offlineEntities, isNewGraphData: false, mobileUsageEntities: intervals, manualTimeClaim }, message: translate(commonMessages, "1", language) });
            }

            let previousReqOfflineTime = await Model.getTimeClaimRequestTimesheet({ organization_id: organizationId, attendanceId, employee_id: +employeeId, date: moment(date).format("YYYY-MM-DD"), type: 2 });
            let tempPreviousReqIdleTime = await Model.getIdleTimeClaimRequestTimesheet({ organization_id: organizationId, attendanceId, employee_id: +employeeId, date: moment(date).format("YYYY-MM-DD"), type: 1 });
            let previousBreakTime = await Model.getPreviousReqBreakTime({ organizationId, employee_id: +employeeId, date: moment(date).format("YYYY-MM-DD"), type: 2, isGetOfflineBreakdown: true });
            let temp = [], previousReqIdleTime = {result: []};
            
            tempPreviousReqIdleTime.map(({result}) => {
                previousReqIdleTime.result.push(...result)
            })

            previousReqIdleTime?.result?.map(({ idleData }) => {
                temp.push(...idleData)
            });
            temp.sort(function (a, b) {
                return moment(a.start_time).diff(moment(b.start_time));
            });
            temp = this.myFunc(temp);
            let {offlineEntitiesD, idleEntitiesD} = this.filterEntities({ offlineEntities, idleEntities, previousReqOfflineTime, previousReqIdleTime: temp, previousBreakTime });
            let { mobileUsageEntities, offlineEntitiesDN } = this.filterMobileAppUsageTask(offlineEntitiesD, mobileTask);
            return res.json({
                code: 200,
                data: {
                    timezone,
                    totalOfflineTime,
                    totalActiveTime,
                    activeEntities,
                    offlineEntities: offlineEntitiesDN,
                    totalProductiveTime,
                    isNewGraphData: true,
                    totalUnProductiveTime,
                    totalNeturalTime,
                    totalIdleTime,
                    productiveEntities,
                    unProductiveEntities,
                    neturalEntities,
                    idleEntities: idleEntitiesD,
                    breakEntities: previousBreakTime,
                    offlineTimeClaimEntities: previousReqOfflineTime,
                    idleTimeClaimEntities: temp,
                    mobileUsageEntities: mobileUsageEntities,
                    manualTimeClaim
                },
                message: translate(commonMessages, "1", language)
            })
        }
        catch (err) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return res.json({ code: 401, data: null, message: translate(activityRequeat, "5", language) })
        }
    }

    static filterEntities({ offlineEntities, idleEntities, previousReqOfflineTime, previousReqIdleTime, previousBreakTime }) {
        offlineEntities = offlineEntities.filter(entity => {
            const offlineIndex = previousReqOfflineTime.findIndex(i => moment(i.start_time).isSame(entity.from) && moment(i.end_time).isSame(entity.to));
            const breakIndex = previousBreakTime.findIndex(i => moment(i.start_time).isSame(entity.from) && moment(i.end_time).isSame(entity.to));
            if (offlineIndex === -1 && breakIndex === -1) return entity;
        });
        idleEntities = idleEntities.filter(entity => {
            const idleIndex = previousReqIdleTime.findIndex(i => moment(i.start_time).isSame(entity.start_time) && moment(i.end_time).isSame(entity.end_time));
            if (idleIndex === -1) return entity;
        });

        return {offlineEntitiesD: offlineEntities, idleEntitiesD: idleEntities};
    }

    static getActivityBreakDown = async ({ finalActivities, employeeId, department_id }) => {
        const applicationIds = _.pluck(finalActivities, "application_id");
        const domainIds = _.pluck(finalActivities, "domain_id").filter(x => x);

        const statuses = await EmployeeReportsModel.getApplicationsStatus([...applicationIds, ...domainIds], department_id);
        let productiveEntities = [];
        let unProductiveEntities = [];
        let neturalEntities = [];
        let idleEntities = [];

        for (const activity of finalActivities) {
            let activityId = activity?.url ? activity.domain_id : activity.application_id;
            const status = statuses[activityId];
            const final_status = activityId in statuses ? ('0' in status ? status['0'] : status[department_id]) : null;
            if (final_status == 0) {
                // Netural
                if (activity?.activeData) {
                    for (let entity of activity?.activeData) {
                        // if (neturalEntities.findIndex(i => moment(i.start_time).isSame(entity.start_time) && moment(i.end_time).isSame(entity.end_time)) === -1)
                        neturalEntities.push(entity);
                    }
                }
            }
            else if (final_status == 1) {
                // productive
                if (activity?.activeData) {
                    for (let entity of activity?.activeData) {
                        productiveEntities.push(entity);
                    }
                }
            }
            else if (final_status == 2) {
                // unproductive
                if (activity?.activeData) {
                    for (let entity of activity?.activeData) {
                        unProductiveEntities.push(entity);
                    }
                }
            }
            if (activity?.idleData) {
                // idle
                for (let entity of activity?.idleData) {
                    idleEntities.push(entity);
                }
            }
        }

        productiveEntities.sort(function (a, b) {
            return moment(a.start_time).diff(moment(b.start_time));
        });
        unProductiveEntities.sort(function (a, b) {
            return moment(a.start_time).diff(moment(b.start_time));
        });
        neturalEntities.sort(function (a, b) {
            return moment(a.start_time).diff(moment(b.start_time));
        });
        idleEntities.sort(function (a, b) {
            return moment(a.start_time).diff(moment(b.start_time));
        });

        productiveEntities = this.myFunc(productiveEntities);
        unProductiveEntities = this.myFunc(unProductiveEntities);
        neturalEntities = this.myFunc(neturalEntities);
        idleEntities = this.myFunc(idleEntities);

        return {
            productiveEntities, unProductiveEntities, neturalEntities, idleEntities
        };
    }

    static myFunc(arr) {
        let newArr = [];
        for (let i = 0; i < arr.length; i++) {
            let item = arr[i];
            if (!newArr.length) { newArr.push({ start_time: item.start_time, end_time: item.end_time }); continue };
            if (moment(newArr[newArr.length - 1].end_time).isSame(arr[i]?.start_time)) {
                newArr[newArr.length - 1].end_time = arr[i]?.end_time;
            } else {
                newArr.push({ start_time: item.start_time, end_time: item.end_time });
            }
        }
        return newArr;
    }

    static filterMobileAppUsageTask(offlineUsage, mobileAppUsage) {
        if(mobileAppUsage.length === 0) return { mobileUsageEntities: [], offlineEntitiesDN: offlineUsage };
        let mobileUsageEntities = [];
        let offlineEntitiesDN = [];
        for (const offlineTime of offlineUsage) {
            let flag = false;
            for (const { task_working_status } of mobileAppUsage) {
                for (const task_workings of task_working_status) {
                    if(task_workings.is_desktop_task) continue;
                    if(moment(task_workings.start_time).utc().diff(offlineTime.from, 'seconds') === 0 && moment(task_workings.end_time).utc().diff(offlineTime.to, 'seconds') === 0) {
                        flag = true;
                        mobileUsageEntities.push({
                            from: task_workings.start_time,
                            to: task_workings.end_time,
                        })
                    }
                    if(!isRequestedTimeOutsideRange(offlineTime.from, offlineTime.to, task_workings.start_time, task_workings.end_time)) {
                        flag = true;
                        mobileUsageEntities.push({
                            from: task_workings.start_time,
                            to: task_workings.end_time,
                        })
                    }
                    else if(task_workings.start_time && task_workings.end_time) {
                        flag = true;
                        mobileUsageEntities.push({
                            from: task_workings.start_time,
                            to: task_workings.end_time,
                        })
                    }
                    if(task_workings.start_time && !task_workings.end_time) {
                        flag = true;
                        mobileUsageEntities.push({
                            from: task_workings.start_time,
                            to: task_workings.end_time || moment().utc().toISOString(),
                        })
                    }
                }
            }
            if(flag == false) {
                offlineEntitiesDN.push({
                    from: offlineTime.from,
                    to: offlineTime.to,
                    offlineTime: offlineTime.offlineTime
                })
            }
        }
        if(offlineUsage.length == 0) {
            for (const { task_working_status } of mobileAppUsage) {
                for (const task_workings of task_working_status) {    
                    if(task_workings.is_desktop_task) continue;                
                    mobileUsageEntities.push({
                        from: task_workings.start_time,
                        to: task_workings.end_time,
                    })
                }
            }
        }
        return { mobileUsageEntities, offlineEntitiesDN };
    }


    /**
     *  gets offline activities
     * @function getOfflineActivity
     * @memberof  Controller
     * @param {number} attendanceId
     * @returns {*} gets offline breakdown 
     */
    static getOfflineActivities = async ({ finalActivities }) => {
        let offlineEntities = [], totalOfflineTime = 0;
        for (let i = 0; i < finalActivities.length - 1; i++) {
            let entity = moment.utc(finalActivities[i].end_time).add(1, 'seconds')
            let newEntity = moment.utc(finalActivities[i + 1].start_time)
            const offlineTime = newEntity.diff(entity, 'seconds')
            if (offlineTime >= 1) {
                totalOfflineTime += offlineTime
                offlineEntities.push({ offlineTime, from: entity, to: newEntity })
            }
        }
        return { offlineEntities, totalOfflineTime }
    }
    /**
     *  removing negative entities
     * @function getActiveActivities
     * @memberof  Controller
     * @param {*} finalActivities
     * @returns {*} get active time breakdown
     */
    static getActiveActivities = async ({ finalActivities }) => {
        let activeEntities = [], totalActiveTime = 0;
        let startEntity = [];
        for (let i = 0; i < finalActivities.length - 1; i++) {
            let entity = moment.utc(finalActivities[i].end_time)
            let newEntity = moment.utc(finalActivities[i + 1].start_time)
            const diffTime = newEntity.diff(entity, 'seconds')
            // if the difference is coming then we have to keep track of first entity start_time
            if (diffTime == 0) {
                startEntity.push(moment.utc(finalActivities[i].start_time));
            }
            // if start time and end time is subtracted here
            // if startEntity array has values the first value of that array is taken as start time
            else {
                let startTime = (startEntity.length == 0) ? moment.utc(finalActivities[i].start_time) : startEntity[0];
                let endTime = moment.utc(finalActivities[i].end_time)
                const activeTime = endTime.diff(startTime, 'seconds')
                activeEntities.push({ activeTime, from: startTime, to: endTime });
                totalActiveTime += activeTime
                startEntity = [];
            }
        }
        //once loop is completed then one last entity will be left. The calculation is done here
        //if startEntity array has values then the first value of that array will be taken as start time
        let startTime = (startEntity.length != 0) ? startEntity[0] : moment.utc(finalActivities[finalActivities.length - 1]?.start_time);
        let endTime = moment.utc(finalActivities[finalActivities.length - 1]?.end_time)
        const activeTime = endTime.diff(startTime, 'seconds')
        activeEntities.push({ activeTime, from: startTime, to: endTime });
        totalActiveTime += activeTime
        return { activeEntities, totalActiveTime }
    }

    /**
     *  removing negative entities
     * @function spliceNegativeEntities
     * @memberof  Controller
     * @param {*} activities
     * @returns {*} removes all negative entities
     */
    static spliceNegativeEntities = (activities) => {
        for (let i = 0; i < activities.length - 1; i++) {
            let entity = moment(activities[i].end_time)
            let newEntity = moment(activities[i + 1].start_time)
            const offlineTime = newEntity.diff(entity, 'seconds')
            if (offlineTime < 0) {
                activities.splice(i + 1, 1)
                i--
            }
        }
        return activities;
    }

    static async getAutoTimeClaimStatus(req, res) {
        let { user_id, organization_id, language } = req.decoded;
        try {
            let data = await Model.getAATimeClaim(user_id);
            let isApprovedOrg = await Model.isApprovedOrg(organization_id);
            isApprovedOrg = isApprovedOrg[0].auto_accept_time_claim;
            if (!data) return res.json({ code: 401, data: null, message: "User not exist" })
            return res.json({ code: 200, data: { is_enable: ((data[0].auto_accept_time_claim === "" || data[0].auto_accept_time_claim === "true") && isApprovedOrg == "true") ? "true" : "false", isApprovedOrg }, message: "Data found" });
        }
        catch (error) {
            return res.json({ code: 401, data: null, message: translate(activityRequeat, "5", language) });
        }
    }

    static async updateAutoTimeClaimStatus(req, res) {
        let { user_id, language, organization_id } = req.decoded;
        try {
            let validation = Validator.autoAcceptTimeClaim(req.body);
            if (validation.error) return res.json({ code: 200, data: null, error: 'is_enable is required', message: "Validation Error" });
            let { is_enable: status } = validation.value;
            await Model.updateAutoClaimStatus(user_id, status);
            res.json({ code: 200, data: null, message: "Data updated" });
            if (status == "true") updateOldTimeClaimStatus(user_id, organization_id, req);
        }
        catch (error) {
            return res.json({ code: 401, data: null, message: translate(activityRequeat, "5", language) });
        }
    }
    static async getRequests(req, res) {
        const { language = "en", organization_id } = req.decoded;
        try {
            const { value, error } = Validator.getWithFilter(req.query);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);
            let { employee_id, date } = value;
            date = moment(date).format('YYYY-MM-DD');
            let employeeData = await Model.getEmployeeTimeZone({organization_id, employee_id})
            let breakData = await Model.getBreakRequest({ employee_id, date, organization_id });
            if (breakData.length === 0) return sendResponse(res, 401, null, translate(commonMessages, "2", language), null)
            let approvedUserDetails = _.pluck(breakData, "approved_by").filter(id => id);
            if(approvedUserDetails.length !== 0) approvedUserDetails = await Model.getUserDetail(approvedUserDetails);
            breakData = breakData.map(i => {
                if(i.approved_by) {
                    i.approved_by = approvedUserDetails.filter(id => id.id === i.approved_by)[0]?.name ?? "";
                }
                return i;
            })
            if (!breakData.length) return sendResponse(res, 400, null, translate(activityRequeat, "6", language), null);
            return sendResponse(res, 200, { breakData, timezone: employeeData[0].timezone }, translate(activityRequeat, "7", language), null);
        } catch (err) {
            Logger.error(`----error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), null);
        }
    }

    static async updateBreakRequests(req, res) {
        const { language = "en", organization_id, user_id, employee_id, is_admin } = req.decoded;
        try {
            const { value, error } = Validator.updateBreakRequest(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);
            let { id, status, request_type } = value;
            let breakRequest = await Model.getBreakRequestById({_id: id, organization_id});
            if(!breakRequest?._doc?.offline_time) return sendResponse(res, 401, null, "No data found", null);
            if (!is_admin) {
                if (employee_id == breakRequest?.employee_id) return sendResponse(res, 400, null, translate(activityRequeat, "23", language), 'Bad request.');
            }
            if (status == 1) await alterOfflineActivityTimeClaim({req, res, request: breakRequest, offlineTime: breakRequest?._doc?.offline_time, request_type: request_type});
            if (status == 2) {
                breakRequest.status = 2;
                breakRequest.approved_by = user_id;
                breakRequest.save();
            }
            return sendResponse(res, 200, { breakRequest }, translate(activityRequeat, "7", language), null);
        } catch (error) {
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), error.message);
        }
    }

    static async deleteBreakRequests(req, res) {
        const { language = "en", employee_id, is_admin } = req.decoded;
        try {
            const { value: { id }, error } = Validator.deleteBreakRequest(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);

            if (is_admin) return sendResponse(res, 400, null, translate(activityRequeat, "26", language), 'Bad request.');

            const deletedData = await Model.deleteBreakRequest({ id, employee_id });
            if (!deletedData) return sendResponse(res, 400, null, translate(activityRequeat, "10", language), 'Bad request.');

            return sendResponse(res, 200, deletedData, translate(activityRequeat, "11", language), null);
        } catch (error) {
            return sendResponse(res, 400, null, translate(activityRequeat, "10", language), error.message);
        }
    }

    static async acceptMultipleTimeClaim(req, res) {
        const { user_id, is_admin, language, permissionData = [], organization_id } = req.decoded;
        try {
            if (!is_admin) {
                const permission = permissionData.find(obj => obj.permission === 'activity_alter_process');
                if (!permission) return res.json({ code: 400, data: null, message, error: translate(activityRequeat, "12", language) });
            }
            const { value, error } = Validator.multipleTimeClaims(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);
            let { ids, type, reason, status } = value;
            if (!status) status = 1;
            let result;
            if (status === 1) {
                if (type === 1) {
                    result = await multiClaimIdle({ ids, language, user_id });
                }
                
                if (type === 2) {
                    result = await multiClaimOffline({ ids, language, user_id, reason });
                }

                if (type === 3) {
                    result = await multiClaimBreak({ ids, language, user_id, reason, organization_id });
                }

                const successArr = result?.successArr;
                const failedArr = result?.failedArr;

                if (!successArr?.length && failedArr.every(i => i?.message == translate(activityRequeat, "22", language))) return sendResponse(res, 400, null, translate(activityRequeat, "22", language), "Bad request");
                if (!successArr?.length) return sendResponse(res, 400, { successArr, failedArr }, translate(activityRequeat, "19", language), "Bad request");
                return sendResponse(res, 200, { successArr, failedArr }, translate(activityRequeat, "21", language), null);
            }

            if (status === 2) {
                if (type === 1) {
                    result = await multiDeclineIdle({ ids, language, user_id, organization_id });
                }

                if (type === 2) {
                    result = await multiDeclineOffline({ ids, language, user_id, reason, organization_id });
                }
                
                if (type === 3) {
                    result = await multiDeclineBreak({ ids, language, user_id, reason, organization_id });
                }
                const successArr = result?.successArr;
                const failedArr = result?.failedArr;
                if (!successArr?.length) return sendResponse(res, 400, { successArr, failedArr }, translate(activityRequeat, "19", language), "Bad request");
                return sendResponse(res, 200, { successArr, failedArr }, translate(activityRequeat, "9", language), null);
            }
            
            return sendResponse(res, 400, null, translate(activityRequeat, "19", language), null);
        } catch (error) {
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), error.message);
        }
    }

    static async fetchOrgTimeclaimReason(req, res) {
        const { language = "en", is_admin, organization_id } = req.decoded;
        try {
            const { value: { type }, error } = Validator.getReason(req.query);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);

            const [data] = await Model.findReasons({ organization_id, type });
            if (!data) return sendResponse(res, 404, null, translate(activityRequeat, "31", language), 'Not found.');

            return sendResponse(res, 200, data, 'Reasons fetched successfully.', null);
        } catch (error) {
            return sendResponse(res, 400, null, 'Failed to fetch reasons.', error.message);
        }
    }

    static async createOrgTimeclaimReason(req, res) {
        const { language = "en", is_admin, organization_id } = req.decoded;
        try {
            if (!is_admin) return sendResponse(res, 400, null, translate(activityRequeat, "12", language), null);
            const { value: { name, type }, error } = Validator.createReason(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);

            const ifReasonAlreadyPresent = await Model.getReasonByName({ organization_id, name, type });
            if (ifReasonAlreadyPresent) return sendResponse(res, 400, null, translate(activityRequeat, "29", language), null);

            const ifReasonOfOrg = await Model.getReasonByOrgId({ organization_id });
            let reason = null;
            if (!ifReasonOfOrg) {
                reason = await Model.createReason({ organization_id, reasons: [{ name, type }] });
                if (reason) return sendResponse(res, 200, reason, translate(activityRequeat, "28", language), null);
                return sendResponse(res, 400, null, translate(activityRequeat, "27", language), error.message);
            }

            reason = await Model.updateReason({ ifReasonOfOrg, name, type })
            if (reason) return sendResponse(res, 200, reason, translate(activityRequeat, "28", language), null);
            return sendResponse(res, 400, null, translate(activityRequeat, "27", language), error.message);
        } catch (error) {
            return sendResponse(res, 400, null, translate(activityRequeat, "27", language), error.message);
        }
    }

    static async deleteOrgTimeclaimReason(req, res) {
        const { language = "en", is_admin, organization_id } = req.decoded;
        try {
            if (!is_admin) return sendResponse(res, 400, null, translate(activityRequeat, "12", language), null);
            const { value: { id }, error } = Validator.deleteReason(req.query);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);

            const data = await Model.getReasonById({ organization_id, id });

            if (!data) return sendResponse(res, 404, null, translate(activityRequeat, "31", language), 'Not found.');

            data.reasons = data.reasons.filter(i => i._id != id);

            const deletedData = await Model.deleteReason(data);

            if (deletedData) return sendResponse(res, 200, deletedData, translate(activityRequeat, "32", language), null);

            return sendResponse(res, 400, data, translate(activityRequeat, "30", language), 'Bad request');
        } catch (error) {
            return sendResponse(res, 400, null, translate(activityRequeat, "27", language), error.message);
        }
    }

    static async createAttendanceRequest(req, res, next) {
        const { language = "en", employee_id, organization_id, timezone, user_id } = req.decoded;
        try {
            const { value, error } = Validator.createAttendanceRequest(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);

            let { date, start_time, end_time, reason, task_id } = value;

            start_time = moment.tz(start_time, 'YYYY-MM-DD HH:MM:SS', timezone).utc();
            end_time = moment.tz(end_time, 'YYYY-MM-DD HH:MM:SS', timezone).utc();
            date = moment.tz(date, 'YYYY-MM-DD HH:MM:SS', timezone).format('YYYY-MM-DD');

            let [attendanceData] = await Model.getAttendanceByDate(date, employee_id);

            let autoApproveStatus = 0; // 0 - Pending 1 - Approved 2 - Decline
            /* This Below condition check for admin and non admin auto approval for time claim request and 
                if anyone failed to approve goes to pending request 
                Case 1 :- Admin Enable & Manager1 Enable to status accept
                Case 2 :- Admin Enable & Manager1 Enable & Manager2 Enable to status accept
                Case 3 :- Admin Enable & Manager1 Disable to status pending
                Case 4 :- Admin Enable & Manager1 Enable & Manager2 Disable to status pending
            */
            
            let isApprovedOrg = await Model.isApprovedOrg(organization_id);
            isApprovedOrg = isApprovedOrg[0].auto_accept_time_claim;
            let assignedAdminId = await Model.getAssignedAdminId(user_id);
            assignedAdminId = _.pluck(assignedAdminId, "non_admin_id");
            let condition;
            let getNonAdminApproval;
            if (assignedAdminId.length != 0) {
                getNonAdminApproval = await Model.getNonAdminApproval(assignedAdminId);
                getNonAdminApproval = _.pluck(getNonAdminApproval, "auto_accept_time_claim");
            }
            else getNonAdminApproval = [];
            getNonAdminApproval.push(isApprovedOrg);
            condition = getNonAdminApproval.filter(x => x == "false");
            if (condition.length == 0) autoApproveStatus = 1;

            if(!attendanceData) {
                let previousReq = await Model.getExistingAttendanceRequest(employee_id, organization_id, date);
                let existingSameRequest = await Model.getExistingSameTimeRequest(employee_id, organization_id, date,);
                existingSameRequest = existingSameRequest.filter(x => {
                    return moment(start_time).isBetween(moment(x.start_time), moment(x.end_time)) || moment(end_time).isBetween(moment(x.start_time), moment(x.end_time))
                })
                if (existingSameRequest.length !== 0) return sendResponse(res, 400, null, translate(activityRequeat, "2", language), null);
                let mobileTask = await Model.getTaskDetails(start_time, end_time, [employee_id]);
                if(mobileTask.length) {
                    let status = false;
                    for (const {task_working_status} of mobileTask) {
                        for (const task_working of task_working_status) {
                            if(status === true) break;
                            if(!isRequestedTimeOutsideRange(start_time, end_time, task_working.start_time, task_working.end_time)) {
                                status = true;
                                break;
                            }
                        }
                    }
                    if(status) return sendResponse(res, 400, null, translate(activityRequeat, "39", language), null);
                }
                if(previousReq.length === 0) {
                    let response = await Model.createAttendanceRequest(employee_id, organization_id, date, reason, start_time, end_time, task_id);
                    // Add Auto Approve Code 
                    if(autoApproveStatus == 1) await alterAttendanceTimeClaim({decoded: req.decoded}, date, response);
                    return sendResponse(res, 200, response, translate(activityRequeat, "4", language), null);
                }
                else return sendResponse(res, 400, null, translate(activityRequeat, "2", language), null);
            }
            else{
                // Must not be in between attendance start and end time
                let previousReq = await Model.getExistingAttendanceRequest(employee_id, organization_id, date);
                let existingSameRequest = await Model.getExistingSameTimeRequest(employee_id, organization_id, date,);
                existingSameRequest = existingSameRequest.filter(x => {
                    return moment(start_time).isBetween(moment(x.start_time), moment(x.end_time)) || moment(end_time).isBetween(moment(x.start_time), moment(x.end_time))
                })
                if (existingSameRequest.length !== 0) return sendResponse(res, 400, null, translate(activityRequeat, "2", language), null);
                let mobileTask = await Model.getTaskDetails(start_time, end_time, [employee_id]);
                if(mobileTask.length) {
                    let status = false;
                    for (const {task_working_status} of mobileTask) {
                        for (const task_working of task_working_status) {
                            if(status === true) break;
                            if(!isRequestedTimeOutsideRange(start_time, end_time, task_working.start_time, task_working.end_time)) {
                                status = true;
                                break;
                            }
                        }
                    }
                    if(status) return sendResponse(res, 400, null, translate(activityRequeat, "39", language), null);
                }
                if(previousReq.length === 0) {
                    if (checkTimeInRange(start_time, end_time, attendanceData.start_time, attendanceData.end_time)) { 
                        // You already active during this duration
                        return sendResponse(res, 400, null, translate(activityRequeat, "35", language), null);
                    }
                    else {
                        let response = await Model.createAttendanceRequest(employee_id, organization_id, date, reason, start_time, end_time, task_id);
                        // Add Auto Approve Code 
                        if(autoApproveStatus == 1) await alterAttendanceTimeClaim({decoded: req.decoded}, date, response);
                        return sendResponse(res, 200, response, translate(activityRequeat, "4", language), null);
                    }
                }
                else return sendResponse(res, 400, null, translate(activityRequeat, "2", language), null);
            }
        }
        catch (err) {
            return sendResponse(res, 400, null, translate(activityRequeat, "27", language), err.message);
        }
    }

    /**
     * Delete an attendance request created by the user
     * 
     * @function deleteAttendanceRequest
     * @memberof  Controller
     * @param {*} req 
     * @param {*} res 
     * @returns {object} request list or error 
     */

    static deleteAttendanceRequest = async (req, res) => {
        let { language = 'en', employee_id, organization_id, user_id, timezone } = req.decoded;
        try {
            let ids = req.body.ids;
            if (ids.length === 0 || !Array.isArray(ids)) return sendResponse(res, 400, null, translate(activityRequeat, "33", language), null);
            let response = await Model.deleteAttendanceRequest(organization_id, employee_id, ids);
            return sendResponse(res, 200, response, translate(activityRequeat, "32", language), null);
        }
        catch (error) {
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), error.message);
        }
    }

    static async updateAttendanceRequest(req, res, next) {
        const { language = "en", organization_id, user_id } = req.decoded;
        try {
            const { value, error } = Validator.updateRequest(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);

            let { id, status, type } = value;

            let activityRequestData = await Model.getActivityAttendanceRequest(id, organization_id);
            if(!activityRequestData) return sendResponse(res, 400, null, translate(activityRequeat, "24", language), null);
            let { start_time, end_time, date, employee_id } = activityRequestData;

            let [attendanceData] = await Model.getAttendanceByDate(moment(date).format('YYYY-MM-DD'), employee_id);
            if(status == 2) {
                activityRequestData.status = status;
                activityRequestData.approved_by = user_id;
                await activityRequestData.save();
                return sendResponse(res, 200, null, translate(activityRequeat, "18", language), null);
            }
            else if (status == 1) {
                // TODO: Get type from body and during acceptance process add to data
                // 1. Productive
                // 2. Unproductive
                // 3. Neutral
                // 4. Idle

                // Create Application (mongo)
                // Create it productive rules in org_dep_app_web (mongo)
                // run below code only
                // after that create productivity usage (mongo)
                // create productivity report usage (mongo)

                let [timeClaimApplication] = await Model.checkIfApplicationExist(organization_id);
                let application_id = timeClaimApplication?._id;
                if(!timeClaimApplication) {
                    let response = await Model.createApplicationTimeClaim(organization_id);
                    let org_dep_app_web = await Model.createOrganizationDeptAppWeb(response._id);
                    application_id = response._id;
                }
                let durationSecond = moment(end_time).diff(moment(start_time), 'seconds')
                let [employeeDetails] = await Model.getEmployeeLocationDepartment(employee_id);

                if(attendanceData) {
                    let diff = moment(start_time).diff(attendanceData.start_time);
                    if (diff < 0) {
                        if (!moment(moment(start_time).toISOString()).isAfter(attendanceData.start_time)) {
                            let existingPrReport = await Model.updateEmployeeProductivityReport(application_id, organization_id, employee_id, durationSecond, employeeDetails.department_id, employeeDetails.location_id, date);
                            existingPrReport.logged_duration = existingPrReport.logged_duration + durationSecond;
                            existingPrReport.productive_duration = existingPrReport.productive_duration + durationSecond;
                            existingPrReport.applications.push(
                                {
                                    "pro": durationSecond,
                                    "non": 0,
                                    "neu": 0,
                                    "idle": 0,
                                    "total": durationSecond,
                                    "application_type": 1,
                                    "tasks": [
                                        {
                                            "pro": durationSecond,
                                            "non": 0,
                                            "neu": 0,
                                            "idle": 0,
                                            "total": durationSecond,
                                            "task_id": 0
                                        }
                                    ],
                                    "application_id": application_id
                                }
                            )
                            existingPrReport.save();
                            await Model.updateEmployeeAttendance(moment(date).format('YYYY-MM-DD'), employee_id, moment(start_time).toISOString());
                        }
                    }
                    else {
                        if (moment(moment(end_time).toISOString()).isAfter(attendanceData.end_time)){
                            let existingPrReport = await Model.updateEmployeeProductivityReport(application_id, organization_id, employee_id, durationSecond, employeeDetails.department_id, employeeDetails.location_id, date);
                            existingPrReport.logged_duration = existingPrReport.logged_duration + durationSecond;
                            existingPrReport.productive_duration = existingPrReport.productive_duration + durationSecond;
                            existingPrReport.applications.push(
                                {
                                    "pro": durationSecond,
                                    "non": 0,
                                    "neu": 0,
                                    "idle": 0,
                                    "total": durationSecond,
                                    "application_type": 1,
                                    "tasks": [
                                        {
                                            "pro": durationSecond,
                                            "non": 0,
                                            "neu": 0,
                                            "idle": 0,
                                            "total": durationSecond,
                                            "task_id": 0
                                        }
                                    ],
                                    "application_id": application_id
                                }
                            )
                            existingPrReport.save();
                            await Model.updateEmployeeAttendance(moment(date).format('YYYY-MM-DD'), employee_id, null, moment(end_time).toISOString());
                        }
                    }
                }
                else {
                    await Model.createEmployeeProductivityReport(application_id, organization_id, employee_id, durationSecond, employeeDetails.department_id, employeeDetails.location_id, date);
                    await Model.insertEmployeeAttendance(date, start_time, end_time, employee_id, organization_id);
                }
                activityRequestData.status = status;
                activityRequestData.approved_by = user_id;
                await activityRequestData.save();
                updateTeleworks(organization_id, employee_id, date);
                updateTaskAttendanceClaim(activityRequestData);
                return sendResponse(res, 200, null, translate(activityRequeat, "18", language), null);
            }

        }
        catch (error) { 
            console.log(error)
            return sendResponse(res, 400, null, translate(activityRequeat, "5", language), error.message);
        }
    }

    static async createAttendanceRequestForEmployeesByAdminManager (req, res, next) {
        let { language, organization_id, is_admin, permissionData = [] } = req.decoded;
        try {
            // Authorization: creating attendance requests on behalf of other
            // employees is a manager/admin action. Admins are always allowed;
            // non-admins must hold the 'activity_alter_process' permission (the
            // same permission that identifies an approver/manager and already
            // gates the approve/decline path). Without this, any authenticated
            // employee could raise — and via auto-approve, auto-accept —
            // attendance claims for arbitrary coworkers in their org.
            if (!is_admin) {
                const canManage = permissionData.find(obj => obj.permission === 'activity_alter_process');
                if (!canManage) {
                    return sendResponse(res, 403, null, translate(activityRequeat, "12", language), translate(activityRequeat, "12", language));
                }
            }
            const { value, error } = Validator.validateAttendanceRequestForEmployeesByAdminManager(req.body);
            if (error) return sendResponse(res, 401, null, translate(organizationMessages, "2", language), error.details[0].message);
            let { start_time, end_time, from_date, to_date, reason, employee_ids, task_id } = value;
            let betweenDates = await getAllDatesBetween(from_date, to_date);

            let errorResponse = [], successResponse = [];

            for (const dates of betweenDates) {
                for (const employee_id of employee_ids) {
                    let [employeeDetails] = await Model.getEmployeeDetailsById(employee_id, organization_id);
                    if(!employeeDetails) continue;
                    
                    let date = dates.format('YYYY-MM-DD');
                    let attStartTime = moment(`${dates.format('YYYY-MM-DD')} ${moment(start_time).format('HH:mm:ss')}`, 'YYYY-MM-DD HH:mm:ss');
                    let attEndTime = moment(`${dates.format('YYYY-MM-DD')} ${moment(end_time).format('HH:mm:ss')}`, 'YYYY-MM-DD HH:mm:ss');
                    let diff = attEndTime.diff(attStartTime, 'hour');
                    if(diff < 0) {
                        attEndTime = attEndTime.add(1, 'days');
                    }

                    let { timezone, user_id } = employeeDetails;
        
                    let [attendanceData] = await Model.getAttendanceByDate(date, employee_id);
                    let statusAutoApprove  = 0; // 0 - Pending 1 - Approved 2 - Decline
                    /* This Below condition check for admin and non admin auto approval for time claim request and 
                        if anyone failed to approve goes to pending request 
                        Case 1 :- Admin Enable & Manager1 Enable to status accept
                        Case 2 :- Admin Enable & Manager1 Enable & Manager2 Enable to status accept
                        Case 3 :- Admin Enable & Manager1 Disable to status pending
                        Case 4 :- Admin Enable & Manager1 Enable & Manager2 Disable to status pending
                    */
                    
                    let isApprovedOrg = await Model.isApprovedOrg(organization_id);
                    isApprovedOrg = isApprovedOrg[0].auto_accept_time_claim;
                    let assignedAdminId = await Model.getAssignedAdminId(user_id);
                    assignedAdminId = _.pluck(assignedAdminId, "non_admin_id");
                    let condition;
                    let getNonAdminApproval;
                    if (assignedAdminId.length != 0) {
                        getNonAdminApproval = await Model.getNonAdminApproval(assignedAdminId);
                        getNonAdminApproval = _.pluck(getNonAdminApproval, "auto_accept_time_claim");
                    }
                    else getNonAdminApproval = [];
                    getNonAdminApproval.push(isApprovedOrg);
                    condition = getNonAdminApproval.filter(x => x == "false");
                    if (condition.length == 0) statusAutoApprove  = 1;
        
                    if(!attendanceData) {
                        let previousReq = await Model.getExistingAttendanceRequest(employee_id, organization_id, date);
                        let existingSameRequest = await Model.getExistingSameTimeRequest(employee_id, organization_id, date,);
                        existingSameRequest = existingSameRequest.filter(x => {
                            return moment(attStartTime).isBetween(moment(x.start_time), moment(x.end_time)) || moment(attEndTime).isBetween(moment(x.start_time), moment(x.end_time))
                        })
                        if (existingSameRequest.length !== 0) errorResponse.push({ name: `${employeeDetails.first_name} ${employeeDetails.last_name}`, date: date, start_time: attStartTime, end_time: attEndTime, message: translate(activityRequeat, "37", language)})
                        let mobileTask = await Model.getTaskDetails(start_time, end_time, [employee_id]);
                        let status = false;
                        if(mobileTask.length) {
                            for (const {task_working_status} of mobileTask) {
                                for (const task_working of task_working_status) {
                                    if(status === true) break;
                                    if(!isRequestedTimeOutsideRange(attStartTime, attEndTime, task_working.start_time, task_working.end_time)) {
                                        status = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if(status) {
                            errorResponse.push({ name: `${employeeDetails.first_name} ${employeeDetails.last_name}`, date: date, start_time: attStartTime, end_time: attEndTime, message: translate(activityRequeat, "39", language)})
                            continue;
                        }
                        if(previousReq.length === 0) {
                            let response = await Model.createAttendanceRequest(employee_id, organization_id, date, reason, attStartTime, attEndTime, task_id);
                            // Add Auto Approve Code 
                            if(statusAutoApprove  == 1) await alterAttendanceTimeClaim({decoded: req.decoded}, date, response);
                            successResponse.push({name: `${employeeDetails.first_name} ${employeeDetails.last_name}`, date: date, start_time: attStartTime, end_time: attEndTime, message: "Success"});
                        }
                        else errorResponse.push({ name: `${employeeDetails.first_name} ${employeeDetails.last_name}`, date: date, start_time: attStartTime, end_time: attEndTime, message: translate(activityRequeat, "38", language)})
                    }
                    else{
                        // Must not be in between attendance start and end time
                        let previousReq = await Model.getExistingAttendanceRequest(employee_id, organization_id, date);
                        let existingSameRequest = await Model.getExistingSameTimeRequest(employee_id, organization_id, date,);
                        existingSameRequest = existingSameRequest.filter(x => {
                            return moment(attStartTime).isBetween(moment(x.start_time), moment(x.end_time)) || moment(attEndTime).isBetween(moment(x.start_time), moment(x.end_time))
                        })
                        if (existingSameRequest.length !== 0) errorResponse.push({ name: `${employeeDetails.first_name} ${employeeDetails.last_name}`, date: date, start_time: attStartTime, end_time: attEndTime, message: translate(activityRequeat, "37", language)})
                        let mobileTask = await Model.getTaskDetails(moment(start_time).add('-1', 'day'), moment(end_time).add(1, 'day'), [employee_id]);
                        let status = false;
                        if(mobileTask.length) {
                            for (const {task_working_status} of mobileTask) {
                                for (const task_working of task_working_status) {
                                    if(status === true) break;
                                    if(!isRequestedTimeOutsideRange(attStartTime, attEndTime, task_working.start_time, task_working.end_time)) {
                                        status = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if(status) {
                            errorResponse.push({ name: `${employeeDetails.first_name} ${employeeDetails.last_name}`, date: date, start_time: attStartTime, end_time: attEndTime, message: translate(activityRequeat, "39", language)})
                            continue;
                        }
                        if(previousReq.length === 0) {
                            if (checkTimeInRange(attStartTime, attEndTime, attendanceData.start_time, attendanceData.end_time)) { 
                                // You already active during this duration
                                errorResponse.push({ name: `${employeeDetails.first_name} ${employeeDetails.last_name}`, date: date, start_time: attStartTime, end_time: attEndTime, message: translate(activityRequeat, "36", language)})
                            }
                            else {
                                // Add Auto Approve Code 
                                let response = await Model.createAttendanceRequest(employee_id, organization_id, date, reason, attStartTime, attEndTime, task_id);
                                if(statusAutoApprove  == 1) await alterAttendanceTimeClaim({decoded: req.decoded}, date, response);
                                successResponse.push({name: `${employeeDetails.first_name} ${employeeDetails.last_name}`, date: date, start_time: attStartTime, end_time: attEndTime, message: "Success"});
                            }
                        }
                        else errorResponse.push({ name: `${employeeDetails.first_name} ${employeeDetails.last_name}`, date: date, start_time: attStartTime, end_time: attEndTime, message: translate(activityRequeat, "38", language)})
                    }
                }
            }
            return sendResponse(res, 200, {errorResponse: errorResponse, successResponse}, translate(activityRequeat, "4", language), null);
        }
        catch (err) {
            return sendResponse(res, 400, null, translate(activityRequeat, "27", language), err.message);
        }
    }

    static getTimelineEmployeeWise = async (req, res, next) => {
        let { organization_id, language, productive_hours } = req.decoded;
        try {
            let { employee_id, start_date, end_date } = req.query;
            if (!employee_id || !start_date || !end_date) return sendResponse(res, 400, null, translate(activityRequeat, "4", language), 'Validation Failed');
            let results = [];

            let dates = this.getDatesBetween(start_date, end_date);

            let [deletedTimelineData, timesheetData, attendanceData, taskDetails] = await Promise.all([
                Model.getDeletedTimelineData([+employee_id], organization_id, dates),
                Model.getEmployeeTimesheetByDate([+employee_id], organization_id, dates.map(i => +i.split('-').join('')), productive_hours),
                Model.getEmployeeAttendanceData([+employee_id], organization_id, dates.map(i => +i.split('-').join(''))),
                Model.getMobileTask(moment(start_date).add(-2, 'days').toISOString(), moment(end_date).add(2, 'days').toISOString(), [+employee_id], organization_id)
            ]);

            for (const date of dates) {
                let filteredDeleteTimeline = deletedTimelineData.filter(i => i.date === date).map(i => ({ start_time: i.start_time, end_time: i.end_time }));
                if (filteredDeleteTimeline.length === 0) {
                    let timesheet = timesheetData.find(i => i.date == date);
                    let attendance = attendanceData.find(i => moment(i.date).format('YYYY-MM-DD') == date);
                    if (!attendance) continue;
                    
                    // Handle active attendance: if start_time equals end_time, use current time
                    const isActiveAttendance = moment(attendance.start_time).isSame(moment(attendance.end_time));
                    const effectiveAttendanceEnd = isActiveAttendance ? moment() : moment(attendance.end_time);
                    let totaltime = effectiveAttendanceEnd.diff(moment(attendance.start_time), 'seconds');

                    let mobileUsageDuration = 0;
                    for (const filteredTask of taskDetails) {
                        for (const iterator of filteredTask.task_working_status) {
                            if (!iterator?.start_time || iterator.is_desktop_task) continue;
                            const iteratorStart = moment(iterator.start_time);
                            if (!iteratorStart.isValid()) continue;
                            let iteratorEnd = iterator?.end_time ? moment(iterator.end_time) : moment().utc();
                            if (!iteratorEnd.isValid()) iteratorEnd = moment().utc();
                            if (!iteratorEnd.isAfter(iteratorStart)) continue;
                            const attendanceStart = moment(attendance.start_time);
                            const attendanceEnd = effectiveAttendanceEnd;
                            if (iteratorStart.isBetween(attendanceStart, attendanceEnd) && iteratorEnd.isBetween(attendanceStart, attendanceEnd)) {
                                mobileUsageDuration += iteratorEnd.diff(iteratorStart, 'seconds');
                            }
                            else if (!iteratorStart.isBetween(attendanceStart, attendanceEnd) && iteratorEnd.isBetween(attendanceStart, attendanceEnd)) {
                                mobileUsageDuration += iteratorEnd.diff(attendanceStart, 'seconds');
                            }
                            else if (iteratorStart.isBetween(attendanceStart, attendanceEnd) && !iteratorEnd.isBetween(attendanceStart, attendanceEnd)) {
                                mobileUsageDuration += attendanceEnd.diff(iteratorStart, 'seconds');
                            }
                            else if (iteratorStart.startOf('second').isSame(attendanceStart.startOf('second')) && iteratorEnd.startOf('second').isSame(attendanceEnd.startOf('second'))) {
                                mobileUsageDuration += attendanceEnd.startOf('second').diff(iteratorStart.startOf('second'), 'seconds');
                            }
                        }
                    }
                    let total_duration = moment.duration(timesheet.computer_activities_time, 'seconds').asMilliseconds() + moment.duration(timesheet.idle_duration, 'seconds').asMilliseconds() + moment.duration((totaltime - timesheet.office_time), 'seconds').asMilliseconds();
                    results.push({
                        computer_activities_time: moment.utc(moment.duration(timesheet.computer_activities_time, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                        idle_duration: moment.utc(moment.duration(timesheet.idle_duration, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                        neutral_duration: moment.utc(moment.duration(timesheet.neutral_duration, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                        non_productive_duration: moment.utc(moment.duration(timesheet.non_productive_duration, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                        office_time: moment.utc(moment.duration(timesheet.office_time, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                        productive_duration: moment.utc(moment.duration(timesheet.productive_duration, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                        mobileUsageDuration: moment.utc(moment.duration(mobileUsageDuration, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                        offline_duration: moment.utc(moment.duration((totaltime - timesheet.office_time), 'seconds').asMilliseconds()).format('HH:mm:ss'),
                        total_hours: moment.utc(total_duration).format('HH:mm:ss'),
                        productivity: timesheet.productivity,
                        ...attendance,
                    })
                }
                else {
                    let timelineData = await this.getTimeLineGraphsData(req, employee_id, date);
                    if (!timelineData) continue;
                    let attendance = attendanceData.find(i => moment(i.date).format('YYYY-MM-DD') == date);
                    if (!attendance) continue;
                    let {
                        timezone,
                        offlineEntities,
                        productiveEntities,
                        unProductiveEntities,
                        neturalEntities,
                        idleEntities,
                        breakEntities,
                        offlineTimeClaimEntities,
                        idleTimeClaimEntities,
                        mobileUsageEntities,
                        manualTimeClaim,
                    } = timelineData.data;

                    offlineEntities = offlineEntities.map(i => ({ start_time: i.from, end_time: i.to }));
                    mobileUsageEntities = mobileUsageEntities.map(i => ({ start_time: i.from, end_time: i.to }));
                    manualTimeClaim = manualTimeClaim.map(i => ({ start_time: i.from, end_time: i.to }));
                    let missingInterval = this.findMissingInterval({
                        productiveEntities,
                        unProductiveEntities,
                        neturalEntities,
                        idleEntities,
                        breakEntities,
                        offlineTimeClaimEntities,
                        idleTimeClaimEntities,
                        mobileUsageEntities,
                        manualTimeClaim,
                        offlineEntities
                    })
                    offlineEntities = [...offlineEntities, ...missingInterval.missingTimes];
                    const doesOverlap = (start1, end1, start2, end2) => {
                        const startA = moment(start1);
                        const endA = moment(end1);
                        const startB = moment(start2);
                        const endB = moment(end2);

                        return startA.isBefore(endB) && startB.isBefore(endA);
                    };

                    const splitInterval = (entity, filteredDeleteTimeline) => {
                        let remainingIntervals = [{ ...entity }];

                        filteredDeleteTimeline.forEach(({ start_time: delStart, end_time: delEnd }) => {
                            remainingIntervals = remainingIntervals.flatMap(({ start_time, end_time }) => {
                                const entityStart = moment(start_time);
                                const entityEnd = moment(end_time);
                                const deleteStart = moment(delStart);
                                const deleteEnd = moment(delEnd);

                                if (!doesOverlap(start_time, end_time, delStart, delEnd)) {
                                    return [{ start_time, end_time }];
                                }

                                const intervals = [];

                                if (entityStart.isBefore(deleteStart)) {
                                    intervals.push({
                                        start_time: start_time,
                                        end_time: deleteStart.toISOString(),
                                    });
                                }

                                if (entityEnd.isAfter(deleteEnd)) {
                                    intervals.push({
                                        start_time: deleteEnd.toISOString(),
                                        end_time: end_time,
                                    });
                                }

                                return intervals;
                            });
                        });

                        return remainingIntervals;
                    };

                    const filterEntities = (entities, filteredDeleteTimeline) => {
                        if (!entities) return [];
                        return entities.flatMap((entity) =>
                            splitInterval(entity, filteredDeleteTimeline)
                        );
                    };
                    productiveEntities = filterEntities(productiveEntities, filteredDeleteTimeline);
                    unProductiveEntities = filterEntities(unProductiveEntities, filteredDeleteTimeline);
                    neturalEntities = filterEntities(neturalEntities, filteredDeleteTimeline);
                    idleEntities = filterEntities(idleEntities, filteredDeleteTimeline);
                    breakEntities = filterEntities(breakEntities, filteredDeleteTimeline);
                    offlineTimeClaimEntities = filterEntities(offlineTimeClaimEntities, filteredDeleteTimeline);
                    idleTimeClaimEntities = filterEntities(idleTimeClaimEntities, filteredDeleteTimeline);
                    mobileUsageEntities = filterEntities(mobileUsageEntities, filteredDeleteTimeline);
                    manualTimeClaim = filterEntities(manualTimeClaim, filteredDeleteTimeline);
                    offlineEntities = filterEntities(offlineEntities, filteredDeleteTimeline);
                    const filterOverridesData = ({
                        productive_duration,
                        non_productive_duration,
                        neutral_duration,
                        idle_duration,
                        break_duration,
                        mobileUsageDuration,
                        offline_duration,
                        computer_activities_time,
                        office_time
                    }) => {
                        const filterByAttendance = (durations) => {
                            if (!Array.isArray(durations)) return [];
                            return durations.filter(({ start_time, end_time }) => {
                                if (!start_time || !end_time) return false;
                                const durationStart = moment(start_time);
                                const durationEnd = moment(end_time);
                                return (
                                    ( moment(durationStart).utc().isSame(moment(attendance.start_time).utc()) || moment(durationStart).utc().isSame(moment(attendance.end_time).utc()) || moment(durationStart).utc().isBetween(moment(attendance.start_time).utc(), moment(attendance.end_time).utc())) &&
                                    ( moment(durationEnd).utc().isSame(moment(attendance.start_time).utc()) || moment(durationEnd).utc().isSame(moment(attendance.end_time).utc()) || moment(durationEnd).utc().isBetween(moment(attendance.start_time).utc(), moment(attendance.end_time).utc()))
                                );
                            });
                        };

                        return {
                            productive_duration: filterByAttendance(productive_duration),
                            non_productive_duration: filterByAttendance(non_productive_duration),
                            neutral_duration: filterByAttendance(neutral_duration),
                            idle_duration: filterByAttendance(idle_duration),
                            break_duration: filterByAttendance(break_duration),
                            mobileUsageDuration: filterByAttendance(mobileUsageDuration),
                            offline_duration: filterByAttendance(offline_duration),
                            computer_activities_time: filterByAttendance(computer_activities_time),
                            office_time: filterByAttendance(office_time),
                        };
                    };
                    
                    let totalTimeInterval = this.findTotalTimeofIntervals(filterOverridesData({
                        productive_duration: [...productiveEntities, ...manualTimeClaim, ...mobileUsageEntities],
                        non_productive_duration: unProductiveEntities,
                        neutral_duration: neturalEntities,
                        idle_duration: idleEntities,
                        break_duration: breakEntities,
                        mobileUsageDuration: mobileUsageEntities,
                        offline_duration: offlineEntities,
                        computer_activities_time: [...productiveEntities, ...manualTimeClaim, ...mobileUsageEntities, ...neturalEntities, ...unProductiveEntities],
                        office_time: [...productiveEntities, ...manualTimeClaim, ...mobileUsageEntities, ...neturalEntities, ...unProductiveEntities, ...idleEntities]
                    }))
                    let productivity = 0;
                    if (totalTimeInterval.productive_duration) {
                        productivity = moment.duration(totalTimeInterval.productive_duration).asSeconds() / productive_hours * 100;
                    }
                    const mergedIntervals = mergeOverlappingIntervals(filteredDeleteTimeline);
                    let deleteTime = 0;
                    mergedIntervals.map((interval) => {
                        deleteTime += moment(interval.end_time).diff(moment(interval.start_time), 'seconds');
                    });
                    deleteTime = `${String(moment.duration(deleteTime, 'seconds').hours()).padStart(2, '0')}:${String(moment.duration(deleteTime, 'seconds').minutes()).padStart(2, '0')}:${String(moment.duration(deleteTime, 'seconds').seconds()).padStart(2, '0')}`;
                    let total_duration = moment.duration(totalTimeInterval.computer_activities_time, 'seconds').asMilliseconds() + moment.duration(totalTimeInterval.idle_duration, 'seconds').asMilliseconds() + moment.duration((totalTimeInterval.offline_duration), 'seconds').asMilliseconds();
                    results.push({ ...totalTimeInterval, start_time: attendance.start_time, end_time: attendance.end_time, date, timezone, productivity, deleteTime, total_hours: moment.utc(total_duration).format('HH:mm:ss') });
                }
            }

            return sendResponse(res, 200, results, translate(commonMessages, "1", language), null);
        }
        catch (error) {
            return sendResponse(res, 500, null, translate(activityRequeat, "5", language), error.message);
        }
    }

    static getTimelineHistory = async (req, res, next) => {
        let { organization_id, language, productive_hours, employee_id: nonAdminId, is_admin, is_teamlead, is_manager } = req.decoded;
        try {
            let { start_date, end_date, employee_id, location_id, department_id, search, absent, TotalHour, average, employee_ids } = req.query;
            if (!start_date || !end_date) return sendResponse(res, 400, null, translate(activityRequeat, "4", language), 'Validation Failed');
            
            if(location_id && (location_id === 0 || location_id === "0")) location_id = null;
            if(department_id && (department_id === 0 || department_id === "0")) department_id = null;
            if(employee_id && (employee_id === 0 || employee_id === "0")) employee_id = null;
            if(employee_ids && (employee_ids === 0 || employee_ids === "0")) employee_ids = null;

            let isMultipleEmployeeFilter = false;
            if (employee_ids && employee_id == null) {
                employee_id = employee_ids
                    .split(',')
                    .map(i => i.trim())
                    .filter(i => i !== '')
                    .map(Number);
                if (employee_id.length > 0) {
                    isMultipleEmployeeFilter = true;
                }
            }

            let employees;
            if(is_admin) {
                employees = await Model.getEmployeesFilter({
                    employee_ids: employee_id && !isMultipleEmployeeFilter ? [+employee_id] : isMultipleEmployeeFilter ? employee_id : [],
                    location_id: location_id,
                    department_id: department_id,
                    search: search,
                    organization_id: organization_id
                })
                if (!employees.length) return sendResponse(res, 200, [], translate(commonMessages, "1", language), null);
                employee_id = _.pluck(employees, 'id');
            }
            else {
                employees = await Model.getEmployeesFilter({
                    employee_ids: employee_id && !isMultipleEmployeeFilter ? [+employee_id] : isMultipleEmployeeFilter ? employee_id : [],
                    location_id: location_id,
                    department_id: department_id,
                    search: search,
                    organization_id: organization_id,
                    nonAdminId
                })
                if (!employees.length) return sendResponse(res, 200, [], translate(commonMessages, "1", language), null);
                employee_id = _.pluck(employees, 'id');
            }

            let results = [];

            let dates = this.getDatesBetween(start_date, end_date);

            let [deletedTimelineData, timesheetData, attendanceData, taskDetails, breakRequestAll] = await Promise.all([
                Model.getDeletedTimelineData(employee_id, organization_id, dates),
                Model.getEmployeeTimesheetByDate(employee_id, organization_id, dates.map(i => +i?.split('-')?.join('')), productive_hours),
                Model.getEmployeeAttendanceData(employee_id, organization_id, dates.map(i => +i?.split('-')?.join(''))),
                Model.getMobileTask(moment(start_date).add(-2, 'days').toISOString(), moment(end_date).add(2, 'days').toISOString(), employee_id, organization_id),
                Model.getBreakRequestMultiple({ employee_id: employee_id, date: dates, organization_id })
            ]);

            // Build fast lookup maps to avoid repeated filtering O(N) per loop
            const keyOf = (empId, date) => `${empId}|${date}`;
            const deletedMap = new Map();
            for (const i of deletedTimelineData) {
                const k = keyOf(i.employee_id, i.date);
                const arr = deletedMap.get(k) || [];
                arr.push({ start_time: i.start_time, end_time: i.end_time });
                deletedMap.set(k, arr);
            }
            const timesheetMap = new Map();
            for (const i of timesheetData) timesheetMap.set(keyOf(i.employee_id, i.date), i);
            const attendanceMap = new Map();
            for (const i of attendanceData) attendanceMap.set(keyOf(i.id, moment(i.date).format('YYYY-MM-DD')), i);
            const tasksByEmp = new Map();
            for (const t of taskDetails) {
                const arr = tasksByEmp.get(t.assigned_user) || [];
                arr.push(t);
                tasksByEmp.set(t.assigned_user, arr);
            }
            const breaksMap = new Map();
            for (const b of breakRequestAll) {
                const k = keyOf(b.employee_id, b.date);
                const arr = breaksMap.get(k) || [];
                arr.push(b);
                breaksMap.set(k, arr);
            }

            const attendanceEmployeeIds = _.pluck(attendanceData, 'id');

            const calcMobileUsage = (empId, attendance) => {
                const empTasks = tasksByEmp.get(empId) || [];
                if (!attendance) return 0;
                const attStart = moment(attendance.start_time);
                // Handle active attendance: if start_time equals end_time, use current time
                const isActiveAttendance = moment(attendance.start_time).isSame(moment(attendance.end_time));
                const attEnd = isActiveAttendance ? moment() : moment(attendance.end_time);
                let total = 0;
                for (const task of empTasks) {
                    for (const st of task.task_working_status) {
                        if (!st?.start_time || st.is_desktop_task) continue;
                        const startMoment = moment(st.start_time);
                        if (!startMoment.isValid()) continue;
                        let endMoment = st?.end_time ? moment(st.end_time) : moment().utc();
                        if (!endMoment.isValid()) endMoment = moment().utc();
                        if (!endMoment.isAfter(startMoment)) continue;
                        // overlap seconds between [startMoment,endMoment] and [attStart, attEnd]
                        const start = moment.max(attStart, startMoment);
                        const end = moment.min(attEnd, endMoment);
                        if (end.isAfter(start)) total += end.diff(start, 'seconds');
                    }
                }
                return total;
            };

            for (const date of dates) {
                for (const emp of employees) {
                    if(!attendanceEmployeeIds.includes(emp.id) && absent == "1") {
                        results.push({
                            ...emp,
                            start_time: null,
                            end_time: null,
                            date: date,
                            computer_activities_time: "00:00:00",
                            idle_duration: "00:00:00",
                            neutral_duration: "00:00:00",
                            non_productive_duration: "00:00:00",
                            office_time: "00:00:00",
                            productive_duration: "00:00:00",
                            mobileUsageDuration: "00:00:00",
                            productivity: 0,
                            offline_duration: "00:00:00",
                            total_hours: "00:00:00",
                            absent: true,
                        })
                        continue;
                    }
                    const k = keyOf(emp.id, date);
                    const filteredDeleteTimeline = deletedMap.get(k) || [];
                    if (filteredDeleteTimeline.length === 0) {
                        const timesheet = timesheetMap.get(k);
                        const attendance = attendanceMap.get(k);
                        if (!attendance)  {
                            if(absent == "1") results.push({
                                ...emp,
                                start_time: null,
                                end_time: null,
                                date: date,
                                computer_activities_time: "00:00:00",
                                idle_duration: "00:00:00",
                                neutral_duration: "00:00:00",
                                non_productive_duration: "00:00:00",
                                office_time: "00:00:00",
                                productive_duration: "00:00:00",
                                mobileUsageDuration: "00:00:00",
                                productivity: 0,
                                offline_duration: "00:00:00",
                                total_hours: "00:00:00",
                                absent: true,
                            })
                            continue;
                        };
                        if(!timesheet) continue;
                        // Handle active attendance: if start_time equals end_time, use current time
                        const isActiveAttendance = moment(attendance.start_time).isSame(moment(attendance.end_time));
                        const effectiveAttendanceEnd = isActiveAttendance ? moment() : moment(attendance.end_time);
                        const totaltime = effectiveAttendanceEnd.diff(moment(attendance.start_time), 'seconds');
                        const mobileUsageDuration = calcMobileUsage(emp.id, attendance);
                        let breakReq = breaksMap.get(k) || [];
                        breakReq = breakReq.map(i => i.status == 1);
                        let totalbreakTime = 0;
                        breakReq.map(i => totalbreakTime += i.offline_time);
                        const total_duration = moment.duration(timesheet?.computer_activities_time, 'seconds').asMilliseconds() + moment.duration(timesheet.idle_duration, 'seconds').asMilliseconds() + moment.duration((totaltime - timesheet.office_time), 'seconds').asMilliseconds();
                        results.push({
                            computer_activities_time: moment.utc(moment.duration(timesheet?.computer_activities_time ?? 0, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                            idle_duration: moment.utc(moment.duration(timesheet?.idle_duration ?? 0, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                            neutral_duration: moment.utc(moment.duration(timesheet?.neutral_duration ?? 0, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                            non_productive_duration: moment.utc(moment.duration(timesheet?.non_productive_duration ?? 0, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                            office_time: moment.utc(moment.duration(timesheet?.office_time ?? 0, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                            productive_duration: moment.utc(moment.duration(timesheet?.productive_duration ?? 0, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                            mobileUsageDuration: moment.utc(moment.duration(mobileUsageDuration ?? 0, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                            productivity: timesheet?.productivity ?? 0,
                            offline_duration: moment.utc(moment.duration((totaltime - (timesheet?.office_time ?? 0)), 'seconds').asMilliseconds()).format('HH:mm:ss'),
                            total_hours: moment.utc(total_duration).format('HH:mm:ss'),
                            break_duration: moment.utc(moment.duration(totalbreakTime, 'seconds').asMilliseconds()).format('HH:mm:ss'),
                            absent: false,
                            ...attendance,
                            ...emp
                        })
                    }
                    else {
                        let timelineData = await this.getTimeLineGraphsData(req, emp.id, date);
                        if (!timelineData) {
                            if(absent == "1") results.push({
                                ...emp,
                                start_time: null,
                                end_time: null,
                                date: date,
                                computer_activities_time: "00:00:00",
                                idle_duration: "00:00:00",
                                neutral_duration: "00:00:00",
                                non_productive_duration: "00:00:00",
                                office_time: "00:00:00",
                                productive_duration: "00:00:00",
                                mobileUsageDuration: "00:00:00",
                                productivity: 0,
                                offline_duration: "00:00:00",
                                total_hours: "00:00:00",
                                absent: true,
                            })
                            continue;
                        };
                        let attendance = attendanceData.find(i => moment(i.date).format('YYYY-MM-DD') == date && i.id == emp.id);
                        if (!attendance)  {
                            if(absent == "1") results.push({
                                ...emp,
                                start_time: null,
                                end_time: null,
                                date: date,
                                computer_activities_time: "00:00:00",
                                idle_duration: "00:00:00",
                                neutral_duration: "00:00:00",
                                non_productive_duration: "00:00:00",
                                office_time: "00:00:00",
                                productive_duration: "00:00:00",
                                mobileUsageDuration: "00:00:00",
                                productivity: 0,
                                offline_duration: "00:00:00",
                                total_hours: "00:00:00",
                                absent: true,
                            })
                            continue;
                        };;
                        let {
                            timezone,
                            offlineEntities,
                            productiveEntities,
                            unProductiveEntities,
                            neturalEntities,
                            idleEntities,
                            breakEntities,
                            offlineTimeClaimEntities,
                            idleTimeClaimEntities,
                            mobileUsageEntities,
                            manualTimeClaim,
                        } = timelineData.data;

                        offlineEntities = offlineEntities.map(i => ({ start_time: moment(i.from).utc().toISOString(), end_time: moment(i.to).utc().toISOString() }));
                        mobileUsageEntities = mobileUsageEntities.map(i => ({ start_time: moment(i.from).utc().toISOString(), end_time: moment(i.to).utc().toISOString() }));
                        manualTimeClaim = manualTimeClaim.map(i => ({ start_time: moment(i.from).utc().toISOString(), end_time: moment(i.to).utc().toISOString() }));
                        let missingInterval = this.findMissingInterval({
                            productiveEntities,
                            unProductiveEntities,
                            neturalEntities,
                            idleEntities,
                            breakEntities,
                            offlineTimeClaimEntities,
                            idleTimeClaimEntities,
                            mobileUsageEntities,
                            manualTimeClaim,
                            offlineEntities
                        })
                        offlineEntities = [...offlineEntities, ...missingInterval.missingTimes];
                        const doesOverlap = (start1, end1, start2, end2) => {
                            const startA = moment(start1);
                            const endA = moment(end1);
                            const startB = moment(start2);
                            const endB = moment(end2);

                            return startA.isBefore(endB) && startB.isBefore(endA);
                        };

                        const splitInterval = (entity, filteredDeleteTimeline) => {
                            let remainingIntervals = [{ ...entity }];

                            filteredDeleteTimeline.forEach(({ start_time: delStart, end_time: delEnd }) => {
                                remainingIntervals = remainingIntervals.flatMap(({ start_time, end_time }) => {
                                    const entityStart = moment(start_time);
                                    const entityEnd = moment(end_time);
                                    const deleteStart = moment(delStart);
                                    const deleteEnd = moment(delEnd);

                                    if (!doesOverlap(start_time, end_time, delStart, delEnd)) {
                                        return [{ start_time, end_time }];
                                    }

                                    const intervals = [];

                                    if (entityStart.isBefore(deleteStart)) {
                                        intervals.push({
                                            start_time: start_time,
                                            end_time: deleteStart.toISOString(),
                                        });
                                    }

                                    if (entityEnd.isAfter(deleteEnd)) {
                                        intervals.push({
                                            start_time: deleteEnd.toISOString(),
                                            end_time: end_time,
                                        });
                                    }

                                    return intervals;
                                });
                            });

                            return remainingIntervals;
                        };

                        const filterEntities = (entities, filteredDeleteTimeline) => {
                            if (!entities) return [];
                            return entities.flatMap((entity) =>
                                splitInterval(entity, filteredDeleteTimeline)
                            );
                        };
                        productiveEntities = filterEntities(productiveEntities, filteredDeleteTimeline);
                        unProductiveEntities = filterEntities(unProductiveEntities, filteredDeleteTimeline);
                        neturalEntities = filterEntities(neturalEntities, filteredDeleteTimeline);
                        idleEntities = filterEntities(idleEntities, filteredDeleteTimeline);
                        breakEntities = filterEntities(breakEntities, filteredDeleteTimeline);
                        offlineTimeClaimEntities = filterEntities(offlineTimeClaimEntities, filteredDeleteTimeline);
                        idleTimeClaimEntities = filterEntities(idleTimeClaimEntities, filteredDeleteTimeline);
                        mobileUsageEntities = filterEntities(mobileUsageEntities, filteredDeleteTimeline);
                        manualTimeClaim = filterEntities(manualTimeClaim, filteredDeleteTimeline);
                        offlineEntities = filterEntities(offlineEntities, filteredDeleteTimeline);
                        const filterOverridesData = ({
                            productive_duration,
                            non_productive_duration,
                            neutral_duration,
                            idle_duration,
                            break_duration,
                            mobileUsageDuration,
                            offline_duration,
                            computer_activities_time,
                            office_time
                        }) => {
                            const filterByAttendance = (durations) => {
                                if (!Array.isArray(durations)) return [];
                                return durations.filter(({ start_time, end_time }) => {
                                    if (!start_time || !end_time) return false;
                                    const durationStart = moment(start_time).utc();
                                    const durationEnd = moment(end_time).utc();
                                    return (
                                        ( moment(durationStart).utc().isSame(moment(attendance.start_time).utc()) || moment(durationStart).utc().isSame(moment(attendance.end_time).utc()) || moment(durationStart).utc().isBetween(moment(attendance.start_time).utc(), moment(attendance.end_time).utc())) &&
                                        ( moment(durationEnd).utc().isSame(moment(attendance.start_time).utc()) || moment(durationEnd).utc().isSame(moment(attendance.end_time).utc()) || moment(durationEnd).utc().isBetween(moment(attendance.start_time).utc(), moment(attendance.end_time).utc()))
                                    );
                                });
                            };
    
                            return {
                                productive_duration: filterByAttendance(productive_duration),
                                non_productive_duration: filterByAttendance(non_productive_duration),
                                neutral_duration: filterByAttendance(neutral_duration),
                                idle_duration: filterByAttendance(idle_duration),
                                break_duration: filterByAttendance(break_duration),
                                mobileUsageDuration: filterByAttendance(mobileUsageDuration),
                                offline_duration: filterByAttendance(offline_duration),
                                computer_activities_time: filterByAttendance(computer_activities_time),
                                office_time: filterByAttendance(office_time),
                            };
                        };
                        
                        let totalTimeInterval = this.findTotalTimeofIntervals(filterOverridesData({
                            productive_duration: [...productiveEntities, ...manualTimeClaim, ...mobileUsageEntities],
                            non_productive_duration: unProductiveEntities,
                            neutral_duration: neturalEntities,
                            idle_duration: idleEntities,
                            break_duration: breakEntities,
                            mobileUsageDuration: mobileUsageEntities,
                            offline_duration: offlineEntities,
                            computer_activities_time: [...productiveEntities, ...manualTimeClaim, ...mobileUsageEntities, ...neturalEntities, ...unProductiveEntities],
                            office_time: [...productiveEntities, ...manualTimeClaim, ...mobileUsageEntities, ...neturalEntities, ...unProductiveEntities, ...idleEntities]
                        }))
                        let productivity = 0;
                        if (totalTimeInterval.productive_duration) {
                            productivity = moment.duration(totalTimeInterval.productive_duration).asSeconds() / productive_hours * 100;
                        }
                        const mergedIntervals = mergeOverlappingIntervals(filteredDeleteTimeline);
                        let deleteTime = 0;
                        mergedIntervals.map((interval) => {
                            deleteTime += moment(interval.end_time).diff(moment(interval.start_time), 'seconds');
                        });
                        deleteTime = `${String(moment.duration(deleteTime, 'seconds').hours()).padStart(2, '0')}:${String(moment.duration(deleteTime, 'seconds').minutes()).padStart(2, '0')}:${String(moment.duration(deleteTime, 'seconds').seconds()).padStart(2, '0')}`;
                        let total_duration = moment.duration(totalTimeInterval.computer_activities_time, 'seconds').asMilliseconds() + moment.duration(totalTimeInterval.idle_duration, 'seconds').asMilliseconds() + moment.duration((totalTimeInterval.offline_duration), 'seconds').asMilliseconds();
                        results.push({ ...totalTimeInterval, start_time: attendance.start_time, end_time: attendance.end_time, date, timezone, productivity, ...emp, deleteTime, total_hours: moment.utc(total_duration).format('HH:mm:ss'), absent: false });
                    }
                }
            }
            let presentCount = {};
            let absentCount = {};
            if ((TotalHour && TotalHour == "1") || (average && average == "1")) {
                for (const r of results) {
                    if(!r.absent) presentCount[r.id] = presentCount[r.id] ? presentCount[r.id] + 1 : 1;
                    else absentCount[r.id] = absentCount[r.id] ? absentCount[r.id] + 1 : 1;
                }
                results = combineTimeDataById(results);
                function durationToSeconds(duration) {
                    if(!duration) return 0;
                    const [hours, minutes, seconds] = duration?.split(':')?.map(Number);
                    return (hours * 3600) + (minutes * 60) + seconds;
                }
                results = results.map(i => {
                    i.productivity = (durationToSeconds(i.productive_duration) / i.productivity.count ?? 0 ) / productive_hours * 100;
                    i.presentCount = presentCount[i.id] ?? 0;
                    i.absentCount = absentCount[i.id] ?? 0;
                    return i;
                });
                if(average && average == "1") {
                    function divideDuration(timeStr, divisor) {
                        const moment = require('moment'); // or use as a global if on browser
                        if(!timeStr) return `00:00:00`;
                        // Parse HH:mm:ss into a duration
                        const parts = timeStr?.split(':');
                        if(!parts) return `00:00:00`;
                        const hours = parseInt(parts[0], 10);
                        const minutes = parseInt(parts[1], 10);
                        const seconds = parseInt(parts[2], 10);

                        const originalDuration = moment.duration({
                            hours,
                            minutes,
                            seconds
                        });

                        // Divide the duration
                        const dividedSeconds = originalDuration.asSeconds() / divisor;
                        const dividedDuration = moment.duration(dividedSeconds, 'seconds');

                        // Format to HH:mm:ss
                        const hh = String(Math.floor(dividedDuration.asHours())).padStart(2, '0');
                        const mm = String(dividedDuration.minutes()).padStart(2, '0');
                        const ss = String(Math.floor(dividedDuration.seconds())).padStart(2, '0');

                        return `${hh}:${mm}:${ss}`;
                    }
                    results = results.map(i => {
                        i.computer_activities_time = divideDuration(i.computer_activities_time, presentCount[i.id] ?? 1);
                        i.idle_duration = divideDuration(i.idle_duration, presentCount[i.id] ?? 1);
                        i.neutral_duration = divideDuration(i.neutral_duration, presentCount[i.id] ?? 1);
                        i.non_productive_duration = divideDuration(i.non_productive_duration, presentCount[i.id] ?? 1);
                        i.office_time = divideDuration(i.office_time, presentCount[i.id] ?? 1);
                        i.productive_duration = divideDuration(i.productive_duration, presentCount[i.id] ?? 1);
                        i.mobileUsageDuration = divideDuration(i.mobileUsageDuration, presentCount[i.id] ?? 1);
                        i.offline_duration = divideDuration(i.offline_duration, presentCount[i.id] ?? 1);
                        i.total_hours = divideDuration(i.total_hours, presentCount[i.id] ?? 1);
                        i.break_duration = divideDuration(i.break_duration, presentCount[i.id] ?? 1);
                        i.presentCount = presentCount[i.id] ?? 0;
                        i.absentCount = absentCount[i.id] ?? 0;
                        return i;
                    })
                }
            }
            return sendResponse(res, 200, {results, count: results.length}, translate(commonMessages, "1", language), null);
        }
        catch (error) {
            return sendResponse(res, 500, null, translate(activityRequeat, "4", language), error.message);
        }
    }

    static getTimeLineGraphsData = async (req, employeeId, date) => {
        let { organization_id: organizationId, language } = req.decoded;
        try {
            let [attendance] = await Model.getAttendanceId({ date, employeeId, organizationId });
            if (!attendance) return false;

            const { id: attendanceId, timezone, department_id } = attendance;

            let activities = await Model.getEmployeeActivities({ attendanceId });

            let startTime = moment(date).add(-1, "day").utc().toISOString();
            let endTime = moment(date).add(2, "day").utc().toISOString();
            let mobileTask = await Model.getTaskDetails(startTime, endTime, [+employeeId]);

            let finalActivities = await this.spliceNegativeEntities(activities);
            let { offlineEntities, totalOfflineTime } = await this.getOfflineActivities({ finalActivities })
            let { activeEntities, totalActiveTime } = await this.getActiveActivities({ finalActivities });
            let attendanceTimeClaim = await Model.getAttendanceTimeClaimRequest(startTime, endTime, employeeId, organizationId);
            let manualTimeClaim = []
            attendanceTimeClaim.map(i => {
                manualTimeClaim.push({
                    from: moment(i.start_time),
                    to: moment(i.end_time),
                })
            })
            let {
                totalProductiveTime, totalUnProductiveTime, totalNeturalTime, totalIdleTime, productiveEntities, unProductiveEntities, neturalEntities, idleEntities
            } = await this.getActivityBreakDown({ finalActivities, employeeId, department_id });

            if (!productiveEntities.length && !unProductiveEntities.length && !neturalEntities.length && !idleEntities.length) {
                let mobileUsageEntities = [];
                if (mobileTask.length == 0) return { code: 200, data: { timezone, totalOfflineTime, totalActiveTime, activeEntities, offlineEntities, isNewGraphData: false, mobileUsageEntities, manualTimeClaim }, message: translate(commonMessages, "1", language) };
                for (const { task_working_status } of mobileTask) {
                    for (const task_working_statu of task_working_status) {
                        if (task_working_statu.is_desktop_task) continue;
                        mobileUsageEntities.push({
                            from: task_working_statu.start_time,
                            to: task_working_statu.end_time,
                        })
                    }
                }

                const currentDate = moment.tz(date, timezone);
                const midnightInTimezone = currentDate.clone().startOf('day');
                const midnightInUTC = midnightInTimezone.clone().utc();
                const formattedUTCStart = midnightInUTC.toISOString();
                const formattedUTCEnd = midnightInUTC.clone().add(1, 'day').toISOString();


                let myFinishedData = [];
                for (const mobileEn of mobileUsageEntities) {
                    if ((moment(mobileEn.from).isBetween(moment(formattedUTCStart), moment(formattedUTCEnd)) || moment(mobileEn.from).isSame(moment(formattedUTCStart))) && (moment(mobileEn.to).isBetween(moment(formattedUTCStart), moment(formattedUTCEnd)) || moment(mobileEn.to).isSame(moment(formattedUTCEnd)))) {
                        myFinishedData.push({
                            from: moment(mobileEn.from),
                            to: moment(mobileEn.to),
                        })
                    }
                    else if (moment(formattedUTCStart).isBetween(moment(mobileEn.from), moment(mobileEn.to))) {
                        myFinishedData.push({
                            from: moment(formattedUTCStart),
                            to: moment(mobileEn.to),
                        })
                    }
                    else if (moment(formattedUTCEnd).isBetween(moment(mobileEn.from), moment(mobileEn.to))) {
                        myFinishedData.push({
                            from: moment(mobileEn.from),
                            to: moment(formattedUTCEnd),
                        })
                    }
                }

                let intervals = myFinishedData.map(interval => ({
                    from: moment(interval.from),
                    to: moment(interval.to)
                }));

                intervals = intervals.map(entry => ({
                    from: moment(entry.from),
                    to: moment(entry.to),
                })).sort((a, b) => a.from - b.from);


                const missingIntervals = [];
                for (let i = 0; i < intervals.length - 1; i++) {
                    const currentEnd = intervals[i].to;
                    const nextStart = intervals[i + 1].from;

                    if (currentEnd.isBefore(nextStart)) {
                        missingIntervals.push({
                            from: currentEnd.toISOString(),
                            to: nextStart.toISOString()
                        });
                    }
                }

                if (missingIntervals.length > 0) return { code: 200, data: { timezone, totalOfflineTime, totalActiveTime, activeEntities, offlineEntities: missingIntervals, isNewGraphData: false, mobileUsageEntities: intervals, manualTimeClaim }, message: translate(commonMessages, "1", language) };

                return { code: 200, data: { timezone, totalOfflineTime, totalActiveTime, activeEntities, offlineEntities, isNewGraphData: false, mobileUsageEntities: intervals, manualTimeClaim }, message: translate(commonMessages, "1", language) };
            }

            let previousReqOfflineTime = await Model.getTimeClaimRequestTimesheet({ organization_id: organizationId, attendanceId, employee_id: +employeeId, date: moment(date).format("YYYY-MM-DD"), type: 2 });
            let tempPreviousReqIdleTime = await Model.getIdleTimeClaimRequestTimesheet({ organization_id: organizationId, attendanceId, employee_id: +employeeId, date: moment(date).format("YYYY-MM-DD"), type: 1 });
            let previousBreakTime = await Model.getPreviousReqBreakTime({ organizationId, employee_id: +employeeId, date: moment(date).format("YYYY-MM-DD"), type: 2, isGetOfflineBreakdown: true });
            let temp = [], previousReqIdleTime = { result: [] };

            tempPreviousReqIdleTime.map(({ result }) => {
                previousReqIdleTime.result.push(...result)
            })
            previousReqIdleTime?.result?.map(({ idleData }) => {
                temp.push(...idleData)
            });
            temp.sort(function (a, b) {
                return moment(a.start_time).diff(moment(b.start_time));
            });
            temp = this.myFunc(temp);
            let { offlineEntitiesD, idleEntitiesD } = this.filterEntities({ offlineEntities, idleEntities, previousReqOfflineTime, previousReqIdleTime: temp, previousBreakTime });
            let { mobileUsageEntities, offlineEntitiesDN } = this.filterMobileAppUsageTask(offlineEntitiesD, mobileTask);
            let breakData = [];

            return {
                code: 200,
                data: {
                    timezone,
                    totalOfflineTime,
                    totalActiveTime,
                    activeEntities,
                    offlineEntities: offlineEntitiesDN,
                    totalProductiveTime,
                    isNewGraphData: true,
                    totalUnProductiveTime,
                    totalNeturalTime,
                    totalIdleTime,
                    productiveEntities,
                    unProductiveEntities,
                    neturalEntities,
                    idleEntities: idleEntitiesD,
                    breakEntities: previousBreakTime,
                    offlineTimeClaimEntities: previousReqOfflineTime,
                    idleTimeClaimEntities: temp,
                    mobileUsageEntities: mobileUsageEntities,
                    manualTimeClaim,
                    breakTime: breakData
                },
                message: translate(commonMessages, "1", language)
            }
        }
        catch (err) {
            return false;
        }
    }

    static findMissingInterval = (data) => {
        const allIntervals = Object.values(data).flat();
        allIntervals.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

        let missingTimes = [];
        for (let i = 0; i < allIntervals.length - 1; i++) {
            if(allIntervals[i] && allIntervals[i + 1]) {
                const currentEnd = new Date(allIntervals[i]?.end_time);
                const nextStart = new Date(allIntervals[i + 1]?.start_time);
                if (currentEnd < nextStart) {
                    missingTimes.push({
                        start_time: currentEnd.toISOString(),
                        end_time: nextStart.toISOString(),
                    });
                }
            }
        }

        const minTime = allIntervals[0]?.start_time || null;
        const maxTime = allIntervals[allIntervals.length - 1]?.end_time || null;

        return {
            missingTimes,
            minTime,
            maxTime,
        }
    }

    static findTotalTimeofIntervals = (data) => {

        const calculateTotalTime = (intervals) => {
            return intervals.reduce((total, interval) => {
                const start = new Date(interval.start_time);
                const end = new Date(interval.end_time);
                const duration = end - start;
                return total + duration;
            }, 0);
        };


        const totalTimes = {};
        for (const [key, value] of Object.entries(data)) {
            totalTimes[`${key}`] = calculateTotalTime(value);
        }


        const formattedDurations = {};
        for (const key in totalTimes) {
            const durationInSeconds = Math.floor(totalTimes[key] / 1000);
            const duration = moment.duration(durationInSeconds, 'seconds');

            const hours = String(duration.hours()).padStart(2, '0');
            const minutes = String(duration.minutes()).padStart(2, '0');
            const seconds = String(duration.seconds()).padStart(2, '0');

            formattedDurations[key] = `${hours}:${minutes}:${seconds}`;
        }

        return formattedDurations;
    };

    static getDatesBetween = (startDate, endDate) => {
        const dates = [];
        let currentDate = moment(startDate);

        while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
            dates.push(currentDate.format('YYYY-MM-DD'));
            currentDate.add(1, 'days');
        }

        return dates;
    }

    static deleteTimeline = async (req, res, next) => {
        let { language, organization_id, user_id, is_admin } = req.decoded;

        try {
            let { date, start_time, end_time, employee_id } = req.query;
            let [employee_detail] = await Model.getEmployeeDetails({ organizationId: organization_id, employee_ids: employee_id, date });
            if (!employee_detail) return sendResponse(res, 400, null, translate(activityRequeat, "15", language), null);

            start_time = moment.tz(`${date} ${start_time}`, "YYYY-MM-DD HH:mm", employee_detail.timezone);
            end_time = moment.tz(`${date} ${end_time}`, "YYYY-MM-DD HH:mm", employee_detail.timezone);

            if (end_time.isBefore(start_time)) {
                end_time = end_time.add(1, 'day');
            }

            start_time = start_time.utc().toISOString();
            end_time = end_time.utc().toISOString();

            let requestData = {
                employee_id: employee_id,
                organization_id: organization_id,
                start_time,
                end_time,
                date,
                is_admin,
                user_id
            }

            await Model.saveTimelineDeleteRequest(requestData);

            return sendResponse(res, 200, null, translate(commonMessages, "1", language), null);
        }
        catch (error) {
            return sendResponse(res, 500, null, translate(activityRequeat, "5", language), error.message);
        }
    }

    static getDeleteTimelineHistory = async (req, res) => {
        let { language, organization_id } = req.decoded;
        try {
            let { startDate, endDate, employeeId } = req.query;

            let [employeeDetail] = await Model.getEmployeeTimezone(employeeId, organization_id);
            if (!employeeDetail) return sendResponse(res, 404, null, translate(userMessages, "10", language), null);

            let dates = this.getDatesBetween(startDate, endDate);
            let deletedTimelineData = await Model.getDeletedTimelineData([+employeeId], organization_id, dates);

            return sendResponse(res, 200, { deletedTimelineData, employeeDetail }, translate(commonMessages, "1", language), null);
        }
        catch (error) {
            return sendResponse(res, 500, null, translate(activityRequeat, "5", language), error.message);
        }
    }
}

module.exports.Controller = Controller;

function checkTimeInRange(userStartTime, userEndTime, attendanceStartTime, attendanceEndTime) {
    const userStart = moment(userStartTime, 'HH:mm');
    const userEnd = moment(userEndTime, 'HH:mm');
    const attendanceStart = moment(attendanceStartTime, 'HH:mm');
    const attendanceEnd = moment(attendanceEndTime, 'HH:mm');
    if(attendanceStart.isBetween(userStart, userEnd) || attendanceEnd.isBetween(userStart, userEnd)) {
        return true;
    }
    if (userStart.isBetween(attendanceStart, attendanceEnd) || userEnd.isBetween(attendanceStart, attendanceEnd)) {
        return true;
    } else {
        return false;
    }
}

const multiClaimIdle = async function ({ ids, language, user_id }) {
    const failedArr = [], successArr = [];
    await Promise.allSettled(ids.map(async id => {
        const request = await Model.getRequestById({ id, type: 1 });
        if (!request) {
            failedArr.push({ id, message: translate(activityRequeat, "13", language) });
            return;
        };

        if (+request.status !== 0) {
            failedArr.push({ id, message: translate(activityRequeat, "22", language) });
            return;
        }

        const { start_time: startTime, end_time: endTime, date, attendance_id, activities, employee_id, organization_id } = request;
        const [attendance] = await Model.getAttendance({ date, employeeId: employee_id, organizationId: organization_id })
        if (!attendance) {
            failedArr.push({ id, message: translate(activityRequeat, "15", language) });
            return;
        };

        let activityIds = _.pluck(activities, "activity_id");
        if (activityIds.length == 0) {
            failedArr.push({ id, message: translate(activityRequeat, "13", language) });
            return;
        };

        const employeeActivities = await Model.getEmployeeActivity({ attendanceId: attendance_id, activityIds });
        if (employeeActivities.length === 0) {
            failedArr.push({ id, message: translate(activityRequeat, "16", language) });
            return;
        };

        const prReport = await Model.getEmployeeProductivity({ date, employeeId: employee_id });
        if (!prReport) {
            failedArr.push({ id, message: translate(activityRequeat, "16", language) });
            return;
        };

        const newActivities = [];
        for (const activity of employeeActivities) {
            if (activity.total_duration == activity.active_seconds) continue;
            const idle = activity.total_duration - activity.active_seconds;
            activity.active_seconds += idle;
            /**Get apllication status */
            const status = await Model.findApplicationProductivityStatus({ applicationId: activity.domain_id ? activity.domain_id : activity.application_id, departmentId: attendance.department_id });
            prReport.idle_duration -= idle;
            prReport['productive_duration'] += status == 1 ? idle : 0;
            prReport['non_productive_duration'] += status == 2 ? idle : 0;
            prReport['neutral_duration'] += status == 0 ? idle : 0;

            const oldtaskIndex = prReport.tasks.findIndex(task => prReport.tasks[0].task_id === activity.task_id);
            if (oldtaskIndex >= 0) {
                prReport.tasks[oldtaskIndex].pro += status == 1 ? idle : 0;
                prReport.tasks[oldtaskIndex].non += status == 2 ? idle : 0;
                prReport.tasks[oldtaskIndex].neu += status == 0 ? idle : 0;
                prReport.tasks[oldtaskIndex].idle -= idle;

                // Tasks
                prReport.tasks[0].applications.forEach((app, i) => {
                    const appIndex = prReport.tasks[oldtaskIndex].applications.findIndex(x => x.application_id.toString() === activity.application_id.toString())

                    if (appIndex >= 0) {
                        prReport.tasks[oldtaskIndex].applications[appIndex].pro += status == 1 ? idle : 0;
                        prReport.tasks[oldtaskIndex].applications[appIndex].non += status == 2 ? idle : 0;
                        prReport.tasks[oldtaskIndex].applications[appIndex].neu += status == 0 ? idle : 0;
                        prReport.tasks[oldtaskIndex].applications[appIndex].idle -= idle;
                    }
                });
            }

            // Apps
            prReport.applications.forEach((app, i) => {
                const oldAppIndex = prReport.applications.findIndex(app => prReport.applications[i].application_id.toString() === activity.application_id.toString());
                if (oldAppIndex >= 0) {
                    prReport.applications[oldAppIndex].pro += status == 1 ? idle : 0;
                    prReport.applications[oldAppIndex].non += status == 2 ? idle : 0;
                    prReport.applications[oldAppIndex].neu += status == 0 ? idle : 0;
                    prReport.applications[oldAppIndex].idle -= idle;
                    const oldTaskIndex = prReport.applications[oldAppIndex].tasks.findIndex(x => x.task_id.toString() === activity.task_id.toString());
                    if (oldTaskIndex >= 0) {
                        prReport.applications[oldAppIndex].tasks[oldTaskIndex].pro += status == 1 ? idle : 0;
                        prReport.applications[oldAppIndex].tasks[oldTaskIndex].non += status == 2 ? idle : 0;
                        prReport.applications[oldAppIndex].tasks[oldTaskIndex].neu += status == 0 ? idle : 0;
                        prReport.applications[oldAppIndex].tasks[oldTaskIndex].idle -= idle;
                    }
                }
            })
            newActivities.push(activity);
        }

        if (newActivities.length === 0) {
            failedArr.push({ id, message: translate(activityRequeat, "17", language) });
            return;
        };

        Promise.all(
            newActivities.map(async (activity) => {
                await activity.save();
            })
        );
        await prReport.save();
        request.status = 1;
        request.approved_by = user_id;

        successArr.push(id);
        await request.save();
    }));
    return { successArr, failedArr };
}

const multiClaimOffline = async function ({ ids, language, user_id, reason }) {
    const failedArr = [], successArr = [];
    for (let id of ids) {
        try {
            const request = await Model.getRequestById({ id, type: 2 });
            if (!request) {
                failedArr.push({ id, message: translate(activityRequeat, "13", language) });
                return;
            };

            if (+request.status !== 0) {
                failedArr.push({ id, message: translate(activityRequeat, "22", language) });
                return;
            }

            let { employee_id, date } = request;
            date = moment(date).format('YYYY-MM-DD');
            const prReport = await Model.getEmployeeProductivity({ date, employeeId: employee_id });
            if (!prReport) {
                failedArr.push({ id, message: translate(activityRequeat, "16", language) });
                return;
            };
            
            prReport.offline_time += request.offline_time;
            await prReport.save();
            request.status = 1;
            request.approved_by = user_id;
            if (reason) request.reason = reason;
            await request.save();
            successArr.push(id);
        } catch (error) {
            Logger.error(`---multiClaimOffline---${error}`);
        }
    }
    return { successArr, failedArr };
}

const multiClaimBreak = async function ({ ids, language, user_id, reason, organization_id }) {
    const failedArr = [], successArr = [];
    for (let id of ids) {
        try {
            const request = await Model.getBreakRequestById({ _id: id, organization_id });
            if (!request) {
                failedArr.push({ id, message: translate(activityRequeat, "24", language) });
                return;
            };

            if (+request.status !== 0) {
                failedArr.push({ id, message: translate(activityRequeat, "22", language) });
                return;
            }

            let { employee_id, date } = request;
            date = moment(date).format('YYYY-MM-DD');
            const prReport = await Model.getEmployeeProductivity({ date, employeeId: employee_id });
            if (!prReport) {
                failedArr.push({ id, message: translate(activityRequeat, "16", language) });
                return;
            };
            prReport.offline_time += request.offline_time;
            await prReport.save();
            request.status = 1;
            request.approved_by = user_id;
            if (reason) request.reason = reason;
            await request.save();
            successArr.push(id);
        } catch (error) {
            Logger.error(`---multiClaimBreak---${error}`);
        }
    }

    return { successArr, failedArr };
}

const multiDeclineIdle = async function ({ ids, language, user_id, reason, organization_id }) {
    const successArr = [], failedArr = [];
    await Promise.allSettled(ids.map(async id => {
        try {
            const activity_ids = [];
            const request = await Model.getRequestById({ id, type: 1 });
            if (!request) {
                failedArr.push({ id, message: translate(activityRequeat, "13", language) });
                return;
            };

            if (+request.status !== 0) {
                failedArr.push({ id, message: translate(activityRequeat, "22", language) });
                return;
            }

            let employeeActivities;
            request.activities.map((item) => {
                activity_ids.push(`${item.activity_id}`);
            });
            if (activity_ids.length > 0) {
                employeeActivities = await Model.getEmployeeActivityByIds(activity_ids);
                if (!employeeActivities.length) { 
                    failedArr.push({ id, message: translate(activityRequeat, "13", language) });
                    return;
                } 
            }
            await Model.update({ status: 2, approved_by: user_id, id, activities: employeeActivities, organization_id });
            successArr.push(id);
        } catch (error) {
            Logger.error(`---multiDeclineIdle---${error}`);
        }
    }));
    return { successArr, failedArr };
}

const multiDeclineOffline = async function ({ ids, language, user_id, reason, organization_id }) {
    const successArr = [], failedArr = [];
    await Promise.allSettled(ids.map(async id => {
        try {
            const request = await Model.getRequestById({ id, type: 2 });
            if (!request) {
                failedArr.push({ id, message: translate(activityRequeat, "13", language) });
                return;
            };

            if (+request.status !== 0) {
                failedArr.push({ id, message: translate(activityRequeat, "22", language) });
                return;
            }
            let updateData = await Model.update({ reason, status: 2, approved_by: user_id, id, organization_id });
            if (updateData) successArr.push(id);
            else failedArr.push({ id, message: translate(activityRequeat, "19", language) });
        } catch (error) {
            Logger.error(`---multiDeclineOffline---${error}`);
        }
    }));
    return { successArr, failedArr };
}

const multiDeclineBreak = async function ({ ids, language, user_id, reason, organization_id }) {
    const successArr = [], failedArr = [];
    await Promise.allSettled(ids.map(async id => {
        try {
            const request = await Model.getBreakRequestById({ _id: id, organization_id });
            if (!request) {
                failedArr.push({ id, message: translate(activityRequeat, "13", language) });
                return;
            };

            if (+request.status !== 0) {
                failedArr.push({ id, message: translate(activityRequeat, "22", language) });
                return;
            }
            let updateData = await Model.declineBreak({ reason, status: 2, approved_by: user_id, id });
            if (updateData) successArr.push(id)
            else failedArr.push({ id, message: translate(activityRequeat, "19", language) });
        } catch (error) {
            Logger.error(`---multiDeclineBreak---${error}`);
        }
    }));
    return { successArr, failedArr };
}

const updateOldTimeClaimStatus = async (user_id, organization_id, req) => {
    let isApprovedOrg = await Model.isApprovedOrg(organization_id);
    isApprovedOrg = isApprovedOrg[0].auto_accept_time_claim;

    let pendingList = await Model.pendingTimeClaimRequest(organization_id);
    let pendingListBreak = await Model.pendingBreakTimeClaimRequest(organization_id);
    pendingList = [...pendingList, ...pendingListBreak];
    pendingList.map(async (item) => {
        let assignedAdminId = await Model.getAssignedAdminId(null, item.employee_id);
        assignedAdminId = _.pluck(assignedAdminId, "non_admin_id");
        let condition = [];
        let getNonAdminApproval;
        if (assignedAdminId.length != 0) {
            getNonAdminApproval = await Model.getNonAdminApproval(assignedAdminId);
            getNonAdminApproval = _.pluck(getNonAdminApproval, "auto_accept_time_claim");
        }
        else getNonAdminApproval = [];
        getNonAdminApproval.push(isApprovedOrg);
        condition = getNonAdminApproval.filter(x => x == "false");
        if (condition.length == 0) {
            let request = item?.type ?
                await Model.getRequestById({ id: item._id, employee_id: item.employee_id }) :
                await Model.getBreakRequestById({ _id: item._id, organization_id: item.organization_id });
            try {
                if (item.type == 2 || !item?.type) alterOfflineActivityTimeClaim({ req: { decoded: req.decoded, body: { reason: item.reason } }, res: null, request, offlineTime: item.offline_time });  // type 2 for offline time claim request
                if (item.type == 1) alterActivityTC({ decoded: req.decoded, body: { reason: item.reason } }, null, request,); // type 1 for ideal time claim request
                if (item.type == 3) alterAttendanceTimeClaim({ decoded: req.decoded, body: { reason: item.reason } }, null, request,); // type 3 for ideal time claim request
            }
            catch (error) {
                console.log(error);
            }
        }
    })
}


const alterActivityTC = async (req, res, request) => {
    const { organization_id, permissionData = [], is_admin, user_id, language, first_name, last_name } = req.decoded;

    try {
        const { employee_id, start_time: startTime, end_time: endTime, date, attendance_id, activities } = request;

        const [attendance] = await Model.getAttendance({ date, employeeId: employee_id, organizationId: organization_id })
        if (!attendance) {
            if (res != null) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "15", language),
                error: "Attendance not found."
            });
            else return false;
        }

        let activityIds = _.pluck(activities, "activity_id");
        if (activityIds.length == 0) {
            if (res != null) return res.json({ code: 400, data: null, message: "activity not found,", error: null });
            else return false;
        }

        /**Get employee activities based start and end time */
        const employeeActivities = await Model.getEmployeeActivity({ attendanceId: attendance_id, activityIds });
        if (employeeActivities.length === 0) {
            if (res != null) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "16", language),
                error: "Activity not found."
            });
            else return false;
        }

        /**Get employee productivity report */
        const prReport = await Model.getEmployeeProductivity({ date, employeeId: employee_id });
        if (!prReport) {
            if (res != null) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "16", language),
                error: "Activity not found."
            });
            else return false;
        }

        const newActivities = [];
        /**Process employee activities idle to active */
        for (const activity of employeeActivities) {
            if (activity.total_duration == activity.active_seconds) continue;
            const idle = activity.total_duration - activity.active_seconds;
            activity.active_seconds += idle;
            /**Get apllication status */
            const status = await Model.findApplicationProductivityStatus({ applicationId: activity.domain_id ? activity.domain_id : activity.application_id, departmentId: attendance.department_id });
            prReport.idle_duration -= idle;
            prReport['productive_duration'] += status == 1 ? idle : 0;
            prReport['non_productive_duration'] += status == 2 ? idle : 0;
            prReport['neutral_duration'] += status == 0 ? idle : 0;

            const oldtaskIndex = prReport.tasks.findIndex(task => prReport.tasks[0].task_id === activity.task_id);
            if (oldtaskIndex >= 0) {
                prReport.tasks[oldtaskIndex].pro += status == 1 ? idle : 0;
                prReport.tasks[oldtaskIndex].non += status == 2 ? idle : 0;
                prReport.tasks[oldtaskIndex].neu += status == 0 ? idle : 0;
                prReport.tasks[oldtaskIndex].idle -= idle;

                // Tasks
                prReport.tasks[0].applications.forEach((app, i) => {
                    const appIndex = prReport.tasks[oldtaskIndex].applications.findIndex(x => x.application_id.toString() === activity.application_id.toString())

                    if (appIndex >= 0) {
                        prReport.tasks[oldtaskIndex].applications[appIndex].pro += status == 1 ? idle : 0;
                        prReport.tasks[oldtaskIndex].applications[appIndex].non += status == 2 ? idle : 0;
                        prReport.tasks[oldtaskIndex].applications[appIndex].neu += status == 0 ? idle : 0;
                        prReport.tasks[oldtaskIndex].applications[appIndex].idle -= idle;
                    }
                });
            }

            // Apps
            prReport.applications.forEach((app, i) => {
                const oldAppIndex = prReport.applications.findIndex(app => prReport.applications[i].application_id.toString() === activity.application_id.toString());
                if (oldAppIndex >= 0) {
                    prReport.applications[oldAppIndex].pro += status == 1 ? idle : 0;
                    prReport.applications[oldAppIndex].non += status == 2 ? idle : 0;
                    prReport.applications[oldAppIndex].neu += status == 0 ? idle : 0;
                    prReport.applications[oldAppIndex].idle -= idle;
                    const oldTaskIndex = prReport.applications[oldAppIndex].tasks.findIndex(x => x.task_id.toString() === activity.task_id.toString());
                    if (oldTaskIndex >= 0) {
                        prReport.applications[oldAppIndex].tasks[oldTaskIndex].pro += status == 1 ? idle : 0;
                        prReport.applications[oldAppIndex].tasks[oldTaskIndex].non += status == 2 ? idle : 0;
                        prReport.applications[oldAppIndex].tasks[oldTaskIndex].neu += status == 0 ? idle : 0;
                        prReport.applications[oldAppIndex].tasks[oldTaskIndex].idle -= idle;
                    }
                }
            })
            newActivities.push(activity);
        }

        if (newActivities.length === 0) {
            if (res != null) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "17", language),
                error: "Activity not found."
            });
            else return false;
        }
        Promise.all(
            newActivities.map(async (activity) => {
                await activity.save();
            })
        );
        await prReport.save();
        request.status = 1;
        if (req.body.reason) request.reason = req.body.reason;

        return await request.save();
    } catch (err) {
        Logger.error(`----error-----${err}------${__filename}----`);
        if (res != null) return res.json({
            code: 400,
            data: null,
            message: translate(activityRequeat, "5", language),
            error: err
        });
        else return false;
    }
}


const alterOfflineActivityTimeClaim = async ({ req, res, request, offlineTime, request_type = 0 }) => {
    const { organization_id, permissionData = [], is_admin, user_id, language, first_name, last_name } = req.decoded;
    try {
        let { employee_id, date, attendance_id } = request;
        date = moment(date).format('YYYY-MM-DD');
        const prReport = await Model.getEmployeeProductivity({ date, employeeId: employee_id });
        if (!prReport) {
            if (res != null) return res.json({
                code: 400,
                data: null,
                message: translate(activityRequeat, "16", language),
                error: "Activity not found."
            });
            else return false;
        }

        if (configFile.TIME_CLAIM_UPDATE_OFFICE_TIME_SEGRGATION.includes(organization_id)) {
            let [resp] = await Model.checkIfApplicationExist(organization_id);
            const [attendanceData] = await Model.getAttendance({ date, employeeId: employee_id, organizationId: organization_id });
            if (!resp) resp = await Model.createApplicationTimeClaim(organization_id);

            await Model.addEmployeeActivities({
                employee_id,
                organization_id,
                attendance_id: attendanceData.id,
                title: "Time Claim",
                task_id: 0,
                project_id: 0,
                start_time: request.start_time,
                end_time: request.end_time,
                application_id: resp.application_id,
                total_duration: moment(request.end_time).diff(moment(request.start_time), 'seconds'),
                active_seconds: moment(request.end_time).diff(moment(request.start_time), 'seconds'),
                keystrokes_count: 0,
                mouseclicks_count: 0,
                mousemovement_count: 0,
                keystrokes: "",
                idleData: [],
                activeData: [{
                    start_time: request.start_time,
                    end_time: request.end_time,
                }],
                application_id: resp._id,
            });
            if (request_type == 0) {
                prReport.productive_duration = prReport.productive_duration + offlineTime;
                await prReport.save();
            }
            else if (request_type == 1) {
                prReport.non_productive_duration = prReport.non_productive_duration + offlineTime;
                await prReport.save();
            }
            else if (request_type == 2) {
                prReport.neutral_duration = prReport.neutral_duration + offlineTime;
                await prReport.save();
            }
            request.status = 1;
            request.approved_by = user_id;
            if (req.body.reason) request.reason = req.body.reason;
            return request.save();
        }
        else {
            prReport.offline_time = prReport.offline_time + offlineTime;
            await prReport.save();
            request.status = 1;
            request.approved_by = user_id;
            if (req.body.reason) request.reason = req.body.reason;
            return request.save();
        }
    } catch (err) {
        if (res != null) return res.json({
            code: 400,
            data: null,
            message: translate(activityRequeat, "5", language),
            error: err
        });
        else return false;
    }
}

const alterAttendanceTimeClaim = async ({ decoded, }, date, request) => {
    let { organization_id } = decoded;
    if(!date) date = request.date;
    if(request?.task_id) {
        updateTaskAttendanceClaim(request);
    }
    try {
        let [attendanceData] = await Model.getAttendanceByDate(moment(request.date).format('YYYY-MM-DD'), request?.employee_id);
        // TODO: Get type from body and during acceptance process add to data
        // 1. Productive
        // 2. Unproductive
        // 3. Neutral
        // 4. Idle

        let [timeClaimApplication] = await Model.checkIfApplicationExist(organization_id);
        let application_id = timeClaimApplication?._id;
        if(!timeClaimApplication) {
            let response = await Model.createApplicationTimeClaim(organization_id);
            let org_dep_app_web = await Model.createOrganizationDeptAppWeb(response._id);
            application_id = response._id;
        }
        let durationSecond = moment(request.end_time).diff(moment(request.start_time), 'seconds')
        let [employeeDetails] = await Model.getEmployeeLocationDepartment(request.employee_id);

        if(attendanceData) {
            let diff = moment(request.start_time).diff(attendanceData.start_time);
            if (diff < 0) {
                if (!moment(moment(request.start_time).toISOString()).isAfter(attendanceData.start_time)) {
                    let existingPrReport = await Model.updateEmployeeProductivityReport(application_id, organization_id, request.employee_id, durationSecond, employeeDetails.department_id, employeeDetails.location_id, date);
                    existingPrReport.logged_duration = existingPrReport.logged_duration + durationSecond;
                    existingPrReport.productive_duration = existingPrReport.productive_duration + durationSecond;
                    existingPrReport.applications.push(
                        {
                            "pro": durationSecond,
                            "non": 0,
                            "neu": 0,
                            "idle": 0,
                            "total": durationSecond,
                            "application_type": 1,
                            "tasks": [
                                {
                                    "pro": durationSecond,
                                    "non": 0,
                                    "neu": 0,
                                    "idle": 0,
                                    "total": durationSecond,
                                    "task_id": 0
                                }
                            ],
                            "application_id": application_id
                        }
                    )
                    existingPrReport.save();
                    await Model.updateEmployeeAttendance(moment(request.date).format('YYYY-MM-DD'), request.employee_id, moment(request.start_time).toISOString());
                }
            }
            else {
                if (moment(moment(request.end_time).toISOString()).isAfter(attendanceData.end_time)) {
                    let existingPrReport = await Model.updateEmployeeProductivityReport(application_id, organization_id, request.employee_id, durationSecond, employeeDetails.department_id, employeeDetails.location_id, date);
                    existingPrReport.logged_duration = existingPrReport.logged_duration + durationSecond;
                    existingPrReport.productive_duration = existingPrReport.productive_duration + durationSecond;
                    existingPrReport.applications.push(
                        {
                            "pro": durationSecond,
                            "non": 0,
                            "neu": 0,
                            "idle": 0,
                            "total": durationSecond,
                            "application_type": 1,
                            "tasks": [
                                {
                                    "pro": durationSecond,
                                    "non": 0,
                                    "neu": 0,
                                    "idle": 0,
                                    "total": durationSecond,
                                    "task_id": 0
                                }
                            ],
                            "application_id": application_id
                        }
                    )
                    existingPrReport.save();
                    await Model.updateEmployeeAttendance(moment(request.date).format('YYYY-MM-DD'), request.employee_id, null, moment(request.end_time).toISOString());
                }
            }
        }
        else {
            await Model.insertEmployeeAttendance(request.date, request.start_time, request.end_time, request.employee_id, organization_id);
            await Model.createEmployeeProductivityReport(application_id, organization_id, request.employee_id, durationSecond, employeeDetails.department_id, employeeDetails.location_id, date);
        }
        request.status = 1;
        request.approved_by = '';
        await request.save();
        updateTeleworks(organization_id, request.employee_id, request.date);
    }
    catch (err) {
        console.log(` ==========${err}============ `);
    }
}



const hourToSeconds = (hours) => {
    const data = hours.split(":");
    return ((+data[0] * 3600) + (+data[1] * 60));
}


const updateTeleworks = async (organization_id, employee_id, date) => {
    try {
        let orgProductiveHours = 0;
        let orgSettings = await Model.getOrganizationSettings(organization_id);
        
        let [silahDetails] = await Model.getSilahDetails(configFile.SILAH_CUSTOM_MAIL_TEMPLATE.split(','));

        if (orgSettings.length !== 0) {
            let setting = JSON.parse(orgSettings[0].rules);
            orgProductiveHours = setting.productiveHours ? (setting.productiveHours.mode == 'unlimited' ? 0 : hourToSeconds(setting.productiveHours.hour)) : 0;
        }

        let [employeeDetail] = await Model.getEmployeeDetail(employee_id);
        let [employeePrReport] = await Model.getEmployeeProductivityReportByDate(organization_id, employee_id, date, orgProductiveHours);
        let organizationTeleworkReport = await Model.getTeleworkReportData(organization_id, date);
        if(organizationTeleworkReport?.employeesDetails?.filter(i => i.email == employeeDetail.email)) {
            for (const item of organizationTeleworkReport.employeesDetails) {
                if(item.email !== employeeDetail.email) continue;
                item.ActivityLevel = `${Math.round(employeePrReport.productivity * 100) / 100} %`;
                item.TotalWorkTime = `${employeePrReport.productive_duration/60} min`;

                let temp = {
                    IdNumber: item.IdNumber,
                    EstLaborOfficeId: item.EstLaborOfficeId,
                    EstSequenceNumber: item.EstSequenceNumber,
                    manager_email: item.manager_email,
                    email: item.email,
                    ActivityLevel: item.ActivityLevel,
                    TotalWorkTime: item.TotalWorkTime,
                    AssignedTasks: item.AssignedTasks,
                    CompletedTasks: item.CompletedTasks,
                    LoginCount: 1,
                    LogoutCount: 0,
                };


                const axios = require('axios');
                const data = JSON.stringify([temp]);

                const config = {
                    method: 'post',
                    // maxBodyLength: Infinity,
                    url: 'https://teleworks.sa/sp-reports.php',
                    headers: {
                        'Sp-Token': silahDetails.spToken,
                        'Est-Labor-Office-Id': silahDetails.labourOfficeId,
                        'Est-Sequence-Number': silahDetails.sequenceNumber,
                        'Content-Type': 'application/json'
                    },
                    data: data
                };

                axios(config)
                    .then(async function (response) {
                        if (response.data.success) {
                            item.api_response = response.data;
                            item.type = 'success';
                        }
                    })
                    .catch(async function (error) {

                    });
            }
            organizationTeleworkReport.save();
        }
    }
    catch (err) {
        console.log(` =====teleworksreportsubmit=====${err}============ `);
    }
}


function getAllDatesBetween(startDate, endDate) {
    const dates = [];
    let currentDate = moment(startDate);

    while (currentDate <= endDate) {
        dates.push(moment(currentDate));
        currentDate.add(1, 'days');
    }

    return dates;
}

function isRequestedTimeOutsideRange(start_time, end_time, requested_start_time, requested_end_time) {
    // Convert time strings to Date objects
    const start = new Date(start_time);
    const end = new Date(end_time);
    const requestedStart = new Date(requested_start_time);
    const requestedEnd = new Date(requested_end_time);
    // Check if the requested time range is outside the given time range
    return requestedEnd < start || requestedStart > end;
}

const updateTaskAttendanceClaim = async (requestData) => {
    try {
        if(!requestData.task_id) return true;
        let task = await Model.getTaskData({ _id: requestData?.task_id });
        let totalTime = moment(requestData.end_time).diff(moment(requestData.start_time), 'seconds');
        task.task_working_status.push({
            start_time: requestData.start_time,
            end_time: requestData.end_time,
            is_desktop_task: true
        })
        task.status = 2;
        task.total_working_time = totalTime;
        await task.save();
    }
    catch (err) {
        console.log(` =====updateTaskAttendanceClaim=====${err}============ `);
    }
}

function mergeOverlappingIntervals(intervals) {
    if (intervals.length === 0) return [];
    
    intervals.sort((a, b) => a.start_time - b.start_time);
    return intervals.reduce((merged, current) => {
        const last = merged[merged.length - 1];
        if (last && current.start_time <= last.end_time) {
            last.end_time = moment.max(moment(last.end_time), moment(current.end_time)).utc().toISOString();
        } else {
            merged.push(current);
        }
        return merged;
    }, []);
}


function combineTimeDataById(dataArray) {
    const timeFields = [
        'computer_activities_time',
        'idle_duration',
        'neutral_duration',
        'non_productive_duration',
        'office_time',
        'productive_duration',
        'mobileUsageDuration',
        'offline_duration',
        'total_hours',
    ];
    
    const defaultDuration = moment.duration(0); 
    const grouped = {};

    dataArray.forEach(entry => {
        const id = entry.id;
        
        if (!grouped[id]) {
            grouped[id] = {
                ...entry,
                ...Object.fromEntries(timeFields.map(field => [field, moment.duration(entry[field] || 0)])),
                productivity: { count: 1 },
            };
        } else {
            timeFields.forEach(field => {
                const duration = entry[field] ? moment.duration(entry[field]) : defaultDuration;
                grouped[id][field] = grouped[id][field].add(duration);
            });
            grouped[id].productivity.count += 1;
        }
    });


    Object.values(grouped).forEach(entry => {
        timeFields.forEach(field => {
            if (!entry[field]) {
                console.warn(`Missing field '${field}' for ID ${entry.id}`);
                entry[field] = '00:00:00';
            } else {
                const d = entry[field];
                entry[field] = `${String(Math.floor(d.asHours())).padStart(2, '0')}:${String(d.minutes()).padStart(2, '0')}:${String(d.seconds()).padStart(2, '0')}`;
            }
        });
    });

    return Object.values(grouped);
}
