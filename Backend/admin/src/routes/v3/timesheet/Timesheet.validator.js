const Joi = require('@hapi/joi');
const Common = require('../../../utils/helpers/Common')

class TimeSheetValidator {
    getTimesheet() {
        // Accept '', null, undefined, or 'all' for scope IDs — coerce to 0 (= "all" on backend)
        const scopeId = Joi.number().integer().min(0).empty(Joi.valid('', null, 'all')).default(0);

        return Joi.object().keys({
            location_id: scopeId,
            department_id: scopeId,
            employee_id: scopeId,
            start_date: Joi.string().isoDate().required(),
            end_date: Joi.string().isoDate().required(),
            absent: Joi.number().integer().valid(0, 1).default(0),
            employee_avg: Joi.boolean().allow(true, false).default(false),
            avg: Joi.boolean().allow(true, false).default(false),
            shift_id: Joi.number().optional().default(-1)
        });
    }

    getTimesheetValidation() {
        // Accept '', null, undefined, or 'all' for scope IDs — coerce to 0 (= "all" on backend)
        const scopeId = Joi.number().integer().min(0).empty(Joi.valid('', null, 'all')).default(0);

        return Joi.object().keys({
            skip: Joi.number().default(0),
            limit: Joi.number().positive().default(10),
            location_id: scopeId,
            department_id: scopeId,
            employee_id: scopeId,
            start_date: Joi.string().isoDate().required(),
            end_date: Joi.string().isoDate().required(),
            sortOrder: Joi.string().allow(null).default(null),
            sortColumn: Joi.string().allow(null).default(null),
            name: Joi.string().default(null).allow(null),
            shift_id: Joi.number().optional().allow(null).default(null)
        });
    }

    getTimesheetValidationCustom() {
        return Joi.object().keys({
            start_date: Joi.string().isoDate().required(),
            end_date: Joi.string().isoDate().required(),
        });
    }

    getEmployeeTimesheetBreakUp() {
        return Joi.object().keys({
            attendance_id: Joi.number().required().positive().allow(0)
        });
    }

    getActiveTimeAttendanceValidation() {
        return Joi.object().keys({
            skip: Joi.number().default(0),
            limit: Joi.number().positive().default(10),
            location_id: Joi.number().required().positive().allow(0),
            department_id: Joi.number().required().positive().allow(0),
            employee_id: Joi.number().required().positive().allow(0),
            date: Joi.number().required().positive(),
        });
    }
}

module.exports = new TimeSheetValidator;