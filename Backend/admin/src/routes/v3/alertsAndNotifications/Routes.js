const router = require('express').Router();
const AuthMiddleware = require('../auth/services/auth.middleware');

const { Controller } = require('./Controller');

class Routes {
    constructor() {
        this.myRoutes = router;
        this.core();
    }

    core() {
        // Mutating routes are admin-only; reads stay available to authenticated
        // managers/team-leads (they are org-scoped in the controller).
        this.myRoutes.post('/', AuthMiddleware.adminOnly, Controller.create);
        this.myRoutes.put('/', AuthMiddleware.adminOnly, Controller.update);
        this.myRoutes.get('/', Controller.get);
        this.myRoutes.delete('/', AuthMiddleware.adminOnly, Controller.delete);
        this.myRoutes.get('/find-by', Controller.findBy);
        this.myRoutes.get('/alerts/find-by', Controller.alertsFindBy);
        this.myRoutes.put('/add-employee-to-rule', AuthMiddleware.adminOnly, Controller.addAllEmpToRule);
    }

    getRouters() {
        return this.myRoutes;
    }
}

module.exports.Routes = Routes;