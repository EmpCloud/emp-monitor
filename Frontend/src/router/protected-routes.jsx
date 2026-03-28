import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { AdminLayout }    from '../page/protected/admin/Layout'
import { NonAdminLayout } from '../page/protected/non-admin/Layout'
import { EmployeeLayout } from '../page/protected/employee/Layout'
import useAdminSession    from '../sessions/adminSession'
import useNonAdminSession from '../sessions/useNonAdminSession'
import useEmployeeSession from '../sessions/employeeSession'
import { getSessionCookie } from '../lib/sessionCookie'

/**
 * Roles allowed to access admin routes (is_admin must also be true).
 * Roles allowed to access non-admin (manager-level) routes.
 * Employees are explicitly blocked from admin and non-admin routes.
 */
const ADMIN_ALLOWED_ROLES = ['admin', 'org_admin', 'super_admin', 'hr_admin']
const NON_ADMIN_ALLOWED_ROLES = ['manager', 'teamlead', 'team lead', 'hr_manager']

function normalizeRole(role) {
  return (role || '').toLowerCase().replace(/\s+/g, '')
}

function isEmployeeSession(session) {
  if (!session) return false
  const role = normalizeRole(session.role)
  return role === 'employee' || session.is_employee === true
}

export function AdminProtectedRoute({ children }) {
  const { admin, setAdmin } = useAdminSession()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const fromCookie = getSessionCookie()
    if (fromCookie && fromCookie.data && fromCookie.is_admin === true && !isEmployeeSession(fromCookie)) {
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
  // Double-check: block employees even if Zustand store was somehow set
  if (isEmployeeSession(admin)) {
    return <Navigate to="/employee/dashboard" replace />
  }
  if (admin.is_admin !== true) {
    return <Navigate to="/login" replace />
  }
  return <AdminLayout>{children}</AdminLayout>
}

export function NonAdminProtectedRoute({ children }) {
  const { nonAdmin, setNonAdmin } = useNonAdminSession()
  const [hydrated, setHydrated]   = useState(false)

  useEffect(() => {
    const fromCookie = getSessionCookie()
    if (fromCookie && fromCookie.data) {
      const role = normalizeRole(fromCookie.role)
      // Block employees and admins from non-admin routes
      if (!isEmployeeSession(fromCookie) && fromCookie.is_admin !== true) {
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
  // Double-check: block employees even if Zustand store was somehow set
  if (isEmployeeSession(nonAdmin)) {
    return <Navigate to="/employee/dashboard" replace />
  }
  return <NonAdminLayout>{children}</NonAdminLayout>
}

export function EmployeeProtectedRoute({ children }) {
  const { employee, setEmployee } = useEmployeeSession()
  const [hydrated, setHydrated]   = useState(false)

  useEffect(() => {
    const fromCookie = getSessionCookie()
    if (fromCookie && fromCookie.data) {
      if (isEmployeeSession(fromCookie)) {
        setEmployee(fromCookie)
      }
    }
    setHydrated(true)
  }, [setEmployee])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!employee || !employee.data) {
    return <Navigate to="/employee-login" replace />
  }
  return <EmployeeLayout>{children}</EmployeeLayout>
}
