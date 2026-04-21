import { create } from "zustand";
import {
    getRoles,
    getRoleById,
    getPermissions,
    addRole,
    updateRole,
    updateRolePermission,
    updateFeaturePermissions,
    deleteRole,
    cloneRole,
    getLocationsWithDept,
    getDepartmentsByLocation,
    categorizePermissions,
    exportToExcel,
    exportToCSV,
    exportToPDF,
} from "./service";

export const useRolesPermissionStore = create((set, get) => ({
    // ── Data ────────────────────────────────────────────────────────────────
    roles: [],
    totalCount: 0,
    locations: [],
    categorizedPermissions: {},
    rawPermissions: [],

    // ── UI State ────────────────────────────────────────────────────────────
    loading: false,
    saving: false,
    deleting: false,
    error: null,
    successMsg: null,

    // ── Pagination ──────────────────────────────────────────────────────────
    pagination: { page: 1, pageSize: 10 },
    search: "",

    // ── Dialog State ────────────────────────────────────────────────────────
    addRoleDialogOpen: false,

    editRoleDialogOpen: false,
    editRoleData: null,

    deleteRoleDialogOpen: false,
    deleteRoleId: null,

    cloneRoleDialogOpen: false,
    cloneRoleId: null,

    viewRoleDialogOpen: false,
    viewRoleData: null,

    permissionDialogOpen: false,
    permissionRoleData: null,

    // ── Setters ─────────────────────────────────────────────────────────────
    setSearch: async (value) => {
        set({ search: value, pagination: { ...get().pagination, page: 1 } });
        await get().fetchRoles(0, get().pagination.pageSize);
    },

    setPagination: (key, value) => {
        set((state) => ({ pagination: { ...state.pagination, [key]: value } }));
    },

    clearError: () => set({ error: null }),
    clearSuccess: () => set({ successMsg: null }),

    // ── Dialog Openers / Closers ────────────────────────────────────────────

    openAddRoleDialog: () => set({ addRoleDialogOpen: true }),
    closeAddRoleDialog: () => set({ addRoleDialogOpen: false }),

    openEditRoleDialog: async (roleId) => {
        try {
            const result = await getRoleById(roleId);
            if (result.success) {
                set({ editRoleDialogOpen: true, editRoleData: result.data });
            } else {
                set({ error: result.message });
            }
        } catch {
            set({ error: "Failed to load role details" });
        }
    },
    closeEditRoleDialog: () => set({ editRoleDialogOpen: false, editRoleData: null }),

    openDeleteRoleDialog: (roleId) => set({ deleteRoleDialogOpen: true, deleteRoleId: roleId }),
    closeDeleteRoleDialog: () => set({ deleteRoleDialogOpen: false, deleteRoleId: null }),

    openCloneRoleDialog: (roleId) => set({ cloneRoleDialogOpen: true, cloneRoleId: roleId }),
    closeCloneRoleDialog: () => set({ cloneRoleDialogOpen: false, cloneRoleId: null }),

    openViewRoleDialog: async (roleId) => {
        try {
            const result = await getRoleById(roleId);
            if (result.success) {
                set({ viewRoleDialogOpen: true, viewRoleData: result.data });
            } else {
                set({ error: result.message });
            }
        } catch {
            set({ error: "Failed to load role details" });
        }
    },
    closeViewRoleDialog: () => set({ viewRoleDialogOpen: false, viewRoleData: null }),

    openPermissionDialog: async (roleId) => {
        try {
            const result = await getRoleById(roleId);
            if (result.success) {
                set({ permissionDialogOpen: true, permissionRoleData: result.data });
            } else {
                set({ error: result.message });
            }
        } catch {
            set({ error: "Failed to load role details" });
        }
    },
    closePermissionDialog: () => set({ permissionDialogOpen: false, permissionRoleData: null }),

    // ── Actions ─────────────────────────────────────────────────────────────

    loadInitialData: async () => {
        try {
            set({ loading: true, error: null });
            const [rolesResult, permResult, locResult] = await Promise.all([
                getRoles({ skip: 0, limit: get().pagination.pageSize }),
                getPermissions(),
                getLocationsWithDept(),
            ]);

            const updates = { loading: false };

            if (rolesResult.success) {
                updates.roles = rolesResult.data.filter((r) => r.id !== 1);
                updates.totalCount = rolesResult.totalCount;
            } else {
                updates.error = rolesResult.message;
            }

            if (permResult.success) {
                updates.rawPermissions = permResult.data;
                updates.categorizedPermissions = categorizePermissions(permResult.data);
            }

            if (locResult.success) {
                updates.locations = locResult.data;
            }

            set(updates);
        } catch (error) {
            console.error("Load initial data error:", error);
            set({ loading: false, error: "Failed to load data" });
        }
    },

    fetchRoles: async (skip, limit) => {
        try {
            const result = await getRoles({ skip, limit });
            if (result.success) {
                set({
                    roles: result.data.filter((r) => r.id !== 1),
                    totalCount: result.totalCount,
                });
            }
            return result;
        } catch (error) {
            console.error("Fetch roles error:", error);
            return { success: false };
        }
    },

    refreshRoles: async () => {
        const { pagination } = get();
        const skip = (pagination.page - 1) * pagination.pageSize;
        await get().fetchRoles(skip, pagination.pageSize);
    },

    changePage: async (page) => {
        set((state) => ({ pagination: { ...state.pagination, page } }));
        const { pagination } = get();
        const skip = (page - 1) * pagination.pageSize;
        await get().fetchRoles(skip, pagination.pageSize);
    },

    changePageSize: async (pageSize) => {
        set({ pagination: { page: 1, pageSize } });
        await get().fetchRoles(0, pageSize);
    },

    // ── CRUD Actions ────────────────────────────────────────────────────────

    saveRole: async (formData) => {
        try {
            set({ saving: true, error: null });
            const result = await addRole(formData);
            set({ saving: false });

            if (result.success) {
                get().closeAddRoleDialog();
                set({ successMsg: result.message });
                await get().refreshRoles();
            } else {
                set({ error: result.message });
            }
            return result;
        } catch (error) {
            console.error("Save role error:", error);
            set({ saving: false, error: "Failed to add role" });
            return { success: false, message: "Failed to add role" };
        }
    },

    saveEditRole: async (formData) => {
        try {
            set({ saving: true, error: null });
            const result = await updateRole(formData);
            set({ saving: false });

            if (result.success) {
                get().closeEditRoleDialog();
                set({ successMsg: result.message });
                await get().refreshRoles();
            } else {
                set({ error: result.message });
            }
            return result;
        } catch (error) {
            console.error("Edit role error:", error);
            set({ saving: false, error: "Failed to update role" });
            return { success: false, message: "Failed to update role" };
        }
    },

    confirmDeleteRole: async () => {
        const { deleteRoleId } = get();
        if (!deleteRoleId) return;

        try {
            set({ deleting: true, error: null });
            const result = await deleteRole(deleteRoleId);
            set({ deleting: false });

            if (result.success) {
                get().closeDeleteRoleDialog();
                set({ successMsg: result.message });
                await get().refreshRoles();
            } else {
                set({ error: result.message });
            }
            return result;
        } catch (error) {
            console.error("Delete role error:", error);
            set({ deleting: false, error: "Failed to delete role" });
            return { success: false };
        }
    },

    confirmCloneRole: async (newName) => {
        const { cloneRoleId } = get();
        if (!cloneRoleId || !newName) return;

        try {
            set({ saving: true, error: null });
            const result = await cloneRole({ roleId: cloneRoleId, newName });
            set({ saving: false });

            if (result.success) {
                get().closeCloneRoleDialog();
                set({ successMsg: result.message });
                await get().refreshRoles();
            } else {
                set({ error: result.message });
            }
            return result;
        } catch (error) {
            console.error("Clone role error:", error);
            set({ saving: false, error: "Failed to clone role" });
            return { success: false };
        }
    },

    toggleRWDPermission: async (roleId, roleName, field, checked) => {
        const added = checked ? [field] : [];
        const removed = checked ? [] : [field];

        set((state) => ({
            roles: state.roles.map((r) =>
                r.id === roleId
                    ? { ...r, permission: { ...r.permission, [field]: checked } }
                    : r
            ),
        }));

        const result = await updateRolePermission({
            roleId,
            name: roleName,
            added,
            removed,
        });

        if (!result.success) {
            set((state) => ({
                roles: state.roles.map((r) =>
                    r.id === roleId
                        ? { ...r, permission: { ...r.permission, [field]: !checked } }
                        : r
                ),
                error: result.message,
            }));
        }
    },

    saveFeaturePermissions: async (formData) => {
        try {
            set({ saving: true, error: null });
            const result = await updateFeaturePermissions(formData);
            set({ saving: false });

            if (result.success) {
                get().closePermissionDialog();
                set({ successMsg: result.message });
                await get().refreshRoles();
            } else {
                set({ error: result.message });
            }
            return result;
        } catch (error) {
            console.error("Save feature permissions error:", error);
            set({ saving: false, error: "Failed to update permissions" });
            return { success: false };
        }
    },

    // ── Export ───────────────────────────────────────────────────────────────

    exportExcel: () => exportToExcel(get().roles),
    exportCsv: () => exportToCSV(get().roles),
    exportPdf: () => exportToPDF(get().roles),
}));
