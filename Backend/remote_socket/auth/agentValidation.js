const redis = require('./redis');
const jwtService = require('./jwt.services')

const agentValidation = async (ws, wss, parseMessage) => {
    if(!parseMessage.token) return ws.close();
    try {
        const invalidToken = await redis.getAsync(parseMessage.token);
        if (invalidToken) {
            if (invalidToken === "deleted") return false;
            return false;
        }

        let userData = JSON.parse(await jwtService.verify(parseMessage.token));
        if (userData && userData.user_id) {
            let [userMetaData, requestCount] = await Promise.all([
                await redis.getUserMetaData(userData.user_id),
                await redis.getAsync(`${userData.user_id}_agent_request`)
            ]);
            if (userMetaData.code === 200 && userMetaData.data) {
                let decoded = userMetaData.data;
                return decoded;
            } else {
                return false;
            }
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
}


module.exports = agentValidation;