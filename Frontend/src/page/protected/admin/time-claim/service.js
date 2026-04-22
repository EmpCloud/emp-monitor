import apiService from "@/services/api.service";
import moment from "moment-timezone";
import { exportToCsv, exportToPdf } from "@/services/dlp.service";

// ─── Constants ──────────────────────────────────────────────────────────────

export const REQUEST_TYPES = {
    IDLE: 1,
    OFFLINE: 2,
    BREAK: 3,
    ATTENDANCE: 4,
};

export const STATUS_MAP = {
    0: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    1: { label: "Approved", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
    2: { label: "Declined", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export const secondsToHMS = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    s -= h * 3600;
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    s -= m * 60;
    return `${h}:${m}:${s.toString().padStart(2, "0")}`;
};

const formatTime = (dateStr) => {
    if (!dateStr) return "-";
    return dateStr.split(" ")[1] || moment(dateStr).format("HH:mm:ss");
};

// ─── Row Mappers ────────────────────────────────────────────────────────────

const mapIdleRow = (item) => ({
    _id: item._id,
    name: item.name || "-",
    employeeId: item.employee_id,
    date: item.date || "-",
    startTime: formatTime(item.start_time),
    endTime: formatTime(item.end_time),
    computerName: item.computer_name || "-",
    reason: item.reason || "-",
    approverName: item.approver_name || "--",
    status: item.status,
    activities: item.activities || [],
    approvers: item.approvers || [],
});

const mapOfflineRow = (item) => ({
    _id: item._id,
    name: item.name || "-",
    employeeId: item.employee_id,
    date: item.date || "-",
    offlineTime: secondsToHMS(item.offline_time || 0),
    offlineTimeRaw: item.offline_time || 0,
    computerName: item.computer_name || "-",
    reason: item.reason || "-",
    approverName: item.approver_name || "--",
    status: item.status,
});

const mapBreakRow = (item) => ({
    _id: item._id,
    name: item.name || "-",
    employeeId: item.employee_id,
    date: item.date || "-",
    offlineTime: secondsToHMS(item.offline_time || 0),
    startTime: item.start_time || "-",
    endTime: item.end_time || "-",
    computerName: item.computer_name || "-",
    reason: item.reason || "-",
    approverName: item.approver_name || "--",
    status: item.status,
});

const mapAttendanceRow = (item) => ({
    _id: item._id,
    name: item.name || "-",
    employeeId: item.employee_id,
    taskName: item.task?.name || "--",
    date: item.date || "-",
    startTime: item.start_time || "-",
    endTime: item.end_time || "-",
    reason: item.reason || "-",
    approverName: item.approver_name || "--",
    status: item.status,
});

const getMapper = (requestType) => {
    switch (requestType) {
        case REQUEST_TYPES.OFFLINE: return mapOfflineRow;
        case REQUEST_TYPES.BREAK: return mapBreakRow;
        case REQUEST_TYPES.ATTENDANCE: return mapAttendanceRow;
        default: return mapIdleRow;
    }
};

// ─── Build query string for activity-request/get ────────────────────────────

const buildQueryString = (filters) => {
    const params = new URLSearchParams();
    params.set("from_date", filters.startDate || moment().subtract(30, "days").format("YYYY-MM-DD"));
    params.set("to_date", filters.endDate || moment().format("YYYY-MM-DD"));
    params.set("type", String(filters.requestType || 1));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.skip !== undefined) params.set("skip", String(filters.skip));
    if (filters.status && filters.status !== "all") params.set("status", String(filters.status));
    if (filters.searchText) params.set("search", filters.searchText);
    if (filters.sortName) params.set("sortColumn", filters.sortName);
    if (filters.sortOrder) params.set("order", filters.sortOrder);
    return params.toString();
};

// ─── Fetch Time Claim Data ──────────────────────────────────────────────────
// v3 API: GET /settings/activity-request/get?from_date=...&to_date=...&type=1

export const fetchTimeClaims = async (filters) => {
    try {
        const qs = buildQueryString(filters);
        const { data } = await apiService.apiInstance.get(`/settings/activity-request/get?${qs}`);

        if (data?.code === 200 && data?.data) {
            const mapper = getMapper(filters.requestType);
            const docs = data.data.activitrequests || [];
            return {
                rows: docs.map(mapper),
                totalDocs: data.data.totalCount || 0,
                rawData: data.data,
            };
        }
        return { rows: [], totalDocs: 0, rawData: null };
    } catch (error) {
        console.error("Time Claim Fetch Error:", error);
        return { rows: [], totalDocs: 0, rawData: null };
    }
};

// ─── CRUD Operations ────────────────────────────────────────────────────────

// v3 API: POST /settings/activity-request/create
// Body (all required): date, start_time, end_time, reason, activity_ids[], attendance_id
// Optional: employee_id (defaults to logged-in user's employee_id on backend).
export const createIdleRequest = async ({
    date, start_time, end_time, reason, activity_ids, attendance_id, employee_id,
}) => {
    try {
        const body = { date, start_time, end_time, reason, activity_ids, attendance_id };
        if (employee_id !== undefined && employee_id !== null && employee_id !== "") {
            body.employee_id = Number(employee_id);
        }
        const { data } = await apiService.apiInstance.post("/settings/activity-request/create", body);
        return data;
    } catch (error) {
        console.error("Create Idle Request Error:", error);
        return error?.response?.data ?? { code: 500, msg: "Failed to create request" };
    }
};

// v3 API: POST /settings/offline-activity/create-request
// Body: { offline_data: [{ date, start_time, end_time, reason, offline_time }] }
export const createOfflineRequest = async (rows) => {
    try {
        const { data } = await apiService.apiInstance.post(
            "/settings/offline-activity/create-request",
            { offline_data: rows },
        );
        return data;
    } catch (error) {
        console.error("Create Offline Request Error:", error);
        return error?.response?.data ?? { code: 500, msg: "Failed to create request" };
    }
};

// v3 API: PUT /settings/activity-request/update  (status + id)
export const updateRequestStatus = async (status, userId) => {
    try {
        const { data } = await apiService.apiInstance.put("/settings/activity-request/update", {
            status,
            id: userId,
        });
        return data;
    } catch (error) {
        console.error("Update Request Status Error:", error);
        return { code: 500, msg: "Failed to update request" };
    }
};

// v3 API: DELETE /settings/activity-request/delete  (idle/offline)
//         DELETE /settings/break-request/delete       (break)
export const deleteTimeClaim = async (userId, forBreak = "") => {
    try {
        const endpoint = forBreak === "ForBreak"
            ? "/settings/break-request/delete"
            : "/settings/activity-request/delete";
        const { data } = await apiService.apiInstance.delete(endpoint, { data: { id: userId } });
        return data;
    } catch (error) {
        console.error("Delete Request Error:", error);
        return { code: 500, msg: "Failed to delete request" };
    }
};

// v3 API: POST /settings/offline-activity/update
export const updateOfflineTime = async (payload) => {
    try {
        const { data } = await apiService.apiInstance.post("/settings/offline-activity/update", payload);
        return data;
    } catch (error) {
        console.error("Update Offline Time Error:", error);
        return { code: 500, msg: "Failed to update" };
    }
};

// v3 API: POST /settings/break-request/update
export const updateBreakRequest = async (payload) => {
    try {
        const { data } = await apiService.apiInstance.post("/settings/break-request/update", payload);
        return data;
    } catch (error) {
        console.error("Update Break Request Error:", error);
        return { code: 500, msg: "Failed to update" };
    }
};

// ─── Idle App/Web Data ──────────────────────────────────────────────────────
// v3 API: GET /settings/activity?date=...&start_time=...&end_time=...

export const fetchIdleAppWebData = async ({ date, startTime, endTime }) => {
    try {
        let url = `/settings/activity?date=${date}`;
        if (startTime) url += `&start_time=${startTime}`;
        if (endTime) url += `&end_time=${endTime}`;
        const { data } = await apiService.apiInstance.get(url);
        return data;
    } catch (error) {
        console.error("Idle App Web Data Error:", error);
        return { code: 500, data: null };
    }
};

// ─── Offline Time Data ──────────────────────────────────────────────────────
// v3 API: GET /settings/activity?date=...&type=2

export const fetchTotalOfflineTime = async (date) => {
    try {
        const { data } = await apiService.apiInstance.get(`/settings/activity?date=${date}&type=2`);
        return data;
    } catch (error) {
        console.error("Total Offline Time Error:", error);
        return { code: 500, data: null };
    }
};

// ─── Reasons ────────────────────────────────────────────────────────────────
// v3 API: GET  /settings/reason/fetch?type=1
//         POST /settings/reason/create
//         DELETE /settings/reason/delete?id=...

export const fetchReasons = async (type) => {
    try {
        const { data } = await apiService.apiInstance.get(`/settings/reason/fetch?type=${type}`);
        if (data?.code === 200) return data.data || [];
        return [];
    } catch (error) {
        console.error("Fetch Reasons Error:", error);
        return [];
    }
};

export const addReason = async (name, type) => {
    try {
        const { data } = await apiService.apiInstance.post("/settings/reason/create", { name, type });
        return data;
    } catch (error) {
        console.error("Add Reason Error:", error);
        return { code: 500, msg: "Failed to add reason" };
    }
};

export const deleteReason = async (id) => {
    try {
        const { data } = await apiService.apiInstance.delete(`/settings/reason/delete?id=${id}`);
        return data;
    } catch (error) {
        console.error("Delete Reason Error:", error);
        return { code: 500, msg: "Failed to delete reason" };
    }
};

// ─── Auto Approve ───────────────────────────────────────────────────────────
// v3 API: GET /settings/get-auto-time-claim-status
//         PUT /settings/update-auto-time-claim-status

export const fetchAutoApproveStatus = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/settings/get-auto-time-claim-status");
        return data;
    } catch (error) {
        console.error("Fetch Auto Approve Status Error:", error);
        return { code: 500, data: null };
    }
};

export const toggleAutoApprove = async (isEnable) => {
    try {
        // Backend validator expects is_enable as the literal string "true" or "false".
        const { data } = await apiService.apiInstance.put("/settings/update-auto-time-claim-status", {
            is_enable: isEnable ? "true" : "false",
        });
        return data;
    } catch (error) {
        console.error("Auto Approve Toggle Error:", error);
        return error?.response?.data ?? { code: 500, msg: "Failed to toggle auto approve" };
    }
};

// ─── Bulk Operations ────────────────────────────────────────────────────────
// v3 API: POST /settings/accept-multiple-time-claim

export const bulkApproveDecline = async (ids, status, requestType) => {
    try {
        const { data } = await apiService.apiInstance.post("/settings/accept-multiple-time-claim", {
            ids,
            type: requestType,
            status,
        });
        return data;
    } catch (error) {
        console.error("Bulk Approve/Decline Error:", error);
        return { code: 500, msg: "Failed to process bulk action" };
    }
};

// ─── Attendance ─────────────────────────────────────────────────────────────
// v3 API: POST /settings/attendance-request/create
//         PUT  /settings/attendance-request/update
//         DELETE /settings/attendance-request/delete

// v3 API: POST /settings/attendance-request/create
// Body (required): date, start_time, end_time, reason. Optional: task_id.
// Note: backend scopes this to req.decoded.employee_id — only works for employee login.
// For admin-initiated create on behalf of an employee, use createAttendanceRequestByManager instead.
export const createAttendanceRequest = async ({
    date, start_time, end_time, reason, task_id,
}) => {
    try {
        const body = { date, start_time, end_time, reason };
        if (task_id) body.task_id = task_id;
        const { data } = await apiService.apiInstance.post("/settings/attendance-request/create", body);
        return data;
    } catch (error) {
        console.error("Create Attendance Request Error:", error);
        return error?.response?.data ?? { code: 500, msg: "Failed to create attendance request" };
    }
};

// v3 API: POST /settings/attendance-request/create-by-manager
// Body (required): start_time, end_time, from_date, to_date, reason, employee_ids[]. Optional: task_id.
// Response: { code: 200, data: { successResponse: [...], errorResponse: [...] } } — partial-success possible.
export const createAttendanceRequestByManager = async ({
    date, start_time, end_time, reason, employee_ids, task_id,
}) => {
    try {
        const body = {
            from_date: date,
            to_date: date,
            start_time,
            end_time,
            reason,
            employee_ids,
        };
        if (task_id) body.task_id = task_id;
        const { data } = await apiService.apiInstance.post(
            "/settings/attendance-request/create-by-manager",
            body,
        );
        return data;
    } catch (error) {
        console.error("Create Attendance Request (by manager) Error:", error);
        return error?.response?.data ?? { code: 500, msg: "Failed to create attendance request" };
    }
};

export const updateAttendanceRequest = async (payload) => {
    try {
        const { data } = await apiService.apiInstance.put("/settings/attendance-request/update", payload);
        return data;
    } catch (error) {
        console.error("Update Attendance Request Error:", error);
        return { code: 500, msg: "Failed to update attendance request" };
    }
};

export const deleteAttendanceRequest = async (id) => {
    try {
        const { data } = await apiService.apiInstance.delete("/settings/attendance-request/delete", { data: { id } });
        return data;
    } catch (error) {
        console.error("Delete Attendance Request Error:", error);
        return { code: 500, msg: "Failed to delete attendance request" };
    }
};

// ─── CSV / PDF Export ───────────────────────────────────────────────────────

export const fetchExportData = async (filters) => {
    return fetchTimeClaims({ ...filters, skip: 0, limit: 50000 });
};

const IDLE_HEADERS = ["Name", "Date", "Start Time", "End Time", "Computer Name", "Reason", "Approver", "Status"];
const OFFLINE_HEADERS = ["Name", "Date", "Offline Time", "Computer Name", "Reason", "Approver", "Status"];
const BREAK_HEADERS = ["Name", "Date", "Break Time", "Start Time", "End Time", "Reason", "Computer Name", "Approver", "Status"];
const ATTENDANCE_HEADERS = ["Name", "Task", "Date", "Start Time", "End Time", "Reason", "Approver", "Status"];

const statusLabel = (s) => STATUS_MAP[s]?.label || "Unknown";

const buildIdleExportRow = (r) => [r.name, r.date, r.startTime, r.endTime, r.computerName, r.reason, r.approverName, statusLabel(r.status)];
const buildOfflineExportRow = (r) => [r.name, r.date, r.offlineTime, r.computerName, r.reason, r.approverName, statusLabel(r.status)];
const buildBreakExportRow = (r) => [r.name, r.date, r.offlineTime, r.startTime, r.endTime, r.reason, r.computerName, r.approverName, statusLabel(r.status)];
const buildAttendanceExportRow = (r) => [r.name, r.taskName, r.date, r.startTime, r.endTime, r.reason, r.approverName, statusLabel(r.status)];

export const getExportConfig = (requestType) => {
    switch (requestType) {
        case REQUEST_TYPES.OFFLINE: return { headers: OFFLINE_HEADERS, buildRow: buildOfflineExportRow, name: "Offline_Time_Claims" };
        case REQUEST_TYPES.BREAK: return { headers: BREAK_HEADERS, buildRow: buildBreakExportRow, name: "Break_Time_Claims" };
        case REQUEST_TYPES.ATTENDANCE: return { headers: ATTENDANCE_HEADERS, buildRow: buildAttendanceExportRow, name: "Attendance_Time_Claims" };
        default: return { headers: IDLE_HEADERS, buildRow: buildIdleExportRow, name: "Idle_Time_Claims" };
    }
};

export const exportTimeClaimCsv = (rows, filters) => {
    const config = getExportConfig(filters.requestType);
    return exportToCsv({
        rows, headers: config.headers, buildRow: config.buildRow,
        sheetName: config.name,
        fileName: `${config.name}_${filters.startDate}_to_${filters.endDate}.xlsx`,
    });
};

export const exportTimeClaimPdf = (rows, filters) => {
    const config = getExportConfig(filters.requestType);
    return exportToPdf({
        rows, headers: config.headers, buildRow: config.buildRow,
        title: `${config.name.replace(/_/g, " ")} Report`,
        fileName: `${config.name}_${filters.startDate}_to_${filters.endDate}.pdf`,
        dateRange: `${filters.startDate} to ${filters.endDate}`,
    });
};
