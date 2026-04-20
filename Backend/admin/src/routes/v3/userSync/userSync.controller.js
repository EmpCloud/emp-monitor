'use strict';

const MySqlConnection = require('../../../database/MySqlConnection');
const db = MySqlConnection.getInstance();
const authModel = require('../auth/auth.model');
const { syncEmpCloudSeats } = require('../../../utils/helpers/EmpCloudSeatSync');
const passwordService = require('../auth/services/password.service');

// Defensive caps for the legacy emp-monitor users table. The schema dump
// shows varchar(64) for first_name/last_name, but production has historically
// had tighter limits in some installs. Trim to 60 to leave breathing room
// without silently dropping meaningful name characters.
const NAME_MAX = 60;
const trimName = (s) => {
    if (s == null) return '';
    const str = String(s).trim();
    return str.length > NAME_MAX ? str.slice(0, NAME_MAX) : str;
};

/**
 * POST /api/v3/users/sync — Create/update user from EmpCloud
 * Creates user + employee + role so they appear on the dashboard immediately.
 */
async function syncUser(req, res) {
    try {
        const expectedKey = process.env.MODULE_SYNC_API_KEY || process.env.EMP_CLOUD_SECRET_KEY || '';
        if (expectedKey) {
            const apiKey = req.headers['x-api-key'];
            if (!apiKey || apiKey !== expectedKey) {
                return res.status(401).json({ code: 401, message: 'Invalid API key' });
            }
        }

        const { empcloud_user_id, organization_id, email, emp_code, designation, role, password } = req.body;
        const first_name = trimName(req.body.first_name);
        const last_name = trimName(req.body.last_name);

        // Debug logging
        console.log('=== USER SYNC DEBUG ===');
        console.log('empcloud_user_id:', empcloud_user_id, 'type:', typeof empcloud_user_id);
        console.log('organization_id:', organization_id, 'type:', typeof organization_id);
        console.log('email:', email);
        console.log('Full payload:', JSON.stringify(req.body, null, 2));
        console.log('=====================');

        // Encrypt password if provided
        let encryptedPassword = null;
        if (password) {
            const { error, encoded } = passwordService.encrypt(password, process.env.CRYPTO_PASSWORD);
            if (!error) {
                encryptedPassword = encoded;
            } else {
                console.error('Sync: password encryption failed', error);
            }
        }

        // Strict validation - reject if any required field is missing or invalid
        if (!empcloud_user_id || empcloud_user_id <= 0) {
            return res.status(400).json({
                code: 400,
                message: 'empcloud_user_id is required and must be a positive number'
            });
        }
        if (!organization_id || organization_id <= 0) {
            return res.status(400).json({
                code: 400,
                message: 'organization_id is required and must be a positive number'
            });
        }
        if (!email) {
            return res.status(400).json({
                code: 400,
                message: 'email is required'
            });
        }

        // Check if user already exists by email
        const [existing] = await db.query(
            'SELECT u.id, u.email FROM users u WHERE u.email = ? LIMIT 1',
            [email]
        );

        if (existing) {
            // Update existing user
            const updateParams = [first_name || existing.first_name, last_name || existing.last_name, empcloud_user_id, email];
            let updateQuery = 'UPDATE users SET first_name = ?, last_name = ?, empcloud_user_id = ?, a_email = COALESCE(a_email, ?)';
            if (encryptedPassword) {
                updateQuery += ', password = ?';
                updateParams.push(encryptedPassword);
            }
            updateQuery += ', updated_at = NOW() WHERE id = ?';
            updateParams.push(existing.id);
            await db.query(updateQuery, updateParams);

            // Make sure employee record exists in the CORRECT monitor org
            // for this empcloud tenant. If the user was previously stranded
            // in a different org (legacy bug), re-point their employee row.
            const [existingEmp] = await db.query(
                'SELECT id, organization_id FROM employees WHERE user_id = ? LIMIT 1', [existing.id]
            );
            const { orgId: targetOrgId } = await authModel.getOrCreateMonitorOrgForEmpcloudOrg(organization_id, email);
            if (!existingEmp) {
                await createEmployeeRecord(existing.id, organization_id, email, role, emp_code);
            } else if (existingEmp.organization_id !== targetOrgId) {
                await db.query('UPDATE employees SET organization_id = ?, emp_code = ?, updated_at = NOW() WHERE id = ?', [targetOrgId, emp_code || '', existingEmp.id]);
                console.log('Sync: repointed employee', existingEmp.id, 'to org', targetOrgId);
            } else {
                // Update emp_code on sync
                await db.query('UPDATE employees SET emp_code = ?, updated_at = NOW() WHERE id = ?', [emp_code || '', existingEmp.id]);
            }

            // Also reconcile the role on update — the EmpCloud role may have changed
            await upsertUserRole(existing.id, targetOrgId, role);

            return res.json({ code: 200, message: 'User updated', data: { id: existing.id, email, empcloud_user_id } });
        }

        // Create new user (a_email must match email — the dashboard reads a_email)
        const createParams = [email, email, first_name, last_name, empcloud_user_id];
        let createQuery = `INSERT INTO users (email, a_email, first_name, last_name, empcloud_user_id`;
        if (encryptedPassword) {
            createQuery += ', password';
            createParams.push(encryptedPassword);  // ✅ Append at the end, not splice
        }
        createQuery += `, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?`;
        if (encryptedPassword) createQuery += ', ?';
        createQuery += `, 1, NOW(), NOW())`;

        const result = await db.query(createQuery, createParams);
        const newUserId = result.insertId;

        // Create employee + role so user shows on dashboard
        await createEmployeeRecord(newUserId, organization_id, email, role, emp_code);

        return res.json({ code: 201, message: 'User created', data: { id: newUserId, email, empcloud_user_id } });
    } catch (error) {
        console.error(
            'User sync error:',
            error && error.code,
            error && error.sqlMessage ? error.sqlMessage : error.message,
            'payload:',
            { email: req.body && req.body.email, first_name: req.body && req.body.first_name, last_name: req.body && req.body.last_name }
        );
        return res.status(500).json({ code: 500, message: 'Internal server error', error: error.message });
    }
}

/**
 * Map an EmpCloud role string to the matching emp-monitor role name.
 * EmpCloud uses lowercase tokens (employee/manager/hr_manager/admin/team_lead);
 * emp-monitor uses Title Case (Employee/Manager/Team Lead/Admin) seeded by
 * auth.model.js bootstrap. Unknown / missing → Employee (safe default).
 */
function mapEmpCloudRoleToMonitorName(empcloudRole) {
    if (!empcloudRole || typeof empcloudRole !== 'string') return 'Employee';
    const r = empcloudRole.trim().toLowerCase().replace(/[\s_-]+/g, '_');
    if (r === 'admin' || r === 'super_admin' || r === 'org_admin') return 'Admin';
    if (r === 'manager' || r === 'hr_manager' || r === 'people_manager') return 'Manager';
    if (r === 'team_lead' || r === 'teamlead' || r === 'lead') return 'Team Lead';
    return 'Employee';
}

/**
 * Resolve a roles row id by name (case-insensitive) within an org. Returns
 * null if no match — caller is responsible for the fallback.
 */
async function findRoleIdByName(monitorOrgId, roleName) {
    if (!roleName) return null;
    const [row] = await db.query(
        'SELECT id FROM roles WHERE organization_id = ? AND LOWER(name) = LOWER(?) LIMIT 1',
        [monitorOrgId, roleName]
    );
    return row ? row.id : null;
}

/**
 * Insert or update the user_role row so it points at the correct emp-monitor
 * role for the given EmpCloud role string. Falls back to Employee, then to
 * the org's lowest role id, so we never leave a synced user role-less.
 */
async function upsertUserRole(userId, monitorOrgId, empcloudRole) {
    const targetName = mapEmpCloudRoleToMonitorName(empcloudRole);
    let roleId = await findRoleIdByName(monitorOrgId, targetName);
    if (!roleId && targetName !== 'Employee') {
        roleId = await findRoleIdByName(monitorOrgId, 'Employee');
    }
    if (!roleId) {
        // Last resort: pick the LOWEST role id in this org (Employee is
        // typically the first one inserted) instead of the highest, which
        // was the legacy bug that made everyone a Team Lead.
        const [fallback] = await db.query(
            'SELECT id FROM roles WHERE organization_id = ? ORDER BY id ASC LIMIT 1',
            [monitorOrgId]
        );
        roleId = fallback ? fallback.id : null;
    }
    if (!roleId) {
        console.error('Sync: no role row found for org', monitorOrgId, '— skipping user_role insert');
        return;
    }

    const [existingRole] = await db.query(
        'SELECT id, role_id FROM user_role WHERE user_id = ? LIMIT 1', [userId]
    );
    if (!existingRole) {
        await db.query(
            'INSERT INTO user_role (user_id, role_id, created_by) VALUES (?, ?, ?)',
            [userId, roleId, userId]
        );
    } else if (existingRole.role_id !== roleId) {
        await db.query(
            'UPDATE user_role SET role_id = ? WHERE id = ?',
            [roleId, existingRole.id]
        );
    }
}

/**
 * Creates employee + user_role records for a user in the monitor org that
 * mirrors the caller's empcloud org. Auto-provisions the monitor org on
 * first use so every empcloud tenant gets its own isolated dashboard.
 */
async function createEmployeeRecord(userId, empcloudOrgId, ownerEmail, empcloudRole, empCode = '') {
    if (!empcloudOrgId) {
        console.error('Sync: empcloudOrgId missing, cannot route employee to correct org');
        return;
    }

    const { orgId: monitorOrgId } = await authModel.getOrCreateMonitorOrgForEmpcloudOrg(
        empcloudOrgId, ownerEmail || `org-${empcloudOrgId}@empcloud.local`
    );

    // Get default department
    const [dept] = await db.query(
        'SELECT id FROM organization_departments WHERE organization_id = ? LIMIT 1',
        [monitorOrgId]
    );

    // Get default location
    const [loc] = await db.query(
        'SELECT id FROM organization_locations WHERE organization_id = ? LIMIT 1',
        [monitorOrgId]
    );

    // Get default shift
    const [shift] = await db.query(
        'SELECT id FROM organization_shifts WHERE organization_id = ? LIMIT 1',
        [monitorOrgId]
    );

    // Create employee
    await db.query(
        `INSERT INTO employees
            (user_id, organization_id, department_id, location_id, shift_id, emp_code, timezone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'Asia/Kolkata', NOW(), NOW())`,
        [userId, monitorOrgId, dept ? dept.id : null, loc ? loc.id : null, shift ? shift.id : 0, empCode || '']
    );

    // Map the EmpCloud role to the matching emp-monitor role (Employee/
    // Manager/Team Lead/Admin) instead of always picking the last-inserted
    // role row, which was the bug that flagged every synced user as Team Lead.
    await upsertUserRole(userId, monitorOrgId, empcloudRole);

    // Recount and push used_seats to empcloud
    await syncEmpCloudSeats(monitorOrgId);

    console.log('Sync: created employee for user', userId, 'in org', monitorOrgId);
}

/**
 * DELETE /api/v3/users/sync/:empcloudUserId — Remove user from Monitor
 */
async function unsyncUser(req, res) {
    try {
        const expectedKey = process.env.MODULE_SYNC_API_KEY || process.env.EMP_CLOUD_SECRET_KEY || '';
        if (expectedKey) {
            const apiKey = req.headers['x-api-key'];
            if (!apiKey || apiKey !== expectedKey) {
                return res.status(401).json({ code: 401, message: 'Invalid API key' });
            }
        }

        const empcloudUserId = req.params.empcloudUserId;
        if (!empcloudUserId) {
            return res.status(400).json({ code: 400, message: 'empcloudUserId is required' });
        }

        const [user] = await db.query(
            'SELECT u.id, u.email, e.organization_id FROM users u LEFT JOIN employees e ON e.user_id = u.id WHERE u.empcloud_user_id = ? LIMIT 1',
            [empcloudUserId]
        );

        if (!user) {
            return res.status(404).json({ code: 404, message: 'User not found' });
        }

        // Fully unsync: remove the user from every table the dashboard joins
        // through. Previously this only flipped users.status = 0, which left
        // the employees + user_role rows behind — so the user vanished from
        // status-filtered queries but still appeared everywhere joined via
        // employees (org chart, attendance, productivity, etc.).
        //
        // Order matters: child rows first to avoid FK violations.
        await db.query('DELETE FROM user_role WHERE user_id = ?', [user.id]);
        await db.query('DELETE FROM employees WHERE user_id = ?', [user.id]);
        await db.query('DELETE FROM users WHERE id = ?', [user.id]);

        // Recount and push used_seats to empcloud
        if (user.organization_id) {
            await syncEmpCloudSeats(user.organization_id);
        }

        return res.json({ code: 200, message: 'User removed', data: { id: user.id, email: user.email } });
    } catch (error) {
        console.error('User unsync error:', error);
        return res.status(500).json({ code: 500, message: 'Internal server error', error: error.message });
    }
}

/**
 * GET /api/v3/users/sync/available
 */
async function getAvailableFromEmpCloud(req, res) {
    try {
        const orgId = req.decoded?.organization_id || req.query.organization_id;
        if (!orgId) return res.status(400).json({ code: 400, message: 'organization_id required' });

        const monitorUsers = await db.query(
            'SELECT u.empcloud_user_id FROM users u JOIN employees e ON e.user_id = u.id WHERE e.organization_id = ? AND u.empcloud_user_id IS NOT NULL',
            [orgId]
        );
        const rows = Array.isArray(monitorUsers) ? monitorUsers : [monitorUsers].filter(Boolean);
        const existingIds = new Set(rows.map(u => u?.empcloud_user_id));

        return res.json({ code: 200, data: { existing_empcloud_ids: [...existingIds] } });
    } catch (error) {
        console.error('Get available error:', error);
        return res.status(500).json({ code: 500, message: error.message });
    }
}

/**
 * POST /api/v3/users/sync/bulk
 */
async function bulkSyncUsers(req, res) {
    try {
        const expectedKey = process.env.MODULE_SYNC_API_KEY || process.env.EMP_CLOUD_SECRET_KEY || '';
        if (expectedKey) {
            const apiKey = req.headers['x-api-key'];
            if (!apiKey || apiKey !== expectedKey) {
                return res.status(401).json({ code: 401, message: 'Invalid API key' });
            }
        }

        const { users } = req.body;
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ code: 400, message: 'users[] array required' });
        }

        const results = [];

        for (const userData of users) {
            try {
                const { empcloud_user_id, organization_id, email, role, emp_code, password } = userData;
                const first_name = trimName(userData.first_name);
                const last_name = trimName(userData.last_name);
                if (!empcloud_user_id || !email) { results.push({ empcloud_user_id, status: 'skipped', error: 'Missing data' }); continue; }

                // Encrypt password if provided
                let encryptedPassword = null;
                if (password) {
                    const { error, encoded } = passwordService.encrypt(password, process.env.CRYPTO_PASSWORD);
                    if (!error) {
                        encryptedPassword = encoded;
                    }
                }

                const [existing] = await db.query(
                    'SELECT id FROM users WHERE email = ? LIMIT 1', [email]
                );

                if (existing) {
                    const updateParams = [empcloud_user_id, first_name || '', last_name || '', email];
                    let updateQuery = 'UPDATE users SET empcloud_user_id = ?, first_name = ?, last_name = ?, a_email = COALESCE(a_email, ?)';
                    if (encryptedPassword) {
                        updateQuery += ', password = ?';
                        updateParams.push(encryptedPassword);
                    }
                    updateQuery += ', updated_at = NOW() WHERE id = ?';
                    updateParams.push(existing.id);
                    await db.query(updateQuery, updateParams);

                    // Ensure employee exists
                    const [emp] = await db.query('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [existing.id]);
                    if (!emp) {
                        await createEmployeeRecord(existing.id, organization_id, email, role, emp_code);
                    } else {
                        // Update emp_code on sync
                        await db.query('UPDATE employees SET emp_code = ?, updated_at = NOW() WHERE id = ?', [emp_code || '', emp.id]);
                    }
                    // Reconcile role on every sync (handles role changes in EmpCloud)
                    const { orgId: targetOrgId } = await authModel.getOrCreateMonitorOrgForEmpcloudOrg(organization_id, email);
                    await upsertUserRole(existing.id, targetOrgId, role);
                    results.push({ empcloud_user_id, status: 'updated' });
                } else {
                    const createParams = [email, email, first_name || '', last_name || '', empcloud_user_id];
                    let createQuery = `INSERT INTO users (email, a_email, first_name, last_name, empcloud_user_id`;
                    if (encryptedPassword) {
                        createQuery += ', password';
                        createParams.push(encryptedPassword);  // ✅ Append at the end, not splice
                    }
                    createQuery += `, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?`;
                    if (encryptedPassword) createQuery += ', ?';
                    createQuery += `, 1, NOW(), NOW())`;

                    const insertResult = await db.query(createQuery, createParams);
                    await createEmployeeRecord(insertResult.insertId, organization_id, email, role, emp_code);
                    results.push({ empcloud_user_id, status: 'created' });
                }
            } catch (err) {
                results.push({ empcloud_user_id: userData.empcloud_user_id, status: 'error', error: err.message });
            }
        }

        return res.json({ code: 200, message: 'Bulk sync complete', data: results });
    } catch (error) {
        console.error('Bulk sync error:', error);
        return res.status(500).json({ code: 500, message: error.message });
    }
}

module.exports = { syncUser, unsyncUser, getAvailableFromEmpCloud, bulkSyncUsers };
