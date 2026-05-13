const common = require('../common');
const jobsCommon = require('../../jobsCommon');
const EmployeeModel = require('../../../../routes/v3/employee/Employee.model');
const { alert } = require('../../../../utils/helpers/LanguageTranslate');

const delayedJob = common.delayedJobs('DWT', 'DWTLessJob');

const configFile = require("../../../../../../config/config");

// When daily work time is less or greater than specified hours/minutes.

const processCondition = async ({ condition, attendance }) => {
    if (!attendance.shift.end) return;
    if (!['MNT', 'HUR'].includes(condition.type)) return;
    const { empId, attendanceId } = attendance;

    switch (condition.cmp_operator) {
        case '>':
        case '>=':
            if (!attendance.duration) break;
            const shiftDuration = attendance.shift.end - attendance.shift.start;
            const duration = jobsCommon.durationSeconds(condition);
            const diff = (attendance.duration - shiftDuration);
            if (diff > duration) {
                await jobsCommon.enqueue(
                    'sendAlertJob',
                    [
                        condition.notification_rule_id, condition.id, empId, attendanceId,
                        { type: condition.type, duration: attendance.duration },
                    ],
                );
            }
            break;
        case '<':
        case '<=':
            if (attendance.isNew) {
                const timestamp = attendance.shift.end * 1000;
                await delayedJob.add(timestamp, condition.notification_rule_id, condition.id, empId, attendanceId);
            }
            break;
    }
};

const ruleCreated = async (rule) => {
    await common.touchRuleEmployees(rule)(async ({ orgId, condition, empId, attendanceId }) => {
        const employee = await EmployeeModel.get(empId);
        const shiftModel = await employee.shift;
        if (!shiftModel) return;
        const shift = await shiftModel.timesByDate(new Date(), employee.timezone);
        const currentShift = { end: +shift.end / 1000 };
        const attendance = { orgId, empId, attendanceId, shift: currentShift, isNew: true };
        await processCondition({ condition, attendance });
    });
};

module.exports.ruleCreated = ruleCreated;
module.exports.ruleUpdated = async (rule) => {
    await delayedJob.deleteAll(rule.id);
    await ruleCreated(rule);
};
module.exports.ruleDeleted = async (rule) => {
    await delayedJob.deleteAll(rule.id);
};

module.exports.activityCreated = async (rule, attendance) => {
    for (const condition of rule.conditions) {
        await processCondition({ condition, attendance });
    }
};

class AlertHandler extends common.AlertHandlerBase {
    async getSubject() {
        const condition = await this.getCondition();
        const period = await this.getPeriod();
        const { language, id } = await this.getOrganization();
        if (configFile.CUSTOM_LATE_LOGIN_ALERT.includes(id)) {
            return (condition.cmp_operator === '<' || condition.cmp_operator === '<=') ? {
                en: alert["en"]["DWTMsgLess"].replace('empname', await this.getEmployeeName()).replace('cmd', period).replace('Employee', ''),
                ol: alert[language || "en"]["DWTMsgLess"].replace('empname', await this.getEmployeeName()).replace('cmd', period).replace('Employee', '')
            } : {
                en: alert["en"]["DWTMsgMore"].replace('empname', await this.getEmployeeName()).replace('cmd', period).replace('Employee', ''),
                ol: alert[language || "en"]["DWTMsgMore"].replace('empname', await this.getEmployeeName()).replace('cmd', period).replace('Employee', '')
            };
        }
        return (condition.cmp_operator === '<' || condition.cmp_operator === '<=') ? {
            en: alert["en"]["DWTMsgLess"].replace('empname', await this.getEmployeeName()).replace('cmd', period),
            ol: alert[language || "en"]["DWTMsgLess"].replace('empname', await this.getEmployeeName()).replace('cmd', period)
        } : {
                en: alert["en"]["DWTMsgMore"].replace('empname', await this.getEmployeeName()).replace('cmd', period),
                ol: alert[language || "en"]["DWTMsgMore"].replace('empname', await this.getEmployeeName()).replace('cmd', period)
            };
        // `Employee daily work time is less than ${period}.`
        // : `Employee daily work time is greater than ${period}.`;
    }

    async getMessage() {
        const condition = await this.getCondition();
        const period = await this.getPeriod();
        const { language, reseller_id, id } = await this.getOrganization();
        const { duration, type } = this.messageParams;
        let resellerEmail = null;
        if (reseller_id) {
            const { details } = await this.getReseller(reseller_id);
            resellerEmail = JSON.parse(details);
            resellerEmail = resellerEmail.admin_email;
        }
        if (configFile.CUSTOM_LATE_LOGIN_ALERT.includes(id)) {
            return (condition.cmp_operator === '<' || condition.cmp_operator === '<=') ? {
                from_email: resellerEmail ? resellerEmail : process.env.EMP_ALERT_ADMIN_EMAIL,
                en: alert["en"]["DWTMsgLess"].replace('empname', await this.getEmployeeName()).replace('cmd', period).replace('Employee', ''),
                ol: alert[language || "en"]["DWTMsgLess"].replace('empname', await this.getEmployeeName()).replace('cmd', period).replace('Employee', '')
            } : {
                from_email: resellerEmail ? resellerEmail : process.env.EMP_ALERT_ADMIN_EMAIL,
                en: alert["en"]["DWTMsgMore"].replace('empname', await this.getEmployeeName()).replace('cmd', period).replace('Employee', ''),
                ol: alert[language || "en"]["DWTMsgMore"].replace('empname', await this.getEmployeeName()).replace('cmd', period).replace('Employee', '')
            };
        };
        return (condition.cmp_operator === '<' || condition.cmp_operator === '<=') ? {
            from_email: resellerEmail ? resellerEmail : process.env.EMP_ALERT_ADMIN_EMAIL,
            en: alert["en"]["DWTMsgLess"].replace('empname', await this.getEmployeeName()).replace('cmd', period),
            ol: alert[language || "en"]["DWTMsgLess"].replace('empname', await this.getEmployeeName()).replace('cmd', period)
        } : {
                from_email: resellerEmail ? resellerEmail : process.env.EMP_ALERT_ADMIN_EMAIL,
                en: alert["en"]["DWTMsgMore"].replace('empname', await this.getEmployeeName()).replace('cmd', period),
                ol: alert[language || "en"]["DWTMsgMore"].replace('empname', await this.getEmployeeName()).replace('cmd', period)
            };
        // `Employee ${await this.getEmployeeName()} daily work time is less than ${period}.`
        //     : `Employee ${await this.getEmployeeName()} daily work time is greater than ${period}.`;
        // return `Employee ${await this.getEmployeeName()} daily work time is ${this.getPeriodHumanized(duration, type)}.`;
    }
}
module.exports.AlertHandler = AlertHandler;
