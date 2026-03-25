const SESSION_KEY = 'emp_session'

/**
 * Persist session data across page refreshes.
 * Uses localStorage (not cookies) to avoid the 4 KB browser cookie limit —
 * the API response includes large permissionData / feature arrays that exceed it.
 */
export function setSessionCookie(data) {
  if (!data) return
  localStorage.setItem('token', data.data)            // auth token for API calls
  localStorage.setItem(SESSION_KEY, JSON.stringify(data)) // full session for hydration
}

/**
 * Retrieve the stored session, or null if none / invalid.
 * @returns {object|null}
 */
export function getSessionCookie() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Remove the stored session (logout / role-switch cleanup).
 */
export function clearSessionCookie() {
  localStorage.removeItem(SESSION_KEY)
  // token is removed separately by clearEmployee(); keep it here for safety
  localStorage.removeItem('token')
}
