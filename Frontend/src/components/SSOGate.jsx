import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { extractSSOToken, useAuthStore } from '../lib/auth-store';

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
 *  4. Redirects to /dashboard
 *
 * If no sso_token is present the component renders children normally so the
 * existing login page handles unauthenticated users.
 */
export default function SSOGate({ children }) {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  // Extract once on mount — never re-run (token already stripped from URL)
  const [ssoToken] = useState(() => extractSSOToken());
  const [ready, setReady] = useState(!ssoToken); // if no SSO token, render immediately
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ssoToken) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await api.post('/auth/sso', { token: ssoToken });
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

        login(
          {
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
          },
          accessToken
        );

        // Navigate based on role
        const isAdmin = res.data.is_admin;
        navigate(isAdmin ? '/admin/dashboard' : '/non-admin/dashboard', { replace: true });
      } catch (err) {
        if (cancelled) return;
        console.error('SSO login failed:', err);
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
  }, [ssoToken, login, navigate]);

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
