'use strict';

const mySql = require('../../../database/MySqlConnection').getInstance();

class ClockInModel {
    constructor() {
        this.organizationTable = 'organizations';
        this.organizationBuildTable = 'organizations_build';
        this.userTable = 'users';
        this.organizationSettingTable = 'organization_settings';
        this.onPremiseTable = 'onpremise_build';
    }

    getOrganizationAvailability(organization_id) {
        const query = `
        SELECT id
        FROM ${this.organizationTable} 
        WHERE id = ${organization_id};
        `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    createBuildInfo(organizations_id, build_version, type, mode, url, file_type) {
        const query = `
            INSERT INTO ${this.organizationBuildTable} (organizations_id,build_version,type,mode,url,file_type) 
            VALUES (${organizations_id},'${build_version}','${type}','${mode}','${url}','${file_type}');
        `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    getBuildInfo(organizations_id, build_version, type, mode, file_type) {
        const query = `
            SELECT id, organizations_id, build_version, type, mode FROM ${this.organizationBuildTable} 
                WHERE 
                    organizations_id = ${organizations_id} AND 
                    build_version = '${build_version}' AND 
                    type = '${type}' AND 
                    mode = '${mode}' AND
                    file_type = '${file_type}';
        `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    findBuildInfo(organizations_id, build_version, type, mode, url) {
        const query = `
            SELECT id FROM ${this.organizationBuildTable} WHERE 
            organizations_id = ${organizations_id} AND 
            build_version = '${build_version}' AND 
            type = '${type}' AND 
            mode = '${mode}' AND
            url = '${url}'
        `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    updateBuildInfo(build_id, url) {
        const query = `
        UPDATE ${this.organizationBuildTable} SET
        url = '${url}' 
        WHERE id = ${build_id};        
    `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    deleteBuildInfo(build_id) {
        const query = `
        DELETE FROM ${this.organizationBuildTable} WHERE id = ${build_id};
        `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }

    getAdmin(email) {
        const query = {
            sql: `
        SELECT 
            u.id, u.first_name, u.last_name, u.email, u.a_email, u.email_verified_at,u.contact_number,
            u.contact_number, u.date_join, u.address,u.photo_path, o.id as organization_id,os.rules,o.amember_id,
            o.total_allowed_user_count,o.current_user_count,o.language,o.weekday_start,o.timezone
        FROM ?? u 
        JOIN ?? o ON o.user_id = u.id
        JOIN ?? os ON os.organization_id = o.id
        WHERE  a_email = ? OR email = ?
        `
        }; //status 1-active ,0-account deleted
        const params = [this.userTable, this.organizationTable, this.organizationSettingTable, email, email];

        if (process.env.MYSQL_TIMEOUT === 'true') {
            query.timeout = +process.env.MYSQL_TIMEOUT_INTERVAL;
        }

        return mySql.query(query, params);
    }

    getOnPremBuildInfo(email, build_version, type, mode, file_type) {
        const query = `
            SELECT id, email, organizations_id, build_version, type, mode FROM ${this.onPremiseTable} 
                WHERE 
                    email = '${email}' AND 
                    build_version = '${build_version}' AND 
                    type = '${type}' AND 
                    mode = '${mode}' AND
                    file_type = '${file_type}';
        `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }
    updateOnPremBuildInfo(build_id, url) {
        const query = `
        UPDATE ${this.onPremiseTable} SET
        url = '${url}' 
        WHERE id = ${build_id};        
    `;

        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }
    createOnPremBuildInfo(email, organization_id, build_version, type, mode, url, file_type) {
        const query = `
            INSERT INTO ${this.onPremiseTable} (email,organizations_id,build_version,type,mode,url,file_type) 
            VALUES ('${email}',${organization_id},'${build_version}','${type}','${mode}','${url}','${file_type}');
        `;
        
        if (process.env.MYSQL_TIMEOUT === 'true') {
            return mySql.query({ sql: query, timeout: parseInt(process.env.MYSQL_TIMEOUT_INTERVAL) });
        }

        return mySql.query(query);
    }
}

module.exports = new ClockInModel;