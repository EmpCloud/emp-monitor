import { create } from "zustand";
import moment from "moment-timezone";
import {
  getWebAppUsageData,
  getCumulativeReport,
  getCustomizeData,
  getLocations,
  getDepartments,
  getEmployees,
  exportExcel,
  exportPDF,
  exportCumulativeExcel,
} from "./service";

const TZ = "Asia/Kolkata";
const defaultStart = moment().tz(TZ).format("YYYY-MM-DD");
const defaultEnd = moment().tz(TZ).format("YYYY-MM-DD");

export const useWebAppUsageStore = create((set, get) => ({
  // ── Dropdown options ──
  locations: [],
  departments: [],
  employees: [],

  // ── Filters ──
  filters: {
    location: "all",
    department: "all",
    employee: "all",
    startDate: defaultStart,
    endDate: defaultEnd,
    tab: 0, // 0=Both, 1=App, 2=Website
    search: "",
    sortColumn: "total_duration",
    sortOrder: "D",
  },

  // ── Left panel (web/app list) ──
  listData: [],
  listTotal: 0,
  listSkip: 0,
  listLoading: false,

  // ── Chart data (derived from listData) ──
  chartData: [],

  // ── Bottom table (cumulative employee report) ──
  cumulativeData: [],
  cumulativeLoading: false,

  // ── Pagination for bottom table ──
  cTablePage: 1,
  cTablePageSize: 10,

  // ── Customize modal ──
  modalOpen: false,
  modalAppId: null,
  modalAppName: "",
  modalAppType: 1,
  modalData: [],
  modalTotal: 0,
  modalSkip: 0,
  modalPageSize: 10,
  modalPage: 1,
  modalSearch: "",
  modalLoading: false,

  // ── Actions: Filters ──

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  setTab: (tab) => {
    set((state) => ({
      filters: { ...state.filters, tab },
      listData: [],
      listSkip: 0,
      listTotal: 0,
      chartData: [],
    }));
    get().fetchListData();
  },

  setSearch: (search) => {
    set((state) => ({
      filters: { ...state.filters, search },
      listData: [],
      listSkip: 0,
      listTotal: 0,
      chartData: [],
    }));
    get().fetchListData();
  },

  setSorting: (sortColumn) => {
    const { filters } = get();
    let sortOrder = "A";
    if (filters.sortColumn === sortColumn) {
      sortOrder = filters.sortOrder === "A" ? "D" : "A";
    }
    set((state) => ({
      filters: { ...state.filters, sortColumn, sortOrder },
      listData: [],
      listSkip: 0,
      listTotal: 0,
      chartData: [],
    }));
    get().fetchListData();
  },

  // ── Actions: Init ──

  loadInitial: async () => {
    try {
      set({ listLoading: true, cumulativeLoading: true });

      const [locs, depts, emps] = await Promise.all([
        getLocations(),
        getDepartments(),
        getEmployees(),
      ]);

      set({ locations: locs, departments: depts, employees: emps });

      await Promise.all([get().fetchListData(), get().fetchCumulativeData()]);
    } catch (err) {
      console.error("WebApp Usage Init Error:", err);
      set({ listLoading: false, cumulativeLoading: false });
    }
  },

  // ── Actions: Fetch left-panel list data ──

  fetchListData: async () => {
    try {
      set({ listLoading: true });
      const { filters } = get();

      const res = await getWebAppUsageData({
        locationId: filters.location,
        departmentId: filters.department,
        employeeId: filters.employee,
        startDate: filters.startDate,
        endDate: filters.endDate,
        requestOption: filters.tab,
        sortColumn: filters.sortColumn,
        sortOrder: filters.sortOrder,
        skip: 0,
        limit: 20,
        search: filters.search,
      });

      if (res.code === 200) {
        set({
          listData: res.data,
          listTotal: res.total,
          listSkip: res.skipValue,
          chartData: res.data.map((d) => ({
            name: d.chartLabel,
            fullName: d.name,
            hours: d.chartHours,
            durationDisplay: d.durationDisplay,
          })),
          listLoading: false,
        });
      } else {
        set({
          listData: [],
          listTotal: 0,
          listSkip: 0,
          chartData: [],
          listLoading: false,
        });
      }
    } catch (err) {
      console.error("List Data Fetch Error:", err);
      set({ listLoading: false });
    }
  },

  // ── Actions: Load more (infinite scroll) ──

  loadMoreListData: async () => {
    const { listSkip, listTotal, listLoading, filters } = get();
    if (listLoading || listSkip >= listTotal) return;

    try {
      set({ listLoading: true });

      const res = await getWebAppUsageData({
        locationId: filters.location,
        departmentId: filters.department,
        employeeId: filters.employee,
        startDate: filters.startDate,
        endDate: filters.endDate,
        requestOption: filters.tab,
        sortColumn: filters.sortColumn,
        sortOrder: filters.sortOrder,
        skip: listSkip,
        limit: 20,
        search: filters.search,
      });

      if (res.code === 200 && res.data.length) {
        set((state) => ({
          listData: [...state.listData, ...res.data],
          listSkip: res.skipValue,
          chartData: [
            ...state.chartData,
            ...res.data.map((d) => ({
              name: d.chartLabel,
              fullName: d.name,
              hours: d.chartHours,
              durationDisplay: d.durationDisplay,
            })),
          ],
          listLoading: false,
        }));
      } else {
        set({ listLoading: false });
      }
    } catch (err) {
      console.error("Load More Error:", err);
      set({ listLoading: false });
    }
  },

  // ── Actions: Cumulative employee report ──

  fetchCumulativeData: async () => {
    try {
      set({ cumulativeLoading: true });
      const { filters } = get();

      const res = await getCumulativeReport({
        startDate: filters.startDate,
        endDate: filters.endDate,
        locationId: filters.location,
        departmentId: filters.department,
        employeeId: filters.employee,
      });

      set({
        cumulativeData: res.code === 200 ? res.data : [],
        cumulativeLoading: false,
        cTablePage: 1,
      });
    } catch (err) {
      console.error("Cumulative Fetch Error:", err);
      set({ cumulativeLoading: false });
    }
  },

  setCTablePage: (page) => set({ cTablePage: page }),
  setCTablePageSize: (size) => set({ cTablePageSize: size, cTablePage: 1 }),

  // ── Actions: Filter changes (cascade) ──

  handleLocationChange: async (value) => {
    const { setFilter } = get();
    setFilter("location", value);
    setFilter("department", "all");
    setFilter("employee", "all");

    const [depts, emps] = await Promise.all([
      getDepartments(value),
      getEmployees({ locationId: value }),
    ]);
    set((state) => ({
      departments: depts,
      employees: emps,
      listData: [],
      listSkip: 0,
      chartData: [],
    }));

    await Promise.all([get().fetchListData(), get().fetchCumulativeData()]);
  },

  handleDepartmentChange: async (value) => {
    const { filters } = get();
    get().setFilter("department", value);
    get().setFilter("employee", "all");

    const emps = await getEmployees({
      locationId: filters.location,
      departmentId: value,
    });
    set((state) => ({
      employees: emps,
      listData: [],
      listSkip: 0,
      chartData: [],
    }));

    await Promise.all([get().fetchListData(), get().fetchCumulativeData()]);
  },

  handleEmployeeChange: async (value) => {
    get().setFilter("employee", value);
    set({ listData: [], listSkip: 0, chartData: [] });
    await Promise.all([get().fetchListData(), get().fetchCumulativeData()]);
  },

  handleDateChange: async (startDate, endDate) => {
    get().setFilter("startDate", startDate);
    get().setFilter("endDate", endDate);
    set({ listData: [], listSkip: 0, chartData: [] });
    await Promise.all([get().fetchListData(), get().fetchCumulativeData()]);
  },

  // ── Actions: Exports ──

  handleExportExcel: async () => {
    const { filters } = get();
    await exportExcel({
      startDate: filters.startDate,
      endDate: filters.endDate,
      locationId: filters.location,
      departmentId: filters.department,
      employeeId: filters.employee,
      requestOption: filters.tab,
    });
  },

  handleExportPDF: async () => {
    const { filters, locations, departments, employees } = get();
    const locLabel =
      locations.find((l) => l.value === filters.location)?.label ||
      "All Location";
    const deptLabel =
      departments.find((d) => d.value === filters.department)?.label ||
      "All Departments";
    const empLabel =
      employees.find((e) => e.value === filters.employee)?.label ||
      "All Employees";

    await exportPDF({
      startDate: filters.startDate,
      endDate: filters.endDate,
      locationId: filters.location,
      departmentId: filters.department,
      employeeId: filters.employee,
      requestOption: filters.tab,
      locationLabel: locLabel,
      departmentLabel: deptLabel,
      employeeLabel: empLabel,
    });
  },

  handleExportCumulativeExcel: () => {
    const { cumulativeData } = get();
    exportCumulativeExcel(cumulativeData);
  },

  // ── Actions: Customize Modal ──

  openModal: (appId, appName, appType) => {
    set({
      modalOpen: true,
      modalAppId: appId,
      modalAppName: appName,
      modalAppType: appType,
      modalData: [],
      modalTotal: 0,
      modalSkip: 0,
      modalPage: 1,
      modalSearch: "",
    });
    get().fetchModalData();
  },

  closeModal: () =>
    set({
      modalOpen: false,
      modalAppId: null,
      modalAppName: "",
      modalData: [],
      modalTotal: 0,
    }),

  setModalPage: (page) => {
    set({ modalPage: page, modalSkip: (page - 1) * get().modalPageSize });
    get().fetchModalData();
  },

  setModalPageSize: (size) => {
    set({ modalPageSize: size, modalPage: 1, modalSkip: 0 });
    get().fetchModalData();
  },

  setModalSearch: (search) => {
    set({ modalSearch: search, modalPage: 1, modalSkip: 0 });
    get().fetchModalData();
  },

  fetchModalData: async () => {
    const {
      modalAppId,
      filters,
      modalSkip,
      modalPageSize,
      modalSearch,
    } = get();
    if (!modalAppId) return;

    try {
      set({ modalLoading: true });

      const res = await getCustomizeData({
        applicationId: modalAppId,
        locationId: filters.location,
        departmentId: filters.department,
        employeeId: filters.employee,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sortColumn: filters.sortColumn,
        sortOrder: filters.sortOrder,
        skip: modalSkip,
        limit: modalPageSize,
        search: modalSearch,
      });

      set({
        modalData: res.code === 200 ? res.data : [],
        modalTotal: res.total,
        modalLoading: false,
      });
    } catch (err) {
      console.error("Modal Data Fetch Error:", err);
      set({ modalLoading: false });
    }
  },
}));
