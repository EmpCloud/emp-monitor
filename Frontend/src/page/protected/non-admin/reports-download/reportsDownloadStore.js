import { create } from "zustand";
import moment from "moment-timezone";
import {
    getRoles,
    getLocations,
    getDepartments,
    getDownloadOptions,
    getManagerEmployeeList,
    printMultipleUsersReport,
    requestCSVDownload,
    getCSVReportStatus,
    checkPdfEligibility,
    exportReportPDF,
    exportReportExcel,
} from "@/page/protected/admin/reports-download/service";

const TIMEZONE = "Asia/Kolkata";
const defaultStart = moment().tz(TIMEZONE).subtract(6, "days").format("YYYY-MM-DD");
const defaultEnd = moment().tz(TIMEZONE).format("YYYY-MM-DD");

export const useNonAdminReportsDownloadStore = create((set, get) => ({
    // ─── Data ──────────────────────────────────────────────────
    employees: [],
    totalCount: 0,
    loading: false,

    // ─── Dropdown Options ──────────────────────────────────────
    roles: [],
    locations: [],
    departments: [],
    downloadOptions: [],

    // ─── CSV Report Status ─────────────────────────────────────
    csvStatus: [],
    csvGenerating: false,

    // ─── Non-Admin (Manager) Mode ──────────────────────────────
    isAdmin: false,
    managerId: null,

    // ─── Filters ───────────────────────────────────────────────
    filters: {
        role: "all",
        location: "all",
        department: "all",
        downloadOption: "1",
        searchWebApp: "",
        startDate: defaultStart,
        endDate: defaultEnd,
        search: "",
        sortName: "",
        sortOrder: "",
        skip: 0,
        limit: 10,
        page: 1,
    },

    // ─── Selection ─────────────────────────────────────────────
    selectedIds: [],
    pdfEligible: false,

    // ─── Actions: Set Manager ID ───────────────────────────────

    setManagerId: (id) => set({ managerId: id }),

    // ─── Actions: Filters ──────────────────────────────────────

    setFilter: (key, value) =>
        set((state) => ({
            filters: { ...state.filters, [key]: value },
        })),

    setPage: (page) => {
        const { filters } = get();
        set({
            filters: {
                ...filters,
                page,
                skip: (page - 1) * filters.limit,
            },
        });
    },

    setPageSize: (limit) => {
        set((state) => ({
            filters: { ...state.filters, limit, page: 1, skip: 0 },
        }));
    },

    resetFiltersToPage1: () => {
        set((state) => ({
            filters: { ...state.filters, page: 1, skip: 0 },
            selectedIds: [],
        }));
    },

    // ─── Actions: Selection ────────────────────────────────────

    toggleRow: (id) =>
        set((state) => ({
            selectedIds: state.selectedIds.includes(id)
                ? state.selectedIds.filter((r) => r !== id)
                : [...state.selectedIds, id],
        })),

    toggleAll: (pageIds) =>
        set((state) => {
            const allSelected = pageIds.every((id) => state.selectedIds.includes(id));
            if (allSelected) {
                return { selectedIds: state.selectedIds.filter((id) => !pageIds.includes(id)) };
            }
            const merged = [...new Set([...state.selectedIds, ...pageIds])];
            return { selectedIds: merged };
        }),

    clearSelection: () => set({ selectedIds: [] }),

    // ─── Actions: Load Initial Data ────────────────────────────

    loadInitial: async () => {
        try {
            set({ loading: true });

            const [rolesRes, locationsRes, departmentsRes, downloadRes] =
                await Promise.all([
                    getRoles(),
                    getLocations(),
                    getDepartments(),
                    getDownloadOptions(),
                ]);

            set({
                roles: rolesRes,
                locations: locationsRes,
                departments: departmentsRes,
                downloadOptions: downloadRes,
            });

            await get().fetchEmployees();
            get().checkCSVStatus();
        } catch (error) {
            console.error("Non-Admin Reports Init Error:", error);
            set({ loading: false });
        }
    },

    // ─── Actions: Fetch Employees (manager-scoped) ─────────────

    fetchEmployees: async () => {
        try {
            set({ loading: true });
            const { filters, managerId } = get();

            const params = {
                managerId,
                locationId: filters.location,
                roleId: filters.role,
                departmentId: filters.department,
                startDate: filters.startDate,
                endDate: filters.endDate,
                limit: filters.limit,
                skip: filters.skip,
                searchText: filters.search,
                sortName: filters.sortName,
                sortOrder: filters.sortOrder,
            };

            const res = await getManagerEmployeeList(params);

            if (res.code === 200) {
                set({ employees: res.data, totalCount: res.totalCount, loading: false });
            } else {
                set({ employees: [], totalCount: 0, loading: false });
            }

            get().updatePdfEligibility();
        } catch (error) {
            console.error("Non-Admin Fetch Employees Error:", error);
            set({ loading: false });
        }
    },

    // ─── Actions: Cascading Filter Updates ─────────────────────

    onRoleChange: async (roleId) => {
        const store = get();
        set({
            filters: { ...store.filters, role: roleId, location: "all", department: "all", page: 1, skip: 0 },
            selectedIds: [],
        });
        const [locRes, deptRes] = await Promise.all([
            getLocations(roleId),
            getDepartments(roleId),
        ]);
        set({ locations: locRes, departments: deptRes });
        get().fetchEmployees();
    },

    onLocationChange: async (locationId) => {
        const store = get();
        set({
            filters: { ...store.filters, location: locationId, department: "all", page: 1, skip: 0 },
            selectedIds: [],
        });
        const deptRes = await getDepartments(store.filters.role, locationId);
        set({ departments: deptRes });
        get().fetchEmployees();
    },

    onDepartmentChange: (departmentId) => {
        set((state) => ({
            filters: { ...state.filters, department: departmentId, page: 1, skip: 0 },
            selectedIds: [],
        }));
        get().fetchEmployees();
    },

    onDateRangeChange: (startDate, endDate) => {
        set((state) => ({
            filters: {
                ...state.filters,
                startDate: moment(startDate).format("YYYY-MM-DD"),
                endDate: moment(endDate).format("YYYY-MM-DD"),
                page: 1,
                skip: 0,
            },
            selectedIds: [],
        }));
        get().fetchEmployees();
    },

    onSearchChange: (search) => {
        set((state) => ({
            filters: { ...state.filters, search, page: 1, skip: 0 },
        }));
        get().fetchEmployees();
    },

    onSort: (columnName) => {
        const { filters } = get();
        const newOrder =
            filters.sortName === columnName && filters.sortOrder === "asc"
                ? "desc"
                : "asc";
        set({
            filters: { ...filters, sortName: columnName, sortOrder: newOrder, page: 1, skip: 0 },
        });
        get().fetchEmployees();
    },

    // ─── Actions: PDF Eligibility ──────────────────────────────

    updatePdfEligibility: () => {
        const { filters, selectedIds, totalCount } = get();
        const range =
            moment(filters.endDate).diff(moment(filters.startDate), "days") + 1;
        if (filters.downloadOption === "3") {
            set({ pdfEligible: false });
            return;
        }
        const employeesCount = selectedIds.length > 0 ? selectedIds.length : totalCount;
        set({ pdfEligible: checkPdfEligibility(range, employeesCount) });
    },

    // ─── Actions: PDF Download ─────────────────────────────────

    downloadPDF: async () => {
        const { selectedIds, filters } = get();
        if (filters.downloadOption === "all") return { success: false, msg: "Please select a download option" };

        set({ loading: true });
        try {
            const res = await printMultipleUsersReport({
                employeeIds: selectedIds.length ? selectedIds.map(String) : undefined,
                downloadOption: filters.downloadOption,
                startDate: filters.startDate,
                endDate: filters.endDate,
                roleId: filters.role,
                locationId: filters.location,
                departmentId: filters.department,
            });

            if (res.code === 200 && res.data) {
                const hasApp = res.data.application_used?.length > 0;
                const hasBrowser = res.data.browser_history?.length > 0;

                if (!hasApp && !hasBrowser) {
                    set({ loading: false });
                    return { success: false, msg: "No data found for the selected criteria" };
                }

                const type =
                    filters.downloadOption === "1" ? "application"
                    : filters.downloadOption === "2" ? "browser"
                    : "all";

                exportReportPDF(res.data, type);
                set({ loading: false, selectedIds: [] });
                return { success: true };
            }

            set({ loading: false });
            return { success: false, msg: res.msg || "Failed to generate PDF" };
        } catch (error) {
            console.error("Non-Admin PDF Download Error:", error);
            set({ loading: false });
            return { success: false, msg: "Something went wrong" };
        }
    },

    // ─── Actions: CSV/Excel Server-Side Download ───────────────

    downloadCSV: async (selectedColumns = []) => {
        const { selectedIds, filters } = get();
        if (filters.downloadOption === "all") return { success: false, msg: "Please select a download option" };

        set({ csvGenerating: true });
        try {
            const res = await requestCSVDownload({
                employeeIds: selectedIds.length ? selectedIds.map(String) : undefined,
                downloadOption: filters.downloadOption,
                startDate: filters.startDate,
                endDate: filters.endDate,
                roleId: filters.role,
                locationId: filters.location,
                departmentId: filters.department,
                selectedColumns,
                searchKeyword: filters.searchWebApp || undefined,
            });

            if (res.code === 200) {
                set({ csvGenerating: true, selectedIds: [] });
                setTimeout(() => get().checkCSVStatus(), 5000);
                return { success: true, msg: "CSV generation started" };
            }

            set({ csvGenerating: false });
            return { success: false, msg: res.msg };
        } catch (error) {
            console.error("Non-Admin CSV Download Error:", error);
            set({ csvGenerating: false });
            return { success: false, msg: "Something went wrong" };
        }
    },

    // ─── Actions: CSV Status Polling ───────────────────────────

    checkCSVStatus: async () => {
        try {
            const res = await getCSVReportStatus();
            const files = res.data || [];
            const generating = files.filter((f) => f.stage === "generating");

            set({ csvStatus: files, csvGenerating: generating.length > 0 });

            if (generating.length > 0) {
                setTimeout(() => get().checkCSVStatus(), 10000);
            }
        } catch (error) {
            console.error("Non-Admin CSV Status Check Error:", error);
        }
    },
}));
