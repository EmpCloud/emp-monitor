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

export const bulkRegisterEmployees = async (file) => {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await apiService.apiInstance.post("/user/upload-bulk-registration", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: bulkRegisterEmployees error", error);
    return null;
  }
};

export const bulkUpdateEmployees = async (file) => {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await apiService.apiInstance.post("/user/edit-bulk-registration", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data ?? null;
  } catch (error) {
    console.error("Employee Details: bulkUpdateEmployees error", error);
    return null;
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
  showEntries = 100,
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

export const fetchRemovedUsers = async () => {
  try {
    const { data } = await apiService.apiInstance.get("/user/removed-user-list");
    const users = Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.data?.user_data) ? data.data.user_data
      : [];
    return { employees: users, raw: data };
  } catch (error) {
    console.error("Employee Details: fetchRemovedUsers error", error);
    return { employees: [], raw: null };
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
    version: emp.software_version || "N/A"
  };
};

