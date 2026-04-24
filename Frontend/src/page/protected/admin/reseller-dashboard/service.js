import apiService from "@/services/api.service";

// ─── Dashboard APIs ──────────────────────────────────────────────────────────

// Controller: resellerDashboard → allClientsData()
// Backend: GET /settings/client-stats
const getClientStats = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/settings/client-stats");
        if (data?.code === 200 && Array.isArray(data.data)) {
            return data.data.map((c) => ({
                clientUserId: c.client_user_id,
                clientOrgId: c.client_organization_id,
                email: c.a_email && c.a_email !== "null" ? c.a_email : "-",
                username: c.username || "-",
                resellerId: c.reseller_id_client || "",
                resellerNumber: c.reseller_number_client || "",
                totalUsers: c.total_allowed_user_count || 0,
                usersAdded: c.current_user_count || 0,
                usersCanAdd: Math.max(0, (c.total_allowed_user_count || 0) - (c.current_user_count || 0)),
                expiry: c.expiry || "-",
                note: c.notes ?? "--",
                storage: !!c.reseller_storage,
            }));
        }
        return [];
    } catch {
        return [];
    }
};

// Controller: getUsersAttendance()
// Backend: GET /external/all-employee?skip=0&limit=9999
const getAllEmployees = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/external/all-employee", {
            params: { skip: 0, limit: 9999 },
        });
        if (data?.code === 200 && Array.isArray(data.data?.employeeDetails)) {
            return data.data.employeeDetails.map((e) => ({
                id: e.employee_id,
                name: e.employee_name || `${e.first_name || ""} ${e.last_name || ""}`.trim(),
                email: e.email || "-",
                empCode: e.emp_code || "-",
                department: e.department_name || "-",
            }));
        }
        return [];
    } catch {
        return [];
    }
};

// Controller: registerClientDetails()
// Backend: POST /auth/register-client
const registerClient = async (clientData) => {
    try {
        const { data } = await apiService.apiInstance.post("/auth/register-client", clientData);
        return { success: data?.code === 200, message: data?.msg || data?.message || "" };
    } catch {
        return { success: false, message: "Failed to register client" };
    }
};

// Controller: updateClientDetails()
// Backend: PUT /settings/client-edit
const updateClient = async (clientData) => {
    try {
        const { data } = await apiService.apiInstance.put("/settings/client-edit", clientData);
        return { success: data?.code === 200, message: data?.msg || data?.message || "" };
    } catch {
        return { success: false, message: "Failed to update client" };
    }
};

// Controller: removeClient()
// Backend: DELETE /settings/remove-client
const removeClient = async (email) => {
    try {
        const { data } = await apiService.apiInstance.delete("/settings/remove-client", {
            data: { email },
        });
        return { success: data?.code === 200, message: data?.msg || data?.message || "" };
    } catch {
        return { success: false, message: "Failed to remove client" };
    }
};

// Controller: resellerAddStorage()
// Backend: POST /storage/add-storage-reseller
const toggleStorage = async (clientOrgId, enable) => {
    try {
        const { data } = await apiService.apiInstance.post("/storage/add-storage-reseller", {
            client_organization_ids: clientOrgId ? [clientOrgId] : null,
            enable,
        });
        return { success: data?.code === 200, message: data?.msg || data?.message || "" };
    } catch {
        return { success: false, message: "Failed to toggle storage" };
    }
};

// Controller: getResellerLicenses()
// Backend: GET /settings/reseller-stats
const getResellerLicenses = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/settings/reseller-stats");
        if (data?.code === 200) {
            return {
                leftOverLicenses: data.data?.left_over_licenses ?? 0,
                expiryDate: data.data?.expiry_date?.replace(/"/g, "") || "",
            };
        }
        return { leftOverLicenses: 0, expiryDate: "" };
    } catch {
        return { leftOverLicenses: 0, expiryDate: "" };
    }
};

// Controller: clientLogin()
// Backend: POST /auth/client-login
const clientLogin = async (organizationId) => {
    try {
        const { data } = await apiService.apiInstance.post("/auth/client-login", {
            organization_id: organizationId,
        });
        return { success: data?.code === 200, data: data?.data, message: data?.message || "" };
    } catch {
        return { success: false, message: "Failed to login as client" };
    }
};

// Controller: assignEmployeeReseller()
// Backend: POST /external/assign-employee-reseller
const assignEmployees = async (resellerOrgId, employeeIds) => {
    try {
        const { data } = await apiService.apiInstance.post("/external/assign-employee-reseller", {
            reseller_organization_id: resellerOrgId,
            employee_id: employeeIds,
        });
        const resp = data?.data || data;
        return { success: resp?.code === 200, message: resp?.message || data?.message || "" };
    } catch {
        return { success: false, message: "Failed to assign employees" };
    }
};

// Controller: assignEmployeeData()
// Backend: GET /external/get-assign-employee-reseller?reseller_organization_id=
const getAssignedEmployees = async (resellerOrgId) => {
    try {
        const { data } = await apiService.apiInstance.get("/external/get-assign-employee-reseller", {
            params: { reseller_organization_id: resellerOrgId },
        });
        if (data?.code === 200 && Array.isArray(data.data)) {
            return data.data.map((e) => ({
                id: e.id,
                empCode: e.emp_code || "-",
                name: `${e.first_name || ""} ${e.last_name || ""}`.trim(),
                department: e.department_name || "-",
            }));
        }
        return [];
    } catch {
        return [];
    }
};

// Controller: deleteAssignEmployee()
// Backend: DELETE /external/delete-assign-employee-reseller
const deleteAssignedEmployee = async (employeeId, resellerOrgId) => {
    try {
        const { data } = await apiService.apiInstance.delete("/external/delete-assign-employee-reseller", {
            data: { employee_id: employeeId, reseller_organization_id: resellerOrgId },
        });
        return { success: data?.code === 200, message: data?.message || "" };
    } catch {
        return { success: false, message: "Failed to remove assigned employee" };
    }
};

// ─── Settings APIs ───────────────────────────────────────────────────────────

// Controller: resellerGetSettings()
// Backend: GET /settings/reseller
const getResellerSettings = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/settings/reseller");
        if (data?.code === 200) return data.data || {};
        return {};
    } catch {
        return {};
    }
};

// Controller: resellerUpdateSettings()
// Backend: POST /settings/reseller
const saveResellerSettings = async (settingsData) => {
    try {
        const { data } = await apiService.apiInstance.post("/settings/reseller", settingsData);
        return { success: data?.code === 200, message: data?.msg || "", errors: data?.code === 201 ? data.msg : null };
    } catch {
        return { success: false, message: "Failed to save settings" };
    }
};

export {
    getClientStats,
    getAllEmployees,
    registerClient,
    updateClient,
    removeClient,
    toggleStorage,
    getResellerLicenses,
    clientLogin,
    assignEmployees,
    getAssignedEmployees,
    deleteAssignedEmployee,
    getResellerSettings,
    saveResellerSettings,
};
