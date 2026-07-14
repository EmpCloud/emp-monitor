import apiService from "@/services/api.service";

export const fetchDepartmentsByLocation = async (locationId) => {
  try {
    const { data } = await apiService.apiInstance.post("/location/get-department-by-location", {
      location_id: locationId,
      role_id: "",
    });
    return (data?.data ?? []).map((d) => ({ value: String(d.department_id), label: d.name }));
  } catch (error) {
    console.error("Employee Details: fetchDepartmentsByLocation error", error);
    return [];
  }
};

export const registerEmployee = async (formData) => {
  try {
    const { data } = await apiService.apiInstance.post("/user/user-register", formData);
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: registerEmployee error", error);
    return error?.response?.data ?? { code: 500, message: error?.message || "Registration failed." };
  }
};

export const getEmployeeDetails = async (userId) => {
  try {
    const { data } = await apiService.apiInstance.post("/user/get-user", { user_id: userId });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: getEmployeeDetails error", error);
    return null;
  }
};

export const editEmployee = async (formData) => {
  try {
    const { data } = await apiService.apiInstance.post("/user/user-profile-update", formData);
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: editEmployee error", error);
    return error?.response?.data ?? { code: 500, message: error?.message || "Update failed." };
  }
};

/**
 * Upload an employee profile picture.
 *
 * The v3 `/user/user-profile-update` endpoint is JSON-only and ignores any
 * uploaded file (the controller preserves the existing `photo_path`). Pictures
 * must go through this dedicated multer endpoint, which writes the file to
 * cloud storage and updates `users.photo_path`. Field name is `avatar` and the
 * user id is passed as a query parameter — match the backend exactly.
 */
export const uploadEmployeeProfilePic = async (userId, file) => {
  if (!userId || !file) return null;
  try {
    const fd = new FormData();
    fd.append("avatar", file);
    const { data } = await apiService.apiInstance.post(
      `/user/upload-profilepic-drive?user_id=${encodeURIComponent(userId)}`,
      fd,
    );
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: uploadEmployeeProfilePic error", error);
    return error?.response?.data ?? { code: 500, message: error?.message || "Profile picture upload failed." };
  }
};

export const deleteEmployee = async (userId) => {
  try {
    const { data } = await apiService.apiInstance.delete("/user/user-delete-multiple", {
      data: { user_ids: [userId] },
    });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: deleteEmployee error", error);
    return null;
  }
};

export const deleteMultipleEmployees = async (userIds) => {
  try {
    const { data } = await apiService.apiInstance.delete("/user/user-delete-multiple", {
      data: { user_ids: userIds },
    });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: deleteMultipleEmployees error", error);
    return null;
  }
};

export const suspendMultipleEmployees = async (userIds) => {
  try {
    const { data } = await apiService.apiInstance.put("/user/update-user-status", {
      user_ids: userIds,
      status: "2",
    });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: suspendMultipleEmployees error", error);
    return null;
  }
};

export const activateMultipleEmployees = async (userIds) => {
  try {
    const { data } = await apiService.apiInstance.put("/user/update-user-status", {
      user_ids: userIds,
      status: "1",
    });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: activateMultipleEmployees error", error);
    return null;
  }
};

export const assignShiftToMultiple = async (userIds, shiftId) => {
  try {
    const { data } = await apiService.apiInstance.put("/user/assign-shift-bulk-employees", {
      employees_id: userIds,
      shift_id: Number(shiftId),
    });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: assignShiftToMultiple error", error);
    return error?.response?.data ?? { code: 500, message: error?.message || "Failed to assign shift." };
  }
};

export const fetchNonAdminList = async () => {
  try {
    const { data } = await apiService.apiInstance.get("/external/get-non-admin-list");
    const list = Array.isArray(data?.data) ? data.data : [];
    return list.map((m) => ({
      managerId: m.emp_id,
      userId: m.user_id,
      name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.emp_code || `#${m.emp_id}`,
      empCode: m.emp_code,
      roleId: String(m.role_id),
      roleName: m.role_name,
    }));
  } catch (error) {
    console.error("Employee Details: fetchNonAdminList error", error);
    return [];
  }
};

export const assignManagerToMultiple = async ({ userIds, managerId, roleId }) => {
  try {
    const results = await Promise.all(
      userIds.map((employeeId) =>
        apiService.apiInstance
          .post("/external/assigned-to-employee", {
            employee_id: Number(employeeId),
            manager_id: Number(managerId),
            role_id: Number(roleId),
          })
          .then((r) => r.data)
          .catch((err) => err?.response?.data ?? { code: 500, message: err?.message })
      )
    );
    const failed = results.filter((r) => r?.code !== 200);
    if (failed.length === 0) {
      return { code: 200, message: "Manager assigned successfully." };
    }
    return {
      code: 207,
      message: `${results.length - failed.length}/${results.length} assigned. ${failed.length} failed.`,
    };
  } catch (error) {
    console.error("Employee Details: assignManagerToMultiple error", error);
    return { code: 500, message: error?.message || "Failed to assign manager." };
  }
};

export const fetchAssignedManagersForEmployee = async (employeeId) => {
  try {
    // Omit role_id entirely — backend defaults it to null, which triggers the
    // group-by-role query. Sending "" makes Joi's `number().positive()` reject.
    const { data } = await apiService.apiInstance.post("/user/employee-assigned-to", {
      user_id: Number(employeeId),
    });
    // Success shape: data.data = [{ role_id, role_name, employees: [{ name, email, user_id }, ...] }]
    // Backend returns code: 400 with "Not found" when the employee has no assignments — treat as empty.
    if (data?.code === 200 && Array.isArray(data.data)) {
      return { code: 200, groups: data.data };
    }
    if (data?.code === 400) {
      return { code: 200, groups: [] };
    }
    return { code: data?.code ?? 500, groups: [], message: data?.message };
  } catch (error) {
    console.error("Employee Details: fetchAssignedManagersForEmployee error", error);
    return { code: 500, groups: [], message: error?.message || "Failed to fetch assigned managers." };
  }
};

/**
 * If axios has no `error.response`, the request never got an HTTP reply —
 * usually one of:
 *   - Chromium ERR_UPLOAD_FILE_CHANGED (the picked file changed on disk
 *     since the user selected it, e.g. they re-saved the XLSX in Excel
 *     after a previous failed upload — the stale File handle is rejected
 *     by the browser before the request leaves)
 *   - genuine network drop / DNS / CORS
 * In both cases axios reports a useless "Network Error" string. Return a
 * sentinel code -1 so the modal can both surface an actionable message
 * AND clear its file picker for the next attempt.
 */
const handleBulkUploadError = (error) => {
  if (error?.response?.data) return error.response.data;
  return {
    code: -1,
    message:
      "Could not reach the server. The selected file may have changed on disk — please re-select it and try again.",
  };
};

export const bulkRegisterEmployees = async (file) => {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await apiService.apiInstance.post("/user/user-register-bulk", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: bulkRegisterEmployees error", error);
    return handleBulkUploadError(error);
  }
};

export const bulkUpdateEmployees = async (file) => {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await apiService.apiInstance.post("/user/bulk-update", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: bulkUpdateEmployees error", error);
    return handleBulkUploadError(error);
  }
};

// Bulk-delete employees by uploading an .xlsx of emails. The backend
// (POST /user/user-delete-bulk) returns { code, data: { success_email,
// invalid_email }, msg } — success_email are the addresses actually deleted,
// invalid_email are rows whose email didn't match any employee.
export const bulkDeleteEmployees = async (file) => {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await apiService.apiInstance.post("/user/user-delete-bulk", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: bulkDeleteEmployees error", error);
    return handleBulkUploadError(error);
  }
};

export const fetchFilterOptions = async () => {
  try {
    const [rolesRes, locationsRes, deptsRes, shiftsRes] = await Promise.all([
      apiService.apiInstance.get("/settings/roles?skip=0&limit=9999"),
      apiService.apiInstance.post("/location/get-locations-dept", { skip: "", limit: "" }),
      apiService.apiInstance.post("/department/get-departments", { skip: "", limit: "" }),
      apiService.apiInstance.get("/organization-shift/find_by?skip=0&limit=9999"),
    ]);

    const roles = (rolesRes.data?.data ?? []).map((r) => ({ value: String(r.id), label: r.name }));
    const locations = (locationsRes.data?.data ?? []).map((l) => ({ value: String(l.location_id), label: l.location }));
    const departments = (deptsRes.data?.data ?? []).map((d) => ({ value: String(d.id), label: d.name }));
    const shifts = (shiftsRes.data?.data ?? []).map((s) => ({ value: String(s.id), label: s.name }));

    return { roles, locations, departments, shifts };
  } catch (error) {
    console.error("Employee Details: fetchFilterOptions error", error);
    return { roles: [], locations: [], departments: [], shifts: [] };
  }
};

/**
 * Fetch employees list.
 * Mirrors the backend PHP logic for `user/fetch-users` and the pattern used in dashboard services.
 */
export const fetchEmployees = async ({
  locationId = "",
  departmentId = "",
  roleId = "",
  shiftId = -1,
  activeStatus = "",
  showEntries = 10000,
  skipValue = 0,
  searchText = "",
  sortName = "",
  sortOrder = "ASC",
  collapseMerge = "0",
  employeeCode = ""
} = {}) => {
  try {
    const payload = {
      status: activeStatus !== "" ? Number(activeStatus) : "",
      shift_id: shiftId ?? -1,
      location_id: locationId ?? "",
      department_id: departmentId ?? "",
      role_id: roleId ?? "",
      day: new Date().toISOString().slice(0, 10),
      limit: showEntries,
      skip: skipValue,
      name: searchText ?? ""
    };

    if (sortName) {
      payload.sortColumn = sortName;
      payload.sortOrder = sortOrder;
    }

    if (collapseMerge === "1") {
      payload.emp_code = employeeCode ?? "";
      payload.expand = 1;
    }

    const { data } = await apiService.apiInstance.post(
      "/user/fetch-users",
      payload
    );

    const dataBlock = data?.data ?? {};

    const users = Array.isArray(dataBlock.user_data)
      ? dataBlock.user_data
      : [];

    return {
      employees: users,
      statusData: dataBlock.status_data ?? null,
      raw: data
    };
  } catch (error) {
    console.error("Employee Details: fetchEmployees error", error);
    return {
      employees: [],
      statusData: null,
      raw: null
    };
  }
};

export const fetchRemovedUsers = async ({ startDate, endDate } = {}) => {
  try {
    let query = "";
    if (startDate) query += `fromDate=${startDate}`;
    if (endDate) query += `${query ? "&" : ""}toDate=${endDate}`;
    const url = `/user/removed-user-list${query ? `?${query}` : ""}`;
    const { data } = await apiService.apiInstance.get(url);
    const list = Array.isArray(data?.data?.list) ? data.data.list
      : Array.isArray(data?.data) ? data.data
      : [];
    const count = data?.data?.count ?? list.length;
    return { employees: list, count, raw: data };
  } catch (error) {
    console.error("Employee Details: fetchRemovedUsers error", error);
    return { employees: [], count: 0, raw: null };
  }
};

export const fetchEmployeeList = async ({ status = 1, locationId, departmentId, roleId } = {}) => {
  try {
    const payload = { status };
    if (locationId) payload.location_id = locationId;
    if (departmentId) payload.department_id = departmentId;
    if (roleId) payload.role_id = roleId;
    const { data } = await apiService.apiInstance.post("/user/employee-list", payload);
    return Array.isArray(data?.data) ? data.data : [];
  } catch (error) {
    console.error("Employee Details: fetchEmployeeList error", error);
    return [];
  }
};

/**
 * Map raw API employee object to the shape expected by the table UI.
 */
export const mapEmployeeForTable = (emp, idx = 0) => {
  return {
    id: emp.id ?? emp.u_id ?? idx,
    name: emp.full_name || emp.name || "-",
    email: emp.email || "-",
    location: emp.location || "-",
    department: emp.department || "-",
    shift: emp.shift_name || "-",
    role:
      emp.role ||
      (Array.isArray(emp.roles) && emp.roles.length
        ? emp.roles[0].role
        : "Employee"),
    empCode: emp.emp_code || "-",
    os: emp.system_architecture || "Windows",
    computer: emp.computer_name || emp.username || "N/A",
    version: emp.software_version || "N/A",
    photoPath: emp.photo_path || ""
  };
};
