import { create } from "zustand";
import { getGpsEmployees, getGeoLog, getTaskTime } from "../mobile-task-details/service";

export const useGpsStore = create((set, get) => ({
    employees: [],
    geoLog: [],
    taskTime: null,
    selectedEmployee: "",
    /** YYYY-MM-DD — must match getGeoLog / getTaskTime param names */
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    statusFilter: "all",
    loading: false,
    mapLoading: false,
    error: null,

    setSelectedEmployee: (v) => set({ selectedEmployee: v }),
    setDateRange: (startDate, endDate) => set({ startDate, endDate }),

    setStatusFilter: (v) => {
        set({ statusFilter: v });
        get().fetchEmployees();
    },

    fetchEmployees: async () => {
        set({ loading: true });
        const filter = get().statusFilter;
        const data = await getGpsEmployees(filter === "all" ? "" : filter);
        set({
            employees: data.map((e) => ({
                value: String(e.id), label: `${e.first_name || ""} ${e.last_name || ""}`.trim(),
            })),
            loading: false,
        });
    },

    fetchGpsData: async () => {
        const { selectedEmployee, startDate, endDate } = get();
        if (!selectedEmployee) { set({ error: "Select an employee" }); return; }
        if (!startDate || !endDate) { set({ error: "Select a date range" }); return; }
        set({ mapLoading: true, error: null });
        const [geoLog, taskTime] = await Promise.all([
            getGeoLog({ employeeId: selectedEmployee, startDate, endDate }),
            getTaskTime({ employeeId: selectedEmployee, startDate, endDate }),
        ]);
        set({ geoLog, taskTime, mapLoading: false });
    },
}));
