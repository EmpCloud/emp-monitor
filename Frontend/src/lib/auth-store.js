import { create } from 'zustand';

/**
 * Extracts the ?sso_token= and ?return_url= params from the current URL and
 * immediately removes them so the token never lingers in browser history.
 *
 * Returns { token, returnUrl }. returnUrl is the EMP Cloud dashboard URL that
 * EmpCloud passes alongside the token — it must be used as-is for the "EMP
 * Cloud" back link (do NOT reconstruct it from the host; empcloud.com is the
 * WordPress marketing site, not the dashboard).
 */
export function extractSSOToken() {
  const params = new URLSearchParams(window.location.search);
  const ssoToken = params.get('sso_token');
  if (!ssoToken) return { token: null, returnUrl: null };

  const returnUrl = params.get('return_url');

  const url = new URL(window.location.href);
  url.searchParams.delete('sso_token');
  url.searchParams.delete('return_url');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);

  return { token: ssoToken, returnUrl };
}

const STORAGE_KEY = 'empmonitor_auth';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, accessToken: null };
  }
}

function saveToStorage(user, accessToken) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, accessToken }));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export const useAuthStore = create((set) => {
  const persisted = loadFromStorage();

  return {
    user: persisted.user,
    accessToken: persisted.accessToken,
    isAuthenticated: !!persisted.accessToken,

    login(user, accessToken) {
      saveToStorage(user, accessToken);
      set({ user, accessToken, isAuthenticated: true });
    },

    logout() {
      clearStorage();
      set({ user: null, accessToken: null, isAuthenticated: false });
    },
  };
});
