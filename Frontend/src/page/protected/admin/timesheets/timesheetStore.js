import { create } from "zustand";
import moment from "moment-timezone";
import {
    getLocations,
    getDepartments,
    getShifts,
    getEmployeeList,
    getTimesheetData,
    getTimesheetExportData,
    exportTimesheetCsv,
    exportTimesheetPdf,
} from "./service";

const today = moment().format("YYYY-MM-DD");

// Default visible columns in the table
const DEFAULT_VISIBLE_COLUMNS = [
    "email", "empCode", "location", "department", "shift", "computerName",
    "clockIn", "clockOut", "totalTime", "officeTime", "activeTime",
    "productiveTime", "nonProductiveTime", "neutralTime", "idleTime",
    "offlineTime", "productivity",
];

// All available columns (including conditional ones from old code)
const ALL_COLUMNS = [
    { key: "email", label: "Email", alwaysAvailable: true },
    { key: "empCode", label: "Emp Code", alwaysAvailable: true },
    { key: "location", label: "Location", alwaysAvailable: true },
    { key: "department", label: "Department", alwaysAvailable: true },
    { key: "shift", label: "Shift", alwaysAvailable: true },
    { key: "computerName", label: "Computer Name", alwaysAvailable: true },
    { key: "clockIn", label: "Clock In", alwaysAvailable: true },
    { key: "clockOut", label: "Clock Out", alwaysAvailable: true },
    { key: "checkInIp", label: "Check-In IP", alwaysAvailable: false },
    { key: "checkOutIp", label: "Check-Out IP", alwaysAvailable: false },
    { key: "totalTime", label: "Total Hours", alwaysAvailable: true },
    { key: "officeTime", label: "Office Hours", alwaysAvailable: true },
    { key: "activeTime", label: "Active Hours", alwaysAvailable: true },
    { key: "productiveTime", label: "Productive", alwaysAvailable: true },
    { key: "nonProductiveTime", label: "Unproductive", alwaysAvailable: true },
    { key: "neutralTime", label: "Neutral", alwaysAvailable: true },
    { key: "idleTime", label: "Idle", alwaysAvailable: true },
    { key: "offlineTime", label: "Offline", alwaysAvailable: true },
    { key: "breakTime", label: "Break Hours", alwaysAvailable: true },
    { key: "productivity", label: "Productivity %", alwaysAvailable: true },
    { key: "unproductivity", label: "Unproductivity %", alwaysAvailable: false },
    { key: "mobileUsage", label: "Mobile Usage", alwaysAvailable: false },
];

export const useTimesheetStore = create((set, get) => ({
    rows: [],
    totalCount: 0,
    locations: [],
    departments: [],
    shifts: [],
    employees: [],
    loading: false,
    tableLoading: false,
    exportLoading: false,
    error: null,

    // Column visibility
    visibleColumns: [...DEFAULT_VISIBLE_COLUMNS],
    allColumns: ALL_COLUMNS,

    filters: {
        location: "all",
        department: "all",
        employee: "all",
        shift: "all",
        startDate: today,
        endDate: today,
        search: "",
    },

    pagination: {
        page: 1,
        pageSize: 10,
        sortColumn: "Full Name",
        sortOrder: "D",
    },

    setFilter: (key, value) => {
        set((state) => ({
            filters: { ...state.filters, [key]: value },
            pagination: { ...state.pagination, page: 1 },
        }));
    },

    setPagination: (key, value) => {
        set((state) => ({
            pagination: { ...state.pagination, [key]: value },
        }));
    },

    toggleColumn: (columnKey) => {
        set((state) => {
            const cols = state.visibleColumns;
            const next = cols.includes(columnKey)
                ? cols.filter((k) => k !== columnKey)
                : [...cols, columnKey];
            return { visibleColumns: next };
        });
    },

    resetColumns: () => {
        set({ visibleColumns: [...DEFAULT_VISIBLE_COLUMNS] });
    },

    loadInitialData: async () => {
        try {
            set({ loading: true, error: null });

            const { filters } = get();

            const [locations, departments, shifts, employees, timesheetResult] = await Promise.all([
                getLocations(),
                getDepartments(),
                getShifts(),
                getEmployeeList(),
                getTimesheetData({
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                }),
            ]);

            set({
                locations,
                departments,
                shifts,
                employees,
                rows: timesheetResult.rows,
                totalCount: timesheetResult.totalCount,
                loading: false,
            });
        } catch (error) {
            console.error("Timesheet Load Error:", error);
            set({ loading: false, error: "Failed to load timesheet data" });
        }
    },

    fetchTimesheet: async () => {
        try {
            set({ tableLoading: true });

            const { filters, pagination } = get();
            const result = await getTimesheetData({
                startDate: filters.startDate,
                endDate: filters.endDate,
                locationId: filters.location,
                departmentId: filters.department,
                employeeId: filters.employee,
                shiftId: filters.shift,
                skip: (pagination.page - 1) * pagination.pageSize,
                limit: pagination.pageSize,
                sortColumn: pagination.sortColumn,
                sortOrder: pagination.sortOrder,
                name: filters.search,
            });

            set({
                rows: result.rows,
                totalCount: result.totalCount,
                tableLoading: false,
            });
        } catch (error) {
            console.error("Timesheet Fetch Error:", error);
            set({ tableLoading: false });
        }
    },

    fetchDepartmentsByLocation: async (locationId) => {
        const departments = await getDepartments(locationId);
        set({ departments });
    },

    fetchEmployeesByFilters: async (locationId, departmentId) => {
        const employees = await getEmployeeList({ locationId, departmentId });
        set({ employees });
    },

    exportCsv: async (selectedKeys) => {
        try {
            set({ exportLoading: true });
            const { filters } = get();
            const allRows = await getTimesheetExportData({
                startDate: filters.startDate,
                endDate: filters.endDate,
                locationId: filters.location,
                departmentId: filters.department,
                employeeId: filters.employee,
                shiftId: filters.shift,
            });
            await exportTimesheetCsv(allRows, selectedKeys, filters);
            set({ exportLoading: false });
        } catch (error) {
            console.error("Export CSV Error:", error);
            set({ exportLoading: false });
        }
    },

    exportPdf: async (selectedKeys) => {
        try {
            set({ exportLoading: true });
            const { filters } = get();
            const allRows = await getTimesheetExportData({
                startDate: filters.startDate,
                endDate: filters.endDate,
                locationId: filters.location,
                departmentId: filters.department,
                employeeId: filters.employee,
                shiftId: filters.shift,
            });
            await exportTimesheetPdf(allRows, selectedKeys, filters);
            set({ exportLoading: false });
        } catch (error) {
            console.error("Export PDF Error:", error);
            set({ exportLoading: false });
        }
    },
}));
