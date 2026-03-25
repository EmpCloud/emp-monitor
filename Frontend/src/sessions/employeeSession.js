import { create } from 'zustand'
import { setSessionCookie, clearSessionCookie } from '../lib/sessionCookie'

const useEmployeeSession = create((set) => ({
  employee: null,
  setEmployee: (employee) => {
    if (employee) setSessionCookie(employee)
    set({ employee })
  },
  // Full logout: clears storage + state
  clearEmployee: () => {
    clearSessionCookie()   // removes emp_session + token
    set({ employee: null })
  },
  // Role-switch: only reset Zustand state, leave storage for the new session
  resetEmployee: () => set({ employee: null }),
}))

export default useEmployeeSession
