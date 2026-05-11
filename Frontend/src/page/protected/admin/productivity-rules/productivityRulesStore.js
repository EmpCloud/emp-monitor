import { create } from "zustand";
import moment from "moment-timezone";
import {
    getProductivityRankings,
    updateProductivityRanking,
    customProductivityUpdate,
    addNewDomainURL,
    fetchExportData,
    uploadBulkDomain,
    uploadBulkProductivityRules,
    getDepartmentsForProductivityRules,
    getLocations,
    getDepartmentsByLocation,
    getEmployees,
    getURLTimeUsage,
    exportToExcel,
    exportToPDF,
    exportToCSV,
    isValidURL,
    convertSecToHM,
} from "./service";

const defaultStartDate = moment().subtract(29, "days").format("YYYY-MM-DD");
const defaultEndDate = moment().format("YYYY-MM-DD");

export const useProductivityRulesStore = create((set, get) => ({

    // ─── Data ───────────────────────────────────────────────────────────────
    rows: [],
    totalCount: 0,
    departments: [],
    locations: [],
    employees: [],

    // ─── UI State ───────────────────────────────────────────────────────────
    loading: false,
    updating: false,
    exporting: false,
    importing: false,
    error: "",
    successMsg: "",

    // ─── Filters ────────────────────────────────────────────────────────────
    activeTab: "All",           // All | Global | Custom | New
    activeSubTab: "",            // "" | "website" | "application"
    filteredValue: "1",          // 1 = Activity, 2 = Category
    rankingFilter: "all",       // "all" | "1" | "2" | "0"
    searchText: "",
    sortName: "",
    sortOrder: "",
    categoryId: "0",
    categoryName: "",

    // ─── Pagination ─────────────────────────────────────────────────────────
    page: 1,
    pageSize: 10,

    // ─── Dialogs ────────────────────────────────────────────────────────────
    addDomainDialogOpen: false,
    importDialogOpen: false,
    bulkImportDialogOpen: false,
    alwaysActiveDialogOpen: false,
    urlUsageDialogOpen: false,
    categoryModalOpen: false,

    // ─── Always Active Dialog State ─────────────────────────────────────────
    alwaysActiveTarget: null,     // { applicationId, status, departmentId, isCustom }
    alwaysActiveTime: "00:00",

    // ─── URL Usage Dialog State ─────────────────────────────────────────────
    urlUsageAppId: null,
    urlUsageAppName: "",
    urlUsageData: [],
    urlUsageLoading: false,
    urlUsageFilters: {
        locationId: null,
        departmentId: null,
        employeeId: null,
        startDate: defaultStartDate,
        endDate: defaultEndDate,
    },

    // ─── Actions: Clear Messages ────────────────────────────────────────────
    clearError: () => set({ error: "" }),
    clearSuccess: () => set({ successMsg: "" }),

    // ─── Actions: Load Initial Data ─────────────────────────────────────────
    loadInitial: async () => {
        set({ loading: true });
        try {
            const [departments, locations, employees] = await Promise.all([
                getDepartmentsForProductivityRules(),
                getLocations(),
                getEmployees(),
            ]);
            set({ departments, locations, employees });
            await get().fetchData();
        } catch (error) {
            console.error("Init Error:", error);
            set({ loading: false, error: "Failed to initialize" });
        }
    },

    // ─── Actions: Fetch Data ────────────────────────────────────────────────
    fetchData: async () => {
        const state = get();
        set({ loading: true, error: "" });
        try {
            const skip = (state.page - 1) * state.pageSize;

            let domain = state.activeTab === "All" ? "" : state.activeTab;
            let siteType = "";
            if (state.filteredValue === "1") {
                siteType = state.activeSubTab === "website" ? "2" : state.activeSubTab === "application" ? "1" : "";
            }

            const apiStatus = state.rankingFilter === "all" ? "" : state.rankingFilter;

            const result = await getProductivityRankings({
                skip,
                limit: state.pageSize,
                siteType,
                domain,
                name: state.searchText,
                sortName: state.sortName,
                sortOrder: state.sortOrder,
                status: apiStatus,
                filteredValue: state.filteredValue,
                categoryId: state.categoryId,
            });

            if (result.success) {
                set({
                    rows: result.rows,
                    totalCount: result.totalCount,
                    loading: false,
                });
            } else {
                set({ rows: [], totalCount: 0, loading: false });
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            set({ rows: [], totalCount: 0, loading: false, error: "Failed to fetch data" });
        }
    },

    // ─── Actions: Filters ───────────────────────────────────────────────────
    setActiveTab: (tab) => {
        set({ activeTab: tab, page: 1, searchText: "", activeSubTab: "" });
        get().fetchData();
    },

    setActiveSubTab: (subTab) => {
        set({ activeSubTab: subTab, page: 1 });
        get().fetchData();
    },

    setFilteredValue: (val) => {
        set({ filteredValue: val, page: 1, searchText: "", categoryId: "0", activeSubTab: "", activeTab: "All" });
        get().fetchData();
    },

    setRankingFilter: (val) => {
        set({ rankingFilter: val, page: 1 });
        get().fetchData();
    },

    setSearchText: (text) => {
        set({ searchText: text });
    },

    doSearch: () => {
        set({ page: 1, rankingFilter: "all" });
        get().fetchData();
    },

    setSort: (col) => {
        const state = get();
        const newOrder = state.sortName === col && state.sortOrder === "A" ? "D" : "A";
        set({ sortName: col, sortOrder: newOrder, page: 1 });
        get().fetchData();
    },

    setPage: (p) => {
        set({ page: p });
        get().fetchData();
    },

    setPageSize: (size) => {
        set({ pageSize: size, page: 1 });
        get().fetchData();
    },

    // ─── Actions: Category Modal ────────────────────────────────────────────
    openCategoryModal: (id, name) => {
        set({
            categoryModalOpen: true,
            categoryId: id,
            categoryName: name,
            page: 1,
        });
        get().fetchData();
    },

    closeCategoryModal: () => {
        set({
            categoryModalOpen: false,
            categoryId: "0",
            categoryName: "",
            filteredValue: "2",
            page: 1,
        });
        get().fetchData();
    },

    // ─── Actions: Update Ranking ────────────────────────────────────────────
    updateRanking: async ({ applicationId, status, departmentId = 0, preRequest = 0 }) => {
        const state = get();
        set({ updating: true });
        try {
            const result = await updateProductivityRanking({
                applicationId,
                status,
                departmentId,
                preRequest,
                updateType: state.filteredValue,
            });

            if (result.success) {
                set({ updating: false, successMsg: "Ranking updated" });
                await get().fetchData();
            } else {
                set({ updating: false, error: result.message });
            }
        } catch (error) {
            set({ updating: false, error: "Update failed" });
        }
    },

    // ─── Actions: Custom Update (Customize by Department) ───────────────────
    updateCustomRanking: async ({ applicationId, departmentRules }) => {
        const state = get();
        set({ updating: true });
        try {
            const result = await customProductivityUpdate({
                applicationId,
                departmentRules,
                updateType: state.filteredValue,
            });

            if (result.success) {
                set({ updating: false, successMsg: "Custom ranking updated" });
                await get().fetchData();
            } else {
                set({ updating: false, error: result.message });
            }
        } catch (error) {
            set({ updating: false, error: "Custom update failed" });
        }
    },

    // ─── Actions: Always Active Dialog ──────────────────────────────────────
    openAlwaysActiveDialog: ({ applicationId, status, departmentId, isCustom, currentTime }) => {
        const timeStr = currentTime && currentTime >= 60
            ? convertSecToHM(currentTime)
            : "00:00";
        set({
            alwaysActiveDialogOpen: true,
            alwaysActiveTarget: { applicationId, status, departmentId, isCustom },
            alwaysActiveTime: timeStr,
        });
    },

    closeAlwaysActiveDialog: () => {
        set({ alwaysActiveDialogOpen: false, alwaysActiveTarget: null, alwaysActiveTime: "00:00" });
    },

    setAlwaysActiveTime: (time) => set({ alwaysActiveTime: time }),

    saveAlwaysActive: async () => {
        const state = get();
        const target = state.alwaysActiveTarget;
        if (!target) return;

        const parts = state.alwaysActiveTime.split(":");
        const totalSec = (parseInt(parts[0] || 0, 10) * 3600) + (parseInt(parts[1] || 0, 10) * 60);

        if (target.isCustom) {
            await get().updateCustomRanking({
                applicationId: target.applicationId,
                departmentRules: [{
                    departmentId: target.departmentId,
                    status: target.status,
                    preRequest: totalSec,
                }],
            });
        } else {
            await get().updateRanking({
                applicationId: target.applicationId,
                status: target.status,
                departmentId: target.departmentId || 0,
                preRequest: totalSec,
            });
        }

        get().closeAlwaysActiveDialog();
    },

    // ─── Actions: Add Domain Dialog ─────────────────────────────────────────
    openAddDomainDialog: () => set({ addDomainDialogOpen: true }),
    closeAddDomainDialog: () => set({ addDomainDialogOpen: false }),

    addDomain: async ({ domain, departmentRules }) => {
        if (!domain) return { success: false, message: "Domain is required" };
        if (!isValidURL(domain)) return { success: false, message: "Invalid URL format" };

        set({ updating: true });
        try {
            const result = await addNewDomainURL({ domain, departmentRules });
            if (result.success) {
                set({ updating: false, successMsg: result.message, addDomainDialogOpen: false });
                await get().fetchData();
            } else {
                set({ updating: false });
            }
            return result;
        } catch (error) {
            set({ updating: false });
            return { success: false, message: "Failed to add domain" };
        }
    },

    // ─── Actions: Export ────────────────────────────────────────────────────
    handleExport: async (format = "excel") => {
        const state = get();
        const apiStatus = state.rankingFilter === "all" ? "" : state.rankingFilter;
        set({ exporting: true });
        try {
            const result = await fetchExportData({
                dataType: state.activeSubTab === "website" ? "2" : state.activeSubTab === "application" ? "1" : "",
                status: apiStatus,
            });

            if (result.success && result.data) {
                let exported = false;
                if (format === "pdf") {
                    exported = await exportToPDF(result.data, apiStatus);
                } else if (format === "csv") {
                    exported = exportToCSV(result.data, apiStatus);
                } else {
                    exported = exportToExcel(result.data, apiStatus);
                }

                if (!exported) {
                    set({ error: "No data available to export" });
                }
            } else {
                set({ error: result.message || "Export failed" });
            }
        } catch (error) {
            set({ error: "Export failed" });
        }
        set({ exporting: false });
    },

    // ─── Actions: Import ────────────────────────────────────────────────────
    openImportDialog: () => set({ importDialogOpen: true }),
    closeImportDialog: () => set({ importDialogOpen: false }),

    handleImport: async (file) => {
        set({ importing: true });
        try {
            const result = await uploadBulkDomain(file);
            if (result.success) {
                set({ importing: false, successMsg: result.message, importDialogOpen: false });
                await get().fetchData();
            } else {
                set({ importing: false, error: result.message });
            }
            return result;
        } catch (error) {
            set({ importing: false, error: "Import failed" });
            return { success: false, message: "Import failed" };
        }
    },

    // ─── Actions: Bulk Import ───────────────────────────────────────────────
    openBulkImportDialog: () => set({ bulkImportDialogOpen: true }),
    closeBulkImportDialog: () => set({ bulkImportDialogOpen: false }),

    handleBulkImport: async (file) => {
        set({ importing: true });
        try {
            const result = await uploadBulkProductivityRules(file);
            if (result.success) {
                set({ importing: false, successMsg: result.message, bulkImportDialogOpen: false });
                await get().fetchData();
            } else {
                set({ importing: false });
            }
            return result;
        } catch (error) {
            set({ importing: false });
            return { success: false, message: "Bulk import failed" };
        }
    },

    // ─── Actions: URL Usage Dialog ──────────────────────────────────────────
    openURLUsageDialog: (appId, appName) => {
        set({
            urlUsageDialogOpen: true,
            urlUsageAppId: appId,
            urlUsageAppName: appName,
            urlUsageData: [],
            urlUsageFilters: {
                locationId: null,
                departmentId: null,
                employeeId: null,
                startDate: defaultStartDate,
                endDate: defaultEndDate,
            },
        });
        get().fetchURLUsageData();
    },

    closeURLUsageDialog: () => {
        set({
            urlUsageDialogOpen: false,
            urlUsageAppId: null,
            urlUsageAppName: "",
            urlUsageData: [],
        });
    },

    setURLUsageFilter: (key, value) => {
        set((state) => ({
            urlUsageFilters: { ...state.urlUsageFilters, [key]: value },
        }));
        get().fetchURLUsageData();
    },

    fetchURLUsageData: async () => {
        const state = get();
        if (!state.urlUsageAppId) return;

        set({ urlUsageLoading: true });
        try {
            const result = await getURLTimeUsage({
                appId: state.urlUsageAppId,
                startDate: state.urlUsageFilters.startDate,
                endDate: state.urlUsageFilters.endDate,
                locationId: state.urlUsageFilters.locationId,
                departmentId: state.urlUsageFilters.departmentId,
                employeeId: state.urlUsageFilters.employeeId,
            });

            set({
                urlUsageData: result.success ? result.data : [],
                urlUsageLoading: false,
            });
        } catch (error) {
            set({ urlUsageData: [], urlUsageLoading: false });
        }
    },

    // ─── Actions: Fetch departments/employees for URL Usage filters ─────────
    fetchDeptsByLocation: async (locationId) => {
        const depts = await getDepartmentsByLocation(locationId);
        // We don't overwrite main departments, just return for the dialog
        return depts;
    },

    fetchEmployeesByLocDept: async (locationId, departmentId) => {
        const emps = await getEmployees({ locationId, departmentId });
        return emps;
    },
}));
