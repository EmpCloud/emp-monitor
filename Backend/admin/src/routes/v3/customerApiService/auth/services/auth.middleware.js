const jwtService = require('./jwt.service');
const errorHandler = require('../../../../utils/helpers/ErrorResponse');
let redis = require('./redis.service');

class AuthMiddlewareService {
    async authenticate(req, res, next) {
        const authHeader = req.headers['authorization'];
        const accessToken = authHeader && authHeader.split(' ')[1];
        if (!accessToken) {
            return next(new errorHandler('Un-Authorized Access(Missing accessToken)', 401));
        }
        try {
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
