'use strict';

const MySqlConnection = require('../../../database/MySqlConnection');
const db = MySqlConnection.getInstance();
const authModel = require('../auth/auth.model');

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

        const { empcloud_user_id, organization_id, email, first_name, last_name, emp_code, designation, role } = req.body;

        if (!empcloud_user_id || !organization_id || !email) {
            return res.status(400).json({ code: 400, message: 'empcloud_user_id, organization_id, and email are required' });
        }

        // Check if user already exists by email
        const [existing] = await db.query(
            'SELECT u.id, u.email FROM users u WHERE u.email = ? LIMIT 1',
            [email]
        );

        if (existing) {
            // Update existing user
            await db.query(
                'UPDATE users SET first_name = ?, last_name = ?, empcloud_user_id = ?, a_email = COALESCE(a_email, ?), updated_at = NOW() WHERE id = ?',
                [first_name || existing.first_name, last_name || existing.last_name, empcloud_user_id, email, existing.id]
            );

            // Make sure employee record exists in the CORRECT monitor org
            // for this empcloud tenant. If the user was previously stranded
            // in a different org (legacy bug), re-point their employee row.
            const [existingEmp] = await db.query(
                'SELECT id, organization_id FROM employees WHERE user_id = ? LIMIT 1', [existing.id]
            );
            const { orgId: targetOrgId } = await authModel.getOrCreateMonitorOrgForEmpcloudOrg(organization_id, email);
            if (!existingEmp) {
                await createEmployeeRecord(existing.id, organization_id, email);
            } else if (existingEmp.organization_id !== targetOrgId) {
                await db.query('UPDATE employees SET organization_id = ?, updated_at = NOW() WHERE id = ?', [targetOrgId, existingEmp.id]);
                console.log('Sync: repointed employee', existingEmp.id, 'to org', targetOrgId);
            }

            return res.json({ code: 200, message: 'User updated', data: { id: existing.id, email, empcloud_user_id } });
        }

        // Create new user (a_email must match email — the dashboard reads a_email)
        const result = await db.query(
            `INSERT INTO users (email, a_email, first_name, last_name, empcloud_user_id, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
            [email, email, first_name || '', last_name || '', empcloud_user_id]
        );
        const newUserId = result.insertId;

        // Create employee + role so user shows on dashboard
        await createEmployeeRecord(newUserId, organization_id, email);

        return res.json({ code: 201, message: 'User created', data: { id: newUserId, email, empcloud_user_id } });
    } catch (error) {
        console.error('User sync error:', error);
        return res.status(500).json({ code: 500, message: 'Internal server error', error: error.message });
    }
}

/**
 * Creates employee + user_role records for a user in the monitor org that
 * mirrors the caller's empcloud org. Auto-provisions the monitor org on
 * first use so every empcloud tenant gets its own isolated dashboard.
 */
async function createEmployeeRecord(userId, empcloudOrgId, ownerEmail) {
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
            (user_id, organization_id, department_id, location_id, shift_id, timezone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'Asia/Kolkata', NOW(), NOW())`,
        [userId, monitorOrgId, dept ? dept.id : null, loc ? loc.id : null, shift ? shift.id : 0]
    );

    // Assign default employee role (role_id 4 = employee in most monitor setups)
    const [empRole] = await db.query(
        'SELECT id FROM roles WHERE organization_id = ? ORDER BY id DESC LIMIT 1',
        [monitorOrgId]
    );
    const roleId = empRole ? empRole.id : 4;

    const [existingRole] = await db.query(
        'SELECT id FROM user_role WHERE user_id = ? LIMIT 1', [userId]
    );
    if (!existingRole) {
        await db.query(
            'INSERT INTO user_role (user_id, role_id, created_by) VALUES (?, ?, ?)',
            [userId, roleId, userId]
        );
    }

    // Update org user count
    await db.query(
        'UPDATE organizations SET current_user_count = current_user_count + 1 WHERE id = ?',
        [monitorOrgId]
    );

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

        // Deactivate user
        await db.query('UPDATE users SET status = 0, updated_at = NOW() WHERE id = ?', [user.id]);

        // Decrement org user count
        if (user.organization_id) {
            await db.query(
                'UPDATE organizations SET current_user_count = GREATEST(current_user_count - 1, 0) WHERE id = ?',
                [user.organization_id]
            );
        }

        return res.json({ code: 200, message: 'User deactivated', data: { id: user.id, email: user.email } });
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
                const { empcloud_user_id, organization_id, email, first_name, last_name } = userData;
                if (!empcloud_user_id || !email) { results.push({ empcloud_user_id, status: 'skipped', error: 'Missing data' }); continue; }

                const [existing] = await db.query(
                    'SELECT id FROM users WHERE email = ? LIMIT 1', [email]
                );

                if (existing) {
                    await db.query(
                        'UPDATE users SET empcloud_user_id = ?, first_name = ?, last_name = ?, a_email = COALESCE(a_email, ?), updated_at = NOW() WHERE id = ?',
                        [empcloud_user_id, first_name || '', last_name || '', email, existing.id]
                    );
                    // Ensure employee exists
                    const [emp] = await db.query('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [existing.id]);
                    if (!emp) await createEmployeeRecord(existing.id, organization_id, email);
                    results.push({ empcloud_user_id, status: 'updated' });
                } else {
                    const insertResult = await db.query(
                        `INSERT INTO users (email, a_email, first_name, last_name, empcloud_user_id, status, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
                        [email, email, first_name || '', last_name || '', empcloud_user_id]
                    );
                    await createEmployeeRecord(insertResult.insertId, organization_id, email);
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
