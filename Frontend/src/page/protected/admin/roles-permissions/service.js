import apiService from "@/services/api.service";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── API: Fetch Roles (paginated) ───────────────────────────────────────────

export const getRoles = async ({ skip = 0, limit = 10 }) => {
    try {
        const { data } = await apiService.apiInstance.get("/settings/roles", {
            params: { skip, limit },
        });
        if (data?.code === 200) {
            return {
                success: true,
                data: data.data || [],
                totalCount: data.totalCount || 0,
            };
        }
        return { success: false, message: data?.message || "Failed to fetch roles", data: [], totalCount: 0 };
    } catch (error) {
        console.error("Roles: Fetch roles error:", error);
        return { success: false, message: "Failed to fetch roles", data: [], totalCount: 0 };
    }
};

// ─── API: Fetch Role by ID ──────────────────────────────────────────────────

export const getRoleById = async (roleId) => {
    try {
        const { data } = await apiService.apiInstance.get("/settings/roles", {
            params: { role_id: roleId },
        });
        if (data?.code === 200 && data.data?.length > 0) {
            const role = data.data[0];
            if (role.permission) {
                Object.keys(role.permission).forEach((key) => {
                    const val = role.permission[key];
                    role.permission[key] = val === true || val === "1" || val === 1;
                });
            }
            return { success: true, data: role };
        }
        return { success: false, message: data?.message || "Role not found" };
    } catch (error) {
        console.error("Roles: Fetch role by ID error:", error);
        return { success: false, message: "Failed to fetch role details" };
    }
};

// ─── API: Fetch All Permissions ─────────────────────────────────────────────

export const getPermissions = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/settings/role/permissions");
        if (data?.code === 200 && data.data?.length > 0) {
            return { success: true, data: data.data };
        }
        return { success: false, message: "No permissions found", data: [] };
    } catch (error) {
        console.error("Roles: Fetch permissions error:", error);
        return { success: false, message: "Failed to fetch permissions", data: [] };
    }
};

// ─── API: Add Role ──────────────────────────────────────────────────────────

export const addRole = async ({ name, locationDept, mailStatus }) => {
    try {
        const payload = {
            name,
            location: [],
            department_ids: [],
            permission: {
                read: true,
                write: false,
                delete: false,
                send_mail: mailStatus,
            },
        };

        if (locationDept?.length > 0) {
            let i = 0;
            const grouped = {};
            locationDept.forEach((ld) => {
                const locId = ld.location || "";
                if (!grouped[locId]) grouped[locId] = { location: locId, departments: [] };
                if (ld.departments) {
                    ld.departments.forEach((d) => grouped[locId].departments.push(d));
                }
            });

            Object.values(grouped).forEach((val) => {
                if (val.location) {
                    payload.location.push({
                        location_id: val.location,
                        department_ids: val.departments || [],
                    });
                } else {
                    payload.department_ids = val.departments || [];
                }
                i++;
            });
        }

        const { data } = await apiService.apiInstance.post("/settings/add-role", payload);
        if (data?.code === 200) {
            return { success: true, data: data.data, message: data.message || "Role added successfully" };
        }
        return { success: false, message: data?.message || "Failed to add role" };
    } catch (error) {
        console.error("Roles: Add role error:", error);
        return { success: false, message: error.response?.data?.message || "Failed to add role" };
    }
};

// ─── API: Update Role (edit name, location/dept, RWD permissions) ───────────

export const updateRole = async ({ roleId, name, locationDept, mailStatus, permission }) => {
    try {
        const payload = {
            role_id: parseInt(roleId, 10),
            name,
            permission: { send_mail: mailStatus },
            loc_dept_edit: "true",
            location: [],
            department_ids: [],
        };

        if (permission) {
            if (permission.read !== undefined) payload.permission.read = permission.read;
            if (permission.write !== undefined) payload.permission.write = permission.write;
            if (permission.delete !== undefined) payload.permission.delete = permission.delete;
        }

        if (locationDept?.length > 0) {
            const grouped = {};
            locationDept.forEach((ld) => {
                const locId = ld.location || "";
                if (!grouped[locId]) grouped[locId] = { location: locId, departments: [] };
                if (ld.departments) {
                    ld.departments.forEach((d) => grouped[locId].departments.push(d));
                }
            });

            Object.values(grouped).forEach((val) => {
                if (val.location) {
                    payload.location.push({
                        location_id: val.location,
                        department_ids: val.departments || [],
                    });
                } else {
                    payload.department_ids = val.departments || [];
                }
            });
        }

        const { data } = await apiService.apiInstance.put("/settings/role", payload);
        if (data?.code === 200) {
            return { success: true, data: data.data, message: data.message || "Role updated successfully" };
        }
        return { success: false, message: data?.message || "Failed to update role" };
    } catch (error) {
        console.error("Roles: Update role error:", error);
        return { success: false, message: error.response?.data?.message || "Failed to update role" };
    }
};

// ─── API: Update RWD Permission (quick toggle) ─────────────────────────────

export const updateRolePermission = async ({ roleId, name, added, removed, type = 1 }) => {
    try {
        const payload = {
            role_id: parseInt(roleId, 10),
            name,
            type,
            permission: {},
        };

        if (added?.length) {
            added.forEach((p) => { payload.permission[p] = true; });
        }
        if (removed?.length) {
            removed.forEach((p) => { payload.permission[p] = false; });
        }

        const { data } = await apiService.apiInstance.put("/settings/role", payload);
        if (data?.code === 200) {
            return { success: true, message: data.message || "Permission updated" };
        }
        return { success: false, message: data?.message || "Failed to update permission" };
    } catch (error) {
        console.error("Roles: Update RWD error:", error);
        return { success: false, message: "Failed to update permission" };
    }
};

// ─── API: Update Feature Permissions (permission settings modal) ────────────
// EMP module only (type=1). HRMS was removed from the UI.

export const updateFeaturePermissions = async ({ roleId, name, permissionIds, added, removed, mailStatus }) => {
    try {
        const payload = {
            role_id: parseInt(roleId, 10),
            name,
            permission_ids: permissionIds,
            type: "1",
            permission: { send_mail: mailStatus },
        };

        if (added?.length) {
            added.forEach((p) => { payload.permission[p] = true; });
        }
        if (removed?.length) {
            removed.forEach((p) => { payload.permission[p] = false; });
        }

        const { data } = await apiService.apiInstance.put("/settings/role", payload);
        if (data?.code === 200) {
            return { success: true, message: data.message || "Permissions updated successfully" };
        }
        return { success: false, message: data?.message || "Failed to update permissions" };
    } catch (error) {
        console.error("Roles: Update feature permissions error:", error);
        return { success: false, message: error.response?.data?.message || "Failed to update permissions" };
    }
};

// ─── API: Delete Role ───────────────────────────────────────────────────────

export const deleteRole = async (roleId) => {
    try {
        const { data } = await apiService.apiInstance.delete("/settings/role", {
            data: { role_id: parseInt(roleId, 10) },
        });
        if (data?.code === 200) {
            return { success: true, message: data.message || "Role deleted successfully" };
        }
        return { success: false, message: data?.message || "Failed to delete role" };
    } catch (error) {
        console.error("Roles: Delete role error:", error);
        return { success: false, message: error.response?.data?.message || "Failed to delete role" };
    }
};

// ─── API: Clone Role ────────────────────────────────────────────────────────

export const cloneRole = async ({ roleId, newName }) => {
    try {
        const { data } = await apiService.apiInstance.post("/settings/clone-role", {
            role_id: parseInt(roleId, 10),
            name: newName,
        });
        if (data?.statusCode === 200 || data?.code === 200) {
            return { success: true, message: data?.data?.message || data?.message || "Role cloned successfully" };
        }
        return { success: false, message: data?.data?.message || data?.message || "Failed to clone role" };
    } catch (error) {
        console.error("Roles: Clone role error:", error);
        return { success: false, message: error.response?.data?.message || "Failed to clone role" };
    }
};

// ─── API: Fetch Locations with Departments ──────────────────────────────────

export const getLocationsWithDept = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-locations-dept", {
            skip: "",
            limit: "",
        });
        if (data?.code === 200) {
            return {
                success: true,
                data: (data.data || []).map((loc) => ({
                    location_id: loc.location_id,
                    location: loc.location,
                    departments: (loc.department || []).map((d) => ({
                        department_id: d.department_id,
                        name: d.name,
                    })),
                })),
            };
        }
        return { success: false, data: [] };
    } catch (error) {
        console.error("Roles: Fetch locations error:", error);
        return { success: false, data: [] };
    }
};

// ─── API: Get Departments by Location ───────────────────────────────────────

export const getDepartmentsByLocation = async (locationId) => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-department-by-location", {
            location_id: locationId,
            role_id: "",
        });
        if (data?.code === 200) {
            return {
                success: true,
                data: (data.data || []).map((d) => ({
                    department_id: d.department_id,
                    name: d.name,
                })),
            };
        }
        return { success: false, data: [] };
    } catch (error) {
        console.error("Roles: Get depts by location error:", error);
        return { success: false, data: [] };
    }
};

// ─── Permission Categorizer ─────────────────────────────────────────────────

const PERMISSION_MAP = {
    dashboard_view: { category: "Dashboard", name: "View" },
    employee_browse: { category: "Employee", name: "View" },
    employee_create: { category: "Employee", name: "Create" },
    employee_modify: { category: "Employee", name: "Modify" },
    employee_view: { category: "Employee", name: "View" },
    employee_delete: { category: "Employee", name: "Delete" },
    employee_assign_employee: { category: "Employee", name: "Assign Employees" },
    employee_change_role: { category: "Employee", name: "Change Role" },
    employee_user_setting: { category: "Employee", name: "Track user Setting" },
    employee_productivity_view: { category: "Employee Productivity", name: "View" },
    employee_screenshot_view: { category: "Employee Screenshot", name: "View" },
    employee_webusage_view: { category: "Employee Web Usage", name: "View" },
    employee_webusage_delete: { category: "Employee Web Usage", name: "Delete" },
    employee_webusage_download: { category: "Employee Web Usage", name: "Download" },
    employee_application_usage_view: { category: "Employee Application Usage", name: "View" },
    employee_keystrokes_view: { category: "Employee Keystrokes", name: "View" },
    employee_insights_view: { category: "Employee Insights", name: "View" },
    timesheet_view: { category: "Timesheet", name: "View" },
    timesheet_download: { category: "Timesheet", name: "Download" },
    activity_alter_view: { category: "Idle To Productive", name: "View" },
    activity_alter_create: { category: "Idle To Productive", name: "Create" },
    activity_alter_process: { category: "Idle To Productive", name: "Process" },
    auto_accept_timeclaim: { category: "Idle To Productive", name: "Approve" },
    security_firewall_view: { category: "Security Firewall", name: "View" },
    security_firewall_create_rule: { category: "Security Firewall", name: "Create Rule" },
    security_firewall_modify_rule: { category: "Security Firewall", name: "Modify Rule" },
    security_firewall_add_domains: { category: "Security Firewall", name: "Add Domains" },
    settings_departments_browse: { category: "Settings Departments", name: "View" },
    settings_departments_create: { category: "Settings Departments", name: "Create" },
    settings_departments_modify: { category: "Settings Departments", name: "Modify" },
    settings_departments_delete: { category: "Settings Departments", name: "Delete" },
    settings_locations_browse: { category: "Settings Location", name: "View" },
    settings_locations_create: { category: "Settings Location", name: "Create" },
    settings_locations_modify: { category: "Settings Location", name: "Modify" },
    settings_locations_delete: { category: "Settings Location", name: "Delete" },
    settings_storage_browse: { category: "Settings Storage", name: "View" },
    settings_storage_create: { category: "Settings Storage", name: "Create" },
    settings_storage_modify: { category: "Settings Storage", name: "Modify" },
    settings_storage_delete: { category: "Settings Storage", name: "Delete" },
    settings_monitoring_configuration_browse: { category: "Monitoring Configuration", name: "View" },
    settings_monitoring_configuration_modify: { category: "Monitoring Configuration", name: "Modify" },
    settings_productivity_rule_browse: { category: "Productivity Rule", name: "View" },
    settings_productivity_rule_modify: { category: "Productivity Rule", name: "Modify" },
    add_productivity_ranking: { category: "Productivity Rule", name: "Create" },
    productivity_rule_download: { category: "Productivity Rule", name: "Download" },
    me_productivity_view: { category: "My Productivity", name: "Productivity" },
    me_timesheet_view: { category: "My Productivity", name: "Timesheet" },
    me_application_usage_view: { category: "My Productivity", name: "Application Usage" },
    me_web_usage_view: { category: "My Productivity", name: "Web Usage" },
    me_keystrokes_view: { category: "My Productivity", name: "Keystrokes" },
    me_screenshots_view: { category: "My Productivity", name: "Screenshots" },
    me_screen_record_view: { category: "My Productivity", name: "Screen Recording" },
    locate_me_employe_read: { category: "My Productivity", name: "Locate Me" },
    project_tasks_view: { category: "Project Tasks", name: "View" },
    project_tasks_create: { category: "Project Tasks", name: "Create" },
    project_tasks_modify: { category: "Project Tasks", name: "Modify" },
    project_tasks_delete: { category: "Project Tasks", name: "Delete" },
    project_tasks_download: { category: "Project Tasks", name: "Download" },
    screen_record_view: { category: "Employee Screen Video Recorder", name: "View" },
    non_admin_screen_casting: { category: "Screen Casting", name: "View" },
    email_monitoring_view: { category: "Email Monitoring", name: "View" },
    email_monitoring_download: { category: "Email Monitoring", name: "Download" },
    report_system_logs_view: { category: "System Activity Logs", name: "View" },
    report_system_logs_download: { category: "System Activity Logs", name: "Download" },
    reseller_view_details: { category: "Reseller Access Settings", name: "View" },
    reseller_edit_details: { category: "Reseller Access Settings", name: "Modify" },
    reseller_delete_details: { category: "Reseller Access Settings", name: "Delete" },
    roles_browse: { category: "Roles", name: "View" },
    roles_create: { category: "Roles", name: "Create" },
    roles_modify: { category: "Roles", name: "Modify" },
    roles_delete: { category: "Roles", name: "Delete" },
    report_web_application_used_view: { category: "Report", name: "View" },
    report_web_application_used_download: { category: "Report", name: "Download" },
    report_productivity_view: { category: "Productivity Report", name: "View" },
    report_productivity_download: { category: "Productivity Report", name: "Download" },
    report_consolidated_webapp_view: { category: "Web App Usage", name: "View" },
    report_consolidated_webapp_download: { category: "Web App Usage", name: "Download" },
    auto_email_view: { category: "Auto Email Report", name: "View" },
    auto_email_modify: { category: "Auto Email Report", name: "Modify" },
    auto_email_delete: { category: "Auto Email Report", name: "Delete" },
    auto_email_create: { category: "Auto Email Report", name: "Create" },
    attendance_view: { category: "Attendance", name: "View" },
    attendance_download: { category: "Attendance", name: "Download" },
    shift_view: { category: "Shift Management", name: "View" },
    shift_create: { category: "Shift Management", name: "Create" },
    shift_modify: { category: "Shift Management", name: "Edit" },
    shift_delete: { category: "Shift Management", name: "Delete" },
    policy_view: { category: "Alert Policy", name: "View" },
    policy_edit: { category: "Alert Policy", name: "Modify" },
    policy_delete: { category: "Alert Policy", name: "Delete" },
    alert_view: { category: "Alert", name: "View" },
    alert_create: { category: "Alert", name: "Create" },
    non_admin_live_monitoring: { category: "Live Monitoring", name: "View" },
    DLP_SYSTEM_ACTIVITY: { category: "DLP", name: "View" },
    localize_view: { category: "Localize", name: "View" },
    localize_edit: { category: "Localize", name: "Modify" },
};

export const categorizePermissions = (rawPermissions) => {
    const categorized = {};
    rawPermissions.forEach((perm) => {
        const mapping = PERMISSION_MAP[perm.name];
        if (mapping) {
            if (!categorized[mapping.category]) categorized[mapping.category] = [];
            categorized[mapping.category].push({
                id: perm.id,
                name: mapping.name,
                key: perm.name,
                status: perm.status,
            });
        }
    });
    return categorized;
};

// ─── Validation ─────────────────────────────────────────────────────────────

export const validateRoleName = (name) => {
    if (!name?.trim()) return "Role name is required";
    if (name.trim().length < 2) return "Minimum 2 characters required";
    return null;
};

// ─── Export: Excel ──────────────────────────────────────────────────────────

export const exportToExcel = (roles) => {
    try {
        const rows = roles.map((role) => ({
            "Role Name": role.name,
            Read: role.permission?.read ? "Yes" : "No",
            Write: role.permission?.write ? "Yes" : "No",
            Delete: role.permission?.delete ? "Yes" : "No",
            Location: formatLocationText(role),
            Department: formatDepartmentText(role),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Roles & Permissions");
        XLSX.writeFile(wb, "Roles_Permissions.xlsx");
        return { success: true };
    } catch (error) {
        console.error("Export Excel Error:", error);
        return { success: false };
    }
};

// ─── Export: CSV ────────────────────────────────────────────────────────────

export const exportToCSV = (roles) => {
    try {
        const rows = roles.map((role) => ({
            "Role Name": role.name,
            Read: role.permission?.read ? "Yes" : "No",
            Write: role.permission?.write ? "Yes" : "No",
            Delete: role.permission?.delete ? "Yes" : "No",
            Location: formatLocationText(role),
            Department: formatDepartmentText(role),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Roles");
        XLSX.writeFile(wb, "Roles_Permissions.csv", { bookType: "csv" });
        return { success: true };
    } catch (error) {
        console.error("Export CSV Error:", error);
        return { success: false };
    }
};

// ─── Export: PDF ────────────────────────────────────────────────────────────

export const exportToPDF = (roles) => {
    try {
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        doc.setFontSize(14);
        doc.text("Roles & Permissions", 40, 30);

        const headers = ["#", "Role Name", "Read", "Write", "Delete", "Location", "Department"];
        const body = roles.map((role, idx) => [
            idx + 1,
            role.name,
            role.permission?.read ? "Yes" : "No",
            role.permission?.write ? "Yes" : "No",
            role.permission?.delete ? "Yes" : "No",
            formatLocationText(role),
            formatDepartmentText(role),
        ]);

        autoTable(doc, {
            head: [headers],
            body,
            startY: 50,
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 20, right: 20 },
        });

        doc.save("Roles_Permissions.pdf");
        return { success: true };
    } catch (error) {
        console.error("Export PDF Error:", error);
        return { success: false };
    }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatLocationText = (role) => {
    if (role.locations?.length > 0) {
        return role.locations.map((l) => l.location).join(", ");
    }
    return "All";
};

const formatDepartmentText = (role) => {
    if (role.departments?.length > 0) {
        return role.departments.map((d) => d.department).join(", ");
    }
    if (role.locations?.length > 0) {
        const depts = [];
        role.locations.forEach((loc) => {
            if (loc.departments?.length > 0) {
                loc.departments.forEach((d) => {
                    if (d.department) depts.push(`${d.department} (${d.location})`);
                });
            }
        });
        if (depts.length > 0) return depts.join(", ");
    }
    return "All";
};
