const jwtServices = require("./jwt.services");
const redis = require("./redis");

const adminValidation = async (ws, wss, parseMessage) => {
    try {
        if(!parseMessage.token) return false;
        const invalidToken = await redis.getAsync(parseMessage.token);
        if (invalidToken) return false;
        let userData = JSON.parse(await jwtServices.verify(parseMessage.token));
        if (userData && userData.user_id) {
            let userMetaData = await redis.getUserMetaData(userData.user_id);
            if (userMetaData.code === 200 && userMetaData.data) {
                return userMetaData.data;
            } else return false
        } else return false
    } catch (err){ 
        return false;
    }
}


module.exports = adminValidation;