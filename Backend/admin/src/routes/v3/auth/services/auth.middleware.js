const jwtService = require('./jwt.service');
const errorHandler = require('../../../../utils/helpers/ErrorResponse');
let redis = require('./redis.service');
const APIManagementMiddleware = require('../../apiManagement/apiManagement.middleware');

class AuthMiddlewareService {
    async authenticate(req, res, next) {
        if (['/user/wm-register', '/user/get-emp-users', '/user/wm-user'].includes(req.path) && req.body.secretKey === process.env.WORK_MANAGEMENT_SECRET_KEY) {
            next();
        } else  if (['/user/fieldAllEmployeeList','/hrms/attendance-field-request','/hrms/delete-field-leaves','/hrms/update-field-leaves','/hrms/field-leave-type','/hrms/create-field-leaves','/hrms/fetch-holidays', '/hrms/fetch-leaves', '/hrms/getAttendanceField','/hrms/markAttendanceField','/hrms/fetch-attendance-field', '/hrms/attendance-fieldtracking'].includes(req.path) && req.body.secretKey === process.env.FIELD_TRACKING_SECRET_KEY) {
            next();
        }        
        else if (req.path == "/external/add-on-prem-domain" || req.path == "/organization-build/build-on-premise") {
            return next();
        }
        else if(['/user/fetch-all-employees', '/timesheet/employee-timesheet-details', '/dashboard/employees-stats', '/report/employee-activity', '/employee/browser-usage', '/employee/applications-usage'].includes(req.path) && !req.headers['authorization']) {
            return APIManagementMiddleware(req, res, next);
        }
        else {
            const authHeader = req.headers['authorization'];
            const accessToken = authHeader && authHeader.split(' ')[1];
            if (!accessToken) {
                return next(new errorHandler('Un-Authorized Access(Missing accessToken)', 401));
            }
            try {
                const invalidToken = await redis.getAsync(accessToken);
                if (invalidToken) {
                    next(new errorHandler('Invalid token', 401));
                }
                let userData = JSON.parse(await jwtService.verify(accessToken));
                if (userData && userData.user_id) {
                    let userMetaData = await redis.getUserMetaData(userData.user_id);
                    if (userMetaData.code = 200 && userMetaData.data) {
                        req.decoded = userMetaData.data;
                        if (req.decoded.is_admin) req.decoded.employee_id = null;
                        next();
                    } else {
                        next(new errorHandler('Invalid token', 401));
                    }
                } else {
                    next(new errorHandler('Invalid token or expired token', 401));
                }
            } catch (err) {
                next(err);
            }
        }
    }
    async adminOnly(req, res, next) {
        if (!req.decoded) await this.authenticate(req, res, next);
        if (req.decoded.is_admin) {
            next();
        } else {
            next(new errorHandler('Forbidden', 403));
        }
    }
}

module.exports = new AuthMiddlewareService();
