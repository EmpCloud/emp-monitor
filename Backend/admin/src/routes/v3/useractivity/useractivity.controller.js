const MAC_ADDRESS = require('is-mac-address');
const moment = require('moment');
const _ = require('underscore');
const lodash = require('lodash');
var XLSX = require('xlsx')
const async = require('async');
const multer = require('multer');
const fs = require('fs');
const Jimp = require("jimp")

const UserActivityModel = require('./useractivity.model');
const UserValidation = require('./useractivity.validation');
const { sendResponse } = require(`${utilsFolder}/myService`);
const PasswordEncodeDecoder = require(`${utilsFolder}/helpers/PasswordEncoderDecoder`);
const GoogleDrive = require(`${utilsFolder}/helpers/GoogleDrive`);
const Mail = require(`${utilsFolder}/helpers/Mail`);
const { timezones_details: timezones } = require('../../../utils/helpers/Timezone');
const AmazonSSS = require(`${utilsFolder}/helpers/AmazonSSS`);
const { logger: Logger } = require(`${loggerFolder}/Logger`);
const CloudStorageServices = require('./service/cloudstorageServices/index');
const OnedriveServices = require('./service/cloudstorageServices/oneDrive.service');
const CloudStorageService = require('./service/cloudstorage.service');
const Comman = require(`${utilsFolder}/helpers/Common`);
const eventEmitter = require(`${eventsFolder}/eventEmitter`);
const actionsTracker = require('../services/actionsTracker');
const UserService = require('./service/user.service');
const MailJobs = require('../../../jobs/backgroundEmail/addMailJobs');
const { userMessages, roleUpateMailMessage, forgotPasswordMessages, rolePermissionMessages, statementConnector, genericErrorMessage, bulkRegAndUpdate, bulkRegisterMessage  } = require("../../../utils/helpers/LanguageTranslate");
const event = require('../auth/services/event.service');
const getMessage = require('../../../utils/messageTranslation').translate;
const { translate } = require('../../../utils/messageTranslation');
const redis = require('../auth/services/redis.service');
const axios = require('axios')

const ConfigData = require("../../../../../config/config");
const { syncEmpCloudSeats } = require(`${utilsFolder}/helpers/EmpCloudSeatSync`);

const upload = multer({
    dest: __dirname.split('src')[0] + 'public',
    filename: function (req, file, callback) {
        callback(null, file.filename + '.xlsx')
    }
}).single('file');

const uploadprofile = multer({
    dest: __dirname.split('src')[0] + 'public/images/profilePic/',
    filename: function (req, file, callback) {
        callback(null, file.filename + '.png')
    }
}).single('avatar');

const imageConversion = async (name) => {
    Jimp.read(__dirname.split('src')[0] + `public/images/profilePic/${name}`, async function (err, image) {
        if (err) {
            return null;
        } else {
            await image.write(__dirname.split('src')[0] + `public/images/profilePic/${name}.png`)
            return name;
        }
    })
}

class UserActivity {

    async registerUser(req, res) {
        try {
            let logo, facebook, copyright_year, twitter,
                skype_email, brand_name, support_mail,
                reseller, admin_email, facebookHide, footerHide, twitterHide;


            const first_name = req.body.first_name ? req.body.first_name.replace(/'/g, "''").replace(/"/g, '""') : null;
            const last_name = req.body.last_name ? req.body.last_name.replace(/'/g, "''").replace(/"/g, '""') : null;
            const email = req.body.email.toLowerCase();
            let password = req.body.password;
            const emp_code = req.body.emp_code;
            const project_name = req.body.project_name || '';
            const location_id = parseInt(req.body.location_id);
            const department_id = parseInt(req.body.department_id);
            const role_ids = req.body.role_id.split(',');
            const date_join = req.body.date_join ? moment(req.body.date_join, 'MM/DD/YYYY').format('YYYY-MM-DD') : null;
            const address = req.body.address || null;
            const status = parseInt(req.body.status) || 1;
            const contact_number = req.body.phone ? req.body.phone : null;
            const photo_path = '/default/profilePic/user.png';
            const timezone = req.body.timezone;
            const { organization_id, language } = req.decoded;
            const shift_id = req.body.shift_id || 0
            const tracking_mode = req.body.tracking_mode || 1;
            const tracking_rule_type = req.body.tracking_rule_type || 1;
            const encriptedpassword = req.body.encriptedpassword || null;
            const is_mobile = req.body.is_mobile || 0;

            // Removal Codes of Auto Assign Superior
            // let manager_role_id = req.body.manager_role_id;
            // let assigned_manager = req.body.assigned_manager;

            password = password ? PasswordEncodeDecoder.passwordDecrypt(password) : password;
            let findMoreLink = {
                development: process.env.WEB_DEV, production: process.env.WEB_PRODUCTION
            }[process.env.NODE_ENV] || process.env.WEB_LOCAL;

            let validate = UserValidation.validateUserRegister({
                first_name: first_name, last_name: last_name, email: email, password: password, emp_code: emp_code,
                location_id: location_id, project_name:project_name, department_id: department_id, role_ids: role_ids, date_join: date_join, address: address,
                status: status, contact_number: contact_number, timezone: timezone, is_mobile
            });
            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            const userByEmpCode = await UserActivityModel.getEmployee('id', `emp_code='${emp_code}' AND organization_id=${organization_id}`);
            if (userByEmpCode.length > 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "1")[language] || userMessages.find(x => x.id === "1")["en"], 'User emp code exists error');
            const userByEmail = await UserActivityModel.getUser('id', `email='${email}' OR a_email='${email}'`);
            if (userByEmail.length > 0) {
                let [userDetail] = await UserActivityModel.getUserDetails({ email: email });
                if (!userDetail){
                        /* Delete user if already present */
                        let [isAdminEmail] = await UserActivityModel.checkIsAdmin(email);
                        if (isAdminEmail) return sendResponse(res, 400, null, userMessages.find(x => x.id === "3")[language] || userMessages.find(x => x.id === "3")["en"], 'Email already exist.');
                        // await UserActivityModel.deleteUserDetails({ email: email });
                }
                else return sendResponse(res, 400, null, userMessages.find(x => x.id === "3")[language] || userMessages.find(x => x.id === "3")["en"], 'Email already exist.');
            }


            let encripted;
            if (encriptedpassword) {
                encripted = encriptedpassword;
            } else {
                encripted = await PasswordEncodeDecoder.encryptText(password, process.env.CRYPTO_PASSWORD);
            }
            const [orgSetting] = await UserActivityModel.getOrganizationSeeting(organization_id);
            if (orgSetting.current_count >= orgSetting.total_allowed_user_count) return sendResponse(res, 400, null, userMessages.find(x => x.id === "4")[language] || userMessages.find(x => x.id === "4")["en"], null);

            const user = await UserActivityModel.userRegister(first_name, last_name, email, encripted, contact_number, date_join, address, photo_path, status);

            const employee = await UserActivityModel.addUserToEmp(user.insertId, organization_id, department_id, location_id, emp_code, shift_id, timezone, tracking_mode, tracking_rule_type, orgSetting.rules, project_name,  is_mobile);

            const userToRole = await UserActivityModel.addMultiRoleToUser(user.insertId, _.unique(role_ids), req.decoded.user_id);
            await UserActivityModel.updateadminProperties({ organization_id, current_user_count: orgSetting.current_count + 1 });
            syncEmpCloudSeats(organization_id);

            const roles = await UserActivityModel.getRoles(organization_id);
            let roleMessage = '';

            // Removal Codes of Auto Assign Superior
            // if (manager_role_id > 0 && assigned_manager.length > 0) {

            //     let insertData = [];
            //     assigned_manager.forEach((components) => {
            //         insertData.push([+employee.insertId, +components, +manager_role_id])
            //     }
            //     )

            //     await UserActivityModel.bulkAssign(insertData);

            // }

            role_ids.map(r => roleMessage += `${roles.find(x => x.id == r).name}/`);
            let jsonParsed = roles.find(x => x.id == role_ids[0]).permission;
            if (jsonParsed) jsonParsed = JSON.parse(jsonParsed);

            if (!jsonParsed || jsonParsed.send_mail == undefined || jsonParsed.send_mail == 1) {
                reseller = orgSetting.details;
                let silahCustomTemplate = false;
                if(orgSetting.reseller_user_id) {
                    // Check if reseller is Silah
                    let [reseller_org] = await UserActivityModel.getResellerOrgId(orgSetting.reseller_user_id);
                    if (ConfigData.SILAH_CUSTOM_MAIL_TEMPLATE.split(',').includes(String(reseller_org.organization_id))) silahCustomTemplate = true;
                }
                if(ConfigData.SILAH_CUSTOM_MAIL_TEMPLATE.split(',').includes(String(organization_id))) {
                    const [resellerDetails] = await UserActivityModel.isReseller(organization_id);
                    reseller = resellerDetails.details;
                    silahCustomTemplate = true;
                }
                reseller = reseller ? JSON.parse(reseller) : reseller;
                logo = reseller ? (reseller.logo || process.env.EMPLOGO) : process.env.EMPLOGO
                facebook = reseller ? (reseller.facebook || null) : process.env.FACEBOOK;
                copyright_year = reseller ? (reseller.copyright_year || process.env.COPYRIGHT_YEAR) : process.env.COPYRIGHT_YEAR
                twitter = reseller ? (reseller.twitter || null) : process.env.TWITTER;
                skype_email = reseller ? (reseller.skype_email || null) : process.env.SKYPE_EMAIL;
                brand_name = reseller ? (reseller.brand_name || process.env.BRAND_NAME) : process.env.BRAND_NAME;
                support_mail = reseller ? (reseller.support_mail || null) : process.env.SUPPORT_EMAIL;
                admin_email = reseller ? (reseller.admin_email || process.env.EMP_SUPPORT_EMAIL) : process.env.EMP_SUPPORT_EMAIL
                findMoreLink = reseller ? reseller.domain : findMoreLink;
                facebookHide = facebook ? "" : "hidden";
                twitterHide = twitter ? "" : "hidden";
                footerHide = twitter || facebook ? "" : "hidden"

                let templateMessage = forgotPasswordMessages[language || "en"];
                delete templateMessage["message"]
                delete templateMessage["subject"]
                let mailMessage = roleUpateMailMessage[language || "en"]
                delete mailMessage.subject;
                let message = mailMessage.registerMessage
                message = message.replace("RRRR", roleMessage.slice(0, -1));
                message = message.replace("BBBB", brand_name);
                delete mailMessage["message"]

                if(!ConfigData?.BLOCK_SPECIFIC_ORGANIZATION_EMPLOYEE_EMAIL?.includes(organization_id)) await Mail.sendEMail({
                    email, message, name: first_name, password, role: 'M',
                    footerHide, facebookHide, twitterHide, logo,
                    subject: message,
                    facebook, copyright_year, twitter, skype_email,
                    brand_name, support_mail,
                    admin_email, findMoreLink,silahCustomTemplate,
                    ...mailMessage,
                    ...templateMessage
                });
            }
            req.body.user_id = employee.insertId;
            // Assign employee if it is registered by Non Admin's
            if(!req.decoded.is_admin) {
                await UserActivityModel.assignUser(employee.insertId, req.decoded.employee_id, req.decoded.role_id);
            }
            if(ConfigData.AUTO_ASSIGN_USER.includes(+organization_id)) eventEmitter.emit('register', { employee_id: employee.insertId, organization_id, role_ids, department_id, location_id });
            actionsTracker(req, 'User %i successfully registered.', [user.id]);
            return sendResponse(res, 200, req.body, userMessages.find(x => x.id === "5")[language] || userMessages.find(x => x.id === "5")["en"], null);
        } catch (err) {
            console.log(err, '-------------');
            Logger.error(`-V3---error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Error occured while register user.', 'Error occured while register user.');
        }
    }

    async userList(req, res) {

        const { organization_id, language } = req.decoded;
        let skip = parseInt(req.body.skip) || 0;
        let limit = parseInt(req.body.limit) || 10;
        const department_id = req.body.department_id;
        const location_id = req.body.location_id;
        const role_id = req.body.role_id;
        const name = req.body.name;
        const to_assigned_id = req.body.non_admin_id || null ;
        const sortColumn = req.body.sortColumn;
        const sortOrder = req.body.sortOrder;
        const start_date = req.body.start_date;
        const end_date = req.body.end_date;
        const status = req.body.status || null;
        const emp_code = req.body.emp_code;
        const expand = req.body.expand || 0;
        const shift_id = req.body.shift_id || -1;
        actionsTracker(req, 'Users list requested (?).', [{ department_id, location_id, role_id, name }]);

        if (name) {
            if (name.length < 3) return sendResponse(res, 400, null, userMessages.find(x => x.id === "6")[language] || userMessages.find(x => x.id === "6")["en"], null);
        }
        try {
            const validate = UserValidation.usersValidataion({ department_id: department_id, location_id: location_id, role_id: role_id, name: name, status, emp_code, expand })
            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            let users = await UserActivityModel.userList(organization_id, location_id, department_id, role_id, name, skip, limit, to_assigned_id, sortColumn, sortOrder, start_date, end_date, status, emp_code, expand, shift_id);
            if (users.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "7")[language] || userMessages.find(x => x.id === "7")["en"], null);

            const employee_ids = _.pluck(users, 'id');
            const user_roles = await UserActivityModel.getRolesByUserId(employee_ids)
            users = users.map(itr => ({ ...itr, roles: user_roles.filter(i => i.id == itr.id).map(x => ({ role_id: x.role_id, role: x.role, role_type: x.role_type })) }));

            const total_count = users.length > 0 ? users[0].total_count : 0;
            const org_total_count = users.length > 0 ? users[0].org_total_count : 0;
            const has_more_data = (skip + limit) >= total_count ? false : true;
            let idealTime = users[0].ideal_time ? JSON.parse(users[0].ideal_time) : null;
            let offlineTime = users[0].offline_time ? JSON.parse(users[0].offline_time) : null;

            users.map(e => { delete e.total_count, delete e.offline_time, delete e.ideal_time, delete e.org_total_count });

            const role = await UserActivityModel.getRoles(organization_id);
            const uniqueRole = _.uniq(_.pluck(role, 'name'));
            await Promise.all(users.map(async (user) => {

                if (user.password && user.password !== 'null' && user.password !== ' ') {
                    user.encriptedpassword = user.password;
                    user.password = await PasswordEncodeDecoder.decryptText(user.password, process.env.CRYPTO_PASSWORD);
                    user.password = user.password ? PasswordEncodeDecoder.passwordEncrypt(user.password) : user.password;

                }
                let empCountData = await UserActivityModel.checkAssigened(`employee_id = ${user.id}`);
                user.is_employee_assigned_to = empCountData[0].tolal_count > 0 ? true : false;

                let countData = await UserActivityModel.checkAssigened(`to_assigned_id = ${user.id}`);
                user.is_employee_assigned_by = countData[0].tolal_count > 0 ? true : false;

                user.geolocation = user.geolocation ? JSON.parse(user.geolocation) : user.geolocation;
                user.role_id = user.roles && user.roles.length ? user.roles[0].role_id : '';
                user.role = user.roles && user.roles.length ? user.roles[0].role : '';
            }));

            if(ConfigData.EMPLOYEE_DETAILS_LAST_LOGIN.includes(+organization_id)) {
                let userIds = _.pluck(users, 'id');
                let employeeAttendance = await UserActivityModel.getEmployeeLastAttendance(userIds);
                users = users.map(user => {
                    let attendance = employeeAttendance.find(att => att.id === user.id);
                    return {
                        ...user,
                        last_login: attendance ? attendance.end_time : null
                    }
                })
            }

            return sendResponse(res, 200, {
                status_data: { idealTime, offlineTime },
                user_data: users,
                total_count: total_count,
                org_total_count: org_total_count,
                has_more_data: has_more_data,
                skip_value: skip + limit,
                limit: limit
            }, userMessages.find(x => x.id === "8")[language] || userMessages.find(x => x.id === "8")["en"], null);
        } catch (err) {
            console.log('========', err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Error while getting employees', err);
        }
    }

    async userListCustom(req, res) {

        const { organization_id, language } = req.decoded;
        if(!req.tailored) {
            let requestTime = await redis.getAsync(`fetch-employee-${organization_id}`);
            if(requestTime) return res.status(429).json({code: 429, error: null, message: "You have reached maximum retries. Please try again after 7 hours"});
            if(!requestTime) {
                await redis.setAsync(
                    `fetch-employee-${organization_id}`,
                    Date.now(),
                    'EX',
                    30 * 60 * 60
                );
            }
        }
        let skip = parseInt(req.body.skip) || 0;
        let limit = parseInt(req.body.limit) || 10;
        const department_id = req.body.department_id;
        const location_id = req.body.location_id;
        const role_id = req.body.role_id;
        const name = req.body.name;
        const to_assigned_id = null;
        const sortColumn = req.body.sortColumn;
        const sortOrder = req.body.sortOrder;
        const start_date = req.body.start_date;
        const end_date = req.body.end_date;
        const status = req.body.status || null;
        const emp_code = req.body.emp_code;
        const expand = req.body.expand || 0;

        if (name) {
            if (name.length < 3) return res.status(400).json({
                code: 400,
                data: null,
                message: userMessages.find(x => x.id === "6")[language] || userMessages.find(x => x.id === "6")["en"],
                error: null
            });
        }
        try {
            const validate = UserValidation.usersValidataion({ department_id: department_id, location_id: location_id, role_id: role_id, name: name, status, emp_code, expand })
            if (validate.error) return res.status(404).json({
                code: 404,
                data: null,
                message: userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"],
                error: validate.error.details[0].message
            });

            let users = await UserActivityModel.userListCustom(organization_id, location_id, department_id, role_id, name, skip, limit, to_assigned_id, sortColumn, sortOrder, start_date, end_date, status, emp_code, expand);
            if (users.length === 0) return res.status(400).json({
                code: 400,
                data: null,
                message: userMessages.find(x => x.id === "7")[language] || userMessages.find(x => x.id === "7")["en"],
                error: null
            });

            const employee_ids = _.pluck(users, 'id');
            const user_roles = await UserActivityModel.getRolesByUserId(employee_ids)
            users = users.map(itr => ({ ...itr, roles: user_roles.filter(i => i.id == itr.id).map(x => ({ role_id: x.role_id, role: x.role, role_type: x.role_type })) }));

            const total_count = users.length > 0 ? users[0].total_count : 0;
            const org_total_count = users.length > 0 ? users[0].org_total_count : 0;

            users.map(e => { delete e.total_count, delete e.offline_time, delete e.ideal_time, delete e.org_total_count });

            const role = await UserActivityModel.getRoles(organization_id);
            const uniqueRole = _.uniq(_.pluck(role, 'name'));
            await Promise.all(users.map(async (user) => {

                if (user.password && user.password !== 'null' && user.password !== ' ') {
                    user.encriptedpassword = user.password;
                    user.password = await PasswordEncodeDecoder.decryptText(user.password, process.env.CRYPTO_PASSWORD);
                    user.password = user.password ? PasswordEncodeDecoder.passwordEncrypt(user.password) : user.password;

                }
                let empCountData = await UserActivityModel.checkAssigened(`employee_id = ${user.id}`);
                user.is_employee_assigned_to = empCountData[0].tolal_count > 0 ? true : false;

                let countData = await UserActivityModel.checkAssigened(`to_assigned_id = ${user.id}`);
                user.is_employee_assigned_by = countData[0].tolal_count > 0 ? true : false;

                user.geolocation = user.geolocation ? JSON.parse(user.geolocation) : user.geolocation;
                user.role_id = user.roles && user.roles.length ? user.roles[0].role_id : '';
                user.role = user.roles && user.roles.length ? user.roles[0].role : '';
                if(user.password) delete user.password;
                if(user.encriptedpassword) delete user.encriptedpassword;
                if(user.room_id) delete user.room_id;
                if(user.geolocation) delete user.geolocation;
                if(user.project_name) delete user.project_name;
                if(user.domain) delete user.domain;
                if(user.tracking_mode) delete user.tracking_mode;
                if(user.tracking_rule_type) delete user.tracking_rule_type;
            }));
            return sendResponse(res, 200, {
                user_data: users,
                total_count: total_count,
                org_total_count: org_total_count,
            }, userMessages.find(x => x.id === "8")[language] || userMessages.find(x => x.id === "8")["en"], null);
        } catch (err) {
            console.log('========', err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return res.status(500).json({
                code: 500,
                data: null,
                message: "Something went wrong while fetching users data.",
                error: 'Internal Server Error'
            })
        }
    }

    async updateProfile(req, res) {
        const { organization_id, language } = req.decoded;
        const user_id = req.body.userId;
        const user_details = await UserActivityModel.userInformation(user_id, organization_id);
        if (user_details.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "10")[language] || userMessages.find(x => x.id === "10")["en"], 'User Not Found Error.');
        const first_name = req.body.first_name || user_details[0].first_name;
        const last_name = req.body.last_name || user_details[0].last_name;
        let email = req.body.email ? req.body.email.toLowerCase().trim() : user_details[0].email;
        let password = req.body.password;
        let address = req.body.address || user_details[0].address;
        let phone = req.body.phone || user_details[0].phone;
        let location_id = req.body.location_id || user_details[0].location_id;
        let project_name=req.body.project_name || '';
        let role_ids = req.body.role_id ? req.body.role_id.split(',') : [];
        let emp_code = req.body.emp_code || user_details[0].emp_code;
        let department_id = req.body.department_id || user_details[0].department_id;
        let joinDate = req.body.joinDate ? moment(req.body.joinDate, 'MM/DD/YYYY').format('YYYY-MM-DD') : user_details[0].date_join ? moment(user_details[0].date_join).format('YYYY-MM-DD') : null;
        let status = req.body.status || user_details[0].status;
        let photo_path = user_details[0].photo_path;
        const timezone = req.body.timezone || user_details[0].timezone;
        const systemType = user_details[0].system_type;
        const timezone_offset = 0;
        let decriptedPassword;
        let old_password;
        let new_user_details;
        let is_mobile = req.body.is_mobile ?? 0;

        // Removal Codes of Auto Assign Superior
        // let manager_role_id = req.body.manager_role_id;
        // let assigned_manager = req.body.assigned_manager;

        const shift_id = req.body.shift_id || user_details[0].shift_id;
        const encriptedpassword = req.body.encriptedpassword || null;
        let findMoreLink = {
            development: process.env.WEB_DEV, production: process.env.WEB_PRODUCTION
        }[process.env.NODE_ENV] || process.env.WEB_LOCAL;

        try {
            password = password ? PasswordEncodeDecoder.passwordDecrypt(password) : password;
            let validate = UserValidation.validateUserUpdate(user_id, first_name, last_name, email, password, emp_code, location_id, department_id, role_ids, joinDate, address, status, phone, timezone, timezone_offset, shift_id);
            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            if (req.body.email && req.body.email.toLowerCase().trim() !== user_details[0].email?.toLowerCase()) {
                const userByEmail = await UserActivityModel.getUser('id', `email='${email}' OR a_email='${email}'`);
                if (userByEmail.length > 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "3")[language] || userMessages.find(x => x.id === "3")["en"], 'Email exists error.');
            }

            if (req.body.emp_code && req.body.emp_code !== user_details[0].emp_code) {
                const userByEmpCode = await UserActivityModel.getEmployee('id', `emp_code='${emp_code}' AND organization_id=${organization_id}`);
                if (userByEmpCode.length > 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "1")[language] || userMessages.find(x => x.id === "1")["en"], 'Employee Code exists error.');
            }
            if (encriptedpassword) {
                password = encriptedpassword;
            } else if (req.body.password) {
                const encripted = await PasswordEncodeDecoder.encryptText(password, process.env.CRYPTO_PASSWORD);
                password = encripted
            } else {
                password = user_details[0].password;
            }
            role_ids = role_ids.map(x => parseInt(x))
            if (role_ids.length > 0) {
                const roles = await UserActivityModel.userRoles(user_details[0].temp_user_id);
                const roleIds = _.pluck(roles, 'role_id');

                const toBeInsertedRoles = role_ids.filter(item => !roleIds.includes(item));
                const toBeDeletedRoles = roleIds.filter(item => !role_ids.includes(item));

                if (toBeDeletedRoles.length > 0) {
                    for (const r of toBeDeletedRoles) {
                        await UserActivityModel.deleteAssignedWithRole(`to_assigned_id=${user_id} AND role_id=${r}`);
                    }
                    await UserActivityModel.deleteUserRole(user_details[0].temp_user_id, toBeDeletedRoles);
                }
                if (toBeInsertedRoles.length > 0) {

                    await UserActivityModel.addMultiRoleToUser(user_details[0].temp_user_id, _.unique(toBeInsertedRoles), req.decoded.user_id);
                    if(ConfigData.AUTO_ASSIGN_USER.includes(+organization_id)) eventEmitter.emit('role_update', { role_ids: toBeInsertedRoles, employee_id: user_id, organization_id });
                }

                if (password && password !== 'null' && password !== ' ' && password !== null) {
                    const decriptedPass = await PasswordEncodeDecoder.decryptText(password, process.env.CRYPTO_PASSWORD);
                    if (toBeInsertedRoles.length > 0 || toBeDeletedRoles.length > 0) {
                        const roles = await UserActivityModel.getRoles(organization_id);
                        let roleMessage = '';

                        //Logic to check inserted roles having send_mail=1 and get role names accordingly
                        let isSendMailInserted = 0, insertedRole = []
                        let jsonDataInserted = roles.filter(item => toBeInsertedRoles.includes(item.id));
                        if (jsonDataInserted.length > 0) {
                            jsonDataInserted.filter(item => {
                                let obj = JSON.parse(item.permission);
                                if (obj.send_mail == undefined || obj.send_mail == 1) { isSendMailInserted = 1; insertedRole.push(item.name) }
                            })
                        }
                        //Logic to check removed roles having send_mail=1 and get role names accordingly
                        let isSendMailRemoved = 0, removedRole = [];
                        let jsonDataRemoved = roles.filter(item => toBeDeletedRoles.includes(item.id));
                        if (jsonDataRemoved.length > 0) {
                            jsonDataRemoved.filter(item => {
                                let obj = JSON.parse(item.permission);
                                if (obj.send_mail == undefined || obj.send_mail == 1) { isSendMailRemoved = 1; removedRole.push(item.name) }
                            })
                        }
                        if (insertedRole.length > 0 && isSendMailInserted == 1) {
                            insertedRole.forEach(ele => { roleMessage += ele + ',' })
                            roleMessage = roleMessage.slice(0, -1);
                            roleMessage = (roleMessage + " " + translate(rolePermissionMessages, '12', language).toLowerCase())
                        }
                        if (removedRole.length > 0 && isSendMailRemoved == 1) {
                            let removed = ''
                            if (roleMessage) { roleMessage += ' ' + translate(statementConnector, 'AND', language)[0].toUpperCase() + translate(statementConnector, 'AND', language).slice(1) + ' ' }
                            removedRole.forEach(ele => { removed += ele + ',' })
                            roleMessage += removed.toString().slice(0, -1)
                            roleMessage = (roleMessage + " " + translate(rolePermissionMessages, '14', language).toLowerCase())
                        }

                        if (roleMessage && (isSendMailRemoved == 1 || isSendMailInserted == 1)) {
                            let logo, facebook, copyright_year, twitter,
                                skype_email, brand_name, support_mail,
                                reseller, admin_email, facebookHide, footerHide, twitterHide, support, regards;

                            const [OrgSetting] = await UserActivityModel.getOrganizationSeeting(organization_id);
                            if (OrgSetting) {
                                reseller = OrgSetting.details;
                                let silahCustomTemplate = false;
                                if(OrgSetting.reseller_user_id) {
                                    // Check if reseller is Silah
                                    let [reseller_org] = await UserActivityModel.getResellerOrgId(OrgSetting.reseller_user_id);
                                    if (ConfigData.SILAH_CUSTOM_MAIL_TEMPLATE.split(',').includes(String(reseller_org.organization_id))) silahCustomTemplate = true;
                                }
                                if(ConfigData.SILAH_CUSTOM_MAIL_TEMPLATE.split(',').includes(String(organization_id))) {
                                    const [resellerDetails] = await UserActivityModel.isReseller(organization_id);
                                    reseller = resellerDetails.details;
                                    silahCustomTemplate = true;
                                }
                                reseller = reseller ? JSON.parse(reseller) : reseller;
                                logo = reseller ? (reseller.logo || process.env.EMPLOGO) : process.env.EMPLOGO
                                facebook = reseller ? (getResellerData(reseller, "facebook") || null) : process.env.FACEBOOK;
                                copyright_year = reseller ? (reseller.copyright_year || process.env.COPYRIGHT_YEAR) : process.env.COPYRIGHT_YEAR
                                twitter = reseller ? (getResellerData(reseller, "twitter") || null) : process.env.TWITTER;
                                skype_email = reseller ? (getResellerData(reseller, "skype_email") || null) : process.env.SKYPE_EMAIL;
                                brand_name = reseller ? (reseller.brand_name || process.env.BRAND_NAME) : process.env.BRAND_NAME;
                                support_mail = reseller ? (getResellerData(reseller, "support_mail") || null) : process.env.SUPPORT_EMAIL;
                                admin_email = reseller ? (reseller.admin_email || process.env.EMP_SUPPORT_EMAIL) : process.env.EMP_SUPPORT_EMAIL
                                facebookHide = facebook ? "" : "hidden";
                                twitterHide = twitter ? "" : "hidden";
                                footerHide = twitter || facebook ? "" : "hidden"
                                findMoreLink = reseller ? reseller.domain : findMoreLink;

                                let templateMessage = forgotPasswordMessages[language || "en"];
                                delete templateMessage["message"]
                                delete templateMessage["subject"]
                                let mailMessage = roleUpateMailMessage[language || "en"]

                                let message = `${roleMessage} ${translate(statementConnector, 'ON', language)} ${brand_name}.`;
                                if(!ConfigData?.BLOCK_SPECIFIC_ORGANIZATION_EMPLOYEE_EMAIL?.includes(organization_id))  await Mail.sendEMail({
                                    footerHide, facebookHide, twitterHide, logo,
                                    message, facebook, copyright_year, twitter, skype_email,
                                    brand_name, support_mail,
                                    admin_email, ...mailMessage, findMoreLink,
                                    email, message, name: first_name, password: decriptedPass, role: 'M',silahCustomTemplate
                                });
                            }
                        }
                    }
                }
            }


            // Removal Codes of Auto Assign Superior
            // if (manager_role_id > 0 && assigned_manager.length > 0) {
            //     await UserActivityModel.deleteAssignedRole(user_id, [manager_role_id]);

            //     let insertData = [];
            //     assigned_manager.forEach((components) => {
            //         insertData.push([+user_id, +components, +manager_role_id])
            //     }
            //     )

            //     await UserActivityModel.bulkAssign(insertData);

            // }

            // if (req.body.role_id && parseInt(req.body.role_id) !== user_details[0].role_id) {
            //     const roleUpdate = await UserActivityModel.updateRole(user_details[0].temp_user_id, role_id);
            //     await UserActivityModel.updateRoleType(user_id, role_id);
            //     eventEmitter.emit('role_update', { oldRole: user_details[0].role_id, newRole: req.body.role_id, employee_id: user_id, organization_id });
            // }

            await UserActivityModel.updateProfileData(user_details[0].temp_user_id, user_id, first_name, email, address, location_id, department_id, emp_code, phone, joinDate, photo_path, last_name, password, timezone, shift_id, systemType, project_name);
            const [details, roles] = await Promise.all([
                await UserActivityModel.getEmployeefullDetails(`e.id=${user_id}`),
                await UserActivityModel.userRoles(user_details[0].temp_user_id)
            ])
            new_user_details = details[0];
            new_user_details.roles = roles;
            new_user_details = [new_user_details];
            // new_user_details
            if (new_user_details[0].password && new_user_details[0].password !== 'null' && new_user_details[0].password !== ' ' && new_user_details[0].password !== null) {
                new_user_details[0].encriptedpassword = new_user_details[0].password;
                decriptedPassword = await PasswordEncodeDecoder.decryptText(new_user_details[0].password, process.env.CRYPTO_PASSWORD);
                if (user_details[0].password !== null) {
                    old_password = await PasswordEncodeDecoder.decryptText(user_details[0].password, process.env.CRYPTO_PASSWORD);
                }
                old_password = user_details[0].password;
                new_user_details[0].password = decriptedPassword ? PasswordEncodeDecoder.passwordEncrypt(decriptedPassword) : decriptedPassword;
            }
            if (req.body.location_id && req.body.location_id !== user_details[0].location_id) {
                eventEmitter.emit('update_location', { employee_id: user_id, location_id });
                eventEmitter.emit('location_update_on_assign', { employee_id: user_id, location_id, old_location_id: user_details[0].location_id, department_id: user_details[0].department_id, organization_id });
            }

            if (req.body.department_id && req.body.department_id !== user_details[0].department_id) {
                eventEmitter.emit('update_department', { employee_id: user_id, department_id });
                eventEmitter.emit('departemnt_update_on_assign', { employee_id: user_id, department_id, old_department_id: user_details[0].department_id, location_id, organization_id });
            }

            delete new_user_details[0].custom_tracking_rule;
            // if (req.body.role_id && parseInt(req.body.role_id) !== user_details[0].role_id) {
            //     if (new_user_details[0].role_name == 'Employee') {
            //         await UserActivityModel.deleteToAssigned(user_id);
            //     }
            // }
            // if (req.body.role_id && parseInt(req.body.role_id) !== user_details[0].role_id) {
            //     let message = ` Role Updated To ${new_user_details[0].role_name}`;
            //     let mail = await Mail.sendEMail(user_details[0].email, message, message, user_details[0].first_name, new_user_details[0].password, new_user_details[0].role_name === "Employee" ? 'E' : 'M');
            // }
            event.emit('update-employee-redis-data-by-employee_id', user_id);
            // Removal Codes of Auto Assign Superior
            // if (manager_role_id == 0) {
            //     await UserActivityModel.bulkAssignDelete(user_id);
            // }


            actionsTracker(req, 'User %i profile updated.', [user_id]);
            return sendResponse(res, 200, new_user_details, userMessages.find(x => x.id === "9")[language] || userMessages.find(x => x.id === "9")["en"], null);

        } catch (err) {
            console.log('========', err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable To Update User Details.', 'Unable To Update User Details.');
        }
    }

    async getUsers(req, res, next) {
        try {
            let manager_id = req.decoded.employee_id || null;
            const { organization_id, language } = req.decoded;
            const department_id = req.body.department_id;
            const location_id = req.body.location_id;
            const role_id = req.body.role_id;
            const status = req.body.status;
            let name;
            let to_assign_role = req.decoded.role_id || null;

            const validate = UserValidation.usersValidataion({ department_id: department_id, location_id: location_id, role_id: role_id, name: name, status: status })
            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            const employees = await UserActivityModel.users(organization_id, manager_id, location_id, role_id, department_id, to_assign_role, status);

            if (employees.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "10")[language] || userMessages.find(x => x.id === "10")["en"], null);
            return sendResponse(res, 200, employees, userMessages.find(x => x.id === "8")[language] || userMessages.find(x => x.id === "8")["en"], null);
        } catch (err) {
            console.log('======', err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable to get employees', err);
        }
    }

    async getSingleUserDetails(req, res) {
        const { organization_id, language } = req.decoded;
        let user_id = req.body.user_id;
        let role_id = req.body.role_id;
        actionsTracker(req, 'User %i full details requested.', [user_id]);

        try {
            const validate = UserValidation.empIdValidation({ employee_id: user_id, role_id });
            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            let data = await UserActivityModel.getEmployeefullDetails(`e.id=${user_id} AND e.organization_id=${organization_id}`);
            if (data.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "10")[language] || userMessages.find(x => x.id === "10")["en"], null);


            let to_assigned_details = await UserActivityModel.getAssignedDetails({ employee_id: user_id, organization_id, role_id });

            if (to_assigned_details.length > 0)
                data[0]['fetched_role_id'] = _.pluck(to_assigned_details, 'role_id');
            else
                data[0]['fetched_role_id'] = [];

            if (role_id > 0)
                return sendResponse(res, 200, to_assigned_details, userMessages.find(x => x.id === "8")[language] || userMessages.find(x => x.id === "8")["en"], null);


            let decriptedPassword = null;
            if (data[0].password && data[0].password !== '' && data[0].password !== 'null') {
                decriptedPassword = PasswordEncodeDecoder.decryptText(data[0].password, process.env.CRYPTO_PASSWORD);
            }

            data[0].encriptedpassword = data[0].password;
            // data[0].password = decriptedPassword;
            data[0].password = decriptedPassword ? PasswordEncodeDecoder.passwordEncrypt(decriptedPassword) : decriptedPassword;

            delete data[0].custom_tracking_rule;

            const roles = await UserActivityModel.userRoles(data[0].u_id);
            data[0].roles = roles;
            // const role = await UserActivityModel.getRoles(organization_id);
            // if (data[0].role_name !== 'Manager') {
            //     let managerRole = role.find(r => r.name === 'Manager');
            //     if (managerRole) {
            //         let managerData = await UserActivityModel.getAssignedDetailsByUserId(data[0].id, managerRole.id);
            //         data[0].manager = managerData.length > 0 ? managerData : null;
            //     } else {
            //         data[0].manager = null;
            //     }
            //     let teamleadRole = role.find(r => r.name === 'Team Lead');
            //     if (teamleadRole) {
            //         let teamleadData = await UserActivityModel.getAssignedDetailsByUserId(data[0].id, teamleadRole.id);
            //         data[0].teamlead = teamleadData.length > 0 ? teamleadData : null;
            //     } else {
            //         data[0].teamlead = null;
            //     }
            // } else {
            //     data[0].manager = null;
            //     data[0].teamlead = null;
            // }
            // if (data[0].role_name === 'Manager') {
            //     let managerRole = role.find(r => r.name === 'Manager')
            //     let count = await UserActivityModel.checkEmployeeAssigened(data[0].id, managerRole.id);
            //     data[0].is_employee_assigned = count[0].tolal_count > 0 ? 1 : 0;
            //     data[0].is_employee_assigned_teamlead = 0;
            // } else if (data[0].role_name === 'Team Lead') {
            //     let teamleadRole = role.find(r => r.name === 'Team Lead')
            //     let countData = await UserActivityModel.checkEmployeeAssigened(data[0].id, teamleadRole.id);
            //     data[0].is_employee_assigned_teamlead = countData[0].tolal_count > 0 ? 1 : 0;
            //     data[0].is_employee_assigned = 0;
            // } else {
            //     data[0].is_employee_assigned_teamlead = 0;
            //     data[0].is_employee_assigned = 0;
            // }
            // const temp = roles.find(x => x.name == 'Employee')
            // data[0].role_name = temp ? temp.name : roles[0].name;
            // if (data[0].role_name == 'Employee') {
            //     let empCountData = await UserActivityModel.checkAssigened(`employee_id = ${data[0].id}`);
            //     data[0].is_employee_assigned_to = empCountData[0].tolal_count > 0 ? true : false;
            //     data[0].is_employee_assigned_by = false;
            // } else {
            let empCountData = await UserActivityModel.checkAssigened(`employee_id = ${data[0].id}`);
            data[0].is_employee_assigned_to = empCountData[0].tolal_count > 0 ? true : false;

            let countData = await UserActivityModel.checkAssigened(`to_assigned_id = ${data[0].id}`);
            data[0].is_employee_assigned_by = countData[0].tolal_count > 0 ? true : false;
            // }



            return sendResponse(res, 200, data[0], userMessages.find(x => x.id === "8")[language] || userMessages.find(x => x.id === "8")["en"], null);

        } catch (err) {
            console.log('==========', err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable to get user details', err);
        }
    }

    async removeMultipleUser(req, res) {
        const { organization_id, language, email: loggedInEmail } = req.decoded;
        let user_ids = req.body.user_ids;
        try {
            if (user_ids.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "16")[language] || userMessages.find(x => x.id === "16")["en"], null);

            let validate = UserValidation.validateMultipleIds(user_ids);
            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            const emps = await UserActivityModel.getEmpWithUserDetails(organization_id, user_ids);
            if (emps.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "10")[language] || userMessages.find(x => x.id === "10")["en"], null);

            for (const { first_name, last_name, computer_name, employee_id, email, user_id } of emps) {
                const attIds = await UserActivityModel.getAttandanceIds(organization_id, employee_id);
                const attendanceIds = _.pluck(attIds, 'attendance_id');

                const deleted = await UserActivityModel.deleteUsers(user_id);
                if (deleted.affectedRows !== 0) {
                    const ogCount = await UserActivityModel.updatePlan(organization_id);
                    syncEmpCloudSeats(organization_id);
                    eventEmitter.emit('delete_employees_data', { organization_id, employee_id: employee_id, attendanceIds, email });
                    const ip = req.connection ? req.connection.remoteAddress : null;
                    await UserActivityModel.addRemovedUsers({ organization_id, first_name, last_name, computer_name, email, loggedInEmail, ip: ip });
                    await redis.delAsync(user_id);
                    await redis.delAsync(`${email.toLowerCase()}_pack`);
                    await redis.delAsync(`${email.toLowerCase()}_agent_auth`);
                    await redis.delAsync(`${email.toLowerCase()}_system`);
                    await redis.delAsync(`${email.toLowerCase()}_user_id`);
                    await redis.delAsync(`${email.toLowerCase()}_invalid_email_cred`);
                    const previousActiveToken = await redis.getAsync(`agent:active:token:${employee_id}`);
                    if (previousActiveToken) await redis.setAsync(previousActiveToken, 'deleted', 'EX', 60 * 60 * 11);
                }
            }
            actionsTracker(req, 'Users ? successfully deleted.', [user_ids]);

            return sendResponse(res, 200, req.body, userMessages.find(x => x.id === "11")[language] || userMessages.find(x => x.id === "11")["en"], null);
        } catch (err) {
            console.log('=============', err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable to delete users', err);
        }
    }

    async updateUserStatus(req, res) {
        const { organization_id, language } = req.decoded;
        let user_ids = req.body.user_ids;
        let status = req.body.status;
        let validate = UserValidation.validateMultipleUserId(user_ids, status);
        if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);
        try {
            let emps = await UserActivityModel.getEmployee(`user_id, id`, `organization_id=${organization_id} AND id IN(${user_ids})`);
            if (emps.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "10")[language] || userMessages.find(x => x.id === "10")["en"], 'User Not Found Error.');
            let ids = _.pluck(emps, 'user_id');

            let updated = await UserActivityModel.updateUser(`status=${status}`, `id IN(${ids})`);
            if(status == 2){
                let biometricData = await UserActivityModel.deleteData(ids);
            }
            ids.map(async id => {
                let redisData = await redis.getAsync(id);
                if (redisData) {
                    redisData = JSON.parse(redisData);
                    redisData.status = status;
                    await redis.delAsync(id);
                    await redis.setAsync(id, JSON.stringify(redisData), 'EX', Comman.getTime(process.env.JWT_EXPIRY))
                }
            })
            for (const e of emps) {
                const previousActiveToken = await redis.getAsync(`agent:active:token:${e.id}`);
                if (previousActiveToken) await redis.setAsync(previousActiveToken, 'deleted', 'EX', 60 * 60 * 11);
            }

            if (updated.changedRows === 0) return sendResponse(res, 400, null, status == 1 ? userMessages.find(x => x.id === "12")[language] || userMessages.find(x => x.id === "12")["en"] : userMessages.find(x => x.id === "13")[language] || userMessages.find(x => x.id === "13")["en"], 'Not updated');
            let msg = status == 1 ? userMessages.find(x => x.id === "14")[language] || userMessages.find(x => x.id === "14")["en"] : userMessages.find(x => x.id === "15")[language] || userMessages.find(x => x.id === "15")["en"];

            actionsTracker(req, 'Users ? status updated to ?.', [user_ids, status]);
            return sendResponse(res, 200, req.body, `${msg}`, null);
        } catch (err) {
            console.log('=============', err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable to update user status', err);
        }
    }

    async userRegisterBulk(req, res) {
        upload(req, res, async function (err) {
            let logo, facebook, copyright_year, twitter,
                skype_email, brand_name, support_mail,
                reseller, admin_email, facebookHide, footerHide, twitterHide;

            const { organization_id, language = "en" } = req.decoded;
            const count = parseInt(req.query.count);
            let users = [];
            let emp_code_users = [];
            let validation = []
            let final_user = [];
            if (!req.file || err) return sendResponse(res, 400, null, userMessages.find(x => x.id === "17")[language] || userMessages.find(x => x.id === "17")["en"], err);
            const workbook = XLSX.readFile(`${__dirname.split('src')[0] + '/public/'}${req.file.filename}`, { cellDates: true });
            const sheet_name_list = workbook.SheetNames;
            const user_data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]], { raw: false });

            const header = bulkRegAndUpdate[language || 'en'];

            fs.unlinkSync(`${__dirname.split('src')[0] + '/public/'}${req.file.filename}`);
            if (user_data.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "19")[language] || userMessages.find(x => x.id === "19")["en"], null);
            if (!(typeof user_data[0][header.email] !== 'undefined')) return sendResponse(res, 400, null, bulkRegisterMessage.find(i => i.id == 1)[language], bulkRegisterMessage.find(i => i.id == 1)[language]);
            if (!(typeof user_data[0][header.first_name] !== 'undefined')) return sendResponse(res, 400, null, bulkRegisterMessage.find(i => i.id == 2)[language], bulkRegisterMessage.find(i => i.id == 2)[language]);
            if (!(typeof user_data[0][header.password] !== 'undefined')) return sendResponse(res, 400, null, bulkRegisterMessage.find(i => i.id == 3)[language], bulkRegisterMessage.find(i => i.id == 3)[language]);
            if (!(typeof user_data[0][header.employee_code] !== 'undefined')) return sendResponse(res, 400, null, bulkRegisterMessage.find(i => i.id == 4)[language], bulkRegisterMessage.find(i => i.id == 4)[language]);
            if (!(typeof user_data[0][header.department] !== 'undefined')) return sendResponse(res, 400, null, bulkRegisterMessage.find(i => i.id == 5)[language], bulkRegisterMessage.find(i => i.id == 5)[language]);
            if (!(typeof user_data[0][header.location] !== 'undefined')) return sendResponse(res, 400, null, bulkRegisterMessage.find(i => i.id == 6)[language], bulkRegisterMessage.find(i => i.id == 6)[language]);
            if (!(typeof user_data[0][header.last_name] !== 'undefined')) return sendResponse(res, 400, null, bulkRegisterMessage.find(i => i.id == 7)[language], bulkRegisterMessage.find(i => i.id == 7)[language]);
            //if(!(typeof user_data[0][header.project_name]!=='undefined')) return sendResponse(res, 400, null, 'Project Name Header Key Not Matched.', 'Project Name Header Key Not Matched.'); 
            // if (!(typeof user_data[0]["Address"] !== 'undefined')) return sendResponse(res, 400, null, 'Address Header Key Not Matched.', 'Address Header Key Not Matched.');
            // if (!(typeof user_data[0]["DOJ"] !== 'undefined')) return sendResponse(res, 400, null, 'DOJ Header Key Not Matched.', 'DOJ Header Key Not Matched.');
            // if (!(typeof user_data[0]["Phone"] !== 'undefined')) return sendResponse(res, 400, null, 'Phone Header Key Not Matched.', 'Phone Header Key Not Matched.');
            // if (!(typeof user_data[0]["CountryCode"] !== 'undefined')) return sendResponse(res, 400, null, 'CountryCode Header Key Not Matched.', 'CountryCode Header Key Not Matched.');
            if (!(typeof user_data[0][header.role] !== 'undefined')) return sendResponse(res, 400, null, bulkRegisterMessage.find(i => i.id == 8)[language], bulkRegisterMessage.find(i => i.id == 8)[language]);

            user_data.map(user => {
                user.Email = user[header.email] ? user[header.email].toLowerCase().trim() : '';
                user.Phone = user[header.phone] ? user[header.phone].toString().trim().replace(/-/g, "") : null;
                user.FirstName = user[header.first_name] ? user[header.first_name].toString() : '';
                user.LastName = user[header.last_name] ? user[header.last_name].toString() : '';
                user.CountryCode = user[header.country_code];
                user.projectName = user[header.project_name];
                user.Address = user[header.address] ? user[header.address].toString() : '';
                user.Password = user[header.password] ? user[header.password].toString() : '';
                user.EmployeeCode = user[header.employee_code];
                user.DOJ = user[header.DOJ];
                user.Location = user[header.location];
                user.Department = user[header.department];
                user.Timezone = user[header.timezone];
                user.Role = user[header.role];
            });
            // if (count < user_data.length) return sendResponse(res, 401, null, `You Can Add Ony ${count} Users`, null);
            // return
            try {
                let findMoreLink = {
                    development: process.env.WEB_DEV, production: process.env.WEB_PRODUCTION
                }[process.env.NODE_ENV] || process.env.WEB_LOCAL;

                const roles = await UserActivityModel.getRoles(organization_id);
                const [orgSetting] = await UserActivityModel.getOrganizationSeeting(organization_id);

                if ((orgSetting.current_count + user_data.length) > orgSetting.total_allowed_user_count) return sendResponse(res, 401, null, userMessages.find(x => x.id === "4")[language] || userMessages.find(x => x.id === "4")["en"], null);
                let count = orgSetting.current_count;
                for (const user of user_data) {
                    let isValidDate;
                    if (user.DOJ != undefined) {
                        isValidDate = moment(user.DOJ.toString(), 'MM/DD/YYYY', false).isValid()
                    }
                    const validate = UserValidation.singleUserValidation({ ...user }, language || 'en')
                    if (validate.error) {
                        validation.push({ user: user, message: validate.error.details[0].message });
                    } else if ((!user.Phone && user.CountryCode) || (user.Phone && !user.CountryCode)) {
                        validation.push({ user: user, message: 'Enter both phone number and country code.' });
                    }
                    else if (isValidDate == false && user.DOJ != undefined) {
                        validation.push({ user: user, message: 'Date of join format must be MM/DD/YYYY' });
                    } else {
                        const first_name = user.FirstName.trim();
                        const last_name = user.LastName.trim();
                        const email = user.Email.toLowerCase().trim();
                        let password = user.Password;
                        const emp_code = user.EmployeeCode;
                        const project_name = user.projectName;
                        const location = user.Location.trim();
                        let location_id;
                        const department = user.Department.trim();
                        let department_id;
                        let date_join = user.DOJ ? `'${moment(user.DOJ).format('YYYY-MM-DD')}'` : null;
                        if (moment().diff(moment(date_join).format("YYYY-MM-DD"), 'days') < 0 ) date_join = `'${moment().format('YYYY-MM-DD')}'`;
                        const address = user.Address ? `'${user.Address.replace(/'/g, "''").replace(/"/g, '""')}'` : null;
                        const status = 1;
                        const phone = (user.Phone && user.CountryCode) ? `'${user.CountryCode}-${user.Phone}'` : null;
                        let photo_path = '/default/profilePic/user.png';
                        let role_ids = [];
                        let timezone = orgSetting.timezone;
                        if (user.Timezone) {
                            let zone = timezones.find(t => t.name === user.Timezone);
                            zone ? (timezone = zone.zone) : (timezone = orgSetting.timezone);

                        }
                        user.Role.split(',').map(x => {
                            const temp_role = roles.find(r => r.name.toLowerCase().trim() == x.toLowerCase().trim());
                            if (temp_role) role_ids.push(temp_role.id);
                        })
                        if (role_ids.length === 0) {
                            validation.push({ user: user, message: 'Role not found' });
                            continue;
                        }
                        const user_by_email = await UserActivityModel.getUser('id', `email='${email}' OR a_email='${email}'`);
                        if (user_by_email.length > 0) {            
                            let [userDetail] = await UserActivityModel.getUserDetails({ email: email });
                            if (!userDetail){
                                    /* Delete user if already present */
                                    let [isAdminEmail] = await UserActivityModel.checkIsAdmin(email);
                                    if (isAdminEmail) continue;
                                    // await UserActivityModel.deleteUserDetails({ email: email });
                            }
                            else {
                                users.push(user);
                                continue;
                            }
                        }

                        const user_by_empcode = await UserActivityModel.getEmployee('id', `emp_code='${emp_code}' AND organization_id=${organization_id}`);
                        if (user_by_empcode.length > 0) {
                            emp_code_users.push(user);
                            continue;
                        }
                        const location_data = await UserActivityModel.checkLoc('id,name', `name = '${location}' AND organization_id =${organization_id}`);
                        if (location_data.length === 0) {
                            const new_location = await UserActivityModel.addLoc(location, organization_id, timezone);
                            location_id = new_location.insertId;
                        } else {
                            location_id = location_data[0].id;
                        }

                        const department_data = await UserActivityModel.checkDept('id,name', `name='${department}' AND organization_id=${organization_id}`);
                        if (department_data.length === 0) {
                            const new_department = await UserActivityModel.createDept(organization_id, department);
                            department_id = new_department.insertId;
                        } else {
                            department_id = department_data[0].id;
                        }

                        const encripted = await PasswordEncodeDecoder.encryptText(password, process.env.CRYPTO_PASSWORD);
                        const loc_dept = await UserActivityModel.getSingleLocWithDept(location_id, department_id);
                        if (loc_dept.length === 0) {
                            const new_dept_loc = await UserActivityModel.addDeptToLoc(location_id, department_id);
                        }

                        const data = await UserActivityModel.userRegister(first_name.replace(/'/g, "''").replace(/"/g, '""'), last_name.replace(/'/g, "''").replace(/"/g, '""'), email, encripted, phone, date_join, address, photo_path, status);
                        const emp = await UserActivityModel.addUserToEmp(data.insertId, organization_id, department_id, location_id, emp_code, 0, timezone, 1, 1, orgSetting.rules,project_name);
                        const userToRole = await UserActivityModel.addMultiRoleToUser(data.insertId, _.unique(role_ids), req.decoded.user_id);

                        user.id = emp.insertId;
                        // Assign employee if it is registered by Non Admin's
                        if(!req.decoded.is_admin) {
                            await UserActivityModel.assignUser(emp.insertId, req.decoded.employee_id, req.decoded.role_id);
                        }
                        count = count + 1;
                        await UserActivityModel.updateadminProperties({ organization_id, current_user_count: count });
                        syncEmpCloudSeats(organization_id);
                        if(ConfigData.AUTO_ASSIGN_USER.includes(+organization_id)) eventEmitter.emit('register', { employee_id: emp.insertId, organization_id, role_ids, department_id, location_id });
                        final_user.push(user);

                        let roleMessage = '';

                        role_ids.map(r => roleMessage += `${roles.find(x => x.id == r).name}/`);
                        let jsonParsed = roles.find(x => x.id == role_ids[0]).permission;
                        if (jsonParsed) jsonParsed = JSON.parse(jsonParsed);

                        if (!jsonParsed || jsonParsed.send_mail == undefined || jsonParsed.send_mail == 1) {
                            // const message = `You added as ${roleMessage.slice(0, -1)} role on empmonitor.`;
                            // await Mail.sendEMail(email, message, message, first_name, password, 'M');
                            reseller = orgSetting.details;
                            let silahCustomTemplate = false;
                                if(orgSetting.reseller_user_id) {
                                    // Check if reseller is Silah
                                    let [reseller_org] = await UserActivityModel.getResellerOrgId(orgSetting.reseller_user_id);
                                    if (ConfigData.SILAH_CUSTOM_MAIL_TEMPLATE.split(',').includes(String(reseller_org.organization_id))) silahCustomTemplate = true;
                                }
                                if(ConfigData.SILAH_CUSTOM_MAIL_TEMPLATE.split(',').includes(String(organization_id))) {
                                    const [resellerDetails] = await UserActivityModel.isReseller(organization_id);
                                    reseller = resellerDetails.details;
                                    silahCustomTemplate = true;
                                }
                            reseller = reseller ? JSON.parse(reseller) : reseller;
                            logo = reseller ? (reseller.logo || process.env.EMPLOGO) : process.env.EMPLOGO
                            facebook = reseller ? (reseller.facebook || null) : process.env.FACEBOOK;
                            copyright_year = reseller ? (reseller.copyright_year || process.env.COPYRIGHT_YEAR) : process.env.COPYRIGHT_YEAR
                            twitter = reseller ? (reseller.twitter || null) : process.env.TWITTER;
                            skype_email = reseller ? (reseller.skype_email || null) : process.env.SKYPE_EMAIL;
                            brand_name = reseller ? (reseller.brand_name || process.env.BRAND_NAME) : process.env.BRAND_NAME;
                            support_mail = reseller ? (reseller.support_mail || null) : process.env.SUPPORT_EMAIL;
                            admin_email = reseller ? (reseller.admin_email || process.env.EMP_SUPPORT_EMAIL) : process.env.EMP_SUPPORT_EMAIL
                            findMoreLink = reseller ? reseller.domain : findMoreLink;
                            facebookHide = facebook ? "" : "hidden";
                            twitterHide = twitter ? "" : "hidden";
                            footerHide = twitter || facebook ? "" : "hidden"

                            let templateMessage = forgotPasswordMessages[language || "en"];
                            delete templateMessage["message"]
                            delete templateMessage["subject"]
                            let mailMessage = roleUpateMailMessage[language || "en"]
                            delete mailMessage.subject;
                            let message = mailMessage.registerMessage
                            message = message.replace("RRRR", roleMessage.slice(0, -1));
                            message = message.replace("BBBB", brand_name);
                            delete mailMessage["message"]

                            if(!ConfigData?.BLOCK_SPECIFIC_ORGANIZATION_EMPLOYEE_EMAIL?.includes(organization_id)) await Mail.sendEMail({
                                email, message, name: first_name, password, role: 'M',
                                footerHide, facebookHide, twitterHide, logo,
                                subject: message,
                                facebook, copyright_year, twitter, skype_email,
                                brand_name, support_mail,
                                admin_email, findMoreLink,silahCustomTemplate,
                                ...mailMessage,
                                ...templateMessage
                            });


                        }
                    }
                }
            } catch (err) {
                console.log('-----------------', err);
                Logger.error(`--v3--error-----${err}------${__filename}----`);
                return sendResponse(res, 400, null, 'Failed To Add Users', 'Failed To Add Users');
            }

            actionsTracker(req, 'Users ? successfully added.', [final_user.map(user => user.id)]);
            return sendResponse(res, 200, {
                already_email_exists_users: users,
                added_users: final_user,
                already_empcode_exists: emp_code_users,
                validation_failed_users: validation
            }, userMessages.find(x => x.id === "18")[language] || userMessages.find(x => x.id === "18")["en"], null);
        })
    }

    async userDeleteBulk(req, res) {
        try {
            upload(req, res, async function (err) {

                const { organization_id, language, email: loggedInEmail } = req.decoded;
                if (!req.file || err) return sendResponse(res, 400, null, userMessages.find(x => x.id === "17")[language] || userMessages.find(x => x.id === "17")["en"], err);
                const workbook = XLSX.readFile(`${__dirname.split('src')[0] + '/public/'}${req.file.filename}`, { cellDates: true });
                const sheet_name_list = workbook.SheetNames;
                let user_data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]], { raw: false });

                const header = bulkRegAndUpdate[language || 'en'];

                fs.unlinkSync(`${__dirname.split('src')[0] + '/public/'}${req.file.filename}`);
                if (user_data.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "19")[language] || userMessages.find(x => x.id === "19")["en"], null);
                if (!(typeof user_data[0][header.email] !== 'undefined')) return sendResponse(res, 400, null, 'Email Header Key Not Matched.', 'Email Header Key Not Matched.');

                user_data.map(user => {
                    user.Email = user[header.email] ? user[header.email].toLowerCase().trim() : '';
                });

                user_data = user_data.reduce((arr, item) => {
                    if (arr.length) {
                        if (!arr.some(i => i?.Email == item?.Email)) arr.push({ Email: item?.Email });
                    } else {
                        arr.push({ Email: item?.Email });
                    }
                    return arr;
                }, []);

                let invalid_email = [];
                let success_email = [];
                for (const user of user_data) {
                    if (!user.Email) continue;
                    let empDetail = await UserActivityModel.getUserByUserEmail(user.Email, organization_id);

                    if (!empDetail.length) {
                        invalid_email.push(user.Email)
                        continue;
                    }

                    let {id: employee_id, user_id, first_name, last_name, computer_name} = empDetail[0];

                    const attIds = await UserActivityModel.getAttandanceIds(organization_id, employee_id);
                    const attendanceIds = _.pluck(attIds, 'attendance_id');
    
                    const deleted = await UserActivityModel.deleteUsers(user_id);
                    if (deleted.affectedRows !== 0) {
                        success_email.push(user?.Email);
                        const ogCount = await UserActivityModel.updatePlan(organization_id);
                        syncEmpCloudSeats(organization_id);
                        eventEmitter.emit('delete_employees_data', { organization_id, employee_id: employee_id, attendanceIds, email: user?.Email });
                        const ip = req.connection ? req.connection.remoteAddress : null;
                        await UserActivityModel.addRemovedUsers({ organization_id, first_name, last_name, computer_name, email: user?.Email, loggedInEmail, ip: ip });
                        await redis.delAsync(user_id);
                        await redis.delAsync(`${user?.Email.toLowerCase()}_pack`);
                        await redis.delAsync(`${user?.Email.toLowerCase()}_agent_auth`);
                        await redis.delAsync(`${user?.Email.toLowerCase()}_system`);
                        await redis.delAsync(`${user?.Email.toLowerCase()}_user_id`);
                        await redis.delAsync(`${user?.Email.toLowerCase()}_invalid_email_cred`);
                    }
                }

                return sendResponse(res, 200, { success_email, invalid_email }, 'Success', null);

            })
        } catch (error) {
            return sendResponse(res, 400, null, 'Unable to delete users', err);
        }
    }

    async bulkUpdateEmployee(req, res, next) {
        const { organization_id, language = "en" } = req.decoded;
        upload(req, res, async (err) => {
            try {
                if (!req.file || err) return sendResponse(res, 400, null, userMessages.find(x => x.id === "17")[language] || userMessages.find(x => x.id === "17")["en"], err);
                const workbook = XLSX.readFile(`${__dirname.split('src')[0] + '/public/'}${req.file.filename}`, {
                    cellDates: true
                });
                const sheet_name_list = workbook.SheetNames;
                const user_data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

                const header = bulkRegAndUpdate[language || 'en'];

                fs.unlinkSync(`${__dirname.split('src')[0] + '/public/'}${req.file.filename}`);
                if (user_data.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "19")[language] || userMessages.find(x => x.id === "19")["en"], null);
                user_data.map(user => {
                    user.EmployeeUniqueId = user[header.employee_unique_id];

                    if (user[header.employee_code]) user.EmployeeCode = isNaN(user[header.employee_code]) ? user[header.employee_code].trim() : user[header.employee_code];
                    if (user[header.email]) user.Email = user[header.email].toLowerCase().trim();
                    if (user[header.phone]) user.Phone = user[header.phone].toString().trim().replace(/-/g, "");
                    if (user[header.first_name]) user.FirstName = user[header.first_name].toString();
                    if (user[header.last_name]) user.LastName = user[header.last_name].toString();
                    if (user[header.project_name]) user.projectName=user[header.project_name].toString();
                    if (user[header.address]) user.Address = user[header.address].toString();
                    if (user[header.password]) user.Password = user[header.password].toString();
                    if (user[header.country_code]) user.CountryCode = user[header.country_code];
                    if (user[header.DOJ]) user.DOJ = user[header.DOJ];
                    if (user[header.location]) user.Location = user[header.location].trim();
                    if (user[header.department]) user.Department = user[header.department].trim();
                    if (user[header.role]) user.Role = user[header.role].trim();
                    if (user[header.timezone]) user.Timezone = user[header.timezone];
                    if (user[header.manager]) user.Manager = user[header.manager];
                    if (user[header.shift]) user.Shift = user[header.shift];
                });
                await UserValidation.bulkUpdateEmployeeData(organization_id, language).validateAsync(user_data);
                // if (count < user_data.length) return sendResponse(res, 401, null, `You Can Ony Update ${count} Users`, null);
                const [roles, usersData] = await Promise.all([
                    UserActivityModel.getRoles(organization_id),
                    // UserActivityModel.getLocations(organization_id),
                    // UserActivityModel.getDepartments(organization_id),
                    UserActivityModel.getMultipleEmployees(organization_id, _.pluck(user_data, 'EmployeeUniqueId').map(x => `"${x}"`)),
                ]);

                // const nonExistingRoles = user_data.map(x => x.Role).filter(item => item && !roles.find(x => x.name === item));
                // const nonExistingLocations = user_data.map(x => x.Location).filter(item => item && !locations.find(x => x.name === item));
                // const nonExistingDepartments = user_data.map(x => x.Department).filter(item => item && !departments.find(x => x.name === item));
                let new_roles = [];
                user_data.map(x => new_roles.push(...x?.Role?.split(',')))
                const nonExistingRoles = _.unique(new_roles).filter(item => item && !roles.find(x => x.name.toLowerCase().trim() === item.toLowerCase().trim()));
                // const nonExistingEmpCodes = user_data.map(x => x.EmployeeCode).filter(item => item && !usersData.find(x => x.emp_code == item));
                const nonExistEmployeeUniqueId = user_data.map(x => x.EmployeeUniqueId).filter(item => item && !usersData.find(x => x.employee_unique_id == item));

                let newMails = [];
                user_data.map(user => {
                    let e = usersData.find(x => x.employee_unique_id === user.EmployeeUniqueId)
                    if (e) {
                        if (user.Email && user.Email != e.a_email) {
                            newMails.push(`"${user.Email}"`);
                        }
                    }
                });

                let newEmpCodes = [];
                let dataMergingUserData = [];
                let existsWithEmail = [];
                let existsWithEmpCode = [];
                user_data.map(user => {
                    let e = usersData.find(x => x.employee_unique_id === user.EmployeeUniqueId)
                    if (e) {
                        if (user.EmployeeCode.toString().toLowerCase() != e.emp_code.toString().toLowerCase()) {
                            newEmpCodes.push(`"${user.EmployeeCode}"`);
                        }
                        if (user.Email && user.Email != e?.a_email) {
                            newMails.push(`"${user.Email}"`);
                            dataMergingUserData.push(user);
                        }
                    }
                });

                if(process.env.ORGANIZATION_ID.split(',').includes(`${organization_id}`)) {
                    newMails = [];
                    for (const user of dataMergingUserData) {
                        let [userWithSameEmpCodeEmail] = await UserActivityModel.findUserBySameEmpCodeEmail(user.Email, user['Employee Code']);
                        if(!userWithSameEmpCodeEmail) newMails.push(`"${user.Email}"`);
                    }
                }


                if (newMails.length > 0) {
                    existsWithEmail = await UserActivityModel.getUser('a_email AS email', `a_email IN( ${newMails.toString()} )`);
                }

                if (newEmpCodes.length > 0) {
                    existsWithEmpCode = await UserActivityModel.getEmployee('emp_code', `organization_id=${organization_id} AND emp_code IN( ${newEmpCodes.toString()} )`);
                }
                if (
                    nonExistingRoles.length > 0 ||
                    // nonExistingLocations.length > 0 ||
                    // nonExistingDepartments.length > 0 ||
                    nonExistEmployeeUniqueId.length > 0 ||
                    existsWithEmail.length > 0 ||
                    existsWithEmpCode.length > 0
                ) {
                    return sendResponse(
                        res,
                        400,
                        { nonExistingRoles, existsWithEmpCode, existsWithEmail, nonExistEmployeeUniqueId },
                        'Some of the data does not exist.',
                        'Bad Request'
                    );
                }
                let MangerEmails = []
                for (const emp of user_data) {
                    for (const role of roles) {
                        if (!emp[role.name]) continue;
                        if (emp[role.name] === 'Employee') continue;
                        MangerEmails = [...MangerEmails, ...emp[role.name]?.split(',')]
                    }
                }
                MangerEmails = MangerEmails.map(x => `"${x.trim()}"`);
                let managersList = [];
                if (MangerEmails.length > 0) {
                    managersList = await UserActivityModel.getMultipleEmployeesByMail(organization_id, MangerEmails);
                }
                for (let user of user_data) {
                    let {
                        Email = null,
                        FirstName = null,
                        LastName = null,
                        Password = null,
                        Location = null,
                        projectName = null,
                        Role = null,
                        EmployeeCode = null,
                        Department = null,
                        Address = null,
                        DOJ = null,
                        Phone = null,
                        CountryCode = null,
                        Timezone = null,
                        Shift = null,
                        EmployeeUniqueId
                    } = user;
                    if (Timezone) {
                        let zone = timezones.find(t => t.name === Timezone);
                        zone ? (Timezone = zone.zone) : (Timezone = null);
                    }
                    if (Department == null || Department == "null") Department = "Default";
                    if (Location == null || Location == "null") Location = "Default";
                    FirstName = FirstName ? FirstName.replace(/'/g, "''").replace(/"/g, '""') : FirstName;
                    LastName = LastName ? LastName.replace(/'/g, "''").replace(/"/g, '""') : LastName;
                    Address = Address ? Address.replace(/'/g, "''").replace(/"/g, '""') : Address;

                    // const roleSearch = roles.find(x => x.name === Role);
                    let role_ids = [];
                    if (Role) {
                        Role?.split(',')?.map(x => {
                            const temp_role = roles.find(r => r.name.toLowerCase().trim() == x.toLowerCase().trim());
                            if (temp_role) role_ids.push(temp_role.id);
                        })
                    }

                    let location_id = null;
                    let department_id = null;
                    const user_id = (usersData.find(x => x.employee_unique_id == EmployeeUniqueId)).user_id;
                    const employee_id = (usersData.find(x => x.employee_unique_id == EmployeeUniqueId)).employee_id
                    // const role_id = roleSearch ? roleSearch.id : null;
                    const encriptedPassword = Password && Password.trim() ? await PasswordEncodeDecoder.encryptText(Password, process.env.CRYPTO_PASSWORD) : null;
                    const contact_number = Phone ? CountryCode ? `${CountryCode}-${Phone}` : `${Phone}` : null;

                    const location_data = await UserActivityModel.checkLoc('id,name', `name = '${Location}' AND organization_id =${organization_id}`);
                    if (location_data.length === 0) {
                        Timezone = Timezone ? Timezone : 'Asia/Kolkata';
                        const new_location = await UserActivityModel.addLoc(Location, organization_id, Timezone);
                        location_id = new_location.insertId;
                    } else {
                        location_id = location_data[0].id;
                    }

                    const department_data = await UserActivityModel.checkDept('id,name', `name='${Department}' AND organization_id=${organization_id}`);
                    if (department_data.length === 0) {
                        const new_department = await UserActivityModel.createDept(organization_id, Department);
                        department_id = new_department.insertId;
                    } else {
                        department_id = department_data[0].id;
                    }

                    const loc_dept = await UserActivityModel.getSingleLocWithDept(location_id, department_id);
                    if (loc_dept.length === 0) {
                        const new_dept_loc = await UserActivityModel.addDeptToLoc(location_id, department_id);
                    }
                    const [userDetails] = await UserActivityModel.getUserByUserId(user_id);
                    await Promise.all([
                        UserActivityModel.updateEmployeeData(EmployeeCode, department_id, location_id, Timezone, employee_id, projectName),
                        UserActivityModel.updateUserData(user_id, FirstName, LastName, Email, encriptedPassword, contact_number, DOJ ? moment(DOJ).format('YYYY-MM-DD') : null, Address),
                        // UserActivityModel.updateRoleData(user_id, role_id)
                    ]);
                    if (role_ids.length > 0) {
                        const roles = await UserActivityModel.userRoles(user_id);
                        const roleIds = _.pluck(roles, 'role_id');

                        const toBeInsertedRoles = role_ids.filter(item => !roleIds.includes(item));
                        const toBeDeletedRoles = roleIds.filter(item => !role_ids.includes(item));
                        if (toBeDeletedRoles.length > 0) {
                            for (const r of toBeDeletedRoles) {
                                await UserActivityModel.deleteAssignedWithRole(`to_assigned_id=${employee_id} AND role_id=${r}`);
                            }
                            await UserActivityModel.deleteUserRole(user_id, toBeDeletedRoles);
                        }
                        if (toBeInsertedRoles.length > 0) {
                            await UserActivityModel.addMultiRoleToUser(user_id, _.unique(toBeInsertedRoles), req.decoded.user_id);
                            if(ConfigData.AUTO_ASSIGN_USER.includes(+organization_id)) eventEmitter.emit('role_update', { role_ids: toBeInsertedRoles, employee_id, organization_id });
                        }
                    }
                    // if (userDetails && role_id != null && userDetails.role_id != role_id) {
                    //     eventEmitter.emit('role_update', { oldRole: userDetails.role_id, newRole: role_id, employee_id: userDetails.id, organization_id });
                    // }
                    if (userDetails && location_id != null && userDetails.location_id != location_id) {
                        eventEmitter.emit('location_update_on_assign', { employee_id, location_id, old_location_id: userDetails.location_id, department_id: userDetails.department_id, organization_id });
                    }
                    if (userDetails && department_id != null && userDetails.department_id != department_id) {
                        eventEmitter.emit('departemnt_update_on_assign', { employee_id, department_id, old_department_id: userDetails.department_id, location_id, organization_id });
                    }
                    eventEmitter.emit('update_location', { employee_id, location_id });
                    eventEmitter.emit('update_department', { employee_id, department_id });

                    //shift updating logic
                    let shiftId = await UserActivityModel.getShiftData(organization_id, Shift);
                    if ((Shift == null || Shift == '' || shiftId.length == 0) && user.shift !== undefined) {
                        //remove the current shift here
                        shiftId = 0;
                        await UserActivityModel.updateShift(organization_id, shiftId, employee_id);
                    } else if (Shift) {
                        //update with new shift                       
                        await UserActivityModel.updateShift(organization_id, shiftId[0].id, employee_id);
                    }

                    let insertedId;
                    if(req?.decoded?.is_admin) {
                        for(const role of roles) {
                            if(!user[role.name]) {
                                await UserActivityModel.removeAssignedUser(employee_id, role.id);
                            }
                            if (user[role.name]) {
                                let emails = user[role.name]?.split(',')?.map(email => `'${email.trim()}'`)?.join(',');
                                let nonAdminDetail = await UserActivityModel.getNonAdminDetail(emails, organization_id);
                                nonAdminDetail = nonAdminDetail.filter(i => i.role_name === role.name);
                                for(const nonAdmin of nonAdminDetail) {
                                    let ifAssigned = await UserActivityModel.checkIfAlreadyAssigned(employee_id, nonAdmin.employee_id, nonAdmin.role_id);
                                    if (ifAssigned.length !== 0) continue;
                                    if (employee_id === nonAdmin.employee_id) continue;
                                    const data = await UserActivityModel.assignUser(employee_id, nonAdmin.employee_id, nonAdmin.role_id);
                                    insertedId = data.insertId;
                                }
                                if (emails) {
                                    let nonAdminRemove = await UserActivityModel.getRemovedAssignedUser(emails, employee_id, organization_id, role.id);
                                    nonAdminRemove = nonAdminRemove.filter( i => {
                                        return ![i.email, i.a_email].some(e => user[role.name]?.includes(e));
                                    }).filter(e => e.aeid !== insertedId);
                                    if (nonAdminRemove.length) {
                                        let to_assign_id = nonAdminRemove.map(i => i.emp_id);
                                        await UserActivityModel.removedAssignedNonAdmin(employee_id, to_assign_id, role.id);
                                    }
                                }
                            }
                        }
                    }
                }

        (req, 'User %i successfully updated.', user_data);
                return res.json({ code: 200, data: null, message: userMessages.find(x => x.id === "9")[language] || userMessages.find(x => x.id === "9")["en"], error: null });
            } catch (err) {
                next(err);
            }

        })
    }

    async upgradeAndDownGradeUser(req, res) {
        const { organization_id, language } = req.decoded;
        const { user_id, role_id } = req.body;

        let validate = UserValidation.usersUpDownGradeValidataion({ user_id, role_id });
        if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

        try {
            let user = await UserActivityModel.userInformation(user_id, organization_id);
            if (user.length === 0) return sendResponse(res, 400, null, 'User not found.', 'User not found');

            let role = await UserActivityModel.getRoles(organization_id);

            if (user[0].password && user[0].password !== '' && user[0].password !== 'null') {
                user[0].password = await PasswordEncodeDecoder.decryptText(user[0].password, process.env.CRYPTO_PASSWORD);
            }

            let newRole = role.find(r => r.id === parseInt(role_id));
            if (!newRole) return sendResponse(res, 400, null, 'Invalid role', null);

            //let message = ` Role Updated To ${newRole.name}`;
            let message = '';
            await UserActivityModel.updateRole(user[0].temp_user_id, role_id);
            req.body.name = newRole.role;

            await UserActivityModel.updateRoleType(user_id, role_id);
            if(ConfigData.AUTO_ASSIGN_USER.includes(+organization_id)) eventEmitter.emit('role_update', { oldRole: user[0].role_id, newRole: role_id, employee_id: user_id, organization_id });

            if (newRole.name == 'Employee') {
                await UserActivityModel.deleteToAssigned(user_id);
            }

            let parsedData;
            if (role_id) {
                role.map(x => {
                    var jsonParsed = JSON.parse(x.permission);
                    if (x.id == role_id) {
                        parsedData = jsonParsed
                        if (jsonParsed.send_mail == undefined || jsonParsed.send_mail == 1) {
                            message = `Your Role Updated To ${x.name}`;
                        }
                    }
                })
            }

            if (!parsedData || parsedData.send_mail == undefined || parsedData.send_mail == 1 && message && user[0].email) {
                if(!ConfigData?.BLOCK_SPECIFIC_ORGANIZATION_EMPLOYEE_EMAIL?.includes(organization_id)) await Mail.sendEMail(user[0].email, message, message, user[0].first_name, user[0].password, newRole.name === "Employee" ? 'E' : 'M');
                actionsTracker(req, 'Mail send to user %i.', [user[0].id]);
                return sendResponse(res, 200, req.body, `${message} And Mail Send To ${user[0].first_name}`, null)
            }

            // if (message && user[0].email) {
            //     let mail = await Mail.sendEMail(user[0].email, message, message, user[0].first_name, user[0].password, newRole.name === "Employee" ? 'E' : 'M');
            // }

            return sendResponse(res, 200, req.body, `${message}`, null)
        } catch (err) {
            console.log('=========', err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable to upgrade and downgrade user', 'Unable to upgrade and downgrade user');
        }
    }

    async assignUser(req, res) {
        const { organization_id, language } = req.decoded;
        const user_multi_manager = req.body.user_multi_manager;
        const user_teamlead = req.body.user_teamlead;
        const user_manager = req.body.user_manager;

        let assigned_users_tl = [];
        let assigned_users_manager = [];
        let assigned_manager = [];
        let already_assigned_tl = [];
        let already_assigned_manager = [];

        let validate = UserValidation.assignUserValidation({ user_multi_manager, user_teamlead, user_manager });
        if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

        try {
            let role = await UserActivityModel.getRoles(organization_id);
            if (user_multi_manager && user_multi_manager.user_id) {
                let Role = role.find(r => r.name === 'Manager');
                if (!Role) return sendResponse(res, 400, null, userMessages.find(x => x.id === "20")[language] || userMessages.find(x => x.id === "20")["en"], null);

                let deleted = await UserActivityModel.removeAlreadyAssigned(user_multi_manager.user_id, Role.id);
                if (user_multi_manager.manager_ids && user_multi_manager.manager_ids.length > 0) {
                    for (const user of user_multi_manager.manager_ids) {
                        let assign_users = await UserActivityModel.assignUser(user_multi_manager.user_id, user, Role.id);
                        let user_details = await UserActivityModel.userInformation(user, organization_id);
                        assigned_manager.push({
                            manager_id: user_details[0].id,
                            status: user_details[0].status,
                            first_name: user_details[0].first_name,
                            last_name: user_details[0].last_name
                        });
                    }
                    actionsTracker(req, 'User %i assigned to managers ?.', [user.id, user_multi_manager.manager_ids]);
                }
            }
            if (user_manager && user_manager.user_ids.length > 0 && user_manager.manager_id) {
                let Role = role.find(r => r.name === 'Manager');
                if (!Role) return sendResponse(res, 400, null, userMessages.find(x => x.id === "20")[language] || userMessages.find(x => x.id === "20")["en"], null);
                for (const user of user_manager.user_ids) {
                    let assigned = await UserActivityModel.checkAssignedUser(user, user_manager.manager_id, Role.id);
                    if (assigned.length === 0) {
                        let assign_users = await UserActivityModel.assignUser(user, user_manager.manager_id, Role.id);
                        let user_details = await UserActivityModel.userInformation(user, organization_id);
                        assigned_users_manager.push({
                            user_id: user_details[0].id,
                            status: user_details[0].status,
                            first_name: user_details[0].first_name,
                            last_name: user_details[0].last_name
                        });
                    } else {
                        already_assigned_manager.push(assigned[0]);
                    }
                }
                actionsTracker(req, 'Users ? assigned to manager %i.', [user_manager.user_ids, user_manager.manager_id]);
            }
            if (user_teamlead && user_teamlead.user_ids.length > 0 && user_teamlead.teamlead_id) {
                let Role = role.find(r => r.name === 'Team Lead');
                if (!Role) return sendResponse(res, 400, null, userMessages.find(x => x.id === "20")[language] || userMessages.find(x => x.id === "20")["en"], null);
                for (const user_id of user_teamlead.user_ids) {
                    let assigned = await UserActivityModel.checkAssignedUser(user_id, user_teamlead.teamlead_id, Role.id);
                    if (assigned.length === 0) {
                        await UserActivityModel.assignUser(user_id, user_teamlead.teamlead_id, Role.id);
                        let user_details = await UserActivityModel.userInformation(user_id, organization_id);
                        assigned_users_tl.push({
                            user_id: user_details[0].id,
                            status: user_details[0].status,
                            first_name: user_details[0].name,
                            last_name: user_details[0].full_name
                        });
                    } else {
                        already_assigned_tl.push(assigned[0]);
                    }
                }
                actionsTracker(req, 'Users ? assigned to teamlead %i.', [user_teamlead.user_ids, user_teamlead.teamlead_id]);
            }
            return sendResponse(res, 200, { assigned_users_tl, assigned_users_manager, already_assigned_tl, already_assigned_manager, assigned_manager }, userMessages.find(x => x.id === "21")[language] || userMessages.find(x => x.id === "21")["en"], null);
        } catch (err) {
            console.log(err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable to assign user', 'Unable to assign user');
        }
    }

    async assignEmployee(req, res) {

        try {
            const { organization_id, language } = req.decoded;
            const employee_multi_upperole = req.body.employee_multi_upperole;
            const employee_to_assign = req.body.employee_to_assign;

            let assigned_employee = [];
            let assigned_employee_upperrole = [];
            let already_assigned = [];

            let validate = UserValidation.assignEmployeeValidation({ employee_multi_upperole, employee_to_assign });
            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            if (employee_multi_upperole && employee_multi_upperole.user_id) {

                let deleted = await UserActivityModel.removeAlreadyAssigned(employee_multi_upperole.user_id, employee_multi_upperole.role_id);
                if (employee_multi_upperole.to_assign_ids && employee_multi_upperole.to_assign_ids.length > 0) {
                    for (const user of employee_multi_upperole.to_assign_ids) {
                        if (employee_multi_upperole.user_id == user) continue;
                        let assign_users = await UserActivityModel.assignUser(employee_multi_upperole.user_id, user, employee_multi_upperole.role_id);
                        assigned_employee_upperrole.push({
                            to_assigned_id: user,
                            user_id: employee_multi_upperole.user_id
                        });
                    }
                    actionsTracker(
                        req, 'Employee %i assigned to managers ?  with role %i.',
                        [employee_multi_upperole.user_id, employee_multi_upperole.to_assign_ids, employee_multi_upperole.role_id]
                    );
                }
            }
            if (employee_to_assign && employee_to_assign.user_ids.length > 0 && employee_to_assign.to_assign_id) {

                for (const user of employee_to_assign.user_ids) {
                    if (user == employee_to_assign.to_assign_id) continue;
                    let assigned = await UserActivityModel.checkAssignedUser(user, employee_to_assign.to_assign_id, employee_to_assign.role_id);
                    if (assigned.length === 0) {
                        let assign_users = await UserActivityModel.assignUser(user, employee_to_assign.to_assign_id, employee_to_assign.role_id);
                        assigned_employee.push({
                            user_id: user,
                            to_assign_id: employee_to_assign.to_assign_id
                        });
                    } else {
                        already_assigned.push(assigned[0]);
                    }
                }
                actionsTracker(
                    req, 'Employees ? assigned to managers ?  with role %i.',
                    [employee_to_assign.user_ids, employee_to_assign.to_assign_id, employee_to_assign.role_id]
                );
            }
            return sendResponse(res, 200, { assigned_employee, assigned_employee_upperrole, already_assigned }, userMessages.find(x => x.id === "21")[language] || userMessages.find(x => x.id === "21")["en"], null);
        } catch (err) {
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable to assign user', 'Unable to assign user');
        }

    }

    async getEmployeeeAssigined(req, res) {
        try {
            const { organization_id, language } = req.decoded;
            let skip = parseInt(req.body.skip) || 0;
            let limit = parseInt(req.body.limit) || 10;
            const department_id = req.body.department_id || null;
            const location_id = req.body.location_id || null;
            const role_id = req.body.role_id;
            const name = req.body.name;
            const to_assigned_id = req.body.to_assigned_id;
            const sortColumn = req.body.sortColumn;
            const sortOrder = req.body.sortOrder;
            const start_date = req.body.start_date;
            const end_date = req.body.end_date;
            const status = req.body.status || null;
            let to_assign_role_id = req.body.to_assign_role_id;
            const emp_code = req.body.emp_code;
            const expand = req.body.expand || 0;
            const shift_id = req.body.shift_id || -1;
            if (req.decoded.employee_id) {
                if (req.decoded.employee_id == to_assigned_id) {
                    to_assign_role_id = to_assign_role_id || req.decoded.role_id;
                }
            }
            actionsTracker(req, 'Employees assigned to manager %i requested.', [to_assigned_id]);

            if (name) {
                if (name.length < 3) return sendResponse(res, 400, null, userMessages.find(x => x.id === "6")[language] || userMessages.find(x => x.id === "6")["en"], null);
            }
            const validate = UserValidation.usersAssginValidataion({ department_id: department_id, location_id: location_id, role_id: role_id, name: name, to_assigned_id: to_assigned_id, status, to_assign_role_id, emp_code, expand, shift_id  });
            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            // let users = await UserActivityModel.getEmployeeeAssigined(organization_id, to_assigned_id, department_id, location_id, skip, limit, name);
            let [users, [orgEmpCount]] = await Promise.all([
                UserActivityModel.getEmployeeeAssigined(organization_id, to_assigned_id, department_id, location_id, skip, limit, name, role_id, sortColumn, sortOrder, start_date, end_date, status, to_assign_role_id, emp_code, expand, shift_id ),
                UserActivityModel.orgEmpCount(organization_id)
            ]);
            if (users.length === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "7")[language] || userMessages.find(x => x.id === "7")["en"], null);

            const employee_ds = _.pluck(users, 'id');
            const user_roles = await UserActivityModel.getRolesByUserId(employee_ds)
            users = users.map(itr => ({ ...itr, roles: user_roles.filter(i => i.id == itr.id).map(x => ({ role_id: x.role_id, role: x.role, role_type: x.role_type })) }));

            const total_count = users.length > 0 ? users[0].total_count : 0;
            const has_more_data = (skip + limit) >= total_count ? false : true;
            let rules = JSON.parse(users[0].rules);
            let idealTime = rules.ideal_time;
            let offlineTime = rules.offline_time;

            users.map(e => { delete e.total_count, delete e.rules });

            await Promise.all(users.map(async (user) => {
                user.manager = null;
                user.is_employee_assigned = 0;
                user.teamlead = null;
                user.role_id = user?.roles[0]?.role_id;
                user.role = user?.roles[0]?.role;
                if (user.password && user.password !== 'null' && user.password !== ' ') {
                    user.encriptedpassword = user.password;
                    user.password = await PasswordEncodeDecoder.decryptText(user.password, process.env.CRYPTO_PASSWORD);
                }
                if (user.role === 'Employee') {
                    let empCountData = await UserActivityModel.checkAssigened(`employee_id = ${user.id}`);
                    user.is_employee_assigned_to = empCountData[0].tolal_count > 0 ? true : false;
                    user.is_employee_assigned_by = false;
                } else {
                    let empCountData = await UserActivityModel.checkAssigened(`employee_id = ${user.id}`);
                    user.is_employee_assigned_to = empCountData[0].tolal_count > 0 ? true : false;

                    let countData = await UserActivityModel.checkAssigened(`to_assigned_id = ${user.id}`);
                    user.is_employee_assigned_by = countData[0].tolal_count > 0 ? true : false;
                }

            }));

            if(ConfigData.EMPLOYEE_DETAILS_LAST_LOGIN.includes(+organization_id)) {
                let userIds = _.pluck(users, 'id');
                let employeeAttendance = await UserActivityModel.getEmployeeLastAttendance(userIds);
                users = users.map(user => {
                    let attendance = employeeAttendance.find(att => att.id === user.id);
                    return {
                        ...user,
                        last_login: attendance ? attendance.end_time : null
                    }
                })
            }

            return sendResponse(res, 200, {
                status_data: {
                    idealTime,
                    offlineTime
                },
                user_data: users,
                total_count: total_count,
                org_emp_count: orgEmpCount.org_emp_count,
                has_more_data: has_more_data,
                skip_value: skip + limit,
                limit: limit
            }, userMessages.find(x => x.id === "8")[language] || userMessages.find(x => x.id === "8")["en"], null);

        } catch (err) {
            console.log('=======', err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable to get assigned users.', err);
        }

    }

    async unassignUser(req, res) {
        const { user_ids, to_assigned_id, role_id } = req.body;
        const { organization_id, language } = req.decoded;

        try {
            const validate = UserValidation.validateUnassign({ user_ids, to_assigned_id, role_id });
            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            let data = await UserActivityModel.unassignUser(user_ids, to_assigned_id, role_id)
            if (data.affectedRows === 0) return sendResponse(res, 400, null, userMessages.find(x => x.id === "22")[language] || userMessages.find(x => x.id === "22")["en"], null);

            actionsTracker(req, 'Unassign users ? assigned to manager %i.', [user_ids, to_assigned_id]);
            return sendResponse(res, 200, req.body, userMessages.find(x => x.id === "23")[language] || userMessages.find(x => x.id === "23")["en"], null);
        } catch (err) {
            console.log('========', err);
            Logger.error(`--v3--error-----${err}------${__filename}----`);
            if (err) return sendResponse(res, 400, null, 'Unable To Unassign.', 'Unable To Unassign.');
        }
    }

    async getScreenshootParallel_new(req, res) {
        const organization_id = req.decoded.organization_id;
        const language = req.decoded.language;
        let result = [];
        let from = parseInt(req.body.from_hour);
        let to = parseInt(req.body.to_hour - 1);
        let date = moment(req.body.date).format('YYYY-MM-DD'); //'2019-12-23'
        let user_id = req.body.user_id;
        let limit = req.body.limit || 100;
        let pageToken = req.body.pageToken || '';
        let total_hour = [], credsData;

        if (from > to) return sendResponse(res, 400, null, 'To time more than from time ', null);
        let user_data = await UserActivityModel.user(user_id);
        if (user_data.length === 0) return sendResponse(res, 400, null, 'User not found.', null);

        let validate = UserValidation.validateScreenshot({ user_id, date, limit, pageToken, from, to });
        if (validate.error) return sendResponse(res, 404, null, 'Validation failed', validate.error.details[0].message);
        try {

            credsData = await UserActivityModel.getStorageDetail(organization_id);
            if (credsData.length === 0) return sendResponse(res, 400, null, 'Not Found Active Storage !', null);

            let creds = JSON.parse(credsData[0].creds);

            const startIndex = moment().tz(user_data[0].timezone).set({ hours: from }).tz('UTC').format('HH');
            const endIndex = moment().tz(user_data[0].timezone).set({ hours: to }).tz('UTC').format('HH');
            const date1 = moment(date).tz(user_data[0].timezone).set({ hours: from }).tz('UTC').format('YYYY-MM-DD');
            const date2 = moment(date).tz(user_data[0].timezone).set({ hours: to }).tz('UTC').format('YYYY-MM-DD');

            if (credsData[0].short_code == 'GD') {
                /**Get main EmpMonitor Folder Id */
                const mainFolder = await CloudStorageService.getFolderByName('EmpMonitor', creds.client_id, creds.client_secret, creds.refresh_token);
                if (mainFolder.files.length === 0) return sendResponse(res, 400, null, translate(genericErrorMessage, 'NO_SCREENSHOTS_FOR_USER_SELECTED_DATE', language), null);

                /**Get mail id folder Id like basavarajshiralashetti@globussoft.in */
                const mailFolder = await CloudStorageService.getFolderIdByParentId(mainFolder.files[0].id, user_data[0].email, creds.client_id, creds.client_secret, creds.refresh_token);
                if (mailFolder.length === 0) return sendResponse(res, 400, null, translate(genericErrorMessage, 'NO_SCREENSHOTS_FOR_USER_SELECTED_DATE', language), null);


                if (date1 === date2) {
                    //if date is same after converting utc get single folder data.

                    /**Get date folder Id like 2020-04-03 */
                    const dateIdData = await CloudStorageService.getFolderIdByParentId(mailFolder, date1, creds.client_id, creds.client_secret, creds.refresh_token);
                    if (dateIdData.length !== 0) {
                        total_hour.push(...CloudStorageService.GoogleDriveFolderFormat(startIndex, Number(endIndex) + 1, user_data[0].timezone, dateIdData, date1));
                    }
                } else {
                    //get two days folderIds  after converting utc
                    const [dateIdData, dateIdData1] = await Promise.all([
                        CloudStorageService.getFolderIdByParentId(mailFolder, date1, creds.client_id, creds.client_secret, creds.refresh_token),
                        CloudStorageService.getFolderIdByParentId(mailFolder, date2, creds.client_id, creds.client_secret, creds.refresh_token)
                    ]);
                    if (dateIdData.length !== 0) {
                        total_hour.push(...CloudStorageService.GoogleDriveFolderFormatNew(startIndex, 23, user_data[0].timezone, dateIdData, date1));
                    }
                    if (dateIdData1.length !== 0) {
                        total_hour.push(...CloudStorageService.GoogleDriveFolderFormatNew(0, endIndex, user_data[0].timezone, dateIdData1, date2));
                    }
                }
                if (total_hour.length === 0) return sendResponse(res, 400, null, translate(genericErrorMessage, 'NO_SCREENSHOTS_FOR_USER_SELECTED_DATE', language), null);
                /**Get each hour screenshot data */
                let screenshotsFlat = [];
                const screensPromises = total_hour.map(hourData => {
                    return CloudStorageService.getScreenshootFromToDate(hourData.dateFolderId, hourData.name, creds.client_id, creds.client_secret, creds.token, creds.refresh_token, pageToken, 100)
                });

                // if (total_hour.length > 1) {
                screenshotsFlat.push(...await Promise.all(screensPromises.slice(0, 1)));
                screenshotsFlat.push(...await Promise.all(screensPromises.slice(1, 2)));
                // } else {
                //     screenshotsFlat.push(...await Promise.all(screensPromises.slice(0, 1)));
                // }

                let newSortedData = CloudStorageServices.createSlots(screenshotsFlat, total_hour, user_data[0].timezone);

                screenshotsFlat = screenshotsFlat.map(({ data }, index) => {
                    const transformedData = data.files.map(elem => ({
                        id: elem.id,
                        actual: elem.name,
                        timeslot: Comman.toTimezoneDateFormat(elem.name, user_data[0].timezone, 'timeSlot'),
                        name: Comman.toTimezoneDateFormat(elem.name, user_data[0].timezone, 'time'),
                        utc: Comman.toTimezoneDateFormat(elem.name, user_data[0].timezone, 'utc'),
                        link: elem.webContentLink.replace(/&amp;/g, "&"),
                        viewLink: elem.webViewLink,
                        thumbnailLink: elem.thumbnailLink,
                        created_at: elem.createdTime,
                        updated_at: elem.modifiedTime
                    }));

                    transformedData.map(image => {
                        newSortedData.find(slot => {
                            if (image.timeslot == slot.t) {
                                slot.s.push(image);
                                slot.pageToken = data.nextPageToken ? data.nextPageToken : null
                            }
                            slot.s = lodash.uniqBy(slot.s, 'id');
                        });
                    });
                });

                return sendResponse(res, 200, { storage: 'GD', name: user_data[0].name + ' ' + user_data[0].full_name, photo_path: user_data[0].photo_path, email: user_data[0].email, user_id: user_data[0].id, screenshot: newSortedData }, 'Screenshot data ', null);
            } else if (credsData[0].short_code == 'S3') {
                /**Get screenshots from s3 bucket */
                for (let i = from; i <= to; i++) {
                    total_hour.push(i);
                }
                let s3Data = [];
                const prefix1 = `EmpMonitor/${user_data[0].email}/${date1}/`;
                const prefix2 = `EmpMonitor/${user_data[0].email}/${date2}/`;
                if (date1 === date2) {
                    s3Data.push(...await CloudStorageService.getScreenshotsS3(creds.client_id, creds.client_secret, creds.region, creds.bucket_name, prefix1));
                } else {
                    const [utcDayOne, utcDayTwo] = await Promise.all([
                        CloudStorageService.getScreenshotsS3(creds.client_id, creds.client_secret, creds.region, creds.bucket_name, prefix1),
                        CloudStorageService.getScreenshotsS3(creds.client_id, creds.client_secret, creds.region, creds.bucket_name, prefix2)
                    ]);
                    s3Data.push(...utcDayOne, ...utcDayTwo);
                }
                if (s3Data.length === 0) return sendResponse(res, 400, null, 'No Screenshot Present For This User With Selected Date.', null);
                s3Data.map(e => {
                    e.id = e.Key;
                    e.actual = e.Key.split('/')[3];
                    e.timeslot = Comman.toTimezoneDateofSS_Timeslot(e.Key.split('/')[3], user_data[0].timezone);
                    e.utc = Comman.toTimezoneDateofSSutc(e.Key.split('/')[3], user_data[0].timezone);
                    e.name = Comman.toTimezoneDateofSS(e.Key.split('/')[3], user_data[0].timezone);
                    e.timeWithDate = Comman.toTimezoneDateofSSTimeWithDate(e.Key.split('/')[3], user_data[0].timezone);
                    e.link = `https://${creds.bucket_name}.s3.${creds.region}.amazonaws.com/${e.Key}`;
                    e.viewLink = `https://${creds.bucket_name}.s3.${creds.region}.amazonaws.com/${e.Key}`;
                    e.thumbnailLink = `https://${creds.bucket_name}.s3.${creds.region}.amazonaws.com/${e.Key}`;
                    e.created_at = e.LastModified;
                    e.updated_at = e.LastModified;
                    delete e.Owner;
                })
                total_hour.map(h => { result.push({ t: h, actual_t: h, s: s3Data.filter(e => e.timeWithDate === `${h}-${date}`) }); });
                const r = _.sortBy(result, "t");
                return sendResponse(res, 200, { storage: 'S3', name: user_data[0].name + ' ' + user_data[0].full_name, photo_path: user_data[0].photo_path, email: user_data[0].email, user_id: user_data[0].id, screenshot: r }, 'Screenshot data ', null);
            } else if (credsData[0].short_code == 'MO') {
                let minutes = moment.tz(`${date} ${from}`, 'YYYY-MM-DD', user_data[0].timezone).utcOffset();
                if ((minutes % 60) > 0) {
                    from -= 1;
                    to += 1;
                }
                const { totalHour, dayFolders } = CloudStorageServices.parseHourRange({ from, to, date, timezone: user_data[0].timezone })

                const conection = await OnedriveServices.initConection(creds);
                const dateFoldersId = await OnedriveServices.checkDataExists(conection, { mainFolderName: 'EmpMonitor', email: user_data[0].email, dayFolders });
                if (!dateFoldersId) return sendResponse(res, 400, null, translate(genericErrorMessage, 'NO_SCREENSHOTS_FOR_USER_SELECTED_DATE', language), null);

                const screenshotsFlat = await OnedriveServices.getScreenshotsFlat(conection, { totalHour, date, limit, dateFoldersId, marker: pageToken, email: user_data[0].email });
                // const transformedSsData = OnedriveServices.transformScreenData({ credsData, screenshotsFlat, totalHour, timezone: user_data[0].timezone });

                let newSortedData = totalHour.map(slot => {
                    return {
                        t: moment.tz(moment(slot), user_data[0].timezone).format('HH'),
                        actual_t: moment(slot).format('HH'),
                        s: [],
                        pageToken: null,
                    }
                });

                screenshotsFlat.map((screenshots, index) => {
                    const transformedData = screenshots.value.map(screenshot => ({
                        id: screenshot.id,
                        actual: screenshot.name,
                        timeslot: Comman.toTimezoneDateFormat(screenshot.name, user_data[0].timezone, 'timeSlot'),
                        name: Comman.toTimezoneDateFormat(screenshot.name, user_data[0].timezone, 'time'),
                        utc: Comman.toTimezoneDateFormat(screenshot.name, user_data[0].timezone, 'utc'),
                        link: screenshot['@microsoft.graph.downloadUrl'],
                        viewLink: screenshot.webUrl,
                        thumbnailLink: screenshot['@microsoft.graph.downloadUrl'],
                        downloadLink: screenshot['@microsoft.graph.downloadUrl'],
                        created_at: screenshot.createdDateTime,
                        updated_at: screenshot.lastModifiedDateTime
                    }));

                    transformedData.map(image => {
                        newSortedData.find(slot => {
                            if (image.timeslot == slot.t) {
                                slot.s.push(image);
                                // slot.pageToken = screenshots['@odata.nextLink'] ? screenshots['@odata.nextLink'] : null
                            }
                            slot.s = lodash.uniqBy(slot.s, 'id');
                        });
                    });
                });

                return sendResponse(res, 200, { storage: credsData[0].short_code, name: user_data[0].name + ' ' + user_data[0].full_name, photo_path: user_data[0].photo_path, email: user_data[0].email, user_id: user_data[0].id, screenshot: newSortedData }, 'Screenshot data ', null);
            } else {
                return sendResponse(res, 400, null, 'Active cloud storage not found.', err);
            }
        } catch (err) {
            const customError = CloudStorageServices.createError(err, credsData[0].short_code, language)
            const status = customError.statusCode ? customError.statusCode : 400;
            // console.log('============', err);
            Logger.error(`---v3-error-----${err}------${__filename}----`);
            return sendResponse(res, status, null, customError.message, err);
        }
    }

    async getScreenshootParallel(req, res) {
        const organization_id = req.decoded.organization_id;
        const language = req.decoded.language;
        let result = [];
        let from = parseInt(req.body.from_hour);
        let to = parseInt(req.body.to_hour - 1);
        let date = moment(req.body.date).format('YYYY-MM-DD'); //'2019-12-23'
        let user_id = req.body.user_id;
        let limit = req.body.limit || 10;
        let pageToken = req.body.pageToken || '';
        let total_hour = [];

        if (from > to) return sendResponse(res, 400, null, 'To time more than from time ', null);
        let user_data = await UserActivityModel.user(user_id);
        if (user_data.length === 0) return sendResponse(res, 400, null, 'User not found.', null);
        for (let i = from; i <= to; i++) {
            total_hour.push(Array(Math.max(2 - String(i).length + 1, 0)).join(0) + i);
        }

        let validate = UserValidation.validateScreenshot({ user_id, date, limit, pageToken, from, to });
        if (validate.error) return sendResponse(res, 404, null, 'Validation failed', validate.error.details[0].message);
        try {

            let credsData = await UserActivityModel.getStorageDetail(organization_id);
            if (credsData.length === 0) return sendResponse(res, 400, null, 'Not Found Active Storage !', null);

            let creds = JSON.parse(credsData[0].creds);
            if (credsData[0].short_code == 'GD') {
                /**Get main EmpMonitor Folder Id */
                const mainFolder = await CloudStorageService.getFolderByName('EmpMonitor', creds.client_id, creds.client_secret, creds.refresh_token);
                if (mainFolder.length === 0) return sendResponse(res, 400, null, translate(genericErrorMessage, 'NO_SCREENSHOTS_FOR_USER_SELECTED_DATE', language), null);

                /**Get mail id folder Id like basavarajshiralashetti@globussoft.in */
                const mailFolder = await CloudStorageService.getFolderIdByParentId(mainFolder.files[0].id, user_data[0].email, creds.client_id, creds.client_secret, creds.refresh_token);
                if (mailFolder.length === 0) return sendResponse(res, 400, null, translate(genericErrorMessage, 'NO_SCREENSHOTS_FOR_USER_SELECTED_DATE', language), null);

                /**Get date folder Id like 2020-04-03 */
                const dateIdData = await CloudStorageService.getFolderIdByParentId(mailFolder, date, creds.client_id, creds.client_secret, creds.refresh_token);
                if (dateIdData.length === 0) return sendResponse(res, 400, null, translate(genericErrorMessage, 'NO_SCREENSHOTS_FOR_USER_SELECTED_DATE', language), null);

                /**Get each hour screenshot data */
                async.forEach(total_hour, (h, callback) => {
                    CloudStorageService.getScreenshootFromToDatecb(dateIdData, `name contains ' ${h}-${date}'`, creds.client_id, creds.client_secret, creds.token, creds.refresh_token, pageToken, limit, (err, screenshootData) => {
                        if (err) callback();
                        let finalData = [];
                        async.forEach(screenshootData.data.files, (e, cb) => {
                            finalData.push({
                                id: e.id,
                                actual: e.name,
                                timeslot: Comman.toTimezoneDateofSS_Timeslot(e.name, user_data[0].timezone),
                                name: Comman.toTimezoneDateofSS(e.name, user_data[0].timezone),
                                utc: Comman.toTimezoneDateofSSutc(e.name, user_data[0].timezone),
                                link: e.webContentLink.replace(/&amp;/g, "&"),
                                viewLink: e.webViewLink,
                                thumbnailLink: e.thumbnailLink,
                                created_at: e.createdTime,
                                updated_at: e.modifiedTime
                            })
                            cb();
                        }, () => {
                            if (finalData.length > 0) {
                                var obj = {
                                    t: moment.tz(moment(h, 'HH'), user_data[0].timezone).format('HH'),
                                    actual_t: h,
                                    s: finalData,
                                    pageToken: screenshootData.data.nextPageToken ? screenshootData.data.nextPageToken : null
                                }
                                result.push(obj);
                                callback();
                            } else {
                                var obj = {
                                    t: moment.tz(moment(h, 'HH'), user_data[0].timezone).format('HH'),
                                    actual_t: h,
                                    s: finalData,
                                    pageToken: screenshootData.data.nextPageToken ? screenshootData.data.nextPageToken : null
                                }
                                result.push(obj);
                                callback();
                            }
                        })
                    });
                }, () => {
                    let r = _.sortBy(result, "t");
                    return sendResponse(res, 200, { storage: 'GD', name: user_data[0].name + ' ' + user_data[0].full_name, photo_path: user_data[0].photo_path, email: user_data[0].email, user_id: user_data[0].id, screenshot: r }, 'Screenshot data ', null);
                });
            } else if (credsData[0].short_code == 'S3') {
                /**Get screenshots from s3 bucket */
                let prefix = `EmpMonitor/${user_data[0].email}/${date}/`;
                let keyData = await CloudStorageService.checkDataExists(creds.client_id, creds.client_secret, creds.region, creds.bucket_name, prefix);
                if (keyData.Contents.length === 0) return sendResponse(res, 400, null, 'No Screenshot Present For This User With Selected Date.', null);

                async.forEach(total_hour, (h, callback) => {
                    let hour_prefix = `EmpMonitor/${user_data[0].email}/${date}/${h}`
                    AmazonSSS.getScreenshots(creds.client_id, creds.client_secret, creds.region, creds.bucket_name, hour_prefix, pageToken, (err, ssData) => {
                        if (err) callback();
                        let finalData = [];
                        async.forEach(ssData, (e, cb) => {
                            finalData.push({
                                id: e.Key,
                                actual: e.Key.split('/')[3],
                                timeslot: Comman.toTimezoneDateofSS_Timeslot(e.Key.split('/')[3], user_data[0].timezone),
                                utc: Comman.toTimezoneDateofSSutc(e.Key.split('/')[3], user_data[0].timezone),
                                name: Comman.toTimezoneDateofSS(e.Key.split('/')[3], user_data[0].timezone),
                                link: `https://${creds.bucket_name}.s3.${creds.region}.amazonaws.com/${e.Key}`,
                                viewLink: `https://${creds.bucket_name}.s3.${creds.region}.amazonaws.com/${e.Key}`,
                                thumbnailLink: `https://${creds.bucket_name}.s3.${creds.region}.amazonaws.com/${e.Key}`,
                                created_at: e.LastModified,
                                updated_at: e.LastModified
                            })
                            cb();
                        }, () => {
                            var obj = {
                                t: moment.tz(moment(h, 'HH'), user_data[0].timezone).format('HH'),
                                actual_t: h,
                                s: finalData, pageToken: null
                            };
                            result.push(obj);
                            callback();
                        })
                    })
                }, () => {
                    let r = _.sortBy(result, "t");
                    return sendResponse(res, 200, { storage: 'S3', name: user_data[0].name + ' ' + user_data[0].full_name, photo_path: user_data[0].photo_path, email: user_data[0].email, user_id: user_data[0].id, screenshot: r }, 'Screenshot data ', null);
                })
            } else {
                return sendResponse(res, 400, null, 'Active cloud storage not found.', err);
            }
        } catch (err) {
            console.log('============', err);
            Logger.error(`---v3-error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable to get screenshots.', err);
        }
    }

    async getScreenshootParallel_new_good(req, res) {
        const { organization_id, language } = req.decoded;
        const { user_id } = req.body;
        const from = parseInt(req.body.from_hour, 10);
        const to = parseInt(req.body.to_hour, 10) - 1;
        const date = moment(req.body.date).format('YYYY-MM-DD'); //'2019-12-23'
        let limit = req.body.limit || 100;
        const pageToken = req.body.pageToken || '';
        let storageType = '';
        if (from > to) return sendResponse(res, 400, null, userMessages.find(x => x.id === "24")[language] || userMessages.find(x => x.id === "24")["en"], null);

        const { error: validError } = UserValidation.validateScreenshot({ user_id, date, limit, pageToken, from, to });
        actionsTracker(req, 'Screenshots requested (?).', [{ user_id, date, from, to }]);

        if (validError) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validError.details[0].message);
        try {
            let [userData] = await UserActivityModel.user(user_id);
            if (!userData) return sendResponse(res, 400, null, userMessages.find(x => x.id === "10")[language] || userMessages.find(x => x.id === "10")["en"], null);

            const [credsData] = await UserActivityModel.getStorageDetail(organization_id);
            if (!credsData) return sendResponse(res, 400, null, userMessages.find(x => x.id === "25")[language] || userMessages.find(x => x.id === "25")["en"], null);

            const creds = JSON.parse(credsData.creds);
            storageType = credsData.short_code;

            const CloudDriveService = CloudStorageServices.getStorage(storageType);
            if(storageType == "S3") limit = 1000;
            if (!CloudDriveService) {
                return sendResponse(res, 400, null, userMessages.find(x => x.id === "26")[language] || userMessages.find(x => x.id === "26")["en"], null);
            }
            const { totalHour, dayFolders } = CloudStorageServices.parseHourRange({ from, to, date, timezone: userData.timezone });

            const conection = await CloudDriveService.initConection(creds, organization_id);
            if(process?.env?.ORG_OFFICE_AGENT_TRANSFORMED?.split(",").includes(String(organization_id)) ) {
                const [user] = await UserActivityModel.getSystemType(user_id,organization_id);
                if(user.system_type === 0) userData.email = userData.a_email;
            }
            let dateFoldersId;
            if (ConfigData.UPDATE_IN_SCREENSHOT_OFFICE_USER.split(",").includes(String(organization_id))) {
                if(userData.system_type === 0) {
                    let userRedisEmailScreenshot = await redis.getAsync(`${userData.email}_screenshot`);
                    if (userRedisEmailScreenshot) {
                        userData.email = `${userData.name}_${userData.full_name}_${userData.id}`;
                    }
                }
                dateFoldersId = await CloudDriveService.checkDataExists(conection, { mainFolderName: 'EmpMonitor', email: userData.email, dayFolders });
                if (!dateFoldersId) return sendResponse(res, 400, null, userMessages.find(x => x.id === "27")[language] || userMessages.find(x => x.id === "27")["en"], null);
            }
            else if (ConfigData.CUSTOM_DATE_EMAIL_SCREEN_FORMAT.split(",").includes(String(organization_id)) && storageType == "MO") {
                dateFoldersId = await CloudDriveService.checkDataExists(conection, { mainFolderName: 'EmpMonitor', email: userData.email, dayFolders }, {type: "CUSTOM_DATE_EMAIL_SCREEN_FORMAT",});
                if (!dateFoldersId) return sendResponse(res, 400, null, userMessages.find(x => x.id === "27")[language] || userMessages.find(x => x.id === "27")["en"], null);
            }
            else if (ConfigData.CUSTOM_DATE_EMAIL_SCREEN_FORMAT_S3.split(",").includes(String(organization_id)) && storageType == "S3") {
                dateFoldersId = await CloudDriveService.checkDataExists(conection, { mainFolderName: 'EmpMonitor', email: userData.email, dayFolders }, {type: "CUSTOM_DATE_EMAIL_SCREEN_FORMAT_S3",});
                if (!dateFoldersId) return sendResponse(res, 400, null, userMessages.find(x => x.id === "27")[language] || userMessages.find(x => x.id === "27")["en"], null);
            }
            else {
                dateFoldersId = await CloudDriveService.checkDataExists(conection, { mainFolderName: 'EmpMonitor', email: userData.email, dayFolders });
                if (!dateFoldersId) return sendResponse(res, 400, null, userMessages.find(x => x.id === "27")[language] || userMessages.find(x => x.id === "27")["en"], null);
            }

            const screenshotsData = await CloudDriveService.getScreenshotsFlat(conection, { totalHour, limit, dateFoldersId, marker: pageToken, email: userData.email, timezone: userData.timezone, creds, organization_id: req.decoded.organization_id })
            if (!screenshotsData) return sendResponse(res, 400, null, userMessages.find(x => x.id === "27")[language] || userMessages.find(x => x.id === "27")["en"], null);

            return sendResponse(res, 200, { storage: storageType, name: userData.name + ' ' + userData.full_name, photo_path: userData.photo_path, email: userData.email, user_id: userData.id, screenshot: screenshotsData }, 'Screenshot data ', null);
        } catch (err) {
            const customError = CloudStorageServices.createError(err, storageType, language)
            const status = customError.statusCode ? customError.statusCode : 400;
            // console.log('============', err);
            Logger.error(`---v3-error-----${err}------${__filename}----`);
            if(storageType === 'SFTP') {
                const CloudDriveService = CloudStorageServices.getStorage(storageType);
                CloudDriveService.deleteCreds(organization_id);
            }
            return sendResponse(res, status, null, customError.message, err);
        }
    }

    async getScreenRecords(req, res) {
        const { organization_id, language } = req.decoded;
        const { user_id } = req.body;
        const from = parseInt(req.body.from_hour, 10);
        const to = parseInt(req.body.to_hour, 10) - 1;
        const date = moment(req.body.date).format('YYYY-MM-DD'); //'2019-12-23'
        const limit = req.body.limit || 12;
        const pageToken = req.body.pageToken || '';
        let storageType = '';
        if (from > to) return sendResponse(res, 400, null, userMessages.find(x => x.id === "24")[language] || userMessages.find(x => x.id === "24")["en"], null);

        const { error: validError } = UserValidation.validateScreenshot({ user_id, date, limit, pageToken, from, to });
        actionsTracker(req, 'ScreenRecords requested (?).', [{ user_id, date, from, to }]);

        if (validError) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validError.details[0].message);
        try {
            const [userData] = await UserActivityModel.user(user_id);
            if (!userData) return sendResponse(res, 400, null, userMessages.find(x => x.id === "10")[language] || userMessages.find(x => x.id === "10")["en"], null);

            const [credsData] = await UserActivityModel.getStorageDetail(organization_id);
            if (!credsData) return sendResponse(res, 400, null, userMessages.find(x => x.id === "25")[language] || userMessages.find(x => x.id === "25")["en"], null);

            const creds = JSON.parse(credsData.creds);
            storageType = credsData.short_code;

            const CloudDriveService = CloudStorageServices.getStorage(storageType);
            if (!CloudDriveService) {
                return sendResponse(res, 400, null, userMessages.find(x => x.id === "26")[language] || userMessages.find(x => x.id === "26")["en"], null);
            }
            const { totalHour, dayFolders } = CloudStorageServices.parseHourRange({ from, to, date, timezone: userData.timezone });

            const conection = await CloudDriveService.initConection(creds);
            const dateFoldersId = await CloudDriveService.checkDataExists(conection, { mainFolderName: 'EmpMonitorRecords', email: userData.email, dayFolders });
            if (!dateFoldersId) return sendResponse(res, 400, null, userMessages.find(x => x.id === "28")[language] || userMessages.find(x => x.id === "28")["en"], null);

            const screenRecords = await CloudDriveService.getScreenRecords(conection, { totalHour, limit, dateFoldersId, marker: pageToken, email: userData.email, timezone: userData.timezone, creds: {...creds, organization_id} });
            if (!screenRecords) return sendResponse(res, 400, null, userMessages.find(x => x.id === "28")[language] || userMessages.find(x => x.id === "28")["en"], null);

            return sendResponse(res, 200, { storage: storageType, name: userData.name + ' ' + userData.full_name, photo_path: userData.photo_path, email: userData.email, user_id: userData.id, screenRecords }, 'Screen records data ', null);
        } catch (err) {
            const customError = CloudStorageServices.createError(err, storageType, language)
            const status = customError.statusCode ? customError.statusCode : 400;
            // console.log('============', err);
            Logger.error(`---v3-error-----${err}------${__filename}----`);
            return sendResponse(res, status, null, customError.message, err);
        }
    }

    uploadProfilePic(req, res) {
        uploadprofile(req, res, async function (err) {
            const { user_id } = req.query;
            const { organization_id, language } = req.decoded;
            let { filename: name, originalname, mimetype } = req.file;
            try {
                mimetype = 'image/png'
                originalname = originalname.split(".")[0] + ".png";
                req.file = { ...req.file, originalname, mimetype }
                const { error: validError } = UserValidation.empIdValidation({ employee_id: user_id });
                if (validError) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validError.details[0].message);

                if (!req.file) return sendResponse(res, 400, null, userMessages.find(x => x.id === "17")[language] || userMessages.find(x => x.id === "17")["en"], null);

                const [credsData] = await UserActivityModel.getStorageDetail(organization_id);
                if (!credsData) return sendResponse(res, 400, null, userMessages.find(x => x.id === "25")[language] || userMessages.find(x => x.id === "25")["en"], null);

                actionsTracker(req, 'User %i profile picture uploaded.', [user_id]);

                const storageType = credsData.short_code;
                const creds = JSON.parse(credsData.creds);

                if (storageType === 'GD' || storageType === 'MO') {
                    /**Converting Image from jpg to png*/
                    await imageConversion(name);
                    await CloudStorageServices.deleteFileFromLocal(name);
                    name = name + '.png';
                    req.file = { ...req.file, filename: name }
                }

                const CloudDriveService = CloudStorageServices.getStorage(storageType);
                if (!CloudDriveService) {
                    await CloudStorageServices.deleteFileFromLocal(name);
                    return sendResponse(res, 400, null, userMessages.find(x => x.id === "25")[language] || userMessages.find(x => x.id === "25")["en"], null);
                }
                const userDataPromise = UserActivityModel.userInformation(user_id, organization_id);

                const screenLink = await CloudDriveService.uploadScreen('EmpMonitorProfilePic', req.file, creds);
                const deleteLocalPromise = CloudStorageServices.deleteFileFromLocal(name);

                const [userData] = await userDataPromise;
                const updateUserPromise = UserActivityModel.updateUser(`photo_path= '${screenLink}'`, `id=${userData.temp_user_id}`);

                const password = await PasswordEncodeDecoder.decryptText(userData.password, process.env.CRYPTO_PASSWORD);
                const updatedUserData = { ...userData, password, encriptedpassword: userData.password, photo_path: screenLink };

                await deleteLocalPromise;
                await updateUserPromise;

                event.emit('update-employee-redis-data-by-employee_id', user_id);
                return sendResponse(res, 200, updatedUserData, userMessages.find(x => x.id === "9")[language] || userMessages.find(x => x.id === "9")["en"], null);
            } catch (err) {
                console.log(err)
                Logger.error(`---v3-error-----${JSON.stringify(err)}------${__filename}----`);
                await CloudStorageServices.deleteFileFromLocal(name);
                return sendResponse(res, 400, null, 'Unable to upload profilepic to cloud storage.', err);
            }

        })
    }

    async updateDetails(req, res) {
        const user_id = req.decoded.user_id;
        const new_password = req.body.new_password;
        const confirmation_password = req.body.confirmation_password;
        const { organization_id, language } = req.decoded;

        try {
            const validate = UserValidation.updatedetailsValidation({ new_password, confirmation_password });

            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            if (new_password !== confirmation_password) return sendResponse(res, 400, null, 'New password and confirmation not matching.', 'Password mismatching.');

            const encripted = await PasswordEncodeDecoder.encryptText(new_password, process.env.CRYPTO_PASSWORD);

            const values = `password='${encripted}'`
            const condition = `id=${user_id}`

            const updated = await UserActivityModel.updateUser(values, condition);

            actionsTracker(req, 'User %i details updated.', [user_id]);
            return sendResponse(res, 200, null, userMessages.find(x => x.id === "9")[language] || userMessages.find(x => x.id === "9")["en"], null);
        } catch (err) {
            console.log(err);
            Logger.error(`---v3-error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, 'Unable to update.', 'Unable to update.');
        }

    }

    async employeeAssignedTo(req, res) {
        const { role_id, user_id } = req.body;
        const { organization_id, language } = req.decoded;

        actionsTracker(req, 'Employee assigned to user %i by role %i requested', [user_id, role_id]);

        try {
            const validate = UserValidation.employeeAssgnedValidation({ user_id, role_id });
            if (validate.error) return sendResponse(res, 404, null, userMessages.find(x => x.id === "2")[language] || userMessages.find(x => x.id === "2")["en"], validate.error.details[0].message);

            let employee = await UserActivityModel.employeeAssignedTo(user_id, role_id);
            if (!employee.length) return sendResponse(res, 400, null, userMessages.find(x => x.id === "7")[language] || userMessages.find(x => x.id === "7")["en"], 'Not found');

            if (!role_id) employee = employee.map(x => ({ ...x, employees: JSON.parse("[" + x.employees + "]") }));

            return sendResponse(res, 200, employee, 'User data', null);
        } catch (err) {
            return sendResponse(res, 400, null, 'Unable to get user data.', err);
        }
    }

    async fieldAllEmployeeList(req, res, next) {
        await UserService.fieldAllEmployeeList(req, res, next);
    }

    async employeeListWithAssigned(req, res, next) {
        await UserService.employeeListWithAssigned(req, res, next);
    }

    async removedUsersList(req, res, next) {
        await UserService.removedUserList(req, res, next);
    }

    async assignShift(req, res) {
        let {organization_id} = req.decoded;
        let validate = UserValidation.validateShiftAssign(req.body);
        const { shift_id, employees_id } = validate.value;
        try {
            if (validate.error) return sendResponse(res, 404, null, validate.error.details[0].message);
            await UserActivityModel.bulkAssignShift(organization_id, shift_id, employees_id);
            return sendResponse(res, 200, null, "Shift assigned successfully", null);
        } catch (err) {
            return sendResponse(res, 400, null, "Failed to Assign Shift", err);
        }
    }

    async getNonAdmin(req, res) {
        let {organization_id} = req.decoded;
        try {
            let validate = UserValidation.getNonAdminValidation(req.query);
            if (validate.error) return res.json({code: 400, error: null, message: validate.error.details[0].message, data: null}) 
            let {location_id, department_id, role_id} = validate.value;
            let data = await UserActivityModel.getNonAdmin(organization_id, location_id, department_id, role_id);
            return res.json({code: 200, error: null, message: "Data fetch sucessfully", data: data});
        }
        catch (err) {
            return res.json({code: 401, error: "", message: "", data: ""});
        }
    }

    async registerAdmin(req, res) {
        try {
            const { email, wmId } = req?.body;
            let result = await UserActivityModel.checkAdmin(email);

            if (result?.length) {
                let user_id =`${result[0]?.user_id}`;
                await UserActivityModel.setWorkId(wmId,user_id);
                return sendResponse(res, 200, result[0]?.id, 'admin registered', null);
            }
        
            return sendResponse(res, 401, null, 'Admin not found', null);
        } catch (err) {
            Logger.error(`--workforce--error-----${err}--------`);
            return sendResponse(res, 400, null, "Failed to register Admin", err);
        }
    }

    async addFieldUsers(req, res, next) {
        try {
            let { organization_id } = req.decoded;
            const users = req.body.usersData;
            let response = await axios.post(ConfigData.export_emp_users_link, users);
            if (response.data.body.data) {
                let emp_ids = _.pluck(response.data.body.data, 'emp_id')
                await UserActivityModel.updateFieldStatus(emp_ids,organization_id);
                return res.status(200).json({code: 200, error: null, message: "Users Imported Sucesfully", data : response?.data?.body.data});
            }
            return res.status(200).json({code: 400, error: null, message: "Something went wrong", });
        }
        catch (error) {
            return res.status(401).json({code: 401, error: null, message: "Something went wrong", data: ""});
        }
    }
    
    async fetchUsers(req, res) {
        try {
            const wmId = req?.body?.wmId;
            const organization_id = req?.body?.org_id;
            const{skip,limit,orderBy,sort,search} = req?.body;

            let users = await UserActivityModel.fetchUsers(wmId, organization_id,skip,limit,orderBy,sort,search);
            const result = await UserActivityModel.getUsersCount(organization_id);

            if (users?.length === 0) return sendResponse(res, 200, null, 'no users found', null);
            return res.json({ code: 200, data: users, total_count:result[0]?.count, message: "Data Found !",count:users?.length });
        } catch (err) {
            Logger.error(`--workforce--error-----${err}--------`);
            return sendResponse(res, 400, null, "Failed to Fetch Users", err);
        }
    }
    
    async updateWorkmanagementStatus(req, res) {
        try {
            const {emp_id,register} = req?.body;
            let resultData;
            if(register)
             resultData =  await UserActivityModel.setStatus(emp_id);
            else{
              resultData =  await UserActivityModel.deleteStatus(emp_id);
            }
            return sendResponse(res, 200, resultData, 'status updated', null);
        
        } catch (err) {
            Logger.error(`--workforce--error-----${err}--------`);
            return sendResponse(res, 400, null, "Failed to update status for wm users", err);
        }
    }

    async filterEmployees (req, res, next) {
        try {
            let { organization_id } = req.decoded;
            let { location_id, department_id, name } = req.query;

            let employees = await UserActivityModel.getEmployeeByLocationAndDepartment(organization_id, location_id, department_id, name);
            return res.status(200).json({
                code: 200,
                error: null,
                message: "Employees fetched successfully",
                data: employees
            })
        }
        catch (err) {
            next(err);
        }
    }
}

module.exports = new UserActivity();

/**
 * getResellerData
 * @description function to get the Reseller data
 * @param {*} resellerDataObj 
 * @param {*} nodeName 
 */
function getResellerData(resellerDataObj, nodeName) {
    if (
        resellerDataObj &&
        resellerDataObj[nodeName] &&
        resellerDataObj[nodeName].length &&
        resellerDataObj[nodeName] != 'null'

    ) {
        return resellerDataObj[nodeName];
    }
    return null;
}
