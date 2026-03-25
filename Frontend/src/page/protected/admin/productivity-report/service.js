import apiService from "@/services/api.service";
import moment from "moment-timezone";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Table + Chart data API
 * Uses /report/productivity-list-new for both table rows and chart data
 */
const getProductivityList = async ({
    skip = 0,
    limit = 10,
    startDate,
    endDate,
    locationId = "All",
    departmentId = "all",
    employeeId = "all",
    timezone = "Asia/Kolkata"
} = {}) => {
    try {
        const now = moment().tz(timezone);
        const start = startDate || now.clone().subtract(7, "days").format("YYYY-MM-DD");
        const end = endDate || now.clone().subtract(1, "days").format("YYYY-MM-DD");

        const query = new URLSearchParams({
            skip: String(skip),
            limit: String(limit),
            startDate: start,
            endDate: end,
            location_id: String(locationId),
        });

        if (departmentId && departmentId !== "all") {
            query.set("department_id", String(departmentId));
        }

        if (employeeId && employeeId !== "all") {
            query.set("employee_id", String(employeeId));
        }

        const { data } = await apiService.apiInstance.get(
            `/report/productivity-list-new?${query.toString()}`
        );

        if (data?.code === 200 && Array.isArray(data?.data) && data.data.length > 0) {
            const rows = data.data.map((item, idx) => ({
                id: idx + 1 + skip,
                name: item.name || item.date || "-",
                productive: convertSecToHHMM(item.productive_duration),
                productivityPct: formatPercent(item.productivity),
                unproductive: convertSecToHHMM(item.non_productive_duration),
                unproductivePct: formatPercent(item.unproductivity),
                neutral: convertSecToHHMM(item.neutral_duration),
                idleTime: convertSecToHHMM(item.idle_duration),
                total: convertSecToHHMM(item.computer_activities_time),
                totalHrs: convertSecToHHMM(item.total_logged_duration),
                count: item.count || 0,
                computerName: item.computer_name || "",
                // Chart values: seconds → hours
                productiveHrs: secToHours(item.productive_duration),
                unproductiveHrs: secToHours(item.non_productive_duration),
                neutralHrs: secToHours(item.neutral_duration),
            }));

            return {
                rows,
                totalCount: data.total || data.totalCount || rows.length,
                raw: data
            };
        }

        return { rows: [], totalCount: 0, raw: data };
    } catch (error) {
        console.error("Productivity List API Error:", error);
        return { rows: [], totalCount: 0, raw: null };
    }
};

const getLocations = async () => {
    try {
        const { data } = await apiService.apiInstance.post(`/location/get-locations`);
        let temp = [{ value: "All", label: "All Location" }];
        if (data?.data?.length) {
            const locations = data.data.map((loc) => ({
                value: loc.id,
                label: loc.name
            }));
            temp = [...temp, ...locations];
        }
        return temp;
    } catch (error) {
        console.error("Location API Error:", error);
        return [{ value: "All", label: "All Location" }];
    }
};

const getDepartments = async (locationId) => {
    try {
        const { data } = await apiService.apiInstance.post(
            locationId && locationId !== "All"
                ? `/location/get-department-by-location`
                : `/location/get-locations-dept`,
            locationId && locationId !== "All" ? { location_id: locationId } : {}
        );
        let temp = [{ value: "all", label: "All Departments" }];
        if (locationId && locationId !== "All") {
            if (data?.data?.length) {
                const departments = data.data.map((dept) => ({
                    value: dept.department_id,
                    label: dept.name
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
                            label: dept.name
                        });
                    }
                });
            });
            temp = [...temp, ...Array.from(deptMap.values())];
        }
        return temp;
    } catch (error) {
        console.error("Department API Error:", error);
        return [{ value: "all", label: "All Departments" }];
    }
};

const getEmployees = async ({ locationId, departmentId, managerId } = {}) => {
    try {
        const isAssignedMode = Number.isFinite(Number(managerId)) && Number(managerId) > 0;
        const payload = isAssignedMode
            ? {
                to_assigned_id: Number(managerId),
                location_id: locationId || "",
                department_id: departmentId || "",
                role_id: "",
                limit: 500,
                skip: 0,
                name: ""
            }
            : {
                status: "",
                shift_id: -1,
                location_id: locationId || "",
                department_id: departmentId || "",
                role_id: "",
                day: moment().tz("Asia/Kolkata").format("YYYY-MM-DD"),
                limit: 500,
                skip: 0,
                name: ""
            };
        const endpoint = isAssignedMode ? `/user/get-assigned-employee` : `/user/fetch-users`;
        const { data } = await apiService.apiInstance.post(endpoint, payload);
        let temp = [{ value: "all", label: "All Employees" }];
        const users = data?.data?.user_data ?? [];
        if (Array.isArray(users) && users.length) {
            const employees = users.map((emp) => ({
                value: String(emp.user_id || emp.id || emp.u_id || emp._id),
                label: emp.full_name || emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.email || "-"
            }));
            temp = [...temp, ...employees];
        }
        return temp;
    } catch (error) {
        console.error("Employee API Error:", error);
        return [{ value: "all", label: "All Employees" }];
    }
};

/** Convert seconds to HH:MM:SS format */
function convertSecToHHMM(seconds) {
    if (!seconds && seconds !== 0) return "00:00:00";
    const n = Math.abs(Math.floor(Number(seconds)));
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Convert seconds to decimal hours for chart */
function secToHours(seconds) {
    const n = Number(seconds) || 0;
    return parseFloat((n / 3600).toFixed(2));
}

function formatPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0.00 %";
    return `${n.toFixed(2)} %`;
}

/** Export headers matching old JS populateTable() */
const EXPORT_HEADERS = [
    { key: "name", label: "Employee Name" },
    { key: "total", label: "Office Time (Hr)" },
    { key: "productive", label: "Productive" },
    { key: "productivityPct", label: "Productivity (%)" },
    { key: "unproductive", label: "Unproductive" },
    { key: "unproductivePct", label: "Unproductivity (%)" },
    { key: "neutral", label: "Neutral" },
    { key: "idleTime", label: "Idle Time" },
];

/** Fetch ALL rows for export */
const fetchAllRowsForExport = async ({ startDate, endDate, locationId, departmentId, employeeId }) => {
    const res = await getProductivityList({
        skip: 0,
        limit: 10000,
        startDate,
        endDate,
        locationId,
        departmentId,
        employeeId,
    });
    return res.rows;
};

/** Export as XLSX — matches old saveCSV() */
const exportCSV = async ({ startDate, endDate, locationId, departmentId, employeeId, rows: existingRows } = {}) => {
    const rows = existingRows || await fetchAllRowsForExport({ startDate, endDate, locationId, departmentId, employeeId });
    if (!rows.length) return;

    const csvData = [EXPORT_HEADERS.map((h) => h.label)];
    rows.forEach((row) => {
        csvData.push(EXPORT_HEADERS.map(({ key }) => row[key] ?? "-"));
    });

    const ws = XLSX.utils.aoa_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "productivity Report");
    XLSX.writeFile(wb, `Productivity_Report.xlsx`);
};

/** Export as PDF — using jsPDF + autoTable (matching timesheet pattern) */
const exportPDF = async ({ startDate, endDate, locationId, departmentId, employeeId, rows: existingRows } = {}) => {
    const rows = existingRows || await fetchAllRowsForExport({ startDate, endDate, locationId, departmentId, employeeId });
    if (!rows.length) return;

    const headers = EXPORT_HEADERS.map((h) => h.label);
    const bodyData = rows.map((row) =>
        EXPORT_HEADERS.map(({ key }) => row[key] ?? "-")
    );

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const totalPagesExp = "{total_pages_count_string}";

    doc.setFontSize(14);
    doc.text("Productivity Report", 40, 30);
    doc.setFontSize(9);
    doc.text(`${startDate} to ${endDate}`, 40, 45);

    autoTable(doc, {
        head: [headers],
        body: bodyData,
        startY: 60,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 20, right: 20 },
        columnStyles: {
            0: { cellWidth: 65 },
            1: { cellWidth: 60 },
            2: { cellWidth: 60 },
            3: { cellWidth: 60 },
            4: { cellWidth: 80 },
            5: { cellWidth: 75 },
            6: { cellWidth: 55 },
            7: { cellWidth: 55 },
        },
        didDrawPage: (data) => {
            const str = "Page " + data.pageNumber + " of " + totalPagesExp;
            doc.setFontSize(8);
            doc.text(str, 40, doc.internal.pageSize.height - 10);
        }
    });

    if (typeof doc.putTotalPages === "function") {
        doc.putTotalPages(totalPagesExp);
    }

    doc.save(`Productivity_Report_${startDate}_to_${endDate}.pdf`);
};

export {
    getProductivityList,
    getLocations,
    getDepartments,
    getEmployees,
    convertSecToHHMM,
    secToHours,
    formatPercent,
    exportCSV,
    exportPDF
};
