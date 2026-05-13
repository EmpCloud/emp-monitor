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
const passwordService = require('../v3/auth/services/password.service');
const Comman = require('../../utils/helpers/Common');
const defaultSettings = require('../v3/auth/default.settings.json');
const mySql = require('../../database/MySqlConnection').getInstance();

const router = express.Router();

// ---- Small helpers --------------------------------------------------------

const EMPCLOUD_API_URL = (process.env.EMPCLOUD_API_URL || 'http://localhost:6001/api/v1').replace(/\/+$/, '');
const EMPCLOUD_LOGIN_TIMEOUT_MS = 8000;
const ALLOW_LOCAL_V1_ADMIN_LOGIN = process.env.ALLOW_LOCAL_V1_ADMIN_LOGIN === 'true';

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

/**
 * Local self-hosted fallback for /api/v1/auth/admin.
 *
 * Some self-hosted deployments do not have EmpCloud available. In that case
 * we allow a normal local password check against the admin owner user row.
 */
async function loginAgainstLocalAdmin(email, password) {
  try {
    const [row] = await mySql.query(
      `SELECT u.id, u.password
       FROM users u
       JOIN organizations o ON o.user_id = u.id
       WHERE u.email = ? OR u.a_email = ?
       LIMIT 1`,
      [email, email],
    );

    if (!row || !row.password) {
      return { ok: false, status: 400, message: 'Invalid email or password.' };
    }

    const { decoded, error } = await passwordService.decrypt(row.password, process.env.CRYPTO_PASSWORD);
    if (error || decoded !== password) {
      return { ok: false, status: 400, message: 'Invalid email or password.' };
    }

    return { ok: true, user: { id: row.id, email } };
  } catch (err) {
    return { ok: false, status: 0, message: `Local admin login failed: ${err.message}` };
  }
}

// ---- Route: POST /api/v1/auth/admin ---------------------------------------

router.post('/admin', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return validationFail(res, 'Email and password are required.');
    }

    // 1. Authenticate against EmpCloud — never trust our own password here.
    let cloud = await loginAgainstEmpCloud(email.trim(), password);
    if (!cloud.ok && ALLOW_LOCAL_V1_ADMIN_LOGIN) {
      cloud = await loginAgainstLocalAdmin(email.trim(), password);
    }
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
    const admin = await findAdminByEmail(email.trim());
    if (!admin) {
      return res.status(403).json({
        code: 403,
        data: null,
        error: 'NotProvisioned',
        message:
          'Your EmpCloud credentials are valid but no matching EmpMonitor admin account exists. Please contact your administrator to provision the account.',
      });
    }

    // 3. Check plan expiry (matches the v3 adminAuth behavior)
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
