const jwtService = require('../../auth/services/jwt.service');
const errorHandler = require('../../../../utils/helpers/ErrorResponse');
let redis = require('../../auth/services/redis.service');

const moment = require('moment');
const EventEmitter = require('../events/event.handler');

class AuthMiddlewareService {
    async authenticate(req, res, next) {
        const authHeader = req.headers['authorization'];
        const accessToken = authHeader && authHeader.split(' ')[1];
        if (!accessToken) {
            return next(new errorHandler('Un-Authorized Access(Missing accessToken)', 401));
        }
        try {
            const invalidToken = await redis.getAsync(accessToken);
            if (invalidToken) {
                return next(new errorHandler('Invalid token', 401));
            }
            let userData = JSON.parse(await jwtService.verify(accessToken));
            if (userData && userData.user_id) {
                let userMetaData = await redis.getUserMetaData(userData.user_id);
                if (userMetaData.code === 200 && userMetaData.data) {
                    req.decoded = userMetaData.data;
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

    async authenticateMobile(req, res, next) {
        const authHeader = req.headers['authorization'];
        const accessToken = authHeader && authHeader.split(' ')[1];
        if (!accessToken) {
            return next(new errorHandler('Un-Authorized Access(Missing accessToken)', 401));
        }
        try {
            const invalidToken = await redis.getAsync(accessToken);
            if (invalidToken) {
                return next(new errorHandler('Invalid token', 401));
            }
            let userData = JSON.parse(await jwtService.verify(accessToken));
            if (userData && userData.user_id) {
                let userMetaData = await redis.getAsync(`${userData.user_id}_mobile_user`);
                if (userMetaData !== null && userMetaData) {
                    req.decoded = JSON.parse(userMetaData);
                    EventEmitter.emit('update-mobile-login', { employee_id: req.decoded.employee_id, last_login_time: moment().utc().format("YYYY-MM-DD HH:mm:ss"), user_agent: req.get('User-Agent') });
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

module.exports = new AuthMiddlewareService();
