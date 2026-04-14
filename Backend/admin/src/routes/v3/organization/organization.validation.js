const Joi = require('joi');
const hapiJoi = require('@hapi/joi');
const isMacAddress = require('is-mac-address')

const processErrors = (validation) => {
    if (!validation.error) return validation;
    const errorMessages = {};
    validation.error.details.forEach((detail) => {
        const key = detail.path.join('.');
        errorMessages[key] = key in errorMessages ? errorMessages[key] : [];
        errorMessages[key].push(detail.message);
    });
    return { ...validation, errorMessages };
};
class OrganizationValidator {
    updateFeature(
        screenshot_capture_interval,
        website_analytics_enabled,
        application_analytics_enabled,
        keystroke_enabled,
        browser_history_enabled,
        user_log_enabled,
        firewall_enabled,
        domain_enabled,
        screenshot_enabled,
        ideal_time, product_id, expire_date
    ) {
        const schema = Joi.object().keys({
            screenshot_capture_interval: Joi.number().required(),
            website_analytics_enabled: Joi.number().required(),
            application_analytics_enabled: Joi.number().required(),
            keystroke_enabled: Joi.number().required(),
            browser_history_enabled: Joi.number().required(),
            user_log_enabled: Joi.number().required(),
            firewall_enabled: Joi.number().required(),
            domain_enabled: Joi.number().required(),
            screenshot_enabled: Joi.number().required(),
            ideal_time: Joi.number().required(),
            product_id: Joi.number().required(),
            expire_date: Joi.date().required(),

        });
        var result = Joi.validate({
            screenshot_capture_interval,
            website_analytics_enabled,
            application_analytics_enabled,
            keystroke_enabled,
            browser_history_enabled,
            user_log_enabled,
            firewall_enabled,
            domain_enabled,
            screenshot_enabled,
            ideal_time,
            product_id,
            expire_date
        }, schema);
        return result;
    }

    updateFeatureSettings(features) {
        const schema = Joi.object().keys({

            features: Joi.object().required(),
        });
        var result = Joi.validate({
            features
        }, schema);
        return result;
    }

    customEmpSettingValidation(track_data) {
        const schema = Joi.object().keys({
            track_data: Joi.object().required(),
            group_id: Joi.number().default(null).optional(),
        });
        var result = Joi.validate(track_data, schema);
        return result;
    }


    empTrackingModeValidation(params) {
        const schema = Joi.object().keys({
            trackingMode: Joi.string().valid(['unlimited', 'fixed', 'networkBased', 'manual', 'projectBased']).error(() => 'trackingMode unlimited, fixed, networkBased, manual, projectBased are Allowed.'),
        });
        return Joi.validate(params, schema);
    }

    SettingInputValidation(
        breakInMinute, idleInMinute, block_websites,
        screenshots, web_usage, keystrokes, application_usage, frequencyPerHour,

        system_type, system_visibility, employeeAccessibility, employeeCanDelete, employeeCanCreateTask
    ) {
        const schema = Joi.object().keys({
            breakInMinute: Joi.number().integer().required().error(err => 'breakInMinute is must be a number'),
            idleInMinute: Joi.number().integer().required().error(err => 'idleInMinute is must be a number'),
            timesheetIdleTime: str().default("00:00").regex(/[0-5][0-9]:[0-5][0-9]/).error(_ => 'Timesheet idle time is must be a max of 59 min and 59 sec'),
            block_websites: Joi.number().integer().valid([0, 1]).required().error(err => 'Invalid Input for block_websites'),
            web_usage: Joi.number().integer().valid([0, 1]).required().error(err => 'Invalid Input for web_usage'),
            screenshots: Joi.number().integer().valid([0, 1]).required().error(err => 'Invalid Input for screenshots'),
            keystrokes: Joi.number().required().valid([0, 1]).error(err => 'Invalid Input for keystrokes'),
            application_usage: Joi.number().integer().valid([0, 1]).required().error(err => 'Invalid Input for application_usage.'),
            frequencyPerHour: Joi.number().integer().required().error(err => 'frequencyPerHour is must be a number'),

            system_visibility: Joi.string().valid(["true", "false"]).error(er => 'Inavlid Input For System visibility'),
            system_type: Joi.number().error(er => 'Inavlid Input For System Type'),
            employeeAccessibility: Joi.string().valid(["true", "false"]).error(er => 'Inavlid Input For employeeAccessibility'),
            employeeCanDelete: Joi.string().valid(["true", "false"]).error(er => 'Inavlid Input For employeeCanDelete'),
            employeeCanCreateTask: Joi.string().valid(["true", "false"]).error(er => 'Inavlid Input For employeeCanCreateTask'),
        });
        return Joi.validate({
            breakInMinute,
            idleInMinute,
            block_websites,
            screenshots,
            web_usage,
            keystrokes,
            application_usage,
            frequencyPerHour,
            system_type,
            system_visibility,
            employeeAccessibility,
            employeeCanDelete,
            employeeCanCreateTask
        }, schema);
    }

    updateOrgnizationDetails() {
        return hapiJoi.object().keys({
            timezone: hapiJoi.string().optional().default(null),
            language: hapiJoi.string().valid("en", "es", "idn", "fr", "ar", "pt").optional().default(null),
            email: hapiJoi.string().optional().default(null),
            weekday_start: hapiJoi.string().valid("sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday").default(null).allow(null).optional()
        })
    }
    updateSettingFeatures(params) {
        const joi = Joi
            .extend((joi) => {
                const formatRegExp = /([0-1][0-9]|2[0-3]):[0-5][0-9]/;
                return {
                    name: 'time',
                    base: joi.string(),
                    language: {
                        base: '!!"{{key}}" must be in a valid format',
                        greater: '!!"{{key}}" must be greater than {{time}}',
                    },
                    pre(value, state, options) {
                        if (formatRegExp.test(value)) return value;
                        return this.createError('time.base', { value }, state, options);
                    },
                    rules: [{
                        name: 'greater',
                        params: {
                            time: joi.alternatives([joi.string().required(), joi.func().ref().required()]),
                        },
                        validate(params, value, state, options) {
                            const time = joi.isRef(params.time) ? state.parent[params.time.key] : params.time;
                            if (value > time) {
                                return value;
                            }
                            return this.createError('time.greater', { value, time }, state, options);
                        }
                    },],
                };
            })
            .extend((joi) => {
                return {
                    name: 'mac',
                    base: joi.string(),
                    language: {
                        base: '!!"{{key}}" must be in a valid MAC address',
                    },
                    pre(value, state, options) {
                        if (isMacAddress.isMACAddress(value.replace(/-/g, ":"))) return value;
                        return this.createError('time.base', { value }, state, options);
                    },
                };
            });
        const any = () => joi.any();
        const obj = () => joi.object().unknown(true);
        const str = () => joi.string();
        const int = () => num().integer();
        const num = () => joi.number();
        const zeroOne = () => Joi.number().integer().valid([0, 1]);
        // Forgiving zero/one for feature-flag toggles: the UI sometimes
        // sends true/false (JS booleans), "0"/"1" (strings) or skips the
        // field entirely. We accept all of those and default missing to 0
        // so a single stray toggle doesn't nuke the whole settings save.
        const zeroOneFlex = () => joi.alternatives().try([
            Joi.number().integer().valid([0, 1]),
            joi.boolean(),
            joi.string().valid('0', '1', 'true', 'false', ''),
            joi.any().valid(null),
        ]);
        const mac = () => joi.mac();

        const bool = () => joi.boolean();
        const time = () => joi.time();

        const day = () => {
            return obj().keys({
                status: bool(),
                time: obj().keys({
                    // Accept either a valid HH:mm string OR empty/null — disabled
                    // days (status: false) legitimately send empty time fields
                    // and should not block the whole save.
                    start: joi.alternatives().try([time(), joi.string().valid('', null)]),
                    // end: time().greater(joi.ref('start')).required()
                    //     .error(_ => 'End time must be more than start time'),
                    end: joi.alternatives().try([time(), joi.string().valid('', null)]),
                }),
            });
        };
        const days = () => obj().keys({
            mon: day(),
            tue: day(),
            wed: day(),
            thu: day(),
            fri: day(),
            sat: day(),
            sun: day(),
        });
        const arrayOfStrings = () => joi.array().items(joi.string());
        const arrayOfNumbers = () => joi.array().items(joi.number());

        const schema = Joi.object().required().keys({
            employee_id: num().default(0),
            group_id: num().default(0),
            type: num().default(0),
            track_data: obj().required().keys({
                system: obj().keys({
                    type: num().error(_ => 'Inavlid Input For System Type'),
                    visibility: bool().error(_ => 'Inavlid Input For System visibility'),
                    autoUpdate: zeroOne().default('0'),
                    tracking: zeroOne().default(1),
                }),
                screenshot: obj().keys({
                    frequencyPerHour: num().integer().required().error(_ => 'frequencyPerHour is must be a number'),
                    employeeAccessibility: bool().error(_ => 'Inavlid Input For employeeAccessibility'),
                    employeeCanDelete: bool().error(_ => 'Inavlid Input For employeeCanDelete'),
                }),
                breakInMinute: num().integer().default(30).error(_ => 'breakInMinute is must be a number'),
                idleInMinute: num().integer().required().error(_ => 'idleInMinute is must be a number'),
                timesheetIdleTime: str().default("00:00").regex(/[0-5][0-9]:[0-5][0-9]/).error(_ => 'Timesheet idle time is must be a max of 59 min and 59 sec'),
                trackingMode: str().valid(['unlimited', 'fixed', 'networkBased', 'manual', 'projectBased', 'geoLocation'])
                    .error(() => 'trackingMode unlimited, fixed, networkBased, manual, projectBased are Allowed.'),
                tracking: obj().keys({
                    unlimited: obj().keys({
                        day: str(),
                    }),
                    fixed: days(),
                    networkBased: joi.alternatives().try(
                        joi.object().keys({
                            networkName: joi.string().allow(null),
                            ipAddress: joi.alternatives([
                                mac(),
                                joi.string().ip({
                                    version: ['ipv4', 'ipv6'],
                                    cidr: 'optional'
                                })
                            ]).allow(null),
                            officeNetwork: joi.boolean().strict().allow("true", "false")
                        }),
                        joi.array().items(
                            joi.object().keys({
                                networkName: joi.string().allow(null),
                                ipAddress: joi.alternatives([
                                    mac(),
                                    joi.string().ip({
                                        version: ['ipv4', 'ipv6'],
                                        cidr: 'optional'
                                    })
                                ]).allow(null),
                                officeNetwork: joi.boolean().strict().allow("true", "false")
                            })
                        )
                    ).default([]),
                    manual: obj(),
                    projectBased: Joi.array().items(obj().keys({
                        id: joi.number().allow(null)
                    })).default([]),
                    app: obj().keys({
                        monitorOnly: arrayOfStrings(),
                        suspendWhenUsed: arrayOfStrings(),
                        suspendKeystrokesWhenUsed: arrayOfStrings(),
                        idleTimeThreshold: int(),
                        daysAndTimes: days(),
                        appBlockList: arrayOfStrings().default([]),
                    }),
                    domain: obj().keys({
                        monitorOnly: arrayOfStrings().default([]),
                        suspendMonitorWhenVisited: arrayOfStrings().default([]),
                        suspendMonitorWhenVisitedInCategory: arrayOfStrings().default([]),
                        suspendMonitorWhenContains: arrayOfStrings().default([]),
                        suspendPrivateBrowsing: bool().default(false),
                        suspendKeystrokesWhenVisited: arrayOfStrings().default([]),
                        suspendKeystrokesPasswords: bool().default(false),
                        daysAndTimes: days().default({}),
                        websiteBlockList: arrayOfStrings().default([]),

                    }).default({
                        "monitorOnly": [],
                        "suspendMonitorWhenVisited": [],
                        "suspendMonitorWhenVisitedInCategory": [],
                        "suspendMonitorWhenContains": [],
                        "suspendPrivateBrowsing": false,
                        "suspendKeystrokesWhenVisited": [],
                        "suspendKeystrokesPasswords": false,
                        "daysAndTimes": {},
                        "websiteBlockList": []
                    }),
                    geoLocation: Joi.array().items(
                        Joi.object().keys({
                            location: Joi.string().required(),
                            lat: Joi.number().precision(10).error(() => { return "Latitude should be a decimal number" }),
                            lon: Joi.number().precision(10).error(() => { return "Longitude should be a decimal number" }),
                            distance: Joi.number().min(100).error(() => { return "Range must be larger than or equal to 100 meters" })
                        })
                    ).default([]),
                }),
                task: obj().keys({
                    employeeCanCreateTask: bool().error(_ => 'Inavlid Input For employeeCanCreateTask'),
                }),
                features: obj().keys({
                    application_usage: zeroOneFlex().optional().default(0).error(_ => 'Invalid Input for application_usage.'),
                    keystrokes: zeroOneFlex().optional().default(0).error(_ => 'Invalid Input for keystrokes'),
                    web_usage: zeroOneFlex().optional().default(0).error(_ => 'Invalid Input for web_usage'),
                    block_websites: zeroOneFlex().optional().default(0).error(_ => 'Invalid Input for block_websites'),
                    screenshots: zeroOneFlex().optional().default(0).error(_ => 'Invalid Input for screenshots'),
                    screen_record: zeroOneFlex().optional().default(0).error(_ => 'Invalid Input for screen record'),
                }),
                pack: obj().keys({
                    id: int(),
                    expiry: str(),
                }),
                screenRecord: obj().keys({
                    ultrafast_720_21: zeroOne().optional().default().error(_ => 'Inavlid Input For screen quality'),
                    ultrafast_1080_21: zeroOne().optional().default().error(_ => 'Inavlid Input For screen quality'),
                    ultrafast_1280_21: zeroOne().integer().optional().default().error(_ => 'Inavlid Input For screen quality'),
                }),
                productiveHours: obj().keys({
                    hour: joi.time().default('00:00'),
                    mode: Joi.string().valid('fixed', 'unlimited').default("unlimited")
                }).default({ hour: "00:00", mode: "unlimited" }),
                agentUninstallCode: Joi.string().optional().allow(['', ""]).default(''),
                manual_clock_in: num().integer().allow(0, 1).default(0),
                usbDisable: num().integer().valid(0, 1).default(0),
                productivityCategory: num().integer().valid(0, 1, 2).default(0),
                systemLock: num().integer().valid(0, 1).default(0),
                isSilahMobileGeoLocation: num().integer().valid(0, 1).default(0),
                silahMobileGeoLocationFrequency: num().integer().valid(5, 10, 15, 30, 45, 60).default(30),
                screen_record: obj().keys({
                    is_enabled: num().integer().valid(0, 1).default(0),
                    video_quality: Joi.number().valid(1, 2, 3).default(2),
                    audio: num().integer().valid(0, 1).default(0),
                }),
                screen_record_when_website_visit: arrayOfStrings(),
                screenshot_exclude_websites: arrayOfStrings(),
                screenshot_exclude_application: arrayOfStrings(),
            }),
        });
        return processErrors(Joi.validate(params, schema, { abortEarly: false }));
    }


    updateMFAStatus(params) {
        const schema = Joi.object({
            status: Joi.number().required().valid(0, 1).error(() => new Error('Status can be 0 or 1')),
            type: Joi.string().required().valid('email', 'authenticator', '', null).error(() => new Error('Type can be email, authenticator, empty string, or null')),
            secret: Joi.string()
                .when('type', { is: 'authenticator', then: Joi.required(), otherwise: Joi.allow('', null) }) // Allows empty string or null if type isn't 'authenticator'
        });
        return Joi.validate(params, schema);
    }

    verifyMFA(params) {
        // otp, secret
        const schema = Joi.object().keys({
            otp: Joi.string().required().error(() => 'OTP is required'),
            secret: Joi.string().required().error(() => 'Secret is required'),
        });
        return Joi.validate(params, schema);
    }
}
module.exports = new OrganizationValidator;