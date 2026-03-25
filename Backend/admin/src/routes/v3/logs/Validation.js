const Joi = require('joi');

class Validation {
    static getUserActivityLogParams(params) {
        const schema = Joi.object().keys({
            skip: Joi.number().integer().default(0),
            limit: Joi.number().integer().default(100),
            user_id: Joi.number().integer().default(undefined),
        });
        return Joi.validate(params, schema);
    }
}

module.exports.Validation = Validation;