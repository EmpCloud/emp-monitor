import { create } from "zustand";
import moment from "moment-timezone";
import {
    getProductivityList,
    getLocations,
    getDepartments,
    getEmployees,
    exportCSV,
    exportPDF
} from "./service";
import { getSessionCookie } from "@/lib/sessionCookie";

const defaultStart = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
const defaultEnd = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

export const useProductivityReportStore = create((set, get) => ({
    resolveManagerId: () => {
        const session = getSessionCookie();
        if (!session || session.is_admin) return null;
        return Number(session.user_id ?? session.id ?? 0) || null;
    },


    rows: [],
    totalCount: 0,
    loading: false,

    locations: [],
    departments: [],
    employees: [],

    filters: {
        location: "All",
        department: "all",
        employee: "all",
        startDate: defaultStart,
        endDate: defaultEnd,
        skip: 0,
        limit: 10,
        page: 1,
    },

    setFilter: (key, value) =>
        set((state) => ({
            filters: {
                ...state.filters,
                [key]: value
            }
        })),

    setPage: (page) => {
        const { filters } = get();
        set({
            filters: {
                ...filters,
                page,
                skip: (page - 1) * filters.limit
            }
        });
    },

    setPageSize: (limit) => {
        const { filters } = get();
        set({
            filters: {
                ...filters,
                limit,
                page: 1,
                skip: 0
            }
        });
    },

    loadInitial: async () => {
        try {
            set({ loading: true });

            const [locationRes, departmentRes, employeeRes] = await Promise.all([
                getLocations(),
                getDepartments(),
                getEmployees({ managerId: get().resolveManagerId() })
            ]);

            set({
                locations: locationRes,
                departments: departmentRes,
                employees: employeeRes,
            });

            await get().fetchProductivityData();

        } catch (error) {
            console.error("Productivity Report Init Error:", error);
            set({ loading: false });
        }
    },

    fetchProductivityData: async () => {
        try {
            set({ loading: true });
            const { filters } = get();

            const res = await getProductivityList({
                skip: filters.skip,
                limit: filters.limit,
                startDate: filters.startDate,
                endDate: filters.endDate,
                locationId: filters.location,
                departmentId: filters.department,
                employeeId: filters.employee,
            });

            set({
                rows: res.rows,
                totalCount: res.totalCount,
                loading: false
            });

        } catch (error) {
            console.error("Productivity Data Fetch Error:", error);
            set({ loading: false });
        }
    },

    fetchDepartmentsByLocation: async (locationId) => {
        try {
            const departments = await getDepartments(locationId);
            set({ departments });
        } catch (error) {
            console.error("Departments Fetch Error:", error);
        }
    },

    fetchEmployeesByLocDept: async (locationId, departmentId) => {
        try {
            const employees = await getEmployees({
                locationId,
                departmentId,
                managerId: get().resolveManagerId(),
            });
            set({ employees });
        } catch (error) {
            console.error("Employees Fetch Error:", error);
        }
    },

    handleExportCSV: async () => {
        const { filters } = get();
        await exportCSV({
            startDate: filters.startDate,
            endDate: filters.endDate,
            locationId: filters.location,
            departmentId: filters.department,
            employeeId: filters.employee,
        });
    },

    handleExportPDF: async () => {
        const { filters } = get();
        await exportPDF({
            startDate: filters.startDate,
            endDate: filters.endDate,
            locationId: filters.location,
            departmentId: filters.department,
            employeeId: filters.employee,
        });
    }

}));
