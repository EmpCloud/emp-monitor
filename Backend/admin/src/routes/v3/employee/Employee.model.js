const _ = require('underscore');
const mongoose = require('mongoose');


const mySql = require('../../../database/MySqlConnection').getInstance();
const { BaseModel } = require('../../../models/BaseModel');
const { EmployeeActivityModel: EmpActivities } = require('../../../models/employee_activities.schema');
const OrgDeptAppWebModel = require('../../../models/organizaton_department_apps_web.schema');
const EmpHelper = require('./Employee.helper');
const ConvesationClassificationModel = require('../../../models/conversation_classification.schema');
const EmpProductivityReportSchema = require('../../../models/employee_productivity.schema');
const OrganizationShifts = require('../../../routes/v3/shifts');
const OrganizationWebAppsModel = require('../../../models/organization_apps_web.schema')
const EmpProductivityReportsModel = require('../../../models/employee_productivity.schema');
const GeoLocationChangeLogModel = require('../../../models/geo_location_change_logs.schema');


class EmployeeModel extends BaseModel {
    static get TABLE_NAME() {
        return 'employees';
    }

    static get TABLE_FIELDS() {
        return [
            'id', 'user_id', 'organization_id', 'department_id', 'location_id', 'emp_code', 'shift_id', 'timezone',
            'tracking_mode', 'tracking_rule_type', 'custom_tracking_rule', 'operating_system', 'architecture',
            'software_version', 'system_type', 'created_at', 'updated_at'
        ];
    }

    static getBrowserHistoryCount(attendance_ids) {
        return EmpActivities.distinct('domain_id', {
            attendance_id: { $in: attendance_ids },
            domain_id: { $ne: null },
        });
    }

    static getBrowserHistory({ attendance_ids, skip, limit }) {
        return EmpActivities.aggregate([
            {
                $match: {
                    attendance_id: { $in: attendance_ids },
                    domain_id: { $ne: null },
                },
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
            { $unwind: '$domain' },
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
                    as: 'browser',
                },
            },
            { $unwind: '$browser' },
            {
                $group: {
                    _id: '$domain_id',
                    domain: { $first: '$domain.name' },
                    total_duration: { $sum: '$total_duration' },
                    active_seconds: { $sum: '$active_seconds' },
                    urls: {
                        $push: {
                            url: '$url',
                            title: '$title',
                            start_time: '$start_time',
                            end_time: '$end_time',
                            browser: '$browser.name',
                            total_duration: '$total_duration',
                            active_seconds: '$active_seconds',
                        },
                    },
                },
            },
            { $sort: { active_seconds: -1 } },
            { $skip: skip },
            { $limit: limit },
            // { $project: { _id: 0 } }
        ]);
    }

    static getBrowserHistoryCustom({ attendance_ids, skip, limit }) {
        return EmpActivities.aggregate([
            {
                $match: {
                    attendance_id: { $in: attendance_ids },
                    domain_id: { $ne: null },
                },
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
            { $unwind: '$domain' },
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
                    as: 'browser',
                },
            },
            { $unwind: '$browser' },
            {
                $group: {
                    _id: '$domain_id',
                    domain: { $first: '$domain.name' },
                    total_duration: { $sum: '$total_duration' },
                    active_seconds: { $sum: '$active_seconds' },
                },
            },
            { $sort: { active_seconds: -1 } },
        ]);
    }

    static getApplicationsUsedCount(attendance_ids) {
        return EmpActivities.distinct('application_id', {
            attendance_id: { $in: attendance_ids },
            application_id: { $ne: null },
            domain_id: { $eq: null },
        });
    }

    static getApplicationsUsed({ attendance_ids, skip, limit }) {
        return EmpActivities.aggregate([
            {
                $match: {
                    attendance_id: { $in: attendance_ids },
                    application_id: { $ne: null },
                    domain_id: { $eq: null },
                },
            },
            {
                $project: {
                    application_id: 1,
                    title: { $ifNull: ['$title', ''] },
                    start_time: 1,
                    end_time: 1,
                    total_duration: 1,
                    active_seconds: 1,
                },
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
            { $unwind: '$app' },
            {
                $group: {
                    _id: '$application_id',
                    app_name: { $first: '$app.name' },
                    total_duration: { $sum: '$total_duration' },
                    active_seconds: { $sum: '$active_seconds' },
                    applications: {
                        $push: {
                            name: '$app.name',
                            title: '$title',
                            start_time: '$start_time',
                            end_time: '$end_time',
                            total_duration: '$total_duration',
                            active_seconds: '$active_seconds'
                        },
                    },
                },
            },
            { $sort: { active_seconds: -1 } },
            { $skip: skip },
            { $limit: limit },
            // { $project: { _id: 0 } }
        ]);
    }

    static getApplicationsUsedCustom({ attendance_ids, skip, limit }) {
        return EmpActivities.aggregate([
            {
                $match: {
                    attendance_id: { $in: attendance_ids },
                    application_id: { $ne: null },
                    domain_id: { $eq: null },
                },
            },
            {
                $project: {
                    application_id: 1,
                    title: { $ifNull: ['$title', ''] },
                    start_time: 1,
                    end_time: 1,
                    total_duration: 1,
                    active_seconds: 1,
                },
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
            { $unwind: '$app' },
            {
                $group: {
                    _id: '$application_id',
                    app_name: { $first: '$app.name' },
                    total_duration: { $sum: '$total_duration' },
                    active_seconds: { $sum: '$active_seconds' },
                },
            },
            { $sort: { active_seconds: -1 } },
        ]);
    }

    static getKeyStrokesCount(attendance_ids) {
        return EmpActivities.countDocuments({
            attendance_id: { $in: attendance_ids },
            keystrokes: { $ne: '' },
        });
        // return EmpKeyStrokesModel.countDocuments({ attendance_id: { $in: attendance_ids } })
    }

    static async  getAllActiveEmployeeIds(organizationId, department_id,sortColumn = '', sortOrder = '', employeeId = 0) {
        let queryValueArr = [organizationId];
        let order = 'DESC';
        let column = '';
        if (sortOrder.toUpperCase() != 'D') {
            order = "ASC";
        }

        switch (sortColumn) {
            case 'firstname':
                column = "u.first_name"
                break;
            case 'email':
                column = "u.a_email"
                break;
            case 'location':
                column = "ol.name"
                break;
            case 'department':
                column = "od.name"
                break;
            default:
                column = "e.created_at";
                order = "DESC"
                break;
        }
        let query = `
            SELECT 
                e.id
            FROM employees e
            INNER JOIN users u on u.id = e.user_id
            LEFT JOIN organization_locations ol ON e.location_id = ol.id
            LEFT JOIN organization_departments od ON od.id = e.department_id
            WHERE 
                e.organization_id = ?
        `;
        if (employeeId) {
            query +=`  AND e.id = ?`;
            queryValueArr.push(employeeId);
        }
        if (department_id) {
            query +=`  AND e.department_id = ?`;
            queryValueArr.push(department_id);
        }

        query +=  ` AND u.status = "1" ORDER BY ${column} ${order}`;
        return mySql.query(query, queryValueArr);
    }

    static getKeyStrokesData(attendance_ids) {
        return EmpActivities.aggregate([
            {
                $match: {
                    attendance_id: { $in: attendance_ids },
                    keystrokes_count: { $ne: 0 },
                    keystrokes: { $ne: '' },
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
            { $unwind: { path: '$domain', preserveNullAndEmptyArrays: true } },
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
            { $unwind: '$app' },
            { $sort: { start_time: -1 } },
            {
                $project: {
                    _id: 0,
                    app_name: '$app.name',
                    domain_name: '$domain.name',
                    attendance_id: 1,
                    start_time: 1,
                    end_time: 1,
                    keystrokes_count: 1,
                    keystrokes: 1,
                },
            },
        ]);
    }
    static getKeyStrokes(attendance_ids, skip, limit) {
        return EmpActivities.aggregate([
            {
                $match: {
                    attendance_id: { $in: attendance_ids },
                    keystrokes_count: { $ne: 0 },
                    keystrokes: { $ne: '' },
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
            { $unwind: { path: '$domain', preserveNullAndEmptyArrays: true } },
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
            { $unwind: '$app' },
            { $sort: { start_time: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    app_name: '$app.name',
                    domain_name: '$domain.name',
                    attendance_id: 1,
                    start_time: 1,
                    end_time: 1,
                    keystrokes_count: 1,
                    keystrokes: 1,
                },
            },
        ]);
    }

    static getAttandanceIds({ organization_id, employee_id, startDate, endDate }) {
        const query = `
            SELECT ea.id AS attendance_id,e.department_id
            FROM employee_attendance ea
            JOIN employees e ON e.id=ea.employee_id
            WHERE
                ea.organization_id = ${organization_id} AND
                ea.employee_id = ${employee_id} AND
                ea.date BETWEEN "${startDate}" AND "${endDate}"
        `;

        return mySql.query(query);
    }
   
    static getAttandanceIds_new({ organization_id, employee_ids, startDate, endDate }) {
        const query = `
            SELECT ea.id AS attendance_id,e.department_id, e.id as employee_id
            FROM employee_attendance ea
            JOIN employees e ON e.id=ea.employee_id
            WHERE
                ea.organization_id = ${organization_id} AND
                ea.employee_id IN (${employee_ids}) AND
                ea.date BETWEEN "${startDate}" AND "${endDate}"
        `;

        return mySql.query(query);
    }
_
    static getOrganizationShift(ShiftsId) {
        const query = `SELECT os.name, os.data, os.id, ol.timezone, os.late_period, os.early_login_logout_time, os.half_day_hours
        FROM organization_shifts os
        LEFT JOIN organization_locations ol ON ol.id = os.location_id
        WHERE os.id IN (?);`;
        const paramsArray = [ShiftsId];

        return mySql.query(query, paramsArray);
    }
    static getOrganizationShifts(ShiftsId) {
        const query = `SELECT os.name, os.data, os.id, ol.timezone, os.late_period, os.early_login_logout_time, os.half_day_hours,os.overtime_period,os.productivity_halfday,os.productivity_present
        FROM organization_shifts os
        LEFT JOIN organization_locations ol ON ol.id = os.location_id
        WHERE os.id IN (?);`;
        const paramsArray = [ShiftsId];

        return mySql.query(query, paramsArray);
    }

    static async getOrgTimezone(organization_id) {
        const query = `SELECT timezone
        FROM organizations
        WHERE id = ?;`;
        const paramsArray = [organization_id];
        const [orgData] = await mySql.query(query, paramsArray)

        return orgData.timezone;
    }

    static async getEmpPageCount({ organization_id, queries, limit, employee_ids, shift_id = -1 }) {
        const сonditionQuery = EmpHelper.parseConditionQuery(queries);
        let query = `SELECT COUNT(*) as count FROM employees e 
        JOIN users u ON u.id = e.user_id 
        JOIN organization_departments od ON od.id = e.department_id
        JOIN organization_locations ol ON ol.id = e.location_id 
        WHERE e.organization_id = ? `;
        if (employee_ids) { query += `AND e.id IN (${employee_ids}) ` }
        if (!Number.isNaN(shift_id) && shift_id !== -1 && shift_id) {
            query += `AND e.shift_id = ${shift_id}`
        }
        query += `${сonditionQuery} GROUP BY e.organization_id`
        const paramsArray = [organization_id];
        const dbRes = await mySql.query(query, paramsArray);
        const count = dbRes.reduce((acc, row) => acc += row.count, 0);
        const pageCount = EmpHelper.findPageCount(limit, count);

        const data = {
            pageCount,
            сonditionQuery,
            empCount: count
        };

        return data;
    }

    static async getEmployeeForAttSheet({ organization_id, сonditionQuery, sortQuery, limitInstruction, employee_ids, shift_id = -1 }) {
        const сondition = сonditionQuery + sortQuery + limitInstruction;

        let query = `SELECT e.id, e.shift_id, e.emp_code,e.timezone, u.first_name, u.last_name, od.name as departament, ol.name as location, e.organization_id as oID 
        FROM employees e
        JOIN users u ON u.id = e.user_id 
        JOIN organization_departments od ON od.id = e.department_id
        JOIN organization_locations ol ON ol.id = e.location_id 
        WHERE e.organization_id = ? `;
        const paramsArray = [organization_id];
        if (employee_ids) { query += `AND e.id IN (${employee_ids}) ` }
        if (!Number.isNaN(shift_id) && shift_id !== -1 && shift_id) {
            query += `AND e.shift_id = ${shift_id} `;
        }
        query += `${сondition}`
        return mySql.query(query, paramsArray);
    }

    static getAttendanceSheet({ organization_id, employeesId, date }) {
        const { start, end } = EmpHelper.getAttMonthRangeDate(date);
        const query = `SELECT 
        date, start_time as start, end_time as end, employee_id
        FROM employee_attendance 
        WHERE organization_id = ? 
        AND employee_id IN (?) 
        AND date BETWEEN ? AND ?
        ORDER BY date`;
        const paramsArray = [organization_id, employeesId, start, end];

        return mySql.query(query, paramsArray);
    }

    /**
     * @param {Array<String>} application_ids
     * @memberof UserModel
     */
    static async getApplicationsProductivity(applicationIds, department_id) {
        try {
            const statusesRecords = await OrgDeptAppWebModel.find({
                application_id: { $in: applicationIds },
                department_id: null,
                type: 1,
            }).lean();
            const statuses = _.object(statusesRecords.map(item => [item.application_id, item.status]));
            const depStatusesRecords = await OrgDeptAppWebModel.find({
                application_id: { $in: applicationIds },
                department_id: department_id,
            }).lean();
            const depStatuses = {};
            for (const record of depStatusesRecords) {
                if (!(record.application_id in depStatuses)) {
                    depStatuses[record.application_id] = {};
                }
                depStatuses[record.application_id][record.department_id] = record.status;
            }
            const result = {};
            for (const applicationId of applicationIds) {
                if (applicationId in statuses) {
                    result[applicationId] = { '0': statuses[applicationId] };
                } else if (applicationId in depStatuses) {
                    result[applicationId] = depStatuses[applicationId];
                } else {
                    result[applicationId] = { '0': 0 };
                }
            }
            return Promise.resolve(result);
        } catch (err) {
            return Promise.reject(err);
        }
    }


    static urlPredictionData(category, attendance_ids, skip, limit, sortBy = "date", order = "D", search) {
        let searchFilter = { $match: { 'domain.name': { $ne: null } } }
        if (search) searchFilter = {
            $match:
            {
                $or: [{ 'domain.name': { $regex: new RegExp(search, "i") } },
                { todate: { $regex: new RegExp(search) } },
                { 'domain.prediction': { $regex: new RegExp(search, "i") } },
                { 'category.name': { $regex: new RegExp(search, "i") } }
                ]
            }
        }
        let sort;
        order = order == "D" ? -1 : 1;
        switch (sortBy) {
            case 'url':
                sort = { url: order };
                break;
            case 'date':
                sort = { date: order };
                break;
            case 'prediction':
                sort = { prediction: order };
                break;
            case 'domain':
                sort = { 'domain': order };
                break;
            case 'category':
                sort = { 'category': order };
                break;
            default:
                sort = { date: -1 };
                break;
        }
        let filter = { 'attendance_id': { '$in': attendance_ids }, 'domain_id': { '$ne': null }, 'url': { '$ne': null } }
        let cat_filter = { $match: { 'category.name': { $ne: "" } } };
        if (category) {
            cat_filter = { $match: { 'category._id': new mongoose.Types.ObjectId(category) } }
        }
        return EmpActivities.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'organization_apps_webs',
                    let: { domain_id: '$domain_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$domain_id'] } } },
                        { $project: { name: 1, prediction: 1, category_ids: 1 } },
                    ],
                    as: 'domain',
                },
            },
            {
                $addFields: {
                    todate: { $dateToString: { format: "%Y-%m-%d", date: "$start_time" } },

                }
            },
            // searchFilter,
            { $unwind: '$domain' },
            {
                $lookup: {
                    from: "organization_categories",
                    localField: "domain.category_ids",
                    foreignField: "_id",
                    as: "category"
                }
            },
            cat_filter,
            searchFilter,

            {
                $group: {
                    _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$start_time" } }, domain_name: '$domain.name', prediction: '$domain.prediction', category: "$category.name" },
                    urls: { $push: { url: "$url", created_at: "$createdAt" } }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id.date",
                    prediction: '$_id.prediction',
                    urls: "$urls",
                    domain: '$_id.domain_name',
                    category: '$_id.category'
                },
            },
            { $sort: sort },
            { $skip: skip }, { $limit: limit },
        ]);
    }
    static async urlPredictionCount(category, attendance_ids, search) {
        let searchFilter = { $match: { 'domain.name': { $ne: null } } }
        if (search) searchFilter = {
            $match:
            {
                $or: [{ 'domain.name': { $regex: new RegExp(search, "i") } },
                { todate: { $regex: new RegExp(search) } },
                { 'domain.prediction': { $regex: new RegExp(search, "i") } },
                { 'category.name': { $regex: new RegExp(search, "i") } }
                ]
            }
        }
        let filter = { attendance_id: { $in: attendance_ids }, domain_id: { $ne: null }, url: { $ne: null } }
        let cat_filter = { $match: { 'category.name': { $ne: "" } } };
        if (category) {
            cat_filter = { $match: { 'category._id': new mongoose.Types.ObjectId(category) } }
        }
        return EmpActivities.aggregate([
            { $match: filter },
            {
                $lookup:
                {
                    from: "organization_apps_webs",
                    localField: "domain_id",
                    foreignField: "_id",
                    as: "domain"
                }
            },
            {
                $addFields: {
                    todate: { $dateToString: { format: "%Y-%m-%d", date: "$start_time" } },

                }
            },

            // searchFilter,
            { $unwind: '$domain' },
            {
                $lookup: {
                    from: "organization_categories",
                    localField: "domain.category_ids",
                    foreignField: "_id",
                    as: "category"
                }
            },
            cat_filter,
            searchFilter,
            {
                $group: {
                    _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$start_time" } }, domain_name: '$domain.name', prediction: '$domain.prediction', category: "$category.name" },
                }
            },
            {
                $count: "total"
            }
        ]);

    }

    static getAttandanceDetails({ organization_id, employee_id, startDate, endDate, }) {
        let query = `
            SELECT ea.id AS attendance_id,e.department_id, ea.date
            FROM employee_attendance ea
            JOIN employees e ON e.id=ea.employee_id
            WHERE
                ea.organization_id = ${organization_id} AND
                ea.employee_id = ${employee_id} AND
                ea.date BETWEEN "${startDate}" AND "${endDate}"`;

        return mySql.query(query);
    }

    static async getConversationClassification(organization_id, employee_id, startDate, endDate) {
        return ConvesationClassificationModel.aggregate(
            [
                {
                    $match: { employee_id: employee_id, date: { $gte: startDate, $lte: endDate } }
                },
                {
                    $group:
                    {
                        _id: "$employee_id",
                        offensive: { $avg: "$prediction" },
                    }
                },
                {
                    $addFields: {
                        normal:
                            { $subtract: [100, "$offensive"] },
                    }
                },
                {
                    $project: {
                        _id: 0,
                        employee_id: "$_id",
                        offensive: 1,
                        normal: 1,
                        // offensive: { $round: ["$offensive", 4] },
                        // normal: { $round: ["$normal", 4] },
                    }
                }
            ]
        )
    }
    static async getSentiData(employee_id, from_date, to_date) {

        return EmpProductivityReportSchema.aggregate([
            {
                $match: { date: { $gte: from_date, $lte: to_date }, employee_id: employee_id }
            },
            {
                $group: {
                    _id: "$employee_id",
                    positive: { $avg: "$sentimentalAnalysis.positive" },
                    negative: { $avg: "$sentimentalAnalysis.negative" },
                    neutral: { $avg: "$sentimentalAnalysis.neutral" },
                    risk_score: { $avg: "$risk_percentage" },
                }
            },
            {
                $project: {
                    positive: 1,
                    negative: 1,
                    neutral: 1,
                    risk_score: 1,
                    _id: 0
                }
            }
        ])
        // return EmpProductivityReportSchema.find({ 'date': { $gte: from_date, $lte: to_date }, 'employee_id': employee_id }, { sentimentalAnalysis: 1, _id: 0, date: 1 })
    }

    get shift() {
        if (!this.shift_id) return Promise.resolve();
        if (this._shift) return Promise.resolve(this._shift);
        return OrganizationShifts.OrganizationShiftsModel
            .get(this.shift_id)
            .then((shift) => {
                this._shift = shift;
                return shift;
            })
            .catch((err) => {
                return Promise.resolve();
            });
    }

    static async getAppOffensiveWords(organization_id, employee_id, startDate, endDate, sortBy, order = "D") {

        return await ConvesationClassificationModel.aggregate([
            {
                $match: {
                    $or: [
                        {
                            offensive_words: { $nin: [null, ""] },
                        },
                        {
                            $or: [{ "sentimentalAnalysis.negative_sentences": { $exists: true, $not: { $size: 0 } } },
                            { "sentimentalAnalysis.positive_sentences": { $exists: true, $not: { $size: 0 } } }]
                        }],
                    employee_id: employee_id,
                    date: { $gte: startDate, $lte: endDate },
                    // organization_id: organization_id
                }

                // $match: { offensive_words: { $nin: [null, ""] }, employee_id: employee_id, date: { $gte: startDate, $lte: endDate }, organization_id: organization_id }
            },
            {
                $lookup: {
                    from: 'organization_apps_webs',
                    let: { app_id: '$application_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$app_id'] } } },
                        { $project: { name: 1, _id: 0 } },
                    ],
                    as: 'apps',
                },
            },
            { $unwind: "$apps" },
            // { $sort: sort },
            {
                $project: {
                    offensive_words: 1,
                    app: "$apps.name",
                    _id: 0,
                    date: 1,
                    positive_sentences: "$sentimentalAnalysis.positive_sentences",
                    negative_sentences: "$sentimentalAnalysis.negative_sentences",

                }
            }
        ])
    }

    static async getURLCategoryConeection(attendanceData, organization_id) {
        return await EmpActivities.aggregate([
            { $match: { attendance_id: { $in: attendanceData }, domain_id: { $ne: null }, url: { $ne: null } } },
            {
                $lookup: {
                    from: "organization_apps_webs",
                    localField: "domain_id",
                    foreignField: "_id",
                    as: "domain"
                }
            },
            { $match: { "domain.prediction": { $exists: true, $ne: null }, "domain.category_ids": { $exists: true, $not: { $size: 0 } } } },
            { $unwind: "$domain" },
            {
                $lookup: {
                    from: "organization_categories",
                    localField: "domain.category_ids",
                    foreignField: "_id",
                    as: "category"
                }
            },
            { $unwind: "$category" },
            {
                $group: {
                    _id: { cat: "$category.name", pre: "$domain.prediction" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    count: 1,
                    category: "$_id.cat",
                    connection: "$_id.pre"

                }
            },
            {
                $group: {
                    _id: "$category",
                    details: { $push: { connection: "$connection", count: "$count" } }
                }
            },
        ])
    }
    /**
     * calculating the productivity based on date
     * 
     * @function getProductivity
     * @memberof  EmployeeController
     * @param {Number} employee_id 
     * @param {Date} date 
     * @param {Number} organization_id  
     * @returns {object} array object or empty array
     */
    static async getProductivity(employee_id, date, organization_id) {
        let match = { date };
        let group = {
            date: { "$first": "$date" },
            productive_duration: { $sum: '$productive_duration' },
            non_productive_duration: { $sum: '$non_productive_duration' },
            neutral_duration: { $sum: '$neutral_duration' },
            idle_duration: { $sum: '$idle_duration' },
            break_duration: { $sum: '$break_duration' },
            count: { $sum: 1 }
        };
        if (!organization_id) {
            match = { employee_id, ...match };
            group = { _id: { employee_id: "$employee_id", date: "$date" }, ...group };
        }
        else {
            match = { organization_id, ...match };
            group = { _id: { organization_id: "$organization_id", date: "$date" }, ...group };
        }
        return EmpProductivityReportsModel.aggregate([{ $match: match }, { $sort: { date: -1 } }, { $group: group }]);
    }

    /**
     * get assigned employees to manager
     * 
     * @function getEmployeeAssignedToManager
     * @memberof  EmployeeModel
     * @param {Number} manager_id  
     * @param {Number} role_id 
     * @returns {object} array or empty array
    */
    static async getEmployeeAssignedToManager(manager_id, role_id) {
        let query = `
            SELECT employee_id
            FROM assigned_employees
            WHERE to_assigned_id=?
        `;
        if(role_id) query += ` AND role_id = ?`;
        return mySql.query(query, [manager_id, role_id])
    }

    /**
     * getEmployeeRoomId - room id of the employee
     * 
     * @param {*} organization_id 
     * @param {*} employee_id 
     * @returns {Array}
     * @author Amit Verma <amitverma@globussoft.in>
     */
    static async getEmployeeRoomId(organization_id, employee_id) {
        const query = `
            SELECT 
                id, room_id
            FROM employees
            WHERE 
                organization_id = ? AND
                id = ?
        `;
        return mySql.query(query, [organization_id, employee_id]);
    }

    static async getAppDomainId(attendance_id) {
        return EmpActivities.aggregate([
            {
                $match: {
                    "attendance_id": { $in: attendance_id }
                }
            },
            {
                $project: {
                    application_id: 1,
                    domain_id: 1,
                    _id: 0
                }
            }
        ])
    }

    static async getAppDomainId(attendance_id) {
        return EmpActivities.aggregate([
            {
                $match: {
                    "attendance_id": { $in: attendance_id }
                }
            },
            {
                $project: {
                    application_id: 1,
                    domain_id: 1,
                    _id: 0
                }
            }
        ])
    }

    static async getAppUsageRecord(attendance_ids, application_ids, skip, limit) {
        return EmpActivities.aggregate(
            [
                {
                    '$match': {
                        'attendance_id': {
                            '$in': attendance_ids
                        },
                        'application_id': {
                            '$in': application_ids
                        },
                        domain_id: null
                    }
                }, {
                    '$lookup': {
                        'from': 'organization_apps_webs',
                        'localField': 'application_id',
                        'foreignField': '_id',
                        'as': 'organization_apps_webs'
                    }
                }, {
                    '$unwind': '$organization_apps_webs'
                }, {
                    '$project': {
                        '_id': 0,
                        'start_time': 1,
                        'end_time': 1,
                        'total_duration': 1,
                        'active_seconds': 1,
                        'title': 1,
                        'url': 1,
                        'organization_apps_webs.name': 1
                    }
                },
                { 
                    $sort: { 
                        active_seconds: -1
                    } 
                },
                { 
                    $skip: skip 
                },
                { 
                    $limit: limit 
                },
            ]
        )
    }

    static async getAppUsageRecordCount(attendance_ids, application_ids) {
        return EmpActivities.aggregate(
            [
                {
                    '$match': {
                        'attendance_id': {
                            '$in': attendance_ids
                        },
                        'application_id': {
                            '$in': application_ids
                        },
                        domain_id: null
                    }
                }, {
                    '$lookup': {
                        'from': 'organization_apps_webs',
                        'localField': 'application_id',
                        'foreignField': '_id',
                        'as': 'organization_apps_webs'
                    }
                }, {
                    '$unwind': '$organization_apps_webs'
                }, {
                    '$project': {
                        '_id': 0,
                        'start_time': 1,
                        'end_time': 1,
                        'total_duration': 1,
                        'active_seconds': 1,
                        'title': 1,
                        'url': 1,
                        'organization_apps_webs.name': 1
                    }
                },
                { 
                    $sort: { 
                        active_seconds: -1
                    } 
                },
                {
                    $group: {
                        _id: null,
                        count: {
                          $sum: 1,
                        },
                    }
                },
                {
                    $unwind: "$count"
                }
            ]
        )
    }

    static async getWebUsageRecord(attendance_ids, application_ids, skip, limit) {
        return EmpActivities.aggregate(
            [
                {
                    '$match': {
                        'attendance_id': {
                            '$in': attendance_ids
                        },
                        'domain_id': {
                            '$in': application_ids
                        },
                    }
                }, {
                    '$lookup': {
                        'from': 'organization_apps_webs',
                        'localField': 'domain_id',
                        'foreignField': '_id',
                        'as': 'organization_apps_webs'
                    }
                }, {
                    '$unwind': '$organization_apps_webs'
                }, {
                    '$project': {
                        '_id': 0,
                        'start_time': 1,
                        'end_time': 1,
                        'total_duration': 1,
                        'active_seconds': 1,
                        'title': 1,
                        'url': 1,
                        'organization_apps_webs.name': 1
                    }
                },
                { 
                    $sort: { 
                        active_seconds: -1
                    } 
                },
                { 
                    $skip: skip 
                },
                { 
                    $limit: limit 
                },
            ]
        )
    }

    static async getWebUsageRecordCount(attendance_ids, application_ids) {
        return EmpActivities.aggregate(
            [
                {
                    '$match': {
                        'attendance_id': {
                            '$in': attendance_ids
                        },
                        'domain_id': {
                            '$in': application_ids
                        },
                    }
                }, {
                    '$lookup': {
                        'from': 'organization_apps_webs',
                        'localField': 'domain_id',
                        'foreignField': '_id',
                        'as': 'organization_apps_webs'
                    }
                }, {
                    '$unwind': '$organization_apps_webs'
                }, {
                    '$project': {
                        '_id': 0,
                        'start_time': 1,
                        'end_time': 1,
                        'total_duration': 1,
                        'active_seconds': 1,
                        'title': 1,
                        'url': 1,
                        'organization_apps_webs.name': 1
                    }
                },
                { 
                    $sort: { 
                        active_seconds: -1
                    } 
                },
                {
                    $group: {
                        _id: null,
                        count: {
                          $sum: 1,
                        },
                    }
                },
                {
                    $unwind: "$count"
                }
            ]
        )
    }

    static getEmployeeGeolocationLogs({ organization_id, employee_id, start_date, end_date }) {
        return GeoLocationChangeLogModel.aggregate([
            {
                $match: {
                    organization_id: organization_id,
                    employee_id: employee_id,
                    time: {
                        $gte: new Date(start_date).getTime(),
                        $lte: new Date(end_date).getTime()
                    }
                }
            },
            {
                $sort: { time: -1 }
            }
        ]);
    }

    static getEmployeeGeolocationLogsCount({ organization_id, employee_id, start_date, end_date }) {
        return GeoLocationChangeLogModel.countDocuments({
            organization_id: organization_id,
            employee_id: employee_id,
            time: {
                $gte: new Date(start_date).getTime(),
                $lte: new Date(end_date).getTime()
            }
        });
    }
}

module.exports = EmployeeModel;
