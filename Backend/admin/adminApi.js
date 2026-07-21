'use strict';
if (process.env.IS_DEBUGGING) console.log(`= server.js loaded => ${process.env.NODE_ENV} =`);

// configuring .env file 
// every varibale in .env will be available in process.env object 
const dotenv = require('dotenv');
const dotenvResult = dotenv.config();

// An inherited empty variable masks the value in .env because dotenv does
// not overwrite existing keys. Fill only missing/empty values while keeping
// every non-empty PM2 or container environment override authoritative.
if (dotenvResult.parsed) {
    for (const [key, value] of Object.entries(dotenvResult.parsed)) {
        if (process.env[key] === undefined || process.env[key] === '') {
            process.env[key] = value;
        }
    }
}

// initialising often used paths in Global
require('./src/utils/globalPaths');
const { multiWorker, scheduler } = require('./src/jobs');
const { WebSocketNotification } = require('./src/messages/WebSocketNotification');

// initialising app
const App = require('./src/App');
new App().core();

/**Alert will process when its enabled */
if (process.env.IS_ALERT_SERVICE_ENABLED == 'true') {
    multiWorker.start();
    scheduler.start();
}
if (process.env.PUSH_NOTIFICATION_TRANSPORT === 'websocket') {
    WebSocketNotification.start();
}
