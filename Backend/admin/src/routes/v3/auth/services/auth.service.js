'use strict';

const authModel = require('../auth.model');
const validator = require('../auth.validation');
const passwordService = require('./password.service');
const redis = require('./redis.service');
const jwtService = require('./jwt.service');
const moment = require('moment-timezone');
const defaultSettings = require('./../default.settings.json');
const _ = require('underscore');
const event = require('./event.service');
const actionsTracker = require('../../services/actionsTracker');
const Comman = require('../../../../utils/helpers/Common');
const mySql = require('../../../../database/MySqlConnection').getInstance();
const jwt = require('jsonwebtoken');
const mysql2 = require('mysql2/promise');
const activityLogsSchema = require('./activitylogs.schema');
const crypto = require('crypto');
const { Mailer } = require('../../../../messages/Mailer');
const { getMailTemplate2FA } = require('../../../../utils/helpers/MailTemplate');
const speakeasy = require('speakeasy');
/**
 * User Authentication routes
 *
 * @class UserAuthIndex
 */
class AuthService {
  async userAuth(req, res, next) {
    try {
      let {email, password, ip} = await validator.validateUserAuthParams().validateAsync(req.body);
      let is_manager = false,
        is_teamlead = false,
        is_employee = false;

      const [userData] = await authModel.userWithAdminAndRole(email);

      if (!userData) return res.status(400).json({code: 400, error: 'Not Found', message: 'User does not exists', data: null});
      if (userData.status == 2) return res.status(400).json({code: 400, error: 'Not Found', message: 'User suspended by admin', data: null});
      const userRoles = await authModel.roles(userData.id);

      let permissionData = await authModel.userPermission(userData.role_id, userData.organization_id);
      let permission_ids = [];
      if (permissionData.length > 0) {
        permission_ids = _.pluck(permissionData, 'permission_id');
      }

      if (userData.role && userData.role.toLowerCase() === 'manager') is_manager = true;
      else if (userData.role && userData.role.toLowerCase() === 'employee') is_employee = true;
      else if (userData.role && userData.role.toLowerCase() === 'team lead') is_teamlead = true;
      else if (userData.role && userData.role.toLowerCase()) is_manager = true;
      else return res.status(403).json({code: 403, error: 'Not autherized', message: 'You are not autherized to access this.', data: null});

      const {decoded} = await passwordService.decrypt(userData.password, process.env.CRYPTO_PASSWORD);
      if (decoded != password) return res.status(400).json({code: 400, error: 'Invalid', message: 'Password is invalid.', data: null});

      let setting = JSON.parse(userData.custom_tracking_rule);
      const shift = userData.shift ? JSON.parse(userData.shift) : '';

      let expire_date = moment(JSON.parse(userData.expire_date)).format('YYYY-MM-DD');
      let now = moment().format('YYYY-MM-DD');
      if (!(now <= expire_date)) return res.status(400).json({code: 400, error: 'Denied', message: 'Access Denied as package is expired. Contact your administrator to renew the plan.', data: null});
      const productive_setting = userData.productive_hours ? JSON.parse(userData.productive_hours) : null;
      const productive_hours = productive_setting ? (productive_setting.mode == 'unlimited' ? 28800 : Comman.hourToSeconds(productive_setting.hour)) : 28800;

      if (setting.system.visibility) {
        setting.announcemnts = await authModel.getAnnouncement({organizationId: userData.organization_id, userId: userData.id});
      }
      setting.roomId = userData.room_id;
      /**user details for JWT token */
      let adminJsonData = {
        user_id: userData.id,
        employee_id: userData.employee_id,
        organization_id: userData.organization_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        a_email: userData.a_email,
        email_verified_at: userData.email_verified_at,
        contact_number: userData.contact_number,
        emp_code: userData.emp_code,
        location_id: userData.location_id,
        location_name: userData.location,
        department_id: userData.department_id,
        department_name: userData.department,
        photo_path: userData.photo_path,
        address: userData.address,
        role_id: userData.role_id,
        role: userData.role,
        status: userData.status,
        timezone: userData.timezone,
        is_manager: is_manager,
        is_teamlead: is_teamlead,
        is_employee: is_employee,
        is_admin: false,
        weekday_start: userData.weekday_start,
        language: userData.language,
        productive_hours,
        productivity_data: productive_setting,
        productivityCategory: userData.productivityCategory,
        permissionData,
      };

      const payload = {user_id: adminJsonData.user_id};
      await redis.setAsync(adminJsonData.user_id, JSON.stringify({...adminJsonData, permission_ids, setting, shift}), 'EX', Comman.getTime(process.env.JWT_EXPIRY));
      // await redis.setUserMetaData(adminJsonData.user_id, { ...adminJsonData, permission_ids, setting, shift });

      const accessToken = await jwtService.generateAccessToken(payload);

      // const [count] = await authModel.getWhitelistCount(userData.organization_id);
      // if (count && count.count > 0) {
      //     const IPData = await authModel.whitelistIPs(ip, userData.organization_id);
      //     if (IPData.length > 0) {
      //         return res.status(200).json({
      //             code: 200,
      //             data: accessToken,
      //             user_name: userData.first_name,
      //             is_admin: false,
      //             is_manager: adminJsonData.is_manager,
      //             is_teamlead: adminJsonData.is_teamlead,
      //             is_employee: adminJsonData.is_employee,
      //             user_id: userData.employee_id,
      //             photo_path: userData.photo_path,
      //             full_name: userData.first_name + ' ' + userData.last_name,
      //             email: userData.a_email,
      //             location_id: userData.location_id,
      //             department_id: userData.department_id,
      //             organization_id: userData.organization_id,
      //             permissionData,
      //             role: userData.role,
      //             message: 'Authentication Successful',
      //             error: null
      //         });
      //     } else {
      //         console.log('Ip is not allowed--vik')
      //         return res.status(400).json({ code: 400, data: null, message: 'This IP is not allowed by the administrator.', error: 'Access Denied' });
      //     }
      // } else {
      const feature = await authModel.dashboardFeature();
      actionsTracker(req, 'User %i logged in successfully.', [userData.id]);

      if (is_manager|| is_teamlead) {
        let activityData = {
          employeeId: userData.employee_id,
          organization: userData.organization_id,
          type: 'LogIn',
          logIn: new Date(),
        }
        await activityLogsSchema.create(activityData);
      }
      if (permissionData.find(i => i.permission_id === 216)) {
        let apiResponse = {
          code: 200,
          data: accessToken,
          user_name: userData.first_name,
          is_admin: false,
          is_manager: adminJsonData.is_manager,
          is_teamlead: adminJsonData.is_teamlead,
          is_employee: adminJsonData.is_employee,
          user_id: userData.employee_id,
          photo_path: userData.photo_path,
          full_name: userData.first_name + ' ' + userData.last_name,
          email: userData.a_email,
          location_id: userData.location_id,
          organization_id: userData.organization_id,
          department_id: userData.department_id,
          permissionData,
          feature: feature,
          role: userData.role,
          role_id: userData.role_id,
          roles: userRoles,
          total_allowed_user_count: userData.total_allowed_user_count,
          u_id: userData.id,
          weekday_start: userData.weekday_start,
          language: userData.language,
          message: 'Authentication Successful',
          error: null,
        }
        let otp2FA = generateOTP();
        await redis.setAsync(`${userData.employee_id}_2fa_otp`, otp2FA, 'EX', 5 * 60);
        await redis.setAsync(`${userData.employee_id}_2fa_otp_response`, JSON.stringify(apiResponse), 'EX', 5 * 60);
        let htmlTemplate = getMailTemplate2FA(otp2FA);
        let empAdminEmail = process.env.EMP_ADMIN_EMAIL;
        await Mailer.sendMail({
          from: empAdminEmail,
          to: userData.a_email,
          subject: "Your 2FA OTP for EmpMonitor Login",
          text: "Your 2FA OTP for EmpMonitor Login",
          html: htmlTemplate,
        });
        return res.status(200).json({
          code: 200,
          message: 'OTP Send Successful',
          data: null,
          error: null,
        });
      }
      return res.status(200).json({
        code: 200,
        data: accessToken,
        user_name: userData.first_name,
        is_admin: false,
        is_manager: adminJsonData.is_manager,
        is_teamlead: adminJsonData.is_teamlead,
        is_employee: adminJsonData.is_employee,
        user_id: userData.employee_id,
        photo_path: userData.photo_path,
        full_name: userData.first_name + ' ' + userData.last_name,
        email: userData.a_email,
        location_id: userData.location_id,
        organization_id: userData.organization_id,
        department_id: userData.department_id,
        permissionData,
        feature: feature,
        role: userData.role,
        role_id: userData.role_id,
        roles: userRoles,
        total_allowed_user_count: userData.total_allowed_user_count,
        u_id: userData.id,
        weekday_start: userData.weekday_start,
        language: userData.language,
        message: 'Authentication Successful',
        error: null,
      });
      // }
    } catch (error) {
      console.log('Catch error ---', error);
      return res.status(400).json({code: 400, error: 'Error in auth', message: error.message, data: null});
    }
  }
  async accountSwitch(req, res, next) {
    try {
      const email = req.decoded.a_email.trim();
      const {role_id} = await validator.validateUserAccountSwitch().validateAsync(req.body);

      let is_manager = false,
        is_teamlead = false,
        is_employee = false;

      const [userData] = await authModel.userWithAdminAndRole(email);

      if (!userData) return res.status(400).json({code: 400, error: 'Not Found', message: 'User does not exists', data: null});
      const userRoles = await authModel.roles(userData.id);

      const role = userRoles.find(el => el.role_id == role_id);
      if (!role) return res.status(400).json({code: 400, error: 'Role Not Found', message: 'Role Not Found', data: null});
      userData.role_id = role.role_id;
      userData.role = role.name;

      let permissionData = await authModel.userPermission(userData.role_id, userData.organization_id);
      let permission_ids = [];
      if (permissionData.length > 0) {
        permission_ids = _.pluck(permissionData, 'permission_id');
      }
      let setting = JSON.parse(userData.custom_tracking_rule);
      const shift = userData.shift ? JSON.parse(userData.shift) : '';

      if (userData.role && userData.role.toLowerCase() === 'manager') is_manager = true;
      else if (userData.role && userData.role.toLowerCase() === 'employee') is_employee = true;
      else if (userData.role && userData.role.toLowerCase() === 'team lead') is_teamlead = true;
      else if (userData.role && userData.role.toLowerCase()) is_manager = true;
      else return res.status(403).json({code: 403, error: 'Not autherized', message: 'You are not autherized to access this.', data: null});
      const productive_setting = userData.productive_hours ? JSON.parse(userData.productive_hours) : null;
      const productive_hours = productive_setting ? (productive_setting.mode == 'unlimited' ? 28800 : Comman.hourToSeconds(productive_setting.hour)) : 28800;

      /**user details for JWT token */
      let adminJsonData = {
        user_id: userData.id,
        employee_id: userData.employee_id,
        organization_id: userData.organization_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        a_email: userData.a_email,
        email_verified_at: userData.email_verified_at,
        contact_number: userData.contact_number,
        emp_code: userData.emp_code,
        location_id: userData.location_id,
        location_name: userData.location,
        department_id: userData.department_id,
        department_name: userData.department,
        photo_path: userData.photo_path,
        address: userData.address,
        role_id: userData.role_id,
        role: userData.role,
        status: userData.status,
        timezone: userData.timezone,
        is_manager: is_manager,
        weekday_start: userData.weekday_start,
        is_teamlead: is_teamlead,
        is_employee: is_employee,
        is_admin: false,
        language: userData.language,
        productive_hours,
        productivity_data: productive_setting,
        permissionData,
      };

      const payload = {user_id: adminJsonData.user_id};
      await redis.setAsync(adminJsonData.user_id, JSON.stringify({...adminJsonData, permission_ids, setting, shift}), 'EX', Comman.getTime(process.env.JWT_EXPIRY));
      // await redis.setUserMetaData(adminJsonData.user_id, { ...adminJsonData, permission_ids, setting, shift });
      const accessToken = await jwtService.generateAccessToken(payload);

      const feature = await authModel.dashboardFeature();
      actionsTracker(req, 'User %i logged in successfully.', [userData.id]);
      if ( is_manager==true || is_teamlead==true) {
        let activityData = {
          employeeId: userData.employee_id,
          organization: userData.organization_id,
          type: 'LogIn',
          logIn: new Date(),
        }
        await activityLogsSchema.create(activityData);
      }
      return res.status(200).json({
        code: 200,
        data: accessToken,
        user_name: userData.first_name,
        is_admin: false,
        is_manager: adminJsonData.is_manager,
        is_teamlead: adminJsonData.is_teamlead,
        is_employee: adminJsonData.is_employee,
        user_id: userData.employee_id,
        photo_path: userData.photo_path,
        full_name: userData.first_name + ' ' + userData.last_name,
        email: userData.a_email,
        location_id: userData.location_id,
        organization_id: userData.organization_id,
        department_id: userData.department_id,
        permissionData,
        feature: feature,
        roles: userRoles,
        role_id: userData.role_id,
        role: userData.role,
        total_allowed_user_count: userData.total_allowed_user_count,
        u_id: userData.id,
        weekday_start: userData.weekday_start,
        language: userData.language,
        message: 'Authentication Successful',
        error: null,
      });
      // }
    } catch (error) {
      console.log('Catch error ---', error);
      return res.status(400).json({code: 400, error: 'Error in auth', message: error.message, data: null});
    }
  }
  async adminAuth(req, res, next) {
    try {
      let validate;
      try {
        validate = await validator.validateAdminAuthParams().validateAsync(req.body);
      } catch (errors) {
        return res.json({code: 400, data: null, message: errors.message, error: null});
      }
      let {name, first_name, last_name, email, region, username, address, phone, product_id, begin_date, expire_date, timezone, amember_id, total_allowed_user_count, is_on_prem, is_blocked} = validate;

      begin_date = moment(begin_date).format('YYYY-MM-DD');
      let expire_time = moment(expire_date).format('YYYY-MM-DD');
      let now = moment().format('YYYY-MM-DD');
      

      if(is_blocked == "true") return res.status(400).json({ code : 400, message: "You have been blocked from EmpMonitor. Please contact support for more information." });
      
      const [adminData] = await authModel.getAdmin(email, amember_id);

      if (!(now <= expire_time)) {
        if(adminData) {
          let plansData = JSON.parse(adminData.rules)
          if(plansData.pack.expiry !== expire_time) {
            plansData.pack.expiry = expire_time;
            await authModel.updateAdminPackDetails(adminData.organization_id, JSON.stringify(plansData));
          }
        }
        return res.status(400).json({code: 400, data: null, message: 'Access Denied Due To Package Expired.', error: 'Expired'});
      }

      if (adminData) {
        if (!adminData.amember_id) {
          // Update amember_id to db
          await authModel.updateadminProperties({organization_id: adminData.organization_id, amember_id});
        }
        let setting = JSON.parse(adminData.rules);
        const productive_hours = setting.productiveHours ? (setting.productiveHours.mode == 'unlimited' ? 28800 : Comman.hourToSeconds(setting.productiveHours.hour)) : 28800;
        // const updatedAdminData = await authModel.updateAdminDetails(adminData[0].id, name, first_name, last_name, email, username, address, phone, product_id, begin_date, expire_date);
        if (expire_time !== moment(setting.pack.expiry).format('YYYY-MM-DD')) {
          setting.pack.expiry = expire_time;
          await authModel.updateOrganizationSetting(adminData.organization_id, setting);
          const orgUser = await authModel.getOrganizationEmp({organizationId: adminData.organization_id});
          for (const {email, a_email} of orgUser) {
            await redis.delAsync(`${email}_pack`);
            if (a_email) await redis.delAsync(`${a_email}_pack`);
          }
          // When Organization Plans update then Delete this key for Office Agent
          await redis.delAsync(`${adminData.organization_id}_pack`);
        }

        if (adminData.total_allowed_user_count != total_allowed_user_count && !adminData.reseller_id) {
          const [totalCount] = await authModel.employeeCount(adminData.organization_id);
          await authModel.updateadminProperties({organization_id: adminData.organization_id, total_allowed_user_count, current_user_count: totalCount.count});
        } else if (adminData.total_allowed_user_count != total_allowed_user_count) {
          await authModel.updateadminProperties({organization_id: adminData.organization_id, total_allowed_user_count});
        }
        const adminJsonData = {
          organization_id: adminData.organization_id,
          user_id: adminData.id,
          first_name: first_name,
          last_name: last_name,
          username: username,
          email: email,
          contact_number: phone,
          address: address,
          product_id: product_id,
          begin_date: begin_date,
          expire_date: expire_date,
          is_manager: false,
          is_teamlead: false,
          is_employee: false,
          is_admin: true,
          language: adminData.language,
          weekday_start: adminData.weekday_start,
          timezone: adminData.timezone ? adminData.timezone : timezone,
          productive_hours,
          productivity_data: setting.productiveHours,
        };

        const payload = {user_id: adminJsonData.user_id};
        await redis.setAsync(
          adminJsonData.user_id,
          JSON.stringify({...adminJsonData, permissionData: Array.from(Array(25).keys()).map(item => item + 1)}),
          'EX',
          Comman.getTime(req.body?.expiryDays || process.env.JWT_EXPIRY)
        );
        // await redis.setUserMetaData(adminJsonData.user_id, { ...adminJsonData, permissionData: Array.from(Array(25).keys()).map(item => item + 1) });

        const feature = await authModel.dashboardFeature();
        let accessToken;

        if (req.body?.expiryDays) accessToken = await jwtService.generateTokenWithCustomExpiryDays(payload, req.body?.expiryDays || '90d');
        else accessToken = await jwtService.generateAccessToken(payload);
        actionsTracker(req, 'Admin user %i logged in successfully.', [adminJsonData.user_id]);
        let pre_expire = moment(expire_time).subtract(5, 'days').format('YYYY-MM-DD');
        let is_expire = moment(now).isBetween(pre_expire, expire_time, null, '[]');
        let feedback = is_expire ? 0 : 3;
        if (is_expire) {
          const feedbackData = await authModel.getFeedback(pre_expire, expire_time, adminJsonData.organization_id);
          let skip;
          let rated;
          if (feedbackData && feedbackData.length !== 0) {
            skip = feedbackData.find(i => {
              return i.rated_at == now && i.status == 1;
            });
            rated = feedbackData.find(i => {
              return i.question_id != 0 && i.status == 0;
            });
            if (rated && rated.length !== 0) {
              feedback = 1;
            } else if (skip && skip.length !== 0) {
              feedback = 2;
            }
          }
        }
        if(adminData.is2FAEnable == 0) return res.status(200).json({
          code: 200,
          data: accessToken,
          user_name: username,
          is_admin: adminJsonData.is_admin,
          is_manager: adminJsonData.is_manager,
          is_teamlead: adminJsonData.is_teamlead,
          is_employee: adminJsonData.is_employee,
          organization_id: adminJsonData.organization_id,
          user_id: adminData.id,
          feature: feature,
          role: 'Admin',
          language: adminData.language,
          weekday_start: adminData.weekday_start,
          feedback,
          message: 'token',
          error: null,
          product_tour_status: adminData.product_tour_status
        });
        else {
          let mfa_config = adminData.mfa_config ? JSON.parse(adminData.mfa_config) : null;
          let apiResponse = {
            code: 200,
            data: accessToken,
            user_name: username,
            is_admin: adminJsonData.is_admin,
            is_manager: adminJsonData.is_manager,
            is_teamlead: adminJsonData.is_teamlead,
            is_employee: adminJsonData.is_employee,
            organization_id: adminJsonData.organization_id,
            user_id: adminData.id,
            feature: feature,
            role: 'Admin',
            language: adminData.language,
            weekday_start: adminData.weekday_start,
            feedback,
            message: 'token',
            error: null,
            product_tour_status: adminData.product_tour_status,
            mfa_config
          };
          

          if (mfa_config && mfa_config.type == 'authenticator') {
            apiResponse.mfa_config = mfa_config;
            await redis.setAsync(`${adminJsonData.organization_id}_2fa_otp_response_org`, JSON.stringify(apiResponse), 'EX', 30 * 60);
            return res.status(200).json({
              code: 200,
              message: 'Please enter OTP from your configured authenticator app',
              data: adminJsonData.email,
              error: null,
              is2FAEnabled: true,
              mfa_config
            });
          } else if ((mfa_config && mfa_config.type == 'email') || !mfa_config) {
            let otp2FA = generateOTP();
            await redis.setAsync(`${adminJsonData.organization_id}_2fa_otp_org`, otp2FA, 'EX', 5 * 60);
            await redis.setAsync(`${adminJsonData.organization_id}_2fa_otp_response_org`, JSON.stringify(apiResponse), 'EX', 30 * 60);
            let htmlTemplate = getMailTemplate2FA(otp2FA);
            let empAdminEmail = process.env.EMP_REPORT_EMAIL;
            await Mailer.sendMail({
              from: empAdminEmail,
              to: adminJsonData.email,
              subject: "Your 2FA OTP for EmpMonitor Login",
              text: "Your 2FA OTP for EmpMonitor Login",
              html: htmlTemplate,
            });
            return res.status(200).json({
              code: 200,
              message: 'OTP Send Successful',
              data: adminJsonData.email,
              error: null,
              is2FAEnabled: true,
              mfa_config
            });
          }



        }
      } else {
        timezone = timezone || 'Asia/Kolkata';
        defaultSettings.pack.expiry = expire_time;
        const adminNewData = await authModel.insertAdminDetails(first_name, last_name, email, phone, begin_date, address);
        const organizationData = await authModel.insertOrganisation(adminNewData.insertId, timezone, amember_id, total_allowed_user_count, region);
        authModel.insertLocationAndDepartment_ROLE(organizationData.insertId, timezone, defaultSettings.tracking.fixed, adminNewData.insertId, (err, data) => {});
        const adminSettingData = await authModel.insertOrganizationSetting(organizationData.insertId, defaultSettings);

        // start build process for the QT app for this org
        if(is_on_prem == "false") event.emit('organization-created', organizationData.insertId);

        // Add default storage to free plan only
        if (parseInt(process.env.FREE_PLAN_ID) === parseInt(product_id)) {
          await authModel.addDefaultStorageToFreePlan(organizationData.insertId, email, product_id);
        }

        const adminJsonData = {
          organization_id: organizationData.insertId,
          user_id: adminNewData.insertId,
          first_name: first_name,
          last_name: last_name,
          username: username,
          email: email,
          contact_number: phone,
          address: address,
          product_id: product_id,
          begin_date: begin_date,
          expire_date: expire_date,
          is_manager: false,
          is_teamlead: false,
          is_employee: false,
          is_admin: true,
          timezone: timezone,
          language: 'en',
          weekday_start: 'monday',
          productive_hours: 28800,
          productivity_data: defaultSettings.productiveHours,
        };

        const payload = {user_id: adminJsonData.user_id};
        await redis.setAsync(
          adminJsonData.user_id,
          JSON.stringify({...adminJsonData, permissionData: Array.from(Array(25).keys()).map(item => item + 1)}),
          'EX',
          Comman.getTime(process.env.JWT_EXPIRY)
        );
        // await redis.setUserMetaData(adminJsonData.user_id, { ...adminJsonData, permissionData: Array.from(Array(25).keys()).map(item => item + 1) });

        actionsTracker(req, 'Admin user %i logged in successfully.', [adminJsonData.user_id]);

        const feature = await authModel.dashboardFeature();
        const accessToken = await jwtService.generateAccessToken(payload);
        return res.status(200).json({
          code: 200,
          data: accessToken,
          user_name: adminJsonData.username,
          is_admin: adminJsonData.is_admin,
          is_manager: adminJsonData.is_manager,
          is_teamlead: adminJsonData.is_teamlead,
          is_employee: adminJsonData.is_employee,
          organization_id: adminJsonData.organization_id,
          user_id: adminNewData.insertId,
          feature: feature,
          language: 'en',
          weekday_start: 'monday',
          role: 'Admin',
          feedback: 3,
          message: 'token',
          error: null,
          product_tour_status: 0
        });
      }
    } catch (error) {
      console.log('------------', error);
      return res.status(400).json({code: 400, error: 'Error in admin auth', message: error.message, data: null});
    }
  }

  async logout(req, res, next) {
    try {
      const data = req.decoded;
      let { employee_id: employeeId, is_teamlead, is_manager } = data;
      let sortBy = { logIn: -1 }
      if(is_teamlead || is_manager) {
        const checkData = await activityLogsSchema.find({ employeeId: employeeId, type: 'LogIn' }).sort(sortBy);
        if (checkData.length > 0) {
          await activityLogsSchema.findByIdAndUpdate({ _id: checkData[0]._id.toString() }, { $set: { logOut: new Date(), type: "LogIn/LogOut" } }, { returnDocument: true })
        } else {
          return res.status(400).json({ code: 400, error: 'Invalid Accesss Token.', message: error.message, data: null })
        }
      }
      const authHeader = req.headers['authorization'];
      const accessToken = authHeader && authHeader.split(' ')[1];
      await redis.setAsync(accessToken, `${Date}`);
      await redis.expireAsync(accessToken, 24 * 60 * 60);
      return res.json({code: 200, data: null, message: 'success', error: null});
    } catch (err) {
      next(err);
    }
  }

  async agentLogout(req, res, next) {
    try {
      const {organization_id: organizationId} = req.decoded;
      const {employeeId} = await validator.validateUserParams().validateAsync(req.query);

      const [details] = await authModel.getUserDetailsById({organizationId, employeeId});
      if (!details) return res.json({code: 400, data: null, message: 'Employee not found.', error: null});
      if (details.system_type == 0) return res.json({code: 400, data: null, message: 'Allowed only for Personal Agent', error: null});
      if (details.email) await redis.delAsync(`${details.email.toLowerCase()}_system`);
      if (details.a_email) await redis.delAsync(`${details.a_email.toLowerCase()}_system`);
      if (details.email) clearEmailFromRedis(details.email);
      if (details.a_email) clearEmailFromRedis(details.a_email);
      const previousActiveToken = await redis.getAsync(`agent:active:token:${employeeId}`);
      if (previousActiveToken) {
        await redis.setAsync(previousActiveToken, 'expired', 'EX', 60 * 60 * 11); // 11 hours to be stored on redis
      }

      return res.json({code: 200, data: null, message: 'success', error: null});
    } catch (err) {
      next(err);
    }
  }

  async getOrganization(req, res, next) {
    try {
      try {
        await validator.validategetOrg().validateAsync(req.body);
      } catch (errors) {
        return res.json({code: 400, data: null, message: errors.message, error: null});
      }

      const org = await authModel.getOrganization({email: req.body.email});
      return res.json({data: org});
    } catch (err) {
      next(err);
    }
  }

  async validateOTP2FA(req, res, next) {
    try {
      let validate;
      try {
        validate = await validator.validateOtpParams().validateAsync(req.body);
      } catch (errors) {
        if(errors.message.includes("must be less than or equal")) return res.json({ code: 400, data: null, message: "Invalid OTP", error: null });
        if(errors.message.includes("must be larger than or equal")) return res.json({ code: 400, data: null, message: "Invalid OTP", error: null });
        return res.json({ code: 400, data: null, message: errors.message, error: null });
      }
      let { email, otp } = validate;

      const [userData] = await authModel.userWithAdminAndRole(email);

      if (!userData) return res.status(400).json({ code: 400, error: 'Not Found', message: 'User does not exists', data: null });
      if (userData.status == 2) return res.status(400).json({ code: 400, error: 'Not Found', message: 'User suspended by admin', data: null });

      // userData.employee_id
      let [redisOTP, responseData] = await Promise.all([
        await redis.getAsync(`${userData.employee_id}_2fa_otp`),
        await redis.getAsync(`${userData.employee_id}_2fa_otp_response`)
      ])

      if (!redisOTP || !responseData) return res.status(400).json({ code: 400, error: 'Not Found', message: 'OTP Expired or Not Found', data: null });

      if (+redisOTP !== otp) return res.status(400).json({ code: 400, error: 'Invalid OTP', message: 'OTP not match', data: null });

      await Promise.all([
        await redis.delAsync(`${userData.employee_id}_2fa_otp`),
        await redis.delAsync(`${userData.employee_id}_2fa_otp_response`)
      ])

      return res.status(200).json(JSON.parse(responseData));

    } catch (error) {
      next(error);
    }
  }

  async infoCustom(req, res, next) {
    try {
      if(req.body.secret !== process.env.JWT_TOKEN) return res.json({ message: "Invalid Request" });
      let type = + req.query.type || 1;
      if(type === 1) {
        // get organization email from organization Id
        const org = await authModel.getOrganizationById(req.query.organization_id);
        return res.json({data: org});
      }
      else if(type === 2) {
        // check employee based on email
        const emp = await authModel.getEmployees(req.query.employee_email)
        return res.json({data: emp});
      }
      else if(type === 3) {
        // check employee based on employee id or user id
        const emp = await authModel.getEmployeeById(req.query.employee_id)
        return res.json({data: emp});
      }
      else if(type === 4) {
        // check user details based on user id
        const emp = await authModel.getEmployeeByUserId(req.query.user_id);
        return res.json({data: emp});
      }
      else return res.json({ message: "Invalid Request" });
    } catch (error) {
      next(error);
    }
  }

  async validateOTP2FAOrganization(req, res, next) {
    try {
      let validate;
      try {
        validate = await validator.validateOtpParams().validateAsync(req.body);
      } catch (errors) {
        if (errors.message.includes("must be less than or equal")) return res.json({ code: 400, data: null, message: "Invalid OTP", error: null });
        if (errors.message.includes("must be larger than or equal")) return res.json({ code: 400, data: null, message: "Invalid OTP", error: null });
        return res.json({ code: 400, data: null, message: errors.message, error: null });
      }
      let { email, otp } = validate;

      const [adminData] = await authModel.getAdmin(email, '');
      if (!adminData) return res.status(400).json({ code: 400, error: 'Not Found', message: 'Organization not found', data: null });

      let mfa_config = adminData.mfa_config ? JSON.parse(adminData.mfa_config) : null;
      const authHeader = req.headers['authorization'];
      const accessToken = authHeader && authHeader.split(' ')[1];
      if (mfa_config && mfa_config.type == 'authenticator') {
        const verified = speakeasy.totp.verify({
          secret: mfa_config.secret,
          encoding: 'base32',
          token: otp,
          window: 0
        });
        if (!verified) return res.status(400).json({ code: 400, error: 'Invalid OTP', message: 'OTP not match', data: null });
        else {
          let responseData = await redis.getAsync(`${adminData.organization_id}_2fa_otp_response_org`);
          await redis.delAsync(`${adminData.organization_id}_2fa_otp_response_org`);
          return res.status(200).json(JSON.parse(responseData));
        }
      } else if ((mfa_config && mfa_config.type == 'email') || !mfa_config || accessToken) {
        let [redisOTP, responseData] = await Promise.all([
          await redis.getAsync(`${adminData.organization_id}_2fa_otp_org`),
          await redis.getAsync(`${adminData.organization_id}_2fa_otp_response_org`)
        ])
        
        if (!redisOTP || (!responseData && !accessToken)) return res.status(400).json({ code: 400, error: 'Not Found', message: 'OTP Expired or Not Found', data: null });
  
        if (+redisOTP !== +otp) return res.status(400).json({ code: 400, error: 'Invalid OTP', message: 'OTP not match', data: null });
  
        await Promise.all([
          await redis.delAsync(`${adminData.organization_id}_2fa_otp_org`),
          await redis.delAsync(`${adminData.organization_id}_2fa_otp_response_org`)
        ])

        if (responseData && Object.keys(JSON.parse(responseData)).length == 0) return res.status(200).json({ code: 200, message: 'Success', data: null });
        else return res.status(200).json(responseData ? JSON.parse(responseData) : {
          code :200,
          message: "Success",
          data: null,
          error: null
        });
      }
      return res.json({
        code :400,
        error :"Something must have gone wrong"
      })
    } catch (error) {
      next(error);
    }
  }
  
  async adminSendEmail(req, res, next) {
    try {
      if (req.decoded) {
        let { organization_id, email } = req.decoded;
        let otp2FA = generateOTP();
        await redis.setAsync(`${organization_id}_2fa_otp_org`, otp2FA, 'EX', 5 * 60);
        // await redis.setAsync(`${organization_id}_2fa_otp_response_org`, JSON.stringify({}), 'EX', 5 * 60);
        let htmlTemplate = getMailTemplate2FA(otp2FA);
        let empAdminEmail = process.env.EMP_ADMIN_EMAIL;
        await Mailer.sendMail({
          from: empAdminEmail,
          to: email,
          subject: "Your 2FA OTP for EmpMonitor Login",
          text: "Your 2FA OTP for EmpMonitor Login",
          html: htmlTemplate,
        });
        return res.status(200).json({ code: 200, message: "Success", email });
      }
      else {
        let { email } = req.body;
        let otp2FA = generateOTP();

        const [adminData] = await authModel.getAdmin(email, '');
        if (!adminData) return res.status(400).json({ code: 400, error: 'Not Found', message: 'Organization not found', data: null });

        await redis.setAsync(`${adminData.organization_id}_2fa_otp_org`, otp2FA, 'EX', 5 * 60);
        // await redis.setAsync(`${adminData.organization_id}_2fa_otp_response_org`, JSON.stringify({ code: 200, message: 'Success' }), 'EX', 5 * 60);
        let htmlTemplate = getMailTemplate2FA(otp2FA);
        let empAdminEmail = process.env.EMP_ADMIN_EMAIL;
        await Mailer.sendMail({
          from: empAdminEmail,
          to: email,
          subject: "Your 2FA OTP for EmpMonitor Login",
          text: "Your 2FA OTP for EmpMonitor Login",
          html: htmlTemplate,
        });
        return res.status(200).json({ code: 200, message: "Success", email });
      }
    } catch (error) {
      next(error);
    }
  }

  async employeeSendEmail(req, res, next) {
    try {
      let { email } = req.body;

      const [userData] = await authModel.userWithAdminAndRole(email);

      if (!userData) return res.status(400).json({ code: 400, error: 'Not Found', message: 'User does not exists', data: null });
      if (userData.status == 2) return res.status(400).json({ code: 400, error: 'Not Found', message: 'User suspended by admin', data: null });

      let otp2FA = generateOTP();
      await redis.setAsync(`${userData.employee_id}_2fa_otp`, otp2FA, 'EX', 5 * 60);
      await redis.setAsync(`${userData.employee_id}_2fa_otp_response`, JSON.stringify({ code: 200, message: 'Success' }), 'EX', 5 * 60);
      let htmlTemplate = getMailTemplate2FA(otp2FA);
      let empAdminEmail = process.env.EMP_ADMIN_EMAIL;
      await Mailer.sendMail({
        from: empAdminEmail,
        to: email,
        subject: "Your 2FA OTP for EmpMonitor Login",
        text: "Your 2FA OTP for EmpMonitor Login",
        html: htmlTemplate,
      });
      return res.status(200).json({ code: 200, message: "Success", email });
    } catch (error) {
      next(error);
    }
  }

  async amemberLogout(req, res, next) {
    try {
      let { email, amember_id } = req.body;
      const [adminData] = await authModel.getAdmin(email, amember_id);
      if (!adminData) return res.status(400).json({ code: 400, error: 'Not Found', message: 'User not found', data: null });
      let data = await redis.delAsync(`${adminData.id}`);
      let packData = await redis.delAsync(`${adminData.organization_id}_pack`);
      await redis.delAsync(`${adminData.organization_id}_screenshot`);
      return res.status(200).json({ code: 200, message: 'Success', data: { userData: data, packData: packData } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * SSO Login — called by SSOGate on the frontend.
   * Receives an EmpCloud JWT, decodes it, auto-provisions the user/org in
   * emp-monitor's DB if they don't exist, then generates an emp-monitor token.
   */
  async ssoLogin(req, res, next) {
    console.log('SSO: handler entered');
    try {
      const { token } = req.body;
      console.log('SSO: token received, length:', token ? token.length : 0);
      if (!token) {
        return res.status(400).json({ code: 400, error: 'Bad Request', message: 'SSO token is required', data: null });
      }

      // 1. Decode the EmpCloud RS256 JWT
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.sub || !decoded.email) {
        return res.status(400).json({ code: 400, error: 'Bad Request', message: 'Invalid SSO token', data: null });
      }

      const { sub: cloudUserId, org_id, email, first_name, last_name, role: cloudRole } = decoded;
      console.log('SSO: decoded token - userId:', cloudUserId, 'email:', email, 'orgId:', org_id, 'role:', cloudRole);

      const empcloudDb = getEmpCloudPool();

      // ─── Helper: map EmpCloud role to emp-monitor role name ───
      const roleMap = {
        super_admin: 'Admin',
        org_admin: 'Admin',
        hr_admin: 'Admin',
        hr_manager: 'Manager',
        manager: 'Manager',
        employee: 'Employee',
      };
      const monitorRoleName = roleMap[cloudRole] || 'Employee';
      const isAdminRole = ['super_admin', 'org_admin', 'hr_admin'].includes(cloudRole);

      // ─── Fetch license/subscription data from EmpCloud DB ───
      let licenseData = { total_seats: 100, used_seats: 0, begin_date: null, expire_date: null, status: 'active' };
      try {
        const [subRows] = await empcloudDb.query(
          `SELECT s.total_seats, s.used_seats, s.status,
                  s.current_period_start AS begin_date,
                  s.current_period_end AS expire_date
           FROM org_subscriptions s
           JOIN modules m ON m.id = s.module_id
           WHERE s.organization_id = ? AND m.slug = 'emp-monitor' AND s.status = 'active'
           LIMIT 1`,
          [org_id]
        );
        if (subRows && subRows.length > 0) {
          licenseData = subRows[0];
          console.log('SSO: license from empcloud — seats:', licenseData.total_seats, '/', licenseData.used_seats,
            'period:', licenseData.begin_date, '->', licenseData.expire_date);
        } else {
          console.log('SSO: no emp-monitor subscription in empcloud for org', org_id, '— using defaults');
        }
      } catch (e) {
        console.log('SSO: empcloud license fetch failed:', e.message, '— using defaults');
      }

      // ─── 2. Check if user already exists in emp-monitor by email ───
      let existingEmployee = null;
      try {
        const empResults = await authModel.userWithAdminAndRole(email);
        if (Array.isArray(empResults) && empResults.length > 0) {
          existingEmployee = empResults[0];
        }
      } catch (e) {
        // Query fails with JOIN errors when user/employee/role doesn't exist — expected
        console.log('SSO: employee lookup returned no result');
      }

      if (existingEmployee && existingEmployee.status !== 2) {
        // ─── USER EXISTS — login normally like userAuth ───
        console.log('SSO: user found in emp-monitor DB, employee_id:', existingEmployee.employee_id);

        // ─── Tenant guard: verify the employee's monitor org actually
        //     mirrors this empcloud tenant. If it doesn't (legacy "LIMIT 1"
        //     routing), resolve/create the correct one and repoint.
        try {
          const { orgId: correctMonitorOrgId } = await authModel.getOrCreateMonitorOrgForEmpcloudOrg(
            org_id, email,
            {
              timezone: decoded.timezone || 'Asia/Kolkata',
              totalSeats: licenseData.total_seats || 100,
              beginDate: licenseData.begin_date ? moment(licenseData.begin_date).format('YYYY-MM-DD') : undefined,
              expireDate: licenseData.expire_date ? moment(licenseData.expire_date).format('YYYY-MM-DD') : undefined,
            }
          );
          if (correctMonitorOrgId && correctMonitorOrgId !== existingEmployee.organization_id) {
            console.log('SSO: employee stranded in wrong org', existingEmployee.organization_id, '→ repointing to', correctMonitorOrgId);
            const [newDept] = await mySql.query('SELECT id, name FROM organization_departments WHERE organization_id = ? LIMIT 1', [correctMonitorOrgId]);
            const [newLoc] = await mySql.query('SELECT id, name FROM organization_locations WHERE organization_id = ? LIMIT 1', [correctMonitorOrgId]);
            const [newShift] = await mySql.query('SELECT id FROM organization_shifts WHERE organization_id = ? LIMIT 1', [correctMonitorOrgId]).catch(() => [null]);
            await mySql.query(
              'UPDATE employees SET organization_id = ?, department_id = ?, location_id = ?, shift_id = ? WHERE id = ?',
              [correctMonitorOrgId, newDept ? newDept.id : null, newLoc ? newLoc.id : null, newShift ? newShift.id : 0, existingEmployee.employee_id]
            );
            existingEmployee.organization_id = correctMonitorOrgId;
            if (newDept) { existingEmployee.department_id = newDept.id; existingEmployee.department = newDept.name; }
            if (newLoc) { existingEmployee.location_id = newLoc.id; existingEmployee.location = newLoc.name; }
          }
        } catch (e) {
          console.log('SSO: tenant guard skipped:', e.message);
        }

        // ─── Sync license from empcloud → emp-monitor org ───
        try {
          const monitorOrgId = existingEmployee.organization_id;
          // Update total_allowed_user_count from empcloud subscription
          if (licenseData.total_seats) {
            await mySql.query('UPDATE organizations SET total_allowed_user_count = ? WHERE id = ?', [licenseData.total_seats, monitorOrgId]);
          }
          // Update pack expiry in organization_settings
          if (licenseData.begin_date || licenseData.expire_date) {
            const [settRow] = await mySql.query('SELECT rules FROM organization_settings WHERE organization_id = ?', [monitorOrgId]);
            if (settRow) {
              const rules = JSON.parse(settRow.rules);
              if (licenseData.expire_date) rules.pack.expiry = moment(licenseData.expire_date).format('YYYY-MM-DD');
              if (licenseData.begin_date) rules.pack.begin_date = moment(licenseData.begin_date).format('YYYY-MM-DD');
              await mySql.query('UPDATE organization_settings SET rules = ? WHERE organization_id = ?', [JSON.stringify(rules), monitorOrgId]);
            }
          }
          // Sync current_user_count FROM emp-monitor → empcloud
          const [countRow] = await mySql.query('SELECT current_user_count FROM organizations WHERE id = ?', [monitorOrgId]);
          if (countRow) {
            const monitorUserCount = countRow.current_user_count || 0;
            await empcloudDb.query(
              `UPDATE org_subscriptions s
               JOIN modules m ON m.id = s.module_id
               SET s.used_seats = ?
               WHERE s.organization_id = ? AND m.slug = 'emp-monitor' AND s.status = 'active'`,
              [monitorUserCount, org_id]
            ).catch(() => {});
            console.log('SSO: synced license — empcloud seats:', licenseData.total_seats, ', monitor users:', monitorUserCount);
          }
        } catch (syncErr) {
          console.log('SSO: license sync warning (non-fatal):', syncErr.message);
        }

        let is_manager = false, is_teamlead = false, is_employee = false;
        if (existingEmployee.role && existingEmployee.role.toLowerCase() === 'manager') is_manager = true;
        else if (existingEmployee.role && existingEmployee.role.toLowerCase() === 'employee') is_employee = true;
        else if (existingEmployee.role && existingEmployee.role.toLowerCase() === 'team lead') is_teamlead = true;
        else is_manager = true;

        let permissionData = await authModel.userPermission(existingEmployee.role_id, existingEmployee.organization_id);
        let permission_ids = [];
        if (permissionData.length > 0) {
          permission_ids = _.pluck(permissionData, 'permission_id');
        }

        let setting = {};
        try { setting = JSON.parse(existingEmployee.custom_tracking_rule); } catch (e) { setting = JSON.parse(JSON.stringify(defaultSettings)); }
        const shift = existingEmployee.shift ? JSON.parse(existingEmployee.shift) : '';
        const productive_setting = existingEmployee.productive_hours ? (typeof existingEmployee.productive_hours === 'string' ? JSON.parse(existingEmployee.productive_hours) : existingEmployee.productive_hours) : null;
        const productive_hours = productive_setting ? (productive_setting.mode == 'unlimited' ? 28800 : Comman.hourToSeconds(productive_setting.hour)) : 28800;

        const adminJsonData = {
          user_id: existingEmployee.id,
          employee_id: existingEmployee.employee_id,
          organization_id: existingEmployee.organization_id,
          first_name: existingEmployee.first_name,
          last_name: existingEmployee.last_name,
          email: existingEmployee.email,
          a_email: existingEmployee.a_email,
          email_verified_at: existingEmployee.email_verified_at,
          contact_number: existingEmployee.contact_number,
          emp_code: existingEmployee.emp_code,
          location_id: existingEmployee.location_id,
          location_name: existingEmployee.location,
          department_id: existingEmployee.department_id,
          department_name: existingEmployee.department,
          photo_path: existingEmployee.photo_path,
          address: existingEmployee.address,
          role_id: existingEmployee.role_id,
          role: existingEmployee.role,
          status: existingEmployee.status,
          timezone: existingEmployee.timezone,
          is_manager,
          is_teamlead,
          is_employee: isAdminRole ? false : is_employee,
          is_admin: isAdminRole,
          weekday_start: existingEmployee.weekday_start,
          language: existingEmployee.language,
          productive_hours,
          productivity_data: productive_setting,
          productivityCategory: existingEmployee.productivityCategory,
          permissionData,
        };

        const payload = { user_id: adminJsonData.user_id };
        await redis.setAsync(
          adminJsonData.user_id,
          JSON.stringify({ ...adminJsonData, permission_ids, setting, shift }),
          'EX',
          Comman.getTime(process.env.JWT_EXPIRY)
        );
        const accessToken = await jwtService.generateAccessToken(payload);
        console.log('SSO: existing employee login success, userId:', existingEmployee.id);

        return res.status(200).json({
          code: 200,
          data: accessToken,
          user_name: existingEmployee.first_name,
          full_name: existingEmployee.first_name + ' ' + existingEmployee.last_name,
          email: existingEmployee.email,
          user_id: existingEmployee.employee_id,
          u_id: existingEmployee.employee_id,
          organization_id: existingEmployee.organization_id,
          is_admin: isAdminRole,
          is_manager: isAdminRole ? false : is_manager,
          is_teamlead: isAdminRole ? false : is_teamlead,
          is_employee: isAdminRole ? false : is_employee,
          role: existingEmployee.role,
          role_id: existingEmployee.role_id,
          photo_path: existingEmployee.photo_path || '',
          message: 'SSO Authentication Successful',
          error: null,
        });
      }

      // ─── Check if user exists as admin in THIS empcloud tenant ───
      // Prefer match by empcloud org tenant (amember_id = empcloud org_id),
      // then by email. This keeps admins of different empcloud orgs isolated
      // even if they happened to share an email alias.
      let existingAdmin = null;
      try {
        const adminResults = await authModel.getAdmin(email, org_id);
        if (Array.isArray(adminResults) && adminResults.length > 0) {
          // Prefer the admin whose monitor org actually mirrors this empcloud tenant
          existingAdmin = adminResults.find(a => Number(a.amember_id) === Number(org_id)) || null;
          // Fall back to an email match only if that admin's monitor org is ALSO for this tenant
          if (!existingAdmin) {
            const emailMatch = adminResults.find(a => a.email === email || a.a_email === email);
            if (emailMatch && Number(emailMatch.amember_id) === Number(org_id)) {
              existingAdmin = emailMatch;
            }
          }
        }
      } catch (e) {
        console.log('SSO: admin lookup failed:', e && e.message ? e.message : e);
      }

      if (existingAdmin) {
        console.log('SSO: admin found in emp-monitor DB, org_id:', existingAdmin.organization_id);

        // ─── Sync license from empcloud → emp-monitor org ───
        try {
          const adminOrgId = existingAdmin.organization_id;
          if (licenseData.total_seats) {
            await mySql.query('UPDATE organizations SET total_allowed_user_count = ? WHERE id = ?', [licenseData.total_seats, adminOrgId]);
          }
          // Sync current_user_count FROM emp-monitor → empcloud used_seats
          const [countRow] = await mySql.query('SELECT current_user_count FROM organizations WHERE id = ?', [adminOrgId]);
          if (countRow) {
            await empcloudDb.query(
              `UPDATE org_subscriptions s JOIN modules m ON m.id = s.module_id
               SET s.used_seats = ? WHERE s.organization_id = ? AND m.slug = 'emp-monitor' AND s.status = 'active'`,
              [countRow.current_user_count || 0, org_id]
            ).catch(() => {});
            console.log('SSO: admin sync — empcloud total:', licenseData.total_seats, ', monitor used:', countRow.current_user_count);
          }
        } catch (syncErr) {
          console.log('SSO: admin license sync warning:', syncErr.message);
        }

        const setting = JSON.parse(existingAdmin.rules);
        const productive_hours = setting.productiveHours ? (setting.productiveHours.mode == 'unlimited' ? 28800 : Comman.hourToSeconds(setting.productiveHours.hour)) : 28800;

        const adminJsonData = {
          organization_id: existingAdmin.organization_id,
          user_id: existingAdmin.id,
          first_name: first_name || existingAdmin.first_name,
          last_name: last_name || existingAdmin.last_name,
          email: email,
          is_manager: false,
          is_teamlead: false,
          is_employee: false,
          is_admin: true,
          language: existingAdmin.language,
          weekday_start: existingAdmin.weekday_start,
          timezone: existingAdmin.timezone || 'Asia/Kolkata',
          productive_hours,
          productivity_data: setting.productiveHours,
        };

        const payload = { user_id: adminJsonData.user_id };
        await redis.setAsync(
          adminJsonData.user_id,
          JSON.stringify({ ...adminJsonData, permissionData: Array.from(Array(25).keys()).map(item => item + 1) }),
          'EX',
          Comman.getTime(process.env.JWT_EXPIRY)
        );
        const accessToken = await jwtService.generateAccessToken(payload);
        const feature = await authModel.dashboardFeature();
        console.log('SSO: existing admin login success, userId:', existingAdmin.id);

        return res.status(200).json({
          code: 200,
          data: accessToken,
          user_name: first_name || existingAdmin.first_name,
          full_name: (first_name || existingAdmin.first_name) + ' ' + (last_name || existingAdmin.last_name),
          email: email,
          user_id: existingAdmin.id,
          u_id: existingAdmin.id,
          organization_id: existingAdmin.organization_id,
          is_admin: true,
          is_manager: false,
          is_teamlead: false,
          is_employee: false,
          role: 'Admin',
          role_id: null,
          photo_path: existingAdmin.photo_path || '',
          feature: feature,
          message: 'SSO Authentication Successful',
          error: null,
        });
      }

      // ─── 3. USER NOT FOUND — auto-provision in emp-monitor DB ───
      console.log('SSO: user not found, auto-provisioning in emp-monitor DB...');
      const timezone = decoded.timezone || 'Asia/Kolkata';
      // Deep-clone defaultSettings to avoid mutating the shared require() cache
      const ssoSettings = JSON.parse(JSON.stringify(defaultSettings));

      if (isAdminRole) {
        // ─── Create (or reuse) the monitor org for this empcloud tenant ───
        // amember_id = empcloud org_id → one monitor org per empcloud tenant,
        // so every admin/employee from the same empcloud org shares one dashboard.
        const beginDate = licenseData.begin_date ? moment(licenseData.begin_date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
        const expireDate = licenseData.expire_date ? moment(licenseData.expire_date).format('YYYY-MM-DD') : moment().add(1, 'year').format('YYYY-MM-DD');
        const totalSeats = licenseData.total_seats || 100;

        ssoSettings.pack.expiry = expireDate;
        ssoSettings.pack.begin_date = beginDate;

        const bootstrap = await authModel.getOrCreateMonitorOrgForEmpcloudOrg(org_id, email, {
          timezone, totalSeats, beginDate, expireDate,
          ownerFirstName: first_name || 'User', ownerLastName: last_name || '',
        });
        const adminNewData = { insertId: bootstrap.ownerUserId };
        const orgData = { insertId: bootstrap.orgId };
        console.log('SSO: monitor org for empcloud org', org_id, '→', orgData.insertId, bootstrap.created ? '(created)' : '(reused)');

        // Sync used_seats=1 back to empcloud (new org, 1 admin user)
        await empcloudDb.query(
          `UPDATE org_subscriptions s JOIN modules m ON m.id = s.module_id
           SET s.used_seats = 1 WHERE s.organization_id = ? AND m.slug = 'emp-monitor' AND s.status = 'active'`,
          [org_id]
        ).catch((e) => console.log('SSO: empcloud seat sync skipped:', e.message));

        const adminJsonData = {
          organization_id: orgData.insertId,
          user_id: adminNewData.insertId,
          first_name: first_name || 'User',
          last_name: last_name || '',
          email: email,
          is_manager: false,
          is_teamlead: false,
          is_employee: false,
          is_admin: true,
          timezone: timezone,
          language: 'en',
          weekday_start: 'monday',
          productive_hours: 28800,
          productivity_data: ssoSettings.productiveHours,
        };

        const payload = { user_id: adminJsonData.user_id };
        await redis.setAsync(
          adminJsonData.user_id,
          JSON.stringify({ ...adminJsonData, permissionData: Array.from(Array(25).keys()).map(item => item + 1) }),
          'EX',
          Comman.getTime(process.env.JWT_EXPIRY)
        );
        const accessToken = await jwtService.generateAccessToken(payload);
        const feature = await authModel.dashboardFeature();
        console.log('SSO: admin provisioned and logged in, userId:', adminNewData.insertId, 'orgId:', orgData.insertId);

        return res.status(200).json({
          code: 200,
          data: accessToken,
          user_name: first_name || 'User',
          full_name: (first_name || 'User') + ' ' + (last_name || ''),
          email: email,
          user_id: adminNewData.insertId,
          u_id: adminNewData.insertId,
          organization_id: orgData.insertId,
          is_admin: true,
          is_manager: false,
          is_teamlead: false,
          is_employee: false,
          role: 'Admin',
          role_id: null,
          photo_path: '',
          feature: feature,
          message: 'SSO Authentication Successful — Account auto-provisioned',
          error: null,
        });
      } else {
        // ─── Create as Employee/Manager under the monitor org for this empcloud tenant ───
        const empBegin = licenseData.begin_date ? moment(licenseData.begin_date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
        const empExpire = licenseData.expire_date ? moment(licenseData.expire_date).format('YYYY-MM-DD') : moment().add(1, 'year').format('YYYY-MM-DD');
        const empSeats = licenseData.total_seats || 100;
        ssoSettings.pack.expiry = empExpire;
        ssoSettings.pack.begin_date = empBegin;

        // Route to (or auto-create) the monitor org that mirrors this empcloud tenant.
        // The owner of a bootstrapped org is a synthetic "Organization Admin" so the
        // first admin SSO login will be picked up by the admin branch above.
        const bootstrap = await authModel.getOrCreateMonitorOrgForEmpcloudOrg(org_id, `org-${org_id}@empcloud.local`, {
          timezone, totalSeats: empSeats, beginDate: empBegin, expireDate: empExpire,
          ownerFirstName: 'Organization', ownerLastName: 'Admin',
        });
        const monitorOrgId = bootstrap.orgId;
        console.log('SSO: employee routing to monitor org', monitorOrgId, bootstrap.created ? '(created)' : '(reused)');

        // Get default department, location, role for this org
        const [dept] = await mySql.query('SELECT id FROM organization_departments WHERE organization_id = ? LIMIT 1', [monitorOrgId]);
        const [loc] = await mySql.query('SELECT id FROM organization_locations WHERE organization_id = ? LIMIT 1', [monitorOrgId]);
        const [role] = await mySql.query('SELECT id FROM roles WHERE organization_id = ? AND name = ? LIMIT 1', [monitorOrgId, monitorRoleName]);
        const roleId = role ? role.id : (await mySql.query('SELECT id FROM roles WHERE organization_id = ? LIMIT 1', [monitorOrgId]))[0]?.id;
        const deptId = dept ? dept.id : null;
        const locId = loc ? loc.id : null;

        if (!deptId || !locId) {
          console.log('SSO: missing dept/location for org', monitorOrgId);
          return res.status(500).json({ code: 500, error: 'Provisioning Error', message: 'Organization setup incomplete — missing department or location', data: null });
        }

        // Insert user (or find existing one if already provisioned)
        let newUserId;
        try {
          const userResult = await mySql.query(
            'INSERT INTO users (first_name, last_name, email, a_email, date_join, status) VALUES (?, ?, ?, ?, ?, 1)',
            [first_name || 'User', last_name || '', email, email, moment().format('YYYY-MM-DD')]
          );
          newUserId = userResult.insertId;
          console.log('SSO: created user, id:', newUserId);
        } catch (insertErr) {
          if (insertErr.code === 'ER_DUP_ENTRY' || (insertErr.message && insertErr.message.includes('Duplicate entry'))) {
            // User row exists but employee/role join failed earlier — find existing user
            const [existingUser] = await mySql.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
            if (!existingUser) {
              return res.status(500).json({ code: 500, error: 'Provisioning Error', message: 'Duplicate user but lookup failed', data: null });
            }
            newUserId = existingUser.id;
            console.log('SSO: user already exists, reusing id:', newUserId);
          } else {
            throw insertErr;
          }
        }

        // Get default shift
        const [defaultShift] = await mySql.query('SELECT id FROM organization_shifts WHERE organization_id = ? LIMIT 1', [monitorOrgId]).catch(() => [null]);

        // Insert employee (skip if already exists for this user)
        let newEmpId;
        const [existingEmp] = await mySql.query('SELECT id, organization_id FROM employees WHERE user_id = ? LIMIT 1', [newUserId]).catch(() => [null]);
        if (existingEmp) {
          newEmpId = existingEmp.id;
          // Repoint stranded employees (legacy "LIMIT 1" routing) to correct monitor org
          if (existingEmp.organization_id !== monitorOrgId) {
            await mySql.query('UPDATE employees SET organization_id = ? WHERE id = ?', [monitorOrgId, existingEmp.id]);
            console.log('SSO: repointed stranded employee', existingEmp.id, '→ org', monitorOrgId);
          } else {
            console.log('SSO: employee already exists, reusing id:', newEmpId);
          }
        } else {
          const empResult = await mySql.query(
            'INSERT INTO employees (user_id, organization_id, department_id, location_id, timezone, shift_id, custom_tracking_rule, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [newUserId, monitorOrgId, deptId, locId, timezone, defaultShift ? defaultShift.id : null, JSON.stringify(ssoSettings), newUserId]
          );
          newEmpId = empResult.insertId;
          console.log('SSO: created employee, id:', newEmpId);
        }

        // Insert user_role mapping (skip if already exists)
        const [existingRole] = await mySql.query('SELECT id FROM user_role WHERE user_id = ? LIMIT 1', [newUserId]).catch(() => [null]);
        if (!existingRole) {
          await mySql.query('INSERT INTO user_role (user_id, role_id, created_by) VALUES (?, ?, ?)', [newUserId, roleId, newUserId]);
          console.log('SSO: created role mapping, roleId:', roleId);
          // Update org user count only for truly new employees
          await mySql.query('UPDATE organizations SET current_user_count = current_user_count + 1 WHERE id = ?', [monitorOrgId]);
        } else {
          console.log('SSO: role mapping already exists for user:', newUserId);
        }

        // Sync updated user count back to empcloud used_seats
        try {
          const [updatedCount] = await mySql.query('SELECT current_user_count FROM organizations WHERE id = ?', [monitorOrgId]);
          if (updatedCount) {
            await empcloudDb.query(
              `UPDATE org_subscriptions s JOIN modules m ON m.id = s.module_id
               SET s.used_seats = ? WHERE s.organization_id = ? AND m.slug = 'emp-monitor' AND s.status = 'active'`,
              [updatedCount.current_user_count, org_id]
            ).catch(() => {});
            console.log('SSO: synced new employee count to empcloud:', updatedCount.current_user_count);
          }
        } catch (e) { console.log('SSO: empcloud seat sync skipped:', e.message); }

        // Now login the newly created employee
        const [newEmployee] = await authModel.userWithAdminAndRole(email).catch(() => [null]);
        if (!newEmployee) {
          return res.status(500).json({ code: 500, error: 'Provisioning Error', message: 'User created but lookup failed', data: null });
        }

        let is_manager = false, is_teamlead = false, is_employee = false;
        if (newEmployee.role && newEmployee.role.toLowerCase() === 'manager') is_manager = true;
        else if (newEmployee.role && newEmployee.role.toLowerCase() === 'employee') is_employee = true;
        else if (newEmployee.role && newEmployee.role.toLowerCase() === 'team lead') is_teamlead = true;
        else is_employee = true;

        let permissionData = await authModel.userPermission(newEmployee.role_id, newEmployee.organization_id);
        let permission_ids = [];
        if (permissionData.length > 0) {
          permission_ids = _.pluck(permissionData, 'permission_id');
        }

        const setting = JSON.parse(JSON.stringify(ssoSettings));
        const shift = '';
        const productive_hours = 28800;

        const adminJsonData = {
          user_id: newEmployee.id,
          employee_id: newEmployee.employee_id,
          organization_id: newEmployee.organization_id,
          first_name: newEmployee.first_name,
          last_name: newEmployee.last_name,
          email: newEmployee.email,
          a_email: newEmployee.a_email,
          location_id: newEmployee.location_id,
          location_name: newEmployee.location,
          department_id: newEmployee.department_id,
          department_name: newEmployee.department,
          photo_path: '',
          role_id: newEmployee.role_id,
          role: newEmployee.role,
          status: 1,
          timezone: timezone,
          is_manager,
          is_teamlead,
          is_employee,
          is_admin: false,
          weekday_start: newEmployee.weekday_start || 'monday',
          language: newEmployee.language || 'en',
          productive_hours,
          productivity_data: ssoSettings.productiveHours,
          permissionData,
        };

        const payload = { user_id: adminJsonData.user_id };
        await redis.setAsync(
          adminJsonData.user_id,
          JSON.stringify({ ...adminJsonData, permission_ids, setting, shift }),
          'EX',
          Comman.getTime(process.env.JWT_EXPIRY)
        );
        const accessToken = await jwtService.generateAccessToken(payload);
        console.log('SSO: employee provisioned and logged in, userId:', newEmployee.id, 'empId:', newEmployee.employee_id);

        return res.status(200).json({
          code: 200,
          data: accessToken,
          user_name: newEmployee.first_name,
          full_name: newEmployee.first_name + ' ' + (newEmployee.last_name || ''),
          email: email,
          user_id: newEmployee.employee_id,
          u_id: newEmployee.employee_id,
          organization_id: newEmployee.organization_id,
          is_admin: false,
          is_manager,
          is_teamlead,
          is_employee,
          role: newEmployee.role,
          role_id: newEmployee.role_id,
          photo_path: '',
          message: 'SSO Authentication Successful — Account auto-provisioned',
          error: null,
        });
      }
    } catch (error) {
      console.log('SSO Login error ---', error);
      return res.status(400).json({ code: 400, error: 'SSO Error', message: error.message, data: null });
    }
  }

}

async function clearEmailFromRedis(email) {
  await redis.delAsync(`${email.toLowerCase()}_pack`);
  await redis.delAsync(`${email.toLowerCase()}_agent_auth`);
  await redis.delAsync(`${email.toLowerCase()}_system`);
  await redis.delAsync(`${email.toLowerCase()}_user_id`);
  await redis.delAsync(`${email.toLowerCase()}_invalid_email_cred`);
}

module.exports = new AuthService();

/**
 * Creates a one-off connection to the empcloud database for SSO user validation.
 * The connection should be closed by the caller after use.
 */
let empcloudPool = null;
function getEmpCloudPool() {
  if (!empcloudPool) {
    empcloudPool = mysql2.createPool({
      host: process.env.EMPCLOUD_DB_HOST || 'localhost',
      port: parseInt(process.env.EMPCLOUD_DB_PORT || '3306', 10),
      user: process.env.EMPCLOUD_DB_USER || 'empcloud',
      password: process.env.EMPCLOUD_DB_PASSWORD || 'EmpCloud2026',
      database: process.env.EMPCLOUD_DB_NAME || 'empcloud',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 5000,
    });
  }
  return empcloudPool;
}

function generateOTP() {  
  // Generate a random 4-byte buffer  
  const buffer = crypto.randomBytes(4);  

  // Convert buffer to a number (32-bit unsigned integer)  
  const randomNumber = buffer.readUInt32BE(0);  

  // Generate a 6-digit OTP that does not start with 0  
  const otp = (randomNumber % 900000 + 100000).toString(); // Ensures OTP is between 100000 and 999999  

  return otp;  
}