const SettingsValidation = require('./settings.validation');
const organizationValidation = require('../organization/organization.validation');
const SettingsModel = require('./settings.model');
const Logger = require('../../../logger/Logger').logger;
const MAC_ADDRESS = require('is-mac-address');
const EventService = require('../auth/services/event.service');
const actionsTracker = require('../services/actionsTracker');
const { GroupsModel: Model } = require('./groups/groups.model');
const { settingMessages } = require("../../../utils/helpers/LanguageTranslate");
const { translate } = require('../../../utils/messageTranslation');
const { screenshotFrequency, idleTime, breakTime, mobileGeoLocationFrequency } = require('../../../utils/helpers/LanguageTranslate');
const _ = require('underscore');
const passwordService = require("../auth/services/password.service");

const configFile = require("../../../../../config/config");

class Settings {

    /**
     * Updates settings for customised user settings
     *
     * @function updateEmployeeTrackSettings
     * @memberof Settings
     * @param {*} req
     * @param {*} res
     * @return {Promise<Object>} with updated settings or Error.
     */
    async updateEmployeeTrackSettings(req, res) {
        let { employee_id, track_data, group_id, type } = req.body;
        let condition = `id=${employee_id}`;
        const { organization_id, language } = req.decoded;
        if (typeof track_data?.screen_record_when_website_visit === "string") {
            track_data.screen_record_when_website_visit = track_data?.screen_record_when_website_visit?.split(",");
        }
        if(track_data?.screenshot_exclude_websites) track_data.screenshot_exclude_websites = track_data?.screenshot_exclude_websites?.split(",");
        if(track_data?.screenshot_exclude_application) track_data.screenshot_exclude_application = track_data?.screenshot_exclude_application?.split(",");
        let checkEmployee = await SettingsModel.getEmployee(" id ", ` id = ${employee_id} AND organization_id = ${organization_id} `);
        if (!checkEmployee.length) return res.json({
            code: 404,
            data: null,
            message: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"],
            error: null
        });

        let geoLocationArray = []

        let validation = SettingsValidation.customEmpSettingValidation_new(req.body)

        if (validation.error) return res.json({
            code: 404,
            data: null,
            message: settingMessages.find(x => x.id === "2")[language] || settingMessages.find(x => x.id === "2")["en"],
            error: validation.error.details[0].message
        });
        geoLocationArray = validation.value.track_data.tracking.geoLocation
        geoLocationArray = geoLocationArray.filter((location, index, self) =>
            index !== self.findIndex((t) => (
                t.lon === location.lon && t.lat === location.lat
            ))
        )
        if (geoLocationArray.length > 0) return res.json({ code: 400, data: null, message: settingMessages.find(x => x.id === "8")[language] || settingMessages.find(x => x.id === "8")["en"], error: "Duplicate Locations are not allowed." })
        track_data = validation.value.track_data
        try {
            //type is 1 means organization setting
            if (type == 1) {
                let orgCondition = `organization_id=${organization_id}`
                let columns = `id,tracking_rule_type,custom_tracking_rule,group_id`;

                const employeeSetting = await SettingsModel.getEmployee(columns, ` id = ${employee_id} and organization_id = ${organization_id}`);
                const organizationSetting = await SettingsModel.getOrganizationSetting(orgCondition);

                if (employeeSetting[0].tracking_rule_type == 2 && employeeSetting[0].group_id != null) {
                    await Model.deleteGroupsAudiance({ where: `group_id=${employeeSetting[0].group_id} AND employee_id=${employee_id}` });
                }

                let values = `custom_tracking_rule='${organizationSetting[0].rules}',tracking_rule_type=${type},group_id=NULL`
                const result = await SettingsModel.updateEmployee(values, condition);
                if (result.changedRows === 0) return res.json({ code: 200, message: settingMessages.find(x => x.id === "1")[language] || settingMessages.find(x => x.id === "1")["en"], error: null });

                let newcondition = `e.id=${employee_id}`;
                const employee = await SettingsModel.getEmployeefullDetails(newcondition);

                if (employee.length === 0) return res.json({ code: 400, data: null, message: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"], error: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"] });

                employee[0].custom_tracking_rule = JSON.parse(employee[0].custom_tracking_rule);

                if (employee[0].custom_tracking_rule.tracking.projectBased != null && employee[0].custom_tracking_rule.tracking.projectBased.length > 0) {

                    let projectIdsArray = employee[0].custom_tracking_rule.tracking.projectBased;
                    const projectNamesArray = await SettingsModel.getProjects(projectIdsArray, organization_id);
                    employee[0].custom_tracking_rule['tracking'].projectBased = projectNamesArray.length ? projectNamesArray : [];

                }

                if (employee[0].tracking_rule_type === 3 || employee[0].tracking_rule_type === 1) {

                    let trackingMode = employee[0].custom_tracking_rule.trackingMode;
                    let tracking = employee[0].custom_tracking_rule.tracking;
                    employee[0].custom_tracking_rule.tracking = { [trackingMode]: employee[0].custom_tracking_rule.tracking[trackingMode], ...tracking };
                }
                EventService.emit('update-employee-redis-data-by-employee_id', employee_id);
                return res.json({ code: 200, data: employee[0], message: settingMessages.find(x => x.id === "1")[language] || settingMessages.find(x => x.id === "1")["en"], error: null });

            }
            //type is 2 means group setting
            if (type == 2) {
                let columns = `tracking_rule_type,group_id`;
                let groupCondition = `id=${group_id}`

                const groupSetting = await SettingsModel.getGroupSetting(groupCondition);
                const isGroupPresent = await SettingsModel.getEmployee(columns, condition);

                if (isGroupPresent[0].group_id) await Model.deleteGroupsAudiance({ where: `group_id=${isGroupPresent[0].group_id} AND employee_id=${employee_id}` });

                if (group_id) {
                    let values = `group_id='${group_id}',custom_tracking_rule='${groupSetting[0].rules}',tracking_rule_type=2`

                    const result = await SettingsModel.updateEmployee(values, condition);
                    if (result.changedRows === 0) return res.json({ code: 200, message: settingMessages.find(x => x.id === "1")[language] || settingMessages.find(x => x.id === "1")["en"], error: null });

                    const groupresult = await Model.listAudience({ where: `group_id=${group_id} AND employee_id=${employee_id}` });
                    if (groupresult.length == 0) {
                        let group_data = [];
                        group_data.push([group_id, employee_id, null, null, null])
                        await Model.addAudience({ group_data });
                    }

                    let newcondition = `e.id=${employee_id}`;
                    const employee = await SettingsModel.getEmployeefullDetails(newcondition);

                    if (employee.length === 0) return res.json({ code: 400, data: null, message: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"], error: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"] });
                    employee[0].custom_tracking_rule = JSON.parse(employee[0].custom_tracking_rule);


                    if (employee[0].custom_tracking_rule.tracking.projectBased != null && employee[0].custom_tracking_rule.tracking.projectBased.length > 0) {

                        let projectIdsArray = employee[0].custom_tracking_rule.tracking.projectBased;
                        const projectNamesArray = await SettingsModel.getProjects(projectIdsArray, organization_id);
                        employee[0].custom_tracking_rule['tracking'].projectBased = projectNamesArray.length ? projectNamesArray : [];

                    }

                    if (employee[0].tracking_rule_type === 3 || employee[0].tracking_rule_type === 1) {

                        let trackingMode = employee[0].custom_tracking_rule.trackingMode;
                        let tracking = employee[0].custom_tracking_rule.tracking;
                        employee[0].custom_tracking_rule.tracking = { [trackingMode]: employee[0].custom_tracking_rule.tracking[trackingMode], ...tracking };
                    }
                    EventService.emit('update-employee-redis-data-by-employee_id', employee_id);
                    return res.json({ code: 200, data: employee[0], message: settingMessages.find(x => x.id === "1")[language] || settingMessages.find(x => x.id === "1")["en"], error: null });

                }
                else {
                    return res.json({ code: 400, message: settingMessages.find(x => x.id === "4")[language] || settingMessages.find(x => x.id === "4")["en"], error: settingMessages.find(x => x.id === "4")[language] || settingMessages.find(x => x.id === "4")["en"] });
                }
            }
            //type is 3 means customized setting
            if (type == 3) {

                let columns = `id,tracking_rule_type,custom_tracking_rule,group_id`;
                await SettingsModel.getEmployee(columns, condition);

                const employee = await SettingsModel.getEmployee(columns, condition);
                if (employee[0].tracking_rule_type == 2 && employee[0].group_id != null) {

                    await Model.deleteGroupsAudiance({ where: `group_id=${employee[0].group_id} AND employee_id=${employee_id}` });

                }
                if (employee[0].tracking_rule_type === 3 || employee[0].tracking_rule_type === 1 || employee[0].tracking_rule_type === 2) {

                    let data = JSON.parse(employee[0].custom_tracking_rule);
                    let inputarr = track_data.tracking.projectBased
                    let outputarr = []
                    inputarr.map(({ id }) => outputarr.push(id))
                    track_data.tracking.projectBased = outputarr;
                    let newtrackdata = track_data;
                    newtrackdata.pack = data.pack;
                    newtrackdata.logoutOptions = data.logoutOptions;
                    newtrackdata.breakInMinute = track_data.breakInMinute || track_data.breakInMinute == 0 ? 0 : data.breakInMinute;
                    newtrackdata.idleInMinute = track_data.idleInMinute || data.idleInMinute;

                    let result = JSON.stringify(newtrackdata);

                    let condition = `id=${employee_id}`
                    let values = `custom_tracking_rule='${result}', tracking_rule_type=3,group_id=NULL`
                    const updated = await SettingsModel.updateEmployee(values, condition);

                    if (updated.changedRows === 0) return res.json({ code: 200, data: newtrackdata, message: settingMessages.find(x => x.id === "1")[language] || settingMessages.find(x => x.id === "1")["en"], error: null });

                    actionsTracker(req, 'User %i tracking settings updated.', [employee_id]);

                    let newcondition = `e.id=${employee_id}`;
                    const employeee = await SettingsModel.getEmployeefullDetails(newcondition);

                    if (employeee.length === 0) return res.json({ code: 400, data: null, message: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"], error: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"] });

                    employeee[0].custom_tracking_rule = JSON.parse(employeee[0].custom_tracking_rule);

                    if (track_data.tracking.projectBased != null && track_data.tracking.projectBased.length > 0) {

                        let projectIdsArray = track_data.tracking.projectBased;
                        const projectNamesArray = await SettingsModel.getProjects(projectIdsArray, organization_id);
                        employeee[0].custom_tracking_rule['tracking'].projectBased = projectNamesArray.length ? projectNamesArray : [];

                    }
                    if (employeee[0].tracking_rule_type === 3 || employeee[0].tracking_rule_type === 1) {

                        let trackingMode = employeee[0].custom_tracking_rule.trackingMode;
                        let tracking = employeee[0].custom_tracking_rule.tracking;
                        employeee[0].custom_tracking_rule.tracking = { [trackingMode]: employeee[0].custom_tracking_rule.tracking[trackingMode], ...tracking };
                    }
                    EventService.emit('update-employee-redis-data-by-employee_id', employee_id);
                    return res.json({ code: 200, data: employeee[0], message: settingMessages.find(x => x.id === "1")[language] || settingMessages.find(x => x.id === "1")["en"], error: null });


                } else {
                    let data = {
                        system: {
                            type: 1,
                            visibility: false,
                        },
                        screenshot: {
                            frequencyPerHour: 30,
                            employeeAccessibility: false,
                            employeeCanDelete: false
                        },
                        features: {
                            application_usage: 1,
                            keystrokes: 1,
                            web_usage: 1,
                            block_websites: 1,
                            screenshots: 1
                        },
                        breakInMinute: 0,
                        idleInMinute: 10,
                        trackingMode: 'unlimited',
                        tracking: {
                            unlimited: {
                                day: '1,2,3,4,5,6,7',
                            },
                            fixed: {
                                mon: {
                                    status: false,
                                    time: { start: '10:00', end: '19:00' }
                                },
                                tue: {
                                    status: false,
                                    time: { start: '10:00', end: '19:00' }
                                },
                                wed: {
                                    status: false,
                                    time: { start: '10:00', end: '19:00' }
                                },
                                thu: {
                                    status: false,
                                    time: { start: '10:00', end: '19:00' }
                                },
                                fri: {
                                    status: false,
                                    time: { start: '10:00', end: '19:00' }
                                },
                                sat: {
                                    status: false,
                                    time: { start: '10:00', end: '15:00' }
                                },
                                sun: {
                                    status: false,
                                    time: { start: '10:00', end: '19:00' }
                                },
                            },
                            networkBased: {
                                networkName: null,
                                networkMac: null,
                            },
                            manual: {
                            },
                            projectBased: {
                            }
                        },
                        task: {
                            employeeCanCreateTask: false
                        }
                    }

                    if (track_data.system) {
                        data.system.type = track_data.system.type || data.system.type;
                        data.system.visibility = track_data.system.visibility || data.system.visibility;
                    }
                    if (track_data.screenshot) {
                        data.screenshot.frequencyPerHour = track_data.screenshot.frequencyPerHour || 0;
                        data.screenshot.employeeAccessibility = track_data.screenshot.employeeAccessibility || data.screenshot.employeeAccessibility;
                        data.screenshot.employeeCanDelete = track_data.screenshot.employeeCanDelete || data.screenshot.employeeCanDelete;
                    }
                    data.breakInMinute = track_data.breakInMinute || 0;
                    data.idleInMinute = track_data.idleInMinute || data.idleInMinute;
                    if (track_data.trackingMode) {

                        var validate = SettingsValidation.empTrackingModeValidation({ trackingMode: track_data.trackingMode });
                        if (validate.error) return res.json({ code: 404, data: null, message: "Validation failed", error: validate.error.details[0].message });
                        data.trackingMode = track_data.trackingMode || data.trackingMode;
                    }
                    if (track_data.tracking) {
                        if (track_data.tracking.unlimited) {
                            data.tracking.unlimited.day = track_data.tracking.unlimited.day || data.tracking.unlimited.day;
                        }
                        if (track_data.tracking.fixed) {
                            if (track_data.tracking.fixed.mon) {

                                data.tracking.fixed.mon.status = track_data.tracking.fixed.mon.status || data.tracking.fixed.mon.status;
                                if (track_data.tracking.fixed.mon.time) {

                                    data.tracking.fixed.mon.time.start = track_data.tracking.fixed.mon.time.start || data.tracking.fixed.mon.time.start;
                                    data.tracking.fixed.mon.time.end = track_data.tracking.fixed.mon.time.end || data.tracking.fixed.mon.time.end;
                                }
                            }
                            if (track_data.tracking.fixed.tue) {
                                data.tracking.fixed.tue.status = track_data.tracking.fixed.tue.status || data.tracking.fixed.tue.status;
                                if (track_data.tracking.fixed.tue.time) {

                                    data.tracking.fixed.tue.time.start = track_data.tracking.fixed.tue.time.start || data.tracking.fixed.tue.time.start;
                                    data.tracking.fixed.tue.time.end = track_data.tracking.fixed.tue.time.end || data.tracking.fixed.tue.time.end;
                                }
                            }
                            if (track_data.tracking.fixed.wed) {
                                data.tracking.fixed.wed.status = track_data.tracking.fixed.wed.status || data.tracking.fixed.wed.status;
                                if (track_data.tracking.fixed.wed.time) {

                                    data.tracking.fixed.wed.time.start = track_data.tracking.fixed.wed.time.start || data.tracking.fixed.wed.time.start;
                                    data.tracking.fixed.wed.time.end = track_data.tracking.fixed.wed.time.end || data.tracking.fixed.wed.time.end;
                                }
                            }
                            if (track_data.tracking.fixed.thu) {
                                data.tracking.fixed.thu.status = track_data.tracking.fixed.thu.status || data.tracking.fixed.thu.status;
                                if (track_data.tracking.fixed.thu.time) {

                                    data.tracking.fixed.thu.time.start = track_data.tracking.fixed.thu.time.start || data.tracking.fixed.thu.time.start;
                                    data.tracking.fixed.thu.time.end = track_data.tracking.fixed.thu.time.end || data.tracking.fixed.thu.time.end;
                                }
                            }
                            if (track_data.tracking.fixed.fri) {
                                data.tracking.fixed.fri.status = track_data.tracking.fixed.fri.status || data.tracking.fixed.fri.status;
                                if (track_data.tracking.fixed.fri.time) {

                                    data.tracking.fixed.fri.time.start = track_data.tracking.fixed.fri.time.start || data.tracking.fixed.fri.time.start;
                                    data.tracking.fixed.fri.time.end = track_data.tracking.fixed.fri.time.end || data.tracking.fixed.fri.time.end;
                                }
                            }
                            if (track_data.tracking.fixed.sat) {
                                data.tracking.fixed.sat.status = track_data.tracking.fixed.sat.status || data.tracking.fixed.sat.status;
                                if (track_data.tracking.fixed.sat.time) {

                                    data.tracking.fixed.sat.time.start = track_data.tracking.fixed.sat.time.start || data.tracking.fixed.sat.time.start
                                    data.tracking.fixed.sat.time.end = track_data.tracking.fixed.sat.time.end || data.tracking.fixed.sat.time.end;
                                }
                            }
                            if (track_data.tracking.fixed.sun) {
                                data.tracking.fixed.sun.status = track_data.tracking.fixed.sun.status || data.tracking.fixed.sun.status;
                                if (track_data.tracking.fixed.sun.time.start) {

                                    data.tracking.fixed.sun.time.start = track_data.tracking.fixed.sun.time.start || data.tracking.fixed.sun.time.start
                                    data.tracking.fixed.sun.time.end = track_data.tracking.fixed.sun.time.end || data.tracking.fixed.sun.time.end;
                                }
                            }
                        }
                        if (track_data.tracking.networkBased) {
                            data.tracking.networkBased.networkName = track_data.tracking.networkBased.networkName || data.tracking.networkBased.networkName
                            if (track_data.tracking.networkBased.networkMac) {
                                if (MAC_ADDRESS.isMACAddress(track_data.tracking.networkBased.networkMac.replace(/-/g, ":")) === false) return res.json({ code: 404, data: null, message: 'Validation failed', error: 'Invalid MAC address' });
                                data.tracking.networkBased.networkMac = track_data.tracking.networkBased.networkMac || data.tracking.networkBased.networkMac
                            }
                        }
                    }
                    if (track_data.task) {
                        data.task.employeeCanCreateTask = track_data.task.employeeCanCreateTask || data.task.employeeCanCreateTask;
                    }

                    let result = JSON.stringify(data);
                    let values = `tracking_rule_type=3,custom_tracking_rule='${result}',group_id=NULL`
                    let condition = `id=${employee_id}`
                    const updated = await SettingsModel.updateEmployee(values, condition);
                    EventService.emit('update-employee-redis-data-by-employee_id', employee_id);
                    let newcondition = `e.id=${employee_id}`;

                    actionsTracker(req, 'User %i tracking settings updated.', [employee_id]);

                    const employeee = await SettingsModel.getEmployeefullDetails(newcondition);
                    if (employeee.length === 0) return res.json({ code: 400, data: null, message: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"], error: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"] });
                    employeee[0].custom_tracking_rule = JSON.parse(employee[0].custom_tracking_rule);
                    if (employeee[0].tracking_rule_type === 3 || employeee[0].tracking_rule_type === 1) {
                        let trackingMode = employee[0].custom_tracking_rule.trackingMode;
                        employeee[0].custom_tracking_rule.tracking = { [trackingMode]: employeee[0].custom_tracking_rule.tracking[trackingMode] };
                    }

                    return res.json({ code: 200, data: employeee[0], message: settingMessages.find(x => x.id === "1")[language] || settingMessages.find(x => x.id === "1")["en"], error: null });

                }
            }
        } catch (err) {
            Logger.error(`-V3---error-----${err}------${__filename}----`);
            return res.json({ code: 400, data: null, message: settingMessages.find(x => x.id === "5")[language] || settingMessages.find(x => x.id === "5")["en"], err });
        }
    }

    async getEmpTrackSetting(req, res) {

        var validate = SettingsValidation.empIdValidation(req.body);
        if (validate.error) return res.json({ code: 404, data: null, message: settingMessages.find(x => x.id === "2")[language] || settingMessages.find(x => x.id === "2")["en"], error: validate.error.details[0].message });

        const employee_id = req.body.employee_id;
        const { language, organization_id } = req.decoded
        actionsTracker(req, 'User %i tracking rules requested.', [employee_id]);

        try {
            const condition = ` e.id=${employee_id} AND e.organization_id = ${organization_id} `;
            const employee = await SettingsModel.getEmployeefullDetails(condition);

            if (employee.length === 0) return res.json({ code: 400, data: null, message: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"], error: settingMessages.find(x => x.id === "3")[language] || settingMessages.find(x => x.id === "3")["en"] });
            employee[0].custom_tracking_rule = JSON.parse(employee[0].custom_tracking_rule);
            if (employee[0].tracking_rule_type === 3 || employee[0].tracking_rule_type === 1) {
                let trackingMode = employee[0].custom_tracking_rule.trackingMode;
                if (employee[0].custom_tracking_rule.tracking.projectBased != undefined) {
                    if (employee[0].custom_tracking_rule.tracking.projectBased.length > 0) {
                        let projectIdsArray = employee[0].custom_tracking_rule.tracking.projectBased;
                        const projectNamesArray = await SettingsModel.getProjects(projectIdsArray, organization_id);
                        employee[0].custom_tracking_rule['tracking'].projectBased = projectNamesArray.length ? projectNamesArray : [];
                    }
                }
                let tracking = employee[0].custom_tracking_rule.tracking;
                employee[0].custom_tracking_rule.tracking = { [trackingMode]: employee[0].custom_tracking_rule.tracking[trackingMode], ...tracking };
            }
            delete employee[0].password;
            // NOTE: previously stripped `tracking.domain.websiteBlockList` for orgs
            // in CUSTOM_BULK_WEB_BLOCKING so the per-employee list wouldn't show
            // alongside the group-level bulk list. But save() still accepted the
            // field and the UI still rendered it, so users could add entries that
            // would silently disappear on reload (see #201). The group-level
            // /group-web-blocking flow overwrites per-employee rules on its own
            // sync, so leaving the field intact is both safe and consistent.
            return res.json({ code: 200, data: employee[0], message: settingMessages.find(x => x.id === "6")[language] || settingMessages.find(x => x.id === "6")["en"], error: null });
        } catch (err) {
            Logger.error(`-V3---error-----${err}------${__filename}----`);
            res.json({ code: 400, data: null, message: settingMessages.find(x => x.id === "5")[language] || settingMessages.find(x => x.id === "5")["en"], error: err });
        }
    }

    async settingOptions(req, res) {
        const language = req.decoded.language;

        const data = {
            ption: "DropDown",
            data: {
                screenshotFrequency: [
                    { id: "2", name: translate(screenshotFrequency, "1_PER_HOUR", language), value: "1" },
                    { id: "3", name: translate(screenshotFrequency, "2_PER_HOUR", language), value: "2" },
                    { id: "4", name: translate(screenshotFrequency, "3_PER_HOUR", language), value: "3" },
                    { id: "5", name: translate(screenshotFrequency, "4_PER_HOUR", language), value: "4" },
                    { id: "6", name: translate(screenshotFrequency, "6_PER_HOUR", language), value: "6" },
                    { id: "7", name: translate(screenshotFrequency, "12_PER_HOUR", language), value: "12" },
                    { id: "8", name: translate(screenshotFrequency, "30_PER_HOUR", language), value: "30" },
                    { id: "9", name: translate(screenshotFrequency, "60_PER_HOUR", language), value: "60" },
                ],
                idleTime: [
                    { id: "1", name: translate(idleTime, "5_MIN", language), value: "5" },
                    { id: "2", name: translate(idleTime, "10_MIN", language), value: "10" },
                    { id: "3", name: translate(idleTime, "15_MIN", language), value: "15" },
                    { id: "4", name: translate(idleTime, "20_MIN", language), value: "20" },
                ],
                beakTime: [
                    { id: "1", name: translate(breakTime, "NO_BREAK_TIME", language), value: "0" },
                    { id: "2", name: translate(breakTime, "30_MIN", language), value: "30" },
                    { id: "3", name: translate(breakTime, "60_MIN", language), value: "60" }
                ],
                mobileGeoLocationFrequency: [
                    { id: "1", name: translate(mobileGeoLocationFrequency, "5_EVERY_MINUTE", language), value: "5" },
                    { id: "2", name: translate(mobileGeoLocationFrequency, "10_EVERY_MINUTE", language), value: "10" },
                    { id: "3", name: translate(mobileGeoLocationFrequency, "15_EVERY_MINUTE", language), value: "15" },
                    { id: "4", name: translate(mobileGeoLocationFrequency, "30_EVERY_MINUTE", language), value: "30" },
                    { id: "5", name: translate(mobileGeoLocationFrequency, "45_EVERY_MINUTE", language), value: "45" },
                    { id: "6", name: translate(mobileGeoLocationFrequency, "60_EVERY_MINUTE", language), value: "60" },
                ]
            }
        }
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_120_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "10", name: translate(screenshotFrequency, "120_PER_HOUR", language), value: "120" });
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_180_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "20", name: translate(screenshotFrequency, "180_PER_HOUR", language), value: "180" });
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_240_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "11", name: translate(screenshotFrequency, "240_PER_HOUR", language), value: "240" });
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_360_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "12", name: translate(screenshotFrequency, "360_PER_HOUR", language), value: "360" });
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_480_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "13", name: translate(screenshotFrequency, "480_PER_HOUR", language), value: "480" });
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_600_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "13", name: translate(screenshotFrequency, "600_PER_HOUR", language), value: "600" });
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_720_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "14", name: translate(screenshotFrequency, "720_PER_HOUR", language), value: "720" });
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_900_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "15", name: translate(screenshotFrequency, "900_PER_HOUR", language), value: "900" });
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_1200_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "16", name: translate(screenshotFrequency, "1200_PER_HOUR", language), value: "1200" });
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_1800_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "18", name: translate(screenshotFrequency, "1800_PER_HOUR", language), value: "1800" });
        if(configFile.CUSTOM_SCREENSHOT_FREQUENCY_3600_PER_HOUR.includes(req.decoded.organization_id)) data.data.screenshotFrequency.push({ id: "19", name: translate(screenshotFrequency, "3600_PER_HOUR", language), value: "3600" });
        actionsTracker(req, 'Settings options requested.');
        return res.json({ code: 200, data: data, message: settingMessages.find(x => x.id === "7")[language] || settingMessages.find(x => x.id === "7")["en"], error: null });
    }

    async groupWebBlocking(req, res) {
        try {
            let {organization_id} = req.decoded;
            let validate = SettingsValidation.groupWebBlockingValidation(req.body);
            if (validate.error) return res.json({ code: 200, error: validate.error.details[0].message, message: "Validation Error" });
            let { group_id, website, type } = validate.value;
            let data;
            if (group_id == 0) {
                data = await SettingsModel.checkIsDefaultTrackingGroup(organization_id);
            }
            else {
                data = await SettingsModel.checkIsCustomTrackingGroup(group_id);
            }
            if (data.length == 0) return res.json({code : 404, message: "Invalid Group Id", error: null});
            let rules = JSON.parse(data[0].rules);
            if (type === 1 ) {
                let webUrls = [...rules.tracking.domain.websiteBlockList, ...website];
                webUrls = _.unique(webUrls);
                if(webUrls.length > 1600) return res.json({code: 400, message: "Website URLs must not be more than 1600"});
                rules.tracking.domain.websiteBlockList = webUrls;
            }
            else {
                if(website.length > 1600) return res.json({code: 400, message: "Website URLs must not be more than 1600"});
                rules.tracking.domain.websiteBlockList = website;
            }
            let empIds = [];
            if (group_id == 0) {
                await SettingsModel.updateTrackingGroup(rules, data[0].id, 'organization_settings');
                let employeesDetail = await SettingsModel.getEmployeeDefaultGroup(organization_id);
                empIds = _.pluck(employeesDetail, 'id');
            }
            else {
                await SettingsModel.updateTrackingGroup(rules, group_id, 'organization_groups', organization_id);
                let employeesDetail = await SettingsModel.getEmployeeOrgGroup(organization_id, group_id);
                empIds = _.pluck(employeesDetail, 'id');
            }
            res.json({ code: 200, message: "Updated Successfully", error: null, data: null });
            if (empIds.length > 0) {
                await Model.updateEmplyeeSetting({ set: `custom_tracking_rule='${JSON.stringify(rules)}',	tracking_rule_type=${group_id == 0 ? 1 : 2}`, where: `id IN(${empIds})` })
            }
            updateRedis({empIds});
        }
        catch (err) {
            Logger.error(`-V3---error-----${err}-----groupWebBlocking-----`);
            return res.json({ code: 401, message: "Error", error: error.message, data: null });
        }
    }

    async getGroupWebBlocking (req, res) {
        try {
            let {organization_id} = req.decoded;
            let { group_id } = req.query;
            if (!group_id) return res.json({code : 400, error: "Group Id is required"});
            let data ;
            if (group_id == 0) {
                data = await SettingsModel.checkIsDefaultTrackingGroup(organization_id);
            }
            else {
                data = await SettingsModel.checkIsCustomTrackingGroup(group_id);
            }
            if (data.length == 0) return res.json({code : 404, message: "Invalid Group Id", error: null});
            let rules = JSON.parse(data[0].rules);
            return res.json({code : 200, data : rules.tracking.domain.websiteBlockList, error: null, message: "Data Successful"});
        } catch (error) {
            return res.json({code : 401, data : null, error: error.message, message: "Data not found"});
        }
    }

    async groupAppBlocking(req, res) {
        try {
            let {organization_id} = req.decoded;
            let validate = SettingsValidation.groupAppBlockingValidation(req.body);
            if (validate.error) return res.json({ code: 200, error: validate.error.details[0].message, message: "Validation Error" });
            let { group_id, application, type } = validate.value;
            let data;
            if (group_id == 0) {
                data = await SettingsModel.checkIsDefaultTrackingGroup(organization_id);
            }
            else {
                data = await SettingsModel.checkIsCustomTrackingGroup(group_id);
            }
            if (data.length == 0) return res.json({code : 404, message: "Invalid Group Id", error: null});
            let rules = JSON.parse(data[0].rules);
            if (type === 1 ) {
                if(rules.tracking.domain.appBlockList && typeof rules.tracking.domain.appBlockList == "string"){
                    rules.tracking.domain.appBlockList = rules.tracking.domain.appBlockList.split(',').filter(x => x);
                }
                let apps = [...(rules.tracking.domain.appBlockList || []), ...application];
                apps = _.unique(apps);
                if(apps.length > 1600) return res.json({code: 400, message: "Applications must not be more than 1600"});
                rules.tracking.domain.appBlockList = apps.join(',');
            }
            else {
                if(application.length > 1600) return res.json({code: 400, message: "Applications must not be more than 1600"});
                if(rules.tracking && rules.tracking.domain){
                    rules.tracking.domain.appBlockList = application.join(',');
                }
                else if(rules.tracking && !rules.tracking.domain){
                    rules.tracking.domain = {
                        appBlockList :  application.join(','),
                    }
                }
            }
            let empIds = [];
            if (group_id == 0) {
                await SettingsModel.updateTrackingGroup(rules, data[0].id, 'organization_settings');
                let employeesDetail = await SettingsModel.getEmployeeDefaultGroup(organization_id);
                empIds = _.pluck(employeesDetail, 'id');
            }
            else {
                await SettingsModel.updateTrackingGroup(rules, group_id, 'organization_groups', organization_id);
                let employeesDetail = await SettingsModel.getEmployeeOrgGroup(organization_id, group_id);
                empIds = _.pluck(employeesDetail, 'id');
            }
            res.json({ code: 200, message: "Updated Successfully", error: null, data: null });
            if (empIds.length > 0) {
                await Model.updateEmplyeeSetting({ set: `custom_tracking_rule='${JSON.stringify(rules)}',\ttracking_rule_type=${group_id == 0 ? 1 : 2}`, where: `id IN(${empIds})` })
            }
            updateRedis({empIds});
        }
        catch (err) {
            return res.json({ err })
        }
    }

    async getGroupAppBlocking (req, res) {
        try {
            let {organization_id} = req.decoded;
            let { group_id } = req.query;
            if (!group_id) return res.json({code : 400, error: "Group Id is required"});
            let data ;
            if (group_id == 0) {
                data = await SettingsModel.checkIsDefaultTrackingGroup(organization_id);
            }
            else {
                data = await SettingsModel.checkIsCustomTrackingGroup(group_id);
            }
            if (data.length == 0) return res.json({code : 404, message: "Invalid Group Id", error: null});
            let rules = JSON.parse(data[0].rules);
            if(rules?.tracking?.domain?.appBlockList && rules.tracking.domain.appBlockList != undefined){
                rules.tracking.domain.appBlockList = rules.tracking.domain.appBlockList.split(',').filter(x => x);
            }
            return res.json({code : 200, data : rules.tracking.domain.appBlockList || [], error: null, message: "Data Successful"});
        } catch (error) {
            return res.json({code : 401, data : null, error: error.message, message: "Data not found"});
        }
    }

    async getUninstallPassword(req, res) {
        try {
            let { organization_id, is_admin } = req.decoded;
            if (!is_admin) return res.json({ code: 401, data: null, error: "Unauthorize", message: "Invalid" });
            let [organizationUninstallData] = await SettingsModel.getOrganizationUninstallData(organization_id);
            if(organizationUninstallData.uninstall_password) organizationUninstallData.uninstall_password = passwordService.decrypt(organizationUninstallData.uninstall_password, process.env.CRYPTO_PASSWORD).decoded;
            return res.json({ code: 200, error: null, message: "Success", data: organizationUninstallData });
        } catch (error) {
            return res.json({ code: 401, data: null, error: error.message, message: "Data not found" });
        }
    }

    async updateUninstallPassword(req, res) {
        try {
            let { organization_id } = req.decoded;
            let { password } = req.body;
            if (password.length !== 0) password = passwordService.encrypt(password, process.env.CRYPTO_PASSWORD);
            else password = { encoded: null };
            await SettingsModel.updateOrganizationUninstallData(organization_id, password.encoded);
            return res.json({ code: 200, error: null, message: "Success", data: null });
        } catch (error) {
            return res.json({ code: 401, data: null, error: error.message, message: "Data not found" });
        }
    }
    async updateAgentNotificationStatus(req, res) {
        let { organization_id, language } = req.decoded;
        try {
            let validation = SettingsValidation.enableAgentNotification(req.body);
            if (validation.error) return res.json({ code: 404, data: null, error: validation?.error?.details[0]?.message, message: "Validation Error" });
            let { is_enable: status } = validation.value;
            await SettingsModel.updateAgentNotificationStatus(organization_id, status);
            res.json({ code: 200, status:status, message: "Data updated"});
        }
        catch (error) {
            return res.json({ code: 401, data: null, message: translate(settingMessages, "5", language) });
        }
    }
    
    async getAgentNotificationStatus(req, res) {
        let { organization_id, language } = req.decoded;
        try {
            const [statusData] = await SettingsModel.getAgentNotificationStatus(organization_id);
            res.json({ code: 200, status:statusData?.status, message: "Success"});
        }
        catch (error) {
            return res.json({ code: 401, data: null, message: translate(settingMessages, "5", language) });
        }
    }

}

module.exports = new Settings;

const updateRedis = async ({ empIds }) => {
    console.log(empIds);
    let i = empIds.length;
    while (i > 0) {
        i--;
        EventService.emit('update-employee-redis-data-by-employee_id', empIds[i]);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}