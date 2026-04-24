'use strict';
if (process.env.IS_DEBUGGING) console.log(__filename);

const Joi = require('joi');
if (typeof Joi.validate !== 'function') {
    Joi.validate = (value, schema, options) => schema.validate(value, options);
}
const HapiJoi = require('@hapi/joi');
if (typeof HapiJoi.validate !== 'function') {
    HapiJoi.validate = (value, schema, options) => schema.validate(value, options);
}

const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require("express-rate-limit");
const csurf = require("csurf");
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const swaggerDocument = require('./utils/swagger/swagger-json');
const Routes = require('./routes/Routes');
const MySqlSingelton = require('./database/MySqlConnection');
const Logger = require('./Logger').logger;
const fs = require('fs');
const fileStreamRotator = require('file-stream-rotator')
const logDir = __dirname + '/logger/responseLog';
const modules = require('./modules/alerts/Alerts');

const swaggerMiddleware = require('./utils/swagger/swagger.auth');

// Stream information for log name and frequency
let stream = fileStreamRotator.getStream({
    filename: path.join(logDir, '%DATE%-response.log'),
    frequency: 'daily',
    verbose: false,
    datePattern: 'YYYY-MM-DD',
    max_logs: "10d",
    size: "100M"
});

//For exception handling for runtime
process
    .on('unhandledRejection', (reason, p) => {
        Logger.error(`---unhandledRejection---${reason}---Unhandled Rejection at Promise--${p}---`);
    })
    .on('warning', (reason, p) => {
        Logger.error(`---warning---${reason}---warning message--${p}---`);
    })
    .on('uncaughtException', err => {
        Logger.error(`---uncaughtException---${err}---Uncaught Exception thrown---`);
        process.exit(1);
    });

class App {
    constructor() {
        // getting from process.env object, specified in .env file
        this.port = process.env.PORT;
        // express app initialization
        this.app = express();
    }

    /**
     * core method 
     * contains the basic logic of the perticular class
     * As per SOLID principle
     */
    core() {
        this.addRoutesAndMiddleWares(this.app);
        this.mongoConnection();
        this.listenToPort(this.app, this.port);
    }

    addRoutesAndMiddleWares(app) {
        // initializing body parser (bundled with express framework)
        // for reading req body
        app.use(express.json({ limit: '50mb' }), express.urlencoded({
            limit: '50mb',
            urlencoded: false,
            extended: true
        }));

        // Logger - Logging request in console
        app.use(morgan('dev'));

        // app.use(morgan({
        //     format: "[:date] :method :url :status :response-time ms",
        //     stream: fs.createWriteStream('./access.log', { flags: 'a' })
        // }));
        app.use(morgan(':method :url :status :res[content-length] :response-time ms', {
            stream: stream
        }))
        // Added security headers
        app.use(helmet());

        // handling DDOS attacks by stopeing req after specified time with specific req calls
        // app.use(new rateLimit({ windowMs: parseInt(process.env.RATE_LIMIT_DURATION) * 60 * 1000, max: parseInt(process.env.RATE_LIMIT_REQUEST_ALLOWED) }));

        // compressing res / req
        app.use(compression());

        // session management via cookies and in app storage
        app.use(cookieParser());
        // app.use(session({
        //     secret: process.env.SESSION_SECRET,
        //     resave: false,
        //     saveUninitialized: true,
        //     cookie: {
        //         secure: true
        //     }
        // }));
        //Set response header
        app.use(function (req, res, next) {
            res.set({
                'compress': true,
                'Conenction': 'keep-alive',
                'Keep-Alive': 'timeout=300'
            });
            next();
        });
        //Store satatic file
        app.use(express.static(path.join(__dirname, './../public/')));
        // egistering routes 
        // addign swagger for the above routes
        app.use('/api/v1/explorer',  swaggerUi.serve, (...args) => swaggerUi.setup(swaggerDocument)(...args));
        
        app.use('/api/v1', new Routes().getRouters());

        app.use('/api/custom/on-premise-report', (req, res) => {
            try {
                return res.status(200).json({ code : 200, message: "Success"});
            } catch (error) {
                return res.status(500).json({ code : 500, message: "Error"});
            }
        })

        if(!process.env.IS_ON_PREM) app.get('/', (req, res) => { res.send('success'); });
        else app.get('/', (req, res) => { res.redirect('/api/v3/explorer'); });
        
        // Comment Redirection
        // // default route handler
        // if (process.env.VERSION === 'V3')
        //     app.get('/', (req, res) => { res.redirect('/api/v3/explorer'); });
        // else
        //     app.get('/', (req, res) => { res.redirect('/api/v1/explorer'); });

        app.use(require('./middleware/error'));


        // enable csurf tokens
        // app.use(csurf());
    }

    mongoConnection() {
        const MongoDB = require('./database/MongoConnection');
        MongoDB.connect();
    }

    listenToPort(app, port) {
        // listen to certain port specified in .env file
        app.listen(port, () => console.log(`== Application started at ${port} ==`));
        // opening swagger UI on node server restart
        // open(`http://localhost:${port}/api/v1/explorer`);
    }
}

module.exports = App;
