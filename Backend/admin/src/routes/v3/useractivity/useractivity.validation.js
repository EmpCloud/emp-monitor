const Joi = require('joi');
const JoiHapi = require('@hapi/joi');
const timezones = require('../../../utils/helpers/Timezone').timezones;
const Common = require('../../../utils/helpers/Common');
const { commonMessages } = require('../../../utils/helpers/LanguageTranslate');

class UserActivityValidation {
    customEmpSettingValidation(params) {
        const schema = Joi.object().keys({
            employee_id: Joi.number().required().positive(),
            track_data: Joi.object().required(),
        });
        return Joi.validate(params, schema);
    }


    empTrackingModeValidation(params) {
        const schema = Joi.object().keys({
            trackingMode: Joi.string().valid(['unlimited', 'fixed', 'networkBased', 'manual', 'projectBased']).error(() => 'trackingMode unlimited, fixed, networkBased, manual, projectBased are Allowed.'),
        });
        return Joi.validate(params, schema);
    }

    empIdValidation(params) {
        const schema = Joi.object().keys({
            employee_id: Joi.number().required().positive(),
            role_id: Joi.number().optional().default(0)
        });
        return Joi.validate(params, schema);
    }

    getNonAdminValidation(params) {
        const schema = Joi.object().keys({
            location_id: Joi.number().optional().positive(),
            department_id: Joi.number().optional().positive(),
            role_id: Joi.number().optional().positive()
        });
        return Joi.validate(params, schema);
    }

    validateUserRegister(params) {
        const schema = Joi.object().keys({
            first_name: Joi.string().max(64).required().regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            last_name: Joi.string().max(64).required().regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            email: Joi.string().required().max(128).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            password: Joi.string().max(512).required().regex(/^(?=.*\d)(?=.*[!-\/:-@\[-`{-~]).{8,}$/).error(() => 'The password must contain at least one special character and at least one number and a minimum of 8 characters.'),
            emp_code: Joi.string().required().max(50).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            project_name: Joi.string().optional().allow(null, ""),
            location_id: Joi.number().integer().required(),
            department_id: Joi.number().integer().required(),
            role_ids: Joi.array().items(Joi.number()).min(1).required(),
            address: Joi.string().allow(null).allow("").max(512).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            status: Joi.number().integer(),
            contact_number: Joi.string().max(15).allow(null).allow("").regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            date_join: Joi.date().allow(null),
            timezone: Joi.string().required().max(40).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            encriptedpassword: Joi.string().optional(),
            is_mobile: Joi.number().min(0).max(1)
        });
        return Joi.validate(params, schema);
    }

    usersValidataion(data) {
        const schema = {
            department_id: Joi.string().allow(null).allow(""),
            location_id: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null).allow(""),
            // location_id: Joi.string().allow(null).allow(""),
            role_id: Joi.number().allow(null).allow(""),
            project_name:Joi.string(),
            name: Joi.string().allow(null).allow(""),
            sortColumn: Joi.string().allow(null).allow(""),
            sortOrder: Joi.string().allow(null).allow(""),
            employee_ids: Joi.array().items(Joi.number()).optional().default([]),
            start_date: Joi.string().allow(null).allow(""),
            end_date: Joi.string().allow(null).allow(""),
            status: Joi.number().valid(1, 2).allow("", null),
            emp_code: Joi.string().allow(null).allow("").default(null),
            expand: Joi.number().allow(null).allow("").valid([1, 0, "1", "0"]).default(0)
        };
        return Joi.validate(data, schema);
    }

    /**Validation for user updatation  */
    validateUserUpdate(user_id, first_name, last_name, email, password, emp_code, location_id, department_id, role_ids, date_join, address, status, phone, timezone, timezone_offset, shift_id) {
        const schema = Joi.object().keys({
            user_id: Joi.number().required(),
            first_name: Joi.string().allow(null).max(64).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            last_name: Joi.string().allow(null).max(64).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            email: Joi.string().allow(null).max(128).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            password: Joi.string().max(512).allow(null).regex(/^(?=.*\d)(?=.*[!-\/:-@\[-`{-~]).{8,}$/).error(() => 'The password must contain at least one special character and at least one number and a minimum of 8 characters.'),
            emp_code: Joi.string().allow(null).max(50).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            location_id: Joi.number().positive().allow(null),
            department_id: Joi.number().positive().allow(null),
            role_ids: Joi.array().items(Joi.number()),
            address: Joi.string().allow(null, "").max(512).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            project_name: Joi.string().optional().allow(null, ""),
            status: Joi.number().positive(),
            phone: Joi.string().max(15).allow(null, "").regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            date_join: Joi.date().allow(null),
            timezone: Joi.string().allow(null).max(40).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors)
            }),
            timezone_offset: Joi.number().allow(null),
            shift_id: Joi.number().allow(null),
            // manager_role_id: Joi.number().optional().default(0),
            // assigned_manager: Joi.array().optional()
        });
        return Joi.validate({ user_id, first_name, last_name, email, password, emp_code, location_id, department_id, role_ids, date_join, address, status, phone, timezone, timezone_offset, shift_id }, schema);

    }

    validateMultipleIds(ids) {
        const schema = Joi.object().keys({
            ids: Joi.array().items(Joi.number()).min(1).required().min(1)
        });
        return Joi.validate({ ids }, schema);
    }

    validateMultipleUserId(user_ids, status) {
        const schema = Joi.object().keys({
            user_ids: Joi.array().items(Joi.number()).min(1).required().min(1),
            status: Joi.number().integer()
        });
        return Joi.validate({ user_ids, status }, schema);

    }

    singleUserValidation(data, language = "en") {
        const schema = {
            FirstName: Joi.string().required().max(64).regex(/[^a-zA-Zء-يá-úÁ-ÚñÑüÜ ]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors, language)
            }),
            LastName: Joi.string().required().max(64).regex(/[^a-zA-Zء-يá-úÁ-ÚñÑüÜ ]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors, language)
            }),
            Email: Joi.string().required().regex(/^[a-zA-Z0-9á-úÁ-ÚñÑüÜ._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/).error(() => ' : Invalid Email Adress'),
            Password: Joi.string().max(512).required().regex(/^(?=.*\d)(?=.*[!-\/:-@\[-`{-~]).{8,}$/).error(() => 'The password must contain at least one special character and at least one number and a minimum of 8 characters.'),
            EmployeeCode: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
            Location: Joi.string().required().max(50).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors, language)
            }),
            Department: Joi.string().required().max(50).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors, language)
            }),
            projectName: Joi.string().optional().allow(null, ""),
            Role: Joi.string().required().max(20).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors, language)
            }),
            Address: Joi.string().allow('').max(512).regex(/[$\(\)<>]/, { invert: true }).error((errors) => {
                return Common.joiErrorMessage(errors, language)
            }),
            Phone: Joi.number().min(9).max(99999999999).allow('').allow(null).error(() => 'Invalid phone number.'),
            CountryCode: Joi.number().min(1).max(999).allow('').allow(null).error(() => 'Invalid country code.'),
            DOJ: Joi.date().allow('').error(() => 'Date of join format must be MM/DD/YYYY'),
            Timezone: Joi.string().valid(timezones)
        };
        const options = {
            allowUnknown: true
        }
        return Joi.validate(data, schema, options);
    }

    usersUpDownGradeValidataion(data) {
        const schema = {
            user_id: Joi.number().positive(),
            role_id: Joi.number().positive(),
        };
        return Joi.validate(data, schema);
    }

    assignUserValidation(data) {
        const schema = Joi.object().keys({
            user_multi_manager: Joi.object({
                user_id: Joi.number().allow(null).allow(""),
                manager_ids: Joi.array().items(Joi.number().allow(null).allow("")).error(() => 'Atleast One Manager Must Required'),
            }),
            user_teamlead: Joi.object({
                user_ids: Joi.array().items(Joi.number().allow(null).allow("")).error(() => 'Atleast One Manager Must Required'),
                teamlead_id: Joi.number().allow(null).allow(""),
            }),
            user_manager: Joi.object({
                user_ids: Joi.array().items(Joi.number().allow(null).allow("")).error(() => 'Atleast One Manager Must Required'),
                manager_id: Joi.number().allow(null).allow(""),
            })
        });
        return Joi.validate(data, schema);
    }

    assignEmployeeValidation(data) {
        const schema = Joi.object().keys({
            employee_multi_upperole: Joi.object({
                user_id: Joi.number().allow(null).allow(""),
                role_id: Joi.number().allow(null).allow(""),
                to_assign_ids: Joi.array().items(Joi.number().allow(null).allow("")).error(() => 'Atleast One Manager Must Required'),
            }),
            employee_to_assign: Joi.object({
                user_ids: Joi.array().items(Joi.number().allow(null).allow("")).error(() => 'Atleast One Manager Must Required'),
                to_assign_id: Joi.number().allow(null).allow(""),
                role_id: Joi.number().allow(null).allow(""),
            })
        });
        return Joi.validate(data, schema);
    }

    usersAssginValidataion(data) {
        const schema = {
            department_id: Joi.string().allow(null).allow(""),
            location_id: Joi.string().allow(null).allow(""),
            role_id: Joi.number().allow(null).allow(""),
            name: Joi.string().allow(null).allow(""),
            to_assigned_id: Joi.number().required(),
            status: Joi.number().valid(1, 2).allow("", null),
            to_assign_role_id: Joi.number().required(),
            emp_code: Joi.string().allow(null).allow("").default(null),
            expand: Joi.number().allow(null).allow("").valid([1, 0, "1", "0"]).default(0),
            shift_id: Joi.number().optional().allow(null).default(null),
        };
        return Joi.validate(data, schema);
    }

    validateUnassign(data) {
        const schema = Joi.object().keys({
            user_ids: Joi.array().items(Joi.number().required()),
            to_assigned_id: Joi.number().required(),
            role_id: Joi.number().required(),
        });
        return Joi.validate(data, schema);
    }


    validateScreenshot(data) {
        const schema = Joi.object().keys({
            user_id: Joi.number().positive().required(),
            date: Joi.date().required(),
            limit: Joi.number().integer(),
            pageToken: Joi.string().allow(null).allow(""),
            from: Joi.number(),
            to: Joi.number()
        });
        return Joi.validate(data, schema);
    }

    validateUnassignToManager(user_id, manager_id) {
        const schema = Joi.object().keys({
            user_id: Joi.array().items(Joi.number().required()).error(() => 'Atleast One UserId Must Required'),
            to_assigned_id: Joi.number().integer().required(),
        });
        return Joi.validate({ user_id, manager_id }, schema);
    }
    updatedetailsValidation(data) {
        const schema = Joi.object().keys({
            new_password: Joi.string().max(512).required().regex(/^(?=.*\d)(?=.*[!-\/:-@\[-`{-~]).{8,}$/).error(() => 'The password must contain at least one special character and at least one number and a minimum of 8 characters.'),
            confirmation_password: Joi.string().max(512).required().regex(/^(?=.*\d)(?=.*[!-\/:-@\[-`{-~]).{8,}$/).error(() => 'The password must contain at least one special character and at least one number and a minimum of 8 characters.'),
        });
        return Joi.validate(data, schema);
    }

    employeeAssgnedValidation(data) {
        const schema = {
            user_id: Joi.number().positive().required(),
            role_id: Joi.number().positive().default(null),
        };
        return Joi.validate(data, schema);
    }

    bulkUpdateEmployeeHeader() {
        return Joi.object().keys({
            Email: Joi.string().required(),
            FirstName: Joi.string().required(),
        })
    }


    bulkUpdateEmployeeData(organization_id, language = "en") {
        let isEmailOptional = process.env.ORGANIZATION_ID_WITH_OPTIONAL_USER_EMAIL.split(",").includes(organization_id.toString());
        if(process.env.ORGANIZATION_ID.split(',').includes(`${organization_id}`)) isEmailOptional = true;
        return JoiHapi.array().items(
            JoiHapi.object().keys({
                Email: (isEmailOptional ? JoiHapi.string().allow(null, "").default(null).optional().lowercase().trim().regex(/[@]+/).error(new Error(commonMessages.find(i => i.id == "6")[language])) :
                    JoiHapi.string().lowercase().trim().required().regex(/[@]+/).error(new Error(commonMessages.find(i => i.id == "6")[language]))),
                EmployeeUniqueId: JoiHapi.string().required(),
                FirstName: JoiHapi.string().trim().default(null),
                LastName: JoiHapi.string().trim().default(null),
                // Password: JoiHapi.string().trim().default(null).regex(/^(?=.*\d)[A-Za-z\d@$!%*#<>()_^+=.\/\?&]{8,}$/).messages({
                //     "string.regex": "The password must contain at least one special character and at least one number and a minimum of 8 characters.",
                // ,
                Password: JoiHapi.string().trim().allow(null, "").default(null).regex(/^(?=.*\d)(?=.*[!-\/:-@\[-`{-~]).{8,}$/).error(new Error("The password must contain at least one special character and at least one number and a minimum of 8 characters.")),
                Location: JoiHapi.string().trim().default(null),
                projectName: JoiHapi.string().optional().allow(null, ""),
                Role: JoiHapi.string().trim().default(null),
                EmployeeCode: JoiHapi.alternatives().try(JoiHapi.string().trim(), JoiHapi.number()).required().messages({ "any.required": `EmployeeCode is not provided for some users. Please check and upload again` }),
                Department: JoiHapi.string().trim().default(null),
                Address: JoiHapi.string().trim().allow('').default(null),
                DOJ: JoiHapi.date().allow('').default(null),
                Phone: JoiHapi.alternatives().try(JoiHapi.string().trim().replace(/-/g, "").default(null).allow(''), JoiHapi.number().default(null).allow('')),
                CountryCode: JoiHapi.number().integer().positive().default(null).allow(''),
                Timezone: JoiHapi.string().trim(),
                Manager: JoiHapi.string().allow('').default(null),
            }).required().options({ allowUnknown: true })
        ).required()
    }


    removedUsers(params) {
        const schema = Joi.object().keys({
            skip: Joi.number().default(null).optional(),
            limit: Joi.number().default(null).optional(),
            fromDate: Joi.string().default(null).optional(),
            toDate: Joi.string().default(null).optional(),
            search: Joi.string().default(null).optional(),
            sortColumn: Joi.string().default(null).optional(),
            sortOrder: Joi.string().default(null).optional()
        });
        return Joi.validate(params, schema);
    }

    validateShiftAssign(data) {
        const schema = {
            shift_id: Joi.number().required(),
            employees_id: Joi.array().items(Joi.number().required()),
        };
        return Joi.validate(data, schema);
    }
}

module.exports = new UserActivityValidation;
