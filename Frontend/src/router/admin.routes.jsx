import React, { useState, useEffect } from 'react'
import { Route, Navigate } from 'react-router-dom'

// Existing pages
import Dashboard from '../page/protected/admin/dashboard'

// Employee pages — each in its own folder
import EmployeeDetails        from '../page/protected/admin/employee-details'
import EmployeeComparison     from '../page/protected/admin/employee-comparison'
import EmployeeAttendancePage from '../page/protected/admin/employee-attendance'
import EmployeeNotification       from '../page/protected/admin/employee-notification'
import EmployeeInsights       from '../page/protected/admin/employee-insights'
import EmployeeRealtimeInsights       from '../page/protected/admin/employee-realtime-insights'
import EmployeeProfile               from '../page/protected/admin/employee-profile'
import TrackUserSettings               from '../page/protected/admin/track-user-settings'


// Standalone pages
import { Timesheets }     from '../page/protected/admin/timesheets'
import { Timeline }       from '../page/protected/admin/timeline'
import { LiveMonitoring } from '../page/protected/admin/live-monitoring'
import { TimeClaim }      from '../page/protected/admin/time-claim'
import { Clients }        from '../page/protected/admin/clients'

// Reports
import ReportsDownload    from '../page/protected/admin/reports-download'
import ProductivityReport from '../page/protected/admin/productivity-report'
import AutoEmailReport    from '../page/protected/admin/auto-email-report'
import WebAppUsage        from '../page/protected/admin/web-app-usage'
import SystemActivityLog  from '../page/protected/admin/system-activity-log'

// DLP
import USBDetection      from '../page/protected/admin/usb-detection'
import SystemLogs        from '../page/protected/admin/system-logs'
import ScreenShotLogs         from '../page/protected/admin/screenshot-logs'
import EmailActivityLogs from '../page/protected/admin/email-activity-logs'
import PrintLogs         from '../page/protected/admin/print-logs'

// Settings
import LocationDepartment from '../page/protected/admin/location-department'
import StorageTypes       from '../page/protected/admin/storage-types'
import ProductivityRules  from '../page/protected/admin/productivity-rules'
import RolesPermissions   from '../page/protected/admin/roles-permissions'
import ShiftManagement    from '../page/protected/admin/shift-management'
import MonitoringControl  from '../page/protected/admin/monitoring-control'
import Localization       from '../page/protected/admin/localization'

// Behaviour
import Alerts            from '../page/protected/admin/alerts'
import AlertPolicies     from '../page/protected/admin/alert-policies'
import AlertNotification from '../page/protected/admin/alert-notification'

// Mobile Task
import MobileTaskClients     from '../page/protected/admin/mobile-task-clients'
import MobileTaskDetails     from '../page/protected/admin/mobile-task-details'
import MobileTaskGeolocation from '../page/protected/admin/mobile-task-geolocation'

// Reseller
import ResellerDashboard from '../page/protected/admin/reseller-dashboard'
import ResellerSettings  from '../page/protected/admin/reseller-settings'

import { AdminLayout } from '../page/protected/admin/Layout'
import useAdminSession from '../sessions/adminSession'
import { getSessionCookie } from '../lib/sessionCookie'

// Standalone component so hooks have their own isolated instance
export function AdminProtectedRoute({ children }) {
  const { admin, setAdmin } = useAdminSession()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const fromCookie = getSessionCookie()
    if (fromCookie && fromCookie.data && fromCookie.is_admin === true) {
      setAdmin(fromCookie)
    }
    setHydrated(true)
  }, [setAdmin])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!admin || !admin.data) {
    return <Navigate to="/admin-login" replace />
  }
  return <AdminLayout>{children}</AdminLayout>
}

const AdminRoutes = () => {
  return (
    <>
      {/* ── Dashboard ── */}
      <Route path="/admin/dashboard"             element={<AdminProtectedRoute><Dashboard /></AdminProtectedRoute>} />

      {/* ── Employees ── */}
      <Route path="/admin/employee-details"      element={<AdminProtectedRoute><EmployeeDetails /></AdminProtectedRoute>} />
      <Route path="/admin/get-employee-details"  element={<AdminProtectedRoute><EmployeeProfile /></AdminProtectedRoute>} />
      <Route path="/admin/comparison"            element={<AdminProtectedRoute><EmployeeComparison /></AdminProtectedRoute>} />
      <Route path="/admin/attendance"            element={<AdminProtectedRoute><EmployeeAttendancePage /></AdminProtectedRoute>} />
      <Route path="/admin/notification"          element={<AdminProtectedRoute><EmployeeNotification /></AdminProtectedRoute>} />
      <Route path="/admin/insights"              element={<AdminProtectedRoute><EmployeeInsights /></AdminProtectedRoute>} />
      <Route path="/admin/realtime"              element={<AdminProtectedRoute><EmployeeRealtimeInsights /></AdminProtectedRoute>} />
      <Route path="/admin/track-user-settings"   element={<AdminProtectedRoute><TrackUserSettings /></AdminProtectedRoute>} />

      {/* ── Standalone ── */}
      <Route path="/admin/timesheets"                  element={<AdminProtectedRoute><Timesheets /></AdminProtectedRoute>} />
      <Route path="/admin/timeline"                    element={<AdminProtectedRoute><Timeline /></AdminProtectedRoute>} />
      <Route path="/admin/livemonitoring"              element={<AdminProtectedRoute><LiveMonitoring /></AdminProtectedRoute>} />
      <Route path="/admin/timeclaim"                   element={<AdminProtectedRoute><TimeClaim /></AdminProtectedRoute>} />
      <Route path="/admin/clients"                     element={<AdminProtectedRoute><Clients /></AdminProtectedRoute>} />

      {/* ── Reports ── */}
      <Route path="/admin/reports/download"            element={<AdminProtectedRoute><ReportsDownload /></AdminProtectedRoute>} />
      <Route path="/admin/reports/productivity"        element={<AdminProtectedRoute><ProductivityReport /></AdminProtectedRoute>} />
      <Route path="/admin/reports/autoemail"           element={<AdminProtectedRoute><AutoEmailReport /></AdminProtectedRoute>} />
      <Route path="/admin/reports/webappusage"         element={<AdminProtectedRoute><WebAppUsage /></AdminProtectedRoute>} />
      <Route path="/admin/reports/systemactivitylog"   element={<AdminProtectedRoute><SystemActivityLog /></AdminProtectedRoute>} />

      {/* ── DLP ── */}
      <Route path="/admin/dlp/usb"                     element={<AdminProtectedRoute><USBDetection /></AdminProtectedRoute>} />
      <Route path="/admin/dlp/systemlogs"              element={<AdminProtectedRoute><SystemLogs /></AdminProtectedRoute>} />
      <Route path="/admin/dlp/screenshotlogs"          element={<AdminProtectedRoute><ScreenShotLogs /></AdminProtectedRoute>} />
      <Route path="/admin/dlp/emailactivitylogs"       element={<AdminProtectedRoute><EmailActivityLogs /></AdminProtectedRoute>} />
      <Route path="/admin/dlp/printlogs"               element={<AdminProtectedRoute><PrintLogs /></AdminProtectedRoute>} />

      {/* ── Settings ── */}
      <Route path="/admin/settings/location"           element={<AdminProtectedRoute><LocationDepartment /></AdminProtectedRoute>} />
      <Route path="/admin/settings/storage"            element={<AdminProtectedRoute><StorageTypes /></AdminProtectedRoute>} />
      <Route path="/admin/settings/productivity"       element={<AdminProtectedRoute><ProductivityRules /></AdminProtectedRoute>} />
      <Route path="/admin/settings/roles"              element={<AdminProtectedRoute><RolesPermissions /></AdminProtectedRoute>} />
      <Route path="/admin/settings/shift"              element={<AdminProtectedRoute><ShiftManagement /></AdminProtectedRoute>} />
      <Route path="/admin/settings/monitoring"         element={<AdminProtectedRoute><MonitoringControl /></AdminProtectedRoute>} />
      <Route path="/admin/settings/localization"       element={<AdminProtectedRoute><Localization /></AdminProtectedRoute>} />

      {/* ── Behaviour ── */}
      <Route path="/admin/behaviour/alerts"            element={<AdminProtectedRoute><Alerts /></AdminProtectedRoute>} />
      <Route path="/admin/behaviour/alertpolicies"     element={<AdminProtectedRoute><AlertPolicies /></AdminProtectedRoute>} />
      <Route path="/admin/behaviour/alertnotification" element={<AdminProtectedRoute><AlertNotification /></AdminProtectedRoute>} />

      {/* ── Mobile Task ── */}
      <Route path="/admin/mobiletask/clientuser"       element={<AdminProtectedRoute><MobileTaskClients /></AdminProtectedRoute>} />
      <Route path="/admin/mobiletask/task"             element={<AdminProtectedRoute><MobileTaskDetails /></AdminProtectedRoute>} />
      <Route path="/admin/mobiletask/geolocation"      element={<AdminProtectedRoute><MobileTaskGeolocation /></AdminProtectedRoute>} />

      {/* ── Reseller ── */}
      <Route path="/admin/reseller/dashboard"          element={<AdminProtectedRoute><ResellerDashboard /></AdminProtectedRoute>} />
      <Route path="/admin/reseller/settings"           element={<AdminProtectedRoute><ResellerSettings /></AdminProtectedRoute>} />
    </>
  )
}

export default AdminRoutes
