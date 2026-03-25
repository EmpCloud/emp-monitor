const router = require('express').Router();

const {Controller} = require('./Controller');

class Routes {
    constructor() {
        this.myRoutes = router;
        this.core();
    }
    
    core() {
        this.myRoutes.get('/users_activity', Controller.getUserActivityLog);
    }
    
    getRouters() {
        return this.myRoutes;
    }
}

module.exports.Routes = Routes;