import apiService from "@/services/api.service";
import moment from "moment-timezone";
import { exportToCsv, exportToPdf } from "@/services/dlp.service";

// ─── Row Mapper ─────────────────────────────────────────────────────────────

const mapRow = (log) => {
    const tz = log.timezone || "Asia/Kolkata";
    const startMoment = log.start ? moment.utc(log.start).tz(tz) : null;

    return {
        _id: log._id,
        title: log.title || "-",
        type: log.type || "-",
        description: log.description || "-",
        employeeId: log.employee_id,
        computer: log.computer || "-",
        start: startMoment ? startMoment.format("DD-MM-YYYY / HH:mm:ss") : "-",
        date: log.date || "-",
        fullName: log.full_name || "-",
        department: log.departament || "-",
        location: log.location || "-",
        timezone: tz,
    };
};

// ─── API ────────────────────────────────────────────────────────────────────

const buildUrl = (filters) => {
    const start = filters.startDate || moment().format("YYYY-MM-DD");
    const end = filters.endDate || moment().format("YYYY-MM-DD");

    let url = `/system-logs?startDate=${start}&endDate=${end}&limit=${filters.limit}&offset=${filters.skip}&type=10`;

    if (filters.employeeId && filters.employeeId !== "all") url += `&employee_id=${filters.employeeId}`;
    if (filters.locationId && filters.locationId !== "all") url += `&location_id=${filters.locationId}`;
    if (filters.departmentId && filters.departmentId !== "all") url += `&department_id=${filters.departmentId}`;
    if (filters.searchText) url += `&search_text=${encodeURIComponent(filters.searchText)}`;
    if (filters.sortName) url += `&sort_name=${filters.sortName}`;
    if (filters.sortOrder) url += `&sort_order=${filters.sortOrder}`;

    return url;
};

export const fetchLogs = async (filters) => {
    try {
        const { data } = await apiService.apiInstance.get(buildUrl(filters));
        const docs = data?.data?.docs ?? [];
        const totalDocs = data?.data?.totalDocs ?? 0;
        return { rows: (Array.isArray(docs) ? docs : []).map(mapRow), totalDocs };
    } catch (error) {
        console.error("Clipboard Logs API Error:", error);
        return { rows: [], totalDocs: 0 };
    }
};

export const fetchExport = async (filters) => {
    try {
        const { data } = await apiService.apiInstance.get(
            buildUrl({ ...filters, skip: 0, limit: 50000 })
        );
        const docs = data?.data?.docs ?? [];
        return (Array.isArray(docs) ? docs : []).map(mapRow);
    } catch (error) {
        console.error("Clipboard Logs Export API Error:", error);
        return [];
    }
};

// ─── Export Config ───────────────────────────────────────────────────────────

const HEADERS = ["Employee Name", "Employee ID", "Computer", "Location", "Department", "Title", "Date", "Time", "Description"];

const buildExportRow = (row) => [
    row.fullName, row.employeeId, row.computer, row.location, row.department,
    row.title, row.date, row.start, row.description,
];

export const exportCsv = (rows, filters) => exportToCsv({
    rows, headers: HEADERS, buildRow: buildExportRow,
    sheetName: "Clipboard Logs",
    fileName: `Clipboard_Logs_${filters.startDate}_to_${filters.endDate}.xlsx`,
});

export const exportPdf = (rows, filters) => exportToPdf({
    rows, headers: HEADERS, buildRow: buildExportRow,
    title: "Clipboard Logs Report",
    fileName: `Clipboard_Logs_${filters.startDate}_to_${filters.endDate}.pdf`,
    dateRange: `${filters.startDate} to ${filters.endDate}`,
});
