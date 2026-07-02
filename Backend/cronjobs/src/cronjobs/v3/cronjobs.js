const cronJobs = require("cron").CronJob;
const EmailReportController = require("./emailreports/emailreports.controller");
const AppInfoController = require("./applicationinformation/appInfo.controller");
const CheckScreensAgeController = require('./checkScreensAge/checkScreensAge.controller');
const { ManualDeleteTempReportFiles } = require('./reportActivity');
const { CheckDataAgeController } = require('./checkDataAge/checkDataAge.controller');
const ExternalReportController = require("./externalReportCrons/index");

const restoreData = require("./FailedActivityRestore/index");

const checkOrganizationProviderCred = require('./checkOrganizationProviderCred/index').checkOrganizationProviderCredIsExpired;
const checkLateLoginBasedOnShift = require('./checkLateLoginShift/index').checkLateLoginBasedOnShift;
const ConfigFile = require("../../../../config/config");
const EventAlertEmailController = require('./eventAlertEmail/eventAlertEmail.controller');

// Run cron every hour
const sendEmailReport = new cronJobs(
    `*/30 * * * *`,
    EmailReportController.sendEmailReports,
    () => console.log("---Email report Cron complete---"),
    false,
    "Asia/Kolkata"
);
sendEmailReport.start();

// Run cron every Monday 9:59 AM Internal Email for Unproductivity
const sendUnProductiveEmailReport = new cronJobs(
    `00 10 * * MON`, // Updated for Mail Testing
    EmailReportController.sendUnProdMailReport,
    () => console.log("---Unproductivity Email report Cron complete---"),
    false,
    "Asia/Kolkata"
);
sendUnProductiveEmailReport.start();

// Run cron every day at 10 AM for email alerts on birthday
const sendBirthdayEventAlertMail = new cronJobs(
    `00 10 * * *`,
    EventAlertEmailController.sendEmailAlert,
    () => console.log("---Complete for Birthday event alert---"),
    false,
    "Asia/Kolkata"
);
sendBirthdayEventAlertMail.start();

const sendActivityLoginEmailReport = new cronJobs(
    `0 0 1 * *`, 
    EmailReportController.sendActivityLoginReport,
    () => console.log("---Activity login Email report Cron complete---"),
    false,
    "Asia/Kolkata"
);
sendActivityLoginEmailReport.start();

// Run croen every day at 23:59
const checkCloudStorage = new cronJobs(
    `59 23 * * *`,
    CheckScreensAgeController.autoDeleteOldScreens,
    () => console.log('---Check all screen storages---'),
    false,
    'Asia/Kolkata',
    // null,
    // true
);
checkCloudStorage.start();

//Application information setting on reddis
const appInfo = new cronJobs(
    `*/10 * * * *`,
    AppInfoController.applicationInformation,
    () => console.log('---Application information setting on redis done---'),
    false,
    'Asia/Kolkata'
);
appInfo.start();

// Report delete from temp folder, every hour
const ReportActivity = new cronJobs(
    process.env.REPORT_CRON,
    ManualDeleteTempReportFiles,
    () => console.log('---- Report Generated Deleted ----'),
    false,
    'Asia/Kolkata'
);
ReportActivity.start();

// Run cron every day at 1am
const checkUserActvityAge = new cronJobs(
    `0 1 * * *`,
    CheckDataAgeController.checkUserActivityAge,
    () => console.log("---User Activity Check Cron complete---"),
    false,
    "Asia/Kolkata"
);
checkUserActvityAge.start();

const sendExternalReport = new cronJobs(
    `*/30 * * * *`,
    // `*/30 * * * *`,
    ExternalReportController.generateData,
    () => console.log("---External API reporting Cron complete---"),
    false,
    "Asia/Kolkata"
);
sendExternalReport.start();

/* Check Late Login based on Shift */
// const checkShiftBasedLateLogin = new cronJobs(
//     ConfigFile.CUSTOM_AUTO_EMAIL_LATE_LOGIN_CRONJOBS_TIME_CRON,
//     checkLateLoginBasedOnShift,
//     () => console.log("---------------------End for Check Late Login based on Shift---------------------"),
//     false,
//     "Asia/Kolkata"
// );
// checkShiftBasedLateLogin.start();

/* To check and send mail to organization whose storage credentials are expired */
const checkOrganizationProviderCredIsExpired = new cronJobs(
    `0 1 * * *`, // “At 01:00.”  at IST
    checkOrganizationProviderCred,
    () => console.log("---------------------End for checking storage cred expiry---------------------"),
    false,
    "Asia/Kolkata"
);
checkOrganizationProviderCredIsExpired.start();

// Run cron every minute
const failedActivityRestore = new cronJobs(
    `* * * * *`,
    restoreData,
    () => console.log("---User Activity Check Cron complete---"),
    false,
    "Asia/Kolkata"
);

/* Check for active task and disable the task before midnight */
const taskDisabled = new cronJobs(
    "*/30 * * * *",
    ExternalReportController.taskDisabled,
    () => console.log("---End of task disable---"),
    false,
    "Asia/Kolkata"
);
taskDisabled.start();

const oneDiveCalendarSyncCron = new cronJobs(
    `*/30 * * * *`,
    ExternalReportController.oneDriveCalendarSync,
    () => console.log("---End of External Calendar Report Cron---"),
    false,
    "Asia/Kolkata"
);

oneDiveCalendarSyncCron.start();

class cronsController {
    async enableFailedCrons(req, res) {
        try {
            console.log("Started crons for enableFailedCrons");
            failedActivityRestore.start();
            // redis update
            await redis.setAsync("failedDataCronJobs", 1);
            await redis.setAsync("failedDataTry", 0);
            return res.send("Crons Started Sucessfully !");
        }
        catch (e) {
            return res.send("Error while starting crons !");
        }
    }
    async disableFailedCrons(req, res) {
        try {
            console.log("End crons for enableFailedCrons");
            failedActivityRestore.stop();
            // redis update
            await redis.setAsync("failedDataCronJobs", 0);
            await redis.setAsync("failedDataTry", 0);
            return res.send("Crons Stopped Successfully !");
        }
        catch (e) {
            return res.send("Error while stopping crons !");
        }
    }
}

module.exports = new cronsController;