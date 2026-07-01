const moment = require('moment');
const mongoose = require('mongoose')

const mySql = require('../../../database/MySqlConnection').getInstance();
const EmpProductivityReportsModel = require('../../../models/employee_productivity.schema');

class DashboardModel {
    //TODO: MERGE getRegisteredEmp() and getSuspendedEmp() into single function
    getRegisteredEmp(organization_id, manager_id, to_assigned_role) {
        let query = `
            SELECT
                e.id,
                CONCAT(u.first_name, ' ', u.last_name) AS name,
                u.a_email AS email, e.emp_code,
                l.id AS location_id,
                l.name AS location_name,
                d.id AS department_id,
                d.name AS department_name
            FROM employees                      AS e
            LEFT JOIN users    					AS u ON u.id = e.user_id
            LEFT JOIN organization_locations    AS l ON l.id = e.location_id
            LEFT JOIN organization_departments  AS d ON d.id = e.department_id
            WHERE e.organization_id = ${organization_id};
        `;

        if (manager_id) {
            query = `
                SELECT
                    e.id,
                    CONCAT(u.first_name, ' ', u.last_name) AS name,
                    u.a_email AS email, e.emp_code,
                    l.id AS location_id,
                    l.name AS location_name,
                    d.id AS department_id,
                    d.name AS department_name
                FROM assigned_employees             AS ae
                LEFT JOIN employees                 AS e ON ae.employee_id = e.id
                LEFT JOIN users                     AS u ON u.id = e.user_id
                LEFT JOIN organization_locations    AS l ON l.id = e.location_id
                LEFT JOIN organization_departments  AS d ON d.id = e.department_id
                WHERE ae.to_assigned_id = ${manager_id} AND  ae.role_id = ${to_assigned_role} 
                AND e.organization_id = ${organization_id};
            `;
        }

        return mySql.query(query);
    }
    getSuspendedEmp(organization_id, manager_id, to_assigned_role) {
        let query = `
            SELECT
                e.id,
                CONCAT(u.first_name, ' ', u.last_name) AS name,
                u.a_email AS email, e.emp_code,
                u.status,
                l.id AS location_id,
                l.name AS location_name,
                d.id AS department_id,
                d.name AS department_name
            FROM employees                      AS e
            INNER JOIN users    				AS u ON u.id = e.user_id
            LEFT JOIN organization_locations    AS l ON l.id = e.location_id
            LEFT JOIN organization_departments  AS d ON d.id = e.department_id
            WHERE e.organization_id = ${organization_id} AND u.status=2;
        `;

        if (manager_id) {
            query = `
                SELECT
                    e.id,
                    CONCAT(u.first_name, ' ', u.last_name) AS name,
                    u.a_email AS email, e.emp_code,
                    l.id AS location_id,
                    l.name AS location_name,
                    d.id AS department_id,
                    d.name AS department_name
                FROM assigned_employees             AS ae
                LEFT JOIN employees                 AS e ON ae.employee_id = e.id
                LEFT JOIN users                     AS u ON u.id = e.user_id
                LEFT JOIN organization_locations    AS l ON l.id = e.location_id
                LEFT JOIN organization_departments  AS d ON d.id = e.department_id
                WHERE e.organization_id = ${organization_id} AND ae.to_assigned_id = ${manager_id} AND u.status=2 
                AND ae.role_id = ${to_assigned_role} ;
            `;
        }

        return mySql.query(query);
    }

    getAbsentEmp(organization_id, manager_id, date, to_assigned_role) {
        let query = `
            SELECT
                e.id,
                CONCAT(u.first_name, ' ', u.last_name) AS name,
                u.a_email AS email, e.emp_code,
                l.id AS location_id,
                l.name AS location_name,
                d.id AS department_id,
                d.name AS department_name
            FROM employees                      AS e
            LEFT JOIN employee_attendance			AS ea ON e.id = ea.employee_id AND ea.date = "${date}"
            LEFT JOIN users    						AS u  ON u.id = e.user_id
            LEFT JOIN organization_locations    AS l  ON l.id = e.location_id
            LEFT JOIN organization_departments  AS d  ON d.id = e.department_id
            WHERE e.organization_id = ${organization_id} AND ea.id IS NULL AND u.status != 2;
        `;

        if (manager_id) {
            query = `
                SELECT
                    e.id,
                    CONCAT(u.first_name, ' ', u.last_name) AS name,
                    u.a_email AS email, e.emp_code,
                    l.id AS location_id,
                    l.name AS location_name,
                    d.id AS department_id,
                    d.name AS department_name
                FROM assigned_employees             AS ae
                LEFT JOIN employees                 AS e ON e.id = ae.employee_id
                LEFT JOIN employee_attendance		AS ea ON e.id = ea.employee_id AND ea.date = "${date}"
                LEFT JOIN users                     AS u ON u.id = e.user_id
                LEFT JOIN organization_locations    AS l ON l.id = e.location_id
                LEFT JOIN organization_departments  AS d ON d.id = e.department_id
                WHERE e.organization_id = ${organization_id} AND ae.to_assigned_id = ${manager_id} AND ea.id IS NULL AND u.status != 2
                AND ae.role_id = ${to_assigned_role};
            `;
        }

        return mySql.query(query);
    }

    //TODO: MERGE getOnlineEmp() and getOfflineEmp() into single function
    getOnlineEmp(organization_id, manager_id, date, to_assigned_role) {
        const from_date = moment().utc().subtract(15, 'minutes').format('YYYY-MM-DD HH:mm:ss');
        const to_date = moment().utc().format('YYYY-MM-DD HH:mm:ss');
        let query = `
            SELECT
                e.id,
                CONCAT(u.first_name, ' ', u.last_name) AS name,
                u.a_email AS email, e.emp_code,
                u.photo_path,ea.end_time,
                l.id AS location_id,
                l.name AS location_name,
                d.id AS department_id,
                d.name AS department_name,
                os.data AS shift,e.timezone,
                JSON_EXTRACT(e.custom_tracking_rule,'$.tracking') AS tracking,
                JSON_EXTRACT(e.custom_tracking_rule,'$.trackingMode') AS trackingMode
            FROM employees                      AS e
            LEFT JOIN employee_attendance 		AS ea ON e.id = ea.employee_id
            LEFT JOIN users                     AS u  ON u.id = e.user_id
            LEFT JOIN organization_locations    AS l  ON l.id = e.location_id
            LEFT JOIN organization_departments  AS d  ON d.id = e.department_id
            LEFT JOIN organization_shifts       AS os ON os.id= e.shift_id
            WHERE
                e.organization_id = ${organization_id} AND
                ea.organization_id = ${organization_id} AND
                ea.date = "${date}" AND
                (ea.end_time BETWEEN "${from_date}" AND "${to_date}" OR ea.end_time >= "${to_date}") AND u.status != 2;
        `;

        if (manager_id) {
            query = `
                SELECT
                    e.id,
                    CONCAT(u.first_name, ' ', u.last_name) AS name,
                    u.a_email AS email, e.emp_code,
                    u.photo_path,ea.end_time,
                    l.id AS location_id,
                    l.name AS location_name,
                    d.id AS department_id,
                    d.name AS department_name,
                    os.data AS shift,e.timezone,
                JSON_EXTRACT(e.custom_tracking_rule,'$.tracking') AS tracking,
                JSON_EXTRACT(e.custom_tracking_rule,'$.trackingMode') AS trackingMode
                FROM assigned_employees             AS ae
                LEFT JOIN employees                 AS e  ON e.id = ae.employee_id
                LEFT JOIN employee_attendance 		AS ea ON e.id = ea.employee_id
                LEFT JOIN users                     AS u  ON u.id = e.user_id
                LEFT JOIN organization_locations    AS l  ON l.id = e.location_id
                LEFT JOIN organization_departments  AS d  ON d.id = e.department_id
                LEFT JOIN organization_shifts       AS os ON os.id= e.shift_id
                WHERE
                    e.organization_id = ${organization_id} AND
                    ea.organization_id = ${organization_id} AND
                    ae.to_assigned_id = ${manager_id} AND
                    ea.date = "${date}" AND
                    (ea.end_time BETWEEN "${from_date}" AND "${to_date}" OR ea.end_time >= "${to_date}")
                    AND ae.role_id = ${to_assigned_role} AND u.status != 2;
            `;
        }

        return mySql.query(query);
    }
    getOfflineEmp(organization_id, manager_id, date, to_assigned_role) {
        const from_date = moment().utc().subtract(15, 'minutes').format('YYYY-MM-DD HH:mm:ss');
        const to_date = moment().utc().format('YYYY-MM-DD HH:mm:ss');

        let query = `
            SELECT
                e.id,
                CONCAT(u.first_name, ' ', u.last_name) AS name,
                u.a_email AS email, e.emp_code,
                u.photo_path,ea.end_time,
                l.id AS location_id,
                l.name AS location_name,
                d.id AS department_id,
                d.name AS department_name,
                os.data AS shift,e.timezone,
                JSON_EXTRACT(e.custom_tracking_rule,'$.tracking.fixed') AS tracking,
                JSON_EXTRACT(e.custom_tracking_rule,'$.trackingMode') AS trackingMode
            FROM employees                      AS e
            LEFT JOIN employee_attendance 		AS ea ON e.id = ea.employee_id
            LEFT JOIN users                     AS u  ON u.id = e.user_id
            LEFT JOIN organization_locations    AS l  ON l.id = e.location_id
            LEFT JOIN organization_departments  AS d  ON d.id = e.department_id
            LEFT JOIN organization_shifts       AS os ON os.id= e.shift_id
            WHERE
                e.organization_id = ${organization_id} AND
                ea.organization_id = ${organization_id} AND
                ea.date = "${date}" AND
                ea.end_time NOT BETWEEN "${from_date}" AND "${to_date}" AND  (NOT ea.end_time >= "${to_date}") AND u.status != 2
        `;

        if (manager_id) {
            query = `
                SELECT
                    e.id,
                    CONCAT(u.first_name, ' ', u.last_name) AS name,
                    u.a_email AS email, e.emp_code,
                    u.photo_path,ea.end_time,
                    l.id AS location_id,
                    l.name AS location_name,
                    d.id AS department_id,
                    d.name AS department_name,
                    JSON_EXTRACT(e.custom_tracking_rule,'$.tracking') AS tracking,
                    JSON_EXTRACT(e.custom_tracking_rule,'$.trackingMode') AS trackingMode
                FROM assigned_employees             AS ae
                LEFT JOIN employees                 AS e  ON e.id = ae.employee_id
                LEFT JOIN employee_attendance 		AS ea ON e.id = ea.employee_id
                LEFT JOIN users                     AS u  ON u.id = e.user_id
                LEFT JOIN organization_locations    AS l  ON l.id = e.location_id
                LEFT JOIN organization_departments  AS d  ON d.id = e.department_id
                LEFT JOIN organization_shifts       AS os ON os.id= e.shift_id
                WHERE
                    e.organization_id = ${organization_id} AND
                    ea.organization_id = ${organization_id} AND
                    ae.to_assigned_id = ${manager_id} AND
                    ea.date ="${date}" AND
                    ea.end_time NOT BETWEEN "${from_date}" AND "${to_date}" AND (NOT ea.end_time >= "${to_date}")
                    AND ae.role_id = ${to_assigned_role} AND u.status != 2
                    `;
        }

        return mySql.query(query);
    }

    getEmpOfDeptLocOrOrgByType(search_type, search_data, role_type, role_id, to_assigned_role) {
        let query;
        switch (search_type) {
            case 'organization':
                role_type === 'Admin'
                    ? query = `SELECT id AS employee_id FROM employees WHERE organization_id=${search_data}`
                    : query = `
                        SELECT ae.employee_id
                        FROM assigned_employees     AS ae
                        LEFT JOIN employees         AS e  ON e.id = ae.employee_id
                        WHERE
                            e.organization_id=${search_data} AND
                            ae.to_assigned_id=${role_id} AND
                            ae.role_id=${to_assigned_role}
                    `;
                break;

            case 'location':
                role_type === 'Admin'
                    ? query = `SELECT id AS employee_id FROM employees WHERE location_id=${search_data}`
                    : query = `
                        SELECT ae.employee_id
                        FROM assigned_employees     AS ae
                        LEFT JOIN employees         AS e  ON e.id = ae.employee_id
                        WHERE
                            e.location_id=${search_data} AND
                            ae.to_assigned_id=${role_id} AND
                            ae.role_id=${to_assigned_role}
                    `;
                break;

            case 'department':
                role_type === 'Admin'
                    ? query = `SELECT id AS employee_id FROM employees WHERE department_id=${search_data}`
                    : query = `
                        SELECT ae.employee_id
                        FROM assigned_employees     AS ae
                        LEFT JOIN employees         AS e  ON e.id = ae.employee_id
                        WHERE
                            e.department_id=${search_data} AND
                            ae.to_assigned_id=${role_id} AND
                            ae.role_id=${to_assigned_role}
                    `;
                break;
        }

        return mySql.query(query);
    }

    getEmployeeProductivity({ search_type, search_data, from_date, to_date, role_type }) {
        let match = {
            yyyymmdd: {
                $gte: parseInt(from_date.split('-').join('')),
                $lte: parseInt(to_date.split('-').join(''))
            }
        };
        let group = {
            _id: '$employee_id',
            productive_duration: { $sum: '$productive_duration' },
            non_productive_duration: { $sum: '$non_productive_duration' },
            neutral_duration: { $sum: '$neutral_duration' }
        };

        if (role_type === 'Manager') {
            match = { employee_id: { $in: search_data }, ...match };
        } else {
            switch (search_type) {
                case "organization":
                    match = { organization_id: search_data, ...match };
                    break;

                case "department":
                    match = { department_id: search_data, ...match }
                    break;

                case "location":
                    match = { location_id: search_data, ...match }
                    break;

                default:
                    match = { organization_id: search_data, ...match };
                    break;
            }
        }

        return EmpProductivityReportsModel.aggregate([{ $match: match }, { $group: group }]);
    }
    getLocationProductivity({ search_type, search_data, from_date, to_date, role_type }) {
        let match = {
            yyyymmdd: {
                $gte: parseInt(from_date.split('-').join('')),
                $lte: parseInt(to_date.split('-').join(''))
            }
        };
        let group = {
            _id: '$location_id',
            productive_duration: { $sum: '$productive_duration' },
            non_productive_duration: { $sum: '$non_productive_duration' },
            neutral_duration: { $sum: '$neutral_duration' }
        };

        if (role_type === 'Manager') {
            match = { employee_id: { $in: search_data }, ...match };
        } else {
            switch (search_type) {
                case "organization":
                    match = { organization_id: search_data, ...match };
                    break;

                case "location":
                    match = { location_id: search_data, ...match }
                    break;

                default:
                    match = { organization_id: search_data, ...match };
                    break;
            }
        }

        return EmpProductivityReportsModel.aggregate([{ $match: match }, { $group: group }]);
    }
    getDepartmentProductivity({ search_type, search_data, from_date, to_date, role_type }) {
        let match = {
            yyyymmdd: {
                $gte: parseInt(from_date.split('-').join('')),
                $lte: parseInt(to_date.split('-').join(''))
            }
        };
        let group = {
            _id: '$department_id',
            productive_duration: { $sum: '$productive_duration' },
            non_productive_duration: { $sum: '$non_productive_duration' },
            neutral_duration: { $sum: '$neutral_duration' }
        };

        if (role_type === 'Manager') {
            match = { employee_id: { $in: search_data }, ...match };
        } else {
            switch (search_type) {
                case "organization":
                    match = { organization_id: search_data, ...match };
                    break;

                case "department":
                    match = { department_id: search_data, ...match }
                    break;

                default:
                    match = { organization_id: search_data, ...match };
                    break;
            }
        }

        return EmpProductivityReportsModel.aggregate([{ $match: match }, { $group: group }]);
    }
    getOrganizationProductivity({ role_type, search_data, from_date, to_date }) {
        let match = {
            yyyymmdd: {
                $gte: parseInt(from_date.split('-').join('')),
                $lte: parseInt(to_date.split('-').join(''))
            }
        }

        if (role_type == 'Manager') {
            match = { employee_id: { $in: search_data }, ...match };
        } else {
            match = { organization_id: search_data, ...match };
        }

        return EmpProductivityReportsModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$organization_id',
                    productive_duration: { $sum: '$productive_duration' },
                    non_productive_duration: { $sum: '$non_productive_duration' },
                    neutral_duration: { $sum: '$neutral_duration' }
                }
            }
        ]);
    }

    getEmployeesName(employee_ids) {
        const query = `
            SELECT
                e.id,
                CONCAT(u.first_name, ' ', u.last_name) AS name
            FROM employees                      AS e
            LEFT JOIN users                     AS u  ON u.id = e.user_id
            WHERE e.id IN (${employee_ids.toString()})
        `;

        return mySql.query(query);
    }
    getLocationName(location_ids) {
        const query = `
            SELECT id, name
            FROM organization_locations
            WHERE id IN (${location_ids.toString()})
        `;

        return mySql.query(query);
    }
    getDepartmentName(department_ids) {
        const query = `
            SELECT id, name
            FROM organization_departments
            WHERE id IN (${department_ids.toString()})
        `;

        return mySql.query(query);
    }

    getEmployees(search_type, search_data) {
        let query;
        switch (search_type) {
            case 'location':
                query = `SELECT id AS employee_id FROM employees WHERE location_id=${search_data}`
                break;

            case 'department':
                query = `SELECT id AS employee_id FROM employees WHERE department_id=${search_data}`
                break;

            default:
                query = `SELECT id AS employee_id FROM employees WHERE organization_id=${search_data}`
                break;
        }

        return mySql.query(query);
    }
    getEmployeesManager(search_type, search_data, manager_id, to_assigned_role) {
        let query;
        switch (search_type) {
            case 'location':
                query = `
                    SELECT ae.employee_id
                    FROM assigned_employees     AS ae
                    LEFT JOIN employees         AS e  ON e.id = ae.employee_id
                    WHERE
                        e.location_id=${search_data} AND
                        ae.to_assigned_id=${manager_id} AND
                        ae.role_id=${to_assigned_role}
                `;
                break;

            case 'department':
                query = `
                    SELECT ae.employee_id
                    FROM assigned_employees     AS ae
                    LEFT JOIN employees         AS e  ON e.id = ae.employee_id
                    WHERE
                        e.department_id=${search_data} AND
                        ae.to_assigned_id=${manager_id} AND
                        ae.role_id=${to_assigned_role}
                `;
                break;

            default:
                query = `
                    SELECT ae.employee_id
                    FROM assigned_employees     AS ae
                    LEFT JOIN employees         AS e  ON e.id = ae.employee_id
                    WHERE
                        e.organization_id=${search_data} AND
                        ae.to_assigned_id=${manager_id} AND
                        ae.role_id=${to_assigned_role}
                `;
                break;
        }

        return mySql.query(query);
    }

    getActiveEmployeesCount(employee_ids, from_date, to_date) {
        if (employee_ids.length === 0) return Promise.resolve([]);

        const query = `
            SELECT date, COUNT(*) AS activeEmployeesCount
            FROM employee_attendance
            WHERE
                date BETWEEN "${from_date}" AND "${to_date}"
                AND employee_id IN (${employee_ids.toString()})
            GROUP BY date;
        `;

        return mySql.query(query);
    }

    /**
     * 
     * @param {Object} dataObj 
     * @param {Number} dataObj.type 
     * @param {Number} dataObj.manager_id 
     * @param {Array<Number>} dataObj.search_data 
     * @param {String} dataObj.start_date 
     * @param {String} dataObj.end_date 
     */
    getTopAppWeb(dataObj) {
        const { type, manager_id, search_data, start_date, end_date } = dataObj;
        let match = {
            yyyymmdd: {
                $gte: parseInt(start_date.split('-').join('')),
                $lte: parseInt(end_date.split('-').join(''))
            }
        };

        switch (type) {
            case 1:
                match = manager_id
                    ? { employee_id: { $in: search_data }, ...match }
                    : { organization_id: { $in: search_data }, ...match };
                break;

            case 2:
                match = manager_id
                    ? { employee_id: { $in: search_data }, ...match }
                    : { organization_id: { $in: search_data }, ...match };
                break;

            default:
                return Promise.resolve([]);
                break;
        }

        const query = [
            { $match: match },
            { $project: { applications: 1 } },
            { $unwind: "$applications" },
            { $match: { 'applications.application_type': type } },
            { $project: { applications: { application_id: '$applications.application_id', total: '$applications.total', idle: '$applications.idle' } } },
            { $group: { _id: '$applications.application_id', duration: { $sum: '$applications.total' }, idle_duration: { $sum: "$applications.idle" } } },
            { $sort: { duration: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'organization_apps_webs', localField: '_id', foreignField: '_id', as: 'app' } },
            { $unwind: "$app" },
            { $project: { name: '$app.name', duration: 1, idle_duration: 1 } },
        ]
        return EmpProductivityReportsModel.aggregate(query);
    }

    /**
     * 
     * @param {Object} dataObj
     * @param {String} dataObj.category
     * @param {String} dataObj.type
     * @param {Number} dataObj.manager_id
     * @param {Array<Number>} dataObj.search_data
     * @param {String} dataObj.start_date
     * @param {String} dataObj.end_date
     */
    getPerformance(dataObj) {
        const { category, type, manager_id, search_data, start_date, end_date } = dataObj;
        let match = {
            yyyymmdd: {
                $gte: parseInt(start_date.split('-').join('')),
                $lte: parseInt(end_date.split('-').join(''))
            }
        };
        let duration = {};

        if (manager_id) {
            match = { employee_id: { $in: search_data }, ...match }
        } else {
            match = { organization_id: { $in: search_data }, ...match }
        }

        if (type === 'pro') {
            duration = { $sum: '$productive_duration' }
        } else if (type === 'non') {
            duration = { $sum: '$non_productive_duration' }
        } else {
            duration = { $sum: '$neutral_duration' }
        }

        const query = [
            { $match: match },
            {
                $group: {
                    _id: category === 'location' ? '$location_id' : '$department_id',
                    duration,
                    idle_duration: { $sum: '$idle_duration' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { duration: -1 } },
            { $limit: 5 }
        ]

        return EmpProductivityReportsModel.aggregate(query);
    }

    getProAndNonProductive(organization_id, location_id, department_id, from_date, to_date, manager_id, employee_ids, type) {
        let match = {
            organization_id: organization_id,
            yyyymmdd: {
                $gte: +(from_date.split('-').join('')),
                $lte: +(to_date.split('-').join(''))
            }
        }

        if (manager_id) {
            match = { employee_id: { "$in": employee_ids }, ...match };
        }
        if (department_id) {
            match = { department_id: department_id, ...match }
        }
        if (location_id) {
            match = { location_id: location_id, ...match }
        }

        let sortSum;
        if (parseInt(type) === 1) {
            sortSum = { $sum: '$productive_duration' }
        } else {
            sortSum = { $sum: '$non_productive_duration' }
        }


        return EmpProductivityReportsModel.aggregate([
            {
                $match: match
            },
            {
                $group: {
                    _id: '$employee_id',
                    duration: sortSum,
                    productive_duration: { $sum: '$productive_duration' },
                    non_productive_duration: { $sum: '$non_productive_duration' },
                    neutral_duration: { $sum: '$neutral_duration' },
                    break_duration: { $sum: '$break_duration' },
                    idle_duration: { $sum: '$idle_duration' },
                },
            },
            { $sort: { duration: -1 } },
            { $limit: 10 },
        ]);
    }

    getNonProductive(organization_id, location_id, department_id, from_date, to_date, manager_id, employee_ids) {
        let match = {
            organization_id: organization_id,
            date: {
                $gte: from_date,
                $lte: to_date
            }
        }

        if (manager_id) {
            match = { employee_id: { "$in": employee_ids }, ...match };
        }
        if (department_id) {
            match = { department_id: department_id, ...match }
        }
        if (location_id) {
            match = { location_id: location_id, ...match }
        }

        return EmpProductivityReportsModel.aggregate([
            {
                $match: match
            },
            {
                $group: {
                    _id: '$employee_id',
                    duration: { $sum: '$non_productive_duration' },
                    total: {
                        $sum: {
                            $add: [
                                '$non_productive_duration', '$productive_duration', '$neutral_duration', '$break_duration', '$idle_duration'
                            ]
                        }
                    },
                },
            },
            {
                $project: {
                    "percentage": {
                        "$multiply": [{ "$divide": ["$duration", "$total"] }, 100]
                    },
                    duration: "$duration"
                }

            },
            { $sort: { duration: -1 } },
            { $limit: 10 },
        ]);
    }

    getActivityBreakdown(
    organization_id,
    from_date,
    to_date,
    manager_id,
    employee_ids,
    type
) {
    const match = {
        organization_id,
        yyyymmdd: {
            $gte: Number(from_date.replace(/-/g, '')),
            $lte: Number(to_date.replace(/-/g, ''))
        }
    };

    if (manager_id && employee_ids?.length) {
        match.employee_id = { $in: employee_ids };
    }

    const groupBy = type === 'employee' ? '$employee_id' : '$organization_id';

    return EmpProductivityReportsModel.aggregate([
        { $match: match },

        {
            $group: {
                _id: groupBy,

                productive_duration: { $sum: '$productive_duration' },
                non_productive_duration: { $sum: '$non_productive_duration' },
                neutral_duration: { $sum: '$neutral_duration' },
                idle_duration: { $sum: '$idle_duration' },
                break_duration: { $sum: '$break_duration' },
                offline_time: { $sum: '$offline_time' },

                computer_activities_time: {
                    $sum: {
                        $add: [
                            '$productive_duration',
                            '$non_productive_duration',
                            '$neutral_duration'
                        ]
                    }
                },

                office_time: {
                    $sum: {
                        $add: [
                            '$productive_duration',
                            '$non_productive_duration',
                            '$neutral_duration',
                            '$idle_duration',
                            '$break_duration',
                            '$offline_time'
                        ]
                    }
                },

                count: { $sum: 1 }
            }
        },

        {
            $project: {
                productive_duration: 1,
                non_productive_duration: 1,
                neutral_duration: 1,
                idle_duration: 1,
                break_duration: 1,
                office_time: 1,
                computer_activities_time: 1,
                count: 1,

                productivePer: {
                    $cond: [
                        { $gt: ['$office_time', 0] },
                        { $multiply: [{ $divide: ['$productive_duration', '$office_time'] }, 100] },
                        0
                    ]
                },

                nonProductivePer: {
                    $cond: [
                        { $gt: ['$office_time', 0] },
                        { $multiply: [{ $divide: ['$non_productive_duration', '$office_time'] }, 100] },
                        0
                    ]
                },

                neutralPer: {
                    $cond: [
                        { $gt: ['$office_time', 0] },
                        { $multiply: [{ $divide: ['$neutral_duration', '$office_time'] }, 100] },
                        0
                    ]
                },

                activePer: {
                    $cond: [
                        { $gt: ['$office_time', 0] },
                        { $multiply: [{ $divide: ['$computer_activities_time', '$office_time'] }, 100] },
                        0
                    ]
                },

                idlePer: {
                    $cond: [
                        { $gt: ['$office_time', 0] },
                        { $multiply: [{ $divide: ['$idle_duration', '$office_time'] }, 100] },
                        0
                    ]
                },

                breakPer: {
                    $cond: [
                        { $gt: ['$office_time', 0] },
                        { $multiply: [{ $divide: ['$break_duration', '$office_time'] }, 100] },
                        0
                    ]
                }
            }
        }
    ]);
    }

    getAssignedEmployees(location_id, department_id, to_assigned_id, to_assigned_role) {
        let query = `SELECT ae.employee_id
                    FROM assigned_employees AS ae
                    LEFT JOIN employees AS e  ON e.id = ae.employee_id
                    WHERE ae.to_assigned_id=${to_assigned_id}
                    AND ae.role_id=${to_assigned_role}`;

        if (location_id) {
            query += ` AND e.location_id=${location_id}`;
        }
        if (department_id) {
            query += ` AND e.department_id=${department_id}`;
        }

        return mySql.query(query);
    }

    getEmployeesData(ids) {
        let query = `SELECT e.id,u.first_name,u.last_name,u.a_email
                    FROM employees e
                    INNER JOIN users u ON u.id=e.user_id
                    WHERE e.id IN (${ids})`;

        return mySql.query(query);
    }

    getIdealEmp(organization_id, date, manager_id, to_assigned_role) {
        const from_date = moment().utc().subtract(25, 'minutes').format('YYYY-MM-DD HH:mm:ss');
        const to_date = moment().utc().format('YYYY-MM-DD HH:mm:ss');
        let query = `
                SELECT
                    e.id,ea.id AS attendance_id,
                    CONCAT(u.first_name, ' ', u.last_name) AS name,
                    u.a_email AS email,
                    u.photo_path,e.emp_code,
                    l.id AS location_id,
                    l.name AS location_name,
                    d.id AS department_id,
                    d.name AS department_name,
                    os.data AS shift,e.timezone,
                    JSON_EXTRACT(e.custom_tracking_rule,'$.tracking') AS tracking,
                    JSON_EXTRACT(e.custom_tracking_rule,'$.trackingMode') AS trackingMode,
                    JSON_EXTRACT(e.custom_tracking_rule,'$.idleInMinute') AS idleTime
                FROM employees                      AS e
                LEFT JOIN employee_attendance 		AS ea ON e.id = ea.employee_id
                LEFT JOIN users                     AS u  ON u.id = e.user_id
                LEFT JOIN organization_locations    AS l  ON l.id = e.location_id
                LEFT JOIN organization_departments  AS d  ON d.id = e.department_id
                LEFT JOIN organization_shifts       AS os ON os.id= e.shift_id
                WHERE
                    e.organization_id = ${organization_id} AND
                    ea.organization_id = ${organization_id} AND
                    ea.date = "${date}" AND (ea.end_time BETWEEN "${from_date}" AND "${to_date}" OR ea.end_time >= "${to_date}") AND u.status != 2
            `;
        if (manager_id) {
            query = `
                    SELECT
                        e.id, ea.id AS attendance_id,
                        CONCAT(u.first_name, ' ', u.last_name) AS name,
                        u.a_email AS email,
                        u.photo_path,e.emp_code,
                        l.id AS location_id,
                        l.name AS location_name,
                        d.id AS department_id,
                        d.name AS department_name,
                        os.data AS shift,e.timezone,
                JSON_EXTRACT(e.custom_tracking_rule,'$.tracking') AS tracking,
                JSON_EXTRACT(e.custom_tracking_rule,'$.trackingMode') AS trackingMode,
                JSON_EXTRACT(e.custom_tracking_rule,'$.idleInMinute') AS idleTime
                    FROM assigned_employees             AS ae
                    LEFT JOIN employees                 AS e  ON e.id = ae.employee_id
                    LEFT JOIN employee_attendance 		AS ea ON e.id = ea.employee_id
                    LEFT JOIN users                     AS u  ON u.id = e.user_id
                    LEFT JOIN organization_locations    AS l  ON l.id = e.location_id
                    LEFT JOIN organization_departments  AS d  ON d.id = e.department_id
                    LEFT JOIN organization_shifts       AS os ON os.id= e.shift_id
                    WHERE
                        e.organization_id = ${organization_id} AND
                        ea.organization_id = ${organization_id} AND
                        ae.to_assigned_id = ${manager_id} AND
                        ea.date ="${date}" AND (ea.end_time BETWEEN "${from_date}" AND "${to_date}" OR ea.end_time >= "${to_date}")
                        AND ae.role_id = ${to_assigned_role} AND u.status != 2
                        `;
        }
        return mySql.query(query);
    }

    /**
     * Get employee list for productive and non productive users activities 
     * @function getProductiveEmployees
     * @memberof DashboardModel
     * @param {Array} employeeIds
     * @param {Number} location_id
     * @param {Number} department_id
     * @param {Number} organization_id
     * @param {Number} managerId
     * @param {Number} role_id
     * @returns {Promise<Object>} users or error
     */
    getProductiveEmployees({ managerId, role_id, organization_id, employeeIds, location_id, department_id, employee = null }) {
        let params = [organization_id]
        let query = `SELECT e.id employee_id ,CONCAT(u.first_name, " ", u.last_name) AS full_name ,
                     ol.name AS location ,od.name AS department,u.status
                     FROM employees e
                     INNER JOIN users u                           ON u.id=e.user_id
                     INNER JOIN organization_locations ol         ON ol.id=e.location_id
                     INNER JOIN organization_departments od       ON od.id=e.department_id `

        let whereCondition = `WHERE e.organization_id = ?  `
        if (managerId) {
            params.push(managerId, role_id)
            query += `INNER JOIN assigned_employees ae ON ae.employee_id=e.id `
            whereCondition += ` AND ae.to_assigned_id=? AND ae.role_id= ? `
        }
        if (location_id) {
            whereCondition += `AND e.location_id=? `
            params.push(location_id)
        }

        if (department_id) {
            whereCondition += `AND e.department_id=? `
            params.push(department_id)
        }
        if (employeeIds) {
            whereCondition += `AND e.id IN (?)  `
            params.push(employeeIds)
        }
        if (employee) {
            whereCondition += `AND e.id = (?)  `
            params.push(employee)
        }
        query += whereCondition
        return mySql.query(query, params);
    }

    /**
     * Get employees web app reports
     * @function getWebAppActivities
     * @memberof DashboardModel
     * @param {Array} employeeIds
     * @param {Number} location_id
     * @param {Number} department_id
     * @param {Number} organization_id
     * @param {Number} skip
     * @param {Number} limit
     * @returns {Promise<Object>} reports or error
     */
    getWebAppActivities({ appId, organization_id, employeeIds, startDate, endDate, skip, limit, isCountQuery = false }) {
        let aggregateArr = [];
        let match = {
            yyyymmdd: {
                $gte: parseInt(startDate.split('-').join('')),
                $lte: parseInt(endDate.split('-').join(''))
            },
            organization_id
        };

        match = employeeIds && employeeIds.length > 0 ? { ...match, employee_id: { $in: employeeIds } } : match;

        aggregateArr.push(
            { $match: match },
            {
                $project: {
                    employee_id: 1, applications:
                    {
                        application_id: 1, pro: 1, non: 1, neu: 1, total: 1, idle: 1
                    }
                }
            },
            { $unwind: "$applications" },
        )
        if (appId) aggregateArr.push({ $match: { 'applications.application_id': new mongoose.Types.ObjectId(appId) } })

        aggregateArr.push({
            $group: {
                _id: { employee_id: "$employee_id", application_id: "$applications.application_id" },
                pro: { $sum: "$applications.pro" },
                non: { $sum: "$applications.non" },
                neu: { $sum: "$applications.neu" },
                total: { $sum: "$applications.total" },
                idle: { $sum: "$applications.idle" },
            },
        },
            { $sort: { "total": -1, } },
            {
                $lookup: {
                    from: "organization_apps_webs", localField: "_id.application_id", foreignField: "_id", as: "app"
                }
            },
            { $unwind: "$app", },
            {
                $project: {
                    appName: "$app.name",
                    type: "$app.type",
                    employee_id: "$_id.employee_id",
                    application_id: "$_id.application_id",
                    pro: 1, non: 1, neu: 1, total: 1, idle: 1,
                    _id: 0
                }
            }
        )

        if (isCountQuery) {
            aggregateArr.push({ $count: "count" });
        } else {
            if (skip) {
                aggregateArr.push({ $skip: skip });
            }
            if (limit) {
                aggregateArr.push({ $limit: limit });
            }
        }
        return EmpProductivityReportsModel.aggregate(aggregateArr);


    }
    /**
     * Get web apps list 
     * @function getWebApps
     * @param {*} employeeIds 
     * @param {*} employee 
     * @param {*} type 
     * @param {*} appIds 
     * @param {*} employee 
     * @param {*} location_id 
     * @param {*} department_id 
     * @param {String} startDate 
     * @param {String} endDate 
     * @returns {*} success or error
     */
    getWebApps = async ({ organization_id, employeeIds, type, appIds, startDate, endDate }) => {
        let match = {
            yyyymmdd: {
                $gte: parseInt(startDate.split('-').join('')),
                $lte: parseInt(endDate.split('-').join(''))
            },
            organization_id,
        };
        match = employeeIds && employeeIds.length ? { ...match, employee_id: { $in: employeeIds } } : match
        match = appIds ? { ...match, 'applications.application_id': { $in: appIds.map(i => new mongoose.Types.ObjectId(i)) } } : match
        let query = [
            { $match: match },
            { $project: { applications: { application_id: 1 } } },
            { $unwind: "$applications" },
        ]

        if (appIds) query.push({ $match: { 'applications.application_id': { $in: appIds.map(i => new mongoose.Types.ObjectId(i)) } } })
        query.push(
            { $group: { _id: "$applications.application_id" } },
            {
                $lookup: {
                    from: "organization_apps_webs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "apps"
                }
            },
            { $unwind: "$apps" },
            { $project: { name: "$apps.name", type: "$apps.type" } }
        )
        // console.log(...query);

        return EmpProductivityReportsModel.aggregate(query);
    }

    getEmployeeData({ orgId, empIds }) {
        let query = `
            SELECT
                e.id,
                CONCAT(u.first_name, ' ', u.last_name) AS name,
                u.a_email AS email,
                l.id AS location_id,
                l.name AS location_name,
                d.id AS department_id,
                d.name AS department_name
            FROM employees                      AS e
            LEFT JOIN users    					AS u ON u.id = e.user_id
            LEFT JOIN organization_locations    AS l ON l.id = e.location_id
            LEFT JOIN organization_departments  AS d ON d.id = e.department_id
            WHERE e.organization_id = ? AND e.id IN( ? ) ;
        `;

        return mySql.query(query, [orgId, empIds]);
    }
}

module.exports = new DashboardModel;

// EmpProductivityReportsModel.aggregate([
//     { $match: { organization_id: 143, yyyymmdd: 20200605 } },
//     {
//         $group: {
//             _id: '$location_id',
//             duration: { $sum: '$productive_duration' }
//         }
//     },
//     {
//         $group: {
//             _id: '',
//             total_duration: { $sum:"$duration" },
//             // data: { $push : "$$ROOT" },
//             data:{
//                 $push: {
//                     _id: "$$ROOT._id",
//                     duration: "$$ROOT.duration",
//                     percent: { $multiply: [{ $divide:['$$ROOT.duration', '$total_duration'] }, 100] }
//                 }
//             },

//         },
//     },
//     // { $unwind: '$data' },
//     // { $sort: { duration: -1 }},
//     // {
//     //     $project: {
//     //         data: 1,
//     //         percent: { $multiply: [{ $divide:['$data.duration', '$total_duration'] }, 100] }
//     //     }
//     // },
//     // { $limit: 1 },
// ], (err, results) => {
//     console.log(err)
//     console.log(results[0])
// });

// EmpProductivityReportsModel.aggregate([
//     { $match: { organization_id: 143, yyyymmdd: 20200605 } },
//     { $project: { applications: 1 } },
//     { $unwind: "$applications" },
//     { $match: { 'applications.application_id': new mongoose.Types.ObjectId('5edb104e4e7bdc09f40cf7d4') } },
//     { $project: { applications: { application_id: '$applications.application_id', total: '$applications.total' }}},
//     {
//         $group: {
//             _id: '$applications.application_id',
//             duration: { $sum: '$applications.total' }
//         }
//     },
//     { $sort: { duration: -1 }},
//     { $lookup: { from: 'organization_apps_webs', localField: '_id', foreignField: '_id', as: 'app' }},
//     { $unwind: "$app" },
//     { $project: { duration: 1, app_name: '$app.name' }},
//     { $limit: 10 }
// ], (err, results) => {
//     console.log(err)
//     console.log(results)
// });
