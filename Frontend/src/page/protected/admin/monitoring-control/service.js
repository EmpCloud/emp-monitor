import apiService from "@/services/api.service";

// ─── Groups CRUD ────────────────────────────────────────────────────────────

export const getGroups = async ({ limit = 10, skip = 0, name, sortColumn, sortOrder } = {}) => {
    try {
        let query = `limit=${limit}&skip=${skip}`;
        if (name) query += `&name=${encodeURIComponent(name)}`;
        if (sortColumn && sortOrder) query += `&sortColumn=${sortColumn}&sortOrder=${sortOrder}`;

        const { data } = await apiService.apiInstance.get(`/groups?${query}`);
        return data;
    } catch (error) {
        console.error("Groups: getGroups Error:", error);
        return { code: 500, data: [], count: 0 };
    }
};

export const createGroup = async (groupData) => {
    try {
        const { data } = await apiService.apiInstance.post("/groups", groupData);
        return data;
    } catch (error) {
        console.error("Groups: createGroup Error:", error);
        throw error;
    }
};

export const updateGroup = async (groupData) => {
    try {
        const { data } = await apiService.apiInstance.put("/groups", groupData);
        return data;
    } catch (error) {
        console.error("Groups: updateGroup Error:", error);
        throw error;
    }
};

export const deleteGroup = async (groupId) => {
    try {
        const { data } = await apiService.apiInstance.delete("/groups", {
            data: { group_id: groupId },
        });
        return data;
    } catch (error) {
        console.error("Groups: deleteGroup Error:", error);
        throw error;
    }
};

// ─── Monitoring Control Settings ────────────────────────────────────────────

export const getMonitoringSettings = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/organization/admin-feature");
        return data;
    } catch (error) {
        console.error("Groups: getMonitoringSettings Error:", error);
        return null;
    }
};

export const getSettingsOptions = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/settings/options");
        return data;
    } catch (error) {
        console.error("Groups: getSettingsOptions Error:", error);
        return null;
    }
};

export const updateMonitoringControl = async (payload) => {
    try {
        const { data } = await apiService.apiInstance.post("/organization/update-feature-new", payload);
        return data;
    } catch (error) {
        console.error("Groups: updateMonitoringControl Error:", error);
        throw error;
    }
};

// ─── Filter Dropdowns ───────────────────────────────────────────────────────

export const getRoles = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/settings/roles");
        let items = [{ value: "all", label: "All Roles" }];
        if (data?.code === 200 && data?.data?.length) {
            items = [...items, ...data.data.map((r) => ({ value: String(r.id), label: r.name }))];
        }
        return items;
    } catch (error) {
        console.error("Groups: getRoles Error:", error);
        return [{ value: "all", label: "All Roles" }];
    }
};

export const getLocationsByRole = async (roleId) => {
    try {
        const payload = roleId && roleId !== "all" ? { role_id: roleId } : {};
        const { data } = await apiService.apiInstance.post("/location/get-locations", payload);
        let items = [{ value: "all", label: "All Locations" }];
        if (data?.code === 200 && data?.data?.length) {
            items = [...items, ...data.data.map((loc) => ({ value: String(loc.id), label: loc.name }))];
        }
        return items;
    } catch (error) {
        console.error("Groups: getLocationsByRole Error:", error);
        return [{ value: "all", label: "All Locations" }];
    }
};

export const getDepartmentsByLocation = async (roleId, locationId) => {
    try {
        const payload = {};
        if (roleId && roleId !== "all") payload.roleID = roleId;
        if (locationId && locationId !== "all") payload.id = locationId;

        const { data } = await apiService.apiInstance.post("/location/get-department-by-location", payload);
        let items = [{ value: "all", label: "All Departments" }];
        if (data?.code === 200 && data?.data?.data?.length) {
            const depts = data.data.data;
            items = [...items, ...depts.filter((d) => d.id || d.department_id).map((d) => ({
                value: String(d.id || d.department_id),
                label: d.name,
            }))];
        }
        return items;
    } catch (error) {
        console.error("Groups: getDepartmentsByLocation Error:", error);
        return [{ value: "all", label: "All Departments" }];
    }
};

export const getEmployeesByFilters = async ({ roleId, locationId, departmentId } = {}) => {
    try {
        const params = {
            role_id: roleId && roleId !== "all" ? roleId : "",
            location_id: locationId && locationId !== "all" ? locationId : "",
            depId: departmentId && departmentId !== "all" ? departmentId : "",
            status: "1",
        };
        const { data } = await apiService.apiInstance.get("/user/fetch-users", { params });
        let items = [{ value: "all", label: "All Employees" }];
        const users = Array.isArray(data?.data?.user_data) ? data.data.user_data : (Array.isArray(data?.data) ? data.data : []);
        if (users.length) {
            items = [...items, ...users.map((emp) => ({
                value: String(emp.id ?? emp.u_id),
                label: `${emp.first_name || emp.full_name || ""} ${emp.last_name || ""}`.trim() || emp.email || `Employee ${emp.id}`,
            }))];
        }
        return items;
    } catch (error) {
        console.error("Groups: getEmployeesByFilters Error:", error);
        return [{ value: "all", label: "All Employees" }];
    }
};
