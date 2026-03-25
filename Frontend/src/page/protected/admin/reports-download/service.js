import apiService from "@/services/api.service";
import moment from "moment-timezone";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const TIMEZONE = "Asia/Kolkata";

// ─── Dropdown Data APIs ────────────────────────────────────────────

const getRoles = async () => {
    try {
        const { data } = await apiService.apiInstance.get(`/organization/get-role`);
        let temp = [{ value: "all", label: "See All" }];
        const list = data?.data ?? [];
        if (Array.isArray(list) && list.length) {
            const roles = list.map((role) => ({
                value: String(role.id),
                label: role.name || "Role",
            }));
            temp = [...temp, ...roles];
        }
        return temp;
    } catch (error) {
        console.error("Roles API Error:", error);
        return [{ value: "all", label: "See All" }];
    }
};

const getLocations = async (roleId) => {
    try {
        const payload = roleId && roleId !== "all" ? { id: roleId } : {};
        const { data } = await apiService.apiInstance.post(
            `/location/get-locations`,
            payload
        );
        let temp = [{ value: "all", label: "See All" }];
        if (Array.isArray(data?.data) && data.data.length) {
            const locations = data.data.map((loc) => ({
                value: String(loc.id),
                label: loc.name,
            }));
            temp = [...temp, ...locations];
        }
        return temp;
    } catch (error) {
        console.error("Location API Error:", error);
        return [{ value: "all", label: "See All" }];
    }
};

const getDepartments = async (roleId, locationId) => {
    try {
        const payload = {};
        if (locationId && locationId !== "all") payload.location_id = locationId;
        if (roleId && roleId !== "all") payload.roleID = roleId;

        const endpoint =
            locationId && locationId !== "all"
                ? `/location/get-department-by-location`
                : `/location/get-locations-dept`;

        const { data } = await apiService.apiInstance.post(endpoint, payload);
        let temp = [{ value: "all", label: "See All" }];

        if (locationId && locationId !== "all") {
            if (Array.isArray(data?.data) && data.data.length) {
                const departments = data.data.map((dept) => ({
                    value: String(dept.department_id || dept.id),
                    label: dept.name,
                }));
                temp = [...temp, ...departments];
            }
            return temp;
        }

        if (Array.isArray(data?.data)) {
            const deptMap = new Map();
            data.data.forEach((location) => {
                (location.department || []).forEach((dept) => {
                    if (!deptMap.has(dept.department_id)) {
                        deptMap.set(dept.department_id, {
                            value: String(dept.department_id),
                            label: dept.name,
                        });
                    }
                });
            });
            temp = [...temp, ...Array.from(deptMap.values())];
        }
        return temp;
    } catch (error) {
        console.error("Department API Error:", error);
        return [{ value: "all", label: "See All" }];
    }
};

const getDownloadOptions = async () => {
    const FALLBACK = [
        { value: "all", label: "Select Option" },
        { value: "1", label: "Application Used" },
        { value: "2", label: "Browser History" },
        { value: "3", label: "Download All" },
    ];
    try {
        const { data } = await apiService.apiInstance.get(
            `/report/download-options`
        );
        let temp = [{ value: "all", label: "Select Option" }];
        const LABEL_MAP = {
            1: "Application Used",
            2: "Browser History",
            3: "Download All",
        };
        // Handle nested response: data.data or data.data.data
        const list = Array.isArray(data?.data?.data)
            ? data.data.data
            : Array.isArray(data?.data)
            ? data.data
            : [];

        if (list.length) {
            const options = list.map((opt) => ({
                value: String(opt.actual ?? opt.id ?? opt.value),
                label: LABEL_MAP[opt.actual] || opt.name || opt.label,
            }));
            temp = [...temp, ...options];
            return temp;
        }
        return FALLBACK;
    } catch (error) {
        console.error("Download Options API Error:", error);
        return FALLBACK;
    }
};

// ─── Employee List APIs ────────────────────────────────────────────

const getEmployeeList = async ({
    locationId = "",
    roleId = "",
    departmentId = "",
    startDate,
    endDate,
    limit = 10,
    skip = 0,
    searchText = "",
    sortName = "",
    sortOrder = "",
} = {}) => {
    try {
        const now = moment().tz(TIMEZONE);
        const payload = {
            location_id: locationId && locationId !== "all" ? locationId : "",
            role_id: roleId && roleId !== "all" ? roleId : "",
            department_id: departmentId && departmentId !== "all" ? departmentId : "",
            start_date: startDate || now.clone().subtract(7, "days").format("YYYY.MM.DD"),
            end_date: endDate || now.clone().subtract(1, "days").format("YYYY.MM.DD"),
            day: now.format("YYYY-MM-DD"),
            limit,
            skip,
            name: searchText || "",
        };
        if (sortName) {
            payload.sortColumn = sortName;
            payload.sortOrder = sortOrder || "asc";
        }

        const { data } = await apiService.apiInstance.post(
            `/user/fetch-users`,
            payload
        );

        if (data?.code === 200 && data?.data) {
            const users = (data.data.user_data || []).map((emp) => ({
                id: emp.id || emp.u_id || emp._id,
                name: emp.full_name || emp.name || "-",
                email: !emp.email || emp.email === "null" ? "-" : emp.email,
                location: emp.location || "-",
                department: emp.department || "-",
                designation: emp.role || emp.designation || "-",
                computerName: emp.computer_name || "-",
                status: emp.status,
                avatar: emp.avatar || null,
            }));

            return {
                code: 200,
                data: users,
                totalCount: data.data.total_count || users.length,
                statusData: data.data.status_data || null,
            };
        }
        return {
            code: data?.code || 400,
            data: [],
            totalCount: 0,
            msg: data?.message || "No data found",
        };
    } catch (error) {
        console.error("Employee List API Error:", error);
        return { code: 500, data: [], totalCount: 0, msg: "Failed to load employees" };
    }
};

const getManagerEmployeeList = async ({
    managerId,
    locationId = "",
    roleId = "",
    departmentId = "",
    startDate,
    endDate,
    limit = 10,
    skip = 0,
    searchText = "",
    sortName = "",
    sortOrder = "",
} = {}) => {
    try {
        const now = moment().tz(TIMEZONE);
        const payload = {
            to_assigned_id: Number(managerId),
            start_date: startDate || now.clone().subtract(7, "days").format("YYYY.MM.DD"),
            end_date: endDate || now.clone().subtract(1, "days").format("YYYY.MM.DD"),
            limit,
            skip,
            name: searchText || "",
        };
        if (locationId && locationId !== "all") payload.location_id = locationId;
        if (departmentId && departmentId !== "all") payload.department_id = departmentId;
        if (roleId && roleId !== "all") payload.role_id = roleId;
        if (sortName) {
            payload.sortColumn = sortName;
            payload.sortOrder = sortOrder || "asc";
        }

        const { data } = await apiService.apiInstance.post(
            `/user/get-assigned-employee`,
            payload
        );

        if (data?.code === 200 && data?.data) {
            const users = (data.data.user_data || []).map((emp) => ({
                id: emp.user_id || emp.id,
                name: emp.full_name || emp.name || "-",
                email: !emp.email || emp.email === "null" ? "-" : emp.email,
                location: emp.location || "-",
                department: emp.department || "-",
                designation: emp.role || emp.designation || "-",
                computerName: emp.computer_name || "-",
                status: emp.status,
                avatar: emp.avatar || null,
            }));

            return {
                code: 200,
                data: users,
                totalCount: data.data.total_count || users.length,
                statusData: data.data.status_data || null,
            };
        }
        return {
            code: data?.code || 201,
            data: [],
            totalCount: 0,
            msg: data?.message || "No data found",
        };
    } catch (error) {
        console.error("Manager Employee List API Error:", error);
        return { code: 500, data: [], totalCount: 0, msg: "Failed to load employees" };
    }
};

// ─── Report Actions ────────────────────────────────────────────────

const printSingleUserReport = async ({
    employeeId,
    downloadOption,
    startDate,
    endDate,
}) => {
    try {
        const { data } = await apiService.apiInstance.post(`/report/employee`, {
            employee_ids: [Number(employeeId)],
            download_option: Number(downloadOption),
            startDate,
            endDate,
        });

        if (data?.code === 200 && data?.data) {
            return {
                code: 200,
                data: processReportData(data.data),
                employeeDetails: data.employeeDetails || [],
            };
        }
        return { code: data?.code || 400, msg: data?.message || "No data found" };
    } catch (error) {
        console.error("Print Details API Error:", error);
        return { code: 500, msg: "Something went wrong" };
    }
};

const printMultipleUsersReport = async ({
    employeeIds,
    downloadOption,
    startDate,
    endDate,
    roleId,
    locationId,
    departmentId,
}) => {
    try {
        const payload = {
            download_option: Number(downloadOption),
            startDate,
            endDate,
        };
        if (employeeIds?.length) payload.employee_ids = employeeIds;
        if (roleId && roleId !== "all") payload.role_id = roleId;
        if (locationId && locationId !== "all") payload.location_id = locationId;
        if (departmentId && departmentId !== "all") payload.department_ids = departmentId;

        const response = await apiService.apiInstance.post(
            `/report/employee`,
            payload
        );
        const data = response.data;

        if (data?.code === 200 && data?.data) {
            const OPTION_LABELS = { 1: "Application Used", 2: "Browser History", 3: "Download All" };
            return {
                code: 200,
                data: data.data,
                option: OPTION_LABELS[downloadOption] || "Application Used",
                msg: data.message,
            };
        }
        return { code: data?.code || 400, msg: data?.message || data?.error || "No data found" };
    } catch (error) {
        console.error("Print Multiple Users API Error:", error);
        return { code: 500, msg: "Something went wrong" };
    }
};

const requestCSVDownload = async ({
    employeeIds,
    downloadOption,
    startDate,
    endDate,
    roleId,
    locationId,
    departmentId,
    selectedColumns,
    searchKeyword,
}) => {
    try {
        const payload = {
            download_option: Number(downloadOption),
            startDate,
            endDate,
        };
        if (employeeIds?.length) payload.employee_ids = employeeIds;
        if (roleId && roleId !== "all") payload.role_id = roleId;
        if (locationId && locationId !== "all") payload.location_id = locationId;
        if (departmentId && departmentId !== "all") payload.department_ids = departmentId;
        if (selectedColumns?.length) payload.selected_columns = selectedColumns;
        if (searchKeyword) payload.searchKeyword = searchKeyword;

        const response = await apiService.apiInstance.post(
            `/report/employee-excel`,
            payload
        );
        const data = response.data;

        if (data?.code === 200) {
            return { code: 200, msg: data.data, data: data.message };
        }
        return {
            code: 400,
            msg: "File(s) is/are already downloading/downloaded, please reload to check it.",
        };
    } catch (error) {
        console.error("CSV Download API Error:", error);
        return { code: 500, msg: "Something went wrong" };
    }
};

const getCSVReportStatus = async () => {
    try {
        const { data } = await apiService.apiInstance.get(
            `/report/get-activity-logs`
        );
        if (data?.code === 200 && Array.isArray(data?.data)) {
            return { code: 200, data: data.data };
        }
        return { code: 200, data: data?.data || [] };
    } catch (error) {
        console.error("CSV Report Status API Error:", error);
        return { code: 500, data: [] };
    }
};

// ─── Data Processing ───────────────────────────────────────────────

function processReportData(reportData) {
    const result = { ...reportData };

    if (Array.isArray(result.browser_history)) {
        result.browser_history = result.browser_history.map((item) => ({
            ...item,
            timeLeft: formatDuration(
                Math.abs(
                    moment(item.end_time).unix() - moment(item.start_time).unix()
                )
            ),
            idle_seconds: formatDuration(item.idle_seconds),
            active_seconds: formatDuration(item.active_seconds),
            total_duration: formatDuration(item.total_duration),
            start_date: moment(item.start_time).tz(item.timezone).format("DD-MM-YYYY"),
            start_time_fmt: moment(item.start_time).tz(item.timezone).format("HH:mm:ss"),
            end_date: moment(item.end_time).tz(item.timezone).format("DD-MM-YYYY"),
            end_time_fmt: moment(item.end_time).tz(item.timezone).format("HH:mm:ss"),
            browser_name: capitalize(item.browser_name || ""),
            status_label:
                item.status === 1
                    ? "Productive"
                    : item.status === 2
                    ? "Non Productive"
                    : "Neutral",
        }));
    }

    if (Array.isArray(result.application_used)) {
        result.application_used = result.application_used.map((item) => ({
            ...item,
            timeLeft: formatDuration(
                Math.abs(
                    moment(item.end_time).unix() - moment(item.start_time).unix()
                )
            ),
            idle_seconds: formatDuration(item.idle_seconds),
            active_seconds: formatDuration(item.active_seconds),
            total_duration: formatDuration(item.total_duration),
            start_date: moment(item.start_time).tz(item.timezone).format("DD-MM-YYYY"),
            start_time_fmt: moment(item.start_time).tz(item.timezone).format("HH:mm:ss"),
            end_date: moment(item.end_time).tz(item.timezone).format("DD-MM-YYYY"),
            end_time_fmt: moment(item.end_time).tz(item.timezone).format("HH:mm:ss"),
            app_name: capitalize(item.app_name || ""),
            status_label:
                item.status === 1
                    ? "Productive"
                    : item.status === 2
                    ? "Non Productive"
                    : "Neutral",
        }));
    }

    return result;
}

function formatDuration(totalSeconds) {
    const n = Math.abs(Math.floor(Number(totalSeconds) || 0));
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function capitalize(str) {
    return (str || "")
        .toLowerCase()
        .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

// ─── PDF Download Eligibility ──────────────────────────────────────

function checkPdfEligibility(dateRange, employeesCount) {
    const range = dateRange;
    const count = employeesCount;

    // Not allowed
    if (range > 40 && count > 10) return false;

    // Allowed cases
    if (range <= 1 && count <= 300) return true;
    if (range <= 5 && count <= 75) return true;
    if (range <= 7 && count <= 50) return true;
    if (range <= 90 && count <= 1) return true;
    if (range <= 50 && count <= 10) return true;
    if (range <= 31 && count <= 15) return true;

    return false;
}

// ─── Export: PDF (multi-user report) ───────────────────────────────

const APP_HEADERS = [
    "Employee Name", "Location", "Department", "Application Used",
    "Start Date", "Start Time", "End Date", "End Time",
    "Active Time", "Idle Time", "Total Time", "Keystrokes", "Category",
];

const BROWSER_HEADERS = [
    "Employee Name", "Location", "Department", "Browser",
    "Start Date", "Start Time", "End Date", "End Time",
    "Active Time", "Idle Time", "Total Time", "Keystrokes",
    "Domain", "Category",
];

const exportReportPDF = (reportData, type, employeeName = "") => {
    try {
        const doc = new jsPDF({ orientation: "landscape", compress: true });
        doc.setFontSize(14);
        const totalPagesExp = "{total_pages_count_string}";

        if (type === "application" || type === "all") {
            const appData = reportData.application_used || [];
            if (appData.length) {
                doc.text("Application Used Report", 15, 20);
                const body = appData.map((app) => [
                    app.employee_name || "-",
                    capitalize(app.location || "-"),
                    app.department || "-",
                    capitalize((app.app_name || "").replace(".exe", "")),
                    moment(app.start_time).tz(app.timezone).format("DD-MM-YYYY"),
                    moment(app.start_time).tz(app.timezone).format("HH:mm:ss"),
                    moment(app.end_time).tz(app.timezone).format("DD-MM-YYYY"),
                    moment(app.end_time).tz(app.timezone).format("HH:mm:ss"),
                    formatDuration(app.active_seconds),
                    formatDuration(app.idle_seconds),
                    formatDuration(app.total_duration),
                    (app.keystrokes || "").replace(/\n/g, " "),
                    app.status === 1 ? "Productive" : app.status === 2 ? "Non Productive" : "Neutral",
                ]);

                autoTable(doc, {
                    head: [APP_HEADERS],
                    body,
                    startY: 30,
                    theme: "grid",
                    styles: { fontSize: 6, cellPadding: 2 },
                    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    didDrawPage: (data) => {
                        doc.setFontSize(8);
                        doc.text(
                            "Page " + data.pageNumber + " of " + totalPagesExp,
                            15,
                            doc.internal.pageSize.height - 10
                        );
                    },
                });

                if (type === "all" && reportData.browser_history?.length) {
                    doc.addPage();
                }
            }
        }

        if (type === "browser" || type === "all") {
            const browserData = reportData.browser_history || [];
            if (browserData.length) {
                doc.text("Browser History Report", 15, 20);
                const body = browserData.map((hist) => [
                    hist.employee_name || "-",
                    capitalize(hist.location || "-"),
                    hist.department || "-",
                    capitalize(hist.browser_name || "-"),
                    moment(hist.start_time).tz(hist.timezone).format("DD-MM-YYYY"),
                    moment(hist.start_time).tz(hist.timezone).format("HH:mm:ss"),
                    moment(hist.end_time).tz(hist.timezone).format("DD-MM-YYYY"),
                    moment(hist.end_time).tz(hist.timezone).format("HH:mm:ss"),
                    formatDuration(hist.active_seconds),
                    formatDuration(hist.idle_seconds),
                    formatDuration(hist.total_duration),
                    (hist.keystrokes || "").replace(/\n/g, " "),
                    hist.domain_name || hist.url || "-",
                    hist.status === 1 ? "Productive" : hist.status === 2 ? "Non Productive" : "Neutral",
                ]);

                autoTable(doc, {
                    head: [BROWSER_HEADERS],
                    body,
                    startY: 30,
                    theme: "grid",
                    styles: { fontSize: 6, cellPadding: 2 },
                    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    didDrawPage: (data) => {
                        doc.setFontSize(8);
                        doc.text(
                            "Page " + data.pageNumber + " of " + totalPagesExp,
                            15,
                            doc.internal.pageSize.height - 10
                        );
                    },
                });
            }
        }

        if (typeof doc.putTotalPages === "function") {
            doc.putTotalPages(totalPagesExp);
        }

        const prefix = employeeName ? `${employeeName}_` : "";
        const suffix =
            type === "application"
                ? "Application_Used"
                : type === "browser"
                ? "Browser_History"
                : "All_Reports";
        doc.save(`${prefix}${suffix}.pdf`);
        return true;
    } catch (error) {
        console.error("PDF Export Error:", error);
        return false;
    }
};

// ─── Export: Excel/CSV (client-side from fetched data) ─────────────

const exportReportExcel = (reportData, type, employeeName = "") => {
    try {
        const wb = XLSX.utils.book_new();

        if (type === "application" || type === "all") {
            const appData = reportData.application_used || [];
            if (appData.length) {
                const rows = appData.map((app) => ({
                    "Employee Name": app.employee_name || "-",
                    Department: app.department || "-",
                    "Application Used": capitalize((app.app_name || "").replace(".exe", "")),
                    "Start Date": moment(app.start_time).tz(app.timezone).format("DD-MM-YYYY"),
                    "Start Time": moment(app.start_time).tz(app.timezone).format("HH:mm:ss"),
                    "End Date": moment(app.end_time).tz(app.timezone).format("DD-MM-YYYY"),
                    "End Time": moment(app.end_time).tz(app.timezone).format("HH:mm:ss"),
                    "Active Time": formatDuration(app.active_seconds),
                    "Idle Time": formatDuration(app.idle_seconds),
                    "Total Time": formatDuration(app.total_duration),
                    Keystrokes: (app.keystrokes || "").replace(/\n/g, " "),
                    Category: app.status === 1 ? "Productive" : app.status === 2 ? "Non Productive" : "Neutral",
                }));
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, "Application Used");
            }
        }

        if (type === "browser" || type === "all") {
            const browserData = reportData.browser_history || [];
            if (browserData.length) {
                const rows = browserData.map((hist) => ({
                    "Employee Name": hist.employee_name || "-",
                    Department: hist.department || "-",
                    Domain: hist.domain_name || "-",
                    "Start Date": moment(hist.start_time).tz(hist.timezone).format("DD-MM-YYYY"),
                    "Start Time": moment(hist.start_time).tz(hist.timezone).format("HH:mm:ss"),
                    "End Date": moment(hist.end_time).tz(hist.timezone).format("DD-MM-YYYY"),
                    "End Time": moment(hist.end_time).tz(hist.timezone).format("HH:mm:ss"),
                    "Active Time": formatDuration(hist.active_seconds),
                    "Idle Time": formatDuration(hist.idle_seconds),
                    "Total Time": formatDuration(hist.total_duration),
                    Category: hist.status === 1 ? "Productive" : hist.status === 2 ? "Non Productive" : "Neutral",
                    Keystrokes: (hist.keystrokes || "").replace(/\n/g, " "),
                    Browser: capitalize(hist.browser_name || "-"),
                    URL: hist.url || "-",
                }));
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, "Browser History");
            }
        }

        const prefix = employeeName ? `${employeeName}_` : "";
        const suffix =
            type === "application"
                ? "Application_Used"
                : type === "browser"
                ? "Browser_History"
                : "All_Reports";
        XLSX.writeFile(wb, `${prefix}${suffix}.xlsx`);
        return true;
    } catch (error) {
        console.error("Excel Export Error:", error);
        return false;
    }
};

// ─── Column Selection Options for CSV Dropdown ─────────────────────

const CSV_COLUMN_OPTIONS = [
    { value: "employee_name", label: "Employee Name", default: true, disabled: true },
    { value: "location", label: "Location", default: true },
    { value: "department", label: "Department", default: true },
    { value: "start_date", label: "Start Date", default: true },
    { value: "start_time", label: "Start Time", default: true },
    { value: "end_date", label: "End Date", default: true },
    { value: "end_time", label: "End Time", default: true },
    { value: "active_time", label: "Active Time", default: false },
    { value: "idle_time", label: "Idle Time", default: false },
    { value: "total_time", label: "Total Time", default: false },
    { value: "key_strokes", label: "Keystrokes", default: false },
    { value: "category", label: "Category", default: false },
    { value: "idle_time_in_mins", label: "Idle Time (mins)", default: false },
    { value: "active_time_in_mins", label: "Active Time (mins)", default: false },
    { value: "total_time_in_mins", label: "Total Time (mins)", default: false },
];

const BROWSER_EXTRA_COLUMNS = [
    { value: "domain", label: "Domain", default: false },
    { value: "browser", label: "Browser", default: false },
    { value: "URL", label: "URL", default: false },
];

export {
    getRoles,
    getLocations,
    getDepartments,
    getDownloadOptions,
    getEmployeeList,
    getManagerEmployeeList,
    printSingleUserReport,
    printMultipleUsersReport,
    requestCSVDownload,
    getCSVReportStatus,
    checkPdfEligibility,
    exportReportPDF,
    exportReportExcel,
    formatDuration,
    capitalize,
    CSV_COLUMN_OPTIONS,
    BROWSER_EXTRA_COLUMNS,
};
