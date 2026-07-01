const JwtAuth = require('../utils/jwt/Auth');
const JoiAuth = require('../routes/v2/auth/Auth.validator');
const ErrorResponse = require('../utils/helpers/ErrorResponse');
let redis = null;
if (process.env.REDIS_SERVER_INSTALLED === 'true') redis = require('../utils/redis/redis.utils');

class Auth {
    async authenticate(req, res, next) {
        const user_agent = req.headers['user-agent'];
        const authHeader = req.headers['authorization'];
        const accessToken = authHeader && authHeader.split(' ')[1];
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (!user_agent || !accessToken) {
            return next(new ErrorResponse('Un-Authorized Access(Missing user_agent or accessToken)', 401));
        }

        try {
            req.decoded = JSON.parse(await JwtAuth.verify(accessToken, user_agent));
            next();
        } catch (err) {
            next(err);
        }
    }


    async authenticateWithRedis(req, res, next) {
        const authHeader = req.headers['authorization'];
        const accessToken = authHeader && authHeader.split(' ')[1];

        if (!accessToken) {
            return next(new ErrorResponse('Un-Authorized Access(Missing accessToken)', 401));
        }

        try {
            let userData = await JwtAuth.verifyNew(accessToken);
            if (userData && userData.user_id) {
                let userMetaData = await redis.getUserMetaData(userData.user_id);
                if (userMetaData.code === 200) {
                    req.decoded = userMetaData.data;
                    next();
                } else {
                    next(new ErrorResponse('Invalid token', 401));
                }
            } else {
                next(new ErrorResponse('Invalid token or expired token', 401));
            }
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new Auth;