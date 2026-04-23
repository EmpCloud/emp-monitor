import { create } from "zustand";
import moment from "moment-timezone";
import {
    fetchTimeClaims,
    fetchExportData,
    exportTimeClaimCsv,
    exportTimeClaimPdf,
    updateRequestStatus,
    deleteTimeClaim,
    toggleAutoApprove,
    fetchAutoApproveStatus,
    bulkApproveDecline,
    fetchReasons,
    addReason as addReasonApi,
    deleteReason as deleteReasonApi,
    updateOfflineTime,
    updateBreakRequest,
    REQUEST_TYPES,
} from "./service";

export const useTimeClaimStore = create((set, get) => ({
    rows: [],
    totalDocs: 0,
    rawData: null,
    loading: false,
    tableLoading: false,
    exportLoading: false,

    // Reasons
    reasons: [],
    reasonsLoading: false,

    // Auto approve
    autoApprove: false,

    // Selected rows for bulk actions
    selectedIds: [],

    filters: {
        startDate: moment().subtract(30, "days").format("YYYY-MM-DD"),
        endDate: moment().format("YYYY-MM-DD"),
        status: "all",
        requestType: REQUEST_TYPES.IDLE,
        searchText: "",
        sortName: "",
        sortOrder: "",
        skip: 0,
        limit: 10,
        page: 1,
    },

    setFilter: (key, value) =>
        set((state) => ({ filters: { ...state.filters, [key]: value } })),

    setFilters: (updates) =>
        set((state) => ({ filters: { ...state.filters, ...updates } })),

    // ─── Load Data ──────────────────────────────────────────────────────

    loadInitialData: async () => {
        set({ loading: true });
        try {
            const [result, autoApproveRes] = await Promise.all([
                fetchTimeClaims(get().filters),
                fetchAutoApproveStatus(),
            ]);
            set({
                rows: result.rows,
                totalDocs: result.totalDocs,
                rawData: result.rawData,
                autoApprove: autoApproveRes?.data?.is_enable === true || autoApproveRes?.data?.is_enable === "true",
                loading: false,
            });
        } catch (error) {
            console.error("Time Claim: Initial Load Error:", error);
            set({ loading: false });
        }
    },

    fetchData: async () => {
        set({ tableLoading: true, selectedIds: [] });
        try {
            const result = await fetchTimeClaims(get().filters);
            set({
                rows: result.rows,
                totalDocs: result.totalDocs,
                rawData: result.rawData,
                tableLoading: false,
            });
        } catch (error) {
            console.error("Time Claim: Fetch Error:", error);
            set({ tableLoading: false });
        }
    },

    // ─── Request Type Switch ────────────────────────────────────────────

    switchRequestType: (requestType) => {
        set((state) => ({
            filters: { ...state.filters, requestType, skip: 0, page: 1 },
            selectedIds: [],
        }));
    },

    // ─── CRUD Actions ───────────────────────────────────────────────────

    approveRequest: async (id) => {
        const result = await updateRequestStatus(1, id);
        if (result?.code === 200) get().fetchData();
        return result;
    },

    declineRequest: async (id) => {
        const result = await updateRequestStatus(2, id);
        if (result?.code === 200) get().fetchData();
        return result;
    },

    deleteRequest: async (id, forBreak = "") => {
        const result = await deleteTimeClaim(id, forBreak);
        if (result?.code === 200) get().fetchData();
        return result;
    },

    approveOffline: async (id, employeeId, offlineTimeRaw, date, requestType = "") => {
        const result = await updateOfflineTime({
            id,
            employee_id: employeeId,
            offlineTime: offlineTimeRaw,
            date,
            status: 1,
            request_type: requestType,
        });
        if (result?.code === 200) get().fetchData();
        return result;
    },

    declineOffline: async (id, employeeId, offlineTimeRaw, date, reason = "") => {
        const result = await updateOfflineTime({
            id,
            employee_id: employeeId,
            offlineTime: offlineTimeRaw,
            date,
            status: 2,
            request_type: 0,
            reason,
        });
        if (result?.code === 200) get().fetchData();
        return result;
    },

    approveBreak: async (id, requestType = "") => {
        const result = await updateBreakRequest({ id, status: 1, request_type: requestType });
        if (result?.code === 200) get().fetchData();
        return result;
    },

    declineBreak: async (id) => {
        const result = await updateBreakRequest({ id, status: 2, request_type: 0 });
        if (result?.code === 200) get().fetchData();
        return result;
    },

    // ─── Bulk Actions ───────────────────────────────────────────────────

    toggleSelect: (id) =>
        set((state) => ({
            selectedIds: state.selectedIds.includes(id)
                ? state.selectedIds.filter((i) => i !== id)
                : [...state.selectedIds, id],
        })),

    toggleSelectAll: () =>
        set((state) => {
            const pendingIds = state.rows.filter((r) => r.status === 0).map((r) => r._id);
            const allSelected = pendingIds.every((id) => state.selectedIds.includes(id));
            return { selectedIds: allSelected ? [] : pendingIds };
        }),

    bulkAction: async (status) => {
        const { selectedIds, filters } = get();
        if (!selectedIds.length) return;
        const result = await bulkApproveDecline(selectedIds, status, filters.requestType);
        if (result?.code === 200) get().fetchData();
        return result;
    },

    // ─── Auto Approve ───────────────────────────────────────────────────

    toggleAutoApprove: async () => {
        const newStatus = !get().autoApprove;
        const result = await toggleAutoApprove(newStatus);
        // Backend returns code:200 even on validation error — check for error field too.
        if (result?.code === 200 && !result?.error) set({ autoApprove: newStatus });
        return result;
    },

    // ─── Reasons ────────────────────────────────────────────────────────

    loadReasons: async (type) => {
        set({ reasonsLoading: true });
        const reasons = await fetchReasons(type);
        set({ reasons, reasonsLoading: false });
    },

    addReason: async (reason, type) => {
        const result = await addReasonApi(reason, type);
        if (result?.code === 200) get().loadReasons(type);
        return result;
    },

    deleteReason: async (id, type) => {
        const result = await deleteReasonApi(id);
        if (result?.code === 200) get().loadReasons(type);
        return result;
    },

    // ─── Export ─────────────────────────────────────────────────────────

    exportCsv: async () => {
        set({ exportLoading: true });
        try {
            const { filters } = get();
            const result = await fetchExportData(filters);
            await exportTimeClaimCsv(result.rows, filters);
        } catch (error) {
            console.error("Time Claim: CSV Export Error:", error);
        }
        set({ exportLoading: false });
    },

    exportPdf: async () => {
        set({ exportLoading: true });
        try {
            const { filters } = get();
            const result = await fetchExportData(filters);
            await exportTimeClaimPdf(result.rows, filters);
        } catch (error) {
            console.error("Time Claim: PDF Export Error:", error);
        }
        set({ exportLoading: false });
    },
}));
