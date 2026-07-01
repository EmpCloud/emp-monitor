const Joi = require('joi');
const { ref } = require('joi/lib/types/func');
const { joiErrorMessage } = require(`${utilsFolder}/helpers/Common`);
Joi.objectId = require('joi-objectid')(Joi)

/**
 * Validation activity modification request input validation
 * 
 * @class Validator
 */
class Validator {
    /**
     * Input valiation for create activity request api
     * 
     * @function create
     * @memberof Validator
     * @param {object} data ,
     * @returns {object} values or error 
     */
    create(data) {
        const schema = Joi.object().keys({
            date: Joi.date().required(),
            start_time: Joi.date().iso().required(),
            end_time: Joi.date().iso().required().greater(Joi.ref('start_time'))
                .error(er => "End time should be greater than start time"),
            reason: Joi.string().max(225).required().regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return joiErrorMessage(errors)
            }),
            employee_id: Joi.number().optional().default(null),
            activity_ids: Joi.array().items(Joi.string()).required(),
            attendance_id: Joi.number().required(),
        });
        return Joi.validate(data, schema);
    }

    offline(data) {
        const schema = Joi.object().keys({
            date: Joi.date().required(),
            reason: Joi.string().max(225).required().regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return joiErrorMessage(errors)
            }),
            employee_id: Joi.number().optional().default(null),
            offlineTime: Joi.number().required().greater(0)
        });
        return Joi.validate(data, schema);
    }

    offlineRequest(data) {
        const schema = Joi.array().items(
            Joi.object().keys({
            date: Joi.date().required(),
            start_time: Joi.date().iso().required(),
            end_time: Joi.date().iso().required().greater(Joi.ref('start_time')),
            reason: Joi.string().max(225).required().regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return joiErrorMessage(errors)
            }),
            offline_time: Joi.number().required().greater(0)
        })).required();
        return Joi.validate(data, schema);
    }
    /**
     * Input valiation for get activity request with filter params
     * 
     * @function getWiithFilter
     * @memberof Validator
     * @param {object} params ,
     * @returns {object} values or error 
     */
    getWiithFilter(params) {
        const schema = Joi.object().keys({
            from_date: Joi.date().required(),
            to_date: Joi.date().required().min(Joi.ref('from_date')),
            start_time: Joi.date().iso(),
            end_time: Joi.date().iso(),
            limit: Joi.number().default(20),
            skip: Joi.number().default(0),
            order: Joi.string().valid("A", "D").default("D"),
            sortColumn: Joi.string().allow("", null).valid('employee', 'date', 'start_time', 'end_time', 'reason'),
            search: Joi.string().allow("", null),
            status: Joi.number().valid(0, 1, 2),
            employee_id: Joi.number().optional().allow("", null),
            type: Joi.number().optional().default(1).valid(1, 2, 3, 4).error(er => "Type should be 1, 2 or 3"),
        });
        return Joi.validate(params, schema);
    }
    getWithFilter(params) {
        const schema = Joi.object().keys({
            date: Joi.date().required(),
            employee_id: Joi.number().required()
        });
        return Joi.validate(params, schema);
    }

    /**
     * Input valiation for update activity request params
     * 
     * @function update
     * @memberof Validator
     * @param {object} params ,
     * @returns {object} values or error 
     */
    update(params) {
        const schema = Joi.object().keys({
            id: Joi.string().required(),
            date: Joi.date().allow("", null).optional().default(null),
            start_time: Joi.date().iso().allow("", null).optional().default(null),
            end_time: Joi.date().iso().allow("", null).optional().default(null),
            reason: Joi.string().max(225).allow("", null).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return joiErrorMessage(errors)
            }).optional().default(null),
            status: Joi.number().valid(0, 1, 2).allow("", null),
            employee_id: Joi.number().optional().default(null),
            activity_ids: Joi.array().items(Joi.string()).default([]),
        });
        return Joi.validate(params, schema);
    }

    processActivity(params) {
        const schema = Joi.object().keys({
            id: Joi.string().required()
        });
        return Joi.validate(params, schema);
    }

    /**
    * Input valiation for delete activity request params
    * 
    * @function delete
    * @memberof Validator
    * @param {object} params ,
    * @returns {object} values or error 
    */
    delete(params) {
        const schema = Joi.object().keys({
            id: Joi.objectId().required(),
        });
        return Joi.validate(params, schema);
    }

    activities_old(data) {
        const schema = Joi.object().keys({
            date: Joi.date().required(),
            start_time: Joi.date().iso().default(null),
            end_time: Joi.date().iso().default(null).greater(Joi.ref('start_time'))
                .error(er => "End time should be greater than start time"),
        });
        return Joi.validate(data, schema);
    }

    activities(data) {
        const schema = Joi.object().keys({
            date: Joi.date().required(),
            start_time: Joi.date().iso().default(null),
            end_time: Joi.date().iso().default(null).greater(Joi.ref('start_time'))
                .error(er => "End time should be greater than start time"),
            //type: Joi.string().default('').valid('offline', '').error(er => "Type should be offline or empty string"),
            type: Joi.number().optional().default(1).valid(1, 2).error(er => "Type should be 1 or 2"),

        });
        return Joi.validate(data, schema);
    }

    updateOfflineHours(params) {
        const schema = Joi.object().keys({
            id: Joi.string().required(),
            date: Joi.date().allow("", null).optional().default(null),
            reason: Joi.string().max(225).allow("", null).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return joiErrorMessage(errors)
            }).optional().default(null),
            status: Joi.number().valid(0, 1, 2).allow("", null),
            employee_id: Joi.number().required().default(null),
            offlineTime: Joi.number().required().greater(0),
            request_type: Joi.number().valid(0, 1, 2).optional().default(0)
        });
        return Joi.validate(params, schema);
    }

    autoAcceptTimeClaim(params){
        const schema = Joi.object().keys({
            is_enable: Joi.string().valid("true", "false").required()
        })
        return Joi.validate(params, schema)
    }

    updateBreakRequest(params){
        const schema = Joi.object().keys({
            id: Joi.string().required(),
            status: Joi.number().valid(0, 1, 2).allow("", null),
            request_type: Joi.number().valid(0, 1, 2).optional().default(0),
        })
        return Joi.validate(params, schema)
    }
    
    multipleTimeClaims(params) {
        const schema = Joi.object().keys({
            ids: Joi.array().items(Joi.string()).required(),
            type: Joi.number().valid(1, 2, 3).required(),
            employee_id: Joi.number().optional().default(null),
            reason: Joi.string(),
            status: Joi.number().valid(1, 2).allow("", null),
        })
        return Joi.validate(params, schema)
    }
    
    deleteBreakRequest(params) {
        const schema = Joi.object().keys({
            id: Joi.string().required(),
        });
        return Joi.validate(params, schema)
    }

    createReason(params) {
        const schema = Joi.object().keys({
            name: Joi.string().required(),
            type: Joi.number().valid(1, 2, 3, 4).required(),
        });
        return Joi.validate(params, schema)
    }

    getReason(params) {
        const schema = Joi.object().keys({
            type: Joi.number().valid(1, 2, 3, 4).required(),
        });
        return Joi.validate(params, schema)
    }

    deleteReason(params) {
        const schema = Joi.object().keys({
            id: Joi.string().required(),
        });
        return Joi.validate(params, schema)
    }

    createAttendanceRequest(params) {
        const schema = Joi.object().keys({
            date: Joi.date().required(),
            start_time: Joi.date().iso().required(),
            end_time: Joi.date().iso().required().greater(Joi.ref('start_time'))
                .error(er => "End time should be greater than start time"),
            reason: Joi.string().max(225).required().regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return joiErrorMessage(errors)
            }),
            task_id: Joi.string().optional().default(null),
        });
        return Joi.validate(params, schema)
    }

    createAttendanceRequestByManger(params) {
        const schema = Joi.object().keys({
            date: Joi.date().required(),
            start_time: Joi.date().iso().required(),
            end_time: Joi.date().iso().required().greater(Joi.ref('start_time'))
                .error(er => "End time should be greater than start time"),
            reason: Joi.string().max(225).required().regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return joiErrorMessage(errors)
            }),
            employee_id: Joi.number().required(),
        });
        return Joi.validate(params, schema)
    }

    updateRequest(params) {
        const schema = Joi.object().keys({
            id: Joi.string().required(),
            status: Joi.string().allow([0, 1, 2, "1", "2", "0"]).required(),
            type: Joi.string().allow([1, 2, 3, 4, "1", "2", "3", "4"]).optional(),
        });
        return Joi.validate(params, schema)
    }

    validateAttendanceRequestForEmployeesByAdminManager(data) {
        const schema = Joi.object().keys({
            start_time: Joi.date().iso().required(),
            end_time: Joi.date().iso().required().greater(Joi.ref('start_time')).error(() => "End time should be greater than start time"),
            from_date: Joi.date().iso().required().max(Joi.ref('to_date')).error(() => "From date should be less than or equal to to date"),
            to_date: Joi.date().iso().required(),
            reason: Joi.string().max(225).required().regex(/[$\(\)<>]/, { invert: true }).error(errors => joiErrorMessage(errors)),
            employee_ids: Joi.array().items(Joi.number()).optional().default([]).single(),
            task_id: Joi.string().optional().default(null),
        });
        
        return Joi.validate(data, schema);        
    }
    
}
module.exports = new Validator;