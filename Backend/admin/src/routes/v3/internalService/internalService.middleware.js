'use strict';

const crypto = require('crypto');
const MySqlConnection = require('../../../database/MySqlConnection');
const db = MySqlConnection.getInstance();

/**
 * Server-to-server authentication for EmpCloud internal callers (AI chatbot,
 * dashboard fan-out). Mirrors the x-internal-service / x-internal-secret
 * convention used by the other emp-* modules.
 *
 * Unlike /internal-analytics (legacy, unauthenticated) this fails CLOSED:
 * no configured secret means no access at all.
 *
 * The caller identifies the tenant with ?organization_id=<EmpCloud org id>.
 * That id is bridged to the emp-monitor organization via organizations.amember_id
 * and attached to req.internalContext = { empcloudOrgId, monitorOrgId }.
 */

function timingSafeMatch(provided, expected) {
    const a = Buffer.from(String(provided));
    const b = Buffer.from(String(expected));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

async function authenticateInternalService(req, res, next) {
    try {
        const expectedSecret = process.env.INTERNAL_SERVICE_SECRET
            || process.env.MODULE_SYNC_API_KEY
            || process.env.EMP_CLOUD_SECRET_KEY
            || '';

        if (!expectedSecret) {
            return res.status(503).json({
                code: 503,
                data: null,
                message: 'Internal service access is not configured. Set INTERNAL_SERVICE_SECRET.',
                error: null
            });
        }

        const service = req.headers['x-internal-service'];
        const providedSecret = req.headers['x-internal-secret'];

        if (service !== 'empcloud-dashboard' || !providedSecret || !timingSafeMatch(providedSecret, expectedSecret)) {
            return res.status(401).json({
                code: 401,
                data: null,
                message: 'Unauthorized.',
                error: null
            });
        }

        const empcloudOrgId = parseInt(req.query.organization_id, 10);
        if (!empcloudOrgId || empcloudOrgId <= 0) {
            return res.status(400).json({
                code: 400,
                data: null,
                message: 'organization_id (EmpCloud organization id) query param is required.',
                error: null
            });
        }

        const [org] = await db.query(
            'SELECT id FROM organizations WHERE amember_id = ? LIMIT 1',
            [empcloudOrgId]
        );
        if (!org) {
            return res.status(404).json({
                code: 404,
                data: null,
                message: 'No emp-monitor organization is mapped to this EmpCloud organization.',
                error: null
            });
        }

        req.internalContext = { empcloudOrgId, monitorOrgId: org.id };
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = { authenticateInternalService };
