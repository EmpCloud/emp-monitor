const mySql = require('../../../database/MySqlConnection').getInstance();
const biometrics_access_logs = require('../../../models/biometrics_access_logs.schema');

class BiometricModel {

    async enableBiometric(user_id, password, userName) {
        let query = ` Update  users SET is_bio_enabled = 'true', secret_key = '${password}'  `
        if (userName) query += ` username= '${userName}'`
        query += ` WHERE  id=${user_id} `

        return mySql.query(query);
    }

    async disableBiometric(user_id, userName) {
        let query = ` Update  users SET is_bio_enabled = 'false'   `
        if (userName) query += ` username= '${userName}'`
        query += ` WHERE  id=${user_id} `

        return mySql.query(query);
    }

    async checkStatus(user_id) {
        let query = ` select id,first_name,last_name,email,username,is_bio_enabled,status from  users 
        WHERE  id=${user_id}`
        return mySql.query(query);
    }

    async fetchUserData(email, userName = '') {
        let query = `SELECT  u.id, u.first_name, u.last_name, u.email, u.is_bio_enabled,u.username, u.secret_key, o.timezone, o.id as organization_id from users u  join organizations o on o.user_id = u.id
                    WHERE username = '${userName}' or email = '${email}' `;

        return mySql.query(query);
    }


    async fetchUsers(organization_id, location_id,search, sortColumn = '', sortOrder = '', skip, limit) {
        let order = 'ASC';
        let column = '';
        if (sortOrder != 'ASC') {
            order = 'DESC';
        }

        switch (sortColumn) {
            case 'firstname':
                column = 'u.first_name';
                break;
            case 'email':
                column = 'u.email';
                break;
            default:
                column = 'u.first_name';
                order = 'ASC';
                break;
        }
        let query = `SELECT u.id,email,first_name,last_name,u.photo_path,u.status,bd.face,ol.name as location,ol.id as location_id,od.name as department,od.id as department_id from users u join employees e on e.user_id = u.id
                     join organization_locations ol on ol.id = e.location_id join organization_departments od on od.id= e.department_id
                     LEFT JOIN biometric_data bd ON u.id = bd.user_id
                    WHERE e.organization_id=${organization_id} `
        if (location_id) query +=   `And e.location_id = ${location_id} ` 
        if(search) query +=  `AND (u.first_name LIKE '%${search}%' OR u.last_name LIKE '%${search}%' OR CONCAT(u.first_name,' ',u.last_name) LIKE '%${search}%' ) or u.email like '%${search}%' or od.name like '%${search}%' `
        query += ` ORDER BY ${column} ${order} LIMIT ${skip},${limit}`; 
        
        return mySql.query(query);
    }
    
    async getUsers(organization_id, location_id) {
        let query = `SELECT count(*) as total from users u join employees e on e.user_id = u.id
                     join organization_locations ol on ol.id = e.location_id join organization_departments od on od.id= e.department_id
                    WHERE e.organization_id=${organization_id} `
        if (location_id) query += `  And e.location_id = ${location_id} `
        return mySql.query(query);
    }
    async getBiometricData(id) {
        let query = `SELECT * from biometric_data
                    WHERE user_id=${id} `;

        return mySql.query(query);
    }
    async checkBioCode(bio_code,user_id) {
        let query = `SELECT * from biometric_data
                    WHERE bio_code= '${bio_code}' and  user_id <> '${user_id}' `;

        return mySql.query(query);
    }

    async insertUser(user_id, finger1 = null, finger2= null, face = null, bio_code = null, organization_id) {
        let query = `INSERT INTO biometric_data (user_id, organization_id, finger1, finger2, face, bio_code)
    VALUES ('${user_id}','${organization_id}', '${finger1}', '${finger2}', '${face}', '${bio_code}')`
        
        return mySql.query(query);
    }

    async updateUser(user_id, finger1 = null, finger2 = null, face = null, bio_code = null, organization_id) {
        console.log(face)
        let query = `UPDATE  biometric_data set finger1='${finger1}',finger2='${finger2}',face='${face}',
    bio_code = '${bio_code}' WHERE user_id = '${user_id}' and organization_id = '${organization_id}'`


        return mySql.query(query);
    }

    async getFingerDetails(finger) {
        let query = `SELECT  * FROM biometric_data
        WHERE  finger1='${finger}' or finger2='${finger}'`

        return mySql.query(query);
    }

    async getFaceDetails(face) {
        let query = `SELECT  * FROM biometric_data
        WHERE  user_id='${face}'`

        return mySql.query(query);
    }
    async getBioDetails(bio_code) {
        let query = `SELECT  * FROM biometric_data
        WHERE  bio_code = '${bio_code}'`

        return mySql.query(query);
    }

    async checkBiometricStatus(user_id) {
        let query = `SELECT * FROM users
        WHERE  id=${user_id}`

        return mySql.query(query);
    }

    async getUserDetails(id) {
        let query = `SELECT e.id as employee_id,e.organization_id,u.email,u.first_name, e.timezone, ou.email as organization_email
                    from users u  
                    join employees  e ON e.user_id =u.id 
                    join organizations o  ON o.id  = e.organization_id
                    join users ou on ou.id = o.user_id
                    WHERE  u.id =${id}`

        return mySql.query(query);
    }
    async getEmployeeData(user_id) {
        let query = `SELECT e.id as employee_id,u.id as user_id,u.first_name,u.last_name,u.email,u.photo_path,bd.face,od.name as department,ol.name as location FROM employees e  JOIN users u ON e.user_id=u.id
         JOIN organization_departments od ON e.department_id = od.id
                JOIN organization_locations ol ON e.location_id = ol.id
                JOIN biometric_data bd ON u.id = bd.user_id
                WHERE u.id=${user_id}`

        return mySql.query(query);
    }

    async getHrmsEmployeeAttendance({ employee_id, organization_id, date, order_col, order, limit, less_then_equal_date }) {
        let whereStr = '';
        let whereArr = [];
        let limitStr = '';
        let orderCol = '';
        let orderStr = '';

        if (order_col) {
            orderCol = ` ORDER BY ${order_col} `;
        }

        if (order) {
            if (order.toUpperCase() == 'A') {
                orderStr = ' ASC ';
            } else {
                orderStr = ' DESC ';
            }
        }

        if (employee_id) {
            const seperator = whereStr ? ' AND ' : ' ';
            whereStr += `${seperator} employee_id = ? `;
            whereArr.push(employee_id);
        }
        if (organization_id) {
            const seperator = whereStr ? ' AND ' : ' ';
            whereStr += `${seperator} organization_id = ? `;
            whereArr.push(organization_id);
        }
        if (date) {
            const seperator = whereStr ? ' AND ' : ' ';
            whereStr += `${seperator} date = ? `;
            whereArr.push(date);
        }

        if (less_then_equal_date) {
            const seperator = whereStr ? ' AND ' : ' ';
            whereStr += `${seperator} date <= ? `;
            whereArr.push(less_then_equal_date);
        }

        if (!order_col || !order) {
            orderStr = '';
            orderCol = '';
        }

        if (limit) {
            limitStr = ` LIMIT ${limit} `;
        }

        let query = `
            SELECT
                id, employee_id, organization_id, date, start_time, end_time, details, is_manual_attendance, created_at, updated_at
            FROM hrms_employee_attendance 
            WHERE
            ${whereStr}
            ${orderCol} ${orderStr} ${limitStr}
        `;
        return mySql.query(query, whereArr);
    }

    async createHrmsAttendance({ organization_id, employee_id, date, start_time, is_manual_attendance, check_in_detail }) {
        const query = `
            INSERT INTO hrms_employee_attendance SET ?
        `;
        return mySql.query(query, { organization_id, employee_id, date, start_time, is_manual_attendance, check_in_detail });
    }

    async updateHrmsAttendance({ id, end_time: startOrEndTime }) {
        const query = `
            UPDATE hrms_employee_attendance  SET    end_time = '${startOrEndTime}' where id = ${id}
        `;
        return mySql.query(query, { startOrEndTime });
    }
    async getResellerDetails(email) {
        const query = `SELECT re.logo,re.details
    FROM
        organizations o
         JOIN reseller re ON re.id= o.reseller_id
         JOIN users u ON u.id=o.user_id
    WHERE u.email = ?`
        return mySql.query(query, [email]);
    }

    async updateSecretKey(email, secretKey) {
        let query = ` Update  users SET secret_key = '${secretKey}'
        WHERE  email='${email}'`
        return mySql.query(query);
    }

    async getLocations(organization_id) {
        let query = ` SELECT id,name FROM organization_locations 
            WHERE  organization_id ='${organization_id}'`

        return mySql.query(query);
    }

    async checkLocations(location_id, organization_id) {
        let query = ` SELECT * FROM organization_locations 
        WHERE  organization_id ='${organization_id}' and id = '${location_id}'`

        return mySql.query(query);
    }

    async getCheckedInUsers(date, location_id, organization_id) {
        let query = ` SELECT count(*) as checkIn FROM employees e JOIN users u ON u.id = e.user_id LEFT JOIN  hrms_employee_attendance hea ON  e.id =hea.employee_id
        WHERE  hea.organization_id ='${organization_id}' AND u.status = 1 AND hea.date = '${date}' AND e.location_id ='${location_id}' And hea.start_time is not null` 
        
        return mySql.query(query);
    }

    async getCheckedOutUsers(date, location_id, organization_id) {
        let query = ` SELECT count(*) as checkOut FROM employees e JOIN users u ON u.id = e.user_id LEFT JOIN  hrms_employee_attendance hea ON  e.id =hea.employee_id
        WHERE  hea.organization_id ='${organization_id}' AND hea.date = '${date}' AND u.status = 1 AND e.location_id = '${location_id}' And hea.start_time is not null And hea.end_time is not null `  
        
        return mySql.query(query);
    }

   
    async getAbsentUsersCustom(date, attendance_hours,location_id, organization_id) {
        let query = ` SELECT count(*) as absent FROM employees e join users u ON u.id = e.user_id LEFT JOIN hrms_employee_attendance hea ON e.id = hea.employee_id
        AND hea.date = '${date}' 
        WHERE  e.organization_id ='${organization_id}'  AND u.status = 1 AND e.location_id = '${location_id}' 
        AND  ( hea.employee_id is null OR  hea.end_time is null 
            OR TIMESTAMPDIFF(SECOND, hea.start_time, hea.end_time) < ${attendance_hours})
         `
        return mySql.query(query);
    }
    async getAbsentUsers(date, location_id, organization_id) {
        let query = ` SELECT count(*) as absent FROM employees e JOIN users u ON e.user_id = u.id LEFT JOIN hrms_employee_attendance hea ON e.id = hea.employee_id AND hea.date = '${date}' 
        WHERE  e.organization_id ='${organization_id}' AND u.status = 1 AND e.location_id = '${location_id}' And hea.employee_id is null `
        
        return mySql.query(query);
    }
    async getSuspendUsers(location_id,organization_id) {
        let query = ` SELECT count(*) as suspend FROM employees e  JOIN users u ON e.user_id = u.id  JOIN organization_locations ol ON e.location_id = ol.id
        WHERE  e.organization_id ='${organization_id}' AND u.status = 2 AND e.location_id = '${location_id}' `
    
        return mySql.query(query);
    }
    async fetchAttendance(date, location_id, status, organization_id, search, sortColumn, sortOrder, skip,limit) {
        let order = 'ASC';
        let column = '';
        if (sortOrder != 'ASC') {
            order = 'DESC';
        }

        switch (sortColumn) {
            case 'firstname':
                column = 'u.first_name';
                break;
            case 'email':
                column = 'u.email';
                break;
            default:
                column = 'u.first_name';
                order = 'ASC';
                break;
        }
        let query = ` SELECT u.id,u.first_name,u.last_name,u.email,u.photo_path,bd.face,ol.name AS location,hea.start_time AS checkIn, hea.end_time AS checkOut
        FROM employees e
        JOIN users u ON u.id=e.user_id
        JOIN organization_locations ol ON e.location_id = ol.id 
        LEFT JOIN hrms_employee_attendance hea ON e.id = hea.employee_id AND hea.date = '${date}' 
        LEFT JOIN biometric_data bd ON u.id = bd.user_id
        WHERE  e.organization_id = ${organization_id}  AND e.location_id = ${location_id} `
        if (status === '1') query += ` AND u.status = 1 And hea.start_time is not null  ` //for checkedIn users
        if (status === '2') query += ` AND u.status = 1 And hea.start_time is not null And hea.end_time is not null `  //for checkedOut users
        if (status === '0') query += ` AND u.status = 1 And hea.employee_id is null ` //for absent users
        if (status === '3') query += ` AND u.status = 2 ` //for suspend users
        query += ` ORDER BY ${column} ${order} LIMIT ${skip},${limit}`; 
        return mySql.query(query);
    }
    
    async fetchAttendanceCustom(date, location_id, attendanceHours, status, organization_id, search, sortColumn, sortOrder, skip,limit) {
        let order = 'ASC';
        let column = '';
        if (sortOrder != 'ASC') {
            order = 'DESC';
        }

        switch (sortColumn) {
            case 'firstname':
                column = 'u.first_name';
                break;
            case 'email':
                column = 'u.email';
                break;
            default:
                column = 'u.first_name';
                order = 'ASC';
                break;
        }
        let query = ` SELECT u.id,u.first_name,u.last_name,u.email,u.photo_path,bd.face,ol.name AS location,hea.start_time AS checkIn, hea.end_time AS checkOut
        FROM employees e
        JOIN users u ON u.id=e.user_id
        JOIN organization_locations ol ON e.location_id = ol.id 
        LEFT JOIN hrms_employee_attendance hea ON e.id = hea.employee_id AND hea.date = '${date}' 
        LEFT JOIN biometric_data bd ON u.id = bd.user_id
        WHERE  e.organization_id = ${organization_id}  AND e.location_id = ${location_id} `

        if (status === '1') query += ` and u.status = 1 And hea.start_time is not null  ` //for checkedIn users
        if (status === '2') query += ` and u.status = 1 And hea.start_time is not null And hea.end_time is not null `  //for checkedOut users
        if (status === '0') query += ` and u.status = 1 AND ( hea.employee_id is null OR TIMESTAMPDIFF(SECOND, hea.start_time, hea.end_time) < ${attendanceHours} )` //for absent users
        
        if (status === '3') query += ` AND u.status = 2 ` //for suspend users
        query += ` ORDER BY ${column} ${order} LIMIT ${skip},${limit}`; 
        return mySql.query(query);
    }
    async fetchholidaysByYear(organization_id, current_date) {
        let query = `SELECT * FROM holidays
          WHERE organization_id ='${organization_id}' AND holiday_date>='${current_date}'`;

        return mySql.query(query);
    }

    getAttendanceHours(name, organization_id) {
        let query = `SELECT name, value, attendance_colors FROM organization_hrms_settings
                     WHERE name=(?) AND organization_id =(?)`;
        return mySql.query(query, [name, organization_id]);
    }

    async getPresentUsers(date,attendanceHours, location_id, organization_id) {
        let query = `SELECT COUNT(*) AS present
        FROM hrms_employee_attendance hea
        JOIN employees e ON e.id = hea.employee_id
        WHERE TIMESTAMPDIFF(SECOND, hea.start_time, hea.end_time) >= ${attendanceHours}
        AND hea.organization_id = '${organization_id}' AND hea.date = '${date}' AND e.location_id = ${location_id} `;
        
        return mySql.query(query);
    }
    async findUserDetails(organization_id,location_id,user_id){
        let query = `SELECT u.id,email,first_name,last_name,u.photo_path,u.status,bd.face,bd.finger1,bd.finger2,bd.bio_code,ol.name as location,ol.id as location_id,od.name as department,od.id as department_id from users u join employees e on e.user_id = u.id
        join organization_locations ol on ol.id = e.location_id join organization_departments od on od.id= e.department_id left join biometric_data bd ON u.id = bd.user_id
       WHERE e.organization_id=${organization_id} `
       if (location_id) query +=   `And e.location_id = ${location_id} `    
       if (user_id) query += `And u.id=${user_id} `

       return mySql.query(query);
    }

    getEmployeePasswordStatus(organization_id) {
        let query = `
            SELECT o.id, o.is_biometrics_employee 
            FROM organizations o
            WHERE o.id = ${organization_id}
        `;
        return mySql.query(query);
    }

    getSecreatKey(organization_id) {
        let query = `SELECT  u.id, u.first_name, u.last_name, u.email, u.is_bio_enabled,u.username, u.secret_key, o.timezone, o.id as organization_id from users u  join organizations o on o.user_id = u.id
                    WHERE o.id = ${organization_id} `;

        return mySql.query(query);

    }

    getConfirmationStatus(organization_id) {
        let query = `
            SELECT o.id, o.biometrics_confirmation_status 
            FROM organizations o
            WHERE o.id = ${organization_id}
        `;
        return mySql.query(query);
    }

    getCameraOverlayStatus(organization_id) {
        let query = `
            SELECT o.id, o.camera_overlay_status 
            FROM organizations o
            WHERE o.id = ${organization_id}
        `;
        return mySql.query(query);
    }

    getBiometricsDepartment(organization_id) {
        let query = `
            SELECT * FROM biometric_department WHERE organization_id=${organization_id}
        `;
        return mySql.query(query);
    }

    addAccessLogs(employee_id, organization_id, timeIso, yyyymmdd, department_id) {
        return new biometrics_access_logs({
            employee_id, 
            organization_id, 
            start_time: timeIso,
            yyyymmdd: +yyyymmdd, 
            department_id
        }).save();  
    }

    getCurrentCounters ({ date, organization_id, department_id }) {
        let query = `
            SELECT * FROM biometric_organization_access_count WHERE date = "${date}" AND organization_id = ${organization_id}
        `;
        if(department_id) query += `AND department_id=${department_id}`;
        else query += `AND department_id IS NULL`;
        return mySql.query(query);
    }

    createCurrentCounters ({ date, organization_id, access_count, department_id }) {
        let query = ``;
        if(department_id) {
            query = `INSERT INTO biometric_organization_access_count (date, organization_id, access_count, department_id) VALUES ('${date}', ${organization_id}, ${access_count}, ${department_id})`;
        }
        else {
            query = `INSERT INTO biometric_organization_access_count (date, organization_id, access_count) VALUES ('${date}', ${organization_id}, ${access_count});`;
        }
        return mySql.query(query);
    }

    updateCurrentCounters ({ id, access_count}) {
        let query = `
            UPDATE biometric_organization_access_count SET access_count = ${access_count} WHERE id = ${id};
        `;
        return mySql.query(query);
    }

    findLastAccessLog({ employee_id, organization_id, date, department_id }) {
        return biometrics_access_logs.findOne({
            employee_id,
            organization_id,
            yyyymmdd: +date,
            department_id
        }).sort({ createdAt: -1 });
    }

    getDepartmentStatus(organization_id) {
        let query = `
            SELECT count(*) as count FROM biometric_department WHERE organization_id = ${organization_id}
        `;
        return mySql.query(query);
    }

    async deleteUserFace(user_id) {
        let query = `DELETE FROM biometric_data WHERE user_id='${user_id}'`

        return mySql.query(query);
    }
}
module.exports = new BiometricModel;