import { useAuthStore } from '../lib/auth-store';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>EmpMonitor Dashboard</h1>
      <p>Welcome, {user?.full_name || user?.user_name}</p>
      <p>Organization ID: {user?.organization_id}</p>
      <p>Role: {user?.role}</p>
      <button onClick={handleLogout} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
        Logout
      </button>
    </div>
  );
}
