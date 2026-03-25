import { create } from 'zustand'
import { setSessionCookie, clearSessionCookie } from '../lib/sessionCookie'

const useNonAdminSession = create((set) => ({
  nonAdmin: null,
  setNonAdmin: (nonAdmin) => {
    if (nonAdmin) setSessionCookie(nonAdmin)
    set({ nonAdmin })
  },
  // Full logout: clears storage + state
  clearNonAdmin: () => {
    clearSessionCookie()
    set({ nonAdmin: null })
  },
  // Role-switch: only reset Zustand state, leave storage for the new session
  resetNonAdmin: () => set({ nonAdmin: null }),
}))

export default useNonAdminSession