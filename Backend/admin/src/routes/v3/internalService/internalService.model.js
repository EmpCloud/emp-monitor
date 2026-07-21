'use strict';

const MySqlConnection = require('../../../database/MySqlConnection');
const db = MySqlConnection.getInstance();
const EmpProductivityReportModel = require('../../../models/employee_productivity.schema');
const OrgAppWebModel = require('../../../models/organization_apps_web.schema');
const { EmployeeActivityModel } = require('../../../models/employee_activities.schema');

/**
 * Apps/sites counted as AI tools for the AI-usage report. Matched against
 * organization_apps_webs.name (stored lowercase). Extend as new tools appear.
 */
const AI_TOOL_PATTERN = /(chatgpt|chat\.openai|openai|claude|anthropic|gemini|bard|copilot|perplexity|midjourney|deepseek|grok|hugging\s?face|poe\.com|character\.ai|jasper|writesonic|notebooklm|stability\.ai|leonardo\.ai|mistral|ollama)/i;

class InternalServiceModel {

    /**
     * Map an EmpCloud user id to the emp-monitor employee row inside the
     * given monitor org. Returns null when the user was never synced or has
     * no employee record (e.g. desktop agent never registered).
     */
    async resolveEmployee(monitorOrgId, empcloudUserId) {
        const [row] = await db.query(
            `SELECT e.id AS employee_id, u.id AS user_id, u.first_name, u.last_name, u.empcloud_user_id
             FROM employees e
             JOIN users u ON u.id = e.user_id
             WHERE e.organization_id = ? AND u.empcloud_user_id = ?
             LIMIT 1`,
            [monitorOrgId, empcloudUserId]
        );
        return row || null;
    }

    /**
     * Map a set of EmpCloud user ids (e.g. one department's members) to
     * monitor employee ids. Users never synced/tracked simply drop out.
     */
    async resolveEmployees(monitorOrgId, empcloudUserIds) {
        if (!empcloudUserIds.length) return [];
        const placeholders = empcloudUserIds.map(() => '?').join(',');
        return db.query(
            `SELECT e.id AS employee_id, u.empcloud_user_id
             FROM employees e
             JOIN users u ON u.id = e.user_id
             WHERE e.organization_id = ? AND u.empcloud_user_id IN (${placeholders})`,
            [monitorOrgId, ...empcloudUserIds]
        );
    }

    /**
     * Month-bucketed sums over the nightly per-employee-per-day productivity
     * rollups. All durations are SECONDS. One source row = one employee-day.
     * employeeIds: null = whole org, array = only those monitor employee ids.
     */
    getMonthlyProductivity(monitorOrgId, employeeIds, fromYmd, toYmd) {
        const match = {
            organization_id: monitorOrgId,
            yyyymmdd: { $gte: fromYmd, $lte: toYmd }
        };
        if (employeeIds) match.employee_id = { $in: employeeIds };

        return EmpProductivityReportModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { year: '$year', month: '$month' },
                    logged: { $sum: '$logged_duration' },
                    productive: { $sum: '$productive_duration' },
                    non_productive: { $sum: '$non_productive_duration' },
                    neutral: { $sum: '$neutral_duration' },
                    idle: { $sum: '$idle_duration' },
                    break_time: { $sum: '$break_duration' },
                    employee_days: { $sum: 1 },
                    employees: { $addToSet: '$employee_id' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
    }

    /**
     * Top applications/websites by total tracked seconds over a date range,
     * with per-category (productive / non-productive / neutral / idle) splits.
     * appType: 1 = desktop app, 2 = website, null = both.
     */
    getTopApps(monitorOrgId, employeeIds, fromYmd, toYmd, limit, appType) {
        const match = {
            organization_id: monitorOrgId,
            yyyymmdd: { $gte: fromYmd, $lte: toYmd }
        };
        if (employeeIds) match.employee_id = { $in: employeeIds };

        const appMatch = {};
        if (appType) appMatch['applications.application_type'] = appType;

        const pipeline = [
            { $match: match },
            { $unwind: '$applications' }
        ];
        if (appType) pipeline.push({ $match: appMatch });
        pipeline.push(
            {
                $group: {
                    _id: '$applications.application_id',
                    total: { $sum: '$applications.total' },
                    productive: { $sum: '$applications.pro' },
                    non_productive: { $sum: '$applications.non' },
                    neutral: { $sum: '$applications.neu' },
                    idle: { $sum: '$applications.idle' },
                    application_type: { $max: '$applications.application_type' },
                    users: { $addToSet: '$employee_id' }
                }
            },
            { $sort: { total: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'organization_apps_webs',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'app'
                }
            },
            { $unwind: { path: '$app', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    name: { $ifNull: ['$app.name', 'unknown'] },
                    application_type: 1,
                    total: 1,
                    productive: 1,
                    non_productive: 1,
                    neutral: 1,
                    idle: 1,
                    user_count: { $size: '$users' }
                }
            }
        );

        return EmpProductivityReportModel.aggregate(pipeline);
    }

    /**
     * AI-tool usage: finds this org's tracked apps/sites whose name matches
     * the AI tool pattern, then sums tracked seconds + distinct users per tool.
     */
    async getAiUsage(monitorOrgId, employeeIds, fromYmd, toYmd) {
        const aiApps = await OrgAppWebModel
            .find({ organization_id: monitorOrgId, name: AI_TOOL_PATTERN })
            .select('_id name type')
            .lean();
        if (!aiApps.length) return { tools: [], app_count: 0 };

        const idsByKey = new Map(aiApps.map(a => [String(a._id), a]));
        const match = {
            organization_id: monitorOrgId,
            yyyymmdd: { $gte: fromYmd, $lte: toYmd }
        };
        if (employeeIds) match.employee_id = { $in: employeeIds };

        const rows = await EmpProductivityReportModel.aggregate([
            { $match: match },
            { $unwind: '$applications' },
            { $match: { 'applications.application_id': { $in: aiApps.map(a => a._id) } } },
            {
                $group: {
                    _id: '$applications.application_id',
                    total: { $sum: '$applications.total' },
                    users: { $addToSet: '$employee_id' }
                }
            },
            { $sort: { total: -1 } }
        ]);

        const tools = rows.map(r => {
            const app = idsByKey.get(String(r._id));
            return {
                name: app ? app.name : 'unknown',
                application_type: app ? app.type : 0,
                total_seconds: r.total,
                user_count: r.users.length
            };
        });
        return { tools, app_count: aiApps.length };
    }

    async getNamedUsage(monitorOrgId, employeeIds, fromYmd, toYmd, name, appType, limit) {
        const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const apps = await OrgAppWebModel.find({
            organization_id: monitorOrgId,
            name: { $regex: escaped, $options: 'i' },
            ...(appType ? { type: appType } : {})
        }).select('_id name type').limit(25).lean();
        if (!apps.length) return [];
        const appById = new Map(apps.map(a => [String(a._id), a]));
        const match = { organization_id: monitorOrgId, yyyymmdd: { $gte: fromYmd, $lte: toYmd } };
        if (employeeIds) match.employee_id = { $in: employeeIds };
        const rows = await EmpProductivityReportModel.aggregate([
            { $match: match }, { $unwind: '$applications' },
            { $match: { 'applications.application_id': { $in: apps.map(a => a._id) } } },
            { $group: {
                _id: { application_id: '$applications.application_id', employee_id: '$employee_id' },
                total: { $sum: '$applications.total' }, productive: { $sum: '$applications.pro' },
                non_productive: { $sum: '$applications.non' }, neutral: { $sum: '$applications.neu' }
            } },
            { $sort: { total: -1 } }, { $limit: limit }
        ]);
        const employeeMap = new Map();
        if (rows.length) {
            const placeholders = rows.map(() => '?').join(',');
            const ids = rows.map(r => r._id.employee_id);
            const users = await db.query(
                `SELECT e.id AS employee_id, u.empcloud_user_id, u.first_name, u.last_name
                 FROM employees e JOIN users u ON u.id=e.user_id
                 WHERE e.organization_id=? AND e.id IN (${placeholders})`, [monitorOrgId, ...ids]
            );
            users.forEach(u => employeeMap.set(Number(u.employee_id), u));
        }
        return rows.map(r => {
            const app = appById.get(String(r._id.application_id));
            const employee = employeeMap.get(Number(r._id.employee_id));
            return {
                name: app?.name || 'unknown', kind: app?.type === 2 ? 'website' : 'app',
                empcloud_user_id: employee?.empcloud_user_id || null,
                employee_name: employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : null,
                total_seconds: r.total, productive_seconds: r.productive,
                unproductive_seconds: r.non_productive, neutral_seconds: r.neutral
            };
        });
    }

    async getTimesheet(monitorOrgId, employeeIds, startDate, endDate, limit) {
        const params = [monitorOrgId, startDate, endDate];
        let employeeFilter = '';
        if (employeeIds) {
            if (!employeeIds.length) return [];
            employeeFilter = ` AND e.id IN (${employeeIds.map(() => '?').join(',')})`;
            params.push(...employeeIds);
        }
        params.push(limit);
        return db.query(
            `SELECT u.empcloud_user_id, u.first_name, u.last_name, e.emp_code,
                    DATE_FORMAT(ea.date,'%Y-%m-%d') AS date, ea.start_time, ea.end_time,
                    TIMESTAMPDIFF(SECOND,ea.start_time,ea.end_time) AS tracked_seconds
             FROM employees e JOIN users u ON u.id=e.user_id
             JOIN employee_attendance ea ON ea.employee_id=e.id
             WHERE e.organization_id=? AND ea.date BETWEEN ? AND ?${employeeFilter}
             ORDER BY ea.date DESC LIMIT ?`, params
        );
    }

    async getKeystrokeSummary(monitorOrgId, employeeIds, startDate, endDate) {
        const params = [monitorOrgId, startDate, endDate];
        let employeeFilter = '';
        if (employeeIds) {
            if (!employeeIds.length) return [];
            employeeFilter = ` AND e.id IN (${employeeIds.map(() => '?').join(',')})`;
            params.push(...employeeIds);
        }
        const attendance = await db.query(
            `SELECT ea.id AS attendance_id, e.id AS employee_id, u.empcloud_user_id, u.first_name, u.last_name
             FROM employees e JOIN users u ON u.id=e.user_id
             JOIN employee_attendance ea ON ea.employee_id=e.id
             WHERE e.organization_id=? AND ea.date BETWEEN ? AND ?${employeeFilter}`, params
        );
        if (!attendance.length) return [];
        const owner = new Map(attendance.map(r => [Number(r.attendance_id), r]));
        const rows = await EmployeeActivityModel.aggregate([
            { $match: { attendance_id: { $in: [...owner.keys()] } } },
            { $group: { _id: '$attendance_id', keystrokes_count: { $sum: '$keystrokes_count' } } }
        ]);
        const totals = new Map();
        for (const row of rows) {
            const employee = owner.get(Number(row._id));
            if (!employee) continue;
            const current = totals.get(employee.employee_id) || { empcloud_user_id: employee.empcloud_user_id, employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(), keystrokes_count: 0 };
            current.keystrokes_count += Number(row.keystrokes_count || 0);
            totals.set(employee.employee_id, current);
        }
        return [...totals.values()].sort((a, b) => b.keystrokes_count - a.keystrokes_count);
    }
}

module.exports = new InternalServiceModel();
