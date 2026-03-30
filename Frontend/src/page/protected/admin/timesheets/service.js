import apiService from "@/services/api.service";
import moment from "moment-timezone";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const getLocations = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-locations");
        let items = [{ value: "all", label: "All Locations" }];
        if (data?.data?.length) {
            items = [...items, ...data.data.map((loc) => ({ value: loc.id, label: loc.name }))];
        }
        return items;
    } catch (error) {
        console.error("Timesheet: Locations API Error:", error);
        return [{ value: "all", label: "All Locations" }];
    }
};

const getDepartments = async (locationId) => {
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
        console.error("Timesheet: Departments API Error:", error);
        return [{ value: "all", label: "All Departments" }];
    }
};

const getShifts = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/organization-shift/find_by");
        let items = [{ value: "all", label: "All Shifts" }];
        if (Array.isArray(data?.data)) {
            items = [...items, ...data.data.map((s) => ({ value: s.id, label: s.name }))];
        }
        return items;
    } catch (error) {
        console.error("Timesheet: Shifts API Error:", error);
        return [{ value: "all", label: "All Shifts" }];
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
        items = [...items, ...users.map((emp) => ({
            value: String(emp.id ?? emp.u_id),
            label: emp.full_name || emp.name || emp.email || `Employee ${emp.id}`,
        }))];
        return items;
    } catch (error) {
        console.error("Timesheet: Employee List API Error:", error);
        return [{ value: "all", label: "All Employees" }];
    }
};

const formatSecondsToHMS = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return "00:00:00";
    const total = Math.floor(n);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const formatSecondsToMinutes = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return "0:00";
    const total = Math.floor(n);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
};

const formatUtcToTimezone = (utcString, timezone) => {
    if (!utcString) return "-";
    const m = moment.utc(utcString).tz(timezone || "Asia/Kolkata");
    if (!m.isValid()) return "-";
    return m.format("DD-MM-YYYY / HH:mm:ss");
};

const mapEmployeeRow = (emp) => {
    const tz = emp.timezone || "Asia/Kolkata";
    const firstName = emp.first_name || "";
    const lastName = emp.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || "-";

    return {
        id: emp.id ?? emp.employee_id,
        name: fullName,
        email: emp.email || "-",
        empCode: emp.emp_code || "-",
        location: emp.location || "-",
        department: emp.department || "-",
        shift: emp.shift_name || "-",
        computerName: emp.computer_name || "-",
        clockIn: formatUtcToTimezone(emp.start_time, tz),
        clockOut: formatUtcToTimezone(emp.end_time, tz),
        totalTime: formatSecondsToHMS(emp.total_time),
        officeTime: formatSecondsToHMS(emp.office_time),
        activeTime: formatSecondsToHMS(emp.computer_activities_time),
        productiveTime: formatSecondsToHMS(emp.productive_duration),
        nonProductiveTime: formatSecondsToHMS(emp.non_productive_duration),
        neutralTime: formatSecondsToHMS(emp.neutral_duration),
        idleTime: formatSecondsToHMS(emp.idle_duration),
        offlineTime: formatSecondsToHMS(emp.offline),
        breakTime: formatSecondsToHMS(emp.break_duration),
        productivity: emp.productivity != null ? `${Number(emp.productivity).toFixed(2)}%` : "0.00%",
        unproductivity: emp.unproductive != null ? `${Number(emp.unproductive).toFixed(2)}%` : "0.00%",
        checkInIp: emp.details?.checkInIp || "-",
        checkOutIp: emp.details?.checkOutIp || "-",
        loggedInIp: emp.details?.checkInIp || "-",
        assignedTo: emp.AssignedTo || "-",
        mobileUsage: formatSecondsToHMS(emp.mobileUsageDuration),
        timezone: tz,
        // minutes format variants for export
        totalTimeMin: formatSecondsToMinutes(emp.total_time),
        officeTimeMin: formatSecondsToMinutes(emp.office_time),
        activeTimeMin: formatSecondsToMinutes(emp.computer_activities_time),
        productiveTimeMin: formatSecondsToMinutes(emp.productive_duration),
        nonProductiveTimeMin: formatSecondsToMinutes(emp.non_productive_duration),
        neutralTimeMin: formatSecondsToMinutes(emp.neutral_duration),
        idleTimeMin: formatSecondsToMinutes(emp.idle_duration),
        offlineTimeMin: formatSecondsToMinutes(emp.offline),
        breakTimeMin: formatSecondsToMinutes(emp.break_duration),
        // working days count (for average mode)
        workingDaysCount: emp.count ?? null,
        // raw seconds for export calculations
        _raw: {
            totalTime: emp.total_time,
            officeTime: emp.office_time,
            activeTime: emp.computer_activities_time,
            productiveTime: emp.productive_duration,
            nonProductiveTime: emp.non_productive_duration,
            neutralTime: emp.neutral_duration,
            idleTime: emp.idle_duration,
            offlineTime: emp.offline,
            breakTime: emp.break_duration,
            mobileUsage: emp.mobileUsageDuration,
            productivity: emp.productivity,
            unproductivity: emp.unproductive,
        },
    };
};

const getTimesheetData = async ({
    startDate,
    endDate,
    locationId = "all",
    departmentId = "all",
    employeeId = "all",
    shiftId = "all",
    skip = 0,
    limit = 10,
    sortColumn = "Full Name",
    sortOrder = "D",
    name = "",
} = {}) => {
    try {
        const today = moment().format("YYYY-MM-DD");
        const start = startDate || today;
        const end = endDate || today;

        const params = new URLSearchParams({
            skip: String(skip),
            limit: String(limit),
            location_id: locationId && locationId !== "all" ? String(locationId) : "0",
            department_id: departmentId && departmentId !== "all" ? String(departmentId) : "0",
            employee_id: employeeId && employeeId !== "all" ? String(employeeId) : "0",
            start_date: start,
            end_date: end,
            sortColumn,
            sortOrder,
        });

        if (shiftId && shiftId !== "all") {
            params.set("shift_id", String(shiftId));
        }

        if (name) {
            params.set("name", name);
        }

        const { data } = await apiService.apiInstance.get(`/timesheet/timesheet?${params.toString()}`);

        const list = data?.data?.user_data ?? [];
        const totalCount = data?.data?.totalCount ?? data?.data?.total_count ?? list.length;

        const rows = (Array.isArray(list) ? list : []).map(mapEmployeeRow);

        return { rows, totalCount };
    } catch (error) {
        console.error("Timesheet Data API Error:", error);
        return { rows: [], totalCount: 0 };
    }
};

const getTimesheetExportData = async ({
    startDate,
    endDate,
    locationId = "all",
    departmentId = "all",
    employeeId = "all",
    shiftId = "all",
    sortColumn = "Full Name",
    sortOrder = "D",
} = {}) => {
    try {
        const today = moment().format("YYYY-MM-DD");
        const start = startDate || today;
        const end = endDate || today;

        const baseParams = {
            location_id: locationId && locationId !== "all" ? String(locationId) : "0",
            department_id: departmentId && departmentId !== "all" ? String(departmentId) : "0",
            employee_id: employeeId && employeeId !== "all" ? String(employeeId) : "0",
            start_date: start,
            end_date: end,
            sortColumn,
            sortOrder,
        };

        if (shiftId && shiftId !== "all") {
            baseParams.shift_id = String(shiftId);
        }

        const PAGE_SIZE = 500;
        let allRows = [];
        let skip = 0;
        let hasMore = true;

        while (hasMore) {
            const queryStr = new URLSearchParams({
                ...baseParams,
                skip: String(skip),
                limit: String(PAGE_SIZE),
            });

            const { data } = await apiService.apiInstance.get(
                `/timesheet/timesheet?${queryStr.toString()}`
            );

            const list = data?.data?.user_data ?? [];
            const batch = (Array.isArray(list) ? list : []).map(mapEmployeeRow);
            allRows = [...allRows, ...batch];

            if (batch.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                skip += PAGE_SIZE;
            }
        }

        return allRows;
    } catch (error) {
        console.error("Timesheet Export Data API Error:", error);
        return [];
    }
};

// Column definitions for export — maps export key to { label, key (HH:MM:SS), minKey (minutes) }
const EXPORT_COLUMN_MAP = {
    name:         { label: "Name",           key: "name" },
    email:        { label: "Email id",       key: "email" },
    empCode:      { label: "Emp-Code",       key: "empCode" },
    location:     { label: "Location",       key: "location" },
    department:   { label: "Department",     key: "department" },
    shift:        { label: "Shift",          key: "shift" },
    clockIn:      { label: "Clock In",       key: "clockIn" },
    clockOut:     { label: "Clock Out",      key: "clockOut" },
    loggedInIp:   { label: "Logged In IP",   key: "loggedInIp" },
    totalHours:   { label: "Total Hours",    key: "totalTime",           minKey: "totalTimeMin" },
    officeHours:  { label: "Office Hours",   key: "officeTime",          minKey: "officeTimeMin" },
    activeHours:  { label: "Active Hours",   key: "activeTime",          minKey: "activeTimeMin" },
    productive:   { label: "Productive",     key: "productiveTime",      minKey: "productiveTimeMin" },
    unproductive: { label: "Unproductive",   key: "nonProductiveTime",   minKey: "nonProductiveTimeMin" },
    idle:         { label: "Idle",           key: "idleTime",            minKey: "idleTimeMin" },
    neutral:      { label: "Neutral",        key: "neutralTime",         minKey: "neutralTimeMin" },
    offlineHours: { label: "Offline Hours",  key: "offlineTime",         minKey: "offlineTimeMin" },
    breakHours:   { label: "Break Hours",    key: "breakTime",           minKey: "breakTimeMin" },
    productivity: { label: "Productivity",   key: "productivity" },
    assignedList: { label: "Assigned List",  key: "assignedTo" },
};

// Special export keys that modify behaviour rather than mapping to a column
const SPECIAL_KEYS = ["timeInMinutes", "timeInTotal", "average", "absentUsers", "splitSheet"];

// When "Average" is selected, group rows by employee and aggregate
const aggregateForAverage = (rows, filters) => {
    const startDate = moment(filters.startDate);
    const endDate = moment(filters.endDate);
    const totalDays = endDate.diff(startDate, "days") + 1;

    const grouped = new Map();
    rows.forEach((row) => {
        const key = row.id ?? row.name;
        if (!grouped.has(key)) {
            grouped.set(key, {
                ...row,
                _workingDays: 0,
                _totalDays: totalDays,
                _rawTotals: {
                    totalTime: 0, officeTime: 0, activeTime: 0,
                    productiveTime: 0, nonProductiveTime: 0, neutralTime: 0,
                    idleTime: 0, offlineTime: 0, breakTime: 0,
                    productivitySum: 0,
                },
            });
        }
        const agg = grouped.get(key);
        // Each row with a valid clockIn counts as a working day
        if (row.clockIn && row.clockIn !== "-") {
            agg._workingDays += 1;
        }
        // Sum raw seconds for averaging
        const raw = row._raw || {};
        agg._rawTotals.totalTime += Number(raw.totalTime) || 0;
        agg._rawTotals.officeTime += Number(raw.officeTime) || 0;
        agg._rawTotals.activeTime += Number(raw.activeTime) || 0;
        agg._rawTotals.productiveTime += Number(raw.productiveTime) || 0;
        agg._rawTotals.nonProductiveTime += Number(raw.nonProductiveTime) || 0;
        agg._rawTotals.neutralTime += Number(raw.neutralTime) || 0;
        agg._rawTotals.idleTime += Number(raw.idleTime) || 0;
        agg._rawTotals.offlineTime += Number(raw.offlineTime) || 0;
        agg._rawTotals.breakTime += Number(raw.breakTime) || 0;
        agg._rawTotals.productivitySum += Number(raw.productivity) || 0;
    });

    return Array.from(grouped.values()).map((agg) => {
        const days = agg._workingDays || 1;
        const t = agg._rawTotals;
        return {
            ...agg,
            clockIn: String(agg._workingDays),
            clockOut: String(agg._totalDays - agg._workingDays),
            totalTime: formatSecondsToHMS(Math.round(t.totalTime / days)),
            officeTime: formatSecondsToHMS(Math.round(t.officeTime / days)),
            activeTime: formatSecondsToHMS(Math.round(t.activeTime / days)),
            productiveTime: formatSecondsToHMS(Math.round(t.productiveTime / days)),
            nonProductiveTime: formatSecondsToHMS(Math.round(t.nonProductiveTime / days)),
            neutralTime: formatSecondsToHMS(Math.round(t.neutralTime / days)),
            idleTime: formatSecondsToHMS(Math.round(t.idleTime / days)),
            offlineTime: formatSecondsToHMS(Math.round(t.offlineTime / days)),
            breakTime: formatSecondsToHMS(Math.round(t.breakTime / days)),
            totalTimeMin: formatSecondsToMinutes(Math.round(t.totalTime / days)),
            officeTimeMin: formatSecondsToMinutes(Math.round(t.officeTime / days)),
            activeTimeMin: formatSecondsToMinutes(Math.round(t.activeTime / days)),
            productiveTimeMin: formatSecondsToMinutes(Math.round(t.productiveTime / days)),
            nonProductiveTimeMin: formatSecondsToMinutes(Math.round(t.nonProductiveTime / days)),
            neutralTimeMin: formatSecondsToMinutes(Math.round(t.neutralTime / days)),
            idleTimeMin: formatSecondsToMinutes(Math.round(t.idleTime / days)),
            offlineTimeMin: formatSecondsToMinutes(Math.round(t.offlineTime / days)),
            breakTimeMin: formatSecondsToMinutes(Math.round(t.breakTime / days)),
            productivity: `${(t.productivitySum / days).toFixed(2)}%`,
        };
    });
};

const buildExportRows = (rows, selectedKeys, filters) => {
    const useMinutes = selectedKeys.includes("timeInMinutes");
    const useAverage = selectedKeys.includes("average");

    // If average mode, aggregate rows by employee on the frontend
    const exportRows = useAverage ? aggregateForAverage(rows, filters) : rows;

    // Build paired array of { exportKey, colDef } — skip special keys and keys not in the map
    const columnPairs = selectedKeys
        .filter((k) => !SPECIAL_KEYS.includes(k))
        .map((k) => ({ exportKey: k, colDef: EXPORT_COLUMN_MAP[k] }))
        .filter((p) => p.colDef);

    // Time suffix for header labels
    const timeSuffix = useMinutes ? " (Min)" : " (Hr)";
    const timeColumnKeys = new Set(["totalHours", "officeHours", "activeHours", "productive", "unproductive", "idle", "neutral", "offlineHours", "breakHours"]);

    const headers = columnPairs.map(({ exportKey, colDef }) => {
        if (useAverage && exportKey === "clockIn") return "Working Days";
        if (useAverage && exportKey === "clockOut") return "Non-Working Days";
        if (timeColumnKeys.has(exportKey)) return `${colDef.label}${timeSuffix}`;
        return colDef.label;
    });

    const dataRows = exportRows.map((row) =>
        columnPairs.map(({ colDef }) => {
            // Use minutes variant if timeInMinutes is selected
            if (useMinutes && colDef.minKey) {
                return row[colDef.minKey] ?? "-";
            }
            return row[colDef.key] ?? "-";
        })
    );

    return { headers, dataRows };
};

const exportTimesheetCsv = async (rows, selectedKeys, filters) => {
    try {
        const useSplitSheet = selectedKeys.includes("splitSheet");

        if (useSplitSheet) {
            // Split sheet mode: one sheet per employee
            const workbook = XLSX.utils.book_new();
            const employeeGroups = new Map();

            rows.forEach((row) => {
                const key = row.name || "Unknown";
                if (!employeeGroups.has(key)) employeeGroups.set(key, []);
                employeeGroups.get(key).push(row);
            });

            employeeGroups.forEach((empRows, empName) => {
                const { headers, dataRows } = buildExportRows(empRows, selectedKeys, filters);
                const sheetData = [headers, ...dataRows];
                const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
                // Sheet names limited to 31 chars
                const sheetName = empName.slice(0, 31);
                XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            });

            const dateRange = `${filters.startDate}_to_${filters.endDate}`;
            XLSX.writeFile(workbook, `Timesheet_Split_${dateRange}.xlsx`);
        } else {
            const { headers, dataRows } = buildExportRows(rows, selectedKeys, filters);
            const sheetData = [headers, ...dataRows];

            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Timesheet");

            const dateRange = `${filters.startDate}_to_${filters.endDate}`;
            XLSX.writeFile(workbook, `Timesheet_${dateRange}.xlsx`);
        }

        return { success: true };
    } catch (error) {
        console.error("CSV Export Error:", error);
        return { success: false };
    }
};

const exportTimesheetPdf = async (rows, selectedKeys, filters) => {
    try {
        const { headers, dataRows } = buildExportRows(rows, selectedKeys, filters);

        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

        doc.setFontSize(14);
        doc.text("Timesheet Report", 40, 30);
        doc.setFontSize(9);
        doc.text(`Date Range: ${filters.startDate} to ${filters.endDate}`, 40, 45);

        autoTable(doc, {
            head: [headers],
            body: dataRows,
            startY: 60,
            styles: { fontSize: 7, cellPadding: 3 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 20, right: 20 },
        });

        const dateRange = `${filters.startDate}_to_${filters.endDate}`;
        doc.save(`Timesheet_${dateRange}.pdf`);

        return { success: true };
    } catch (error) {
        console.error("PDF Export Error:", error);
        return { success: false };
    }
};

export {
    getLocations,
    getDepartments,
    getShifts,
    getEmployeeList,
    getTimesheetData,
    getTimesheetExportData,
    exportTimesheetCsv,
    exportTimesheetPdf,
    formatSecondsToHMS,
    formatSecondsToMinutes,
    EXPORT_COLUMN_MAP,
};
