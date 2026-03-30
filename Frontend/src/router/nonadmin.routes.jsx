import React, { useState, useEffect } from 'react'
import { Route, Navigate } from 'react-router-dom'
import { NonAdminLayout }   from '../page/protected/non-admin/Layout'
import NonAdminDashboard       from '../page/protected/non-admin/dashboard'
import NonAdminEmployeeDetails    from '../page/protected/non-admin/employee-details'
import NonAdminEmployeeAttendance from '../page/protected/non-admin/employee-attendance'
import NonAdminEmployeeInsights   from '../page/protected/non-admin/employee-insights'
import NonAdminTimesheets         from '../page/protected/non-admin/timesheets'
import NonAdminTimeClaim          from '../page/protected/non-admin/time-claim'
import NonAdminLiveMonitoring     from '../page/protected/non-admin/live-monitoring'
import NonAdminReportsDownload    from '../page/protected/non-admin/reports-download'
import NonAdminProductivityReport from '../page/protected/non-admin/productivity-report'
import NonAdminAutoEmailReport    from '../page/protected/non-admin/auto-email-report'
import NonAdminWebAppUsage        from '../page/protected/non-admin/web-app-usage'
import NonAdminUSBDetection       from '../page/protected/non-admin/usb-detection'
import NonAdminEmailActivityLogs  from '../page/protected/non-admin/email-activity-logs'
import NonAdminLocationDepartment from '../page/protected/non-admin/location-department'
import NonAdminStorageTypes       from '../page/protected/non-admin/storage-types'
import NonAdminProductivityRules  from '../page/protected/non-admin/productivity-rules'
import NonAdminRolesPermissions   from '../page/protected/non-admin/roles-permissions'
import NonAdminShiftManagement    from '../page/protected/non-admin/shift-management'
import NonAdminMonitoringControl  from '../page/protected/non-admin/monitoring-control'
import NonAdminLocalization       from '../page/protected/non-admin/localization'
import NonAdminAlerts             from '../page/protected/non-admin/alerts'
import NonAdminAlertPolicies      from '../page/protected/non-admin/alert-policies'
import NonAdminAlertNotification  from '../page/protected/non-admin/alert-notification'
import EmployeeProfile            from '../page/protected/admin/employee-profile'
import TrackUserSettings          from '../page/protected/admin/track-user-settings'
import useNonAdminSession   from '../sessions/useNonAdminSession'
import { getSessionCookie } from '../lib/sessionCookie'

// Standalone component so hooks have their own isolated instance
export function NonAdminProtectedRoute({ children }) {
  const { nonAdmin, setNonAdmin } = useNonAdminSession()
  const [hydrated, setHydrated]   = useState(false)

  useEffect(() => {
    const fromCookie = getSessionCookie()
    if (fromCookie && fromCookie.data) {
      const role = (fromCookie.role || '').toLowerCase().replace(/\s+/g, '')
      if (role !== 'employee' && fromCookie.is_admin !== true) {
        setNonAdmin(fromCookie)
      }
    }
    setHydrated(true)
  }, [setNonAdmin])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!nonAdmin || !nonAdmin.data) {
    return <Navigate to="/login" replace />
  }
  return <NonAdminLayout>{children}</NonAdminLayout>
}

const NonAdminRoutes = () => {
  return (
    <>
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

      {/* ── Settings ── */}
      <Route path="/non-admin/settings/location"           element={<NonAdminProtectedRoute><NonAdminLocationDepartment /></NonAdminProtectedRoute>} />
      <Route path="/non-admin/settings/storage"            element={<NonAdminProtectedRoute><NonAdminStorageTypes /></NonAdminProtectedRoute>} />
      <Route path="/non-admin/settings/productivity"       element={<NonAdminProtectedRoute><NonAdminProductivityRules /></NonAdminProtectedRoute>} />
      <Route path="/non-admin/settings/roles"              element={<NonAdminProtectedRoute><NonAdminRolesPermissions /></NonAdminProtectedRoute>} />
      <Route path="/non-admin/settings/shift"              element={<NonAdminProtectedRoute><NonAdminShiftManagement /></NonAdminProtectedRoute>} />
      <Route path="/non-admin/settings/monitoring"         element={<NonAdminProtectedRoute><NonAdminMonitoringControl /></NonAdminProtectedRoute>} />
      <Route path="/non-admin/settings/localization"       element={<NonAdminProtectedRoute><NonAdminLocalization /></NonAdminProtectedRoute>} />

      {/* ── Behaviour ── */}
      <Route path="/non-admin/behaviour/alerts"            element={<NonAdminProtectedRoute><NonAdminAlerts /></NonAdminProtectedRoute>} />
      <Route path="/non-admin/behaviour/alertpolicies"     element={<NonAdminProtectedRoute><NonAdminAlertPolicies /></NonAdminProtectedRoute>} />
      <Route path="/non-admin/behaviour/alertnotification" element={<NonAdminProtectedRoute><NonAdminAlertNotification /></NonAdminProtectedRoute>} />
    </>
  )
}

export default NonAdminRoutes
