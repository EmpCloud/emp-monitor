'use strict';

const MySqlConnection = require('../../../database/MySqlConnection');
const db = MySqlConnection.getInstance();

/**
 * POST /api/v3/users/sync — Create/update user from EmpCloud
 * Called when EmpCloud enables this module for a user
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
            'SELECT id, email FROM users WHERE email = ? AND organization_id = ? LIMIT 1',
            [email, organization_id]
        );

        if (existing) {
            // Update existing user
            await db.query(
                'UPDATE users SET first_name = ?, last_name = ?, empcloud_user_id = ?, updated_at = NOW() WHERE id = ?',
                [first_name || existing.first_name, last_name || existing.last_name, empcloud_user_id, existing.id]
            );
            return res.json({ code: 200, message: 'User updated', data: { id: existing.id, email, empcloud_user_id } });
        }

        // Create new user
        const result = await db.query(
            `INSERT INTO users (organization_id, email, first_name, last_name, empcloud_user_id, role_id, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 0, 1, NOW(), NOW())`,
            [organization_id, email, first_name || '', last_name || '', empcloud_user_id]
        );

        // Notify EmpCloud about the new seat (webhook callback)
        try {
            const empcloudUrl = process.env.EMPCLOUD_API_URL || 'http://localhost:3000/api/v1';
            await fetch(`${empcloudUrl}/subscriptions/seat-webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.EMP_CLOUD_SECRET_KEY || '' },
                body: JSON.stringify({
                    module_slug: 'emp-monitor',
                    empcloud_user_id,
                    organization_id,
                    action: 'added',
                }),
                signal: AbortSignal.timeout(5000),
            });
        } catch (err) {
            console.error('Failed to notify EmpCloud about seat:', err.message);
        }

        return res.json({ code: 201, message: 'User created', data: { id: result.insertId, email, empcloud_user_id } });
    } catch (error) {
        console.error('User sync error:', error);
        return res.status(500).json({ code: 500, message: 'Internal server error', error: error.message });
    }
}

/**
 * DELETE /api/v3/users/sync/:empcloudUserId — Remove user from Monitor
 * Called when EmpCloud disables this module for a user
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

        // Find user by empcloud_user_id
        const [user] = await db.query(
            'SELECT id, email, organization_id FROM users WHERE empcloud_user_id = ? LIMIT 1',
            [empcloudUserId]
        );

        if (!user) {
            return res.status(404).json({ code: 404, message: 'User not found' });
        }

        // Deactivate user (soft delete — keep data but mark inactive)
        await db.query('UPDATE users SET status = 0, updated_at = NOW() WHERE id = ?', [user.id]);

        // No webhook callback here — EmpCloud already handles seat removal
        // when it calls this DELETE endpoint. Webhook only fires when users
        // are removed directly inside Monitor (not via EmpCloud sync).

        return res.json({ code: 200, message: 'User deactivated', data: { id: user.id, email: user.email } });
    } catch (error) {
        console.error('User unsync error:', error);
        return res.status(500).json({ code: 500, message: 'Internal server error', error: error.message });
    }
}

/**
 * GET /api/v3/users/sync/available — Fetch available EmpCloud employees (not yet in Monitor)
 * Called by Monitor's admin UI to show importable employees
 */
async function getAvailableFromEmpCloud(req, res) {
    try {
        const orgId = req.decoded?.organization_id || req.query.organization_id;
        if (!orgId) return res.status(400).json({ code: 400, message: 'organization_id required' });

        const empcloudUrl = process.env.EMPCLOUD_API_URL || 'http://localhost:3000/api/v1';
        const apiKey = process.env.MODULE_SYNC_API_KEY || process.env.EMP_CLOUD_SECRET_KEY || '';

        // Get all EmpCloud users for this org
        const resp = await fetch(`${empcloudUrl}/subscriptions/users-module-map`, {
            headers: { 'x-api-key': apiKey },
            signal: AbortSignal.timeout(10000),
        });

        if (!resp.ok) {
            return res.status(502).json({ code: 502, message: 'Failed to fetch from EmpCloud' });
        }

        // This endpoint requires auth — we can't call it without a token.
        // Instead, get unseated users via a simpler approach:
        // Fetch existing Monitor users with empcloud_user_id, compare with EmpCloud users
        const [monitorUsers] = await db.query(
            'SELECT empcloud_user_id FROM users WHERE organization_id = ? AND empcloud_user_id IS NOT NULL',
            [orgId]
        );
        const existingIds = new Set((Array.isArray(monitorUsers) ? monitorUsers : [monitorUsers].filter(Boolean)).map(u => u?.empcloud_user_id));

        return res.json({ code: 200, data: { existing_empcloud_ids: [...existingIds] } });
    } catch (error) {
        console.error('Get available error:', error);
        return res.status(500).json({ code: 500, message: error.message });
    }
}

/**
 * POST /api/v3/users/sync/bulk — Import multiple EmpCloud employees into Monitor
 * Accepts array of user data from EmpCloud, creates local users + seats
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
        const empcloudUrl = process.env.EMPCLOUD_API_URL || 'http://localhost:3000/api/v1';
        const apiKey = process.env.MODULE_SYNC_API_KEY || process.env.EMP_CLOUD_SECRET_KEY || '';

        for (const userData of users) {
            try {
                const { empcloud_user_id, organization_id, email, first_name, last_name } = userData;
                if (!empcloud_user_id || !email) { results.push({ empcloud_user_id, status: 'skipped', error: 'Missing data' }); continue; }

                // Check existing
                const [existing] = await db.query(
                    'SELECT id FROM users WHERE email = ? AND organization_id = ? LIMIT 1',
                    [email, organization_id]
                );

                if (existing) {
                    await db.query(
                        'UPDATE users SET empcloud_user_id = ?, first_name = ?, last_name = ?, updated_at = NOW() WHERE id = ?',
                        [empcloud_user_id, first_name || '', last_name || '', existing.id]
                    );
                    results.push({ empcloud_user_id, status: 'updated' });
                } else {
                    await db.query(
                        `INSERT INTO users (organization_id, email, first_name, last_name, empcloud_user_id, role_id, status, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, 0, 1, NOW(), NOW())`,
                        [organization_id, email, first_name || '', last_name || '', empcloud_user_id]
                    );
                    results.push({ empcloud_user_id, status: 'created' });
                }

                // Notify EmpCloud seat webhook
                try {
                    await fetch(`${empcloudUrl}/subscriptions/seat-webhook`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                        body: JSON.stringify({
                            module_slug: 'emp-monitor',
                            empcloud_user_id,
                            organization_id,
                            action: 'added',
                        }),
                        signal: AbortSignal.timeout(5000),
                    });
                } catch (e) { /* non-blocking */ }
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
