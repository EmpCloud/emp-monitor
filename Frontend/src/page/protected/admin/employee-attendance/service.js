import apiService from "@/services/api.service";
import * as XLSX from "xlsx";

const formatMonthYear = (dateValue) => {
  if (!dateValue) return "Unknown";

  const str = dateValue.toString();
  const year = str.slice(0, 4);
  const month = str.slice(4, 6);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return `${months[Number(month) - 1]}_${year}`;
};

export const getAttendanceLocations = async () => {
  try {
    const { data } = await apiService.apiInstance.post(
      `/location/get-locations`,
      { role_id: 0 },
    );

    let temp = [{ value: "all", label: "All Locations" }];

    if (Array.isArray(data?.data)) {
      const locations = data.data.map((loc) => ({
        value: loc.id,
        label: loc.name,
        timezone: loc.timezone,
      }));

      temp = [...temp, ...locations];
    }

    return {
      stats: temp,
      raw: data,
    };
  } catch (error) {
    return {
      stats: [],
      raw: null,
    };
  }
};

export const getAttendanceDepartments = async ({ locationId } = {}) => {
  try {
    if (!locationId) {
      return {
        stats: [{ value: "all", label: "All Departments" }],
        raw: null,
      };
    }

    const { data } = await apiService.apiInstance.post(
      `/location/get-department-by-location`,
      {
        id: locationId === "all" ? 0 : Number(locationId),
      },
    );

    let temp = [{ value: "all", label: "All Departments" }];

    if (Array.isArray(data?.data)) {
      const departments = data.data.map((dept) => ({
        value: String(dept.department_id),
        label: dept.name,
      }));

      temp = [...temp, ...departments];
    } else {
    }

    return {
      stats: temp,
      raw: data,
    };
  } catch (error) {
    return {
      stats: [],
      raw: null,
    };
  }
};

export const getAttendance = async ({
  date,
  locationId = "all",
  departmentId = "all",
  skip = 0,
  limit = 10,
  search = "",
  sortColumn = "name",
  sortOrder = "D",
  nonAdminId,
} = {}) => {
  try {
    const params = {
      date,
      skip,
      limit,
      sortColumn,
      sortOrder,
    };

    if (search) params.search = search;

    if (locationId && locationId !== "all") {
      params.locationId = Number(locationId);
    }

    if (departmentId && departmentId !== "all") {
      params.departmentId = Number(departmentId);
    }

    if (nonAdminId) {
      params.nonAdminId = nonAdminId;
    }

    const { data } = await apiService.apiInstance.get(`/employee/attendance`, {
      params,
    });

    const monthKey = String(date);

    const list = data?.data?.[monthKey] || [];

    const formattedList = list.map((item) => ({
      ...item,
      department: item.department ?? item.departament ?? "-",
    }));

    return {
      stats: formattedList,
      pageCount: data?.data?.pageCount || 0,
      empCount: data?.data?.empCount || 0,
      raw: data,
    };
  } catch (error) {
    return {
      stats: [],
      pageCount: 0,
      empCount: 0,
      raw: null,
    };
  }
};

export const getShifts = async () => {
  try {
    const { data } = await apiService.apiInstance.get(
      `/organization-shift/find_by`,
    );

    let temp = [{ value: "all", label: "All Shifts" }];

    if (Array.isArray(data?.data)) {
      const shifts = data.data.map((shift) => ({
        value: shift.id,
        label: shift.name,
        raw: shift,
      }));

      temp = [...temp, ...shifts];
    }

    return {
      stats: temp,
      raw: data,
    };
  } catch (error) {
    return {
      stats: [],
      raw: null,
    };
  }
};

const DAY_ABBR_EXPORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES_EXPORT = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/**
 * Build the day-cell status string — mirrors DownloadSheet() in employee_attendance.js exactly.
 */
const buildDayStatus = (dayData) => {
  if (!dayData?.log) return "-";
  const { isWorkDay, log } = dayData;
  let status = "";
  if (isWorkDay) {
    if (log.late && log.lateTime > 0) status = log.late + "/";
    status += log.marker ?? "";
    if (log.earlyLogout && log.earlyLogout_duration > 0) status += "/" + log.earlyLogout;
    if (log.overtime && log.overTime_duration > 0) status += "/" + log.overtime;
  } else {
    status = log.marker ?? "";
    if (log.overtime && log.overTime_duration > 0) status += "/" + log.overtime;
  }
  return status || "-";
};

export const exportAttendanceExcel = async (params = {}) => {
  try {
    const dateVal = Number(params.date);
    const queryParams = { ...params };
    delete queryParams.limit;
    delete queryParams.skip;

    const response = await apiService.apiInstance.get(`/employee/attendance`, {
      params: queryParams,
    });

    const rawData = response.data?.data;
    if (!rawData) return { success: false };

    // Derive year/month from dateValue (e.g. 202603 → year=2026, month=2 [0-indexed])
    const str   = String(dateVal);
    const year  = parseInt(str.slice(0, 4), 10);
    const month = parseInt(str.slice(4, 6), 10) - 1;

    // Build ordered day headers: ["1.Thu", "2.Fri", ...]  — matches DownloadSheet xlsHeader logic
    const xlsHeader = ["Employee Name", "Location", "Department", "Shift", "Employee Code"];
    const dayMeta   = []; // [{ day, field }]
    const d = new Date(year, month, 1);
    let i = 1;
    while (d.getMonth() === month) {
      const field = `${i}.${DAY_ABBR_EXPORT[d.getDay()]}`;
      xlsHeader.push(field);
      dayMeta.push({ day: i, field });
      d.setDate(d.getDate() + 1);
      i++;
    }
    xlsHeader.push("Present", "Late", "Half_leave", "Absent", "Overtime", "Day-Off", "Early-Logout");

    // Flatten response — same iteration as $.each(response.data, (i) => { $.each(response.data[i], ...) })
    const monthKey = String(dateVal);
    const list = rawData[monthKey] ?? [];

    const xlsRows = list.map((emp) => {
      const row = {};
      row["Employee Name"]  = `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || emp.full_name || "-";
      row["Location"]       = emp.location || "-";
      row["Department"]     = emp.department ?? emp.departament ?? "-";
      row["Shift"]          = emp.shift ?? "-";
      row["Employee Code"]  = emp.emp_code ?? "-";

      if (typeof emp.date === "object" && emp.date !== null) {
        dayMeta.forEach(({ day, field }) => {
          row[field] = buildDayStatus(emp.date[day]);
        });
      } else {
        dayMeta.forEach(({ field }) => { row[field] = "-"; });
      }

      row["Present"]      = emp.P  ?? 0;
      row["Late"]         = emp.L  ?? 0;
      row["Half_leave"]   = emp.H  ?? 0;
      row["Absent"]       = emp.A  ?? 0;
      row["Overtime"]     = emp.O  ?? 0;
      row["Day-Off"]      = emp.D  ?? 0;
      row["Early-Logout"] = emp.EL ?? 0;
      return row;
    });

    const fileName  = `Employees_Attendance_${MONTH_NAMES_EXPORT[month]}_${year}.xlsx`;
    const worksheet = XLSX.utils.json_to_sheet(xlsRows, { header: xlsHeader });
    const workbook  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, fileName);

    return { success: true };
  } catch (error) {
    return { success: false };
  }
};
