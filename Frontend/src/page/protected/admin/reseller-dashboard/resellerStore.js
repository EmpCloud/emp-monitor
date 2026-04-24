import { create } from "zustand";
import {
    getClientStats,
    getAllEmployees,
    registerClient as registerClientApi,
    updateClient as updateClientApi,
    removeClient as removeClientApi,
    toggleStorage as toggleStorageApi,
    getResellerLicenses,
    clientLogin as clientLoginApi,
    assignEmployees as assignEmployeesApi,
    getAssignedEmployees,
    deleteAssignedEmployee as deleteAssignedEmployeeApi,
} from "./service";

export const useResellerStore = create((set, get) => ({
    clients: [],
    employees: [],
    assignedEmployees: [],
    licenses: { leftOverLicenses: 0, expiryDate: "" },
    loading: false,
    error: null,
    successMsg: null,

    // Modal state
    registerModalOpen: false,
    editModalOpen: false,
    editingClient: null,
    assignModalOpen: false,
    viewAssignedModalOpen: false,
    viewAssignedOrgId: null,

    clearMessages: () => set({ error: null, successMsg: null }),

    setModal: (key, value) => set({ [key]: value }),

    loadDashboard: async () => {
        try {
            set({ loading: true, error: null });
            const [clients, employees] = await Promise.all([
                getClientStats(),
                getAllEmployees(),
            ]);
            set({ clients, employees, loading: false });
        } catch {
            set({ loading: false, error: "Failed to load dashboard" });
        }
    },

    refreshClients: async () => {
        const clients = await getClientStats();
        set({ clients });
    },

    fetchLicenses: async () => {
        const licenses = await getResellerLicenses();
        set({ licenses });
    },

    registerClient: async (clientData) => {
        const result = await registerClientApi(clientData);
        if (result.success) {
            set({ successMsg: result.message || "Client registered successfully", registerModalOpen: false });
            get().refreshClients();
        } else {
            set({ error: result.message });
        }
        return result.success;
    },

    updateClient: async (clientData) => {
        const result = await updateClientApi(clientData);
        if (result.success) {
            set({ successMsg: result.message || "Client updated successfully", editModalOpen: false, editingClient: null });
            get().refreshClients();
        } else {
            set({ error: result.message });
        }
        return result.success;
    },

    removeClient: async (email, clientUserId) => {
        const result = await removeClientApi(email);
        if (result.success) {
            set((state) => ({
                clients: state.clients.filter((c) => c.clientUserId !== clientUserId),
                successMsg: result.message || "Client removed successfully",
            }));
        } else {
            set({ error: result.message });
        }
        return result.success;
    },

    toggleStorage: async (clientOrgId, enable) => {
        const result = await toggleStorageApi(clientOrgId, enable);
        if (result.success) {
            set((state) => ({
                clients: state.clients.map((c) =>
                    c.clientOrgId === clientOrgId ? { ...c, storage: enable } : c
                ),
                successMsg: result.message || "Storage updated",
            }));
        } else {
            set({ error: result.message });
            get().refreshClients();
        }
        return result.success;
    },

    toggleAllStorage: async (enable) => {
        const result = await toggleStorageApi(null, enable);
        if (result.success) {
            set((state) => ({
                clients: state.clients.map((c) => ({ ...c, storage: enable })),
                successMsg: "Storage updated for all clients",
            }));
        } else {
            set({ error: result.message });
        }
        return result.success;
    },

    clientLogin: async (orgId) => {
        const result = await clientLoginApi(orgId);
        if (result.success && result.data) {
            localStorage.setItem("token", result.data.data || result.data);
            window.open("/admin/dashboard", "_blank");
        } else {
            set({ error: result.message });
        }
    },

    // Assign employee
    assignEmployees: async (resellerOrgId, employeeIds) => {
        const result = await assignEmployeesApi(resellerOrgId, employeeIds);
        if (result.success) {
            set({ successMsg: result.message || "Employees assigned successfully", assignModalOpen: false });
        } else {
            set({ error: result.message });
        }
        return result.success;
    },

    fetchAssignedEmployees: async (orgId) => {
        set({ viewAssignedOrgId: orgId, assignedEmployees: [] });
        const list = await getAssignedEmployees(orgId);
        set({ assignedEmployees: list, viewAssignedModalOpen: true });
    },

    getPreAssignedIds: async (orgId) => {
        const list = await getAssignedEmployees(orgId);
        return list.map((e) => e.id);
    },

    deleteAssignedEmployee: async (employeeId) => {
        const orgId = get().viewAssignedOrgId;
        const result = await deleteAssignedEmployeeApi(employeeId, orgId);
        if (result.success) {
            set((state) => ({
                assignedEmployees: state.assignedEmployees.filter((e) => e.id !== employeeId),
                successMsg: result.message || "Employee removed",
            }));
        } else {
            set({ error: result.message });
        }
    },

    openEdit: (client) => {
        set({ editingClient: client, editModalOpen: true });
    },
}));
