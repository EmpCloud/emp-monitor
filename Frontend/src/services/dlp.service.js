import apiService from "@/services/api.service";
import * as XLSX from "xlsx";
import autoTable from "jspdf-autotable";
import {
    createBrandedPdf,
    drawSummaryCard,
    drawSectionHeading,
    adaptiveTableStyles,
    drawFooter,
} from "@/utils/pdfBrand";

// ─── Shared Filter APIs ─────────────────────────────────────────────────────

export const getLocations = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-locations");
        let items = [{ value: "all", label: "All Locations" }];
        if (data?.data?.length) {
            items = [...items, ...data.data.map((loc) => ({ value: loc.id, label: loc.name }))];
        }
        return items;
    } catch (error) {
        console.error("DLP: Locations API Error:", error);
        return [{ value: "all", label: "All Locations" }];
    }
};

export const getDepartments = async (locationId) => {
    try {
        const endpoint = locationId && locationId !== "all"
            ? "/location/get-department-by-location"
            : "/location/get-locations-dept";
        const payload = locationId && locationId !== "all" ? { location_id: locationId } : {};

        const { data } = await apiService.apiInstance.post(endpoint, payload);
        let items = [{ value: "all", label: "All Departments" }];

        if (locationId && locationId !== "all") {
            if (data?.data?.length) {
                items = [...items, ...data.data.map((d) => ({ value: d.department_id, label: d.name }))];
            }
        } else if (Array.isArray(data?.data)) {
            const deptMap = new Map();
            data.data.forEach((loc) => {
                (loc.department || []).forEach((dept) => {
                    if (!deptMap.has(dept.department_id)) {
                        deptMap.set(dept.department_id, { value: String(dept.department_id), label: dept.name });
                    }
                });
            });
            items = [...items, ...Array.from(deptMap.values())];
        }
        return items;
    } catch (error) {
        console.error("DLP: Departments API Error:", error);
        return [{ value: "all", label: "All Departments" }];
    }
};

export const getEmployeeList = async ({ locationId, departmentId } = {}) => {
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
        items = [...items, ...users.map((emp) => ({
            value: String(emp.id ?? emp.u_id),
            label: emp.full_name || emp.name || emp.email || `Employee ${emp.id}`,
        }))];
        return items;
    } catch (error) {
        console.error("DLP: Employee List API Error:", error);
        return [{ value: "all", label: "All Employees" }];
    }
};

// ─── Shared Export Utilities ────────────────────────────────────────────────

export const exportToCsv = async ({ rows, headers, buildRow, sheetName, fileName }) => {
    try {
        const dataRows = rows.map(buildRow);
        const sheetData = [headers, ...dataRows];

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, fileName);

        return { success: true };
    } catch (error) {
        console.error("CSV Export Error:", error);
        return { success: false };
    }
};

/**
 * Branded DLP PDF export — single helper consumed by every DLP sub-page
 * (USB Detection, Clipboard Logs, Screenshot Logs, Email Activity Logs,
 * Print Logs). Updating the visual identity here propagates to all.
 *
 * @param {Object} opts
 * @param {Array}  opts.rows         Pre-fetched row objects
 * @param {Array<string>} opts.headers
 * @param {Function} opts.buildRow
 * @param {string} opts.title        Report title (header band)
 * @param {string} opts.fileName     Downloaded file name
 * @param {string} opts.dateRange    Range label (e.g. "2026-05-01 to 2026-05-11")
 * @param {Object} [opts.extraMeta]  Optional extra key/value rows in the summary card
 */
export const exportToPdf = async ({
    rows,
    headers,
    buildRow,
    title,
    fileName,
    dateRange,
    extraMeta = {},
}) => {
    try {
        const dataRows = rows.map(buildRow);
        const { doc, pageWidth, margin, contentWidth, cursorY: startY } =
            await createBrandedPdf({ title });
        let cursorY = startY;

        // Summary card
        const metaEntries = [["Date Range", dateRange]];
        Object.entries(extraMeta).forEach(([k, v]) => {
            if (v != null && v !== "") metaEntries.push([k, String(v)]);
        });

        cursorY = drawSummaryCard({
            doc,
            cursorY,
            pageWidth,
            margin,
            contentWidth,
            recordCount: dataRows.length,
            cols: metaEntries.length > 3 ? 3 : 2,
            entries: metaEntries,
        });

        cursorY = drawSectionHeading(doc, "Detailed Records", margin, cursorY);

        // Adaptive table styling sized to the column count
        const styles = adaptiveTableStyles(headers.length);
        autoTable(doc, {
            startY: cursorY,
            head: [headers],
            body: dataRows,
            theme: "grid",
            ...styles,
            margin: { left: margin, right: margin },
        });

        drawFooter(doc, { margin, pageWidth });
        doc.save(fileName);
        return { success: true };
    } catch (error) {
        console.error("PDF Export Error:", error);
        return { success: false };
    }
};
