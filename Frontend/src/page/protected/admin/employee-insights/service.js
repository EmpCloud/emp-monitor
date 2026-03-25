import apiService from "@/services/api.service";
import moment from "moment-timezone";

const toSeconds = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const formatSecondsToHMS = (value) => {
  const total = toSeconds(value);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const getEmployeesList = async ({
  roleId = "all",
  locationId = "all",
  departmentId = "all",
  managerId,
} = {}) => {
  try {
    const isAssignedMode = Number.isFinite(Number(managerId)) && Number(managerId) > 0;
    const common = {
      location_id: locationId !== "all" ? locationId : "",
      department_id: departmentId !== "all" ? departmentId : "",
      role_id: roleId !== "all" ? roleId : "",
      limit: 500,
      skip: 0,
      name: "",
    };

    const payload = isAssignedMode
      ? {
          to_assigned_id: Number(managerId),
          ...common,
        }
      : {
          status: "",
          shift_id: -1,
          day: new Date().toISOString().slice(0, 10),
          ...common,
        };

    const endpoint = isAssignedMode ? `/user/get-assigned-employee` : `/user/fetch-users`;
    const { data } = await apiService.apiInstance.post(endpoint, payload);
    let options = [{ value: "all", label: "See All Employee" }];

    const list =
      data?.data?.user_data ??
      data?.data ??
      data?.users ??
      data ??
      [];
    if (Array.isArray(list) && list.length) {
      options = [
        ...options,
        ...list.map((emp, idx) => {
          const id = emp.user_id ?? emp.id ?? emp.u_id ?? idx + 1;
          const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
          return {
            value: String(id),
            label: fullName || emp.email || `Employee ${idx + 1}`,
          };
        }),
      ];
    }

    return { stats: options, raw: data };
  } catch (error) {
    console.error("Employee list API error:", error);
    return { stats: [{ value: "all", label: "See All Employee" }], raw: null };
  }
};

export const getRoles = async () => {
  try {
    const { data } = await apiService.apiInstance.get(`/organization/get-role`);

    let options = [{ value: "all", label: "See all" }];
    const list = data?.data ?? [];
    if (Array.isArray(list) && list.length) {
      options = [
        ...options,
        ...list.map((role) => ({
          value: String(role?.id),
          label: role?.name || "Role",
        })),
      ];
    }
    return { stats: options, raw: data };
  } catch (error) {
    console.error("Roles API error:", error);
    return { stats: [{ value: "all", label: "See all" }], raw: null };
  }
};

export const getLocations = async () => {
  try {
    const { data } = await apiService.apiInstance.post(`/location/get-locations`);
    let options = [{ value: "all", label: "See all" }];

    const list = data?.data ?? [];
    if (Array.isArray(list) && list.length) {
      options = [
        ...options,
        ...list.map((location) => ({
          value: String(location?.id),
          label: location?.name || "Location",
        })),
      ];
    }

    return { stats: options, raw: data };
  } catch (error) {
    console.error("Locations API error:", error);
    return { stats: [{ value: "all", label: "See all" }], raw: null };
  }
};

export const getDepartments = async () => {
  try {
    const { data } = await apiService.apiInstance.post(`/department/get-departments`);
    let options = [{ value: "all", label: "See all" }];

    const list = data?.data ?? [];
    if (Array.isArray(list) && list.length) {
      options = [
        ...options,
        ...list.map((department) => ({
          value: String(department?.id),
          label: department?.name || "Department",
        })),
      ];
    }

    return { stats: options, raw: data };
  } catch (error) {
    console.error("Departments API error:", error);
    return { stats: [{ value: "all", label: "See all" }], raw: null };
  }
};

const normalizeInsightRow = (row) => {
  const officeSeconds = toSeconds(row?.office_time);
  const productiveSeconds = toSeconds(row?.productive_duration);
  const unproductiveSeconds = toSeconds(row?.non_productive_duration);
  const neutralSeconds = toSeconds(row?.neutral_duration);
  const activeSeconds = toSeconds(row?.computer_activities_time || row?.total_duration);

  const productivityRaw = Number(row?.productivity ?? 0);
  const productivity = Number.isFinite(productivityRaw) ? productivityRaw : 0;

  return {
    date: row?.date || "",
    officeSeconds,
    productiveSeconds,
    unproductiveSeconds,
    neutralSeconds,
    activeSeconds,
    productivity,
    officeTime: `${formatSecondsToHMS(officeSeconds)} hrs`,
    productiveTime: `${formatSecondsToHMS(productiveSeconds)} hrs`,
    unproductiveTime: `${formatSecondsToHMS(unproductiveSeconds)} hrs`,
    neutralTime: `${formatSecondsToHMS(neutralSeconds)} hrs`,
    activeTime: `${formatSecondsToHMS(activeSeconds)} hrs`,
    productivityText: `${productivity.toFixed(2)}%`,
  };
};

export const getEmployeeInsights = async ({ employeeId, date, timezone = "Asia/Kolkata" } = {}) => {
  try {
    if (!employeeId || employeeId === "all") {
      return { stats: null, raw: null };
    }

    const selectedDate = date || moment().tz(timezone).format("YYYY-MM-DD");
    const { data } = await apiService.apiInstance.get(
      `/employee/get-employee-insights?date=${selectedDate}&employee_id=${employeeId}`
    );

    const today = normalizeInsightRow(data?.data?.todays?.[0] || {});
    const yesterday = normalizeInsightRow(data?.data?.yesterdays?.[0] || {});
    const organization = normalizeInsightRow(data?.data?.organization?.[0] || {});

    return {
      stats: { today, yesterday, organization },
      raw: data,
    };
  } catch (error) {
    console.error("Employee insights API error:", error);
    return { stats: null, raw: null };
  }
};
