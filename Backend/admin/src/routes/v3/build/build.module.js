'use strict';
const router = require('express').Router();
const buildController = require('./build.controller');
const AuthMiddleware = require('../auth/services/auth.middleware');
const Multer = require('multer')

let processFile = Multer({
    storage: Multer.memoryStorage(),
}).array('files');
class BuildModule {
    constructor() {
        this.routes = router;
        this.core();
    }

    core() {
        this.routes.post('/add', buildController.add);
        this.routes.post('/create', buildController.craeteBuild);
        this.routes.post('/add-onpremise', buildController.addOnPremise);
        this.routes.post('/upload-file', processFile, buildController.uploadFile);
        this.routes.get('/fetch-files',  AuthMiddleware.authenticate,buildController.fetchFiles);
    }

    getRouters() {
        return this.routes;
    }
}

module.exports = BuildModule;