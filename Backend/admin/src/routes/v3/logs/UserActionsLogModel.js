const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserActionsLogSchema = new Schema(
    {
        user_id: {type: Number, index: true},
        action: {type: String},
        method: {type: String},
        path: {type: String},
        ip: {type: String},
    },
    {timestamps: true}
);

const UserActionsLogModel = mongoose.model('user_actions_log', UserActionsLogSchema);
UserActionsLogModel.fetchLog = async (params) => {
    const query = {};
    if (params.user_id) query.user_id = params.user_id;
    const options = {skip: params.skip || 0};
    const result = await UserActionsLogModel.find(query, null, options).limit(params.limit || 100);
    return result.map((entity) => {
        const {user_id, action, method, path, ip} = entity;
        return {user_id, action, method, path, ip};
    });
};
UserActionsLogModel.insert = async (params) => {
    return UserActionsLogModel.create(params);
};

module.exports.UserActionsLogModel = UserActionsLogModel;