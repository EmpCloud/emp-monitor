const _ = require('underscore');
const mySql = require(`${dbFolder}/MySqlConnection`).getInstance();
const { logger: Logger } = require(`${loggerFolder}/Logger`);

class UserActivityModel {
    getEmployee(columns, condition) {
        let query = `SELECT ${columns}
                    FROM employees
                    WHERE ${condition}`

        return mySql.query(query);
    }

    updateEmployee(values, condition) {
        let query = `UPDATE employees
                    SET ${values}
                    WHERE ${condition}`

        return mySql.query(query);
    }

    getEmployeefullDetails(condition) {
        let query = `SELECT e.id ,e.department_id,e.location_id,e.tracking_rule_type,
                    e.custom_tracking_rule,od.name AS department_name,u.first_name,u.first_name as name, e.project_name, u.last_name,u.a_email as email,u.contact_number as phone,
                    u.date_join,u.status,ol.name AS location_name,e.timezone,u.password,e.emp_code,CONCAT(u.first_name, ' ',u.last_name) AS full_name,
                    ur.role_id,r.name as role_name,u.photo_path,u.address,e.software_version,e.shift_id,u.id as u_id, e.is_mobile
                    FROM employees e
                    JOIN organization_departments od ON e.department_id=od.id
                    JOIN organization_locations ol ON e.location_id=ol.id
                    JOIN users u ON e.user_id=u.id
                    LEFT JOIN user_role ur ON ur.user_id=e.user_id
                    LEFT JOIN roles r ON ur.role_id=r.id
                    WHERE ${condition}`

        return mySql.query(query);
    }
    // async getEmployeefullDetails(condition) {
    //     let query = `SELECT u.id AS employee_id,u.department_id,u.location_id,u.tracking_rule_type,
    //                 u.custom_tracking_rule,d.name AS department_name,u.name AS first_name,u.full_name AS last_name,u.email,u.phone AS contact_number,
    //                 u.date_join,u.status,l.name AS location_name,u.timezone
    //                 FROM users u
    //                 JOIN department d ON u.department_id=d.id
    //                 JOIN location l ON u.location_id=l.id
    //                 WHERE ${condition}`

    //     return mySql.query(query);
    // }
    getUser(columns, condition) {
        let query = `SELECT ${columns}
                    FROM users
                    WHERE ${condition}`

        return mySql.query(query);
    }

    userRegister(first_name, last_name, email, password, contact_number, date_join, address, photo_path, status) {
        let query = `INSERT INTO users (first_name, last_name, email, a_email, password, contact_number, date_join, address, photo_path, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        return mySql.query(query, [first_name, last_name, email, email, password, contact_number, date_join, address, photo_path, status]);
    }

    getOrganizationSeeting(organisationId) {
        const query = `SELECT os.rules,o.timezone,o.id,o.total_allowed_user_count,o.current_user_count,re.logo,re.details, re.user_id as reseller_user_id,
                        o.current_user_count as current_count
                        FROM organizations as o
                        JOIN organization_settings os ON os.organization_id = o.id
                        LEFT JOIN reseller re ON re.id = o.reseller_id
                        WHERE o.id = ?`;
        return mySql.query(query, [organisationId]);
    }

    async addUserToEmp(user_id, organization_id, department_id, location_id, emp_code, shift_id, timezone, tracking_mode, tracking_rule_type, custom_tracking_rule, project_name = "", is_mobile) {
        if(!project_name) project_name = '';
        let query = `INSERT INTO employees (user_id, organization_id, department_id, location_id, emp_code, shift_id, timezone, tracking_mode, tracking_rule_type, custom_tracking_rule, project_name, is_mobile)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        return mySql.query(query, [user_id, organization_id, department_id, location_id, emp_code, shift_id, timezone, tracking_mode, tracking_rule_type, custom_tracking_rule, project_name, is_mobile ?? 0]);
    }

    addRoleToUser(user_id, role_id, created_by) {
        let query = `INSERT INTO user_role (user_id, role_id, created_by)
                    VALUES (?, ?, ?)`;

        return mySql.query(query, [user_id, role_id, created_by]);
    }

    addMultiRoleToUser(user_id, role_ids, created_by) {
        const values = role_ids.map(role_id => [user_id, role_id, created_by]);

        return mySql.query(`INSERT INTO user_role (user_id, role_id, created_by) VALUES ?`, [values]);
    }

    async userList(admin_id, location_id, department_id, role_id, name, skip, limit, to_assigned_id, sortColumn, sortOrder, start_date, end_date, status, emp_code, expand, shift_id = -1) {
        let column;
        let order;

        if (sortOrder === 'D') {
            order = `DESC`;
        } else {
            order = `ASC`;
        }

        switch (sortColumn) {
            case 'Full Name':
                column = `u.first_name`
                break;
            case 'Email':
                column = `u.a_email`
                break;
            case 'Location':
                column = `ol.name`
                break;
            case 'Department':
                column = `od.name`
                break;
            case 'Role':
                column = `rn.name`
                break;
            case 'EMP-Code':
                column = `e.emp_code`
                break;
            case 'Agent Version':
                column = `e.software_version`
                break;
            case 'Computer Name':
                column = `u.computer_name`
                break;
            case 'Username':
                column = `u.username`
                break;
            case 'Domain':
                column = `u.domain`
                break;
            default:
                column = `e.created_at`;
                order = `DESC`
                break;
        }
        let department_ids = department_id ? "'" + department_id.split(",").join("','") + "'" : 0;
        let location_ids = location_id ? "'" + location_id.split(",").join("','") + "'" : 0;
        let query;
        let user_ids = [];
        query = `SELECT e.id As id,u.id AS u_id,u.first_name,u.first_name AS name,u.last_name,u.a_email as email,u.contact_number AS phone,u.date_join, orgs.name as shift_name,
                    u.address,u.photo_path,u.status, e.organization_id,e.location_id,ol.name AS location,e.department_id,e.emp_code,e.shift_id,e.timezone,
                    e.tracking_mode,e.tracking_rule_type,od.name AS department, JSON_EXTRACT(os.rules,'$.ideal_time') as ideal_time,
                    (COUNT( e.id ) OVER()) AS total_count,CONCAT(u.first_name,' ', u.last_name) AS full_name,
                    u.password,JSON_EXTRACT(os.rules,'$.offline_time') as offline_time,e.software_version, u.computer_name,u.username,u.domain,
                    (SELECT COUNT(id) FROM employees WHERE organization_id=` + Number(admin_id) + `) as org_total_count, e.geolocation, count(e.emp_code) AS expand_count,
                    e.room_id, e.project_name, concat(CONCAT(UPPER(SUBSTRING(e.operating_system,1,1)), LOWER(SUBSTRING(e.operating_system,2))), ' x', e.architecture) as system_architecture, e.agent_info,
                    e.created_at as employee_created_at, e.updated_at as employee_updated_at,
                    u.created_at as user_created_at, u.updated_at as user_updated_at
                    FROM employees e
                    INNER JOIN users u ON u.id=e.user_id
                    INNER JOIN organization_locations ol ON e.location_id=ol.id
                    INNER JOIN organization_departments od ON od.id=e.department_id
                    LEFT JOIN organization_shifts orgs ON orgs.id = e.shift_id
                    JOIN organization_settings os ON e.organization_id=os.organization_id`;
        if (!process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && role_id) {
            query += ` INNER JOIN user_role ur ON ur.user_id=u.id`;
        } else if (role_id) {
            user_ids = _.pluck(await mySql.query(`SELECT user_id FROM user_role WHERE role_id=?`, [role_id]), 'user_id');
        }
        let params = [];
        query += ` WHERE e.organization_id=?`;
        params.push(admin_id);
        if (start_date && end_date) { query += ` AND EXISTS (SELECT ea.id FROM employee_attendance AS ea WHERE ea.employee_id = e.id  AND (DATE between ? AND ?))`; params.push(start_date, end_date); }
        if (location_id) { query += ` AND e.location_id in(?)`; params.push(location_ids.split(",").map(s => s.replace(/'/g, ''))); }
        if (emp_code) { query += ` AND e.emp_code=?`; params.push(emp_code); }
        if (!process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && role_id) {
            query += ` AND ur.role_id=?`; params.push(role_id);
        } else if (role_id) {
            if (user_ids.length > 0) { query += ` AND u.id IN(?)`; params.push(user_ids); }
        }
        if (department_id) { query += ` AND e.department_id in(?)`; params.push(department_ids.split(",").map(s => s.replace(/'/g, ''))); }
        if (name) { query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.a_email LIKE ? OR e.emp_code LIKE ? OR e.software_version LIKE ?
                                OR ol.name LIKE ? OR od.name LIKE ?
                                OR CONCAT(u.first_name,' ',u.last_name) LIKE ? OR u.computer_name LIKE ?
                                OR concat(CONCAT(UPPER(SUBSTRING(e.operating_system,1,1)), LOWER(SUBSTRING(e.operating_system,2))), ' x', e.architecture) LIKE ?)
                            `; const nameLike = `%${name}%`; params.push(nameLike, nameLike, nameLike, nameLike, nameLike, nameLike, nameLike, nameLike, nameLike, nameLike); }
        if (status) { query += ` AND u.status=?`; params.push(status); }
        shift_id = Number(shift_id);
        if (!Number.isNaN(shift_id) && shift_id !== -1) {
            query += ` AND e.shift_id = ?`; params.push(shift_id);
            }
        if (process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && expand == 0) {
            query += ` GROUP BY e.emp_code`;
        } else {
            query += ` GROUP BY e.id`;
        }
        query += ` ORDER BY ${column} ${order}`;
        query += ` LIMIT ?,?;`;
        params.push(Number(skip), Number(limit));

        if (to_assigned_id) {
                params = [];
                query = `SELECT e.id As id,u.id AS u_id,u.first_name,u.first_name AS name,u.last_name,u.a_email as email,u.contact_number AS phone,u.date_join, orgs.name as shift_name,
                        u.address,u.photo_path,u.status, e.organization_id,e.location_id,ol.name AS location,e.department_id,e.emp_code,e.shift_id,e.timezone,
                        e.tracking_mode,e.tracking_rule_type,od.name AS department, JSON_EXTRACT(os.rules,'$.ideal_time') as ideal_time,
                        (COUNT( e.id ) OVER()) AS total_count,CONCAT(u.first_name,' ', u.last_name) AS full_name,
                        u.password,JSON_EXTRACT(os.rules,'$.offline_time') as offline_time,e.software_version, u.computer_name,u.username,u.domain,
                        (SELECT COUNT(id) FROM employees WHERE organization_id=` + Number(admin_id) + `) as org_total_count, e.geolocation, count(e.emp_code) AS expand_count,
                        e.room_id, e.project_name, concat(CONCAT(UPPER(SUBSTRING(e.operating_system,1,1)), LOWER(SUBSTRING(e.operating_system,2))), ' x', e.architecture) as system_architecture, e.agent_info,
                        FROM employees e
                        INNER JOIN users u ON u.id=e.user_id
                        INNER JOIN organization_locations ol ON e.location_id=ol.id
                        INNER JOIN organization_departments od ON od.id=e.department_id
                        JOIN organization_settings os ON e.organization_id=os.organization_id
                        LEFT JOIN organization_shifts orgs ON orgs.id = e.shift_id
                        JOIN assigned_employees a_s ON a_s.employee_id=e.id AND a_s.to_assigned_id=` + Number(to_assigned_id) + `
                        `;

                if (!process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && role_id) {
                    query += ` INNER JOIN user_role ur ON ur.user_id=u.id`;
                } else if (role_id) {
                    user_ids = _.pluck(await mySql.query(`SELECT user_id FROM user_role WHERE role_id=?`, [role_id]), 'user_id');
                }
                query += ` WHERE e.organization_id=?`;
                params.push(admin_id);
                if (start_date && end_date) { query += ` AND EXISTS (SELECT ea.id FROM employee_attendance AS ea WHERE ea.employee_id = e.id  AND (DATE between ? AND ?))`; params.push(start_date, end_date); }
                if (location_id) { query += ` AND e.location_id in(?)`; params.push(location_ids.split(",").map(s => s.replace(/'/g, ''))); }
                if (emp_code) { query += ` AND e.emp_code=?`; params.push(emp_code); }
                if (!process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && role_id) {
                    query += ` AND ur.role_id=?`; params.push(role_id);
                } else if (role_id) {
                    if (user_ids.length > 0) { query += ` AND u.id IN(?)`; params.push(user_ids); }
                }
                if (department_id) { query += ` AND e.department_id in(?)`; params.push(department_ids.split(",").map(s => s.replace(/'/g, ''))); }
                if (name) { query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.a_email LIKE ? OR e.emp_code LIKE ? OR e.software_version LIKE ?
                                    OR ol.name LIKE ? OR od.name LIKE ?
                                    OR CONCAT(u.first_name,' ',u.last_name) LIKE ? OR u.computer_name LIKE ?)`; const nl = `%${name}%`; params.push(nl,nl,nl,nl,nl,nl,nl,nl,nl); }
                if (status) { query += ` AND u.status=?`; params.push(status); }
                if (process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && expand == 0) {
                    query += ` GROUP BY e.emp_code`;
                } else {
                    query += ` GROUP BY e.id`;
                }
                query += ` ORDER BY ${column} ${order}`;
                query += ` LIMIT ?,?;`;
                params.push(Number(skip), Number(limit));
        }

        return mySql.query(query, params);
    }

    async userListCustom(admin_id, location_id, department_id, role_id, name, skip, limit, to_assigned_id, sortColumn, sortOrder, start_date, end_date, status, emp_code, expand) {
        let column;
        let order;

        if (sortOrder === 'D') {
            order = `DESC`;
        } else {
            order = `ASC`;
        }

        switch (sortColumn) {
            case 'Full Name':
                column = `u.first_name`
                break;
            case 'Email':
                column = `u.a_email`
                break;
            case 'Location':
                column = `ol.name`
                break;
            case 'Department':
                column = `od.name`
                break;
            case 'Role':
                column = `rn.name`
                break;
            case 'EMP-Code':
                column = `e.emp_code`
                break;
            case 'Agent Version':
                column = `e.software_version`
                break;
            case 'Computer Name':
                column = `u.computer_name`
                break;
            case 'Username':
                column = `u.username`
                break;
            case 'Domain':
                column = `u.domain`
                break;
            default:
                column = `e.created_at`;
                order = `DESC`
                break;
        }
        const department_ids = department_id ? "'" + department_id.split(",").join("','") + "'" : 0;
        const location_ids = location_id ? "'" + location_id.split(",").join("','") + "'" : 0;
        let query;
        let user_ids = [];
        query = `SELECT e.id As id,u.id AS u_id,u.first_name,u.first_name AS name,u.last_name,u.a_email as email,u.contact_number AS phone,u.date_join,
                    u.address,u.photo_path,u.status, e.organization_id,e.location_id,ol.name AS location,e.department_id,e.emp_code,e.shift_id,e.timezone,
                    e.tracking_mode,e.tracking_rule_type,od.name AS department, JSON_EXTRACT(os.rules,'$.ideal_time') as ideal_time,
                    (COUNT( e.id ) OVER()) AS total_count,CONCAT(u.first_name,' ', u.last_name) AS full_name,
                    u.password,JSON_EXTRACT(os.rules,'$.offline_time') as offline_time,e.software_version, u.computer_name,u.username,u.domain,
                    (SELECT COUNT(id) FROM employees WHERE organization_id=` + Number(admin_id) + `) as org_total_count, e.geolocation, count(e.emp_code) AS expand_count,
                    e.room_id, e.project_name
                    FROM employees e
                    INNER JOIN users u ON u.id=e.user_id
                    INNER JOIN organization_locations ol ON e.location_id=ol.id
                    INNER JOIN organization_departments od ON od.id=e.department_id
                    JOIN organization_settings os ON e.organization_id=os.organization_id`;
        if (!process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && role_id) {
            query += ` INNER JOIN user_role ur ON ur.user_id=u.id`;
        } else if (role_id) {
            user_ids = _.pluck(await mySql.query(`SELECT user_id FROM user_role WHERE role_id=?`, [role_id]), 'user_id');
        }
        let params = [];
        query += ` WHERE e.organization_id=?`;
        params.push(admin_id);
        if (start_date && end_date) { query += ` AND EXISTS (SELECT ea.id FROM employee_attendance AS ea WHERE ea.employee_id = e.id  AND (DATE between ? AND ?))`; params.push(start_date, end_date); }
        if (location_id) { query += ` AND e.location_id in(?)`; params.push(location_ids.split(",").map(s => s.replace(/'/g, ''))); }
        if (emp_code) { query += ` AND e.emp_code=?`; params.push(emp_code); }
        if (!process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && role_id) {
            query += ` AND ur.role_id=?`; params.push(role_id);
        } else if (role_id) {
            if (user_ids.length > 0) { query += ` AND u.id IN(?)`; params.push(user_ids); }
        }
        if (department_id) { query += ` AND e.department_id in(?)`; params.push(department_ids.split(",").map(s => s.replace(/'/g, ''))); }
        if (name) { query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.a_email LIKE ? OR e.emp_code LIKE ? OR e.software_version LIKE ?
                                OR ol.name LIKE ? OR od.name LIKE ?
                                OR CONCAT(u.first_name,' ',u.last_name) LIKE ? OR u.computer_name LIKE ?)`; const nl2 = `%${name}%`; params.push(nl2,nl2,nl2,nl2,nl2,nl2,nl2,nl2,nl2); }
        if (status) { query += ` AND u.status=?`; params.push(status); }
        if (process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && expand == 0) {
            query += ` GROUP BY e.emp_code`;
        } else {
            query += ` GROUP BY e.id`;
        }
        query += ` ORDER BY ${column} ${order}`;

        if (to_assigned_id) {
            params = [];
            query = `SELECT e.id As user_id, u.id AS u_id,a.to_assigned_id, u.first_name,u.first_name AS name,u.last_name,u.a_email as email,u.contact_number AS phone,u.date_join,u.address,u.photo_path,u.status, e.organization_id,
                    e.location_id,ol.name AS location,e.department_id,e.emp_code,e.shift_id,e.timezone,e.tracking_mode,e.tracking_rule_type,od.name AS department,JSON_EXTRACT(os.rules,'$.ideal_time') as ideal_time,
                    rn.name AS role,rn.type AS role_type, (COUNT( e.id ) OVER()) AS total_count,CONCAT(u.first_name, ' ', u.last_name) AS full_name,JSON_EXTRACT(os.rules,'$.offline_time') as offline_time,e.software_version, e.geolocation
                    FROM assigned_employees a
                    INNER JOIN employees e ON e.id=a.employee_id
                    INNER JOIN users u ON u.id=e.user_id
                    INNER JOIN organization_locations ol ON e.location_id=ol.id
                    INNER JOIN organization_departments od ON od.id=e.department_id
                    JOIN organization_settings os ON e.organization_id=os.organization_id`
            if (!process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && role_id) {
                query += ` INNER JOIN user_role ur ON ur.user_id=u.id`;
            } else if (role_id) {
                user_ids = _.pluck(await mySql.query(`SELECT user_id FROM user_role WHERE role_id=?`, [role_id]), 'user_id');
            }
            query += ` WHERE e.organization_id=? AND a.to_assigned_id=?`;
            params.push(admin_id, to_assigned_id);

            if (location_id) { query += ` AND e.location_id in(?)`; params.push(location_ids.split(",").map(s => s.replace(/'/g, ''))); }
            if (department_id) { query += ` AND e.department_id in(?)`; params.push(department_ids.split(",").map(s => s.replace(/'/g, ''))); }
            if (name) { query += ` AND u.first_name LIKE ?`; params.push(`%${name}%`); }
            if (status) { query += ` AND u.status=?`; params.push(status); }
            if (emp_code) { query += ` AND e.emp_code=?`; params.push(emp_code); }
            if (process.env.ORGANIZATION_ID.split(',').includes(admin_id.toString()) && expand == 0) {
                query += ` GROUP BY e.emp_code`;
            } else {
                query += ` GROUP BY e.id`;
            }

            query += ` ORDER BY ${column} ${order}`;
        }
        return mySql.query(query, params);
    }
    
    users(admin_id, manager_id, location_id, role_id, department_id, to_assign_role, status) {
        const department_ids_arr = department_id ? department_id.split(",") : [];
        const location_ids_arr = location_id ? location_id.split(",") : [];
        let params = [];

        let query = `SELECT
                    e.id,u.id AS u_id, first_name, last_name, u.a_email as email
                    FROM employees e
                    INNER JOIN users u ON u.id=e.user_id
                    INNER JOIN user_role ur ON ur.user_id=u.id
                    JOIN roles rn ON rn.id=ur.role_id
                    WHERE e.organization_id=?`;
        params.push(admin_id);

        if (location_id) { query += ` AND e.location_id in(?)`; params.push(location_ids_arr); }
        if (role_id) { query += ` AND ur.role_id=?`; params.push(role_id); }
        if (department_id) { query += ` AND e.department_id in(?)`; params.push(department_ids_arr); }
        if (status) { query += ` AND u.status=?`; params.push(status); }
        query += ` GROUP BY u_id`
        query += ` ORDER BY e.created_at DESC;`

        if (manager_id) {
            params = [];
            query = `SELECT
                    e.id,u.id AS u_id, first_name, e.project_name, last_name, u.a_email as email
                    FROM employees e
                    INNER JOIN users u ON u.id=e.user_id
                    INNER JOIN user_role ur ON ur.user_id=u.id
                    INNER JOIN assigned_employees a ON a.employee_id=e.id
                    JOIN roles rn ON rn.id=ur.role_id
                    WHERE a.to_assigned_id=? AND a.role_id=?`;
            params.push(manager_id, to_assign_role);

            if (location_id) { query += ` AND e.location_id in(?)`; params.push(location_ids_arr); }
            if (role_id) { query += ` AND ur.role_id=?`; params.push(role_id); }
            if (department_id) { query += ` AND e.department_id in(?)`; params.push(department_ids_arr); }
            if (status) { query += ` AND u.status=?`; params.push(status); }

            query += ` GROUP BY u_id`
            query += ` ORDER BY e.created_at DESC;`
        }
        return mySql.query(query, params);
    }

    userInformation(userId,organization_id) {
        return mySql.query(`
                SELECT
                e.id ,e.emp_code,u.date_join,u.contact_number as phone,u.address ,u.last_name,
                u.last_name as full_name,u.first_name,u.first_name as name,
                u.a_email as email, e.location_id ,e.department_id,u.date_join,u.photo_path,u.password,
                e.timezone,u.status,u.id as temp_user_id,e.shift_id, e.system_type
                FROM users u
                JOIN employees e ON e.user_id=u.id
                WHERE e.id = ? AND  e.organization_id = ?
            `, [userId, organization_id]); //status 1-active  ,0-revmoved employee ,2-suspend
    }

    async updateProfileData(id, userId, first_name, email, address, location_id, department_id, emp_code, phone, joinDate, photo_path, last_name, password, timezone, shift_id, systemType = null,project_name) {
        let userUpdateParams = [first_name, last_name, photo_path, email, address, joinDate, phone, password];
        let userUpdate = `UPDATE users SET first_name=?,last_name=?,photo_path=?,a_email=?,
                    address=?,date_join=?,contact_number=?,password=?`;

        if (systemType && systemType == 1) { userUpdate += ` , email = ?`; userUpdateParams.push(email); }
        userUpdate += ` WHERE id =?`;
        userUpdateParams.push(id);

        let user = await mySql.query(userUpdate, userUpdateParams);

        let query = `UPDATE employees SET department_id=?,location_id=?,emp_code=?,
                    timezone=?,shift_id=?, project_name=?
                    WHERE id =?`;

        return await mySql.query(query, [department_id, location_id, emp_code, timezone, shift_id, project_name, userId]);
    }

    updateRole(id, role_id) {
        let query = `UPDATE user_role
                    SET role_id=?
                    WHERE user_id =?`;

        return mySql.query(query, [role_id, id]);
    }

    deleteUsers(user_ids) {
        let query = ` DELETE FROM users
                WHERE id IN(?)`;

        return mySql.query(query, [user_ids]);
    }

    updateUser(values, condition) {
        let query = `UPDATE users
                    SET ${values}
                    WHERE ${condition}`;

        return mySql.query(query);
    }
    
    deleteData(user_ids) {
        let query = `DELETE from biometric_data
                    WHERE user_id IN(?)`;
        return mySql.query(query, [user_ids]);
    }

    async getShiftData(organization_id, name) {
        let query = ` SELECT * FROM organization_shifts os
        WHERE os.organization_id=? AND os.name LIKE ?`;

        return mySql.query(query, [organization_id, name]);
    }

    async updateShift(organization_id, shift_id, emp_id) {
        let query = `UPDATE employees SET shift_id=?
        WHERE id =? AND organization_id=?`;

        return await mySql.query(query, [shift_id, emp_id, organization_id]);
    }

    async updateFieldStatus(emp_ids, organization_id,) {
        let query = `UPDATE employees SET field_tracking_status='true'
        WHERE id IN (?) AND organization_id=?`;

        return await mySql.query(query, [emp_ids, organization_id]);
    }

    checkLoc(columns, condition) {
        let query = `SELECT ${columns} 
                    FROM organization_locations
                    WHERE ${condition}`;

        return mySql.query(query);
    }

    addLoc(name, admin_id) {
        let query = `INSERT INTO organization_locations (name,organization_id)
                    VALUES (?,?)`;

        return mySql.query(query, [name, admin_id]);
    }

    checkDept(columns, condition) {
        let query = `SELECT ${columns} 
                    FROM organization_departments
                    WHERE ${condition}`;

        return mySql.query(query);
    }

    createDept(admin_id, name,) {
        let query = `INSERT INTO organization_departments (name,organization_id)
                    VALUES (?,?)`;

        return mySql.query(query, [name, admin_id]);
    }

    getSingleLocWithDept(location_id, department_id) {
        let query = `SELECT location_id,department_id
                    FROM organization_department_location_relation
                    WHERE location_id=? AND department_id=?`;

        return mySql.query(query, [location_id, department_id]);
    }

    async addDeptToLoc(location_id, department_id) {
        let query = `INSERT INTO organization_department_location_relation (location_id,department_id)
                VALUES (?,?)`;

        return mySql.query(query, [location_id, department_id]);
    }

    async getRoles(organization_id) {
        let query = `SELECT id,name,organization_id,type,permission
                    FROM roles
                    WHERE status=1 AND organization_id=?`;

        return mySql.query(query, [organization_id]);
    }
    getLocations(organization_id) {
        let query = `SELECT id,name FROM organization_locations WHERE organization_id=?`;

        return mySql.query(query, [organization_id]);
    }
    getDepartments(organization_id) {
        let query = `SELECT id,name FROM organization_departments WHERE organization_id=?`;

        return mySql.query(query, [organization_id]);
    }
    getUserByUserId(user_id) {
        const query = `SELECT e.id,e.location_id,e.department_id
                    FROM employees e
                    WHERE e.user_id=?;`;

        return mySql.query(query, [user_id]);
    }
    getUserByUserEmail(email, organization_id) {
        const query = `SELECT e.id,e.location_id,e.department_id, u.id as user_id, u.first_name, u.last_name, u.a_email, u.email, u.computer_name, e.user_id, e.id as employee_id
                    FROM employees e
                    JOIN users u ON e.user_id=u.id
                    WHERE e.organization_id = ? AND (u.email=? OR u.a_email=?);`;
        return mySql.query(query, [organization_id, email, email]);
    }
    getMultipleEmployees(organization_id, employeeUniqueId) {
        const query = `
            SELECT e.id AS employee_id, e.user_id, e.emp_code,u.a_email, u.email employee_unique_id
            FROM employees e
            JOIN users u ON e.user_id=u.id
            WHERE e.organization_id=? AND u.email IN (?)
        `;

        return mySql.query(query, [organization_id, employeeUniqueId])
    }

    getMultipleEmployeesByMail(organization_id, emails,) {
        const query = `
            SELECT e.id AS employee_id, e.user_id, e.emp_code,u.a_email,role_id
            FROM employees e
            JOIN users u ON e.user_id=u.id
            JOIN user_role ur ON u.id=ur.user_id
            WHERE e.organization_id=? AND u.a_email IN (?)
        `;

        return mySql.query(query, [organization_id, emails])
    }

    updateEmployeeData(emp_code, department_id, location_id, timezone, employee_id, project_name) {
        let updates = [];
        let params = [];
        if (department_id) { updates.push(`department_id=?`); params.push(department_id); }
        if (location_id) { updates.push(`location_id=?`); params.push(location_id); }
        if (timezone) { updates.push(`timezone=?`); params.push(timezone); }
        if (emp_code) { updates.push(`emp_code=?`); params.push(emp_code); }
        if (project_name) { updates.push(`project_name=?`); params.push(project_name); }

        if (updates.length === 0) {
            return Promise.resolve()
        }
        const query = `
            UPDATE employees
            SET ${updates.join(', ')}
            WHERE id=?
        `;
        params.push(employee_id);

        return mySql.query(query, params)
    }
    updateUserData(user_id, first_name, last_name, email, password, contact_number, date_join, address) {
        let updates = [];
        let params = [];
        if (first_name) { updates.push(`first_name=?`); params.push(first_name); }
        if (last_name) { updates.push(`last_name=?`); params.push(last_name); }
        if (password) { updates.push(`password=?`); params.push(password); }
        if (email) { updates.push(`a_email=?`); params.push(email); }
        if (contact_number) { updates.push(`contact_number=?`); params.push(contact_number); }
        if (date_join) { updates.push(`date_join=?`); params.push(date_join); }
        if (address) { updates.push(`address=?`); params.push(address); }

        const query = `
            UPDATE users
            SET ${updates.join(', ')}
            WHERE id=?
        `;
        params.push(user_id);

        return mySql.query(query, params)
    }
    updateRoleData(user_id, role_id) {
        if (!role_id) { return Promise.resolve(); }

        const query = `
            UPDATE user_role
            SET role_id=?
            WHERE user_id=?
        `;

        return mySql.query(query, [role_id, user_id])
    }

    removeAlreadyAssigned(user_id, role_id) {
        let query = `DELETE from assigned_employees
                    WHERE employee_id=? AND role_id=?`;

        return mySql.query(query, [user_id, role_id]);
    }
    async updateRoleType(to_assigned_id, role_id) {
        let query = `UPDATE assigned_employees
                    SET role_id = ?
                    WHERE to_assigned_id =?`;

        return await mySql.query(query, [role_id, to_assigned_id]);
    }

    deleteToAssigned(to_assigned_id) {
        let query = `DELETE from assigned_employees
                    WHERE to_assigned_id=?`;

        return mySql.query(query, [to_assigned_id]);
    }
    assignUser(user_id, manager_id, role_id) {
        let query = `INSERT INTO assigned_employees (employee_id,to_assigned_id,role_id)
                    VALUES (?,?,?)`;

        return mySql.query(query, [user_id, manager_id, role_id]);
    }
    
    checkIfAlreadyAssigned(user_id, manager_id, role_id) {
        let query = `
        SELECT *
            FROM assigned_employees
            WHERE employee_id = ? AND to_assigned_id = ? AND role_id = ?
        `;

        return mySql.query(query, [user_id, manager_id, role_id]);
    }

    async checkAssignedUser(user_id, to_assigned_id, role_id) {
        return await mySql.query(`
            SELECT e.id, u.first_name,u.last_name,e.id AS user_id,u.status
            FROM assigned_employees a
            INNER JOIN employees e ON e.id=a.employee_id
            INNER JOIN users u ON u.id=e.user_id
            WHERE employee_id IN (?) AND to_assigned_id =? AND role_id=?
        `, [user_id, to_assigned_id, role_id]);
    }

    getAssignedDetailsByUserId(user_id, role_id) {

        let query = `
                SELECT ae.to_assigned_id as id,u.first_name ,u.last_name,CONCAT(u.first_name,' ',u.last_name) AS full_name
                FROM assigned_employees ae
                INNER JOIN employees e ON e.id=ae.to_assigned_id
                INNER JOIN users u ON u.id=e.user_id
                WHERE ae.employee_id=? AND role_id=?`;

        return mySql.query(query, [user_id, role_id]);
    }

    checkEmployeeAssigened(to_assigned_id, role_id) {
        let query = `SELECT COUNT(id) AS tolal_count
                FROM assigned_employees
                WHERE to_assigned_id = ? AND role_id=?`;

        return mySql.query(query, [to_assigned_id, role_id]);
    }

    async getEmployeeeAssigined(organization_id, to_assigned_id, department, location_id, skip, limit, name, role_id, sortColumn, sortOrder, start_date, end_date, status, to_assign_role_id, emp_code, expand, shift_id = -1) {
        let column;
        let order;
        let user_ids = [];

        if (sortOrder === 'D') {
            order = `DESC`;
        } else {
            order = `ASC`;
        }

        switch (sortColumn) {
            case 'Full Name':
                column = `u.first_name`
                break;
            case 'Email':
                column = `u.a_email`
                break;
            case 'Location':
                column = `ol.name`
                break;
            case 'Department':
                column = `od.name`
                break;
            case 'Role':
                column = `rn.name`
                break;
            case 'EMP-Code':
                column = `e.emp_code`
                break;
            case 'Agent Version':
                column = `e.software_version`
                break;
            case 'Computer Name':
                column = `u.computer_name`
                break;
            case 'Username':
                column = `u.username`
                break;
            case 'Domain':
                column = `u.domain`
                break;
            default:
                column = `e.created_at`;
                order = `DESC`
                break;
        }

        const department_ids = department ? "'" + department.split(",").join("','") + "'" : 0;
        const location_ids = location_id ? "'" + location_id.split(",").join("','") + "'" : 0;

        let query = `SELECT e.id, e.id As user_id,a.to_assigned_id, u.first_name,u.first_name AS name,u.last_name,u.a_email as email,u.contact_number AS phone,u.date_join,u.address,u.photo_path,u.status, e.organization_id,
                    e.location_id,ol.name AS location,e.department_id,e.emp_code,e.shift_id,e.timezone,e.tracking_mode,e.tracking_rule_type,od.name AS department,os.rules,
                    (COUNT( e.id ) OVER()) AS total_count,CONCAT(u.first_name, ' ', u.last_name) AS full_name,e.software_version,u.password,u.computer_name,u.username,u.domain, orgs.name as shift_name,
                    count(e.emp_code) AS expand_count, e.room_id
                    FROM assigned_employees a
                    INNER JOIN employees e ON e.id=a.employee_id
                    INNER JOIN users u ON u.id=e.user_id
                    INNER JOIN organization_locations ol ON e.location_id=ol.id
                    INNER JOIN organization_departments od ON od.id=e.department_id
                    LEFT JOIN organization_shifts orgs ON orgs.id = e.shift_id`
        if (!process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString()) && role_id) {
            query += ` INNER JOIN user_role ur ON ur.user_id=u.id`;
        } else if (role_id) {
            user_ids = _.pluck(await mySql.query(`SELECT user_id FROM user_role WHERE role_id=?`, [role_id]), 'user_id');
        }
        let params = [];
        query += ` JOIN organization_settings os ON e.organization_id=os.organization_id
        WHERE e.organization_id=? AND a.to_assigned_id=? AND a.role_id=?`;
        params.push(organization_id, to_assigned_id, to_assign_role_id);

        if (start_date && end_date) { query += ` AND EXISTS (SELECT ea.id FROM employee_attendance AS ea WHERE ea.employee_id = e.id  AND (DATE between ? AND ?))`; params.push(start_date, end_date); }
        if (location_id) { query += ` AND e.location_id in(?)`; params.push(location_id.split(",")); }
        if (emp_code) { query += ` AND e.emp_code=?`; params.push(emp_code); }
        if (department) { query += ` AND e.department_id in(?)`; params.push(department.split(",")); }
        if (!process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString()) && role_id) {
            query += ` AND ur.role_id=?`; params.push(role_id);
        } else if (role_id) {
            if (user_ids.length > 0) { query += ` AND u.id IN(?)`; params.push(user_ids); }
        }
        if (name) { query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.a_email LIKE ? OR e.emp_code LIKE ? OR e.software_version LIKE ? OR u.username LIKE ?
                                OR ol.name LIKE ? OR od.name LIKE ? OR u.contact_number LIKE ? OR CONCAT(u.first_name,' ',u.last_name) LIKE ? OR u.computer_name LIKE ?)`; const nl3 = `%${name}%`; params.push(nl3,nl3,nl3,nl3,nl3,nl3,nl3,nl3,nl3,nl3,nl3); }
        if (status) { query += ` AND u.status=?`; params.push(status); }
        shift_id = Number(shift_id);
       if (!Number.isNaN(shift_id) && shift_id !== -1) {
            query += ` AND e.shift_id = ?`; params.push(shift_id);
        }
        if (process.env.ORGANIZATION_ID.split(',').includes(organization_id.toString()) && expand == 0) {
            query += ` GROUP BY e.emp_code`;
        } else {
            query += ` GROUP BY e.id`;
        }
        query += ` ORDER BY ${column} ${order}`;
        if (expand != 1) {
            query += ` LIMIT ?,?;`;
            params.push(Number(skip), Number(limit));
        }
        return mySql.query(query, params);
    }

    orgEmpCount(organization_id) {
        let query = `SELECT COUNT(id) as org_emp_count FROM employees WHERE organization_id=?`;

        return mySql.query(query, [organization_id]);
    }

    async unassignUser(user_ids, to_assigned_id, role_id) {
        let query = ` DELETE from assigned_employees
                    WHERE employee_id IN (?) AND to_assigned_id=? AND role_id=?`;

        return await mySql.query(query, [user_ids, to_assigned_id, role_id]);
    }


    user(userId) {
        let query = `SELECT  e.id ,e.emp_code,u.date_join,u.contact_number as phone,u.address ,u.last_name as full_name,u.first_name as name,e.timezone,u.email,u.a_email, e.location_id  ,e.department_id,u.date_join,u.photo_path, e.system_type
                    FROM users u
                    INNER JOIN employees e ON u.id=e.user_id
                    WHERE e.id = ?`;

        return mySql.query(query, [userId]);
    }



    getStorageDetail(organization_id) {
        let query = `SELECT
                    op.provider_id AS storage_type_id ,p.name,p.short_code ,opc.id AS storage_data_id,opc.creds,op.status
                    FROM organization_providers op
                    INNER JOIN providers p ON p.id=op.provider_id
                    INNER JOIN organization_provider_credentials opc ON opc.org_provider_id =op.id
                    WHERE op.organization_id=? AND opc.status=1`;

        return mySql.query(query, [organization_id]);
    }

    checkAssigened(condition) {
        let query = `SELECT COUNT(id) AS tolal_count 
                FROM assigned_employees 
                WHERE ${condition}`;

        return mySql.query(query);
    }

    employeeAssignedTo(employee_id, role_id) {
        let query;
        let params;
        if (role_id) {
            query = `SELECT
                        u.first_name,u.last_name,u.a_email as email,u.photo_path,e.id as user_id
                    FROM assigned_employees as ae
                    JOIN employees e ON e.id=ae.to_assigned_id
                    JOIN users u ON u.id=e.user_id
                    WHERE ae.employee_id=? AND ae.role_id=?`;
            params = [employee_id, role_id];
        }
        else {
            query = `SELECT ae.role_id, r.name as role_name,
            GROUP_CONCAT(
              JSON_OBJECT('name', CONCAT(u.first_name,' ', u.last_name),
                          'email', u.a_email,
                          'user_id', e.id)) as employees
            FROM assigned_employees as ae
            INNER JOIN employees e ON e.id=ae.to_assigned_id
            INNER JOIN users u ON u.id=e.user_id
            INNER JOIN roles r ON ae.role_id = r.id
            WHERE ae.employee_id=?
            GROUP BY ae.role_id; `;
            params = [employee_id];
        }

        return mySql.query(query, params);
    }

    userRoleById(organization_id, role_id) {
        let query = `SELECT name,id
                    FROM roles
                    WHERE organization_id=? AND id=?`;

        return mySql.query(query, [organization_id, role_id]);
    }

    getAttandanceIds(organization_id, employee_id) {
        const query = `
            SELECT ea.id AS attendance_id
            FROM employee_attendance ea
            WHERE
                ea.organization_id = ? AND
                ea.employee_id = ?
        `;

        return mySql.query(query, [organization_id, employee_id])
    }

    getAssignRole(employee_ids) {
        let query = `
            SELECT ae.employee_id,ae.role_id,r.name as role_name,
                ae.to_assigned_id,e.emp_code,u.first_name,u.last_name,u.a_email
            FROM assigned_employees ae
            JOIN employees e ON e.id=ae.to_assigned_id
            JOIN roles r ON r.id=ae.role_id
            JOIN users u ON u.id=e.user_id
            WHERE employee_id IN(?)`;

        return mySql.query(query, [employee_ids]);
    }

    userListNoLimit(organization_id, location_id, department_id, role_id, name, employee_ids, status, employee_id, employee_role_id) {
        if (employee_id) {
            let department_ids = department_id ? "'" + department_id.split(",").join("','") + "'" : 0;

            let query = `SELECT e.id, e.id As user_id,a.to_assigned_id, u.first_name,u.first_name AS name,u.last_name,u.a_email as email,u.contact_number AS phone,u.date_join,u.address,u.photo_path,u.status, e.organization_id,
                    e.location_id,ol.name AS location,e.department_id,e.emp_code,e.shift_id,e.timezone,e.tracking_mode,e.tracking_rule_type,od.name AS department,ur.role_id,
                    rn.name AS role,rn.type AS role_type, (COUNT( e.id ) OVER()) AS total_count,CONCAT(u.first_name, ' ', u.last_name) AS full_name,e.software_version,u.password,u.computer_name,u.username,u.domain,
                    os.name AS shift_name,os.data AS shift_data,os.id as shift_id,u.email AS employee_unique_id,e.project_name,
                    concat(CONCAT(UPPER(SUBSTRING(e.operating_system,1,1)), LOWER(SUBSTRING(e.operating_system,2))), ' x', e.architecture) as system_architecture,
                    e.created_at as employee_created_at, e.updated_at as employee_updated_at,
                    u.created_at as user_created_at, u.updated_at as user_updated_at
                    FROM assigned_employees a
                    INNER JOIN employees e ON e.id=a.employee_id
                    INNER JOIN users u ON u.id=e.user_id
                    INNER JOIN organization_locations ol ON e.location_id=ol.id
                    INNER JOIN organization_departments od ON od.id=e.department_id
                    INNER JOIN user_role ur ON ur.user_id=u.id
                    JOIN roles rn ON rn.id=ur.role_id
                    LEFT JOIN organization_shifts os ON os.id=e.shift_id
                    WHERE e.organization_id=${organization_id} AND a.to_assigned_id=${employee_id}`;
            if (location_id) query += ` AND e.location_id = ${location_id}`;
            if (department_id) query += ` AND e.department_id  in(${department_ids})`;
            if (role_id) query += ` AND ur.role_id=${role_id}`;
            if (name) query += ` AND (u.first_name LIKE '%${name}%' OR u.last_name LIKE '%${name}%' OR u.a_email LIKE '%${name}%' OR e.emp_code LIKE '%${name}%' OR e.software_version LIKE '%${name}%' OR u.username LIKE '%${name}%'
                                OR ol.name LIKE '%${name}%' OR od.name LIKE '%${name}%' OR u.contact_number LIKE '%${name}%' OR CONCAT(u.first_name,' ',u.last_name) LIKE '%${name}%' OR u.computer_name LIKE '%${name}%')`;
            if (employee_ids.length > 0) query += ` AND e.id IN(${employee_ids})`;
            if (status) query += ` AND u.status=${status}`;
            if (employee_role_id) query += ` AND a.role_id=${employee_role_id}`;
            query += ` GROUP BY id`;
            return mySql.query(query);
        }
        let department_ids = department_id ? "'" + department_id.split(",").join("','") + "'" : 0;
        let query
        query = `SELECT e.id As id,u.id AS u_id,u.first_name,u.first_name AS name,u.last_name,u.a_email as email,u.contact_number AS phone,u.date_join,u.address,u.photo_path,u.status, e.organization_id,
                    e.location_id,ol.name AS location,e.department_id,e.emp_code,e.shift_id,e.timezone,e.tracking_mode,e.tracking_rule_type,od.name AS department,ur.role_id,
                    rn.name AS role,rn.type AS role_type, (COUNT( e.id ) OVER()) AS total_count,CONCAT(u.first_name, ' ', u.last_name) AS full_name,u.password,e.software_version,
                    os.name AS shift_name,os.data AS shift_data,os.id as shift_id,e.tracking_rule_type,u.computer_name,u.username,u.domain,u.email AS employee_unique_id,e.project_name,
                    e.created_at as employee_created_at, e.updated_at as employee_updated_at,
                    u.created_at as user_created_at, u.updated_at as user_updated_at
                    FROM employees e
                    INNER JOIN users u ON u.id=e.user_id
                    INNER JOIN organization_locations ol ON e.location_id=ol.id
                    INNER JOIN organization_departments od ON od.id=e.department_id
                    LEFT JOIN user_role ur ON ur.user_id=u.id
                    LEFT JOIN roles rn ON rn.id=ur.role_id
                    LEFT JOIN organization_shifts os ON os.id=e.shift_id
                    WHERE e.organization_id=${organization_id}`;

        if (location_id) query += ` AND e.location_id = ${location_id}`;
        if (role_id) query += ` AND ur.role_id= ${role_id}`;
        if (department_id) query += ` AND e.department_id  in(${department_ids})`;
        if (name) query += ` AND (u.first_name LIKE '%${name}%' OR u.last_name LIKE '%${name}%' OR u.a_email LIKE '%${name}%' OR e.emp_code LIKE '%${name}%' OR e.software_version LIKE '%${name}%' OR u.username LIKE '%${name}%'
                                OR ol.name LIKE '%${name}%' OR od.name LIKE '%${name}%' OR u.contact_number LIKE '%${name}%' OR CONCAT(u.first_name,' ',u.last_name) LIKE '%${name}%' OR u.computer_name LIKE '%${name}%')`;
        if (employee_ids.length > 0) query += ` AND e.id IN(${employee_ids})`;
        if (status) query += ` AND u.status=${status}`;
        query += ` GROUP BY id`;
        query += ` ORDER BY e.created_at DESC`;

        return mySql.query(query);
    }

    userListNoLimitField(skip,limit,organization_id, location_id, department_id, role_id, name, employee_ids, status, employee_id, employee_role_id) {
        if (employee_id) {
            let department_ids = department_id ? "'" + department_id.split(",").join("','") + "'" : 0;
            let query = `SELECT e.id, e.id As user_id,a.to_assigned_id, u.first_name,u.first_name AS name,u.last_name,u.a_email as email,u.contact_number AS phone,u.date_join,u.address,u.photo_path,u.status, e.organization_id,
                    e.location_id,ol.name AS location,e.department_id,e.emp_code,e.shift_id,e.timezone,e.tracking_mode,e.tracking_rule_type,od.name AS department,ur.role_id,
                    rn.name AS role,rn.type AS role_type, (COUNT( e.id ) OVER()) AS total_count,CONCAT(u.first_name, ' ', u.last_name) AS full_name,e.software_version,u.password,u.computer_name,u.username,u.domain,
                    os.name AS shift_name,os.data AS shift_data,os.id as shift_id,u.email AS employee_unique_id,e.project_name,
                    concat(CONCAT(UPPER(SUBSTRING(e.operating_system,1,1)), LOWER(SUBSTRING(e.operating_system,2))), ' x', e.architecture) as system_architecture
                    FROM assigned_employees a
                    INNER JOIN employees e ON e.id=a.employee_id
                    INNER JOIN users u ON u.id=e.user_id
                    INNER JOIN organization_locations ol ON e.location_id=ol.id
                    INNER JOIN organization_departments od ON od.id=e.department_id
                    INNER JOIN user_role ur ON ur.user_id=u.id
                    JOIN roles rn ON rn.id=ur.role_id
                    LEFT JOIN organization_shifts os ON os.id=e.shift_id
                    WHERE e.organization_id=${organization_id} AND a.to_assigned_id=${employee_id}`;
            if (location_id) query += ` AND e.location_id = ${location_id}`;
            if (department_id) query += ` AND e.department_id  in(${department_ids})`;
            if (role_id) query += ` AND ur.role_id=${role_id}`;
            if (name) query += ` AND (u.first_name LIKE '%${name}%' OR u.last_name LIKE '%${name}%' OR u.a_email LIKE '%${name}%' OR e.emp_code LIKE '%${name}%' OR e.software_version LIKE '%${name}%' OR u.username LIKE '%${name}%'
                                OR ol.name LIKE '%${name}%' OR od.name LIKE '%${name}%' OR u.contact_number LIKE '%${name}%' OR CONCAT(u.first_name,' ',u.last_name) LIKE '%${name}%' OR u.computer_name LIKE '%${name}%')`;
            if (employee_ids.length > 0) query += ` AND e.id IN(${employee_ids})`;
            if (status) query += ` AND u.status=${status}`;
            if (employee_role_id) query += ` AND a.role_id=${employee_role_id}`;
            query += ` GROUP BY id`;
            return mySql.query(query);
        }
        let department_ids = department_id ? "'" + department_id.split(",").join("','") + "'" : 0;
        let query
        query = `SELECT e.id As id,u.id AS u_id,u.first_name,u.first_name AS name,u.last_name,u.a_email as email,u.contact_number AS phone,u.date_join,u.address,u.photo_path,u.status, e.organization_id,
                    e.location_id,ol.name AS location,e.department_id,e.emp_code,e.shift_id,e.timezone,e.tracking_mode,e.tracking_rule_type,od.name AS department,ur.role_id,
                    rn.name AS role,rn.type AS role_type, (COUNT( e.id ) OVER()) AS total_count,CONCAT(u.first_name, ' ', u.last_name) AS full_name,u.password,e.software_version,
                    os.name AS shift_name,os.data AS shift_data,os.id as shift_id,e.tracking_rule_type,u.computer_name,u.username,u.domain,u.email AS employee_unique_id,e.project_name
                    FROM employees e
                    INNER JOIN users u ON u.id=e.user_id
                    INNER JOIN organization_locations ol ON e.location_id=ol.id
                    INNER JOIN organization_departments od ON od.id=e.department_id
                    INNER JOIN user_role ur ON ur.user_id=u.id
                    JOIN roles rn ON rn.id=ur.role_id
                    LEFT JOIN organization_shifts os ON os.id=e.shift_id
                    WHERE e.organization_id=${organization_id}`;
        if (location_id) query += ` AND e.location_id = ${location_id}`;
        if (role_id) query += ` AND ur.role_id= ${role_id}`;
        if (department_id) query += ` AND e.department_id  in(${department_ids})`;
        if (name) query += ` AND (u.first_name LIKE '%${name}%' OR u.last_name LIKE '%${name}%' OR u.a_email LIKE '%${name}%' OR e.emp_code LIKE '%${name}%' OR e.software_version LIKE '%${name}%' OR u.username LIKE '%${name}%'
                                OR ol.name LIKE '%${name}%' OR od.name LIKE '%${name}%' OR u.contact_number LIKE '%${name}%' OR CONCAT(u.first_name,' ',u.last_name) LIKE '%${name}%' OR u.computer_name LIKE '%${name}%')`;
        if (employee_ids.length > 0) query += ` AND e.id IN(${employee_ids})`;
        if (status) query += ` AND u.status=${status}`;
        query += ` GROUP BY id`;
        query += ` ORDER BY e.created_at DESC`;
        query += ` LIMIT ${skip},${limit};`;
        return mySql.query(query);
    }

    getEmpForAssign(manager_id, organization_id) {
        return mySql.query(`
        SELECT e.id
        FROM employees e
        WHERE e.organization_id = ${organization_id}  AND e.id NOT IN
        (SELECT employee_id
            FROM assigned_employees ae 
            WHERE ae.to_assigned_id =${manager_id}
        )
        `);
    }

    getRoleUser(role_id, organization_id) {
        const query = `SELECT e.id,u.first_name
                        FROM employees e
                        INNER JOIN users u ON u.id=e.user_id
                        INNER JOIN user_role ur ON ur.user_id=u.id
                        WHERE ur.role_id=${role_id} AND organization_id=${organization_id}`;

        return mySql.query(query);
    }

    unassignBulk(employee_ids, to_assigned_id, role_id) {
        let query = `DELETE FROM assigned_employees 
                    WHERE to_assigned_id=${to_assigned_id} AND employee_id IN(${employee_ids})`;

        if (role_id) query += ` AND role_id=${role_id}`

        return mySql.query(query);
    }

    getAssignedEmployee(to_assigned_id, employees, role_id) {
        let query = `SELECT a.employee_id,a.to_assigned_id
                FROM assigned_employees a
                WHERE a.to_assigned_id=${to_assigned_id} AND a.employee_id IN(${employees})`;

        if (role_id) query += ` AND role_id=${role_id};`

        return mySql.query(query);
    }

    bulkAssign(data) {
        return mySql.query(`
            INSERT INTO assigned_employees (employee_id,to_assigned_id,role_id)
            VALUES ?`, [data]);
    }

    updateadminProperties({ organization_id, amember_id, total_allowed_user_count, current_user_count }) {
        let update = '';
        if (current_user_count) { update += update ? `, current_user_count=${current_user_count}` : `current_user_count=${current_user_count}`; }
        if (!update) {
            return Promise.resolve()
        }
        const query = `
                    UPDATE organizations
                    SET ${update}
                    WHERE id = ${organization_id};`;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }
    updatePlan(organization_id) {
        const query = `UPDATE organizations o
                    SET o.current_user_count =  o.current_user_count - 1
                    WHERE o.id=${organization_id}`;

        return mySql.query(query);
    }

    userRoles(user_id) {
        const query = `SELECT r.name, ur.role_id,ur.user_id
                    FROM user_role ur
                    INNER JOIN roles r ON r.id=ur.role_id
                    WHERE ur.user_id=${user_id};`;

        return mySql.query(query);
    }

    deleteAssignedWithRole(condition) {
        const query = `DELETE  FROM assigned_employees WHERE ${condition} ;`;

        return mySql.query(query);
    }

    deleteUserRole(user_id, role_ids) {
        const query = `DELETE FROM user_role WHERE user_id=${user_id} AND role_id IN(${role_ids})`;

        return mySql.query(query);
    }

    getRolesByUserId(employyeIds) {
        let query = `SELECT ur.role_id,r.name AS role ,r.type AS role_type ,e.id
        FROM employees e
        INNER JOIN user_role ur ON ur.user_id=e.user_id
        INNER JOIN roles r ON r.id =ur.role_id
        WHERE e.id IN (${employyeIds} )`;
        return mySql.query(query);
    }

    getEmpWithUserDetails(organization_id, employeeIds) {
        const query = `SELECT u.first_name,u.last_name,u.a_email,email,u.computer_name,e.user_id,e.id as employee_id
                    FROM employees e
                    JOIN users u ON u.id=e.user_id
                    WHERE e.organization_id=${organization_id} AND e.id IN(${employeeIds})`;

        return mySql.query(query);
    }

    addRemovedUsers({ organization_id, first_name, last_name, computer_name, email, loggedInEmail, ip }) {
        const query = `INSERT INTO removed_users (organization_id,first_name,last_name,computer_name,email,logged_in_email,ip)
                    VALUES (${organization_id},'${first_name}','${last_name}','${computer_name}','${email}','${loggedInEmail}','${ip}')`;

        return mySql.query(query);
    }

    removedUsers({ organization_id, skip, limit, fromDate, toDate, sortColumn, sortOrder, search }) {
        let column;
        let order;

        if (sortOrder === 'D') {
            order = `DESC`;
        } else {
            order = `ASC`;
        }

        switch (sortColumn) {
            case 'Full Name':
                column = `first_name`
                break;
            case 'Email':
                column = `email`
                break;
            case 'Removed Admin Email':
                column = `logged_in_email`
                break;
            case 'Computer Name':
                column = `computer_name`
                break;
            default:
                column = `created_at`;
                order = `DESC`
                break;
        }

        let query = `SELECT id, CONCAT(first_name, ' ',last_name) AS full_name, computer_name, email, logged_in_email AS removed_admin_email, created_at, (COUNT( id ) OVER()) AS total_count
                    FROM removed_users
                    WHERE organization_id=${organization_id}`;

        if (fromDate && toDate) query += ` AND created_at BETWEEN  '${fromDate} 00:00:00' AND '${toDate} 23:59:59'`;
        if (search) query += ` AND (first_name LIKE '%${search}%' OR last_name LIKE '%${search}%' OR email LIKE '%${search}%' OR logged_in_email LIKE '%${search}%' OR computer_name LIKE '%${search}%')`;
        query += ` ORDER BY ${column} ${order}`;
        if (limit) query += ` LIMIT ${skip},${limit};`;

        return mySql.query(query);
    }


    getAssignedDetails({ employee_id, organization_id, role_id }) {

        let select = "";
        let params = [employee_id, organization_id];
        let where = "";

        if (role_id > 0) {
            params.push(role_id);

            select = `ae.to_assigned_id as superior_id,concat(u.first_name," ",u.last_name) as superior_name,
            u.email as superior_email,ae.role_id as superior_role_id,rl.name as superior_role_name`;

            where = `AND ae.role_id = ?`;

        }
        else
            select = `ae.role_id as role_id`;

        let query = `select ${select}
        from assigned_employees as ae
        INNER Join employees  as e ON ae.to_assigned_id = e.id 
        INNER Join users  as u ON e.user_id = u.id
        INNER Join roles  as rl ON ae.role_id = rl.id
        where ae.employee_id = ? and e.organization_id = ?  ${where}
       `


        return mySql.query(query, params);
    }

    deleteAssignedRole(employee_id, role_id) {
        const query = `DELETE FROM assigned_employees WHERE employee_id = ${employee_id} AND role_id = ${role_id}`;

        return mySql.query(query);
    }


    bulkAssignDelete(user_id) {
        const query = `DELETE FROM assigned_employees WHERE employee_id = ${user_id} `;

        return mySql.query(query);
    }

    bulkAssignShift(organization_id, shift_id, employees_id) {
        const query = `UPDATE employees SET shift_id = ${shift_id} WHERE id IN (${employees_id}) AND organization_id = ${organization_id}`;
        return mySql.query(query);
    }

    getNonAdmin (organization_id, location_id, department_id, role_id) {
        let query = `
            SELECT  E.id as emp_id, U.first_name, U.last_name, U.id as user_id  
                FROM users as U
                JOIN employees E ON U.id=E.user_id
                JOIN user_role UR ON UR.user_id=U.id 
                JOIN roles R ON R.id = UR.role_id AND R.organization_id = E.organization_id AND R.name != "Employee"
                JOIN organization_departments OD ON OD.id=E.department_id
                JOIN organization_locations OL ON OL.id=E.location_id
                WHERE E.organization_id = ${organization_id}`
        if (location_id) query += ` AND OL.id = ${location_id}`
        if (department_id) query += ` AND OD.id = ${department_id}`
        if (role_id) query += ` AND R.id = ${role_id}`
        query += ` GROUP by U.id;`

        return mySql.query(query);
    }

    getUserDetails({email}) {
        let query = `SELECT u.id, e.id
            FROM users u
            JOIN employees e ON u.id = e.user_id
            AND u.email = "${email}" or u.a_email =" ${email}"
        `;
        return mySql.query(query);
    }

    deleteUserDetails ({email}) {
        let query = `DELETE FROM users where email = "${email}" or a_email = "${email}"`;
        return mySql.query(query);
    }
    
    checkAssignedUserExist (employee_id, role_id, assignee_emails) {
        let query = `
            SELECT r.name, ae.id, u.email, u.a_email
            FROM employees e
            JOIN assigned_employees ae ON ae.to_assigned_id = e.id
            JOIN users u ON u.id = e.user_id
            JOIN user_role ur ON ur.user_id = e.user_id
            JOIN roles r on r.id = ur.role_id
            WHERE ae.role_id = ${role_id} AND ae.employee_id = ${employee_id};
        `;
        return mySql.query(query);
    }

    removeAssignedUser (employee_id, role_id) {
        let query = `
            DELETE FROM assigned_employees WHERE employee_id = ${employee_id} and role_id = ${role_id}
        `;
        return mySql.query(query);
    }

    checkIsAdmin (email) {
        let query = `
            SELECT * FROM users u
            JOIN organizations o on o.user_id = u.id
            WHERE u.email = '${email}' OR u.a_email = '${email}'
        `;
        return mySql.query(query);
    }

    getNonAdminDetail (email, organization_id) {
        let query = `
            SELECT e.id as employee_id, r.id as role_id, r.name as role_name, u.email, u.a_email 
                FROM users u 
                JOIN employees e on e.user_id = u.id
                JOIN user_role ur on ur.user_id = u.id
                JOIN roles r on r.id = ur.role_id
                WHERE e.organization_id = ${organization_id} AND  u.email IN (${email}) OR u.a_email IN (${email}) ;
        `;
        return mySql.query(query);
    }

    getSystemType(employee_id,organization_id) {
        let query = `SELECT
                    system_type
                    FROM  employees e 
                    WHERE e.id=${employee_id} AND e.organization_id=${organization_id}`;

        return mySql.query(query);
    }

    async isReseller(organisation_id) {
        let query = `
            SELECT 
                re.logo,re.details
                FROM  
                    organizations o 
                    JOIN users u ON u.id = o.user_id
                    JOIN reseller re ON re.user_id= u.id
                WHERE  o.id = ?;
        `;
        const params = [organisation_id];
        return mySql.query(query, params);
    }

    async getResellerOrgId(organisation_id) {
        let query = `
            SELECT o.id as organization_id
            FROM reseller r
            JOIN users u ON u.id = r.user_id
            JOIN organizations o ON o.user_id = u.id
            WHERE r.user_id = ${organisation_id}
        `;
        return mySql.query(query);
    }

    checkAdmin(email){
        const query = `Select * from users u inner join organizations o
        on o.user_id=u.id WHERE email="${email}"`
        return mySql.query(query);
    }

    setWorkId(wmId,user_id){
        const query =`update organizations set work_management_id="${wmId}" where user_id=${user_id}`;
        return mySql.query(query);
    }
    
    fetchUsers(wmId,organization_id,skip,limit,orderby,sort, search) {
        let query = `SELECT e.id as emp_id,u.first_name as firstName,u.last_name as lastName,u.email,rn.name AS role,od.name as department,e.emp_code 
        FROM employees e
        INNER JOIN users u ON u.id=e.user_id
        INNER JOIN organization_departments od  ON e.department_id = od.id
        INNER JOIN organizations o ON o.id =e.organization_id
        INNER JOIN user_role ur ON ur.user_id=u.id
        JOIN roles rn ON rn.id=ur.role_id
        WHERE  e.organization_id =${organization_id} and o.work_management_id='${wmId}' and e.work_management_status = 'false' and e.system_type = 1 `
        if (search) query += ` AND (u.first_name LIKE '%${search}%' OR u.last_name LIKE '%${search}}%' OR u.email LIKE '%${search}%' 
            OR od.name LIKE '%${search}%' OR rn.name LIKE '%${search}%'
            OR CONCAT(u.first_name,' ',u.last_name) LIKE '%${search}%'
        )
        `;
        query += ` GROUP BY e.id 
        ORDER BY ${orderby} ${sort} `
        if (limit) query += ` LIMIT ${skip},${limit};`
        return mySql.query(query);
    }

    setStatus(emp_ids){
        const query =`update employees e set work_management_status = "true" where e.id  IN (${emp_ids})`;
        return mySql.query(query);
    }

    deleteStatus(emp_ids){
        const query =`update employees e set work_management_status = "false" where e.id  IN (${emp_ids})`;
        return mySql.query(query);
    }
    
    getUsersCount(organization_id){
        const query =`SELECT COUNT(*) as count  from employees e where e.work_management_status = 'false' And e.system_type = 1 and e.organization_id = ${organization_id} `;
        return mySql.query(query);
    }

    async findUserBySameEmpCodeEmail(email, code) {
        let query = `
            SELECT u.email, u.a_email, e.emp_code 
            FROM users u
            JOIN employees e ON e.user_id = u.id
            WHERE u.a_email = "${email}" AND e.emp_code = "${code}"
        `;
        return mySql.query(query);
    }

    getRemovedAssignedUser (emails, employee_id, organization_id, role_id) {
        let query = `
            SELECT u.email, e.id as emp_id, r.name, ae.id as aeid, u.a_email
                FROM employees e
                JOIN users u ON u.id = e.user_id
                JOIN assigned_employees ae on ae.to_assigned_id = e.id
                JOIN roles r ON r.id = ae.role_id
                JOIN user_role ur ON ur.role_id = r.id AND ur.user_id = u.id
                WHERE r.id = ${role_id} AND ae.employee_id = ${employee_id} AND (u.email NOT IN (${emails}) OR u.a_email NOT IN (${emails}))
        `;
        return mySql.query(query);
    }

    removedAssignedNonAdmin (employee_id, to_assign_id, role_id) {
        let query = `
            DELETE FROM assigned_employees WHERE employee_id = ${employee_id} AND to_assigned_id IN (${to_assign_id}) AND role_id = ${role_id}
        `;
        return mySql.query(query);
    }

    async getEmployeeByLocationAndDepartment(organization_id, location_id, department_id, name) {
        let query = `
            SELECT e.id, u.first_name, u.last_name, e.location_id, e.department_id, u.id as user_id, u.id as u_id
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE e.organization_id = ?
        `;
        
        const params = [organization_id];
    
        if (location_id) {
            query += ` AND e.location_id = ?`;
            params.push(location_id);
        }
        
        if (department_id) {
            query += ` AND e.department_id = ?`;
            params.push(department_id);
        }
    
        if (name) {
            query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)`;
            const namePattern = `%${name}%`;
            params.push(namePattern, namePattern, namePattern);
        }
    
        return mySql.query(query, params);
    } 

    getEmployeeLastAttendance(employeeIds) {
        let query = `
            SELECT id, user_id, date, end_time
            FROM (
                SELECT 
                    e.id,
                    u.id AS user_id,
                    ea.date,
                    ea.end_time,
                    ROW_NUMBER() OVER (
                        PARTITION BY e.id
                        ORDER BY ea.date DESC, ea.end_time DESC
                    ) AS rn
                FROM employees e
                JOIN users u 
                    ON e.user_id = u.id
                JOIN employee_attendance ea 
                    ON ea.employee_id = e.id
                WHERE e.id IN (${employeeIds})
            ) t
            WHERE rn = 1
            ORDER BY date DESC
        `;
        return mySql.query(query);
    }
    
}

module.exports = new UserActivityModel;