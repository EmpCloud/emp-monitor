'use strict';

const mySql = require('../../../database/MySqlConnection').getInstance();
const { AnnouncemntsModel } = require('../../../models/announcements.schema');

class AuthModel {
    constructor() {
        this.userTable = 'users';
        this.organizationTable = 'organizations';
        this.organizationSettingTable = 'organization_settings';
        this.employeeTable = 'employees';
        this.organizationDepartmentTable = 'organization_departments';
        this.organizationLocationTable = 'organization_locations';
        this.userRoleMappingTable = 'user_role';
        this.roleTable = 'roles';
        this.organizationWhiteListIpsTable = 'organizations_whitelist_ips';
        this.organizationDepartmentLocationMappingTable = 'organization_department_location_relation';
        this.freeStorageTable = 'free_plan_storages';
        this.organizationProvidersTable = 'organization_providers';
        this.organizationProvidersCredentialTable = 'organization_provider_credentials';
        this.applicationInfoTable = 'application_info';
        this.organizationShiftTable = 'organization_shifts';
        this.resellerTable = 'reseller';
    }

    getAdmin(email, amember_id) {
        const query = {
            sql: `
        SELECT 
            u.id, u.first_name, u.last_name, u.email, u.a_email, u.email_verified_at,u.contact_number, u.username,
            u.contact_number, u.date_join, u.address,u.photo_path, o.id as organization_id,os.rules,o.amember_id,
            o.total_allowed_user_count,o.current_user_count,o.language,o.weekday_start,o.timezone, o.product_tour_status, r.id AS reseller_id, o.is2FAEnable, o.mfa_config
        FROM ?? u 
        JOIN ?? o ON o.user_id = u.id
        JOIN ?? os ON os.organization_id = o.id
        LEFT JOIN ?? r ON r.user_id=u.id
        WHERE  u.a_email = ? OR u.email = ? OR o.amember_id= ?
        `
        }; //status 1-active ,0-account deleted
        const params = [this.userTable, this.organizationTable, this.organizationSettingTable, this.resellerTable, email, email, amember_id];

        if (process.env.MYSQL_TIMEOUT === 'true') {
            query.timeout = +process.env.MYSQL_TIMEOUT_INTERVAL;
        }

        return mySql.query(query, params);
    }

    updateAdminDetails(admin_id, name, first_name, last_name, email, username, address, phone, product_id, begin_date, expire_date) {
        const query = `
                UPDATE ${this.userTable} 
                SET first_name='${first_name}' ,last_name='${last_name}' ,email='${email}',username='${username}',address='${address}' ,phone='${phone}' ,product_id=${product_id},begin_date='${begin_date}',expire_date='${expire_date}'
                WHERE id=${admin_id} 
            `; //status 1-active ,0-account inactive 

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    insertAdminDetails(first_name, last_name, email, contact_number, date_join, address) {
        const query = `
            INSERT INTO ${this.userTable} 
                (first_name,last_name,email,contact_number,date_join,address,a_email)
            VALUES ('${first_name}','${last_name}', '${email}', ${contact_number ? "'" + contact_number + "'" : null},'${date_join}',${address ? "'" + address + "'" : null},'${email}');
        `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    insertOrganizationSetting(organization_id, rules) {
        const query = `
        INSERT INTO ${this.organizationSettingTable} 
            (organization_id,rules)
        VALUES ('${organization_id}','${JSON.stringify(rules)}');
    `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    insertOrganisation(user_id, timezone, amember_id, total_allowed_user_count, region) {
        const query = `
        INSERT INTO ${this.organizationTable} 
            (user_id, timezone,amember_id, total_allowed_user_count, region, product_tour_status)
        VALUES ('${user_id}','${timezone}',${amember_id},${total_allowed_user_count},${region}, 0);
    `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    userWithAdminAndRole(email) {
        const query = `
            SELECT 
                u.id, u.first_name, u.last_name, u.email, u.a_email, u.password, u.email_verified_at, u.contact_number, u.address, u.photo_path, u.status, u.date_join as begin_date,
                e.emp_code, e.timezone, e.organization_id, e.id as employee_id,e.custom_tracking_rule,
                od.id as department_id, od.name as department,o.total_allowed_user_count,
                ol.id as location_id, ol.name as location, e.room_id,
                r.name as role, ur.role_id,o.language,o.weekday_start,s.data AS shift,
                JSON_EXTRACT(os.rules,'$.product_id') as product_id, JSON_EXTRACT(os.rules,'$.pack.expiry') as expire_date,
                JSON_EXTRACT(os.rules,'$.productiveHours') as productive_hours,
                JSON_EXTRACT(os.rules,'$.productivityCategory') as productivityCategory
            FROM ${this.userTable} u 
            JOIN ${this.employeeTable} as e ON e.user_id = u.id
            JOIN ${this.organizationDepartmentTable} as od ON od.id = e.department_id
            JOIN ${this.organizationLocationTable} as ol ON ol.id = e.location_id
            JOIN ${this.userRoleMappingTable} as ur ON ur.user_id = e.user_id
            JOIN ${this.organizationTable} as o ON o.id =e.organization_id
            JOIN ${this.roleTable} as r ON r.id = ur.role_id
            JOIN ${this.organizationSettingTable} as os ON os.organization_id = e.organization_id
            LEFT JOIN ${this.organizationShiftTable} as s ON s.id =e.shift_id
            WHERE (u.a_email LIKE '${email}' OR u.email LIKE '${email}') LIMIT 1;
        `; //status 1-active ,0-account deleted,2-suspended

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    whitelistIPs(ip, admin_id) {
        const query = `
            SELECT id,ip FROM ${this.organizationWhiteListIpsTable} 
            WHERE ip='${ip}' AND admin_id=${admin_id} 
            `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    getWhitelistCount(admin_id) {
        const query = `SELECT COUNT(id) AS count FROM ${this.organizationWhiteListIpsTable} WHERE admin_id=${admin_id}`;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    async insertLocationAndDepartment_ROLE(organization_id, timezone, shiftData, userId, cb) {
        // Insert in org location
        const locationData = await mySql.query(`
            INSERT INTO ${this.organizationLocationTable} (organization_id,name,timezone) 
                VALUES (${organization_id},'Default','${timezone}');
        `);
        // Insert in org department
        const departmentData = await mySql.query(`
        INSERT INTO ${this.organizationDepartmentTable} (organization_id,name) 
        VALUES (${organization_id},'Default');
        `);
        // Insert in mapping table org loc and ord dept
        const locationDepartmentMappingData = await mySql.query(`
            INSERT INTO ${this.organizationDepartmentLocationMappingTable} (department_id,location_id) 
                VALUES (${departmentData.insertId},${locationData.insertId});
        `);
        // Insert default roles fro that organization
        const permission = JSON.stringify({ "read": 1, "write": 0, "delete": 0 });
        const roleData = await mySql.query(`
            INSERT INTO ${this.roleTable} (name,organization_id,type,permission) 
                VALUES 
                ('Manager',${organization_id},1,'${permission}'),('Employee',${organization_id},1,'${permission}'),
                ('Team Lead',${organization_id},1,'${permission}');
        `);

        await mySql.query(`
            INSERT INTO ${this.organizationShiftTable} (name, organization_id, data, created_by, updated_by) 
                VALUES (?, ?, ?, ?, ?);
        `, ['Default', organization_id, JSON.stringify(shiftData), userId, userId]);

        return cb(null, {
            department_id: departmentData.insertId,
            location_id: locationData.insertId,
            mappingId: locationDepartmentMappingData.insertId
        });
    }

    /**
     * Resolve (or auto-create) the monitor organization that mirrors a given
     * empcloud org_id. Uses organizations.amember_id as the tenant bridge —
     * one monitor org per empcloud org, so every user from the same empcloud
     * tenant lands in the same monitor dashboard.
     *
     * Returns { orgId, created, ownerUserId }.
     */
    async getOrCreateMonitorOrgForEmpcloudOrg(empcloudOrgId, ownerEmail, opts = {}) {
        const defaultSettings = require('./default.settings.json');
        const [existing] = await mySql.query(
            'SELECT id, user_id FROM organizations WHERE amember_id = ? LIMIT 1',
            [empcloudOrgId]
        );
        if (existing) {
            return { orgId: existing.id, created: false, ownerUserId: existing.user_id };
        }

        const timezone = opts.timezone || 'Asia/Kolkata';
        const totalSeats = opts.totalSeats || 100;
        const beginDate = opts.beginDate || new Date().toISOString().slice(0, 10);
        const expireDate = opts.expireDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);

        // Reuse an existing user row for the owner if one already exists
        // (common when the sync endpoint runs before the owner has SSO'd).
        let ownerUserId;
        const [existingOwner] = await mySql.query(
            'SELECT id FROM users WHERE email = ? OR a_email = ? LIMIT 1',
            [ownerEmail, ownerEmail]
        );
        if (existingOwner) {
            ownerUserId = existingOwner.id;
        } else {
            const ownerResult = await this.insertAdminDetails(
                opts.ownerFirstName || 'Organization', opts.ownerLastName || 'Admin',
                ownerEmail, null, beginDate, null
            );
            ownerUserId = ownerResult.insertId;
        }

        const orgResult = await this.insertOrganisation(ownerUserId, timezone, empcloudOrgId, totalSeats, null);
        const orgId = orgResult.insertId;

        const settings = JSON.parse(JSON.stringify(defaultSettings));
        settings.pack.expiry = expireDate;
        settings.pack.begin_date = beginDate;

        await new Promise((resolve) => {
            this.insertLocationAndDepartment_ROLE(orgId, timezone, settings.tracking.fixed, ownerUserId, (err, data) => resolve(data));
        });
        await this.insertOrganizationSetting(orgId, settings);

        return { orgId, created: true, ownerUserId };
    }

    async addDefaultStorageToFreePlan(organization_id, admin_email, plan_id) {
        if (parseInt(plan_id) === parseInt(process.env.FREE_PLAN_ID)) {

            const getQuery = `SELECT * from ${this.freeStorageTable} WHERE type = 1 AND count < 5 LIMIT 1`;
            let [storageData] = await mySql.query(getQuery);

            if (storageData) {
                // add storage
                let organizationProviders = await mySql.query(`
                    INSERT INTO ${this.organizationProvidersTable} (organization_id,provider_id,created_by)
                    VALUES (${organization_id},${storageData.type},${organization_id});
                `);

                await mySql.query(`created_by
                    INSERT INTO ${this.organizationProvidersCredentialTable} (org_provider_id,creds)
                    VALUES (${organizationProviders.insertId},'${storageData.creds}');
                `);
                // update counter
                await mySql.query(`UPDATE ${this.freeStorageTable} SET count = count + 1 where id = ${storageData.id};`);
            }
        }
    }

    userById_AdminData(employee_id) {
        const query = `
            SELECT 
                u.id, u.first_name, u.last_name, u.email, u.a_email, u.password, u.email_verified_at, u.contact_number, u.address, u.photo_path, u.status, u.date_join as begin_date,
                e.emp_code, e.timezone, e.organization_id, e.id as employee_id,
                od.id as department_id, od.name as department,
                ol.id as location_id, ol.name as location,
                r.name as role, ur.role_id,
                JSON_EXTRACT(os.rules,'$.product_id') as product_id, JSON_EXTRACT(os.rules,'$.expire_date') as expire_date
            FROM ${this.userTable} u 
            JOIN ${this.employeeTable} as e ON e.user_id = u.id
            JOIN ${this.organizationDepartmentTable} as od ON od.id = e.department_id
            JOIN ${this.organizationLocationTable} as ol ON ol.id = e.location_id
            JOIN ${this.userRoleMappingTable} as ur ON ur.user_id = e.user_id
            JOIN ${this.roleTable} as r ON r.id = ur.role_id
            JOIN ${this.organizationSettingTable} as os ON os.organization_id = e.organization_id
            WHERE e.id = ${employee_id} AND u.status = 1
        `; //status 1-active ,0-account deleted,2-suspended

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    userById_UserData(employee_id) {
        const query = `
        SELECT
        u.id as user_id, u.first_name, u.last_name, u.email, u.password, u.status, u.a_email,s.data AS shift,
        e.id as id, e.id as employee_id, e.timezone, e.custom_tracking_rule, e.location_id, e.organization_id, e.organization_id as admin_id,
        ol.name as location_name, e.department_id, od.name as department_name,r.name as role, ur.role_id,o.language,o.weekday_start,
        JSON_EXTRACT(os.rules,'$.productiveHours') as productive_hours,u.photo_path,
        JSON_EXTRACT(os.rules,'$.productivityCategory') as productivityCategory, e.room_id
        FROM ${this.userTable} as u
        LEFT JOIN ${this.employeeTable} as e ON e.user_id = u.id
        LEFT JOIN ${this.organizationLocationTable} as ol ON ol.id = e.location_id
        LEFT JOIN ${this.organizationDepartmentTable} as od ON od.id = e.department_id
        JOIN ${this.userRoleMappingTable} as ur ON ur.user_id = e.user_id
        JOIN ${this.roleTable} as r ON r.id = ur.role_id
        JOIN ${this.organizationTable} as o ON o.id =e.organization_id
        JOIN ${this.organizationSettingTable} as os ON os.organization_id = e.organization_id
        LEFT JOIN ${this.organizationShiftTable} as s ON s.id =e.shift_id
        WHERE e.id = ${employee_id};
        `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    userPermission(role_id, organization_id) {
        const query = `
        SELECT p.id as permission_id, p.name as permission, p.type 
            FROM permission_role pr
            JOIN permissions p ON p.id = pr.permission_id
            WHERE pr.role_id = ${role_id} AND organization_id=${organization_id};
        `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    getInfo() {
        const query = `SELECT
        operating_system, c_version, meta_name FROM ${this.applicationInfoTable} WHERE status = 1 AND agent_name='empmonitor'`;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    updateOrganizationSetting(organization_id, rules) {
        const query = `
        UPDATE ${this.organizationSettingTable}
        SET rules = '${JSON.stringify(rules)}'
        WHERE organization_id = ${organization_id};
    `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    dashboardFeature() {
        const query = `
        SELECT name,status
        FROM dashboard_features;`;

        return mySql.query(query);
    }
    updateadminProperties({ organization_id, amember_id, total_allowed_user_count, current_user_count }) {
        let update = '';
        if (amember_id) update += `amember_id=${amember_id}`;
        if (total_allowed_user_count) { update += update ? `, total_allowed_user_count=${total_allowed_user_count}` : `total_allowed_user_count=${total_allowed_user_count}`; }
        if (current_user_count) { update += update ? `, current_user_count=${current_user_count}` : `current_user_count=${current_user_count}`; }
        if (!update) {
            return Promise.resolve()
        }
        const query = `
                    UPDATE ${this.organizationTable}
                    SET ${update}
                    WHERE id = ${organization_id};`;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    employeeCount(organization_id) {
        const query = `SELECT count(e.id) as count
                    FROM employees e
                    WHERE e.organization_id=${organization_id};`;

        return mySql.query(query);
    }

    roles(user_id) {
        const query = `SELECT r.name, ur.role_id,ur.user_id
                    FROM user_role ur
                    INNER JOIN roles r ON r.id=ur.role_id
                    WHERE ur.user_id=${user_id};`;

        return mySql.query(query);
    }

    getFeedback(from_date, to_date, organization_id) {
        const query = `SELECT question_id,status ,organization_id,DATE_FORMAT(rated_at, "%Y-%m-%d") AS rated_at
                       FROM feedback
                       WHERE organization_id=${organization_id}
                       AND (rated_at BETWEEN '${from_date}' AND '${to_date}')
                       `;

        return mySql.query(query);
    }

    getOrganization({ email }) {
        const query = `SELECT o.id,u.email
                    FROM ?? u
                    JOIN ?? o ON o.user_id=u.id
                    WHERE u.email = ? or u.a_email = ? `;

        return mySql.query(query, [this.userTable, this.organizationTable, email, email]);
    }

    getOrganizationEmp({ organizationId }) {
        const query = `SELECT u.email,u.a_email
        FROM employees e
        JOIN users u on u.id=e.user_id
        WHERE organization_id=?`;

        return mySql.query(query, [organizationId]);
    }

    getAnnouncement({ organizationId, userId }) {
        return AnnouncemntsModel
            .find({
                organization_id: organizationId,
                $or: [{ users: { "$in": [userId] } }, { type: 1 }],
                'delevered_users.user_id': { "$ne": userId }
            }, {
                _id: 1, description: 1, title: 1, createdAt: 1
            })
            .lean()
            .sort({ _id: -1 })
            .limit(200);
    }

    getUserDetailsById({ organizationId, employeeId }) {
        const query = `SELECT e.id, u.email, u.a_email, e.system_type
                    FROM employees e
                    JOIN users u ON u.id = e.user_id
                    WHERE e.organization_id = ? AND e.id = ? `;

        return mySql.query(query, [organizationId, employeeId]);

    }

    updateAdminPackDetails(organization_id, packDetails) {
        const query = `UPDATE organization_settings SET rules = ? WHERE organization_id = ?`;
        return mySql.query(query, [packDetails, organization_id]);
    }

    getOrganizationById(id) {
        const query = `SELECT o.id, u.email, u.a_email, o.current_user_count, o.total_allowed_user_count, JSON_EXTRACT(os.rules, '$.pack.expiry') as plan
                    FROM ?? u
                    JOIN ?? o ON o.user_id=u.id
                    JOIN organization_settings os ON os.organization_id = o.id
                    WHERE o.id = ?`;
        return mySql.query(query, [this.userTable, this.organizationTable, id]);
    }

    getEmployees(email) {
        const query = `SELECT u.email, u.a_email, u.id, e.id as employee_id, e.organization_id
                    FROM users u
                    JOIN employees e ON u.id = e.user_id
                    WHERE u.email =? or u.a_email =? `;
        return mySql.query(query, [email, email]);
    }

    getEmployeeById(id) {
        const query = `SELECT u.email, u.a_email, u.id, e.id as employee_id, e.organization_id
                    FROM users u
                    JOIN employees e ON u.id = e.user_id
                    WHERE e.id = ? OR u.id = ? `;
        return mySql.query(query, [id, id]);
    }

    getEmployeeByUserId(id) {
        const query = `SELECT u.email, u.a_email, u.id, e.id as employee_id, e.organization_id
                    FROM users u
                    JOIN employees e ON u.id = e.user_id
                    WHERE u.id = ? `;
        return mySql.query(query, [id]);
    }
}

module.exports = new AuthModel;