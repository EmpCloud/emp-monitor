import apiService from "@/services/api.service";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const COLOR_CODE_MAP = {
    1: "success_shift",   // green
    2: "warning_shift",   // yellow
    3: "danger_shift",    // red
    4: "primary_shift",   // blue
    5: "dark_shift",      // black
    6: "info_shift",      // light blue
};

const COLOR_LABEL_MAP = {
    1: "Green",
    2: "Yellow",
    3: "Red",
    4: "Blue",
    5: "Black",
    6: "Light Blue",
};

// ─── Helpers: Parse shift data from API ──────────────────────────────────────

const parseShiftData = (shift) => {
    let dayData = shift.data;
    if (typeof dayData === "string") {
        try {
            dayData = JSON.parse(dayData);
        } catch {
            dayData = {};
        }
    }

    // Flatten the API's shift-day map into one entry per weekday.
    // Some shifts come back with multiple active days joined into a
    // single key (e.g. `{"mon,tue,wed,thu,fri": {status, time}}`),
    // which previously rendered as one giant pill in the Days column.
    const activeDays = {};
    if (dayData && typeof dayData === "object") {
        Object.entries(dayData).forEach(([dayKey, value]) => {
            if (value?.status === false) return;
            const keys = String(dayKey)
                .split(",")
                .map((d) => d.trim().toLowerCase())
                .filter(Boolean);
            keys.forEach((day) => {
                activeDays[day] = value;
            });
        });
    }

    return {
        ...shift,
        data: activeDays,
        color_code: typeof shift.color_code === "number" ? shift.color_code : parseInt(shift.color_code, 10) || 1,
        colorClass: COLOR_CODE_MAP[shift.color_code] || "primary_shift",
    };
};

// ─── Helpers: Build API payload for create/update ────────────────────────────

const buildShiftPayload = (formData) => {
    const dayPayload = {};

    DAYS.forEach((day) => {
        const dayConfig = formData.days?.[day];
        if (dayConfig?.status) {
            dayPayload[day] = {
                status: true,
                time: {
                    start: dayConfig.start || null,
                    end: dayConfig.end || null,
                },
            };
        } else {
            dayPayload[day] = {
                status: false,
                time: {
                    start: dayConfig?.start || null,
                    end: dayConfig?.end || null,
                },
            };
        }
    });

    return {
        name: formData.name,
        data: JSON.stringify(dayPayload),
        color_code: parseInt(formData.color_code, 10) || 1,
        notes: (formData.notes != null && formData.notes !== "") ? formData.notes : " ",
        late_period: parseInt(formData.late_period, 10) || 0,
        early_login_logout_time: parseInt(formData.early_login_logout_time, 10) || 0,
        half_day_hours: formData.half_day_hours || "00:00",
        overtime_period: formData.overtime_period || "00:00",
        productivity_halfday: formData.productivity_halfday || "00:00",
        productivity_present: formData.productivity_present || "00:00",
    };
};

// ─── Validation ──────────────────────────────────────────────────────────────

export const validateShiftForm = (formData) => {
    if (!formData.name?.trim()) return "Shift name is required";

    const activeDays = DAYS.filter((d) => formData.days?.[d]?.status);
    if (activeDays.length === 0) return "Please select at least one day";

    for (const day of activeDays) {
        const config = formData.days[day];
        if (!config.start || !config.end) {
            return `Start and end time is required for ${day}`;
        }
        if (config.start === config.end) {
            return `Start time and end time should not be equal for ${day}`;
        }
    }

    // Validate productive time: if any field is filled, all must be filled
    const { productivity_halfday, productivity_present } = formData;
    const halfFilled = productivity_halfday && productivity_halfday !== "00:00";
    const fullFilled = productivity_present && productivity_present !== "00:00";
    if ((halfFilled && !fullFilled) || (!halfFilled && fullFilled)) {
        return "Please provide values for both full day and half day productive time";
    }

    return null;
};

// ─── API: Fetch Shifts (paginated) ───────────────────────────────────────────

export const getShifts = async ({ skip = 0, limit = 10 }) => {
    try {
        const { data } = await apiService.apiInstance.get("/organization-shift/find_by", {
            params: { skip, limit },
        });
        if (data?.code === 200) {
            const shifts = (data.data || []).map(parseShiftData);
            return {
                success: true,
                data: shifts,
                totalCount: data.count || shifts.length,
            };
        }
        return { success: false, message: data?.message || "Failed to fetch shifts", data: [], totalCount: 0 };
    } catch (error) {
        console.error("Shifts: Fetch shifts error:", error);
        return { success: false, message: "Failed to fetch shifts", data: [], totalCount: 0 };
    }
};

// ─── API: Fetch Shift by ID ─────────────────────────────────────────────────

export const getShiftById = async (shiftId) => {
    try {
        const { data } = await apiService.apiInstance.get("/organization-shift", {
            params: { id: shiftId },
        });
        if (data?.data?.length > 0) {
            const shift = parseShiftData(data.data[0]);

            // Parse late_period and early_login_logout_time (extract minutes)
            const parseMinutes = (val) => {
                if (typeof val === "number") return val;
                if (typeof val === "string") {
                    const parts = val.split(":");
                    if (parts.length >= 2) return parseInt(parts[1], 10) || 0;
                    return parseInt(val, 10) || 0;
                }
                return 0;
            };

            shift.late_period = parseMinutes(shift.late_period);
            shift.early_login_logout_time = parseMinutes(shift.early_login_logout_time);

            return { success: true, data: shift };
        }
        return { success: false, message: "Shift not found" };
    } catch (error) {
        console.error("Shifts: Fetch shift by ID error:", error);
        return { success: false, message: "Failed to fetch shift details" };
    }
};

// ─── API: Create Shift ──────────────────────────────────────────────────────

export const createShift = async (formData) => {
    try {
        const payload = buildShiftPayload(formData);
        const { data } = await apiService.apiInstance.post("/organization-shift", payload);

        if (data?.code === 200 || data?.statusCode === 200) {
            const responseData = data.data?.data || data.data || data;
            return {
                success: true,
                data: typeof responseData === "string" ? parseShiftData({ ...data.data, data: responseData }) : parseShiftData(responseData),
                message: data.message || "Shift created successfully",
            };
        }
        if (data?.code === 404) {
            return { success: false, message: data.error || data.message || "Validation failed" };
        }
        return { success: false, message: data?.message || "Failed to create shift" };
    } catch (error) {
        console.error("Shifts: Create shift error:", error);
        const errData = error.response?.data;
        return { success: false, message: errData?.error || errData?.message || "Failed to create shift" };
    }
};

// ─── API: Update Shift ──────────────────────────────────────────────────────

export const updateShift = async (shiftId, formData) => {
    try {
        const payload = {
            ...buildShiftPayload(formData),
            id: parseInt(shiftId, 10),
        };
        const { data } = await apiService.apiInstance.put("/organization-shift", payload);

        if (data?.code === 200) {
            const responseData = data.data?.result || data.data || data;
            return {
                success: true,
                data: parseShiftData(responseData),
                message: data.message || "Shift updated successfully",
            };
        }
        if (data?.code === 404) {
            return { success: false, message: data.error || data.message || "Validation failed" };
        }
        return { success: false, message: data?.message || "Failed to update shift" };
    } catch (error) {
        console.error("Shifts: Update shift error:", error);
        const errData = error.response?.data;
        return { success: false, message: errData?.error || errData?.message || "Failed to update shift" };
    }
};

// ─── API: Delete Shift ──────────────────────────────────────────────────────

export const deleteShift = async (shiftId) => {
    try {
        const { data } = await apiService.apiInstance.delete("/organization-shift", {
            data: { id: parseInt(shiftId, 10) },
        });
        if (data?.code === 200) {
            return { success: true, message: data.message || "Shift deleted successfully" };
        }
        return { success: false, message: data?.message || "Failed to delete shift" };
    } catch (error) {
        console.error("Shifts: Delete shift error:", error);
        return { success: false, message: error.response?.data?.message || "Failed to delete shift" };
    }
};

// ─── Export Helpers ──────────────────────────────────────────────────────────

const formatDaysText = (shift) => {
    const days = shift.data && typeof shift.data === "object" ? Object.keys(shift.data) : [];
    return days.length > 0 ? days.join(", ") : "--";
};

const formatTimeRange = (shift) => {
    const days = shift.data && typeof shift.data === "object" ? Object.values(shift.data) : [];
    if (days.length === 0) return { start: "--", end: "--" };
    const first = days[0];
    return {
        start: first?.time?.start || "--",
        end: first?.time?.end || "--",
    };
};

const buildExportRows = (shifts) => {
    return shifts.map((shift) => {
        const time = formatTimeRange(shift);
        return {
            "Shift Name": shift.name,
            Days: formatDaysText(shift),
            "Start Time": time.start,
            "End Time": time.end,
            Color: COLOR_LABEL_MAP[shift.color_code] || "N/A",
        };
    });
};

// ─── Export: Excel ───────────────────────────────────────────────────────────

export const exportToExcel = (shifts) => {
    try {
        const rows = buildExportRows(shifts);
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Shift Management");
        XLSX.writeFile(wb, "Shift_Management.xlsx");
        return { success: true };
    } catch (error) {
        console.error("Export Excel Error:", error);
        return { success: false };
    }
};

// ─── Export: CSV ─────────────────────────────────────────────────────────────

export const exportToCSV = (shifts) => {
    try {
        const rows = buildExportRows(shifts);
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Shifts");
        XLSX.writeFile(wb, "Shift_Management.csv", { bookType: "csv" });
        return { success: true };
    } catch (error) {
        console.error("Export CSV Error:", error);
        return { success: false };
    }
};

// ─── Export: PDF ─────────────────────────────────────────────────────────────

export const exportToPDF = (shifts) => {
    try {
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        doc.setFontSize(14);
        doc.text("Shift Management", 40, 30);

        const headers = ["#", "Shift Name", "Days", "Start Time", "End Time", "Color"];
        const body = shifts.map((shift, idx) => {
            const time = formatTimeRange(shift);
            return [
                idx + 1,
                shift.name,
                formatDaysText(shift),
                time.start,
                time.end,
                COLOR_LABEL_MAP[shift.color_code] || "N/A",
            ];
        });

        autoTable(doc, {
            head: [headers],
            body,
            startY: 50,
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 20, right: 20 },
        });

        doc.save("Shift_Management.pdf");
        return { success: true };
    } catch (error) {
        console.error("Export PDF Error:", error);
        return { success: false };
    }
};
