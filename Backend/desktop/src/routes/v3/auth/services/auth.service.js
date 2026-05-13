"use strict";
const _ = require('underscore');
const moment = require('moment');

const authModel = require('../auth.model');
const validator = require('../auth.validation');
const passwordService = require('./password.service');
// const redis = require('./redis.service');
const redis = require('../../../../utils/redis/redis.utils');
const shortnerService = require('./shortner.service');
const jwtService = require('./jwt.service');
const errorHandler = require('../../../../utils/helpers/ErrorResponse');
const eventEmitter = require('../../../../event/eventEmitter');
const { logger: Logger } = require('../../../../logs/Logger');
const Common = require('../../../../utils/helpers/CommonFunctions');
const { AnnouncementModel } = require('../../announcements/announcement.model');

const config = require('../../../../../../config/config');
const AuthBlocker = require('../AuthBlocker.json');
const { mirrorMonitorUserToEmpCloud, checkEmpCloudSeatAvailability } = require('../../../../utils/helpers/EmpCloudUserSync');
const AgentAuthList = require('./AgentAuthList.js');

const hourToSeconds = (hours) => {
    const data = hours.split(":");
    return ((+data[0] * 3600) + (+data[1] * 60));
}
const MIN_USER_ID_DAY = 7;

/**
 * User Authentication routes
 *
 * @class UserAuthIndex
 */
class AuthService {
    /**
     * authenticate using email and password.
     *
     * @function registerUsingMacAddress
     * @memberof AuthService
     * @param {*} req
     * @param {*} res
     * @param {*} next
     * @returns {array} -  token or error .
     **/
    async authenticate(req, res, next) {
        if( Object.keys(req.body).length ===0 || !req.body.email && !req.body.password) return res.status(406).json({message: "success"});

        if(AgentAuthList.ExpiredUserEmails.includes(req?.body?.email)) {
            // res.status(406).json({message: "success"});
            console.log(`-- Email -- ${req.body.email} -- User-Agent -- ${req.headers['user-agent']} -- ${moment().utc().toISOString()}`);
            return handleUnverifiedAuth(req, res, next);
        }

        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let is_manager = false, is_teamlead = false, is_employee = false, is_admin = false;
        if(req?.body?.email) if (AuthBlocker.planExpiredOrgEmails.includes(req?.body?.email)) return next(new errorHandler('Your plan expired.', 406));
        if(req?.body?.email) if (AuthBlocker.BLOCKED_USER.includes(req?.body?.email)) return next(new errorHandler('Your plan has expired, or your access has been restricted.', 406));
        if(req?.body?.email?.includes('OjUpSpf') || req?.body?.email?.includes('ovaledge.com')) return res.status(406).json({message: "success"});

        if(req?.body?.email?.includes('OjUpTKS') || req?.body?.email?.includes('20cube.com')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpTQb') || req?.body?.email?.includes('empclaims.com')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpTVy')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpRgM')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpS26')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpSwm')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpTA-')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpTae')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpS9R')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpTND')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpTUs')) return res.status(412).json({message: "success"});
        if(req?.body?.email?.includes('OjUpTfK')) return res.status(412).json({message: "success"});

        try {
            const userData = await validator.validateLoginParams().validateAsync(req.body);
            

            //Get request count
            const tempData = await redis.getAsync(`${userData.email.toLowerCase()}_pack`);
            //Check plan expired
            if (tempData) return next(new errorHandler('Your plan expired.', 403));

            const requestCount = await redis.getAsync(`${userData.email.toLowerCase()}_agent_auth`);
            //Check allowed count
            if (~~requestCount > (process.env.MAX_REQUEST_ALLOWED || 20) - 1) {
                return next(new errorHandler('Exceeded the number of allotted requests in a specific time frame', 401));
            }

            const isInvalidEmailCred = await redis.getAsync(`${userData.email.toLowerCase()}_invalid_email_cred`);
            //Set request count
            await redis.setAsync(`${userData.email.toLowerCase()}_agent_auth`, ~~requestCount + 1, 'EX', (process.env.MAX_REQUEST_ALLOWED_TIMEFRAME_FOR_AUTH || 3600));
            // invalid cred redis check and return
            if (isInvalidEmailCred) {
                return next(new errorHandler('Invalid credentials', 401));
            }

            //Get request count
            let [duplicateSystem, userId] = await Promise.all([
                await redis.getAsync(`${userData.email.toLowerCase()}_system`),
                await redis.getAsync(`${userData.email.toLowerCase()}_user_id`)
            ]);
            //Check plan expired
            if (tempData) return next(new errorHandler('Your plan expired.', 403));
            //Check allowed count
            if (~~requestCount > (process.env.MAX_REQUEST_ALLOWED || 20) - 1) {
                return next(new errorHandler('Exceeded the number of allotted requests in a specific time frame', 401));
            }

            //Set request count
            await redis.setAsync(`${userData.email.toLowerCase()}_agent_auth`, ~~requestCount + 1, 'EX', (process.env.MAX_REQUEST_ALLOWED_TIMEFRAME_FOR_AUTH || 3600));

            // invalid cred redis check and return
            if (isInvalidEmailCred) {
                return next(new errorHandler('Invalid credentials', 401));
            }

            if(config.CHECK_BLOCK_MAC_ADDRESS_USERNAME_REGISTRATION.includes(getLastAlias(req?.body?.email))) {
                let macId = req?.body.email?.split('_')[0];
                let organizationId = parseInt(shortnerService.extend(getLastAlias(req?.body?.email))) - parseInt(process.env.SHORTNER_DEFAULT_ADDED_VALUE);
                let [userDetailsBlocked] = await authModel.getUserByMacIdOrganization({ macId, organizationId });
                if(userDetailsBlocked) {
                    let username = req?.body.email?.split('@')[1]?.split('.')[0];
                    if(userDetailsBlocked.username.toLowerCase() !== username.toLowerCase()) return res.json({ code: 404, error: null, data: false, username: userDetailsBlocked.username, message: 'MAC ID is already associated with another user.' });
                }
            }

            let user = null;
            if (userId) {
                [user] = await authModel.getUserDetailsById(userId);
            } else {
                [user] = await authModel.getUserDetails({ email: userData.email });
                if(config.CUSTOM_LOGIN_REGISTER_AD_NO_SWAP.includes(user?.organization_id)) {
                    [user] = await authModel.getUserDetails({ email: userData.email, noAlterEmailCheck : true });
                }
                //Set user id against user login email
                if (user) {
                    let userDataQId = await authModel.getUserIdWithEmail(userData.email, config.CUSTOM_LOGIN_REGISTER_AD_NO_SWAP.includes(user?.organization_id));
                    if (user.user_id == userDataQId[0].id) {
                        await redis.setAsync(`${userData.email.toLowerCase()}_user_id`, user.user_id, 'EX', 60 * 60 * 24 * MIN_USER_ID_DAY);
                    }
                    else {
                        return next(new errorHandler('Invalid credentials', 401));
                    }
                }
            }
            if (!user) {
                await redis.setAsync(`${userData.email.toLowerCase()}_invalid_email_cred`, 'true', 'EX', 60 * 30);
                // 1. Check is user is deleted or not
                // 2. If deleted, then skip redis update
                let [deletedUser] = await authModel.deletedUserDetails({ email: userData.email });
                if (!deletedUser) {
                    await redis.setAsync(`${userData.email.toLowerCase()}_invalid_email_cred`, 'true', 'EX', 60 * 30);
                }
                return next(new errorHandler('Invalid credentials', 401));
            }
            if (user.status === 2 && !config?.MOVE_SUSPENDED_USER_TO_ACTIVE?.split(',')?.includes(`${user?.admin_id}`)) {
                return next(new errorHandler('Your account has been suspended', 403));
            }
            else if (user.status === 2 && config?.MOVE_SUSPENDED_USER_TO_ACTIVE?.split(',')?.includes(`${user?.admin_id}`)) {
                // Update user status to active from suspend
                await authModel.updateUserStatus(user.user_id);
            }

            const expire_date = JSON.parse(user.pack)
            if (!(moment().tz(user.timezone).format("YYYY-MM-DD") <= moment(expire_date.expiry).format("YYYY-MM-DD"))) {
                Logger.error(`-V3---auth.-------${userData.email}`);
                await redis.setAsync(`${userData.email.toLowerCase()}_pack`, 'Your plan expired.', 'EX', 3600 * 5);
                return next(new errorHandler('Your plan expired.', 403));
            }
            if (duplicateSystem && user.system_type == 1 && userData.macId && userData.testing == 0 && !config.CUSTOM_LOGIN_REGISTER_AD_NO_SWAP.includes(user?.organization_id) ) {
                duplicateSystem = JSON.parse(duplicateSystem);
                if (duplicateSystem.macId != userData.macId) return next(new errorHandler('Logged in with another system.', 403));
            }

            if (user.role && user.role.toLowerCase() === 'manager') is_manager = true;
            else if (user.role && user.role.toLowerCase() === 'employee') is_employee = true;
            else if (user.role && user.role.toLowerCase() === 'team lead') is_teamlead = true;
            else if (user.role && user.role.toLowerCase() === 'admin') is_admin = true;
            else if (user.role && user.role.toLowerCase()) is_manager = true;

            let roleData = { is_admin, is_manager, is_employee, is_teamlead };

            let permissionData = await authModel.userPermission(user.role_id, user?.organization_id);
            if (permissionData.length > 0) {
                permissionData = _.pluck(permissionData, 'permission_id');
            }
            if (user.system_type == 1 && process.env.CHECK_PASSWORD == 'true' && (user.software_version == null || user.software_version >= process.env.PASSWORD_CHECK_VERSION)) {
                // Decrypt Both database-password and password passed in parameter and match them
                const { decoded: passwordDB } = passwordService.decrypt(user.password, process.env.CRYPTO_PASSWORD);
                const { decoded: passwordParam } = passwordService.decrypt(userData.password, process.env.CRYPTO_PASSWORD);
                if (passwordDB !== passwordParam) {
                    return next(new errorHandler('Invalid Password', 401));
                }
            }

            let setting = JSON.parse(user.custom_tracking_rule);
            let logoutOptions = JSON.parse(user.logoutOptions);

            //logo addition on config
            let logoLink = null
            if (user.logo) {
                const apiUrlStr = process.env.NODE_ENV == 'development' ? process.env.ADMIN_URL_DEV : process.env.ADMIN_URL_PRODUCTION;
                const logoPath = user.logo.split('/public/')[1];
                logoLink = apiUrlStr + logoPath;
            }
            setting = { ...setting, logo: logoLink };

            delete user.logo;
            delete user.password;
            delete user.custom_tracking_rule;
            const shift = user.shift ? JSON.parse(user.shift) : '';
            if (user.photo_path === "/default/profilePic/user.png") {
                let photo_path = process.env.ADMIN_URL_DEV + 'default/profilePic/user.png';
                if (process.env.NODE_ENV === 'production') {
                    photo_path = process.env.ADMIN_URL_PRODUCTION + 'default/profilePic/user.png'
                }
                user.photo_path = photo_path
            }
            //For announcement list
            if (setting.system.visibility) {
                const announcemnts = await AnnouncementModel.getAnnouncement({ organizationId: user?.organization_id, userId: user.user_id });
                setting.announcemnts = announcemnts.map(a => {
                    delete a.delevered_users;
                    return a;
                });
            }
            // const payload = { ...user, ip, ...setting };
            // store in user meta data in redis server and minimize payload
            // work only on server

            // room id config changes
            // once created set old one
            // otherwise create and set the new one
            let isNewRoomId = false;
            let roomId = null;
            if (!user.room_id) {
                isNewRoomId = true;
                const { encoded } = passwordService.encrypt(user.employee_id.toString(), process.env.CRYPTO_PASSWORD);
                roomId = encoded;
                setting.roomId = roomId;
            } else {
                roomId = user.room_id;
                setting.roomId = roomId;
            }
            delete user.room_id;

            //adding storage config
            // let storageDetails = await redis.getAsync(`${user?.organization_id}_storage_creds`);
            // if(storageDetails) {
            //     storageDetails = JSON.parse(storageDetails);
            //     storageDetails = JSON.parse(storageDetails.organizationproviders.orgProCreds.creds);
            //     Object.keys(storageDetails).forEach((key) => {
            //         if (typeof storageDetails[key] === 'string') {
            //             storageDetails[key] = passwordService.encrypt(storageDetails[key], process.env.CRYPTO_PASSWORD).encoded;
            //         }
            //     });
            //     setting.storage_setting = storageDetails;
            // }
            // else {
            //     let [storage_setting] = await authModel.storageDetails(user?.organization_id);
            //     if(storage_setting) {
            //         storage_setting = JSON.parse(storage_setting?.creds);
            //         Object.keys(storage_setting).forEach((key) => {
            //             if (typeof storage_setting[key] === 'string') {
            //                 storage_setting[key] = passwordService.encrypt(storage_setting[key], process.env.CRYPTO_PASSWORD).encoded;
            //             }
            //         });
            //         setting.storage_setting = storage_setting;
            //     }
            // }

            const productivityCategory = Number(user.productivityCategory ? user.productivityCategory : 0);
            const productive_setting = user.productive_hours ? JSON.parse(user.productive_hours) : null;
            const productive_hours = productive_setting ? (productive_setting.mode == 'unlimited' ? 0 : hourToSeconds(productive_setting.hour)) : 0;
            const payload = { user_id: user.user_id };
            await redis.setAsync(user.user_id, JSON.stringify({ ...user, ...roleData, ip, permissionData, setting, logoutOptions, shift, productive_hours, productivity_data: productive_setting, productivityCategory }), 'EX', Common.getTime(process.env.JWT_TOKEN_LIFE));
            // await redis.setUserMetaData(user.user_id, { ...user, ...roleData, ip, permissionData, setting, logoutOptions, shift, productive_hours, productivity_data: productive_setting });

            const accessToken = await jwtService.generateAccessToken(payload);
            if (userData.macId && user.system_type == 1 && userData.testing == 0) {
                await redis.setAsync(`${userData.email.toLowerCase()}_system`, JSON.stringify({ macId: userData.macId }), 'EX', Common.getTime(process.env.JWT_TOKEN_LIFE));
            }
            res.json({
                success: true, accessToken,
                identifier: shortnerService.shorten(+process.env.SHORTNER_DEFAULT_ADDED_VALUE + user.user_id),
                name: `${user.first_name} ${user.last_name}`, settings: setting, roomId
            });

            // redis manupulation for the access token valid or invalid
            if (accessToken) {
                const previousActiveToken = await redis.getAsync(`agent:active:token:${user.employee_id}`);
                const redisSetArr = [
                    redis.setAsync(`agent:active:token:${user.employee_id}`, accessToken, 'EX', 60 * 60 * 11)
                ];
                if (previousActiveToken) {
                    redisSetArr.push(redis.setAsync(previousActiveToken, 'expired', 'EX', 60 * 60 * 11));
                }
                await Promise.all(redisSetArr);
            }

            // update only new room id
            if (isNewRoomId) {
                await authModel.updateEmployeeData(user.employee_id, null, null, roomId);
            }
        } catch (err) {
            console.log(err);
            next(err);
        }
    }


    /**
     * Login Services for Extenstion using email and password.
     * @function authenticateLoginAgent
     * @memberof AuthService
     * @param {*} req
     * @param {*} res
     * @param {*} next
     * @return {array} -  token or error .
    */

    async authenticateLoginAgent(req, res, next) {
        if( Object.keys(req.body).length ===0 || !req.body.email && !req.body.password) return res.status(406).json({message: "success"});

        if(AgentAuthList.ExpiredUserEmails.includes(req?.body?.email)) {
            // res.status(406).json({message: "success"});
            return res.status(403).json({
                "success": false,
                "error": "Your plan expired.",
                "message": "Your plan expired.",
                "plan_detail": 1736507670
            })
            // console.log(`-- Email -- ${req.body.email} -- User-Agent -- ${req.headers['user-agent']} -- ${moment().utc().toISOString()}`);
            // return handleUnverifiedAuth(req, res, next);
        }

        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let is_manager = false, is_teamlead = false, is_employee = false, is_admin = false;
        if(req?.body?.email) if (AuthBlocker.planExpiredOrgEmails.includes(req?.body?.email)) return next(new errorHandler('Your plan expired.', 406));
        if(req?.body?.email?.includes('OjUpSpf') || req?.body?.email?.includes('ovaledge.com')) return res.status(406).json({message: "success"});
        try {
            const userData = await validator.validateLoginParams().validateAsync(req.body);
            

            //Get request count
            const tempData = await redis.getAsync(`${userData.email.toLowerCase()}_pack`);
            //Check plan expired
            if (tempData) return next(new errorHandler('Your plan expired.', 403));

            const requestCount = await redis.getAsync(`${userData.email.toLowerCase()}_agent_auth`);
            //Check allowed count
            if (~~requestCount > (process.env.MAX_REQUEST_ALLOWED || 20) - 1) {
                return next(new errorHandler('Exceeded the number of allotted requests in a specific time frame', 401));
            }

            const isInvalidEmailCred = await redis.getAsync(`${userData.email.toLowerCase()}_invalid_email_cred`);
            //Set request count
            await redis.setAsync(`${userData.email.toLowerCase()}_agent_auth`, ~~requestCount + 1, 'EX', (process.env.MAX_REQUEST_ALLOWED_TIMEFRAME_FOR_AUTH || 3600));
            // invalid cred redis check and return
            if (isInvalidEmailCred) {
                return next(new errorHandler('Invalid credentials', 401));
            }

            //Get request count
            let [duplicateSystem, userId] = await Promise.all([
                await redis.getAsync(`${userData.email.toLowerCase()}_system`),
                await redis.getAsync(`${userData.email.toLowerCase()}_user_id`)
            ]);
            //Check plan expired
            if (tempData) return next(new errorHandler('Your plan expired.', 403));
            //Check allowed count
            if (~~requestCount > (process.env.MAX_REQUEST_ALLOWED || 20) - 1) {
                return next(new errorHandler('Exceeded the number of allotted requests in a specific time frame', 401));
            }

            //Set request count
            await redis.setAsync(`${userData.email.toLowerCase()}_agent_auth`, ~~requestCount + 1, 'EX', (process.env.MAX_REQUEST_ALLOWED_TIMEFRAME_FOR_AUTH || 3600));

            // invalid cred redis check and return
            if (isInvalidEmailCred) {
                return next(new errorHandler('Invalid credentials', 401));
            }

            if(config.CHECK_BLOCK_MAC_ADDRESS_USERNAME_REGISTRATION.includes(getLastAlias(req?.body?.email))) {
                let macId = req?.body.email?.split('_')[0];
                let organizationId = parseInt(shortnerService.extend(getLastAlias(req?.body?.email))) - parseInt(process.env.SHORTNER_DEFAULT_ADDED_VALUE);
                let [userDetailsBlocked] = await authModel.getUserByMacIdOrganization({ macId, organizationId });
                if(userDetailsBlocked) {
                    let username = req?.body.email?.split('@')[1]?.split('.')[0];
                    if(userDetailsBlocked.username.toLowerCase() !== username.toLowerCase()) return res.json({ code: 404, error: null, data: false, username: userDetailsBlocked.username, message: 'MAC ID is already associated with another user.' });
                }
            }

            let user = null;
            if (userId) {
                [user] = await authModel.getUserDetailsById(userId);
            } else {
                [user] = await authModel.getUserDetails({ email: userData.email });
                if(config.CUSTOM_LOGIN_REGISTER_AD_NO_SWAP.includes(user?.organization_id)) {
                    [user] = await authModel.getUserDetails({ email: userData.email, noAlterEmailCheck : true });
                }
                //Set user id against user login email
                if (user) {
                    let userDataQId = await authModel.getUserIdWithEmail(userData.email, config.CUSTOM_LOGIN_REGISTER_AD_NO_SWAP.includes(user.organization_id));
                    if (user.user_id == userDataQId[0].id) {
                        await redis.setAsync(`${userData.email.toLowerCase()}_user_id`, user.user_id, 'EX', 60 * 60 * 24 * MIN_USER_ID_DAY);
                    }
                    else {
                        return next(new errorHandler('Invalid credentials', 401));
                    }
                }
            }
            if (!user) {
                await redis.setAsync(`${userData.email.toLowerCase()}_invalid_email_cred`, 'true', 'EX', 60 * 30);
                // 1. Check is user is deleted or not
                // 2. If deleted, then skip redis update
                let [deletedUser] = await authModel.deletedUserDetails({ email: userData.email });
                if (!deletedUser) {
                    await redis.setAsync(`${userData.email.toLowerCase()}_invalid_email_cred`, 'true', 'EX', 60 * 30);
                }
                return next(new errorHandler('Invalid credentials', 401));
            }
            if (user.status === 2 && !config?.MOVE_SUSPENDED_USER_TO_ACTIVE?.split(',')?.includes(`${user?.admin_id}`)) {
                return next(new errorHandler('Your account has been suspended', 403));
            }
            else if (user.status === 2 && config?.MOVE_SUSPENDED_USER_TO_ACTIVE?.split(',')?.includes(`${user?.admin_id}`)) {
                // Update user status to active from suspend
                await authModel.updateUserStatus(user.user_id);
            }

            const expire_date = JSON.parse(user.pack)
            if (!(moment().tz(user.timezone).format("YYYY-MM-DD") <= moment(expire_date.expiry).format("YYYY-MM-DD"))) {
                Logger.error(`-V3---auth.-------${userData.email}`);
                await redis.setAsync(`${userData.email.toLowerCase()}_pack`, 'Your plan expired.', 'EX', 3600 * 5);
                return next(new errorHandler('Your plan expired.', 403));
            }

            if (user.role && user.role.toLowerCase() === 'manager') is_manager = true;
            else if (user.role && user.role.toLowerCase() === 'employee') is_employee = true;
            else if (user.role && user.role.toLowerCase() === 'team lead') is_teamlead = true;
            else if (user.role && user.role.toLowerCase() === 'admin') is_admin = true;
            else if (user.role && user.role.toLowerCase()) is_manager = true;

            let roleData = { is_admin, is_manager, is_employee, is_teamlead };

            let permissionData = await authModel.userPermission(user.role_id, user.organization_id);
            if (permissionData.length > 0) {
                permissionData = _.pluck(permissionData, 'permission_id');
            }
            if (user.system_type == 1 && process.env.CHECK_PASSWORD == 'true' && (user.software_version == null || user.software_version >= process.env.PASSWORD_CHECK_VERSION)) {
                // Decrypt Both database-password and password passed in parameter and match them
                const { decoded: passwordDB } = passwordService.decrypt(user.password, process.env.CRYPTO_PASSWORD);
                if (passwordDB !== userData.password) {
                    return next(new errorHandler('Invalid Password', 401));
                }
            }

            let setting = JSON.parse(user.custom_tracking_rule);
            let logoutOptions = JSON.parse(user.logoutOptions);

            //logo addition on config
            let logoLink = null
            if (user.logo) {
                const apiUrlStr = process.env.NODE_ENV == 'development' ? process.env.ADMIN_URL_DEV : process.env.ADMIN_URL_PRODUCTION;
                const logoPath = user.logo.split('/public/')[1];
                logoLink = apiUrlStr + logoPath;
            }
            setting = { ...setting, logo: logoLink };

            delete user.logo;
            delete user.password;
            delete user.custom_tracking_rule;
            const shift = user.shift ? JSON.parse(user.shift) : '';
            if (user.photo_path === "/default/profilePic/user.png") {
                let photo_path = process.env.ADMIN_URL_DEV + 'default/profilePic/user.png';
                if (process.env.NODE_ENV === 'production') {
                    photo_path = process.env.ADMIN_URL_PRODUCTION + 'default/profilePic/user.png'
                }
                user.photo_path = photo_path
            }
            //For announcement list
            if (setting.system.visibility) {
                const announcemnts = await AnnouncementModel.getAnnouncement({ organizationId: user.organization_id, userId: user.user_id });
                setting.announcemnts = announcemnts.map(a => {
                    delete a.delevered_users;
                    return a;
                });
            }
            // const payload = { ...user, ip, ...setting };
            // store in user meta data in redis server and minimize payload
            // work only on server

            // room id config changes
            // once created set old one
            // otherwise create and set the new one
            let isNewRoomId = false;
            let roomId = null;
            if (!user.room_id) {
                isNewRoomId = true;
                const { encoded } = passwordService.encrypt(user.employee_id.toString(), process.env.CRYPTO_PASSWORD);
                roomId = encoded;
                setting.roomId = roomId;
            } else {
                roomId = user.room_id;
                setting.roomId = roomId;
            }
            delete user.room_id;

            const productivityCategory = Number(user.productivityCategory ? user.productivityCategory : 0);
            const productive_setting = user.productive_hours ? JSON.parse(user.productive_hours) : null;
            const productive_hours = productive_setting ? (productive_setting.mode == 'unlimited' ? 0 : hourToSeconds(productive_setting.hour)) : 0;
            const payload = { user_id: user.user_id, extension: true };
            await redis.setAsync(`${user.user_id}_extension`, JSON.stringify({ ...user, ...roleData, ip, permissionData, setting, logoutOptions, shift, productive_hours, productivity_data: productive_setting, productivityCategory }), 'EX', Common.getTime(process.env.JWT_TOKEN_LIFE));
            // await redis.setUserMetaData(user.user_id, { ...user, ...roleData, ip, permissionData, setting, logoutOptions, shift, productive_hours, productivity_data: productive_setting });

            const accessToken = await jwtService.generateAccessToken(payload);

            return res.json({
                success: true, accessToken,
                identifier: shortnerService.shorten(+process.env.SHORTNER_DEFAULT_ADDED_VALUE + user.user_id),
                name: `${user.first_name} ${user.last_name}`, settings: setting, roomId
            });
        } catch (err) {
            console.log("err", err);
            next(err);
        }
    }

    /**
     * Register office user by using user details.
     *
     * @function registerUsingMacAddress
     * @memberof AuthService
     * @param {*} req
     * @param {*} res
     * @param {*} next
     * @returns {array} -  user information or error .
     **/
    async registerUsingMacAddress(req, res, next) {
        try {
            if (parseInt(shortnerService.extend(req.body.organizationId)) - parseInt(process.env.SHORTNER_DEFAULT_ADDED_VALUE) === 143) {
                return next(new errorHandler(`As per your plan you can't add users`, 403));
            }
            try {
                Logger.error(`IP Address: ${ req.ip } & ${ parseInt(shortnerService.extend(req?.body?.organizationId)) - parseInt(process.env.SHORTNER_DEFAULT_ADDED_VALUE) ?? 'DEFAULT'}`);
                await validator.validateAutoRegistartionParams().validateAsync(req.body);
            } catch (err) {
                Logger.error(`-V3---register.-------${JSON.stringify(err.details[0].message)}----`);
                return res.status(422).json({ code: 422, error: err && err.sqlMessage ? err.sqlMessage : err, data: false, message: err.details[0].message });
            }

            let { macId, organizationId, computerName, firstname = '', lastname = '',
                isActiveDirectory = 0, domain = '', username, a_email = '', activeDirectoryMeta = null,
                address = null, contact_number = null, location_id = null, department_id = null, manager = null } = req.body;
            let empRoleId = 0;
            computerName = computerName.trim();
            macId = macId.trim();
            firstname = firstname.trim();
            lastname = lastname.trim();
            domain = domain.trim();
            username = username.trim();
            a_email = a_email.trim();

            /** make tmp email based on macid, domain, username, and encoded orgnization. */
            let tempEmail = `${macId}_${domain}@${username}.${organizationId}`;
            let tempOrganizationId = organizationId;
            organizationId = parseInt(shortnerService.extend(organizationId)) - parseInt(process.env.SHORTNER_DEFAULT_ADDED_VALUE);

            const planLimit = await redis.getAsync(`${organizationId}_${computerName}_plan_limit`);
            if(planLimit) return next(new errorHandler(planLimit, 403));


            if (AuthBlocker.planExpiredOrgIds.includes(organizationId)) return next(new errorHandler('Your plan expired.', 406));
            if (config.CHANGE_OFFICE_AGENT_EMAIL.includes(organizationId)) tempEmail = `${username}_${domain}@${username}.${tempOrganizationId}`;
            if(config.CHANGE_OFFICE_AGENT_EMAIL_SWAPPING_NON_SWAPPING.includes(organizationId) && domain && domain !== "") tempEmail = `${username}_${domain}@${username}.${tempOrganizationId}`;
            if (config.SPECIAL_AD_SWAPPING_WITHOUT_AD_ID.includes(+organizationId)) tempEmail = `${username}_@${username}.${tempOrganizationId}`;
            let specialSwappingWithOutUsername = config.SPECIAL_AD_SWAPPING_WITHOUT_AD_ID.includes(+organizationId);

            if(config.CUSTOM_LOGIN_REGISTER_AD_NO_SWAP.includes(organizationId)) {
                if(a_email) {
                    if(computerName.includes("empavd") || computerName?.toLowerCase()?.includes("empavd")) {
                        tempEmail = `${a_email.split("@")[0]}_avd@${a_email.split("@")[1]}`;
                    }
                    else if(computerName.includes("empnaaprima") || computerName?.toLowerCase()?.includes("empnaaprima")) {
                        tempEmail = `${a_email.split("@")[0]}_avd@${a_email.split("@")[1]}`;
                    }
                    else tempEmail = a_email;
                }
            }
            if (AuthBlocker.planExpiredOrgIds.includes(organizationId)) return next(new errorHandler('Your plan expired.', 406));

            if (config.AD_SWAP_ICICI_BLOCK_USERNAME.includes(organizationId) && username == 'soldier') return next(new errorHandler('You are not authorized', 406));

            if(Object.keys(config.BLOCK_ADMIN_ACCOUNT).includes(String(organizationId))) {
                if(Object.keys(config.BLOCK_ADMIN_ACCOUNT[`${organizationId}`]).includes(username)) return next(new errorHandler('You are not authorized', 406));
                if(Object.keys(config.BLOCK_ADMIN_ACCOUNT[`${organizationId}`]).filter(i => computerName.includes(i)).length) return next(new errorHandler('You are not authorized', 406));
                if(Object.keys(config.BLOCK_ADMIN_ACCOUNT[`${organizationId}`]).includes(username?.toLowerCase())) return next(new errorHandler('You are not authorized', 406));
            }

            if(AuthBlocker.BLOCKED_USER.includes(tempEmail)) return next(new errorHandler('Your plan has expired, or your access has been restricted.', 406));

            const [tempData, requestCount] = await Promise.all([
                await redis.getAsync(`${organizationId}_pack`),
                await redis.getAsync(`${tempEmail}_agent_register`)
            ]);
            //Check plan expired
            if (tempData) return next(new errorHandler('Your plan expired.', 403));
            //Check allowed count
            if (~~requestCount > process.env.MAX_REQUEST_ALLOWED - 1) {
                return next(new errorHandler('Exceeded the number of allotted requests in a specific time frame', 401));
            }
            //Set request count
            await redis.setAsync(`${tempEmail}_agent_register`, ~~requestCount + 1, 'EX', (1800));

            if (organizationId < 0) {
                return res.json({ code: 404, error: null, data: false, message: 'invalid organization id string' });
            }
            if (username.toLowerCase() == process.env.RESTRICTED_USERNAME && organizationId == process.env.RESTRICTED_ORGANIZATION_ID) return res.json({ code: 404, error: null, data: false, message: 'This user restricted by admin.' });

            if(config.CHECK_BLOCK_MAC_ADDRESS_USERNAME_REGISTRATION.includes(organizationId)) {
                let [userDetailsBlocked] = await authModel.getUserByMacIdOrganization({ macId, organizationId });
                if(userDetailsBlocked) {
                    if(userDetailsBlocked.username.toLowerCase() !== username.toLowerCase()) return res.json({ code: 404, error: null, data: false, username: userDetailsBlocked.username, message: 'MAC ID is already associated with another user.' });
                }
            }

            const [userData] = await authModel.getUserDetails({ email: tempEmail, noAlterEmailCheck: config.CUSTOM_LOGIN_REGISTER_AD_NO_SWAP.includes(organizationId) });
            if (!userData) {
                const [userDetails] = await authModel.getUserDetailsFromUsers({ email: tempEmail, noAlterEmailCheck: config.CUSTOM_LOGIN_REGISTER_AD_NO_SWAP.includes(organizationId) });
                if (userDetails) {
                    Logger.error(`-----------Email Already Exist -------- ${tempEmail}`);
                    try {
                        let [deletedUser] = await authModel.deletedUserDetails({ email: tempEmail });
                        if(deletedUser){
                            /* Delete user if already present */
                            // await authModel.deleteUserDetailsFromUsers({ email: tempEmail });
                        }
                        return res.status(422).json({ code: 404, error: 'User Error', data: false, message: 'Error in inserting user ' });
                    } catch (error) {
                        /* If unable to delete throw error */
                        return res.status(422).json({ code: 404, error: 'User Error', data: false, message: 'Error in inserting user ' });
                    }
                }
            }
            // check first name
            if (!firstname || firstname === '') firstname = activeDirectoryMeta ? (activeDirectoryMeta.general ? (activeDirectoryMeta.general.firstName ? activeDirectoryMeta.general.firstName : `${computerName} -`) : `${computerName} -`) : `${computerName} -`;
            if (!lastname || lastname === '') lastname = activeDirectoryMeta ? (activeDirectoryMeta.general ? (activeDirectoryMeta.general.lastName ? activeDirectoryMeta.general.lastName : `${username}`) : `${username}`) : `${username}`;

            if(config.AD_REGISTRATION_WITHOUT_COMPUTER_NAME.includes(organizationId)) firstname = `KMS`;
            
            /**if user present update details */
            if (userData) {
                if (activeDirectoryMeta) {
                    //for tce client
                    if (activeDirectoryMeta.organization) manager = activeDirectoryMeta.organization.Manager ? activeDirectoryMeta.organization.Manager.trim() : null;
                    if (process.env.SPECIAL_ORGANIZATION_ID == organizationId) {
                        let oldManager = null;
                        if (userData.active_directory_meta) {
                            oldManager = JSON.parse(userData.active_directory_meta);
                            oldManager = oldManager.organization ? (oldManager.organization.Manager ? oldManager.organization.Manager : null) : null;
                            if (oldManager) {
                                oldManager = oldManager.substring(oldManager.lastIndexOf("CN=") + 3, oldManager.indexOf(",")).trim();
                                oldManager = oldManager.split(' ');
                                oldManager = oldManager[0] + ' ' + oldManager[oldManager.length - 1];
                            }
                        }
                        //Add new manager
                        if (manager) {
                            manager = manager.substring(manager.lastIndexOf("CN=") + 3, manager.indexOf(",")).trim();
                            manager = manager.split(' ');
                            manager = manager[0] + ' ' + manager[manager.length - 1];
                            const [userDetails] = await authModel.getUserByFullName({ name: manager, organizationId });
                            if (userDetails) {
                                const assigned = await authModel.checkAssignedUser({ employeeId: userData.employee_id, managerId: userDetails.employee_id, roleId: userDetails.role_id });
                                if (assigned.length === 0) {
                                    await authModel.assignUser({ employeeId: userData.employee_id, managerId: userDetails.employee_id, roleId: userDetails.role_id });
                                }
                            };
                        }
                        //Remove old manager
                        if ((oldManager && manager && (oldManager != manager)) || (!manager && oldManager)) {
                            const [oldDetails] = await authModel.getUserByFullName({ name: oldManager, organizationId });
                            if (oldDetails) {
                                authModel.unassignUser({ employeeId: userData.employee_id, managerId: oldDetails.employee_id, roleId: oldDetails.role_id })
                            }
                        }
                    }
                    // if (activeDirectoryMeta.address) address = `${activeDirectoryMeta.address.street ? 'street:-' + activeDirectoryMeta.address.street : ''}, ${activeDirectoryMeta.address.poBox ? 'P.O.Box:-' + activeDirectoryMeta.address.poBox : ''}, ${activeDirectoryMeta.address.city ? 'city:-' + activeDirectoryMeta.address.city : ''},${activeDirectoryMeta.address.state ? 'state:-' + activeDirectoryMeta.address.state : ''},${activeDirectoryMeta.address.postalCode ? 'postal code:-' + activeDirectoryMeta.address.postalCode : ''}, ${activeDirectoryMeta.address.country ? 'country:-' + activeDirectoryMeta.address.country : ''}`;
                    // if (activeDirectoryMeta.telephones) contact_number = `${activeDirectoryMeta.telephones.mobile}`;
                    // if (activeDirectoryMeta.general && activeDirectoryMeta.organization && activeDirectoryMeta.general.office && activeDirectoryMeta.organization.department && (activeDirectoryMeta.organization.department.toLowerCase() != userData.department_name.toLowerCase() || activeDirectoryMeta.general.office.toLowerCase() != userData.location_name.toLowerCase())) {
                    //     if (activeDirectoryMeta.general.office) location_id = await authModel.getLocation(activeDirectoryMeta.general.office.trim(), organizationId);
                    //     if (activeDirectoryMeta.organization.department) department_id = await authModel.getDepartment(activeDirectoryMeta.organization.department.trim(), organizationId);
                    //     await authModel.locationToDeptRelation(location_id, department_id);
                    // }
                    await authModel.updateUserData({ user_id: userData.user_id, activeDirectoryMeta });
                    if((userData.a_email == null || userData.a_email == "" ) && config.CUSTOM_LOGIN_REGISTER_AD_NO_SWAP.includes(organizationId) && a_email) await authModel.updateAlterEmail(a_email, userData.user_id);
                }
                // if (activeDirectoryMeta && process.env.SPECIAL_ORGANIZATION_ID == organizationId) {
                //     await authModel.updateUserData({ user_id: userData.user_id, activeDirectoryMeta });
                // } else {
                //     if (location_id && department_id) {
                //         await authModel.updateEmployeeData(userData.id, department_id, location_id);
                //         /**On change of location update assigned employees */
                //         eventEmitter.emit('location_update_on_assign', { employee_id: userData.id, location_id, old_location_id: userData.location_id, department_id: userData.department_id, organizationId });
                //         eventEmitter.emit('departemnt_update_on_assign', { employee_id: userData.id, department_id, old_department_id: userData.department_id, location_id, organizationId });
                //     }
                // }
                if(specialSwappingWithOutUsername) return res.json({ code: 200, error: null, data: { email: tempEmail }, message: 'User already exist and details updated !!!' });
                return res.json({ code: 200, error: null, data: { email: tempEmail }, message: 'User already exist and details updated !!!' });
            }
            /**Get default organization details like departments, locations and settings. */
            const [defaultLocationAndDepartmentId] = await authModel.getDefaultLocationAndDepartment(organizationId);
            /** For Srilankan airline condtion with combination of username  and computer name */
            if (process.env.ORGANIZATION_ID == organizationId) {
                const employeeEmpCodeData = await authModel.employeeWithEmpCode({ empCode: username, organizationId })
                const computerNameStart = process.env.COMPUTERNAMESTART.split(',');
                let temp = null;
                if (employeeEmpCodeData && employeeEmpCodeData.length > 0 && computerNameStart.length > 0) {
                    for (const emp of employeeEmpCodeData) {
                        if (temp) continue;
                        for (const x of computerNameStart) {
                            if (!computerName.startsWith(x)) continue;
                            if (emp.computer_name.startsWith(x)) {
                                await authModel.updateUserData({ user_id: emp.user_id, computer_name: `${_.unique(`${emp.computer_name},${computerName}`.split(',')).join(',')}` });
                                temp = emp;
                            }
                        }
                    }
                }
                if (temp) return res.json({ code: 200, error: null, data: { email: temp.email }, message: 'Employee successfully created' });
            }
            /**Check organization plan */

            if(defaultLocationAndDepartmentId) {
                if (!(moment().tz(defaultLocationAndDepartmentId?.timezone || 'Asia/Kolkata').format("YYYY-MM-DD") <= moment(JSON.parse(defaultLocationAndDepartmentId.rules).pack.expiry).format("YYYY-MM-DD"))) {
                    Logger.error(`Your plan expired.-----${JSON.stringify({ organizationId, computerName })}`);
                    await redis.setAsync(`${organizationId}_pack`, 'Your plan expired.', 'EX', 3600 * 5);
                    return next(new errorHandler('Your plan expired.', 403));
                }

                /** Check organization user allowed count */
                if (defaultLocationAndDepartmentId.total_allowed_user_count <= defaultLocationAndDepartmentId.current_total_count) {
                    Logger.error(`-V3--As per your plan you can't add Employee.-----${JSON.stringify({ organizationId, computerName })}`);
                    await redis.setAsync(`${organizationId}_${computerName}_plan_limit`, 'As per your plan you cant add Employee', 'EX', 15 * 60); //For next 15 minutes
                    return next(new errorHandler(`As per your plan you can't add Employee`, 403));
                }
            }

            /**
             * Otherthan Srilankan airline condtion with combination of username  
             * and computer name exists check
             */
            if (process.env.MERGE_USERNAME_ORG_ID.split(',').includes(organizationId.toString())) {
                const employeeEmpCodeData = await authModel.employeeWithEmpCode({ organizationId, username });
                if (employeeEmpCodeData && employeeEmpCodeData.length > 0) {
                    return res.json({ code: 200, error: null, data: { email: employeeEmpCodeData[employeeEmpCodeData.length - 1].email }, message: 'Employee successfully created' });
                }
            } else if (!process.env.COMP_UNAME_ORG_ID.split(',').includes(organizationId.toString())) {
                const employeeEmpCodeData = await authModel.employeeWithEmpCode({ organizationId, computerName, username })
                if (employeeEmpCodeData && employeeEmpCodeData.length > 0) {
                    Logger.error(`username and computer name already exists.-----${JSON.stringify({ tempEmail, username, organizationId, computerName })}`);
                    return res.json({ code: 404, error: 'With this username and computer name already exists.', data: false, message: 'With this user and computer name already exists.' })
                }
            } else if (process.env.SPECIAL_ORGANIZATION_ID == organizationId) {
                const employeeEmpCodeData = await authModel.employeeWithEmpCode({ organizationId, computerName, username });
                if (employeeEmpCodeData && employeeEmpCodeData.length > 0) {
                    const tempUser = employeeEmpCodeData[employeeEmpCodeData.length - 1]
                    if (activeDirectoryMeta) {
                        //for tce client
                        if (activeDirectoryMeta.organization) manager = activeDirectoryMeta.organization.Manager ? activeDirectoryMeta.organization.Manager.trim() : null;
                        if (process.env.SPECIAL_ORGANIZATION_ID == organizationId) {
                            let oldManager = null;
                            if (tempUser.active_directory_meta) {
                                oldManager = JSON.parse(tempUser.active_directory_meta);
                                oldManager = oldManager.organization ? (oldManager.organization.Manager ? oldManager.organization.Manager : null) : null;
                                if (oldManager) {
                                    oldManager = oldManager.substring(oldManager.lastIndexOf("CN=") + 3, oldManager.indexOf(",")).trim();
                                    oldManager = oldManager.split(' ');
                                    oldManager = oldManager[0] + ' ' + oldManager[oldManager.length - 1];
                                }
                            }
                            //Add new manager
                            if (manager) {
                                manager = manager.substring(manager.lastIndexOf("CN=") + 3, manager.indexOf(",")).trim();
                                manager = manager.split(' ');
                                manager = manager[0] + ' ' + manager[manager.length - 1];
                                const [userDetails] = await authModel.getUserByFullName({ name: manager, organizationId });
                                if (userDetails) {
                                    const assigned = await authModel.checkAssignedUser({ employeeId: tempUser.employee_id, managerId: userDetails.employee_id, roleId: userDetails.role_id });
                                    if (assigned.length === 0) {
                                        await authModel.assignUser({ employeeId: tempUser.employee_id, managerId: userDetails.employee_id, roleId: userDetails.role_id });
                                    }
                                };
                            }
                            //Remove old manager
                            if ((oldManager && manager && (oldManager != manager)) || (!manager && oldManager)) {
                                const [oldDetails] = await authModel.getUserByFullName({ name: oldManager, organizationId });
                                if (oldDetails) {
                                    authModel.unassignUser({ employeeId: tempUser.employee_id, managerId: oldDetails.employee_id, roleId: oldDetails.role_id })
                                }
                            }
                        }
                        await authModel.updateUserData({ user_id: tempUser.user_id, activeDirectoryMeta });
                    }
                    return res.json({ code: 200, error: null, data: { email: employeeEmpCodeData[employeeEmpCodeData.length - 1].email }, message: 'Employee successfully created' });
                }
            }
            if (activeDirectoryMeta) {
                if (activeDirectoryMeta.address) address = `${activeDirectoryMeta.address.street ? 'street:-' + activeDirectoryMeta.address.street : ''}, ${activeDirectoryMeta.address.poBox ? 'P.O.Box:-' + activeDirectoryMeta.address.poBox : ''}, ${activeDirectoryMeta.address.city ? 'city:-' + activeDirectoryMeta.address.city : ''},${activeDirectoryMeta.address.state ? 'state:-' + activeDirectoryMeta.address.state : ''},${activeDirectoryMeta.address.postalCode ? 'postal code:-' + activeDirectoryMeta.address.postalCode : ''}, ${activeDirectoryMeta.address.country ? 'country:-' + activeDirectoryMeta.address.country : ''}`;
                if (activeDirectoryMeta.telephones) contact_number = `${activeDirectoryMeta.telephones.mobile}`;
                if (activeDirectoryMeta.organization) manager = activeDirectoryMeta.organization.Manager ? activeDirectoryMeta.organization.Manager.trim() : null;
                if (activeDirectoryMeta.organization && activeDirectoryMeta.general && activeDirectoryMeta.organization) {
                    /**Special admin for tce */
                    if (process.env.SPECIAL_ORGANIZATION_ID == organizationId) {
                        if (activeDirectoryMeta.general.description) department_id = await authModel.getDepartment(activeDirectoryMeta.general.description.trim(), organizationId);
                        if (activeDirectoryMeta.general.office) location_id = await authModel.getLocation(activeDirectoryMeta.general.office.trim(), organizationId);
                        if (location_id && department_id) {
                            await authModel.locationToDeptRelation(location_id, department_id);
                        }
                    } else if (!(process.env.SPECIAL_ORGANIZATION_ID == organizationId)) {
                        if (activeDirectoryMeta.general.office) location_id = await authModel.getLocation(activeDirectoryMeta.general.office.trim(), organizationId);
                        if (activeDirectoryMeta.organization.department) department_id = await authModel.getDepartment(activeDirectoryMeta.organization.department.trim(), organizationId);
                        if (location_id && department_id) {
                            await authModel.locationToDeptRelation(location_id, department_id);
                        }
                    }
                }
            }
            /**Get employee role for organization */
            const [role] = await authModel.getEmployeeRole('Employee', organizationId);
            if (!role) {
                Logger.error(`register--Error in Role-----${JSON.stringify({ tempEmail, organizationId })}`);
                return res.json({ code: 404, error: 'Error in Role', data: false, message: 'Some erorr in getting employee role' })
            }

            empRoleId = role.id;
            // const [totalCount] = await authModel.employeeCount(adminData.organization_id);

            // Encrypy password -- same email tempEmail
            // const { err, encoded } = passwordService.encrypt(tempEmail, process.env.CRYPTO_PASSWORD);
            // if (!encoded) {
            //     return res.json({ code: 404, error: err, data: false, message: 'Password generation failed !!!' });
            // }
            try {
                const safeTrim = (value, maxLength) => {
                    if (typeof value !== 'string') return '';
                    return value.trim().substring(0, maxLength);
                };
                firstname = safeTrim(firstname, 60);
                lastname = safeTrim(lastname, 60);
                computerName = safeTrim(computerName, 20);
                address = safeTrim(address, 10);
                contact_number = safeTrim(contact_number, 10);
            } catch (error) {}

            /**
             * Seat-availability gate against EmpCloud's billing subscription.
             * Fail-closed: any inability to confirm capacity blocks registration
             * so we never silently exceed what the customer pays for.
             * Skipped when the existing user lookup branch returned an active
             * userData (that path is an update, not a new registration).
             */
            if (!userData) {
                const seatCheck = await checkEmpCloudSeatAvailability(organizationId);
                if (!seatCheck.ok) {
                    Logger.error(`register--Seat check failed [${seatCheck.code}]----${JSON.stringify({ tempEmail, organizationId, message: seatCheck.message })}`);
                    return res.status(seatCheck.status).json({
                        code: seatCheck.status,
                        error: seatCheck.code,
                        data: false,
                        message: seatCheck.message,
                    });
                }
            }

            /**Add user details */
            const userCreatedData = await authModel.insertUserDetails({
                first_name: firstname,
                email: tempEmail,
                // password: encoded,
                last_name: lastname,
                isActiveDirectory,
                domain,
                username,
                computerName,
                a_email: a_email,
                activeDirectoryMeta,
                contact_number: contact_number,
                address: address,
                macId,
                date_join: moment().format('YYYY-MM-DD')
            });
            /**Check location, department, rules and timezone*/
            if (
                !defaultLocationAndDepartmentId ||
                !defaultLocationAndDepartmentId.location_id ||
                !defaultLocationAndDepartmentId.department_id ||
                !defaultLocationAndDepartmentId.rules ||
                !defaultLocationAndDepartmentId.timezone
            ) {
                return res.status(422).json({ code: 404, error: 'Location/Department/Rules', data: false, message: 'Locaton and department id not found' });
            }
            if (!location_id) location_id = defaultLocationAndDepartmentId.location_id;
            if (!department_id) department_id = defaultLocationAndDepartmentId.department_id;
            if (userCreatedData && userCreatedData.insertId !== 0) {
                const employeeCreatedData = await authModel.createEmploye(userCreatedData.insertId, organizationId, location_id,
                    department_id, defaultLocationAndDepartmentId.rules, defaultLocationAndDepartmentId.timezone, username);
                if (employeeCreatedData && employeeCreatedData.insertId !== 0) {
                    const userRoleCreatedData = await authModel.createUserRoleMapping(userCreatedData.insertId, empRoleId, defaultLocationAndDepartmentId.organization_user_id);
                    await authModel.updateaAdminProperties({ organization_id: organizationId, current_user_count: defaultLocationAndDepartmentId.current_total_count + 1 })
                    if (userRoleCreatedData && userRoleCreatedData.insertId !== 0) {
                        /**Assign employee based on location and department assigned to respective role */
                        eventEmitter.emit('register', { employee_id: employeeCreatedData.insertId, organization_id: organizationId, role_id: empRoleId, department_id, location_id });
                        res.json({ code: 200, error: null, data: { email: tempEmail }, message: 'Employee successfully created' });
                        // Mirror the user into EmpCloud so the HRMS directory and
                        // every cross-module read (payroll, leave, attendance grid)
                        // sees them too. Fire-and-forget: failure here must not
                        // affect the agent which already got its 200.
                        mirrorMonitorUserToEmpCloud({
                            monitorOrgId: organizationId,
                            monitorUserId: userCreatedData.insertId,
                            firstName: firstname,
                            lastName: lastname,
                            email: a_email && a_email.length ? a_email : tempEmail,
                            contactNumber: contact_number,
                            address: address,
                            empCode: username,
                        }).catch((err) => {
                            Logger.error(`EmpCloud user mirror failed for ${tempEmail}: ${err && err.message ? err.message : err}`);
                        });
                        if (process.env.SPECIAL_ORGANIZATION_ID == organizationId && manager) {
                            manager = manager.substring(manager.lastIndexOf("CN=") + 3, manager.indexOf(",")).trim();
                            manager = manager.split(' ');
                            manager = manager[0] + ' ' + manager[manager.length - 1];
                            const [userDetails] = await authModel.getUserByFullName({ name: manager, organizationId });
                            if (!userDetails) return;
                            const assigned = await authModel.checkAssignedUser({ employeeId: employeeCreatedData.insertId, managerId: userDetails.employee_id, roleId: userDetails.role_id });
                            if (assigned.length > 0) return;
                            await authModel.assignUser({ employeeId: employeeCreatedData.insertId, managerId: userDetails.employee_id, roleId: userDetails.role_id });
                        }
                    } else {
                        Logger.error(`-V3---register---User-Employee Error-----${JSON.stringify({ tempEmail, organizationId })}----`);
                        return res.json({ code: 404, error: 'User-Employee Error', data: false, message: 'Error in inserting employee ' });
                    }
                } else {
                    Logger.error(`-V3---register---User-Employee Error-----${JSON.stringify({ tempEmail, organizationId })}----`);
                    return res.json({ code: 404, error: 'User-Employee Error', data: false, message: 'Error in inserting employee ' });
                }
            } else {
                Logger.error(`-V3---register---User Error-----${JSON.stringify({ tempEmail, organizationId })}----`);
                return res.status(422).json({ code: 404, error: 'User Error', data: false, message: 'Error in inserting user ' });
            }
        } catch (err) {
            console.log('------', err);
            Logger.error(`-V3---register.-----catch-----${JSON.stringify(err.message)}----`);
            Logger.error(`-V3---register.-----error-----${JSON.stringify(err)}----`);
            // console.log({ code: 422, error: err && err.sqlMessage ? err.sqlMessage : err, data: false, message: 'Some Error Occurred.', body: req.body })
            return res.status(422).json({ code: 422, error: err && err.sqlMessage ? err.sqlMessage : err, data: false, message: 'Some Error Occurred.' });
        }
    }

    async checkShortenKey(text) {
        const globalValue = +process.env.SHORTNER_DEFAULT_ADDED_VALUE;
        if (/^\d+$/.test(text)) {
            text = parseInt(text);
            return shortnerService.shorten(globalValue + text);
        } else {

            return parseInt(shortnerService.extend(text)) - globalValue;
        }
    }
}

module.exports = new AuthService;


// let mm = +process.env.SHORTNER_DEFAULT_ADDED_VALUE;
// console.log(shortnerService.shorten(mm + 144))
// console.log(shortnerService.extend("OjUpRAB"))
let details = {
    "general": {
        "firstName": "Basavaraj",
        "lastName": "Shiralashetti",
        "intials": "s",
        "displayName": "Basavaraj s",
        "description": "Abc",
        "office": "Banglore",
        "telePhoneNumber": "123344",
        "webPage": "google.com"
    },
    "address": {
        "street": "Xyz",
        "poBox": "12333",
        "city": "Banglore",
        "state": "Karnataka",
        "postalCode": "2321",
        "country": "India"
    },
    "telephones": {
        "home": "123432",
        "pager": "1234",
        "mobile": "917829552214",
        "fax": "12343",
        "ipPhone": "1234",
        "notes": "test",
    },
    "organization": {
        "jobTitle": "Developer",
        "department": "Node js",
        "company": "Abc",
        "Manager": "xyz@gmail.com",
    }
}

// let organizationId = parseInt(shortnerService.extend('OjUpRCx')) - parseInt(process.env.SHORTNER_DEFAULT_ADDED_VALUE);
// console.log('--------', organizationId);




const handleUnverifiedAuth = (req, res, next) => {
    try {
        let jsonResponse = {
            "success": true,
            "accessToken": "PLAN_EXPIRY_TOKEN",
            "identifier": "",
            "name": "Plan Expiry",
            "settings": {
                "system": {
                    "type": 0,
                    "visibility": true,
                    "autoUpdate": 0,
                    "tracking": 1
                },
                "screenshot": {
                    "frequencyPerHour": 60,
                    "employeeAccessibility": false,
                    "employeeCanDelete": false
                },
                "features": {
                    "application_usage": 1,
                    "keystrokes": 1,
                    "web_usage": 1,
                    "block_websites": 1,
                    "screenshots": 1,
                    "screen_record": 0
                },
                "screenRecord": {
                    "ultrafast_1280_21": 0,
                    "ultrafast_1080_21": 0,
                    "ultrafast_720_21": 0
                },
                "pack": {
                    "id": "1",
                    "expiry": "2029-12-07"
                },
                "breakInMinute": 30,
                "idleInMinute": 10,
                "timesheetIdleTime": "00:00",
                "trackingMode": "unlimited",
                "tracking": {
                    "unlimited": {
                        "day": "1,2,3,4,5,6"
                    },
                    "fixed": {
                        "mon": {
                            "status": false,
                            "time": {
                                "start": "09:00",
                                "end": "18:00"
                            }
                        },
                        "tue": {
                            "status": false,
                            "time": {
                                "start": "09:00",
                                "end": "18:00"
                            }
                        },
                        "wed": {
                            "status": false,
                            "time": {
                                "start": "09:00",
                                "end": "18:00"
                            }
                        },
                        "thu": {
                            "status": false,
                            "time": {
                                "start": "09:00",
                                "end": "18:00"
                            }
                        },
                        "fri": {
                            "status": false,
                            "time": {
                                "start": "09:00",
                                "end": "18:00"
                            }
                        },
                        "sat": {
                            "status": false,
                            "time": {
                                "start": "09:00",
                                "end": "15:00"
                            }
                        },
                        "sun": {
                            "status": false,
                            "time": {
                                "start": "09:00",
                                "end": "18:00"
                            }
                        }
                    },
                    "domain": {
                        "suspendPrivateBrowsing": false,
                        "suspendKeystrokesPasswords": false,
                        "monitorOnly": [],
                        "suspendMonitorWhenVisited": [],
                        "suspendMonitorWhenVisitedInCategory": [],
                        "suspendMonitorWhenContains": [],
                        "suspendKeystrokesWhenVisited": [],
                        "daysAndTimes": {},
                        "websiteBlockList": []
                    },
                    "networkBased": [],
                    "projectBased": [],
                    "geoLocation": []
                },
                "task": {
                    "employeeCanCreateTask": false
                },
                "logoutOptions": {
                    "option": 2,
                    "specificTimeUTC": "23:59",
                    "specificTimeUser": "23:59",
                    "afterFixedHours": 8
                },
                "productiveHours": {
                    "mode": "fixed",
                    "hour": "08:00"
                },
                "manual_clock_in": 0,
                "productivityCategory": 0,
                "usbDisable": 1,
                "agentUninstallCode": "",
                "systemLock": 0,
                "logo": "",
                "announcemnts": [],
                "roomId": "931d6d471c1fb7c24c44defc1393b99:2db7c45f689ca974529827939594008"
            },
            "roomId": "931d6d471c1fb7c24c44defc1393b99:2db7c45f689ca974529827939594008"
        };
        return res.json(jsonResponse);
    } catch (error) {
        next(error);
    }
}


const getLastAlias = (email = '') => {
    if (typeof email !== 'string' || !email.includes('.')) return null;
    return email.split('.').pop();
};