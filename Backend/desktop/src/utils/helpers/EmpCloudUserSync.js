'use strict';

// Mirror auto-registered desktop-agent users into the EmpCloud users table.
// emp-monitor stores its own users keyed by a synthetic email; EmpCloud is
// the canonical HRMS and other modules (payroll, leave, attendance grid)
// resolve identity from there. Without a mirror row, an employee who first
// shows up via the desktop agent never appears in the EmpCloud directory
// and HR can't see them outside the monitoring module.

const mysql2 = require('mysql2/promise');
const mySql = require('../../database/MySqlConnection').getInstance();

// EmpCloud integration is opt-in. It is active only when its database
// connection is configured via env (EMPCLOUD_DB_HOST / _USER / _NAME). On
// standalone / on-premise deployments these are absent, so the seat-availability
// gate and the user mirror are skipped instead of blocking agent registration.
const EMPCLOUD_REQUIRED_ENV = ['EMPCLOUD_DB_HOST', 'EMPCLOUD_DB_USER', 'EMPCLOUD_DB_NAME'];
function isEmpCloudConfigured() {
    return EMPCLOUD_REQUIRED_ENV.every((key) => {
        const value = process.env[key];
        return typeof value === 'string' && value.trim() !== '';
    });
}

let empcloudPool;
function getEmpCloudPool() {
    if (!empcloudPool) {
        empcloudPool = mysql2.createPool({
            host: process.env.EMPCLOUD_DB_HOST || 'localhost',
            port: parseInt(process.env.EMPCLOUD_DB_PORT || '3306', 10),
            user: process.env.EMPCLOUD_DB_USER || 'empcloud',
            password: process.env.EMPCLOUD_DB_PASSWORD || 'EmpCloud2026',
            database: process.env.EMPCLOUD_DB_NAME || 'empcloud',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            connectTimeout: 5000,
        });
    }
    return empcloudPool;
}

// monitor.organizations.amember_id is the EmpCloud organizations.id. Cache
// the lookup briefly so a registration burst from one org doesn't hit the
// monitor DB N times for the same orgId.
const orgBridgeCache = new Map();
async function resolveEmpCloudOrgId(monitorOrgId) {
    if (!monitorOrgId) return null;
    const cached = orgBridgeCache.get(monitorOrgId);
    if (cached !== undefined) return cached;
    try {
        const [row] = await mySql.query(
            'SELECT amember_id FROM organizations WHERE id = ?',
            [monitorOrgId],
        );
        const empcloudOrgId = row && row.amember_id ? Number(row.amember_id) : null;
        orgBridgeCache.set(monitorOrgId, empcloudOrgId);
        // Expire after 5 minutes so a freshly-bridged org doesn't stay null.
        setTimeout(() => orgBridgeCache.delete(monitorOrgId), 5 * 60 * 1000);
        return empcloudOrgId;
    } catch (e) {
        console.log('resolveEmpCloudOrgId failed for monitor org', monitorOrgId, ':', e.message);
        return null;
    }
}

// Best-effort: create the EmpCloud users row that mirrors a freshly-
// registered emp-monitor user, then stamp its id back onto the monitor
// row's empcloud_user_id so EmpCloud's later Module Access syncs find
// the existing user instead of creating a duplicate.
//
// Fire-and-forget from the caller -- never throws, never blocks.
//
// params: { monitorOrgId, monitorUserId, firstName, lastName, email,
//           contactNumber, address, empCode }
async function mirrorMonitorUserToEmpCloud(params) {
    // EmpCloud not configured (e.g. on-premise) -> nothing to mirror.
    if (!isEmpCloudConfigured()) return false;
    const monitorOrgId = Number(params.monitorOrgId);
    const monitorUserId = Number(params.monitorUserId);
    const email = params.email ? String(params.email).trim() : '';
    if (!monitorOrgId || !email) return false;

    try {
        const empcloudOrgId = await resolveEmpCloudOrgId(monitorOrgId);
        if (!empcloudOrgId) {
            console.log(
                'mirrorMonitorUserToEmpCloud: monitor org',
                monitorOrgId,
                'has no amember_id; skipping mirror for',
                email,
            );
            return false;
        }

        const safeFirst = (params.firstName || 'User').toString().slice(0, 64);
        const safeLast = (params.lastName || '').toString().slice(0, 64);
        const safeEmail = email.slice(0, 128);
        const safeContact = params.contactNumber
            ? String(params.contactNumber).slice(0, 20)
            : null;
        const safeAddress = params.address ? String(params.address).slice(0, 512) : null;
        const safeEmpCode = params.empCode ? String(params.empCode).slice(0, 50) : null;

        // ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id) is the canonical
        // MySQL idiom for "insert or get the existing primary key in one
        // round-trip". On a fresh insert lastInsertId is the new id; on a
        // unique-email collision lastInsertId becomes the existing row's id
        // (because LAST_INSERT_ID() takes an arg and re-arms). Either way
        // we end up with the right empcloud user id to stamp back.
        const empcloudPool = getEmpCloudPool();
        const [result] = await empcloudPool.query(
            `INSERT INTO users
                (organization_id, first_name, last_name, email, contact_number,
                 address, emp_code, role, status, date_of_joining)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'employee', 1, CURDATE())
             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
            [empcloudOrgId, safeFirst, safeLast, safeEmail, safeContact, safeAddress, safeEmpCode],
        );
        const empcloudUserId = result && result.insertId ? Number(result.insertId) : 0;
        if (!empcloudUserId) {
            console.log(
                'mirrorMonitorUserToEmpCloud: insert returned no id for',
                email,
                '(this should not happen)',
            );
            return false;
        }

        // Stamp the EmpCloud user id back onto the monitor row so the
        // /api/v3/users/sync handler that EmpCloud calls during Module
        // Access enable/disable finds this user by empcloud_user_id and
        // updates rather than creating a duplicate.
        if (monitorUserId) {
            try {
                await mySql.query(
                    'UPDATE users SET empcloud_user_id = ? WHERE id = ? AND (empcloud_user_id IS NULL OR empcloud_user_id = 0)',
                    [empcloudUserId, monitorUserId],
                );
            } catch (linkErr) {
                console.log(
                    'mirrorMonitorUserToEmpCloud: stamp empcloud_user_id failed for monitor user',
                    monitorUserId,
                    ':',
                    linkErr.message,
                );
            }
        }
        return empcloudUserId;
    } catch (err) {
        console.log(
            'mirrorMonitorUserToEmpCloud failed for monitor org',
            monitorOrgId,
            'email',
            email,
            ':',
            err.message,
        );
        return false;
    }
}

// Check that the monitor org's empcloud subscription has seat capacity for
// one more user. Returns a result object so the caller can map to HTTP
// status codes without duplicating policy.
//
//   { ok: true,  totalSeats, usedSeats, status }
//   { ok: false, code: 'NO_BRIDGE',         status: 503, message: '...' }   // monitor org has no amember_id
//   { ok: false, code: 'EMPCLOUD_DOWN',     status: 503, message: '...' }   // upstream DB unreachable
//   { ok: false, code: 'NO_SUBSCRIPTION',   status: 503, message: '...' }   // no emp-monitor sub row found
//   { ok: false, code: 'SUSPENDED',         status: 403, message: '...' }   // billing suspended/deactivated
//   { ok: false, code: 'SEAT_LIMIT',        status: 403, message: '...' }   // already at total_seats
//
// Fail-closed policy: any inability to confirm seat availability blocks
// registration. The caller surfaces the message to the agent so the customer
// admin can resolve (top up seats / pay invoice / fix bridge).
async function checkEmpCloudSeatAvailability(monitorOrgId) {
    // EmpCloud not configured (e.g. on-premise) -> skip the seat gate so
    // registration proceeds normally instead of failing closed.
    if (!isEmpCloudConfigured()) {
        return { ok: true, skipped: true, status: 'disabled' };
    }
    const orgId = Number(monitorOrgId);
    if (!orgId) {
        return { ok: false, code: 'NO_BRIDGE', status: 503, message: 'Monitor org not found.' };
    }

    const empcloudOrgId = await resolveEmpCloudOrgId(orgId);
    if (!empcloudOrgId) {
        return {
            ok: false,
            code: 'NO_BRIDGE',
            status: 503,
            message: 'This organization is not linked to an EmpCloud subscription. Contact your administrator.',
        };
    }

    let subRow;
    try {
        const [rows] = await getEmpCloudPool().query(
            `SELECT s.total_seats, s.used_seats, s.status
               FROM org_subscriptions s
               JOIN modules m ON m.id = s.module_id
              WHERE s.organization_id = ?
                AND m.slug = 'emp-monitor'
              ORDER BY (s.status = 'active') DESC, (s.status = 'trial') DESC, s.id DESC
              LIMIT 1`,
            [empcloudOrgId],
        );
        subRow = rows && rows[0];
    } catch (e) {
        console.log('checkEmpCloudSeatAvailability: empcloud DB error for monitor org', orgId, ':', e.message);
        return {
            ok: false,
            code: 'EMPCLOUD_DOWN',
            status: 503,
            message: 'Subscription check temporarily unavailable. Please retry shortly.',
        };
    }

    if (!subRow) {
        return {
            ok: false,
            code: 'NO_SUBSCRIPTION',
            status: 503,
            message: 'No active EmpCloud Monitor subscription found for this organization. Contact your administrator.',
        };
    }

    const subStatus = String(subRow.status || '').toLowerCase();
    if (subStatus === 'suspended' || subStatus === 'deactivated' || subStatus === 'cancelled') {
        return {
            ok: false,
            code: 'SUSPENDED',
            status: 403,
            message: `Your EmpCloud Monitor subscription is ${subStatus}. Restore billing to add users.`,
        };
    }

    const totalSeats = Number(subRow.total_seats || 0);
    // Use the live count in the monitor DB rather than the cached used_seats
    // on org_subscriptions — that column lags until syncEmpCloudSeats runs.
    let currentCount;
    try {
        const [countRow] = await mySql.query(
            'SELECT COUNT(*) AS c FROM employees WHERE organization_id = ?',
            [orgId],
        );
        currentCount = countRow ? Number(countRow.c) : 0;
    } catch (e) {
        console.log('checkEmpCloudSeatAvailability: monitor count failed for org', orgId, ':', e.message);
        return {
            ok: false,
            code: 'EMPCLOUD_DOWN',
            status: 503,
            message: 'Subscription check temporarily unavailable. Please retry shortly.',
        };
    }

    if (totalSeats > 0 && currentCount >= totalSeats) {
        return {
            ok: false,
            code: 'SEAT_LIMIT',
            status: 403,
            message: `Seat limit reached (${currentCount}/${totalSeats}). Contact your administrator to upgrade.`,
            totalSeats,
            usedSeats: currentCount,
        };
    }

    return { ok: true, totalSeats, usedSeats: currentCount, status: subStatus };
}

module.exports = { mirrorMonitorUserToEmpCloud, getEmpCloudPool, checkEmpCloudSeatAvailability, isEmpCloudConfigured };
