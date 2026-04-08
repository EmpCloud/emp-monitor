import apiService from "@/services/api.service";
import * as XLSX from "xlsx";
// import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Frequency Helpers ───────────────────────────────────────────────────────

export const FREQUENCY_KEY_MAP = {
    1: "emailReport.daily",
    2: "emailReport.weekly",
    3: "emailReport.monthly",
    4: "emailReport.custom",
    5: "emailReport.dateLabel",
    6: "emailReport.unproductiveLabel",
    7: "emailReport.monthly",
    9: "emailReport.timeLabel",
};

// For non-i18n contexts (exports, etc.)
export const FREQUENCY_MAP = {
    1: "Daily",
    2: "Weekly",
    3: "Monthly",
    4: "Custom",
    5: "Date",
    6: "Unproductive",
    7: "Monthly",
    9: "Time",
};

export const getFrequencyLabel = (freq) =>
    FREQUENCY_MAP[Number(freq)] || "NA";

export const getFrequencyKey = (freq) =>
    FREQUENCY_KEY_MAP[Number(freq)] || null;

// ─── Content Labels ──────────────────────────────────────────────────────────

export const CONTENT_LABELS = {
    productivity: "Productivity",
    timesheet: "Timesheet",
    apps_usage: "App Usage",
    websites_usage: "Website Usage",
    attendance: "Employee Attendance",
    hrms_attendance: "HRMS Attendance",
    manager_log: "Manager/TL Log",
};

export const CONTENT_KEY_MAP = {
    productivity: "emailReport.productivity",
    timesheet: "emailReport.timesheet",
    apps_usage: "emailReport.appUsage",
    websites_usage: "emailReport.websiteUsage",
    attendance: "emailReport.employeeAttendance",
    hrms_attendance: "emailReport.hrmsAttendance",
    manager_log: "emailReport.managerLog",
};

export const getContentLabels = (content) => {
    if (!content || typeof content !== "object") return [];
    return Object.entries(content)
        .filter(([key, val]) => parseInt(val) === 1 && CONTENT_LABELS[key])
        .map(([key]) => CONTENT_LABELS[key]);
};

export const getContentKeys = (content) => {
    if (!content || typeof content !== "object") return [];
    return Object.entries(content)
        .filter(([key, val]) => parseInt(val) === 1 && CONTENT_KEY_MAP[key])
        .map(([key]) => CONTENT_KEY_MAP[key]);
};

// ─── Filter Type Labels ─────────────────────────────────────────────────────

export const FILTER_TYPE_MAP = {
    1: "Whole Organization",
    2: "Specific Employees",
    3: "Specific Departments",
    4: "Specific Locations",
    5: "Specific Shifts",
};

export const FILTER_TYPE_KEY_MAP = {
    1: "emailReport.wholeOrg",
    2: "emailReport.specificEmployees",
    3: "emailReport.specificDepts",
    4: "emailReport.specificLocs",
    5: "emailReport.specificShifts",
};

// ─── API: Fetch Email Reports (paginated) ────────────────────────────────────

export const getEmailReports = async ({ skip = 0, limit = 10, name = "", sortColumn = "", sortOrder = "" } = {}) => {
    try {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (name) params.set("name", name);
        if (sortColumn) {
            params.set("sortColumn", sortColumn);
            params.set("sortOrder", sortOrder);
        }

        const { data } = await apiService.apiInstance.get(`/report/reports?${params.toString()}`);

        if (data?.code === 200) {
            const reports = (data.data?.reports || []).map((r) => ({
                ...r,
                recipients: typeof r.recipients === "string" ? r.recipients.split(",") : r.recipients || [],
            }));
            const totalCount = parseInt(data.data?.total_count) || 0;
            return { reports, totalCount };
        }
        return { reports: [], totalCount: 0 };
    } catch (error) {
        console.error("EmailReport: Fetch reports error:", error);
        return { reports: [], totalCount: 0 };
    }
};

// ─── API: Fetch Single Report by ID ──────────────────────────────────────────

export const getEmailReportById = async (reportId) => {
    try {
        const { data } = await apiService.apiInstance.get(`/report/report?email_report_id=${reportId}`);
        if (data?.code === 200) {
            return { success: true, data: data.data };
        }
        return { success: false, message: data?.message || "Failed to fetch report" };
    } catch (error) {
        console.error("EmailReport: Fetch by ID error:", error);
        return { success: false, message: "Failed to fetch report details" };
    }
};

// ─── API: Add New Report ─────────────────────────────────────────────────────

export const addEmailReport = async (payload) => {
    try {
        const { data, status } = await apiService.apiInstance.post("/report/add-report", payload);
        if (status === 200 && data?.code === 200) {
            const report = data.data;
            if (report?.recipients?.[0] && typeof report.recipients[0] === "string") {
                report.recipients = report.recipients[0].split(",");
            }
            return { success: true, data: report, message: data.message };
        }
        return { success: false, message: data?.message || "Failed to add report", error: data?.error };
    } catch (error) {
        console.error("EmailReport: Add report error:", error);
        const msg = error.response?.data?.message || "Failed to add report";
        return { success: false, message: msg };
    }
};

// ─── API: Edit Report ────────────────────────────────────────────────────────

export const editEmailReport = async (payload) => {
    try {
        const { data } = await apiService.apiInstance.put("/report/edit-report", payload);
        if (data?.code === 200) {
            const report = data.data;
            if (report?.recipients?.[0] && typeof report.recipients[0] === "string") {
                report.recipients = report.recipients[0].split(",");
            }
            return { success: true, data: report, message: data.message };
        }
        return { success: false, message: data?.message || "Failed to update report", error: data?.error };
    } catch (error) {
        console.error("EmailReport: Edit report error:", error);
        const msg = error.response?.data?.message || "Failed to update report";
        return { success: false, message: msg };
    }
};

// ─── API: Delete Report ──────────────────────────────────────────────────────

export const deleteEmailReport = async (reportId) => {
    try {
        const { data } = await apiService.apiInstance.delete(
            `/report/delete-reports?email_report_id=${reportId}`,
            { data: { email_report_ids: [reportId] } }
        );
        if (data?.code === 200) {
            return { success: true, data: data.data };
        }
        return { success: false, message: data?.message || "Failed to delete report" };
    } catch (error) {
        console.error("EmailReport: Delete error:", error);
        return { success: false, message: "Failed to delete report" };
    }
};

// ─── API: Test Email ─────────────────────────────────────────────────────────

export const sendTestEmail = async (payload) => {
    try {
        const { data, status } = await apiService.apiInstance.post("/report/test-email", payload);
        if (status === 200 && data?.code === 200) {
            return { success: true, message: data.message };
        }
        return { success: false, message: data?.message || "Test email failed" };
    } catch (error) {
        console.error("EmailReport: Test email error:", error);
        return { success: false, message: "Failed to send test email" };
    }
};

// ─── API: Get Departments ────────────────────────────────────────────────────

export const getDepartments = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-locations-dept");
        const departments = [];
        if (Array.isArray(data?.data)) {
            data.data.forEach((loc) => {
                (loc.department || []).forEach((dept) => {
                    if (!departments.find((d) => d.id === dept.department_id)) {
                        departments.push({ id: dept.department_id, name: dept.name });
                    }
                });
            });
        }
        return departments;
    } catch (error) {
        console.error("EmailReport: Departments error:", error);
        return [];
    }
};

// ─── API: Get Employees ──────────────────────────────────────────────────────

export const getEmployees = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/user/fetch-users", {
            status: "",
            shift_id: -1,
            location_id: "",
            department_id: "",
            role_id: "",
            day: new Date().toISOString().slice(0, 10),
            limit: 500,
            skip: 0,
            name: "",
        });
        const users = Array.isArray(data?.data?.user_data) ? data.data.user_data : [];
        return users.map((emp) => ({
            id: emp.id ?? emp.u_id,
            first_name: emp.first_name || "",
            last_name: emp.last_name || "",
            email: emp.email || emp.a_email || "",
        }));
    } catch (error) {
        console.error("EmailReport: Employees error:", error);
        return [];
    }
};

// ─── API: Get Locations ──────────────────────────────────────────────────────

export const getLocations = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-locations");
        return Array.isArray(data?.data) ? data.data.map((loc) => ({ id: loc.id, name: loc.name })) : [];
    } catch (error) {
        console.error("EmailReport: Locations error:", error);
        return [];
    }
};

// ─── API: Get Shifts ─────────────────────────────────────────────────────────

export const getShifts = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/organization-shift/find_by");
        return Array.isArray(data?.data) ? data.data.map((s) => ({ id: s.id, name: s.name })) : [];
    } catch (error) {
        console.error("EmailReport: Shifts error:", error);
        return [];
    }
};

// ─── Build Report Payload ────────────────────────────────────────────────────

export const buildReportPayload = (formData) => {
    const payload = {
        name: formData.reportTitle,
        frequency: formData.frequency,
        recipients: [formData.recipients.join(",")],
        filter_type: parseInt(formData.filterType),
        content: {
            productivity: formData.content.productivity ? "1" : "0",
            timesheet: formData.content.timesheet ? "1" : "0",
            apps_usage: formData.content.apps_usage ? "1" : "0",
            websites_usage: formData.content.websites_usage ? "1" : "0",
            keystrokes: "0",
            prodInMinutes: formData.content.prodInMinutes ? "1" : "0",
            timesheetInMinutes: formData.content.timesheetInMinutes ? "1" : "0",
            appsInMinutes: formData.content.appsInMinutes ? "1" : "0",
            websitesInMinutes: formData.content.websitesInMinutes ? "1" : "0",
            attendance: formData.content.attendance ? "1" : "0",
            hrms_attendance: formData.content.hrms_attendance ? "1" : "0",
            manager_log: formData.content.manager_log ? "1" : "0",
        },
        custom: {
            start: formData.customStart || "00:00:00",
            end: formData.customEnd || "00:00:00",
            date: formData.customDate || "0",
            time: formData.fixedTime || null,
        },
        report_types: formData.reportTypes || [],
    };

    const ft = parseInt(formData.filterType);
    if (ft === 2) payload.user_ids = formData.selectedEmployees || [];
    if (ft === 3) payload.department_ids = formData.selectedDepartments || [];
    if (ft === 4) payload.location_ids = formData.selectedLocations || [];
    if (ft === 5) payload.shift_ids = formData.selectedShifts || [];

    return payload;
};

export const buildEditPayload = (formData, initialSelections) => {
    const payload = buildReportPayload(formData);
    payload.email_report_id = formData.reportId;

    const ft = parseInt(formData.filterType);
    if (ft === 2) {
        payload.add_user_ids = formData.selectedEmployees || [];
        payload.del_user_ids = (initialSelections.employees || []).filter(
            (id) => !(formData.selectedEmployees || []).includes(id)
        );
        delete payload.user_ids;
    }
    if (ft === 3) {
        payload.add_department_ids = formData.selectedDepartments || [];
        payload.del_department_ids = (initialSelections.departments || []).filter(
            (id) => !(formData.selectedDepartments || []).includes(id)
        );
        delete payload.department_ids;
    }

    return payload;
};

// ─── Validation ──────────────────────────────────────────────────────────────

export const validateReportForm = (formData) => {
    if (!formData.reportTitle?.trim()) return "Report title is required";
    if (!formData.recipients?.length) return "At least one email recipient is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of formData.recipients) {
        if (!emailRegex.test(email.trim())) return `Invalid email: ${email}`;
    }

    if (formData.frequency === 9 && !formData.fixedTime) return "Time is required for Time frequency";

    const ft = parseInt(formData.filterType);
    if (ft === 2 && (!formData.selectedEmployees?.length)) return "Select at least one employee";
    if (ft === 3 && (!formData.selectedDepartments?.length)) return "Select at least one department";
    if (ft === 4 && (!formData.selectedLocations?.length)) return "Select at least one location";
    if (ft === 5 && (!formData.selectedShifts?.length)) return "Select at least one shift";

    const isUnproductive = formData.frequency === 6;
    if (!isUnproductive) {
        const hasContent = formData.content.productivity || formData.content.timesheet ||
            formData.content.apps_usage || formData.content.websites_usage ||
            formData.content.attendance || formData.content.hrms_attendance ||
            formData.content.manager_log;
        if (!hasContent) return "Select at least one content type";
        if (!formData.reportTypes?.length) return "Select at least one report type (PDF or CSV)";
    }

    return null;
};

// ─── Export: CSV/Excel ───────────────────────────────────────────────────────

export const exportReportsCsv = (reports) => {
    try {
        const rows = reports.map((r) => ({
            Title: r.name,
            Frequency: getFrequencyLabel(r.frequency),
            Recipients: Array.isArray(r.recipients) ? r.recipients.join(", ") : r.recipients,
            Content: getContentLabels(r.content).join(", "),
            "Filter Type": FILTER_TYPE_MAP[r.filter_type] || "Organization",
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Email Reports");
        XLSX.writeFile(workbook, "Email_Reports.xlsx");
        return { success: true };
    } catch (error) {
        console.error("Export CSV Error:", error);
        return { success: false };
    }
};

// ─── Export: PDF ─────────────────────────────────────────────────────────────

export const exportReportsPdf = (reports) => {
    try {
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        doc.setFontSize(14);
        doc.text("Auto Email Reports", 40, 30);

        const headers = ["Title", "Frequency", "Recipients", "Content", "Filter Type"];
        const body = reports.map((r) => [
            r.name,
            getFrequencyLabel(r.frequency),
            Array.isArray(r.recipients) ? r.recipients.join(", ") : r.recipients,
            getContentLabels(r.content).join(", "),
            FILTER_TYPE_MAP[r.filter_type] || "Organization",
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

        doc.save("Email_Reports.pdf");
        return { success: true };
    } catch (error) {
        console.error("Export PDF Error:", error);
        return { success: false };
    }
};
