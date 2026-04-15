import apiService from "../../../services/api.service";

const resetPassword = async ({ email, token, new_password, confirm_password, isClient }) => {
  try {
    const body = { email, token, new_password, confirm_password };
    if (isClient) body.isClient = isClient;
    const { data } = await apiService.authInstance.put("/password/reset-password", body);
    return data;
  } catch (error) {
    return {
      code: error?.response?.status || 500,
      message: error?.response?.data?.message || "Something went wrong",
    };
  }
};

export { resetPassword };
