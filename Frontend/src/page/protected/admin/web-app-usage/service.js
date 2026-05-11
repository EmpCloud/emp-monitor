import apiService from "@/services/api.service";
import moment from "moment-timezone";
import * as XLSX from "xlsx";
import autoTable from "jspdf-autotable";
import {
  createBrandedPdf,
  drawSummaryCard,
  drawSectionHeading,
  adaptiveTableStyles,
  drawFooter,
} from "@/utils/pdfBrand";

const TZ = "Asia/Kolkata";

// ── Shared helpers ──────────────────────────────────────────────────────────

/** Seconds → "HH : MM : SS hr" display string */
export function secToDisplay(seconds) {
  const n = Math.abs(Math.floor(Number(seconds) || 0));
  const h = String(Math.floor(n / 3600)).padStart(2, "0");
  const m = String(Math.floor((n % 3600) / 60)).padStart(2, "0");
  const s = String(n % 60).padStart(2, "0");
  return `${h} : ${m} : ${s} hr`;
}

/** Seconds → decimal hours for chart */
export function secToHours(seconds) {
  return parseFloat(((Number(seconds) || 0) / 3600).toFixed(3));
}

/** Strip http(s):// from web-type names (matches PHP controller logic) */
function stripProtocol(name) {
  return name.replace(/^https?:\/\//, "");
}

// ── Filter dropdown APIs (reuse patterns from productivity-report/service) ──

export const getLocations = async () => {
  try {
    const { data } = await apiService.apiInstance.post("/location/get-locations");
    const temp = [{ value: "all", label: "All Location" }];
    if (data?.data?.length) {
      data.data.forEach((loc) =>
        temp.push({ value: String(loc.id), label: loc.name })
      );
    }
    return temp;
  } catch (err) {
    console.error("Location API Error:", err);
    return [{ value: "all", label: "All Location" }];
  }
};

export const getDepartments = async (locationId) => {
  try {
    const endpoint =
      locationId && locationId !== "all"
        ? "/location/get-department-by-location"
        : "/location/get-locations-dept";
    const payload =
      locationId && locationId !== "all" ? { location_id: locationId } : {};

    const { data } = await apiService.apiInstance.post(endpoint, payload);
    const temp = [{ value: "all", label: "All Departments" }];

    if (locationId && locationId !== "all") {
      (data?.data || []).forEach((dept) =>
        temp.push({ value: String(dept.department_id), label: dept.name })
      );
    } else if (Array.isArray(data?.data)) {
      const map = new Map();
      data.data.forEach((loc) =>
        (loc.department || []).forEach((dept) => {
          if (!map.has(dept.department_id)) {
            map.set(dept.department_id, {
              value: String(dept.department_id),
              label: dept.name,
            });
          }
        })
      );
      temp.push(...map.values());
    }
    return temp;
  } catch (err) {
    console.error("Department API Error:", err);
    return [{ value: "all", label: "All Departments" }];
  }
};

export const getEmployees = async ({ locationId, departmentId } = {}) => {
  try {
    const { data } = await apiService.apiInstance.post("/user/fetch-users", {
      status: "",
      shift_id: -1,
      location_id: locationId && locationId !== "all" ? locationId : "",
      department_id: departmentId && departmentId !== "all" ? departmentId : "",
      role_id: "",
      day: moment().tz(TZ).format("YYYY-MM-DD"),
      limit: 500,
      skip: 0,
      name: "",
    });
    const temp = [{ value: "all", label: "All Employees" }];
    const users = data?.data?.user_data ?? [];
    users.forEach((emp) =>
      temp.push({
        value: String(emp.id || emp.u_id || emp._id),
        label:
          emp.full_name ||
          emp.name ||
          `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
          emp.email ||
          "-",
      })
    );
    return temp;
  } catch (err) {
    console.error("Employee API Error:", err);
    return [{ value: "all", label: "All Employees" }];
  }
};

// ── Web/App Usage data (left panel + chart) ─────────────────────────────────
// Maps to PHP: ReportsController@webAppUsageData
// Endpoint: POST /report/employee-appweb-usage

export const getWebAppUsageData = async ({
  locationId,
  departmentId,
  employeeId,
  startDate,
  endDate,
  requestOption = 0, // 0=Both, 1=App, 2=Website
  sortColumn = "total_duration",
  sortOrder = "D",
  skip = 0,
  limit = 20,
  search = "",
  forExport = false,
} = {}) => {
  try {
    const body = {
      startDate,
      endDate,
    };

    if (locationId && locationId !== "all") body.location_ids = [locationId];
    if (departmentId && departmentId !== "all")
      body.department_ids = [departmentId];
    if (employeeId && employeeId !== "all") body.employee_ids = [employeeId];
    if (requestOption !== 0) body.request_option = requestOption;
    if (sortColumn) body.sortColumn = sortColumn;
    if (sortOrder) body.sortOrder = sortOrder;
    if (search) body.search = search;

    // For export, don't send limit/skip (gets all data)
    if (!forExport) {
      body.limit = limit;
      body.skip = skip;
    }

    const { data } = await apiService.apiInstance.post(
      "/report/employee-appweb-usage",
      body
    );

    if (data?.code == 200 || data?.code === 200) {
      // Strip protocol from web-type names (type=2), matching PHP logic
      const items = (data.data || []).map((item) => {
        const name =
          item.type == 2 || item.type === "2"
            ? stripProtocol(item.name)
            : item.name;
        const duration = Number(item.duration) || 0;
        return {
          _id: item._id,
          name,
          type: item.type, // 1=app, 2=web
          status: item.status, // 0=neutral, 1=productive, 2=unproductive, 4=customization
          duration,
          durationDisplay: secToDisplay(duration),
          chartHours: secToHours(duration),
          chartLabel:
            name.length > 18 ? name.slice(0, 18) + "..." : name,
        };
      });

      return {
        code: 200,
        data: items,
        total: data.total || data.skipValue || items.length,
        skipValue: data.skipValue || skip + items.length,
        msg: data.message || "Success",
      };
    }

    return {
      code: data?.code || 400,
      data: [],
      total: 0,
      skipValue: 0,
      msg: data?.message || "No data found",
    };
  } catch (err) {
    console.error("WebApp Usage API Error:", err);
    return { code: 500, data: [], total: 0, skipValue: 0, msg: "API error" };
  }
};

// ── Cumulative Employee Report ──────────────────────────────────────────────
// Maps to PHP: ReportsController@cumulativeEmployeeReport
// Endpoint: GET /report/employee-appweb-cumulative-usage

export const getCumulativeReport = async ({
  startDate,
  endDate,
  locationId,
  departmentId,
  employeeId,
} = {}) => {
  try {
    let url = `/report/employee-appweb-cumulative-usage?startDate=${startDate}&endDate=${endDate}`;
    if (locationId && locationId !== "all")
      url += `&location_ids=${locationId}`;
    if (departmentId && departmentId !== "all")
      url += `&department_ids=${departmentId}`;
    if (employeeId && employeeId !== "all")
      url += `&employee_ids=${employeeId}`;

    const { data } = await apiService.apiInstance.get(url);

    if (data?.code == 200 && Array.isArray(data?.data)) {
      const rows = data.data.map((item, idx) => ({
        id: idx + 1,
        name: `${item.employee?.first_name || ""} ${item.employee?.last_name || ""}`.trim(),
        email:
          item.employee?.a_email &&
          item.employee.a_email !== "null"
            ? item.employee.a_email
            : "--",
        location: item.employee?.location_name || "--",
        department: item.employee?.department_name || "--",
        computerName: item.employee?.computer_name || "--",
        webApp: item.name || "--",
        productive: secToDisplay(item.productive),
        unproductive: secToDisplay(item.non_productive),
        neutral: secToDisplay(item.neutral),
        idle: secToDisplay(item.idle),
        // raw seconds for export
        _productive: item.productive,
        _unproductive: item.non_productive,
        _neutral: item.neutral,
        _idle: item.idle,
      }));
      return { code: 200, data: rows };
    }

    return { code: data?.code || 400, data: [], msg: data?.message };
  } catch (err) {
    console.error("Cumulative Report API Error:", err);
    return { code: 500, data: [], msg: "API error" };
  }
};

// ── Customize Modal Data ────────────────────────────────────────────────────
// Maps to PHP: ReportsController@customizeWebAppData
// Endpoint: POST /report/get-dept-rules

export const getCustomizeData = async ({
  applicationId,
  locationId,
  departmentId,
  employeeId,
  startDate,
  endDate,
  sortColumn,
  sortOrder,
  skip = 0,
  limit = 10,
  search = "",
} = {}) => {
  try {
    const body = {
      application_id: applicationId,
      startDate,
      endDate,
      skip,
      limit,
    };
    if (locationId && locationId !== "all") body.location_ids = [locationId];
    if (departmentId && departmentId !== "all")
      body.department_ids = [departmentId];
    if (employeeId && employeeId !== "all") body.employee_ids = [employeeId];
    if (sortColumn) body.sortColumn = sortColumn;
    if (sortOrder) body.sortOrder = sortOrder;
    if (search) body.search = search;

    const { data } = await apiService.apiInstance.post(
      "/report/get-dept-rules",
      body
    );

    if (data?.code == 200) {
      const items = (data.data || []).map((d) => ({
        name: d.name,
        status: d.status,
        duration: Number(d.duration) || 0,
        durationDisplay: secToDisplay(Number(d.duration) || 0),
      }));
      return { code: 200, data: items, total: data.total || items.length };
    }
    return { code: data?.code || 400, data: [], total: 0 };
  } catch (err) {
    console.error("Customize Data API Error:", err);
    return { code: 500, data: [], total: 0 };
  }
};

// ── Export: Excel ────────────────────────────────────────────────────────────

export const exportExcel = async ({
  startDate,
  endDate,
  locationId,
  departmentId,
  employeeId,
  requestOption,
} = {}) => {
  const res = await getWebAppUsageData({
    startDate,
    endDate,
    locationId,
    departmentId,
    employeeId,
    requestOption,
    forExport: true,
    limit: 10000,
    skip: 0,
  });

  if (res.code !== 200 || !res.data.length) return;

  const headerLabel =
    requestOption === 0
      ? "Web / App"
      : requestOption === 2
      ? "Website"
      : "Application";

  const STATUS_MAP = { 0: "Neutral", 1: "Productive", 2: "Unproductive", 4: "Customization" };

  const csvData = [[headerLabel, "Ranking", "Duration (hr)"]];
  res.data.forEach((item) => {
    const prefix = item.type == 2 || item.type === "2" ? "https://" : "";
    csvData.push([
      prefix + item.name,
      STATUS_MAP[item.status] || "Unknown",
      item.durationDisplay,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(csvData);
  const wb = XLSX.utils.book_new();
  const sheetName =
    requestOption === 0
      ? "Web App Usage"
      : requestOption === 2
      ? "Website Usage"
      : "Application Usage";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${sheetName.replace(/ /g, "_")}.xlsx`);
};

// ── Export: PDF ──────────────────────────────────────────────────────────────

export const exportPDF = async ({
  startDate,
  endDate,
  locationId,
  departmentId,
  employeeId,
  requestOption,
  locationLabel = "All Location",
  departmentLabel = "All Departments",
  employeeLabel = "All Employees",
} = {}) => {
  const res = await getWebAppUsageData({
    startDate,
    endDate,
    locationId,
    departmentId,
    employeeId,
    requestOption,
    forExport: true,
    limit: 10000,
    skip: 0,
  });

  if (res.code !== 200 || !res.data.length) return;

  const headerLabel =
    requestOption === 0
      ? "Web / App"
      : requestOption === 2
      ? "Website"
      : "Application";

  const sheetName =
    requestOption === 0
      ? "Web App Usage"
      : requestOption === 2
      ? "Website Usage"
      : "Application Usage";

  const STATUS_MAP = { 0: "Neutral", 1: "Productive", 2: "Unproductive", 4: "Customization" };

  const bodyData = res.data.map((item) => {
    const prefix = item.type == 2 || item.type === "2" ? "https://" : "";
    return [
      prefix + item.name,
      STATUS_MAP[item.status] || "Unknown",
      item.durationDisplay,
    ];
  });

  const headers = [headerLabel, "Ranking", "Duration (hr)"];

  const { doc, pageWidth, margin, contentWidth, cursorY: startY } =
    await createBrandedPdf({
      title: sheetName,
      orientation: "portrait",
    });
  let cursorY = startY;

  cursorY = drawSummaryCard({
    doc,
    cursorY,
    pageWidth,
    margin,
    contentWidth,
    recordCount: bodyData.length,
    cols: 2,
    entries: [
      ["Date Range", `${startDate} to ${endDate}`],
      ["Location", locationLabel || "All"],
      ["Department", departmentLabel || "All"],
      ["Employee", employeeLabel || "All"],
    ],
  });

  cursorY = drawSectionHeading(doc, "Detailed Records", margin, cursorY);

  const styles = adaptiveTableStyles(headers.length);
  autoTable(doc, {
    startY: cursorY,
    head: [headers],
    body: bodyData,
    theme: "grid",
    ...styles,
    margin: { left: margin, right: margin },
  });

  drawFooter(doc, { margin, pageWidth });
  doc.save(`${sheetName.replace(/ /g, "_")}.pdf`);
};

// ── Export: Cumulative Excel ─────────────────────────────────────────────────

export const exportCumulativeExcel = (rows) => {
  if (!rows?.length) return;

  const headers = [
    "Name", "Email", "Location", "Department",
    "Web/App", "Productive", "Unproductive", "Neutral", "Idle",
  ];

  const csvData = [headers];
  rows.forEach((r) => {
    csvData.push([
      r.name, r.email, r.location, r.department,
      r.webApp, r.productive, r.unproductive, r.neutral, r.idle,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(csvData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cumulative Report");
  XLSX.writeFile(wb, "Cumulative_WebApp_Report.xlsx");
};
