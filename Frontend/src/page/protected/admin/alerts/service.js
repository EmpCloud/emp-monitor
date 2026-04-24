import apiService from "@/services/api.service";
import moment from "moment-timezone";

// ─── Shared helpers ──────────────────────────────────────────────────────────

const getLocations = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-locations");
        let items = [{ value: "all", label: "All Locations" }];
        if (data?.data?.length) {
            items = [...items, ...data.data.map((loc) => ({ value: loc.id, label: loc.name }))];
        }
        return items;
    } catch {
        return [{ value: "all", label: "All Locations" }];
    }
};

const getDepartments = async (locationId) => {
    try {
        const endpoint =
            locationId && locationId !== "all"
                ? "/location/get-department-by-location"
                : "/location/get-locations-dept";
        const payload =
            locationId && locationId !== "all" ? { location_id: locationId } : {};

        const { data } = await apiService.apiInstance.post(endpoint, payload);
        let items = [{ value: "all", label: "All Departments" }];

        if (locationId && locationId !== "all") {
            if (data?.data?.length) {
                items = [...items, ...data.data.map((d) => ({ value: d.department_id ?? d.id, label: d.name }))];
            }
        } else if (Array.isArray(data?.data)) {
            const map = new Map();
            data.data.forEach((loc) => {
                (loc.department || []).forEach((dept) => {
                    if (!map.has(dept.department_id)) {
                        map.set(dept.department_id, { value: String(dept.department_id), label: dept.name });
                    }
                });
            });
            items = [...items, ...Array.from(map.values())];
        }
        return items;
    } catch {
        return [{ value: "all", label: "All Departments" }];
    }
};

const getEmployeeList = async ({ locationId, departmentId } = {}) => {
    try {
        const { data } = await apiService.apiInstance.post("/user/fetch-users", {
            status: "",
            shift_id: -1,
            location_id: locationId && locationId !== "all" ? locationId : "",
            department_id: departmentId && departmentId !== "all" ? departmentId : "",
            role_id: "",
            day: new Date().toISOString().slice(0, 10),
            limit: 500,
            skip: 0,
            name: "",
        });
        const users = Array.isArray(data?.data?.user_data) ? data.data.user_data : [];
        let items = [{ value: "all", label: "All Employees" }];
        items = [
            ...items,
            ...users.map((emp) => ({
                value: String(emp.id ?? emp.u_id),
                label: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.email,
            })),
        ];
        return items;
    } catch {
        return [{ value: "all", label: "All Employees" }];
    }
};

// ─── Alert List (Notification) ───────────────────────────────────────────────
// Controller: AlertsController@getAlertList
// Backend: GET /alerts-and-notifications/alerts/find-by?skip=&limit=&location_id=&department_id=&employee_id=&search_keyword=&sort_by[field]=ORDER&from=&to=

const RISK_CODE_MAP = {
    "No Risk": "NR",
    Low: "LR",
    Medium: "MR",
    Moderate: "MR",
    High: "HR",
    Critical: "CR",
    // API also returns codes directly
    NR: "NR",
    LR: "LR",
    MR: "MR",
    HR: "HR",
    CR: "CR",
};

const RISK_COLORS = {
    NR: "#00ad42",
    LR: "#c3d100",
    MR: "#ffa300",
    HR: "#ff2d00",
    CR: "#ff0000",
};

const getAlertList = async ({
    locationId = "",
    departmentId = "",
    employeeId = "",
    startDate,
    endDate,
    skip = 0,
    limit = 10,
    sortName = "",
    sortOrder = "",
    search = "",
} = {}) => {
    try {
        const today = moment().format("YYYY-MM-DD");
        const from = startDate || today;
        const to = endDate || today;
        const fromISO = new Date(new Date(from).setHours(0, 0, 0, 0)).toISOString();
        const toISO = new Date(new Date(to).setHours(23, 59, 59, 999)).toISOString();

        const params = new URLSearchParams({
            skip: String(skip),
            limit: String(limit),
            from: fromISO,
            to: toISO,
        });

        if (locationId && locationId !== "all") params.set("location_id", String(locationId));
        if (departmentId && departmentId !== "all") params.set("department_id", String(departmentId));
        if (employeeId && employeeId !== "all") params.set("employee_id", String(employeeId));
        if (search) params.set("search_keyword", search);
        if (sortName && sortOrder) {
            const order = sortOrder === "A" ? "ASC" : "DESC";
            params.set(`sort_by[${sortName}]`, order);
        }

        const { data } = await apiService.apiInstance.get(
            `/alerts-and-notifications/alerts/find-by?${params.toString()}`
        );

        if (data?.code === 200) {
            const list = Array.isArray(data.data) ? data.data : [];
            const totalCount = list.length > 0 ? parseInt(list[0]?.total_count || 0) : 0;

            const rows = list.map((alert) => {
                const riskLevel = alert.risk_level === "Moderate" ? "Medium" : alert.risk_level;
                const riskCode = RISK_CODE_MAP[riskLevel] || "NR";
                return {
                    id: alert.id,
                    dateTime: moment(alert.datetime).format("DD-MM-YYYY HH:mm:ss"),
                    employee: alert.employee || "-",
                    employeeCode: alert.computer || "-",
                    ruleName: alert.policy || "-",
                    behaviorRule: alert.behavior_rule || "-",
                    alertTriggeredPoint: alert.behavior_rule || "-",
                    message: alert.message || "",
                    action: alert.action || "-",
                    riskLevel,
                    riskCode,
                    riskColor: RISK_COLORS[riskCode] || "#ccc",
                };
            });

            return { rows, totalCount };
        }
        return { rows: [], totalCount: 0 };
    } catch {
        return { rows: [], totalCount: 0 };
    }
};

// ─── Alert Policies ──────────────────────────────────────────────────────────
// Controller: AlertsController@getPolicyRules
// Backend: GET /alerts-and-notifications/find-by?skip=&limit=&name=&sort_by=&sort_order=

const getAlertPolicies = async ({
    skip = 0,
    limit = 10,
    sortName = "",
    sortOrder = "",
    search = "",
} = {}) => {
    try {
        const params = new URLSearchParams({
            skip: String(skip),
            limit: String(limit),
        });

        if (search) params.set("name", search);
        if (sortName) params.set("sort_by", sortName);
        if (sortName && sortOrder) {
            params.set("sort_order", sortOrder === "D" ? "DESC" : "ASC");
        }

        const { data } = await apiService.apiInstance.get(
            `/alerts-and-notifications/find-by?${params.toString()}`
        );

        if (data?.code === 200) {
            const list = Array.isArray(data.data) ? data.data : [];
            const totalCount = list.length > 0 ? parseInt(list[0]?.count || 0) : 0;

            const rows = list.map((policy) => {
                const riskCode = RISK_CODE_MAP[policy.risk_level] || "NR";
                return {
                    id: policy.id,
                    dateTime: policy.created_at?.split("+")[0]?.replace(/T/g, " ") || "-",
                    name: policy.name || "-",
                    note: policy.note || "",
                    type: policy.type || "",
                    riskLevel: policy.risk_level || "NR",
                    riskCode,
                    riskColor: RISK_COLORS[riskCode] || "#ccc",
                    isActionNotify: policy.is_action_notify === 1,
                    isMultipleAlertsInDay: policy.is_multiple_alerts_in_day,
                    notifyAs: policy.is_action_notify === 1 ? "Alert, Email" : "Email",
                    conditions: policy.conditions || [],
                    appliesTo: policy.include_employees?.ids || [],
                    allEmployees: policy.include_employees?.all_employees,
                    allLocations: policy.include_employees?.all_locations,
                    allDepartments: policy.include_employees?.all_departments,
                    recipients: policy.recipients || [],
                };
            });

            return { rows, totalCount };
        }
        return { rows: [], totalCount: 0 };
    } catch {
        return { rows: [], totalCount: 0 };
    }
};

// Controller: AlertsController@deleteParticularAlertRule
// Backend: DELETE /alerts-and-notifications
const deletePolicy = async (policyId) => {
    try {
        const { data } = await apiService.apiInstance.delete("/alerts-and-notifications", {
            data: { id: policyId },
        });
        return data?.code === 200;
    } catch {
        return false;
    }
};

// Controller: AlertsController@ApplyRules
// Backend: PUT /alerts-and-notifications/add-employee-to-rule
const applyRules = async (ruleIds = [], allRules = 0) => {
    try {
        const { data } = await apiService.apiInstance.put("/alerts-and-notifications/add-employee-to-rule", {
            rule_ids: ruleIds,
            all_rules: String(allRules),
        });
        return { success: data?.code === 200, message: data?.msg || "" };
    } catch {
        return { success: false, message: "Failed to apply rules" };
    }
};

// ─── Alert Rules Create/Update ───────────────────────────────────────────────

const RULE_TYPES = [
    { value: "DWT", label: "When daily work time is less or greater than specified hours/minutes" },
    { value: "SEE", label: "When someone ends early by specified minutes" },
    { value: "SSE", label: "When someone starts early by specified minutes" },
    { value: "SSL", label: "When someone starts late by specified minutes" },
    { value: "ABT", label: "When someone is absent" },
    { value: "WDO", label: "When someone works on day offs" },
    { value: "IDL", label: "When someone is idle for more than specified minutes" },
    { value: "OFFL", label: "When someone is offline for more than specified minutes" },
    { value: "ASA", label: "When someone accesses a specified web page or applications" },
    { value: "STA", label: "When someone spends time more than specified time on specified web page or applications" },
];

const CONDITION_TYPE_MAP = {
    MNT: "Minutes",
    HUR: "Hours",
    ABT: "Days",
    DMN: "Domain",
    APP: "Application",
};

// Controller: AlertsController@getAllLocationsAndDepartments
// Backend: POST /location/get-locations-dept
const getLocationsWithDepartments = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-locations-dept", {});
        if (data?.code === 200) {
            return Array.isArray(data.data) ? data.data : [];
        }
        return [];
    } catch {
        return [];
    }
};

// Uses the same /user/fetch-users endpoint
const getAllUsers = async ({ locationIds = [], departmentIds = [] } = {}) => {
    try {
        const { data } = await apiService.apiInstance.post("/user/fetch-users", {
            status: "",
            shift_id: -1,
            location_id: locationIds.length > 0 ? locationIds.join(",") : "",
            department_id: departmentIds.length > 0 ? departmentIds.join(",") : "",
            role_id: "",
            day: new Date().toISOString().slice(0, 10),
            limit: 500,
            skip: 0,
            name: "",
        });
        if (data?.code === 200) {
            return Array.isArray(data?.data?.user_data) ? data.data.user_data : [];
        }
        return [];
    } catch {
        return [];
    }
};

// Controller: AlertsController@createAlertRule
// Backend: POST /alerts-and-notifications
const createRule = async (ruleData) => {
    try {
        const { data } = await apiService.apiInstance.post("/alerts-and-notifications", ruleData);
        return {
            success: data?.code === 200,
            message: data?.message || data?.msg || (data?.code === 403 ? "Duplicate alert rule" : ""),
            nameError: data?.name,
        };
    } catch {
        return { success: false, message: "Failed to create rule" };
    }
};

// Controller: AlertsController@updateParticularAlertRule
// Backend: PUT /alerts-and-notifications
const updateRule = async (ruleData) => {
    try {
        const { data } = await apiService.apiInstance.put("/alerts-and-notifications", ruleData);
        return {
            success: data?.code === 200,
            message: data?.message || data?.msg || "",
        };
    } catch {
        return { success: false, message: "Failed to update rule" };
    }
};

export {
    // Shared
    getLocations,
    getDepartments,
    getEmployeeList,
    RISK_CODE_MAP,
    RISK_COLORS,
    // Alert list
    getAlertList,
    // Alert policies
    getAlertPolicies,
    deletePolicy,
    applyRules,
    // Alert rules
    RULE_TYPES,
    CONDITION_TYPE_MAP,
    getLocationsWithDepartments,
    getAllUsers,
    createRule,
    updateRule,
};
