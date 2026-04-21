import { create } from "zustand";
import {
    getGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    updateMonitoringControl,
    getRoles,
    getLocationsByRole,
    getDepartmentsByLocation,
    getEmployeesByFilters,
    getMonitoringSettings,
    getSettingsOptions,
} from "./service";

const DEFAULT_RULES = {
    system: { visibility: "true", autoUpdate: "1" },
    trackingMode: "unlimited",
    features: {
        keystrokes: "1",
        web_usage: "1",
        screenshots: "1",
        application_usage: "1",
        screen_record: "0",
        screencast: "0",
        webCamCasting: "0",
        realTimeTrack: "0",
        file_upload_detection: "0",
        file_upload_blocking: "0",
        print_blocking: "0",
        print_detection: "0",
    },
    dlpFeatures: {
        bluetoothDetection: "0",
        bluetoothBlock: "0",
        clipboardDetection: "0",
        clipboardBlock: "0",
    },
    screenshot: { frequencyPerHour: "2" },
    idleInMinute: "5",
    timesheetIdleTime: "00:00",
    manual_clock_in: "0",
    usbDisable: "0",
    systemLock: "0",
    isSilahMobileGeoLocation: "0",
    tracking: {
        fixed: {
            mon: { status: "false", time: { start: "", end: "" } },
            tue: { status: "false", time: { start: "", end: "" } },
            wed: { status: "false", time: { start: "", end: "" } },
            thu: { status: "false", time: { start: "", end: "" } },
            fri: { status: "false", time: { start: "", end: "" } },
            sat: { status: "false", time: { start: "", end: "" } },
            sun: { status: "false", time: { start: "", end: "" } },
        },
        networkBased: [],
        geoLocation: [],
        projectBased: [],
    },
    productiveHours: { hour: "08:00", mode: "fixed" },
    productivityCategory: 0,
};

const useMonitoringControlStore = create((set, get) => ({
    // ─── Groups table state ──────────────────────────────────────────────
    groups: [],
    totalCount: 0,
    loading: false,
    tableLoading: false,

    page: 1,
    pageSize: 10,
    search: "",
    sortColumn: "",
    sortOrder: "",

    // ─── Default settings (group_id=0) ────────────────────────────────────
    defaultRules: { ...DEFAULT_RULES },
    productivityTime: "08:00",
    productivityCategory: "0",

    // ─── Settings options ─────────────────────────────────────────────────
    settingsOptions: null,

    // ─── Dropdown filter options for Create/Edit group ─────────────────────
    roles: [],
    locations: [],
    departments: [],
    employees: [],

    // ─── Dialog states ────────────────────────────────────────────────────
    createDialogOpen: false,
    editDialogOpen: false,
    deleteDialogOpen: false,
    monitoringDialogOpen: false,
    editingGroup: null,
    deletingGroup: null,
    settingsGroupId: null,
    settingsGroupRules: null,
    saving: false,

    // ─── Actions ──────────────────────────────────────────────────────────

    setPage: (page) => set({ page }),
    setPageSize: (pageSize) => set({ pageSize, page: 1 }),
    setSearch: (search) => set({ search, page: 1 }),

    setCreateDialogOpen: (open) => set({ createDialogOpen: open }),
    setEditDialogOpen: (open) => set({ editDialogOpen: open }),
    setDeleteDialogOpen: (open) => set({ deleteDialogOpen: open }),
    setMonitoringDialogOpen: (open) => set({ monitoringDialogOpen: open }),

    loadInitialData: async () => {
        try {
            set({ loading: true });
            // Fetch in parallel: groups list, roles for the create-group dropdown,
            // settings options, and—critically—the organisation default rules so
            // updates don't overwrite the saved settings with a stale constant.
            const [groupsRes, rolesRes, optionsRes, orgFeatureRes] = await Promise.all([
                getGroups({ limit: 10, skip: 0 }),
                getRoles(),
                getSettingsOptions(),
                getMonitoringSettings(),
            ]);

            // Backend response shape: { code, data: { ption, data: { screenshotFrequency, idleTime, ... } } }
            // Map each {id, name, value} to {value, label} for CustomSelect.
            const opts = optionsRes?.data?.data ?? null;
            const mapOpts = (arr) =>
                Array.isArray(arr) ? arr.map((o) => ({ value: String(o.value), label: o.name })) : [];

            const updates = {
                roles: rolesRes || [],
                settingsOptions: opts
                    ? {
                          screenshotFrequency: mapOpts(opts.screenshotFrequency),
                          idleTime: mapOpts(opts.idleTime),
                          breakTime: mapOpts(opts.beakTime), // backend typo: "beakTime"
                          mobileGeoLocationFrequency: mapOpts(opts.mobileGeoLocationFrequency),
                      }
                    : null,
                loading: false,
            };

            if (groupsRes?.code === 200) {
                updates.groups = groupsRes.data || [];
                updates.totalCount = (groupsRes.count || 0) + 1; // +1 for default row
            }

            // Org default settings live behind /organization/admin-feature
            // (NOT in the groups list — groups are user-created subsets).
            // Backend wraps it as: { code, message, data: { data: { feature }, ack } }
            // so we must drill in two .data hops to reach `feature`.
            const feature = orgFeatureRes?.data?.data?.feature ?? null;
            if (feature) {
                updates.defaultRules = { ...DEFAULT_RULES, ...feature };
                updates.productivityTime = feature?.productiveHours?.hour || "08:00";
                updates.productivityCategory = String(feature?.productivityCategory ?? "0");
            }

            set(updates);
        } catch (error) {
            console.error("MonitoringControl: loadInitialData Error:", error);
            set({ loading: false });
        }
    },

    fetchGroups: async () => {
        const { pageSize, page, search, sortColumn, sortOrder } = get();
        try {
            set({ tableLoading: true });
            const skip = (page - 1) * pageSize;
            const res = await getGroups({
                limit: pageSize,
                skip: Math.max(0, skip - 1), // -1 because default row takes one spot
                name: search || undefined,
                sortColumn: sortColumn || undefined,
                sortOrder: sortOrder || undefined,
            });

            if (res?.code === 200) {
                set({
                    groups: res.data || [],
                    totalCount: (res.count || 0) + 1,
                    tableLoading: false,
                });
            } else {
                set({ groups: [], totalCount: 1, tableLoading: false });
            }
        } catch (error) {
            console.error("MonitoringControl: fetchGroups Error:", error);
            set({ tableLoading: false });
        }
    },

    createGroupAction: async (groupData) => {
        try {
            set({ saving: true });
            const res = await createGroup(groupData);
            set({ saving: false });
            if (res?.code === 200) {
                get().fetchGroups();
                set({ createDialogOpen: false });
                return { success: true, message: res.msg };
            } else if (res?.code === 205) {
                return { success: false, code: 205, message: res.msg, data: res.data };
            } else {
                return { success: false, message: res.msg || "Failed to create group" };
            }
        } catch (error) {
            set({ saving: false });
            return { success: false, message: "Failed to create group" };
        }
    },

    updateGroupAction: async (groupData) => {
        try {
            set({ saving: true });
            const res = await updateGroup(groupData);
            set({ saving: false });
            if (res?.code === 200) {
                get().fetchGroups();
                set({ editDialogOpen: false, editingGroup: null });
                return { success: true, message: res.msg };
            } else if (res?.code === 205) {
                return { success: false, code: 205, message: res.msg, data: res.data };
            } else {
                return { success: false, message: res.msg || "Failed to update group" };
            }
        } catch (error) {
            set({ saving: false });
            return { success: false, message: "Failed to update group" };
        }
    },

    deleteGroupAction: async (groupId) => {
        try {
            set({ saving: true });
            const res = await deleteGroup(groupId);
            set({ saving: false });
            if (res?.code === 200) {
                get().fetchGroups();
                set({ deleteDialogOpen: false, deletingGroup: null });
                return { success: true, message: res.msg };
            }
            return { success: false, message: res.msg || "Failed to delete group" };
        } catch (error) {
            set({ saving: false });
            return { success: false, message: "Failed to delete group" };
        }
    },

    openEditDialog: (group) => {
        set({ editingGroup: group, editDialogOpen: true });
    },

    openDeleteDialog: (group) => {
        set({ deletingGroup: group, deleteDialogOpen: true });
    },

    openMonitoringDialog: (groupId, rules) => {
        let parsedRules = { ...DEFAULT_RULES };
        if (rules) {
            try {
                parsedRules = typeof rules === "string" ? JSON.parse(rules) : { ...rules };
            } catch { /* use defaults */ }
        }
        set({
            settingsGroupId: groupId,
            settingsGroupRules: parsedRules,
            monitoringDialogOpen: true,
        });
    },

    updateMonitoringControlAction: async (payload) => {
        try {
            set({ saving: true });
            const res = await updateMonitoringControl(payload);
            set({ saving: false });
            if (res?.code === 200) {
                // Refresh the groups table.
                get().fetchGroups();
                // For the org default (group_id=0), also refetch the org feature
                // so defaultRules isn't stale when the dialog reopens. Otherwise
                // the dialog would render the old values until a page reload.
                if (payload?.group_id == 0 || payload?.group_id === "0") {
                    const fresh = await getMonitoringSettings();
                    const feature = fresh?.data?.data?.feature ?? null;
                    if (feature) {
                        set({
                            defaultRules: { ...get().defaultRules, ...feature },
                            productivityTime: feature?.productiveHours?.hour || get().productivityTime,
                            productivityCategory: String(feature?.productivityCategory ?? get().productivityCategory),
                        });
                    }
                }
                set({ monitoringDialogOpen: false, settingsGroupId: null, settingsGroupRules: null });
                return { success: true, message: res.msg };
            }
            return { success: false, code: res?.code, message: res.msg };
        } catch (error) {
            set({ saving: false });
            return { success: false, message: "Failed to update monitoring control" };
        }
    },

    updateProductivitySettings: async (time, category) => {
        try {
            const { defaultRules } = get();
            // Send the FULL current rules object plus the two changed fields.
            // The backend overwrites org rules with whatever's in track_data
            // (it doesn't merge), so any missing field would be lost.
            // productivityCategory must be a number (Joi schema: valid(0,1,2)).
            const payload = {
                track_data: {
                    ...defaultRules,
                    productiveHours: { mode: "fixed", hour: time },
                    productivityCategory: Number(category),
                },
                group_id: 0,
            };
            const res = await updateMonitoringControl(payload);
            if (res?.code === 200) {
                set((state) => ({
                    productivityTime: time,
                    productivityCategory: String(category),
                    defaultRules: {
                        ...state.defaultRules,
                        productiveHours: { mode: "fixed", hour: time },
                        productivityCategory: Number(category),
                    },
                }));
                return { success: true };
            }
            return { success: false, message: res?.error || res?.msg || res?.message };
        } catch (error) {
            console.error("updateProductivitySettings error", error);
            return { success: false, message: error?.response?.data?.error || "Failed to update productivity settings" };
        }
    },

    // ─── Filter cascade helpers ───────────────────────────────────────────

    loadLocations: async (roleId) => {
        const res = await getLocationsByRole(roleId);
        set({ locations: res || [] });
        return res;
    },

    loadDepartments: async (roleId, locationId) => {
        const res = await getDepartmentsByLocation(roleId, locationId);
        set({ departments: res || [] });
        return res;
    },

    loadEmployees: async (roleId, locationId, departmentId) => {
        const res = await getEmployeesByFilters({ roleId, locationId, departmentId });
        set({ employees: res || [] });
        return res;
    },
}));

export default useMonitoringControlStore;
