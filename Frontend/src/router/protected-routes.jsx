import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { AdminLayout }    from '../page/protected/admin/Layout'
import { NonAdminLayout } from '../page/protected/non-admin/Layout'
import { EmployeeLayout } from '../page/protected/employee/Layout'
import useAdminSession    from '../sessions/adminSession'
import useNonAdminSession from '../sessions/useNonAdminSession'
import useEmployeeSession from '../sessions/employeeSession'
import { getSessionCookie } from '../lib/sessionCookie'
import { syncLanguageFromSession } from '../i18n/syncLanguage'

export function AdminProtectedRoute({ children }) {
  const { admin, setAdmin } = useAdminSession()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const fromCookie = getSessionCookie()
    if (fromCookie && fromCookie.data && fromCookie.is_admin === true) {
      setAdmin(fromCookie)
      syncLanguageFromSession()
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

export function NonAdminProtectedRoute({ children }) {
  const { nonAdmin, setNonAdmin } = useNonAdminSession()
  const [hydrated, setHydrated]   = useState(false)

  useEffect(() => {
    const fromCookie = getSessionCookie()
    if (fromCookie && fromCookie.data) {
      const role = (fromCookie.role || '').toLowerCase().replace(/\s+/g, '')
      if (role !== 'employee' && fromCookie.is_admin !== true) {
        setNonAdmin(fromCookie)
        syncLanguageFromSession()
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

export function EmployeeProtectedRoute({ children }) {
  const { employee, setEmployee } = useEmployeeSession()
  const [hydrated, setHydrated]   = useState(false)

  useEffect(() => {
    const fromCookie = getSessionCookie()
    if (fromCookie && fromCookie.data) {
      const role = (fromCookie.role || '').toLowerCase().replace(/\s+/g, '')
      if (role === 'employee') {
        setEmployee(fromCookie)
        syncLanguageFromSession()
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
