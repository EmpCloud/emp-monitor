import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { AdminLogin }    from './page/auth/admin-login'
import { Login }         from './page/auth/nonadmin-login'
import { EmployeeLogin } from './page/auth/employee-login'

// Admin pages
import Dashboard               from './page/protected/admin/dashboard'
import EmployeeDetails         from './page/protected/admin/employee-details'
import EmployeeComparison      from './page/protected/admin/employee-comparison'
import EmployeeAttendancePage  from './page/protected/admin/employee-attendance'
import EmployeeNotification    from './page/protected/admin/employee-notification'
import EmployeeInsights        from './page/protected/admin/employee-insights'
import EmployeeRealtimeInsights from './page/protected/admin/employee-realtime-insights'
import EmployeeProfile         from './page/protected/admin/employee-profile'
import TrackUserSettings       from './page/protected/admin/track-user-settings'
import { Timesheets }          from './page/protected/admin/timesheets'
import { Timeline }            from './page/protected/admin/timeline'
import { LiveMonitoring }      from './page/protected/admin/live-monitoring'
import { TimeClaim }           from './page/protected/admin/time-claim'
import { Clients }             from './page/protected/admin/clients'
import ReportsDownload         from './page/protected/admin/reports-download'
import ProductivityReport      from './page/protected/admin/productivity-report'
import AutoEmailReport         from './page/protected/admin/auto-email-report'
import WebAppUsage             from './page/protected/admin/web-app-usage'
import SystemActivityLog       from './page/protected/admin/system-activity-log'
import USBDetection            from './page/protected/admin/usb-detection'
import SystemLogs              from './page/protected/admin/system-logs'
import ScreenShotLogs          from './page/protected/admin/screenshot-logs'
import EmailActivityLogs       from './page/protected/admin/email-activity-logs'
import PrintLogs               from './page/protected/admin/print-logs'
import LocationDepartment      from './page/protected/admin/location-department'
import StorageTypes            from './page/protected/admin/storage-types'
import ProductivityRules       from './page/protected/admin/productivity-rules'
import RolesPermissions        from './page/protected/admin/roles-permissions'
import ShiftManagement         from './page/protected/admin/shift-management'
import MonitoringControl       from './page/protected/admin/monitoring-control'
import Localization            from './page/protected/admin/localization'
import Alerts                  from './page/protected/admin/alerts'
import AlertPolicies           from './page/protected/admin/alert-policies'
import AlertNotification       from './page/protected/admin/alert-notification'
import MobileTaskClients       from './page/protected/admin/mobile-task-clients'
import MobileTaskDetails       from './page/protected/admin/mobile-task-details'
import MobileTaskGeolocation   from './page/protected/admin/mobile-task-geolocation'
import ResellerDashboard       from './page/protected/admin/reseller-dashboard'
import ResellerSettings        from './page/protected/admin/reseller-settings'

// Non-admin pages
import NonAdminDashboard          from './page/protected/non-admin/dashboard'
import NonAdminEmployeeDetails    from './page/protected/non-admin/employee-details'
import NonAdminEmployeeAttendance from './page/protected/non-admin/employee-attendance'
import NonAdminEmployeeInsights   from './page/protected/non-admin/employee-insights'
import NonAdminTimesheets         from './page/protected/non-admin/timesheets'
import NonAdminTimeClaim          from './page/protected/non-admin/time-claim'
import NonAdminLiveMonitoring     from './page/protected/non-admin/live-monitoring'
import NonAdminReportsDownload    from './page/protected/non-admin/reports-download'
import NonAdminProductivityReport from './page/protected/non-admin/productivity-report'
import NonAdminAutoEmailReport    from './page/protected/non-admin/auto-email-report'
import NonAdminWebAppUsage        from './page/protected/non-admin/web-app-usage'
import NonAdminUSBDetection       from './page/protected/non-admin/usb-detection'
import NonAdminEmailActivityLogs  from './page/protected/non-admin/email-activity-logs'
import NonAdminLocationDepartment from './page/protected/non-admin/location-department'
import NonAdminStorageTypes       from './page/protected/non-admin/storage-types'
import NonAdminProductivityRules  from './page/protected/non-admin/productivity-rules'
import NonAdminRolesPermissions   from './page/protected/non-admin/roles-permissions'
import NonAdminShiftManagement    from './page/protected/non-admin/shift-management'
import NonAdminMonitoringControl  from './page/protected/non-admin/monitoring-control'
import NonAdminLocalization       from './page/protected/non-admin/localization'
import NonAdminAlerts             from './page/protected/non-admin/alerts'
import NonAdminAlertPolicies      from './page/protected/non-admin/alert-policies'
import NonAdminAlertNotification  from './page/protected/non-admin/alert-notification'

// Employee pages
import EmployeeDashboard from './page/protected/employee/dashboard'
import EmployeeTimeClaim from './page/protected/employee/time-claim'

// Protected route guards
import { AdminProtectedRoute, NonAdminProtectedRoute, EmployeeProtectedRoute } from './router/protected-routes'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public auth routes ── */}
        <Route path="/admin-login"    element={<AdminLogin />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/employee-login" element={<EmployeeLogin />} />

        {/* ── Admin routes ── */}
        <Route path="/admin/dashboard"                   element={<AdminProtectedRoute><Dashboard /></AdminProtectedRoute>} />
        <Route path="/admin/employee-details"            element={<AdminProtectedRoute><EmployeeDetails /></AdminProtectedRoute>} />
        <Route path="/admin/get-employee-details"        element={<AdminProtectedRoute><EmployeeProfile /></AdminProtectedRoute>} />
        <Route path="/admin/comparison"                  element={<AdminProtectedRoute><EmployeeComparison /></AdminProtectedRoute>} />
        <Route path="/admin/attendance"                  element={<AdminProtectedRoute><EmployeeAttendancePage /></AdminProtectedRoute>} />
        <Route path="/admin/notification"                element={<AdminProtectedRoute><EmployeeNotification /></AdminProtectedRoute>} />
        <Route path="/admin/insights"                    element={<AdminProtectedRoute><EmployeeInsights /></AdminProtectedRoute>} />
        <Route path="/admin/realtime"                    element={<AdminProtectedRoute><EmployeeRealtimeInsights /></AdminProtectedRoute>} />
        <Route path="/admin/track-user-settings"         element={<AdminProtectedRoute><TrackUserSettings /></AdminProtectedRoute>} />
        <Route path="/admin/timesheets"                  element={<AdminProtectedRoute><Timesheets /></AdminProtectedRoute>} />
        <Route path="/admin/timeline"                    element={<AdminProtectedRoute><Timeline /></AdminProtectedRoute>} />
        <Route path="/admin/livemonitoring"              element={<AdminProtectedRoute><LiveMonitoring /></AdminProtectedRoute>} />
        <Route path="/admin/timeclaim"                   element={<AdminProtectedRoute><TimeClaim /></AdminProtectedRoute>} />
        <Route path="/admin/clients"                     element={<AdminProtectedRoute><Clients /></AdminProtectedRoute>} />
        <Route path="/admin/reports/download"            element={<AdminProtectedRoute><ReportsDownload /></AdminProtectedRoute>} />
        <Route path="/admin/reports/productivity"        element={<AdminProtectedRoute><ProductivityReport /></AdminProtectedRoute>} />
        <Route path="/admin/reports/autoemail"           element={<AdminProtectedRoute><AutoEmailReport /></AdminProtectedRoute>} />
        <Route path="/admin/reports/webappusage"         element={<AdminProtectedRoute><WebAppUsage /></AdminProtectedRoute>} />
        <Route path="/admin/reports/systemactivitylog"   element={<AdminProtectedRoute><SystemActivityLog /></AdminProtectedRoute>} />
        <Route path="/admin/dlp/usb"                     element={<AdminProtectedRoute><USBDetection /></AdminProtectedRoute>} />
        <Route path="/admin/dlp/systemlogs"              element={<AdminProtectedRoute><SystemLogs /></AdminProtectedRoute>} />
        <Route path="/admin/dlp/screenshotlogs"          element={<AdminProtectedRoute><ScreenShotLogs /></AdminProtectedRoute>} />
        <Route path="/admin/dlp/emailactivitylogs"       element={<AdminProtectedRoute><EmailActivityLogs /></AdminProtectedRoute>} />
        <Route path="/admin/dlp/printlogs"               element={<AdminProtectedRoute><PrintLogs /></AdminProtectedRoute>} />
        <Route path="/admin/settings/location"           element={<AdminProtectedRoute><LocationDepartment /></AdminProtectedRoute>} />
        <Route path="/admin/settings/storage"            element={<AdminProtectedRoute><StorageTypes /></AdminProtectedRoute>} />
        <Route path="/admin/settings/productivity"       element={<AdminProtectedRoute><ProductivityRules /></AdminProtectedRoute>} />
        <Route path="/admin/settings/roles"              element={<AdminProtectedRoute><RolesPermissions /></AdminProtectedRoute>} />
        <Route path="/admin/settings/shift"              element={<AdminProtectedRoute><ShiftManagement /></AdminProtectedRoute>} />
        <Route path="/admin/settings/monitoring"         element={<AdminProtectedRoute><MonitoringControl /></AdminProtectedRoute>} />
        <Route path="/admin/settings/localization"       element={<AdminProtectedRoute><Localization /></AdminProtectedRoute>} />
        <Route path="/admin/behaviour/alerts"            element={<AdminProtectedRoute><Alerts /></AdminProtectedRoute>} />
        <Route path="/admin/behaviour/alertpolicies"     element={<AdminProtectedRoute><AlertPolicies /></AdminProtectedRoute>} />
        <Route path="/admin/behaviour/alertnotification" element={<AdminProtectedRoute><AlertNotification /></AdminProtectedRoute>} />
        <Route path="/admin/mobiletask/clientuser"       element={<AdminProtectedRoute><MobileTaskClients /></AdminProtectedRoute>} />
        <Route path="/admin/mobiletask/task"             element={<AdminProtectedRoute><MobileTaskDetails /></AdminProtectedRoute>} />
        <Route path="/admin/mobiletask/geolocation"      element={<AdminProtectedRoute><MobileTaskGeolocation /></AdminProtectedRoute>} />
        <Route path="/admin/reseller/dashboard"          element={<AdminProtectedRoute><ResellerDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/reseller/settings"           element={<AdminProtectedRoute><ResellerSettings /></AdminProtectedRoute>} />

        {/* ── Non-admin routes ── */}
        <Route path="/non-admin/dashboard"               element={<NonAdminProtectedRoute><NonAdminDashboard /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/employee-details"        element={<NonAdminProtectedRoute><NonAdminEmployeeDetails /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/get-employee-details"    element={<NonAdminProtectedRoute><EmployeeProfile /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/attendance"              element={<NonAdminProtectedRoute><NonAdminEmployeeAttendance /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/insights"                element={<NonAdminProtectedRoute><NonAdminEmployeeInsights /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/timesheets"              element={<NonAdminProtectedRoute><NonAdminTimesheets /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/time-claim"              element={<NonAdminProtectedRoute><NonAdminTimeClaim /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/live"                    element={<NonAdminProtectedRoute><NonAdminLiveMonitoring /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/reports"                 element={<NonAdminProtectedRoute><NonAdminReportsDownload /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/reports/productivity"    element={<NonAdminProtectedRoute><NonAdminProductivityReport /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/reports/autoemail"       element={<NonAdminProtectedRoute><NonAdminAutoEmailReport /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/reports/webappusage"     element={<NonAdminProtectedRoute><NonAdminWebAppUsage /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/dlp/usb"                 element={<NonAdminProtectedRoute><NonAdminUSBDetection /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/dlp/emailactivitylogs"   element={<NonAdminProtectedRoute><NonAdminEmailActivityLogs /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/track-user-settings"     element={<NonAdminProtectedRoute><TrackUserSettings /></NonAdminProtectedRoute>} />

        {/* ── Non-admin Settings ── */}
        <Route path="/non-admin/settings/location"           element={<NonAdminProtectedRoute><NonAdminLocationDepartment /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/settings/storage"            element={<NonAdminProtectedRoute><NonAdminStorageTypes /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/settings/productivity"       element={<NonAdminProtectedRoute><NonAdminProductivityRules /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/settings/roles"              element={<NonAdminProtectedRoute><NonAdminRolesPermissions /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/settings/shift"              element={<NonAdminProtectedRoute><NonAdminShiftManagement /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/settings/monitoring"         element={<NonAdminProtectedRoute><NonAdminMonitoringControl /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/settings/localization"       element={<NonAdminProtectedRoute><NonAdminLocalization /></NonAdminProtectedRoute>} />

        {/* ── Non-admin Behaviour ── */}
        <Route path="/non-admin/behaviour/alerts"            element={<NonAdminProtectedRoute><NonAdminAlerts /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/behaviour/alertpolicies"     element={<NonAdminProtectedRoute><NonAdminAlertPolicies /></NonAdminProtectedRoute>} />
        <Route path="/non-admin/behaviour/alertnotification" element={<NonAdminProtectedRoute><NonAdminAlertNotification /></NonAdminProtectedRoute>} />

        {/* ── Employee routes ── */}
        <Route path="/employee/dashboard" element={<EmployeeProtectedRoute><EmployeeDashboard /></EmployeeProtectedRoute>} />
        <Route path="/employee/time-claim" element={<EmployeeProtectedRoute><EmployeeTimeClaim /></EmployeeProtectedRoute>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
