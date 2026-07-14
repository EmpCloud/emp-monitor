const _ = require('underscore');
const mongoose = require('mongoose')
const mysql = require(`${dbFolder}/MySqlConnection`).getInstance()
const ActivityRequestModel = require(`${modelFolder}/activity_request.schema`);
const OrgDeptAppWeb = require('../../../../models/organizaton_department_apps_web.schema');
const { EmployeeActivityModel } = require('../../../../models/employee_activities.schema');
const EmployeeProductivityModel = require('../../../../models/employee_productivity.schema');
const OrgDeptAppWebModel = require('../../../../models/organizaton_department_apps_web.schema');
const BreakRequestModel = require('../../../../models/break_request.schema')
const { OrganizationReasonModel } = require('../../../../models/organization_timeclaim_reasons.schema');
const OrganizationAppWeb = require('../../../../models/organization_apps_web.schema');
const ExternalTeleworksModel = require('../../../../models/externalTeleWorks.schema');
const { query } = require('winston');
const moment = require('moment');
const { TaskSchemaModel, TimelineDeleteSchemaModel } = require("../../../../models/silah_db.schema");
/**
 * Activity request modele
 * @class Model
 */
class Model {
    /**
     * Insert activity request record
     * 
     * @function create
     * @memberof Model
     * @param {Object} param
     * @return {Promise<Object>} with inserted data columns or Error.
     */
    static create(param) {
        return ActivityRequestModel(param).save()
    }

    /**
    * Get request with employee , date and time
    * 
    * @function getByEmployee
    * @memberof Model
    * @param {number} employee_id
    * @param {date} start_time
    * @param {date} end_time
    * @param {date} date
    * @return {Promise<Object>} Acivity request columns .
    */
    static getByEmployee({ employee_id, date, start_time, end_time }) {
        return ActivityRequestModel.findOne({
            employee_id,
            date,
            $or: [{ start_time: { $gte: start_time, $lte: end_time } }, { end_time: { $gte: start_time, $lte: end_time } }]
        })
    }

    /**
    * Fetch request list with filter
    * 
    * @function getByEmployee
    * @memberof Model
    * @param {number} employee_id
    * @param {date} start_time
    * @param {date} end_time
    * @param {date} date
    * @param {string} order
    * @param {string} sortColumn
    * @param {string} search
    * @param {number} skip
    * @param {number} limit
    * @return {Promise<Object>} Acivity request columns or empty array.
    */
    static getWithFilter({ from_date, to_date, employee_id, assingeeIds, status, date, start_time, end_time, order, sortColumn, skip, limit, search, employee_ids, organization_id, type }) {
        order = order == "A" ? 1 : -1;
        let sort;
        if(type == 4) {
            type = "3";
        }
        switch (sortColumn) {
            case 'date':
                sort = { date: order }
                break;
            case 'start_time':
                type !== 2 ? sort = { start_time: order } : sort = { createdAt: order }
                break;
            case 'end_time':
                type !== 2 ? sort = { end_time: order } : sort = { createdAt: order }
                break;
            case 'reason':
                sort = { reason: order }
                break;
            default:
                sort = { createdAt: order }
                break;
        }
        let filter = { organization_id };
        let searchField = {};
        let isSearchEmp = employee_ids && employee_ids.length > 0 ? true : false;
        searchField = isSearchEmp ? { employee_id: { $in: employee_ids } } : searchField;
        if (start_time && end_time) {
            filter = { ...filter, start_time: { $gte: start_time }, end_time: { $lte: end_time } };
            searchField = isSearchEmp ? { ...searchField, start_time: { $gte: start_time }, end_time: { $lte: end_time } } : searchField
        }

        if (from_date && to_date) {
            filter = { ...filter, date: { $gte: from_date, $lte: to_date } };
            searchField = isSearchEmp ? { ...searchField, date: { $gte: from_date, $lte: to_date } } : searchField
        }

        if (status == 0 || status) {
            filter = { ...filter, status };
            searchField = isSearchEmp ? { ...searchField, status } : searchField
        }

        if (search) filter = { ...filter, reason: { $regex: new RegExp(search, "i") } };

        if (assingeeIds) {
            filter = { ...filter, employee_id: { $in: assingeeIds } };
            searchField = isSearchEmp ? { ...searchField, employee_id: { $in: assingeeIds } } : searchField
        }

        if (employee_id) {
            filter = { ...filter, employee_id };
            searchField = isSearchEmp ? { ...searchField, employee_id } : searchField
        }
        if (type) filter = { ...filter, type };

        if (employee_ids && employee_ids.length > 0) filter = {
            $or: [{ ...filter },
                searchField
            ]
        };
        if (type === 2) return ActivityRequestModel.find(filter, { status: 1, reason: 1, date: 1, start_time: 1, end_time: 1, employee_id: 1, attendance_id: 1, activities: 1, approved_by: 1, createdAt: 1, type: 1, offline_time: 1, task_id: 1 }).skip(skip).limit(limit).sort(sort).lean();
        if (type === 3) {
            delete filter['type'];
            return BreakRequestModel.find(filter, { status: 1, reason: 1, date: 1, start_time: 1, end_time: 1, employee_id: 1, attendance_id: 1, approved_by: 1, createdAt: 1, offline_time: 1 }).skip(skip).limit(limit).sort(sort).lean();
        }
        return ActivityRequestModel.find(filter, { status: 1, reason: 1, date: 1, start_time: 1, end_time: 1, employee_id: 1, attendance_id: 1, activities: 1, approved_by: 1, createdAt: 1, task_id: 1 })
            .skip(skip).limit(limit).sort(sort).lean()
    }

    static async getWithFilters({ from_date, to_date, employee_id, assingeeIds, status, date, start_time, end_time, order, sortColumn, skip, limit, search, employee_ids, organization_id }) {
        order = order == "A" ? 1 : -1;
        let sort;
        switch (sortColumn) {
            case 'date':
                sort = { date: order }
                break;
            case 'start_time':
                sort = { start_time: order } 
                break;
            case 'end_time':
                sort = { end_time: order } 
                break;
            case 'reason':
                sort = { reason: order }
                break;
            default:
                sort = { createdAt: order }
                break;
        }
        let filter = { organization_id };
        let searchField = {};
        let isSearchEmp = employee_ids && employee_ids.length > 0 ? true : false;
        searchField = isSearchEmp ? { employee_id: { $in: employee_ids } } : searchField;
        if (start_time && end_time) {
            filter = { ...filter, start_time: { $gte: start_time }, end_time: { $lte: end_time } };
            searchField = isSearchEmp ? { ...searchField, start_time: { $gte: start_time }, end_time: { $lte: end_time } } : searchField
        }

        if (from_date && to_date) {
            filter = { ...filter, date: { $gte: from_date, $lte: to_date } };
            searchField = isSearchEmp ? { ...searchField, date: { $gte: from_date, $lte: to_date } } : searchField
        }

        if (search) filter = { ...filter, activity: { $regex: new RegExp(search, "i") } };

        if (assingeeIds) {
            filter = { ...filter, employee_id: { $in: assingeeIds } };
            searchField = isSearchEmp ? { ...searchField, employee_id: { $in: assingeeIds } } : searchField
        }

        if (employee_id) {
            filter = { ...filter, employee_id };
            searchField = isSearchEmp ? { ...searchField, employee_id } : searchField
        }

        if (employee_ids && employee_ids.length > 0) filter = {
            $or: [{ ...filter },
                searchField
            ]
        };

        return await BreakRequestModel.find(filter,{_id:1,start_time:1,end_time:1,activity:1,description:1,date:1}).skip(Number(skip)).limit(Number(limit)).sort(sort).lean()
        
    }
    /**
    * Fetch employee by name
    * 
    * @function getByEmployee
    * @memberof Model
    * @param {array} employee_ids
    * @param {number} organization_id
    * @return {Promise<Object>} employees list.
    */
    static getEmployeesByName({ organization_id, search, toAssignId, role_id }) {
        let query;
        let params;
        if (toAssignId, role_id) {
            query = `SELECT e.id ,CONCAT(u.first_name ," ", u.last_name) name
                    FROM employees e
                    INNER JOIN users u ON u.id = e.user_id
                    INNER JOIN assigned_employees ae ON ae.employee_id=e.id
                    WHERE
                    e.organization_id=?
                    AND CONCAT(u.first_name ," ", u.last_name) LIKE ?
                    AND ae.to_assigned_id=?
                    AND ae.role_id=?
                    `;
            params = [organization_id, `%${search}%`, toAssignId, role_id];
        } else {
            query = `SELECT e.id ,CONCAT(u.first_name ," ", u.last_name) name
                    FROM employees e
                    INNER JOIN users u ON u.id = e.user_id
                    WHERE
                    e.organization_id=?
                    AND CONCAT(u.first_name ," ", u.last_name) LIKE ?`;
            params = [organization_id, `%${search}%`];
        }
        return mysql.query(query, params)
    }

    /**
    * Fetch activity request
    * @function getRequestById
    * @memberof Model
    * @param {number} employee_id
    * @param {string} id
    * @return {Object} request data.
    */
    static getRequestById({ id, employee_id, organization_id, type }) {
        let match = { _id: id };
        if (employee_id) match = { employee_id, ...match };
        if (organization_id) match = { organization_id, ...match };
        if (type) match = { type, ...match };
        return ActivityRequestModel.findOne(match);
    }
   
    static deleteBreakRequest({ id, employee_id }) {
        return BreakRequestModel.findOneAndDelete({ _id: id, employee_id, status: 0 });
    }


    /**
    * Updarte request params
    * 
    * @function update
    * @memberof Model
    * @param {date} start_time
    * @param {date} end_time
    * @param {date} date
    * @param {string} id
    * @param {string} reason
    * @param {number} approved_by
    * @param {number} status
    * @return {Promise<Object>} upadated details or error  .
    */
    static update({ reason, date, start_time, end_time, status, approved_by, id, activities, offlineTime, organization_id }) {
        let set;

        if (activities) {
            set = { ...set, activities }
        }

        if (date) set = { ...set, date };
        if (start_time) set = { ...set, start_time };
        if (end_time) set = { ...set, end_time };
        if (reason) set = { ...set, reason };
        if (offlineTime) set = { ...set, offline_time: offlineTime };
        if (status) set = { ...set, status, approved_by };
        // Tenant isolation: scope the write by organization_id when the caller
        // supplies it, so an approve/decline can never mutate another org's
        // request by guessing its ObjectId.
        const filter = organization_id ? { _id: id, organization_id } : { _id: id };
        return ActivityRequestModel.updateOne(filter, { $set: set })
    }

    static declineBreak({ reason, date, start_time, end_time, status, approved_by, id, activities, offlineTime }) {
        let set;

        if (activities) {
            set = { ...set, activities }
        }

        if (date) set = { ...set, date };
        if (start_time) set = { ...set, start_time };
        if (end_time) set = { ...set, end_time };
        if (reason) set = { ...set, reason };
        if (offlineTime) set = { ...set, offline_time: offlineTime };
        if (status) set = { ...set, status, approved_by };
        return BreakRequestModel.updateOne({ _id: id }, { $set: set })
    }

    /**
    * Get employee activity
    * @function getEmployeeActivity
    * @memberof Model
    * @param {number} attendanceId
    * @param {string} startTime
    * @param {string} endTime
    * @return {Object} employee activity.
    */
    static getEmployeeActivity({ attendanceId, activityIds }) {
        return EmployeeActivityModel
            .find({ attendance_id: attendanceId, _id: { $in: activityIds } });
    }

    /**
    * Get employee productivity
    * @function getEmployeeProductivity
    * @memberof Model
    * @param {number} employeeId
    * @param {string} date
    * @return {Object} employee productivity.
    */
    static getEmployeeProductivity({ date, employeeId }) {
        return EmployeeProductivityModel
            .findOne({ date, employee_id: employeeId });
    }

    /**
    * Get employee attendance
    * @function getAttendance
    * @memberof Model
    * @param {number} organizationId
    * @param {number} employeeId
    * @param {string} date
    * @return {Object} employee attendance.
    */
    static getAttendance({ date, employeeId, organizationId }) {
        const query = `
                    SELECT ea.employee_id, ea.organization_id, e.department_id,ea.start_time, ea.end_time, ea.date, ea.id, e.timezone
                    FROM employee_attendance ea
                    JOIN employees e ON e.id=ea.employee_id
                    WHERE ea.date = ? AND ea.employee_id = ? AND ea.organization_id = ?
                    `;

        return mysql.query(query, [date, employeeId, organizationId])
    }

    /**
    * Get application productivity status
    * @function findApplicationProductivityStatus
    * @memberof Model
    * @param {number} departmentId
    * @param {string} applicationId
    * @return {Object} employee attendance.
    */
    static async findApplicationProductivityStatus({ applicationId, departmentId }) {
        let orgDeptAppWeb = await OrgDeptAppWeb
            .findOne({ application_id: applicationId, department_id: null })
            .lean();

        if (orgDeptAppWeb.type === 1) {
            return Promise.resolve(orgDeptAppWeb.status);
        } else {
            orgDeptAppWeb = await OrgDeptAppWebModel
                .findOne({ application_id: applicationId, department_id: departmentId })
                .lean();
            if (!orgDeptAppWeb) {
                return Promise.resolve(0);
            }
            return Promise.resolve(orgDeptAppWeb.status);
        }
    }
    /**
    * delete activity request
    * @function delete
    * @memberof Model
    * @param {number} organization_id
    * @param {string} id
    * @return {Object}  deleted response or error .
    */
    static delete({ organization_id, id: _id }) {
        return ActivityRequestModel.deleteOne({ organization_id, _id });
    }


    /**
     * Total conunt of the requests with filter
     * 
     * @function requestCount
     * @memberof Model
     * @param {number} employee_id
     * @param {date} start_time
     * @param {date} end_time
     * @param {date} date
     * @param {string} search
     * @return {Promise<Object>} total count  or error .
     */
    static requestCount({ from_date, to_date, employee_id, assingeeIds, status, employee_ids, organization_id, date, start_time, end_time, search, type }) {
        if(type == 4) {
            type = "3";
        }
        let filter = { organization_id };
        let searchField = {};
        let isSearchEmp = employee_ids && employee_ids.length > 0 ? true : false;
        searchField = isSearchEmp ? { employee_id: { $in: employee_ids } } : searchField;
        if (start_time && end_time) {
            filter = { ...filter, start_time: { $gte: start_time }, end_time: { $lte: end_time } };
            searchField = isSearchEmp ? { ...searchField, start_time: { $gte: start_time }, end_time: { $lte: end_time } } : searchField
        }

        if (from_date && to_date) {
            filter = { ...filter, date: { $gte: from_date, $lte: to_date } };
            searchField = isSearchEmp ? { ...searchField, date: { $gte: from_date, $lte: to_date } } : searchField
        }

        if (status == 0 || status) {
            filter = { ...filter, status };
            searchField = isSearchEmp ? { ...searchField, status } : searchField
        }

        if (search) filter = { ...filter, reason: { $regex: new RegExp(search, "i") } };

        if (assingeeIds) {
            filter = { ...filter, employee_id: { $in: assingeeIds } };
            searchField = isSearchEmp ? { ...searchField, employee_id: { $in: assingeeIds } } : searchField
        }

        if (employee_id) {
            filter = { ...filter, employee_id };
            searchField = isSearchEmp ? { ...searchField, employee_id } : searchField
        }
        if (type) filter = { ...filter, type };
        if (employee_ids && employee_ids.length > 0) filter = {
            $or: [{ ...filter },
                searchField
            ]
        };
        if (type === 3) {
            delete filter['type'];
            return BreakRequestModel.countDocuments(filter);
        }
        return ActivityRequestModel.countDocuments(filter);
    }

    /**
     * Get  emloyees
     * 
     * @function requestCount
     * @memberof Model
     * @param {array} employee_ids
     * @param {number} organization_id
     * @return {Promise<Object>} employes or error .
     */
    static getEmployees({ organization_id, employee_ids }) {
        let query = `SELECT e.id ,CONCAT(u.first_name ," ", u.last_name) name ,e.timezone ,e.department_id, u.computer_name
        FROM employees e
        INNER JOIN users u ON u.id = e.user_id
        WHERE
        e.organization_id=${organization_id} AND e.id IN (${employee_ids})`

        return mysql.query(query)
    }

    static getActivities({ attendanceId, startTime, endTime, activityIds }) {
        let match = { attendance_id: attendanceId, $expr: { $ne: ["$total_duration", "$active_seconds"] } };
        if (activityIds && activityIds.length > 0) match = { _id: { $in: activityIds.map(_id => new mongoose.Types.ObjectId(_id)) }, ...match };
        if (startTime) match = { start_time: { $gte: new Date(startTime) }, ...match };
        if (startTime) match = { end_time: { $lte: new Date(endTime) }, ...match };
        return EmployeeActivityModel.aggregate([
            {
                $match: match
            },
            {
                $project: {
                    domain_id: 1,
                    total_duration: 1,
                    active_seconds: 1,
                    application_id: 1,
                    url: 1,
                    title: { $ifNull: ['$title', ''] },
                    start_time: 1,
                    end_time: 1,
                },
            },
            {
                $lookup: {
                    from: 'organization_apps_webs',
                    let: { domain_id: '$domain_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$domain_id'] } } },
                        { $project: { name: 1, _id: 0 } },
                    ],
                    as: 'domain',
                },
            },
            {
                $unwind: {
                    path: '$domain',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'organization_apps_webs',
                    let: { application_id: '$application_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$application_id'] },
                            },
                        },
                        { $project: { name: 1, _id: 0 } },
                    ],
                    as: 'app',
                },
            },
            { $unwind: '$app' }
        ]);
    }

    /**
    * Get employee activity by ids
    * @function getEmployeeActivityByIds
    * @memberof Model
    * @param {number} attendanceId
    * @param {string} startTime
    * @param {string} endTime
    * @return {Object} employee activity.
    */
    static getEmployeeActivityByIds(ids) {
        ids = ids.map(_id => new mongoose.Types.ObjectId(_id));
        return EmployeeActivityModel
            .aggregate([
                {
                    $match: { _id: { $in: ids } }
                },
                {
                    $project: {
                        _id: 0, activity_id: "$_id"
                    }
                },
            ]);
    }

    /**
     * Get users by userId
     * 
     * @function getUsers
     * @memberof Model
     * @param {array} userIds
     * @param {number} organization_id
     * @return {Promise<Object>} users or error .
     */
    static getUsers(userIds) {
        let query = `SELECT id, CONCAT(first_name ," ",last_name) AS name
        FROM users 
        WHERE id IN (?)
        `
        return mysql.query(query, [userIds]);
    }

    /**
     * Get users by userId
     * 
     * @function getApprovers
     * @memberof Model
     * @param {array} employee_ids
     * @param {number} organization_id
     * @return {Promise<Object>} users or error .
     */
    static getApprovers({ organization_id, employee_ids }) {
        let query = `SELECT   CONCAT(u.first_name ," ", u.last_name) name,u.email ,r.name role ,pr.permission_id ,ae.employee_id
        from users u
        INNER JOIN employees e ON e.user_id=u.id
        INNER JOIN user_role ur on ur.user_id=u.id
        INNER JOIN roles r ON r.id=ur.role_id
        INNER join permission_role  pr ON pr.role_id=r.id
        INNER JOIN permissions p ON p.id=pr.permission_id
        INNER JOIN  assigned_employees ae on ae.to_assigned_id=e.id
        WHERE ae.employee_id in(?)   
        AND p.name="activity_alter_process"
        AND e.organization_id=?
        GROUP BY u.id
        `
        return mysql.query(query, [employee_ids, organization_id])
    }


    /**
     * Get application productivity ranking
     * 
     * @function getApprovers
     * @memberof Model
     * @param {array} appIds
     * @return {Promise<Object>} application productivity ranking or error .
     */
    static getAppProductivitystatus(appIds) {
        return OrgDeptAppWebModel.aggregate([
            { $match: { application_id: { $in: appIds.map(i => new mongoose.Types.ObjectId(i)) } } },
            {
                $group: {
                    _id: { application_id: '$application_id', type: "$type" },
                    data: { $push: { status: "$status", deptId: "$department_id" } }
                }
            },
            { $project: { application_id: "$_id.application_id", type: "$_id.type", rules: "$data", _id: 0 } }
        ])
    }


    /**
 * Get users by userId
 * 
 * @function getApprovers
 * @memberof Model
 * @param {array} employee_ids
 * @param {number} organization_id
 * @return {Promise<Object>} users or error .
 */
    static getAdminData(organization_id) {
        let query = `SELECT u.id, CONCAT(u.first_name ," ",u.last_name) AS name
        FROM users u 
        INNER JOIN organizations o ON o.user_id=u.id
        WHERE o.id IN (?) `
        return mysql.query(query, [organization_id])
    }

    /**
     * Get users by userId
     * 
     * @function getTotalTime
     * @memberof Model
     * @param {number} employee_id
     * @param {number} organization_id
     * @param {number} date
     * @return {Promise<Object>} users or error .
     */
    static getTotalTime({ organizationId, employeeId, date }) {
        let query = `SELECT TIMESTAMPDIFF(second,ea.start_time,ea.end_time) as total_time 
                     FROM employees e
                     JOIN employee_attendance ea ON e.id = ea.employee_id
                     Where e.organization_id = ? AND e.id = ? AND ea.date = ?`
        return mysql.query(query, [organizationId, employeeId, date])
    }
    /**
         * Get users by userId
         *
         * @function getOfflineTime
         * @memberof Model
         * @param {number} employee_id
         * @param {number} organization_id
         * @param {number} date
         * @return {Promise<Object>} officeTime or error .
         */
    static getOfflineTime({ organizationId, employeeId, date }) {
        return EmployeeProductivityModel.aggregate([
            {
                $match: { organization_id: organizationId, employee_id: employeeId, date }
            },
            {
                $project: {
                    _id: 0,
                    office_time: { $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration', '$break_duration', '$idle_duration'] },
                    office_time1: { $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration', '$break_duration', '$idle_duration', '$offline_time'] },

                }
            },
        ])
    }
    /**
         * Get users by userId
         *
         * @function getOfflineTime
         * @memberof Model
         * @param {number} employee_id
         * @param {number} organization_id
         * @param {number} date
         * @return {Promise<Object>} employee details or error .
         */
    static getEmployeeDetails({ organizationId, employee_ids, date }) {
        let query = `SELECT e.id, ea.id as attendance_id, CONCAT(u.first_name ," ", u.last_name) name ,e.timezone ,e.department_id FROM employees e 
                     JOIN employee_attendance ea on ea.employee_id = e.id
                     JOIN users u ON u.id = e.user_id
                     WHERE e.id=${employee_ids} and ea.date='${date}' and e.organization_id=${organizationId};`;
        return mysql.query(query);
    }
    /**
         * Get users by userId
         *
         * @function getPreviousReqTime
         * @memberof Model
         * @param {number} employee_id
         * @param {number} organization_id
         * @param {number} date
         * @param {number} type
         * @param {number} id
         * @return {Promise<Object>} previous requests claimed total time or error .
         */
    static getPreviousReqTime({ organizationId, employee_id, date, type, id, status = [1] }) {
        // let match = { organization_id: organizationId,  employee_id,  date,  type, status: { $ne: 2 } }
        let match = { organization_id: organizationId, employee_id, date, type, status: {$in : status} }
        if (id) match = { _id: { $ne: new mongoose.Types.ObjectId(id) }, ...match };
        return ActivityRequestModel.aggregate([
            {
                $match: match,
            },
            {
                $group:
                {
                    _id: { employee_id: "$employee_id", date: "$date", type: "$type" },
                    totalTime: { $sum: '$offline_time' }
                }
            },
            {
                $project: { _id: 0, totalTime: 1 }
            }
        ])
    }

    static getTimeClaimRequest({ organization_id, employee_id, date, attendanceId, status = [1] }) {
        return ActivityRequestModel.aggregate([
            {
                $match: {
                    organization_id,
                    type: 2,
                    employee_id,
                    status: { $in: status },
                    attendance_id: attendanceId,
                    date: date,
                }
            }
        ]);
    }

    static getTimeClaimRequestTimesheet({ organization_id, employee_id, date, attendanceId, status = [1], type }) {
        return ActivityRequestModel.aggregate([
            {
                $match: {
                    organization_id,
                    employee_id,
                    status: { $in: status },
                    attendance_id: attendanceId,
                    date: date,
                    type
                }
            },
            {
                $project: { _id: 0, start_time: 1, end_time: 1 }
            }
        ]);
    }
    static getIdleTimeClaimRequestTimesheet({ organization_id, employee_id, date, attendanceId, status = [1], type }) {
        return ActivityRequestModel.aggregate([
            {
                $match: {
                    organization_id,
                    employee_id,
                    status: { $in: status },
                    attendance_id: attendanceId,
                    date: date,
                    type
                }
            },
            {
                $lookup: {
                    from: "employee_activities",
                    localField: "activities.activity_id",
                    foreignField: "_id",
                    as: "result"
                }
            },
            {
                $project: { _id: 0, "result.idleData": 1 }
            }
        ]);
    }

    static getPreviousReqBreakTime({ organizationId, employee_id, date, type, id, isGetOfflineBreakdown }) {
        // let match = { organization_id: organizationId,  employee_id,  date,  type, status: { $ne: 2 } }
        let match = { organization_id: organizationId, employee_id, date, status: { $in: [0, 1] } };
        if (isGetOfflineBreakdown) match['status'] = { $in: [1] };
        if (id) match = { _id: { $ne: new mongoose.Types.ObjectId(id) }, ...match };
        return BreakRequestModel.aggregate([
            {
                $match: match,
            },
            {
                $project: { _id: 0, start_time: 1, end_time: 1 }
            }
        ]);
    }

    /**
     *  Fetching non assigned employees 
     * @function getNonAssignedUsers
     * @memberof Model
     * @param {Number} organization_id 
     * @returns {*} users list or error 
     */
    static getNonAssignedUsers(organization_id) {
        return mysql.query(
            `SELECT e.id
             FROM employees e 
             LEFT JOIN assigned_employees ae ON ae.employee_id = e.id
             WHERE e.organization_id = ? AND ae.employee_id IS NULL 
             GROUP BY e.id`,
            [organization_id]
        );
    }


    static async getRequestCount({ organization_id, type, assingeeIds }) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    const cutoffISO = cutoffDate.toISOString();

    let match = {
        organization_id,
        type,
        $expr: {
            $gte: [{ $toDate: "$date" }, new Date(cutoffISO)]
        }
    };

    if (assingeeIds.length !== 0) {
        match.employee_id = { $in: assingeeIds };
    }

    const basePipeline = [
        { $match: match },
        {
            $group: {
                _id: { status: "$status" },
                totalCount: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                totalCount: 1,
                status: "$_id.status"
            }
        }
    ];

    if (type === 3) {
        delete match['type']; // break requests don't filter by type
        return BreakRequestModel.aggregate(basePipeline);
    }

    return ActivityRequestModel.aggregate(basePipeline);
    }

    /**
     * get Employee Activities
     * @function getEmployeeActivities
     * @memberof Model
     * @param {Number} attendanceId 
     * @returns {*} activities list
     */
    static getEmployeeActivities({ attendanceId }) {
        let match = { attendance_id: attendanceId };

        return EmployeeActivityModel.aggregate([
            {
                $match: match
            },
            {
                $project: {
                    start_time: 1,
                    end_time: 1,
                    application_id: 1,
                    domain_id: 1,
                    url: 1,
                    idleData: 1,
                    activeData: 1,
                },
            },
            {
                $sort: { start_time: 1 }
            }
        ]);
    }

    /**
     *  get attendance id
     * @function getAttendanceId
     * @memberof Model
     * @param {Date} date 
     * @param {Number} employeeId
     * @param {Number} organizationId
     * @returns {*} attendanceId
     */
    static getAttendanceId({ date, employeeId, organizationId }) {
        const query = `
                    SELECT ea.id,e.timezone,e.department_id 
                    FROM employee_attendance ea
                    INNER JOIN employees e on e.id = ea.employee_id
                    WHERE ea.date = ? AND ea.employee_id = ? AND ea.organization_id = ?
                    `;

        return mysql.query(query, [date, employeeId, organizationId])
    }

    static isApprovedOrg(organization_id) {
        const query = `
            SELECT u.auto_time_claim as auto_accept_time_claim
            FROM organizations o
            JOIN users u ON u.id=o.user_id
            WHERE o.id = ${organization_id};
        `;
        return mysql.query(query);
    }

    static async getAssignedAdminId(user_id, employee_id) {
        let query = `
            SELECT u.auto_time_claim as auto_accept_time_claim, ae.to_assigned_id as non_admin_id, r.name
            FROM users u
            JOIN employees e ON e.user_id=u.id
            JOIN assigned_employees ae ON ae.employee_id=e.id
            JOIN roles r ON r.id = ae.role_id
        `;
        if (user_id) query += ` WHERE u.id = ${user_id};`
        if (employee_id) query += ` WHERE e.id = ${employee_id};`
        let data = await mysql.query(query);
        data = data.filter(i => !["employee", "employees"].includes(i.name.toLowerCase()))
        return data;
    }


    static getNonAdminApproval(assignedAdminId) {
        let query = `
            SELECT u.auto_time_claim as auto_accept_time_claim, u.id as user_id
            FROM users u
            JOIN employees e ON e.user_id=u.id
            WHERE e.id IN (?);
        `;
        return mysql.query(query, [assignedAdminId]);
    }

    static getAATimeClaim(user_id){
        let query = `
            SELECT u.auto_time_claim as auto_accept_time_claim
            FROM users u
            WHERE u.id = ${user_id};
        `;
        return mysql.query(query);
    }

    static updateAutoClaimStatus (user_id, status){
        let query = `
            UPDATE users SET auto_time_claim = "${status}"
            WHERE id = ${user_id} 
        `;
        return mysql.query(query);
    }

    static checkOrganization (user_id) {
        let query = `
            SELECT u.id, o.id
            FROM users u
            JOIN organizations o ON o.user_id = u.id
            WHERE u.id = ${user_id};
        `;
        return mysql.query(query);
    }

    static pendingTimeClaimRequest (organization_id) {
        return ActivityRequestModel.aggregate([
            { $match: { organization_id, status: 0 } },
        ])
    }
    
    static pendingBreakTimeClaimRequest(organization_id) {
        return BreakRequestModel.aggregate([
            { $match: { organization_id, status: 0 } },
        ])
    }

    static getOldRequest ({employee_id, organization_id, date, type, attendance_id}) {
        return ActivityRequestModel.find({ employee_id, organization_id, date, type, attendance_id, status: 0 });
    }

    static getOldBreakRequest ({attendance_id}) {
        return BreakRequestModel.aggregate([
            {
                $match: { attendance_id }
            },
            {
                "$project": {
                    "difference": {
                        "$divide": [
                            { "$subtract": ["$end_time", "$start_time"] },
                            1000
                        ]
                    }
                }
            },
            {
                "$group": {
                    "_id": "$attendance_id",
                    "totalDifference": { "$sum": "$difference" }
                }
            },
        ])
    }

    static getBreakRequest({ employee_id, date, organization_id }) {
        return BreakRequestModel.aggregate([
            {
                $match: {
                    employee_id, date, organization_id
                }
            }
        ]);
    }

    static getBreakRequestById({ _id, organization_id }) {
        return BreakRequestModel.findOne({_id: new mongoose.Types.ObjectId(_id), organization_id});
    }

    static getUserDetail(ids) {
        return mysql.query(`SELECT concat(first_name, " " ,last_name) as name, id FROM users WHERE id IN (${ids})`);
    }

    static getEmployeeTimeZone ({organization_id, employee_id}) {
        return mysql.query(`SELECT timezone FROM employees WHERE organization_id = ${organization_id} AND id = ${employee_id}`);
    }

    static getReasonByName({ organization_id, name, type }) {
        return OrganizationReasonModel.findOne({ organization_id, reasons: { $elemMatch: { name, type } } }, { organization_id: 1, reasons: 1, });
    }
    static getReasonByOrgId({ organization_id }) {
        return OrganizationReasonModel.findOne({ organization_id }, { organization_id: 1, reasons: 1, });
    }

    static getReasonById({ organization_id, id }) {
        return OrganizationReasonModel.findOne({ organization_id, reasons: { $elemMatch: { _id: new mongoose.Types.ObjectId(id) } } }, { organization_id: 1, reasons: 1, });
    }
    static createReason(param) {
        return OrganizationReasonModel(param).save();
    }

    static updateReason({ ifReasonOfOrg, name, type }) {
        ifReasonOfOrg.reasons.push({ name, type });
        return ifReasonOfOrg.save();
    }

    static findReasons({ organization_id, type }) {
        return OrganizationReasonModel.aggregate([
            { $match: { organization_id: organization_id } },
            { $unwind: '$reasons' },
            { $match: { 'reasons.type': type } },
            { $group: { _id: '$_id', list: { $push: '$reasons' } } }
        ]);
    }
    static deleteReason(data) {
        return data.save();
    }

    static getAttendanceByDate(date, employee_id) {
        let query = `
            SELECT e.id, ea.date, ea.start_time, ea.end_time
                FROM employees e
                JOIN employee_attendance ea ON ea.employee_id = e.id
                WHERE ea.date = '${date}' AND e.id = ${employee_id};
        `;
        return mysql.query(query);
    }

    static getExistingAttendanceRequest(employee_id, organization_id, date) {
        return ActivityRequestModel.find({
            employee_id, organization_id, date, type: 3, status: { $in: [0,1] }
        });
    }

    static getExistingSameTimeRequest(employee_id, organization_id, date) {
        return ActivityRequestModel.aggregate([
            {
                $match: {
                    employee_id,
                    type: 3,
                    date: {
                        $in : [moment(date).add(1, 'days').format('YYYY-MM-DD'), date, moment(date).subtract(1, 'days').format('YYYY-MM-DD')]
                    },
                    organization_id,
                    status: { $in: [0,1] }
                }
            },
        ]);
    }

    static createAttendanceRequest(employee_id, organization_id, date, reason, start_time, end_time, task_id) {
        start_time = moment(start_time).toISOString();
        end_time = moment(end_time).toISOString();

        return new ActivityRequestModel({employee_id, organization_id, date, reason, start_time, end_time, type: 3, status: 0, task_id}).save();
    }

    static deleteAttendanceRequest(organization_id, employee_id, id,) {
        return ActivityRequestModel.deleteMany({organization_id, employee_id, _id: { $in : id}});
    }

    static getActivityAttendanceRequest(id, organization_id) {
        return ActivityRequestModel.findOne({_id: new mongoose.Types.ObjectId(id), organization_id, type: 3});
    }

    static updateEmployeeAttendance(date, employee_id, start_time, end_time) {
        let query = `
            UPDATE employee_attendance
        `
        if(start_time) query += ` SET start_time = '${start_time.split("T")[0]} ${start_time.split("T")[1].split('.')[0]}'`;
        if (start_time && end_time) query += ` AND`; 
        if(end_time) query += ` SET end_time = '${end_time.split("T")[0]} ${end_time.split("T")[1].split('.')[0]}'`;
        query += ` WHERE date = '${date}' AND employee_id = ${employee_id}`;
        return mysql.query(query);
    }

    static insertEmployeeAttendance(date, start_time, end_time, employee_id, organization_id) {
        start_time = moment(start_time).toISOString();
        end_time = moment(end_time).toISOString();
        
        let query = `INSERT INTO employee_attendance (employee_id, organization_id, date, start_time, end_time) VALUES (${employee_id}, ${organization_id}, '${date}', '${start_time.split("T")[0]} ${start_time.split("T")[1].split('.')[0]}', '${end_time.split("T")[0]} ${end_time.split("T")[1].split('.')[0]}') ;`;
        return mysql.query(query);
    }

    static getEmployeeDetailsById(employee_id, organization_id) {
        let query = ` 
            SELECT u.id as user_id, e.id as employee_id, e.timezone, u.first_name, u.last_name
                FROM employees e
                JOIN users u on u.id = e.user_id
                WHERE e.id = ${employee_id} AND e.organization_id = ${organization_id}
        `;
        return mysql.query(query);
    }

    static checkIfApplicationExist(organization_id) {
        return OrganizationAppWeb.find({ type: 1, organization_id, name: "time-claim" })
    }

    static createApplicationTimeClaim(organization_id) {
        return new OrganizationAppWeb({ type: 1, organization_id, name: "time-claim", is_new: true }).save();
    }

    static createOrganizationDeptAppWeb(_id) {
        return new OrgDeptAppWeb({ type: 1, application_id: _id, pre_request: 0, status: 0 }).save();
    }


    static createEmployeeProductivityReport(application_id, organization_id, employee_id, durationSecond, department_id, location_id, date) {
        return new EmployeeProductivityModel({
            logged_duration: durationSecond,
            risk_percentage: 0,
            offline_time: 0,
            employee_id,
            department_id,
            location_id,
            organization_id,
            productive_duration: durationSecond,
            non_productive_duration: 0,
            neutral_duration: 0,
            idle_duration: 0,
            break_duration: 0,
            year: date.split('-')[0],
            month: date.split('-')[1],
            day: date.split('-')[2],
            yyyymmdd: date.split('-').join(''),
            date: date,
            applications: [
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
            ]
        }).save();
    }

    static getEmployeeLocationDepartment(employee_id) {
        let query = `SELECT e.id, e.department_id, e.location_id FROM employees e WHERE e.id = ${employee_id}`;
        return mysql.query(query);
    }

    static updateEmployeeProductivityReport (application_id, organization_id, employee_id, durationSecond, department_id, location_id, date) {
        return EmployeeProductivityModel.findOne({ organization_id, employee_id, yyyymmdd: date.split('-').join('')});
    }

     // #new
     static getEmployeeProductivityReportByDate(organization_id, employee_id, date, productive_hours) {
        let project = {
            productive_duration: 1,
            non_productive_duration: 1,
            neutral_duration: 1,
            idle_duration: 1,
            break_duration: 1,
            employee_id: 1,
            date: 1,
            computer_activities_time: { $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration'] },
            office_time: { $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration', '$break_duration', '$idle_duration', '$offline_time'] },
            productivity: {
                $multiply: [
                    {
                        $divide: [
                            '$productive_duration',
                            process?.env?.ORGANIZATION_ID?.split(',')?.includes(organization_id.toString()) ? 30600
                                : (productive_hours || { $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration', '$break_duration', '$idle_duration'] })
                        ]
                    }, 100]
            },
        }
        return EmployeeProductivityModel.aggregate([{ $match: { organization_id, employee_id, yyyymmdd: +date.split('-').join('')}}, {$project: project}]);
    }

    static getTeleworkReportData (organization_id, date) {
        return ExternalTeleworksModel.findOne({organization_id: +organization_id, date});
    }
    static getEmployeeDetail(employee_id) {
        let query = `SELECT u.email 
            from users u
            join employees e on e.user_id = u.id
            where e.id = ${employee_id}
        `;
        return mysql.query(query);
    }

    static getOrganizationSettings(orgId) {
        let query = `
            SELECT o.id as organization_id, u.first_name, u.last_name, o.reseller_id_client, o.reseller_number_client, o.timezone, u.email, os.rules
                FROM organizations o 
                JOIN organization_settings os ON os.organization_id = o.id
                JOIN users u ON u.id = o.user_id
                WHERE o.id = ${orgId}
        `
        return mysql.query(query);
    }

    static getSilahDetails(organizationIds) {
        organizationIds = organizationIds.filter(i => i);
        let query =`
            SELECT o.id, u.first_name, u.last_name, et.spToken, et.labourOfficeId, et.sequenceNumber, r.id as reseller_id 
                FROM organizations o 
                JOIN users u ON u.id = o.user_id 
                JOIN reseller r ON r.user_id = u.id 
                JOIN external_teleworks et ON et.organization_id = o.id
                WHERE o.id IN (${organizationIds})
        `;
        return mysql.query(query);
    }

    static getTaskDetails(start_time, end_time, employee_id) {
        return TaskSchemaModel.aggregate([
            {
                $match: {
                    "$or": [
                        {
                            "task_working_status.start_time": { $gte: new Date(start_time), $lte: new Date(end_time) }
                        },
                        {
                            "task_working_status.end_time": { $gte: new Date(start_time), $lte: new Date(end_time) }
                        }
                    ],
                    assigned_user: { $in : employee_id},
                    status: { $ne: 0}
                }
            }
        ])
    }

    
    static getAttendanceTimeClaimRequest (start_date, end_date, employee_id, organization_id) {
        return ActivityRequestModel.aggregate([
            {
                $match: {
                    "start_time": { $gte: new Date(start_date), $lte: new Date(end_date) },
                    "end_time": { $gte: new Date(start_date), $lte: new Date(end_date) },
                    "employee_id": +employee_id,
                    "organization_id": organization_id,
                    "status": 1,
                    "type": 3
                }
            },
            {
                "$project": {
                    start_time: 1,
                    end_time: 1,
                    _id: 0
                }
            }
        ])
    }

    static getTaskData({_id}) {
        return TaskSchemaModel.findOne({_id});
    }

    static getTaskClaim(task_ids) {
        task_ids = task_ids.map(i => new mongoose.Types.ObjectId(i));
        return TaskSchemaModel.aggregate([
            {
                $match: {
                    _id: { $in: task_ids }
                }
            },
            {
                $project: {
                    name: 1
                }
            }
        ])
    }

    
    static saveTimelineDeleteRequest(data) {
        return new TimelineDeleteSchemaModel(data).save();
    }

    static getDeletedTimelineData(employee_id, organization_id, dates) {
        let match = {
            organization_id: +organization_id,
            date: { $in: dates }
        }
        if (employee_id.length) match.employee_id = { $in: employee_id };
        return TimelineDeleteSchemaModel.aggregate([
            {
                $match: match
            }
        ])
    }

    static getEmployeeTimezone(employee_id, organization_id) {
        let query = `SELECT u.email , e.timezone
            from users u
            join employees e on e.user_id = u.id
            where e.id = ${employee_id} AND e.organization_id = ${organization_id}
        `;
        return mysql.query(query);
    }

    static getEmployeeTimesheetByDate(employee_id, organization_id, dates, productive_hours) {
        let project = {
            productive_duration: 1,
            non_productive_duration: 1,
            neutral_duration: 1,
            idle_duration: 1,
            break_duration: 1,
            employee_id: 1,
            date: 1,
            computer_activities_time: {
                $sum: [
                    "$non_productive_duration",
                    "$productive_duration",
                    "$neutral_duration"
                ]
            },
            office_time: { $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration', '$break_duration', '$idle_duration', '$offline_time'] },
            productivity: {
                $multiply: [
                    {
                        $divide: [
                            '$productive_duration',
                            process?.env?.ORGANIZATION_ID?.split(',')?.includes(organization_id.toString()) ? 30600
                                : (productive_hours || { $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration', '$break_duration', '$idle_duration'] })
                        ]
                    }, 100]
            },
        }
        let match = {
            organization_id,
            yyyymmdd: { $in: dates }
        }
        if (employee_id.length) match.employee_id = { $in: employee_id };

        return EmployeeProductivityModel.aggregate([
            {
                $match: match
            },
            {
                $project: project
            }
        ])
    }

    static getEmployeeAttendanceData(employee_id, organization_id, dates) {
        let query = `
            SELECT ea.date, e.id, ea.start_time, ea.end_time, e.timezone, ea.details
            FROM employees e
            JOIN employee_attendance ea ON e.id = ea.employee_id
            WHERE e.organization_id = ${organization_id} AND ea.date IN (${dates.map(d => `'${d}'`).join(',')})
        `;
        if (employee_id.length) query += ` AND e.id IN (${employee_id})`;
        return mysql.query(query);
    }

    static getMobileTask(start_time, end_time, employee_id, organization_id) {
        let match = {
            "$or": [
                {
                    "task_working_status.start_time": { $gte: new Date(start_time), $lte: new Date(end_time) }
                },
                {
                    "task_working_status.end_time": { $gte: new Date(start_time), $lte: new Date(end_time) }
                }
            ],
            status: { $ne: 0 },
            organization_id: +organization_id
        }
        if (employee_id) match.assigned_user = { $in: employee_id }
        return TaskSchemaModel.aggregate([
            {
                $match: match
            }
        ]);
    }

    static getEmployeesFilter({ employee_ids, location_id, department_id, search, organization_id, nonAdminId }) {
        if(nonAdminId) {
            let query = `
                SELECT u.first_name, u.last_name, e.id, ol.name as location_name, od.name as department_name, e.emp_code, u.a_email as email, e.department_id, e.location_id, u.computer_name
                    FROM employees e
                    JOIN users u ON e.user_id = u.id
                    JOIN organization_locations ol ON ol.id = e.location_id 
                    JOIN organization_departments od ON od.id = e.department_id
                    JOIN assigned_employees ae on ae.employee_id = e.id
                    WHERE e.organization_id = ${organization_id} AND ae.to_assigned_id = ${nonAdminId} 
            `;
            if (location_id) query += ` AND e.location_id = ${location_id}`;
            if (department_id) query += ` AND e.department_id = ${department_id}`;
            if (employee_ids.length) query += ` AND e.id IN (${employee_ids})`;
            if (search) query += ` AND (u.first_name LIKE '%${search}%' OR u.last_name LIKE '%${search}%' OR e.emp_code LIKE '%${search}%' OR concat(u.first_name, ' ', u.last_name) LIKE '%${search}%')`;

            return mysql.query(query)
        }
        else {
            let query = `
                SELECT u.first_name, u.last_name, e.id, ol.name as location_name, od.name as department_name, e.emp_code, u.a_email as email, e.department_id, e.location_id
                    FROM employees e
                    JOIN users u ON e.user_id = u.id
                    JOIN organization_locations ol ON ol.id = e.location_id 
                    JOIN organization_departments od ON od.id = e.department_id
                    WHERE e.organization_id = ${organization_id}
            `;
            if (location_id) query += ` AND e.location_id = ${location_id}`;
            if (department_id) query += ` AND e.department_id = ${department_id}`;
            if (employee_ids.length) query += ` AND e.id IN (${employee_ids})`;
            if (search) query += ` AND (u.first_name LIKE '%${search}%' OR u.last_name LIKE '%${search}%' OR e.emp_code LIKE '%${search}%' OR concat(u.first_name, ' ', u.last_name) LIKE '%${search}%')`;
            return mysql.query(query)
        }
    }

    static getBreakRequestMultiple({ employee_id, date, organization_id }) {
        return BreakRequestModel.aggregate([
            {
                $match: {
                    employee_id: { $in : employee_id }, date: { $in: date }, organization_id
                }
            }
        ]);
    }

    static addEmployeeActivities(data) {
        return new EmployeeActivityModel(data).save();
    }
}
module.exports.Model = Model;