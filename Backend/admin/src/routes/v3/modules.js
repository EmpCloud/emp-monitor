'use strict';
if (process.env.IS_DEBUGGING) console.log(__filename);

const router = require('express').Router();
const AuthModule = require('./auth/auth.module');
const BuilModule = require('./build/build.module');
const AuthMiddleware = require('./auth/services/auth.middleware');
const EmployeeRoutes = require('./employee/Routes');
const TimeSheetRoutes = require('./timesheet/Routes');
const SystemLogsRoutes = require('./systemLogs/Routes');
const ReportRoutes = require('./reports/Routes');
const UserActivityRoutes = require('./useractivity/useractivity.routes');
const ScreenshotRoutes = require('./screenshots/screenshot.routes');
const SettingsRoutes = require('./settings/settings.routes');
const OrganizationRoutes = require('./organization/organization.routes');
const StorageRoutes = require('./storage/Routes');
const LocationRoutes = require('./location/Routes');
const DepartmentRoutes = require('./department/Routes');
const DashboardRoutes = require('./dashboard/Routes');
const IpWhitelist = require('./whitelistIp/Routes');
const FirewallRoutes = require('./firewall/Routes');
const PwdRecoverRoutes = require('./pwdrecover/pwdrecover.routes');
const ProjectManagement = require('./internalProjectManagement/Routes');
const FirewallController = require('./firewall/Firewall.controller');
const { Routes: LogRoutes } = require('./logs/Routes');
const AIRoutes = require('./aiActivity/Routes');
const OrganizationBuild = require('./organizationBuild/Build.Routes');
const EmailReport = require('./reports/emailreport/emailReports.controller');
const { Routes: ShiftsRoutes } = require('./shifts/Routes');
const AIKeystokeRoutes = require('./aiKeystrokesActivity/Routes')
const { Routes: AlertsAndNotifications } = require('./alertsAndNotifications/Routes');
const SentimentalAnalysisRoutes = require('./aiSentimentalAnalysis/Routes');
const EmployeeNotificationRoutes = require('./employeeNotification/Routes');
const { Routes: UserPropertiesRoutes } = require('./userProperties/Routes');
const { Routes: Groups } = require('./settings/groups/groups.routes');
const FtpHttpProxy = require('./ftpHttpProxy/ftpHttpProxy.controller');
const SFtpHttpProxy = require('./sftp/sftp.controller');
const WebDAVHttpProxy = require('./webdav/webdav.controller');
const ReciveJobs = require('../../jobs/reciveJobs');
const FeedbackRoutes = require('./feedback/Routes');
const ApiService = require('./customerApiService/Router')
const WsNotificationRoutes = require('./wsNotification/Routes');
const TempFileRoutes = require('./tempFile/Routes');
const Hrms = require('./hrms/Routes');
const ExternalRoutes = require('./external/Routes');
const BiometricRoutes = require('./bioMetric/biometric.routes');
const AmemberModule = require('./amemberHook/router');

const DeleteRoute = require("./deleteOrgData/delOrganization.routes");
const UserSyncController = require('./userSync/userSync.controller');

const MobileModule = require('./mobile/mobile.module')

const InternalAnalyticsRoutes = require('./internalAnalytics/internalAnalytics.routes');
const APIManagementRoutes = require("./apiManagement/apiManagement.routes");
const AdminManagementRoutes = require("./admin/admin.routes");
const EmailMonitoringRoutes = require('./email-monitoring/routes');
class Modules {
    constructor() {
        this.modules = router;
        this.core();
    }

    core() {
        // Adding all the routes here
        this.modules.use('/auth', new AuthModule().getRouters());
        this.modules.use('/password', new PwdRecoverRoutes().getRouters());
        this.modules.use('/build', new BuilModule().getRouters());
        this.modules.post('/get-urls', FirewallController.getAllUrls);
        this.modules.post('/get-app-keystrokes', FirewallController.getAppKeyStokes);
        this.modules.post('/get-app-names', FirewallController.appNames);
        this.modules.post('/get-application-keystrokes', FirewallController.getApplicationKeystrokes);
        this.modules.get('/email-report/unsubscribe', EmailReport.unSubscribe);
        this.modules.get('/ftp-http-proxy', FtpHttpProxy.getFileFromFtp);
        this.modules.get('/sftp-http-proxy', SFtpHttpProxy.getFileFromFtp);
        this.modules.get('/webdav-http-proxy', WebDAVHttpProxy.getFileFromFtp);
        this.modules.use('/ai', new AIRoutes().getRouters());
        this.modules.use('/ai-keystokes', new AIKeystokeRoutes().getRouters());
        this.modules.use('/sentimental-analysis', new SentimentalAnalysisRoutes().getRouters());
        this.modules.use('/service', new ApiService().getRouters());
        this.modules.use('/bio-metric',new BiometricRoutes().getRouters());
        this.modules.use('/amember', new AmemberModule().getRouters());
        this.modules.use('/internal-analytics', new InternalAnalyticsRoutes().getRouters());



        this.modules.post('/jobs', ReciveJobs.ReciveJobs);
        this.modules.post('/process-rule', ReciveJobs.processRule);

        /**routes to handle web socket notification from other services */
        this.modules.use('/ws-notification', new WsNotificationRoutes().getRouters());

        /**routes to handle temp file opt from other services */
        this.modules.use('/temp', new TempFileRoutes().getRouters());

        this.modules.use('/mobile', new MobileModule().getRouters());
        
        // EmpCloud user sync (API key auth, no JWT required)
        this.modules.post('/users/sync', UserSyncController.syncUser);
        this.modules.post('/users/sync/bulk', UserSyncController.bulkSyncUsers);
        this.modules.delete('/users/sync/:empcloudUserId', UserSyncController.unsyncUser);

        this.modules.use(AuthMiddleware.authenticate);
        this.modules.get('/me', (req, res) => {
            res.json({ ...req.decoded })
        });
        this.modules.use('/employee', new EmployeeRoutes().getRouters());
        this.modules.use('/timesheet', new TimeSheetRoutes().getRouters());
        this.modules.use('/system-logs', new SystemLogsRoutes().getRouters());
        this.modules.use('/report', new ReportRoutes().getRouters());
        this.modules.use('/user', new UserActivityRoutes().getRouters());
        this.modules.use('/screenshot', new ScreenshotRoutes().getRouters());
        this.modules.use('/settings', new SettingsRoutes().getRouters());
        this.modules.use('/organization', new OrganizationRoutes().getRouters());
        this.modules.use('/storage', new StorageRoutes().getRouters());
        this.modules.use('/location', new LocationRoutes().getRouters());
        this.modules.use('/department', new DepartmentRoutes().getRouters());
        this.modules.use('/dashboard', new DashboardRoutes().getRouters());
        this.modules.use('/ip-whitelist', new IpWhitelist().getRouters());
        this.modules.use('/firewall', new FirewallRoutes().getRouters());
        this.modules.use('/project', new ProjectManagement().getRouters());
        this.modules.use('/logs', new LogRoutes().getRouters());
        this.modules.use('/organization-build', new OrganizationBuild().getRouters());
        this.modules.use('/organization-shift', new ShiftsRoutes().getRouters());
        this.modules.use('/alerts-and-notifications', new AlertsAndNotifications().getRouters());
        this.modules.use('/employeeNotification', new EmployeeNotificationRoutes().getRouters());
        this.modules.use('/user-properties', new UserPropertiesRoutes().getRouters());
        this.modules.use('/groups', new Groups().getRouters());
        this.modules.use('/feedback', new FeedbackRoutes().getRouters());
        this.modules.use('/hrms', new Hrms().getRouters());
        this.modules.use('/external', new ExternalRoutes().getRouters());

        this.modules.use('/delete', new DeleteRoute().getRouters());
        this.modules.use('/api-management', new APIManagementRoutes().getRouters());
        this.modules.use('/admin-management', new AdminManagementRoutes().getRouters());
        this.modules.use('/email-monitoring', new EmailMonitoringRoutes().getRoutes());
        this.modules.get('*', function (req, res) {
            res.json({
                code: 400,
                data: null,
                message: 'Not Found.',
                error: null
            });
        });
    }

    getRouters() {
        return this.modules;
    }
}

module.exports = Modules;