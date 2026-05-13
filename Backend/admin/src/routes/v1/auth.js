'use strict';

// =============================================================================
// EMP MONITOR — /api/v1/auth/admin
//
// Fresh password-based admin login that does NOT touch the legacy aMember /
// v3 flow. The user enters their EMP CLOUD credentials; we forward them to
// EmpCloud's own /auth/login endpoint and, if EmpCloud accepts, look up the
// matching emp-monitor admin by email and issue a normal emp-monitor JWT.
//
// The response shape is identical to the existing SSO success response
// (v3/auth.service.js around line 1196) so the frontend doesn't need any
// follow-up changes — it gets { code, data: <jwt>, user_id, organization_id,
// feature, role, ... } just like before.
//
// Failure modes:
//   - missing email / password                -> 400 Validation
//   - EmpCloud says credentials are wrong     -> 400 Invalid credentials
//   - EmpCloud up but email not in monitor DB -> 403 with explicit message
//   - EmpCloud unreachable                    -> 502 Upstream
//
// Required env vars:
//   EMPCLOUD_API_URL  default http://localhost:6001/api/v1
// =============================================================================

const express = require('express');
const axios = require('axios');
const moment = require('moment-timezone');

const authModel = require('../v3/auth/auth.model');
const redis = require('../v3/auth/services/redis.service');
const jwtService = require('../v3/auth/services/jwt.service');
const Comman = require('../../utils/helpers/Common');
const defaultSettings = require('../v3/auth/default.settings.json');
const mySql = require('../../database/MySqlConnection').getInstance();
const { syncEmpCloudSeats, getEmpCloudPool } = require('../../utils/helpers/EmpCloudSeatSync');

const router = express.Router();

// ---- Small helpers --------------------------------------------------------

const EMPCLOUD_API_URL = (process.env.EMPCLOUD_API_URL || 'http://localhost:6001/api/v1').replace(/\/+$/, '');
const EMPCLOUD_LOGIN_TIMEOUT_MS = 8000;

function validationFail(res, message) {
  return res.status(400).json({ code: 400, data: null, error: 'Validation', message });
}

/**
 * Call EmpCloud's password login endpoint and return a uniform result object.
 *
 *   { ok: true,  user: {...} }     — credentials accepted
 *   { ok: false, status, message } — EmpCloud rejected (wrong creds / locked)
 *   { ok: false, status: 0, message } — network / upstream error (502)
 */
async function loginAgainstEmpCloud(email, password) {
  try {
    const resp = await axios.post(
      `${EMPCLOUD_API_URL}/auth/login`,
      { email, password },
      {
        timeout: EMPCLOUD_LOGIN_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
        // Let us handle 4xx ourselves instead of axios throwing
        validateStatus: (s) => s < 500,
      },
    );

    if (resp.status >= 200 && resp.status < 300 && resp.data && resp.data.success) {
      return { ok: true, user: resp.data.data && resp.data.data.user };
    }
    const msg =
      (resp.data && resp.data.error && resp.data.error.message) ||
      (resp.data && resp.data.message) ||
      'Invalid email or password.';
    return { ok: false, status: resp.status, message: msg };
  } catch (err) {
    return { ok: false, status: 0, message: `EmpCloud login unreachable: ${err.message}` };
  }
}

/**
 * Look up an emp-monitor admin row by email. Uses the existing getAdmin()
 * model helper (which joins organizations + organization_settings + reseller)
 * so all downstream fields the response needs are populated in one query.
 */
async function findAdminByEmail(email) {
  // getAdmin's second arg is amember_id — empty string makes it email-only.
  const rows = await authModel.getAdmin(email, '');
  return rows && rows[0] ? rows[0] : null;
}

// ---- Route: POST /api/v1/auth/admin ---------------------------------------

router.post('/admin', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return validationFail(res, 'Email and password are required.');
    }

    // 1. Authenticate against EmpCloud — never trust our own password here.
    const cloud = await loginAgainstEmpCloud(email.trim(), password);
    if (!cloud.ok) {
      if (cloud.status === 0) {
        return res.status(502).json({
          code: 502,
          data: null,
          error: 'Upstream',
          message: cloud.message,
        });
      }
      return res.status(400).json({
        code: 400,
        data: null,
        error: 'Invalid',
        message: cloud.message || 'Invalid email or password.',
      });
    }

    // 2. Look the admin up in emp-monitor's own DB. We do NOT auto-provision
    //    here — on-the-fly org creation has non-trivial side effects (seat
    //    limits, feature flags, reseller mapping). If an EmpCloud user has no
    //    corresponding admin row, surface a clear error so an operator can
    //    create one manually (or trigger the SSO flow which already does
    //    auto-provisioning).
    let admin = await findAdminByEmail(email.trim());
    if (!admin) {
      return res.status(403).json({
        code: 403,
        data: null,
        error: 'NotProvisioned',
        message:
          'Your EmpCloud credentials are valid but no matching EmpMonitor admin account exists. Please contact your administrator to provision the account.',
      });
    }

    // 3. Fetch + sync license/subscription from EmpCloud — mirrors the 5
    //    steps the v3 SSO handler performs so v1 admin login produces the
    //    same Redis session state and monitor-side org row regardless of
    //    which login path the admin used.
    //
    //    Step 1: fetch org_subscriptions for emp-monitor module
    //    Step 2: tenant guard via getOrCreateMonitorOrgForEmpcloudOrg
    //    Step 3: update organizations.total_allowed_user_count
    //    Step 4: update organization_settings.rules.pack.expiry/begin_date
    //    Step 5: push live monitor user count back to empcloud.used_seats
    let licenseData = { total_seats: 100, used_seats: 0, begin_date: null, expire_date: null, status: 'active' };
    const empcloudOrgId = admin.amember_id ? Number(admin.amember_id) : null;
    if (empcloudOrgId) {
      try {
        const [subRows] = await getEmpCloudPool().query(
          `SELECT s.total_seats, s.used_seats, s.status,
                  s.current_period_start AS begin_date,
                  s.current_period_end AS expire_date
             FROM org_subscriptions s
             JOIN modules m ON m.id = s.module_id
            WHERE s.organization_id = ?
              AND m.slug = 'emp-monitor'
            ORDER BY (s.status = 'active') DESC, (s.status = 'trial') DESC, s.id DESC
            LIMIT 1`,
          [empcloudOrgId],
        );
        if (subRows && subRows.length > 0) {
          licenseData = subRows[0];
          console.log('[v1/auth/admin] license from empcloud — seats:',
            licenseData.total_seats, '/', licenseData.used_seats,
            'status:', licenseData.status,
            'period:', licenseData.begin_date, '->', licenseData.expire_date);
        } else {
          console.log('[v1/auth/admin] no emp-monitor subscription in empcloud for org', empcloudOrgId, '— using defaults');
        }
      } catch (e) {
        console.log('[v1/auth/admin] empcloud license fetch failed:', e.message, '— using defaults');
      }
    }

    // Block on suspended / deactivated / cancelled (allow past_due so the
    // admin can log in and fix the overdue invoice).
    const subStatus = String(licenseData.status || '').toLowerCase();
    if (subStatus === 'suspended' || subStatus === 'deactivated' || subStatus === 'cancelled') {
      return res.status(403).json({
        code: 403,
        data: null,
        error: 'SubscriptionInactive',
        message: `Your EmpCloud Monitor subscription is ${subStatus}. Restore billing to access the admin console.`,
      });
    }

    // Tenant guard — if the monitor admin's org no longer mirrors this
    // empcloud tenant, repoint them. Skipped in v1 by default (admin row
    // already exists with a fixed amember_id) but kept here for parity
    // with v3 SSO. Only runs when the helper is defined.
    let monitorOrgId = admin.organization_id;
    if (typeof authModel.getOrCreateMonitorOrgForEmpcloudOrg === 'function' && empcloudOrgId) {
      try {
        const { orgId: correctMonitorOrgId } = await authModel.getOrCreateMonitorOrgForEmpcloudOrg(
          empcloudOrgId,
          email.trim(),
          {
            timezone: admin.timezone || 'Asia/Kolkata',
            totalSeats: licenseData.total_seats || 100,
            beginDate: licenseData.begin_date ? moment(licenseData.begin_date).format('YYYY-MM-DD') : undefined,
            expireDate: licenseData.expire_date ? moment(licenseData.expire_date).format('YYYY-MM-DD') : undefined,
          },
        );
        if (correctMonitorOrgId && correctMonitorOrgId !== monitorOrgId) {
          console.log('[v1/auth/admin] tenant guard: admin stranded in wrong org', monitorOrgId, '→ repointing to', correctMonitorOrgId);
          monitorOrgId = correctMonitorOrgId;
        }
      } catch (e) {
        console.log('[v1/auth/admin] tenant guard skipped:', e.message);
      }
    }

    // Sync license fields onto the monitor org row.
    try {
      if (licenseData.total_seats) {
        await mySql.query(
          'UPDATE organizations SET total_allowed_user_count = ? WHERE id = ?',
          [licenseData.total_seats, monitorOrgId],
        );
      }
      if (licenseData.begin_date || licenseData.expire_date) {
        const [settRow] = await mySql.query(
          'SELECT rules FROM organization_settings WHERE organization_id = ?',
          [monitorOrgId],
        );
        if (settRow && settRow.rules) {
          let rules;
          try { rules = JSON.parse(settRow.rules); } catch { rules = null; }
          if (rules && rules.pack) {
            if (licenseData.expire_date) rules.pack.expiry = moment(licenseData.expire_date).format('YYYY-MM-DD');
            if (licenseData.begin_date) rules.pack.begin_date = moment(licenseData.begin_date).format('YYYY-MM-DD');
            await mySql.query(
              'UPDATE organization_settings SET rules = ? WHERE organization_id = ?',
              [JSON.stringify(rules), monitorOrgId],
            );
          }
        }
      }
      // Push live monitor user count → empcloud's used_seats column.
      const monitorUserCount = await syncEmpCloudSeats(monitorOrgId);
      console.log('[v1/auth/admin] synced — empcloud seats:', licenseData.total_seats, ', monitor users:', monitorUserCount);
    } catch (syncErr) {
      console.log('[v1/auth/admin] license sync warning (non-fatal):', syncErr.message);
    }

    // Refresh admin row so downstream JWT payload reflects any tenant repoint
    // or license-driven changes above.
    if (monitorOrgId !== admin.organization_id) {
      const refreshed = await findAdminByEmail(email.trim());
      if (refreshed) admin = refreshed;
    }

    // Existing expiry gate — kept after the sync so it reads the freshly
    // updated organization_settings.rules.pack.expiry. The empcloud
    // expire_date now flows through and takes precedence.
    let setting = {};
    try {
      setting = admin.rules ? JSON.parse(admin.rules) : {};
    } catch {
      setting = {};
    }
    const expiryRaw = setting.pack && setting.pack.expiry;
    if (expiryRaw) {
      const expiry = moment(expiryRaw).format('YYYY-MM-DD');
      const now = moment().format('YYYY-MM-DD');
      if (now > expiry) {
        return res.status(400).json({
          code: 400,
          data: null,
          error: 'Expired',
          message: 'Access denied — your package has expired. Contact support to renew.',
        });
      }
    } else if (!setting.pack) {
      // Missing rules JSON — fall back to defaults so login isn't permanently blocked
      setting = JSON.parse(JSON.stringify(defaultSettings));
    }

    const productive_hours =
      setting.productiveHours && setting.productiveHours.mode
        ? setting.productiveHours.mode === 'unlimited'
          ? 28800
          : Comman.hourToSeconds(setting.productiveHours.hour)
        : 28800;

    // 4. Build the emp-monitor JWT payload — same shape as v3 SSO success
    const adminJsonData = {
      organization_id: admin.organization_id,
      user_id: admin.id,
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email,
      is_manager: false,
      is_teamlead: false,
      is_employee: false,
      is_admin: true,
      language: admin.language || 'en',
      weekday_start: admin.weekday_start || 'monday',
      timezone: admin.timezone || 'Asia/Kolkata',
      productive_hours,
      productivity_data: setting.productiveHours || null,
    };

    const payload = { user_id: adminJsonData.user_id };

    // Cache the full admin session in Redis — same key + TTL as v3
    await redis.setAsync(
      adminJsonData.user_id,
      JSON.stringify({
        ...adminJsonData,
        permissionData: Array.from(Array(25).keys()).map((item) => item + 1),
      }),
      'EX',
      Comman.getTime(process.env.JWT_EXPIRY),
    );

    const accessToken = await jwtService.generateAccessToken(payload);
    const feature = await authModel.dashboardFeature();

    return res.status(200).json({
      code: 200,
      success: true,
      data: accessToken,
      user_name: admin.first_name,
      full_name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim(),
      email: admin.email,
      user_id: admin.id,
      u_id: admin.id,
      organization_id: admin.organization_id,
      is_admin: true,
      is_manager: false,
      is_teamlead: false,
      is_employee: false,
      role: 'Admin',
      role_id: null,
      photo_path: admin.photo_path || '',
      feature,
      message: 'Authenticated via EmpCloud',
      error: null,
      // Bonus: forward any useful profile data from EmpCloud that the UI
      // might want to display on first login. Never pass the password back.
      empcloud_user: cloud.user
        ? {
            id: cloud.user.id,
            email: cloud.user.email,
            role: cloud.user.role,
          }
        : undefined,
    });
  } catch (error) {
    console.error('[v1/auth/admin]', error);
    return res.status(500).json({
      code: 500,
      data: null,
      error: 'ServerError',
      message: error.message || 'Unexpected server error.',
    });
  }
});

module.exports = router;
