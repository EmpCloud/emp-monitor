import apiService from "../../../services/api.service";

/**
 * Non-admin login:
 * Use same auth instance pattern as admin login (`/auth/admin`),
 * but call `/auth/user` and send dynamic credentials from the form.
 */
const NonAdminLogin = async ({ email, password }) => {
  try {
    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    // Backend expects `email` + `password`. IP is optional but must not be empty,
    // so we omit it here and let the server infer it from the request.
    const loginData = {
      email,
      password,
    };

    const response = await apiService.authInstance.post("/auth/user", loginData);

    return response.data;
  } catch (error) {
    return {
      error: error?.response?.data?.message || "An unknown error occurred",
    };
  }
};

const forgotPassword = async (email) => {
  try {
    const { data } = await apiService.apiInstance.post("/password/forgot-password", { email });
    return data;
  } catch (error) {
    return { code: 500, msg: error?.response?.data?.message || "Something went wrong" };
  }
};

export { NonAdminLogin, forgotPassword };

