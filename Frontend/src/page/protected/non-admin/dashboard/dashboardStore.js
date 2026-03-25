import { create } from "zustand";
import {
  getDashboardStats,
  getTodayActivitySnapShot,
  getActivityBreakdown,
  getWebUsageChart,
  getAppUsageChart,
  getLocations,
  getDepartments,
  getProductiveEmployees,
  getNonProductiveEmployees,
  getRandomActiveUsers,
  getRandomNonActiveUsers,
  getLocationPerformance,
  getDepartmentPerformance,
} from "../../admin/dashboard/service";

export const useNonAdminDashboardStore = create((set, get) => ({

  stats: [],
  activitySnapshot: [],
  activityBreakdown: [],
  webUsage: [],
  appUsage: [],

  locations: [],

  departments: {
    productive: [],
    unproductive: [],
    active: [],
    nonActive: [],
  },

  productiveEmployees: [],
  productiveEmployeesLoading: false,

  unproductiveEmployees: [],
  unproductiveEmployeesLoading: false,

  activeEmployees: [],
  activeEmployeesLoading: false,

  nonActiveEmployees: [],
  nonActiveEmployeesLoading: false,

  locationPerformance: { chartRings: [], rows: [], msg: "" },
  locationPerformanceLoading: false,

  departmentPerformance: { pieData: [], rows: [], msg: "" },
  departmentPerformanceLoading: false,

  loading: false,

  filters: {
    productiveLocation: "all",
    productiveDepartment: "all",
    productiveBy: "today",

    unproductiveLocation: "all",
    unproductiveDepartment: "all",
    unproductiveBy: "today",

    activeLocation: "all",
    activeDepartment: "all",
    activeBy: "today",

    nonActiveLocation: "all",
    nonActiveDepartment: "all",
    nonActiveBy: "today",

    locationPerformanceBy: "today",
    locationPerformanceType: "neu",

    departmentPerformanceBy: "today",
    departmentPerformanceType: "pro",
  },

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  loadDashboard: async () => {
    try {
      set({ loading: true });

      const [
        statsRes,
        snapshotRes,
        activityBreakdownRes,
        webUsageRes,
        appUsageRes,
        locationRes,
        departmentRes,
        productiveEmployeesRes,
        nonProductiveEmployeesRes,
        activeEmployeesRes,
        nonActiveEmployeesRes,
      ] = await Promise.all([
        getDashboardStats(),
        getTodayActivitySnapShot(),
        getActivityBreakdown(),
        getWebUsageChart(),
        getAppUsageChart(),
        getLocations(),
        getDepartments(),
        getProductiveEmployees(),
        getNonProductiveEmployees(),
        getRandomActiveUsers(),
        getRandomNonActiveUsers(),
      ]);

      set({
        stats: statsRes?.stats || [],
        activitySnapshot: snapshotRes?.stats || [],
        activityBreakdown: activityBreakdownRes?.stats || [],
        webUsage: webUsageRes?.stats || [],
        appUsage: appUsageRes?.stats || [],
        locations: locationRes?.stats || [],
        departments: {
          productive: departmentRes?.stats || [],
          unproductive: departmentRes?.stats || [],
          active: departmentRes?.stats || [],
          nonActive: departmentRes?.stats || [],
        },
        productiveEmployees: productiveEmployeesRes?.stats || [],
        unproductiveEmployees: nonProductiveEmployeesRes?.stats || [],
        activeEmployees: activeEmployeesRes?.stats || [],
        nonActiveEmployees: nonActiveEmployeesRes?.stats || [],
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchProductiveEmployees: async ({ by, locationId, departmentId } = {}) => {
    try {
      set({ productiveEmployeesLoading: true });
      const res = await getProductiveEmployees({ by, locationId, departmentId });
      set({ productiveEmployees: res?.stats || [], productiveEmployeesLoading: false });
    } catch {
      set({ productiveEmployeesLoading: false });
    }
  },

  fetchNonProductiveEmployees: async ({ by, locationId, departmentId } = {}) => {
    try {
      set({ unproductiveEmployeesLoading: true });
      const res = await getNonProductiveEmployees({ by, locationId, departmentId });
      set({ unproductiveEmployees: res?.stats || [], unproductiveEmployeesLoading: false });
    } catch {
      set({ unproductiveEmployeesLoading: false });
    }
  },

  fetchActiveEmployees: async ({ by, locationId, departmentId } = {}) => {
    try {
      set({ activeEmployeesLoading: true });
      const res = await getRandomActiveUsers({ by, locationId, departmentId });
      set({ activeEmployees: res?.stats || [], activeEmployeesLoading: false });
    } catch {
      set({ activeEmployeesLoading: false });
    }
  },

  fetchNonActiveEmployees: async ({ by, locationId, departmentId } = {}) => {
    try {
      set({ nonActiveEmployeesLoading: true });
      const res = await getRandomNonActiveUsers({ by, locationId, departmentId });
      set({ nonActiveEmployees: res?.stats || [], nonActiveEmployeesLoading: false });
    } catch {
      set({ nonActiveEmployeesLoading: false });
    }
  },

  fetchLocationPerformance: async ({ by, type } = {}) => {
    try {
      const state = get();
      const b = by ?? state.filters.locationPerformanceBy ?? "today";
      const t = type ?? state.filters.locationPerformanceType ?? "neu";
      set({ locationPerformanceLoading: true });
      const res = await getLocationPerformance({ by: b, type: t });
      set({
        locationPerformance: res?.stats || { chartRings: [], rows: [], msg: "" },
        locationPerformanceLoading: false,
      });
    } catch {
      set({ locationPerformanceLoading: false });
    }
  },

  fetchDepartmentsByLocation: async (locationId, type) => {
    try {
      const res = await getDepartments(locationId === "all" ? undefined : locationId);
      set((state) => ({
        departments: { ...state.departments, [type]: res?.stats || [] },
      }));
    } catch {
      // ignore
    }
  },

  fetchDepartmentPerformance: async ({ by, type } = {}) => {
    try {
      const state = get();
      const b = by ?? state.filters.departmentPerformanceBy ?? "today";
      const t = type ?? state.filters.departmentPerformanceType ?? "pro";
      set({ departmentPerformanceLoading: true });
      const res = await getDepartmentPerformance({ by: b, type: t });
      set({
        departmentPerformance: res?.stats || { pieData: [], rows: [], msg: "" },
        departmentPerformanceLoading: false,
      });
    } catch {
      set({ departmentPerformanceLoading: false });
    }
  },
}));
