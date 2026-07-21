'use strict';

const router = require('express').Router();
const { authenticateInternalService } = require('./internalService.middleware');
const Controller = require('./internalService.controller');

/**
 * Server-to-server read API for EmpCloud (AI chatbot + dashboard).
 * Auth: x-internal-service + x-internal-secret headers (see middleware).
 * Tenant: ?organization_id=<EmpCloud org id>, bridged via organizations.amember_id.
 */
class InternalServiceModule {
    constructor() {
        this.myRoutes = router;
        this.core();
    }

    core() {
        this.myRoutes.use(authenticateInternalService);
        this.myRoutes.get('/productivity-summary', Controller.getProductivitySummary);
        this.myRoutes.get('/top-apps', Controller.getTopApps);
        this.myRoutes.get('/ai-usage', Controller.getAiUsage);
        this.myRoutes.get('/usage', Controller.getUsage);
        this.myRoutes.get('/timesheet', Controller.getTimesheet);
        this.myRoutes.get('/keystrokes', Controller.getKeystrokes);
        this.myRoutes.get('/x-usage', Controller.getNamedUsage);
        this.myRoutes.get('*', (req, res) => res.status(404).json({
            code: 404,
            data: null,
            message: 'Not Found.',
            error: null
        }));
    }

    getRouters() {
        return this.myRoutes;
    }
}

module.exports = InternalServiceModule;
