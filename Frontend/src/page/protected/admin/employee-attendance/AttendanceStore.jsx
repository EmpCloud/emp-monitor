import { create } from "zustand";

import {
  getAttendance,
  getAttendanceLocations,
  getAttendanceDepartments,
  exportAttendanceExcel,
} from "./service";

// Current month as YYYYMM (e.g. 202603 for March 2026)
const _now = new Date();
const CURRENT_MONTH = Number(
  `${_now.getFullYear()}${String(_now.getMonth() + 1).padStart(2, "0")}`
);

export const useAttendanceStore = create((set, get) => ({
  attendance: [],
  locations: [],
  departments: [],

  pageCount: 0,
  empCount: 0,

  loading: false,

  filters: {
    date:         CURRENT_MONTH,
    locationId:   "all",
    departmentId: "all",
    search:       "",
    sortColumn:   "name",
    sortOrder:    "D",
    skip:         0,
    limit:        10,
  },

  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
        ...(key === "locationId" && { departmentId: "all" }),
        skip: key !== "skip" ? 0 : value,
      },
    })),

  loadAttendance: async () => {
    try {
      set({ loading: true });

      const [locationRes, attendanceRes] = await Promise.all([
        getAttendanceLocations(),
        getAttendance(get().filters),
      ]);

      set({
        locations:  locationRes?.stats  || [],
        attendance: attendanceRes?.stats || [],
        pageCount:  attendanceRes?.pageCount || 0,
        empCount:   attendanceRes?.empCount  || 0,
        loading:    false,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchDepartments: async () => {
    try {
      const res = await getAttendanceDepartments({ locationId: get().filters.locationId });
      set({ departments: res.stats || [] });
    } catch {
      set({ departments: [] });
    }
  },

  fetchAttendance: async () => {
    try {
      set({ loading: true });

      const { filters } = get();
      const params = { ...filters };

      if (params.date) params.date = Number(params.date);
      else delete params.date;

      if (!params.search)               delete params.search;
      if (params.locationId   === "all") delete params.locationId;
      else params.locationId   = Number(params.locationId);
      if (params.departmentId === "all") delete params.departmentId;
      else params.departmentId = Number(params.departmentId);

      const res = await getAttendance(params);

      set({
        attendance: res?.stats || [],
        pageCount:  res?.pageCount || 0,
        empCount:   res?.empCount  || 0,
        loading:    false,
      });
    } catch {
      set({ loading: false });
    }
  },

  exportAttendance: async () => {
    try {
      const { filters } = get();
      const params = { ...filters, date: Number(filters.date) };

      delete params.limit;
      delete params.skip;

      if (!params.search)               delete params.search;
      if (params.locationId   === "all") delete params.locationId;
      else params.locationId   = Number(params.locationId);
      if (params.departmentId === "all") delete params.departmentId;
      else params.departmentId = Number(params.departmentId);

      return await exportAttendanceExcel(params);
    } catch {
      return { success: false };
    }
  },
}));
