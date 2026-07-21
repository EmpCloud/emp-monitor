'use strict';

const Model = require('./internalService.model');

// All durations in the productivity rollups are seconds.
const toHours = (seconds) => Math.round((Number(seconds) || 0) / 3600 * 10) / 10;
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const MAX_DAYS = 31;
const RETENTION_DAYS = 165;

function ymd(date) {
    return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

/** [fromYmd, toYmd] covering the last N days (inclusive of today). */
function daysRange(days) {
    const now = new Date();
    const from = new Date(now.getTime() - (days - 1) * 24 * 3600 * 1000);
    return [ymd(from), ymd(now)];
}

function queryDateRange(req, res) {
    const parse = value => {
        const text = String(value || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
        const parsed = new Date(`${text}T00:00:00Z`);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const hasStart = req.query.start_date !== undefined;
    const hasEnd = req.query.end_date !== undefined;
    const start = parse(req.query.start_date);
    const end = parse(req.query.end_date);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const earliest = new Date(today);
    earliest.setUTCDate(earliest.getUTCDate() - (RETENTION_DAYS - 1));
    if (hasStart || hasEnd) {
        const inclusiveDays = start && end ? Math.floor((end.getTime() - start.getTime()) / 86400000) + 1 : 0;
        if (!start || !end || start > end || start < earliest || end > today || inclusiveDays > MAX_DAYS) {
            res.status(400).json({
                code: 400,
                data: null,
                message: 'EmpMonitor queries must use both valid dates within the last 165 days, cannot include future dates, and cannot exceed 31 days.',
                error: 'INVALID_DATE_RANGE'
            });
            return { errorSent: true };
        }
        return { startDate: String(req.query.start_date), endDate: String(req.query.end_date), fromYmd: ymd(start), toYmd: ymd(end) };
    }
    const requestedDays = req.query.days === undefined ? 30 : parseInt(req.query.days, 10);
    if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > MAX_DAYS || req.query.months !== undefined) {
        res.status(400).json({ code: 400, data: null, message: 'EmpMonitor days must be between 1 and 31; months-based ranges are not supported.', error: 'INVALID_DATE_RANGE' });
        return { errorSent: true };
    }
    const days = requestedDays;
    const [fromYmd, toYmd] = daysRange(days);
    const from = new Date(today.getTime() - (days - 1) * 86400000);
    return { startDate: from.toISOString().slice(0, 10), endDate: today.toISOString().slice(0, 10), fromYmd, toYmd };
}

const MAX_GROUP_USERS = 300;

/**
 * Resolve the optional scope params to monitor employee ids.
 *   empcloud_user_id=<id>          → one employee (scope 'employee')
 *   empcloud_user_ids=<id,id,...>  → a group, e.g. one department (scope 'group')
 *   neither                        → whole org (scope 'organization')
 * Returns { scope, employee, employeeIds, matched, requested } or
 * { errorSent: true } after replying when the target is not tracked.
 */
async function resolveScope(req, res) {
    const { monitorOrgId } = req.internalContext;

    const empcloudUserId = req.query.empcloud_user_id ? parseInt(req.query.empcloud_user_id, 10) : null;
    if (empcloudUserId) {
        const employee = await Model.resolveEmployee(monitorOrgId, empcloudUserId);
        if (!employee) {
            res.status(404).json({
                code: 404,
                data: null,
                message: 'This user is not tracked in emp-monitor (no synced employee record).',
                error: null
            });
            return { errorSent: true };
        }
        return { scope: 'employee', employee, employeeIds: [employee.employee_id] };
    }

    const idsParam = String(req.query.empcloud_user_ids || '').trim();
    if (idsParam) {
        const requestedIds = [...new Set(
            idsParam.split(',')
                .map(s => parseInt(s, 10))
                .filter(n => Number.isInteger(n) && n > 0)
        )].slice(0, MAX_GROUP_USERS);
        if (!requestedIds.length) {
            res.status(400).json({
                code: 400,
                data: null,
                message: 'empcloud_user_ids must be a comma-separated list of EmpCloud user ids.',
                error: null
            });
            return { errorSent: true };
        }
        const rows = await Model.resolveEmployees(monitorOrgId, requestedIds);
        if (!rows.length) {
            res.status(404).json({
                code: 404,
                data: null,
                message: 'None of the requested users are tracked in emp-monitor.',
                error: null
            });
            return { errorSent: true };
        }
        return {
            scope: 'group',
            employee: null,
            employeeIds: rows.map(r => r.employee_id),
            matched: rows.length,
            requested: requestedIds.length
        };
    }

    return { scope: 'organization', employee: null, employeeIds: null };
}

class InternalServiceController {

    /**
     * GET /internal-service/productivity-summary
     *   ?organization_id=<empcloud org> [&empcloud_user_id=<empcloud user>] [&months=3]
     * Month-by-month productivity rollup (org-wide or one employee).
     */
    async getProductivitySummary(req, res, next) {
        try {
            const range = queryDateRange(req, res);
            if (range.errorSent) return;
            const scope = await resolveScope(req, res);
            if (scope.errorSent) return;
            const rows = await Model.getMonthlyProductivity(
                req.internalContext.monitorOrgId,
                scope.employeeIds,
                range.fromYmd,
                range.toYmd
            );

            const monthly = rows.map(r => ({
                month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
                logged_hours: toHours(r.logged),
                productive_hours: toHours(r.productive),
                unproductive_hours: toHours(r.non_productive),
                neutral_hours: toHours(r.neutral),
                idle_hours: toHours(r.idle),
                break_hours: toHours(r.break_time),
                productivity_percent: pct(r.productive, r.logged),
                days_tracked: r.employee_days,
                employees_tracked: r.employees.length
            }));

            return res.json({
                code: 200,
                data: {
                    scope: scope.scope,
                    employee: scope.employee
                        ? {
                            empcloud_user_id: scope.employee.empcloud_user_id,
                            name: `${scope.employee.first_name || ''} ${scope.employee.last_name || ''}`.trim()
                        }
                        : null,
                    group_coverage: scope.scope === 'group'
                        ? { tracked_users: scope.matched, requested_users: scope.requested }
                        : undefined,
                    start_date: range.startDate,
                    end_date: range.endDate,
                    monthly
                },
                message: 'Productivity summary.',
                error: null
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /internal-service/top-apps
     *   ?organization_id=... [&empcloud_user_id=...] [&days=30] [&limit=10] [&type=app|website]
     * Top applications/websites by tracked time.
     */
    async getTopApps(req, res, next) {
        try {
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 25);
            const typeParam = String(req.query.type || '').toLowerCase();
            const appType = typeParam === 'app' ? 1 : typeParam === 'website' ? 2 : null;

            const range = queryDateRange(req, res);
            if (range.errorSent) return;
            const scope = await resolveScope(req, res);
            if (scope.errorSent) return;
            const rows = await Model.getTopApps(
                req.internalContext.monitorOrgId,
                scope.employeeIds,
                range.fromYmd,
                range.toYmd,
                limit,
                appType
            );

            return res.json({
                code: 200,
                data: {
                    scope: scope.scope,
                    group_coverage: scope.scope === 'group'
                        ? { tracked_users: scope.matched, requested_users: scope.requested }
                        : undefined,
                    start_date: range.startDate,
                    end_date: range.endDate,
                    items: rows.map(r => ({
                        name: r.name,
                        kind: r.application_type === 2 ? 'website' : r.application_type === 1 ? 'app' : 'unknown',
                        total_hours: toHours(r.total),
                        productive_hours: toHours(r.productive),
                        unproductive_hours: toHours(r.non_productive),
                        neutral_hours: toHours(r.neutral),
                        user_count: r.user_count
                    }))
                },
                message: 'Top apps and websites.',
                error: null
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /internal-service/ai-usage
     *   ?organization_id=... [&empcloud_user_id=...] [&days=30]
     * Usage of AI tools (ChatGPT, Claude, Copilot, Gemini, ...) tracked in this org.
     */
    async getAiUsage(req, res, next) {
        try {
            const range = queryDateRange(req, res);
            if (range.errorSent) return;
            const scope = await resolveScope(req, res);
            if (scope.errorSent) return;
            const result = await Model.getAiUsage(
                req.internalContext.monitorOrgId,
                scope.employeeIds,
                range.fromYmd,
                range.toYmd
            );

            const tools = result.tools.map(t => ({
                name: t.name,
                kind: t.application_type === 2 ? 'website' : t.application_type === 1 ? 'app' : 'unknown',
                total_hours: toHours(t.total_seconds),
                user_count: t.user_count
            }));

            return res.json({
                code: 200,
                data: {
                    scope: scope.scope,
                    group_coverage: scope.scope === 'group'
                        ? { tracked_users: scope.matched, requested_users: scope.requested }
                        : undefined,
                    start_date: range.startDate,
                    end_date: range.endDate,
                    total_ai_hours: Math.round(tools.reduce((s, t) => s + t.total_hours, 0) * 10) / 10,
                    tools
                },
                message: 'AI tool usage.',
                error: null
            });
        } catch (error) {
            next(error);
        }
    }

    async getUsage(req, res, next) {
        try {
            const range = queryDateRange(req, res);
            if (range.errorSent) return;
            const scope = await resolveScope(req, res);
            if (scope.errorSent) return;
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 25);
            const type = String(req.query.type || '').toLowerCase();
            const appType = type === 'app' ? 1 : type === 'website' ? 2 : null;
            const rows = await Model.getTopApps(req.internalContext.monitorOrgId, scope.employeeIds, range.fromYmd, range.toYmd, limit, appType);
            return res.json({ code: 200, data: { scope: scope.scope, start_date: range.startDate, end_date: range.endDate, items: rows.map(r => ({
                name: r.name, kind: r.application_type === 2 ? 'website' : 'app', total_hours: toHours(r.total),
                productive_hours: toHours(r.productive), unproductive_hours: toHours(r.non_productive), neutral_hours: toHours(r.neutral), user_count: r.user_count
            })) }, message: 'Usage summary.', error: null });
        } catch (error) { next(error); }
    }

    async getNamedUsage(req, res, next) {
        try {
            const name = String(req.query.name || '').trim();
            if (!name) return res.status(400).json({ code: 400, data: null, message: 'name is required.', error: null });
            const range = queryDateRange(req, res);
            if (range.errorSent) return;
            const scope = await resolveScope(req, res);
            if (scope.errorSent) return;
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
            const type = String(req.query.type || '').toLowerCase();
            const appType = type === 'app' ? 1 : type === 'website' ? 2 : null;
            const rows = await Model.getNamedUsage(req.internalContext.monitorOrgId, scope.employeeIds, range.fromYmd, range.toYmd, name, appType, limit);
            return res.json({ code: 200, data: { scope: scope.scope, name, start_date: range.startDate, end_date: range.endDate, items: rows.map(r => ({ ...r,
                total_hours: toHours(r.total_seconds), productive_hours: toHours(r.productive_seconds),
                unproductive_hours: toHours(r.unproductive_seconds), neutral_hours: toHours(r.neutral_seconds)
            })) }, message: 'Named usage summary.', error: null });
        } catch (error) { next(error); }
    }

    async getTimesheet(req, res, next) {
        try {
            const range = queryDateRange(req, res);
            if (range.errorSent) return;
            const scope = await resolveScope(req, res);
            if (scope.errorSent) return;
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
            const rows = await Model.getTimesheet(req.internalContext.monitorOrgId, scope.employeeIds, range.startDate, range.endDate, limit);
            return res.json({ code: 200, data: { scope: scope.scope, start_date: range.startDate, end_date: range.endDate, entries: rows }, message: 'Timesheet details.', error: null });
        } catch (error) { next(error); }
    }

    async getKeystrokes(req, res, next) {
        try {
            const range = queryDateRange(req, res);
            if (range.errorSent) return;
            const scope = await resolveScope(req, res);
            if (scope.errorSent) return;
            const rows = await Model.getKeystrokeSummary(req.internalContext.monitorOrgId, scope.employeeIds, range.startDate, range.endDate);
            return res.json({ code: 200, data: { scope: scope.scope, start_date: range.startDate, end_date: range.endDate, employees: rows, typed_content_included: false }, message: 'Aggregate keystroke counts.', error: null });
        } catch (error) { next(error); }
    }
}

module.exports = new InternalServiceController();
