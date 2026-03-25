import React, { useState, useEffect } from 'react'
import { Route, Navigate } from 'react-router-dom'
import { EmployeeLayout }   from '../page/protected/employee/Layout'
import EmployeeDashboard    from '../page/protected/employee/dashboard'
import useEmployeeSession   from '../sessions/employeeSession'
import { getSessionCookie } from '../lib/sessionCookie'

// Standalone component so hooks have their own isolated instance
export function EmployeeProtectedRoute({ children }) {
  const { employee, setEmployee } = useEmployeeSession()
  const [hydrated, setHydrated]   = useState(false)

  useEffect(() => {
    const fromCookie = getSessionCookie()
    if (fromCookie && fromCookie.data) {
      const role = (fromCookie.role || '').toLowerCase().replace(/\s+/g, '')
      if (role === 'employee') {
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

const EmployeeRoutes = () => {
  return (
    <>
      <Route path="/employee/dashboard" element={<EmployeeProtectedRoute><EmployeeDashboard /></EmployeeProtectedRoute>} />
    </>
  )
}

export default EmployeeRoutes
