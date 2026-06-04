const mySql = require('../../../database/MySqlConnection').getInstance();
const EmpProductivityModel = require('../../../models/employee_productivity.schema');
const  { TaskSchemaModel } = require('../../../models/silah_db.schema');

class TimeSheetModel {
    /**
     * @param {Object} dataObj
     * @param {Number} dataObj.organization_id
     * @param {Number} dataObj.location_id
     * @param {Number} dataObj.department_id
     * @param {Number} dataObj.employee_id
     * @param {String} dataObj.start_date
     * @param {String} dataObj.end_date
     * @returns {Promise<any>}
     * @memberof TimeSheetModel
     */
    getAttendanceUsingFilter({ organization_id, location_id, department_id, employee_id, start_date, end_date, shift_id = -1 }) {
        const params = [organization_id, start_date, end_date];
        let query = `
            SELECT
                e.id, ea.id as attendance_id, u.first_name, u.last_name, u.a_email as email, e.timezone,e.emp_code, orgs.name as shift_name, 
                od.name as department, ol.name as location, DATE_FORMAT(ea.date,'%Y-%m-%d') as date, ea.details,
                ea.start_time,ea.end_time,TIMESTAMPDIFF(second,ea.start_time,ea.end_time) as total_time, u.computer_name
            FROM employees e
                JOIN users u ON e.user_id = u.id
                JOIN organization_departments od ON e.department_id = od.id
                JOIN organization_locations ol ON e.location_id = ol.id
                JOIN employee_attendance ea ON e.id = ea.employee_id
                LEFT JOIN organization_shifts orgs ON orgs.id = e.shift_id
            WHERE e.organization_id = ?
            AND ea.date BETWEEN ? AND ?
        `;

        // NOTE: use Number(x) > 0, NOT ~~x. The `~~` operator truncates to a
        // 32-bit signed int, so any id above 2^31-1 (employees/locations are
        // bigint(20) UNSIGNED) overflows — often to 0 — which silently drops
        // the filter and returns every row. That broke the employee filter.
        if (Number(location_id) > 0) {
            query += ' AND e.location_id = ?';
            params.push(location_id);
        }
        if (Number(employee_id) > 0) {
            query += ' AND e.id = ?';
            params.push(employee_id);
        }
        if (Number(department_id) > 0) {
            query += ' AND e.department_id = ?';
            params.push(department_id);
        }
        shift_id = Number(shift_id);
        if (!Number.isNaN(shift_id) && shift_id !== -1) {
            query += ` AND e.shift_id = ?`;
            params.push(shift_id);
        }

        query += ' ORDER BY ea.date DESC';
        if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
            query += ', e.emp_code ASC';
        }
        query += ';';
        return mySql.query(query, params);
    }

    getAttendance({
        organization_id, location_id, department_id, employee_id, start_date, end_date, skip,
        limit, employee_ids, column, order, empids, name,
    }) {
        const params = [organization_id, start_date, end_date];
        let query = `
            SELECT
                e.id, ea.id as attendance_id, u.first_name, u.last_name, u.a_email as email, e.timezone,e.emp_code, orgs.name as shift_name, 
                od.name as department, ol.name as location ,DATE_FORMAT(ea.date,'%Y-%m-%d') as date, ea.details,
                ea.start_time,ea.end_time,(COUNT( e.id ) OVER()) AS total_count,
                TIMESTAMPDIFF(second,ea.start_time,ea.end_time) as total_time, u.computer_name
            FROM employees e
                JOIN users u ON e.user_id = u.id
                JOIN organization_departments od ON e.department_id = od.id
                JOIN organization_locations ol ON e.location_id = ol.id
                JOIN employee_attendance ea ON e.id = ea.employee_id
                LEFT JOIN organization_shifts orgs ON orgs.id = e.shift_id
            WHERE e.organization_id = ? AND ea.date BETWEEN ? AND ?`;


        // NOTE: use Number(x) > 0, NOT ~~x. The `~~` operator truncates to a
        // 32-bit signed int, so any id above 2^31-1 (employees/locations are
        // bigint(20) UNSIGNED) overflows — often to 0 — which silently drops
        // the filter and returns every row. That broke the employee filter.
        if (Number(location_id) > 0) {
            query += ' AND e.location_id = ?';
            params.push(location_id);
        }
        if (Number(employee_id) > 0) {
            query += ' AND e.id = ?';
            params.push(employee_id);
        }
        if (Number(department_id) > 0) {
            query += ' AND e.department_id = ?';
            params.push(department_id);
        }
        if (empids.length > 0) {
            query += ' AND e.id IN(?)';
            params.push(empids);
        } else if (employee_ids.length > 0) {
            query += ' AND e.id IN(?)';
            params.push(employee_ids);
        }
        if (name) {
            const keyword = `%${name}%`;
            query += `
             AND (
                u.first_name LIKE ? OR u.last_name LIKE ? OR u.a_email LIKE ? OR e.emp_code LIKE ?
                OR e.software_version LIKE ? OR ol.name LIKE ? OR od.name LIKE ?
                OR CONCAT(u.first_name,' ',u.last_name) LIKE ?
             )`;
            params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword);
        }

        if (column && order) {
            query += ` ORDER BY ?? ${order}`;
            params.push(column);
        }
        if (column && process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
            query += ', e.emp_code ASC ';
        }

        if (limit) {
            query += ' LIMIT ?, ?;';
            params.push(skip, limit);
        }

        return mySql.query(query, params);
    }

    /**
     * @param {Object} dataObj
     * @param {Number} dataObj.organization_id
     * @param {Number} dataObj.location_id
     * @param {Number} dataObj.department_id
     * @param {Array<Number>} dataObj.employee_ids
     * @param {String} dataObj.start_date
     * @param {String} dataObj.end_date
     * @returns {Promise<any>}
     * @memberof TimeSheetModel
     */
    getAttendanceManager({ organization_id, location_id, department_id, employee_ids, start_date, end_date }) {
        const params = [organization_id, start_date, end_date, employee_ids];
        let query = `
            SELECT
                e.id, ea.id as attendance_id, u.first_name, u.last_name, u.a_email as email, orgs.name as shift_name, 
                e.timezone,e.emp_code, od.name as department, ol.name as location, ea.details,
                DATE_FORMAT(ea.date,'%Y-%m-%d') as date, ea.start_time, ea.end_time, u.computer_name,
                TIMESTAMPDIFF(second, ea.start_time, ea.end_time) as total_time
            FROM employees e
                JOIN users u ON e.user_id = u.id
                JOIN organization_departments od ON e.department_id = od.id
                JOIN organization_locations ol ON e.location_id = ol.id
                JOIN employee_attendance ea ON e.id = ea.employee_id
                LEFT JOIN organization_shifts orgs ON orgs.id = e.shift_id
            WHERE e.organization_id = ?
                AND ea.date BETWEEN ? AND ?
                AND e.id IN (?)
        `;

        if (Number(location_id) > 0) {
            query += ' AND e.location_id = ?';
            params.push(location_id);
        }
        if (Number(department_id) > 0) {
            query += ' AND e.department_id = ?';
            params.push(department_id);
        }
        query += ' ORDER BY ea.date DESC';
        if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString())) {
            query += ', e.emp_code ASC';
        }
        query += ';';
        return mySql.query(query, params);
    }

    /**
     * @param {Object} dataObj
     * @param {Number} dataObj.location_id
     * @param {Number} dataObj.department_id
     * @param {Number} dataObj.employee_id
     * @param {String} dataObj.start_date
     * @param {String} dataObj.end_date
     * @returns {Promise<any>}
     */

    async GetProductivityData({ location_id, department_id, employee_id, start_date, end_date, organization_id, employee_avg, absent, avg }) {

        if (employee_avg == true || avg == true) {
            const match = { organization_id };
            if (Number(location_id) > 0) match.location_id = location_id;
            if (Number(department_id) > 0) match.department_id = department_id;
            if (Number(employee_id) > 0) match.employee_id = { $eq: employee_id };
            if (start_date && end_date) match.yyyymmdd = {
                $gte: parseInt(start_date.split('-').join('')),
                $lte: parseInt(end_date.split('-').join(''))
            };

            let query = [{ $match: match },];
            if (absent == 1) {
                query.push({
                    $group: {
                        _id: "$employee_id",
                        date: { $addToSet: '$date' },
                        active_duration: { $sum: '$active_duration' },
                        productive_duration: { $sum: '$productive_duration' },
                        non_productive_duration: { $sum: '$non_productive_duration' },
                        neutral_duration: { $sum: '$neutral_duration' },
                        idle_duration: { $sum: '$idle_duration' },
                        offline_duration: { $sum: '$offline_duration' },
                        break_duration: { $sum: '$break_duration' },
                        count: { $sum: 1 }
                    },
                });
            } else {
                query.push({
                    $group: {
                        _id: "$employee_id",
                        date: { $first: '$date' },
                        active_duration: { $sum: '$active_duration' },
                        productive_duration: { $sum: '$productive_duration' },
                        non_productive_duration: { $sum: '$non_productive_duration' },
                        neutral_duration: { $sum: '$neutral_duration' },
                        idle_duration: { $sum: '$idle_duration' },
                        offline_duration: { $sum: '$offline_duration' },
                        break_duration: { $sum: '$break_duration' },
                        count: { $sum: 1 }
                    },
                });
            }
            query.push({
                $project: {
                    _id: 1,
                    employee_id: "$_id",
                    office_time: { $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration', '$break_duration', '$idle_duration', '$offline_time'] },
                    active_duration: 1,
                    productive_duration: 1,
                    non_productive_duration: 1,
                    neutral_duration: 1,
                    idle_duration: 1,
                    offline_duration: 1,
                    break_duration: 1,
                    date: 1,
                    count: 1
                }
            });
            return EmpProductivityModel.aggregate(query);
        }
        else {
            const query = {
                yyyymmdd: { $gte: ~~(start_date.split('-').join('')), $lte: ~~(end_date.split('-').join('')) },
                organization_id
            };
            if (Number(location_id) > 0) query.location_id = location_id;
            if (Number(department_id) > 0) query.department_id = department_id;
            if (Number(employee_id) > 0) query.employee_id = employee_id;
            return EmpProductivityModel
                .find(query)
                .select('productive_duration non_productive_duration neutral_duration idle_duration break_duration employee_id date offline_time')
                .lean()
        }
    }

    // async GetProductivityData({ location_id, department_id, employee_id, start_date, end_date, organization_id }) {
    //     const query = {
    //         yyyymmdd: { $gte: ~~(start_date.split('-').join('')), $lte: ~~(end_date.split('-').join('')) },
    //         organization_id
    //     };
    //     if (~~location_id) query.location_id = location_id;
    //     if (~~department_id) query.department_id = department_id;
    //     if (~~employee_id) query.employee_id = employee_id;
    //     return EmpProductivityModel
    //         .find(query)
    //         .select('productive_duration non_productive_duration neutral_duration idle_duration break_duration employee_id date offline_time')
    //         .lean()
    // }

    async GetProductivity({
        location_id, department_id, employee_id, organization_id, empids, dates, start_date,
        end_date, skip, limit, column, order, employee_ids, productive_hours
    }) {
        const match = { organization_id };
        if (Number(location_id) > 0) match.location_id = location_id;
        if (Number(department_id) > 0) match.department_id = department_id;
        if (empids.length > 0) match.employee_id = { $in: empids };
        if (employee_ids.length > 0) match.employee_id = { $in: employee_ids };
        if (employee_id !== parseInt(0)) match.employee_id = employee_id;
        if (dates.length > 0) match.date = { $in: dates };
        if (start_date && end_date) match.yyyymmdd = {
            $gte: parseInt(start_date.split('-').join('')),
            $lte: parseInt(end_date.split('-').join(''))
        };

        let query = [{ $match: match },];

        query.push({
            $project: {
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
                                process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString()) ? 30600
                                    : (productive_hours || { $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration', '$break_duration', '$idle_duration'] })
                            ]
                        }, 100]
                },
            }
        });
        if (column) query.push({ $sort: { [column]: order === 'DESC' ? -1 : 1 } },);
        if (skip) query.push({ $skip: skip },);
        if (limit) query.push({ $limit: limit },);

        return EmpProductivityModel.aggregate(query);
    }

    async GetProductivityCount({
        location_id, department_id, employee_id, organization_id, empids,
        dates, start_date, end_date, employee_ids,
    }) {

        const match = { organization_id };
        if (Number(location_id) > 0) match.location_id = location_id;
        if (Number(department_id) > 0) match.department_id = department_id;
        if (empids.length > 0) match.employee_id = { $in: empids };
        if (employee_ids.length > 0) match.employee_id = { $in: employee_ids };
        if (employee_id !== parseInt(0)) match.employee_id = employee_id;
        if (dates.length > 0) match.date = { $in: dates };
        if (start_date && end_date) {
            match.yyyymmdd = {
                $gte: parseInt(start_date.split('-').join('')), $lte: parseInt(end_date.split('-').join('')),
            };
        }

        return EmpProductivityModel.countDocuments(match);
    }

    async GetProductivityDataManager({ location_id, department_id, employee_ids, start_date, end_date, employee_avg, absent, avg }) {

        if (employee_avg == true || avg == true) {
            let match = {};
            if (Number(location_id) > 0) match.location_id = location_id;
            if (Number(department_id) > 0) match.department_id = department_id;
            if (employee_ids.length > 0) match.employee_id = { $in: employee_ids };
            if (start_date && end_date) match.yyyymmdd = {
                $gte: parseInt(start_date.split('-').join('')),
                $lte: parseInt(end_date.split('-').join(''))
            };

            let query = [{ $match: match },];
            if (absent == 1) {

                query.push({
                    $group: {
                        _id: "$employee_id",
                        date: { $addToSet: '$date' },
                        active_duration: { $sum: '$active_duration' },
                        productive_duration: { $sum: '$productive_duration' },
                        non_productive_duration: { $sum: '$non_productive_duration' },
                        neutral_duration: { $sum: '$neutral_duration' },
                        idle_duration: { $sum: '$idle_duration' },
                        offline_duration: { $sum: '$offline_duration' },
                        break_duration: { $sum: '$break_duration' },
                        count: { $sum: 1 }
                    },
                });
            } else {
                query.push({
                    $group: {
                        _id: "$employee_id",
                        date: { $first: '$date' },
                        active_duration: { $sum: '$active_duration' },
                        productive_duration: { $sum: '$productive_duration' },
                        non_productive_duration: { $sum: '$non_productive_duration' },
                        neutral_duration: { $sum: '$neutral_duration' },
                        idle_duration: { $sum: '$idle_duration' },
                        offline_duration: { $sum: '$offline_duration' },
                        break_duration: { $sum: '$break_duration' },
                        count: { $sum: 1 }
                    },
                });
            }
            query.push({
                $project: {
                    _id: 1,
                    employee_id: "$_id",
                    office_time: { $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration', '$break_duration', '$idle_duration', '$offline_time'] },
                    active_duration: 1,
                    productive_duration: 1,
                    non_productive_duration: 1,
                    neutral_duration: 1,
                    idle_duration: 1,
                    offline_duration: 1,
                    break_duration: 1,
                    date: 1,
                    count: 1
                }
            });
            return EmpProductivityModel.aggregate(query);
        }
        else {
            const query = {
                employee_id: { $in: employee_ids },
                yyyymmdd: { $gte: parseInt(start_date.split('-').join('')), $lte: parseInt(end_date.split('-').join('')) },
            };
            if (Number(location_id) > 0) query.location_id = location_id;
            if (Number(department_id) > 0) query.department_id = department_id;
            return EmpProductivityModel
                .find(query)
                .select(
                    'productive_duration non_productive_duration neutral_duration' +
                    ' idle_duration break_duration employee_id date offline_time'
                )
                .lean()
        }
    }

    // async GetProductivityDataManager({ location_id, department_id, employee_ids, start_date, end_date }) {
    //     const query = {
    //         employee_id: { $in: employee_ids },
    //         yyyymmdd: { $gte: parseInt(start_date.split('-').join('')), $lte: parseInt(end_date.split('-').join('')) },
    //     };
    //     if (~~location_id) query.location_id = location_id;
    //     if (~~department_id) query.department_id = department_id;
    //     return EmpProductivityModel
    //         .find(query)
    //         .select(
    //             'productive_duration non_productive_duration neutral_duration' +
    //             ' idle_duration break_duration employee_id date offline_time'
    //         )
    //         .lean()s
    // }

    async getEmployeeTimesheetBreakUp(attendance_id) {
        const query = `
            SELECT  id, start_time, end_time, type, mode, duration 
            FROM employee_timesheet 
            WHERE attendance_id = ?
        `;

        return mySql.query(query, [attendance_id]);
    }

    checkEmployeeAssignedToManager(employee_id, manager_id, role_id) {
        const query = `
            SELECT id
            FROM assigned_employees
            WHERE employee_id=? AND to_assigned_id=? AND role_id=?
        `;

        return mySql.query(query, [employee_id, manager_id, role_id])
    }

    getEmployeeAssignedToManager(manager_id, role_id) {
        const query = `
            SELECT employee_id
            FROM assigned_employees
            WHERE to_assigned_id=? AND role_id=?
        `;

        return mySql.query(query, [manager_id, role_id])
    }

    // getUser({ organization_id, location_id, department_id, manager_id, role_id, employee_id }) {
    //     let params = [organization_id, 1]// 1- for active users
    //     let query = `
    //         SELECT
    //             e.id, u.first_name, u.last_name, u.a_email as email,
    //             e.timezone,e.emp_code, od.name as department, ol.name as location
    //              FROM employees e
    //             JOIN users u ON e.user_id = u.id
    //             JOIN organization_departments od ON e.department_id = od.id
    //             JOIN organization_locations ol ON e.location_id = ol.id `
    //     query += manager_id ? `INNER JOIN assigned_employees ae ON ae.employee_id=e.id ` : ""
    //     query += ` WHERE e.organization_id = ? AND u.status= ?  `

    //     if (~~location_id) {
    //         query += ' AND e.location_id = ?';
    //         params.push(location_id);
    //     }
    //     if (~~department_id) {
    //         query += ' AND e.department_id = ?';
    //         params.push(department_id);
    //     }
    //     if (~~employee_id) {
    //         query += ' AND e.id = ?';
    //         params.push(employee_id);
    //     }
    //     if (~~manager_id) {
    //         query += ' AND ae.to_assigned_id = ? AND ae.role_id=?';
    //         params.push(manager_id, role_id);
    //     }
    //     return mySql.query(query, params)
    // }

    getUser({ organization_id, location_id, department_id, manager_id, role_id, employee_id, shift_id  }) {
        let params = [organization_id, 1]// 1- for active users
        let query = `
            SELECT
                e.id, u.first_name, u.last_name, u.a_email as email,
                e.timezone,e.emp_code, od.name as department, ol.name as location
                 FROM employees e
                JOIN users u ON e.user_id = u.id
                JOIN organization_departments od ON e.department_id = od.id
                JOIN organization_locations ol ON e.location_id = ol.id `

        query += manager_id ? `INNER JOIN assigned_employees ae ON ae.employee_id=e.id ` : ""
        query += ` WHERE e.organization_id = ? AND u.status= ?  `

        if (Number(location_id) > 0) {
            query += ' AND e.location_id = ?';
            params.push(location_id);
        }
        if (Number(department_id) > 0) {
            query += ' AND e.department_id = ?';
            params.push(department_id);
        }
        if (Number(employee_id) > 0) {
            query += ' AND e.id = ?';
            params.push(employee_id);
        }
        if (Number(manager_id) > 0) {
            query += ' AND ae.to_assigned_id = ? AND ae.role_id=?';
            params.push(manager_id, role_id);
        }
        shift_id = Number(shift_id);
        if (!Number.isNaN(shift_id) && shift_id !== -1) {
            query += ` AND e.shift_id = ?`;
            params.push(shift_id);
        }
        return mySql.query(query, params)
    }

    /**
     * @param {Object} employee id
     * @returns assigned role name
    */
    getAssignedToData(unique_employee_ids) {

        const query = `
        SELECT GROUP_CONCAT(CONCAT(u.first_name,' ',u.last_name)) AS name,ae.employee_id FROM assigned_employees ae
        INNER JOIN employees e ON ae.to_assigned_id=e.id
        INNER JOIN users u ON e.user_id=u.id
        WHERE ae.employee_id IN (${unique_employee_ids.toString()}) GROUP BY ae.employee_id`;

        return mySql.query(query)
    }

    getEmployeeProductivityReport({ location_id, department_id, employee_id, skip, limit, date, productive_hours, organization_id }) {
        let match = {};
        if(location_id) match.location_id = +location_id;
        if(department_id) match.department_id = +department_id;
        if(employee_id) match.employee_id = +employee_id; 
        if(organization_id) match.organization_id = +organization_id; 

        let year = Math.floor(date / 100); // This will give you 2024
        let month = date % 100;

        if(year) match.year = year;
        if(month) match.month = month;

        let query = [
            {
                $match: match
            },
            {
                $project: {
                    employee_id: 1,
                    date: 1,
                    active_duration: {
                        $sum: ['$non_productive_duration', '$productive_duration', '$neutral_duration']
                    }
                }
            }
        ]

        return EmpProductivityModel.aggregate(query);
    }

    getEmployeeDetails({ location_id, department_id, employee_id, skip, limit, date, productive_hours, organization_id, count }) {
        let query = `
            SELECT e.id, u.first_name, u.last_name, u.email, e.location_id, e.department_id
                FROM employees e
                JOIN users u ON e.user_id=u.id
                WHERE e.organization_id = ${organization_id}
        `
        if(location_id) query += ` AND e.location_id=${location_id}`
        if(department_id) query += ` AND e.department_id=${department_id}`
        if(employee_id) query += ` AND e.id=${employee_id}`
        return mySql.query(query)
    }

    getTaskDetails(start_time, end_time, employee_id) {
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

    getEmployeeByShift({ shift_id, organization_id, employee_ids }) {
        let query = `
            SELECT *
                FROM employees
                WHERE organization_id = ${organization_id}
                AND shift_id = ${shift_id}
        `;
        if(employee_ids.length) query += ` AND id IN (${employee_ids})`;
        return mySql.query(query);
    }
}

module.exports = new TimeSheetModel;