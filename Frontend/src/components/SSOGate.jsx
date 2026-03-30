import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';
import { extractSSOToken, useAuthStore } from '../lib/auth-store';
import { setSessionCookie } from '../lib/sessionCookie';
import useAdminSession from '../sessions/adminSession';
import useNonAdminSession from '../sessions/useNonAdminSession';
import useEmployeeSession from '../sessions/employeeSession';

/**
 * SSOGate wraps the entire app.
 *
 * On mount it checks for a ?sso_token= query param (placed there by EmpCloud
 * when the user clicks "Open EmpMonitor" from the dashboard).
 *
 * If found it:
 *  1. Strips the token from the URL immediately (security)
 *  2. Posts it to POST /auth/sso on the backend
 *  3. Stores the returned emp-monitor access token + user in localStorage
 *  4. Redirects to dashboard
 *
 * If no sso_token is present the component renders children normally so the
 * existing login page handles unauthenticated users.
 */
export default function SSOGate({ children }) {
  const login = useAuthStore((s) => s.login);
  const { setAdmin } = useAdminSession();
  const { setNonAdmin } = useNonAdminSession();
  const { setEmployee } = useEmployeeSession();
  const navigate = useNavigate();

  // Extract once on mount — never re-run (token already stripped from URL)
  const [ssoToken] = useState(() => {
    const token = extractSSOToken();
    return token;
  });
  const [ready, setReady] = useState(!ssoToken); // if no SSO token, render immediately
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ssoToken) return;

    let cancelled = false;

    (async () => {
      try {
        // Use authInstance (same axios instance as the working login flows)
        // to ensure consistent headers, CORS, and baseURL behavior
        const res = await apiService.authInstance.post('/auth/sso', { token: ssoToken });
        if (cancelled) return;

        const {
          data: accessToken,
          user_name,
          full_name,
          email,
          user_id,
          u_id,
          organization_id,
          is_admin,
          is_manager,
          is_teamlead,
          is_employee,
          role,
          role_id,
          photo_path,
        } = res.data;

        const userData = {
          user_name,
          full_name,
          email,
          user_id,
          u_id,
          organization_id,
          is_admin,
          is_manager,
          is_teamlead,
          is_employee,
          role,
          role_id,
          photo_path,
        };

        // Build the session object in the same format as the regular login flows
        const sessionData = {
          ...userData,
          data: accessToken,
          code: 200,
        };

        // Store in Zustand auth store (new-style)
        login(userData, accessToken);

        // Store in session cookie format (used by protected route guards)
        setSessionCookie(sessionData);

        // Hydrate the role-specific session store directly
        // so protected route guards see it immediately (same as the login pages do)
        if (is_admin) {
          setAdmin(sessionData);
        } else if (is_employee) {
          setEmployee(sessionData);
        } else {
          setNonAdmin(sessionData);
        }

        // Also set the bare token (used by some API interceptors)
        localStorage.setItem('token', accessToken);

        // Remember where to return to in EMP Cloud
        localStorage.setItem('empcloud_return_url', window.location.origin.replace(/monitor[^.]*/i, 'cloud') + '/dashboard');

        // Navigate based on role
        const dest = is_admin ? '/admin/dashboard'
          : is_employee ? '/employee/dashboard'
          : '/non-admin/dashboard';
        navigate(dest, { replace: true });
      } catch (err) {
        if (cancelled) return;
        console.error('SSO login failed:', err);
        // Log details to help diagnose — network errors have no response
        if (err.response) {
          console.error('SSO error response:', err.response.status, err.response.data);
        } else if (err.request) {
          console.error('SSO no response received (network/CORS error):', err.message);
        }
        setError(
          err.response?.data?.message || 'SSO login failed. Please log in manually.'
        );
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ssoToken, login, navigate, setAdmin, setNonAdmin, setEmployee]);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Signing you in via EmpCloud SSO…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
          <a href="/login">Go to Login</a>
        </div>
      </div>
    );
  }

  return children;
}
