import apiService from '../../../services/api.service';

/**
 * Employee login via POST /auth/user
 * Endpoint: https://service.dev.empmonitor.com/api/v3/auth/user
 *
 * The API returns the full user object directly (not a JWT):
 *   { code, data: "token_string", user_id, u_id, full_name, email, role, roles, ... }
 * We store the entire response as the employee session so all fields are accessible.
 * setSessionCookie() reads session.data (= token string) for localStorage.
 */
const employeeLogin = async ({ email, password }) => {
  try {
    if (!email || !password) {
      return { error: 'Email and password are required' };
    }

    const response = await apiService.authInstance.post('/auth/user', { email, password });
    const result   = response.data; // full API response object

    if (result.error) {
      return { error: result.error };
    }
    if (!result.code || result.code !== 200) {
      return { error: result.message || 'Login failed' };
    }

    // Return the full API response as `data` so the session stores everything:
    //   session.data       → token string  (used by setSessionCookie)
    //   session.user_id    → 56824         (DB employee id, used for /user/get-user)
    //   session.u_id       → 1306251       (agent id, used for WebSocket)
    //   session.full_name  → "John Doe"
    //   session.email      → "..."
    //   session.role       → "Employee"
    //   session.roles      → [{ name, role_id, user_id }]
    return {
      success: true,
      code:    200,
      data:    result,
    };
  } catch (error) {
    return { error: error?.response?.data?.message || 'An unknown error occurred' };
  }
};

/**
 * Switch to another role for the same user.
 * POST /auth/role-account-switch  { role_id }
 * Uses the current token already set in apiInstance interceptor.
 */
const switchRole = async (roleId) => {
  try {
    const response = await apiService.apiInstance.post('/auth/role-account-switch', {
      role_id: roleId,
    });
    return response.data;
  } catch (error) {
    return { error: error?.response?.data?.message || 'Role switch failed' };
  }
};

export { employeeLogin, switchRole };
