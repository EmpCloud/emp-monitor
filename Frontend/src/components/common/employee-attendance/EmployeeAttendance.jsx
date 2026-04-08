import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAttendanceStore } from "@/page/protected/admin/employee-attendance/AttendanceStore";
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import attendanceImage from "@/assets/calendar.png";
import EmpFilter from "@/components/common/employee-attendance/EmpFilter";
import PaginationComponent from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Tooltip label keys — resolved at render time via t()
const ATTENDANCE_TITLE_KEYS = {
  P:  "att_present",
  A:  "att_absent",
  D:  "att_day_off",
  O:  "att_overtime",
  EL: "att_early_logout",
  L:  "att_late_login",
  H:  "att_half_day",
};

// Colour class per primary attendance marker
const STATUS_CLS = {
  P:  "text-green-700 bg-green-50",
  A:  "text-red-600   bg-red-50",
  L:  "text-orange-500 bg-orange-50",
  H:  "text-yellow-600 bg-yellow-50",
  O:  "text-blue-600  bg-blue-50",
  D:  "text-slate-500  bg-slate-100",
  EL: "text-purple-600 bg-purple-50",
};

// Summary columns — keys for title resolved via t() inside component
const getSummaryCols = (t) => [
  { key: "P",  label: "P",  title: t("att_total_present")  },
  { key: "L",  label: "L",  title: t("att_total_late")     },
  { key: "H",  label: "H",  title: t("att_total_half_day") },
  { key: "A",  label: "A",  title: t("att_total_absent")   },
  { key: "O",  label: "O",  title: t("att_total_overtime") },
  { key: "D",  label: "D",  title: t("att_day_off")        },
  { key: "EL", label: "EL", title: t("att_early_logout")   },
];

// Sortable fixed columns
const getSortCols = (t) => [
  { key: "name",       label: t("att_emp_name"),   minW: "min-w-[160px]" },
  { key: "location",   label: t("location"),   minW: "min-w-[100px]" },
  { key: "department", label: t("department"), minW: "min-w-[110px]" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────


/** Expand dateValue (e.g. 202601) → array of { day, abbr } for every day in that month */
const getDaysInMonth = (dateValue) => {
  const str   = String(dateValue);
  const year  = parseInt(str.slice(0, 4), 10);
  const month = parseInt(str.slice(4, 6), 10) - 1;
  const days  = [];
  const d     = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push({ day: d.getDate(), abbr: DAY_ABBR[d.getDay()] });
    d.setDate(d.getDate() + 1);
  }
  return days;
};

/**
 * Mirrors the jQuery day-cell logic from employee_attendance.js exactly:
 *
 *   isWorkDay:
 *     late + lateTime>0  → prepend "L/"
 *     marker             → append
 *     earlyLogout_duration>0 → append "/EL"
 *     overTime_duration>0    → append "/O"
 *
 *   !isWorkDay:
 *     marker
 *     overTime_duration>0 → append "/O"
 */
const renderDayStatus = (dayData, t) => {
  if (!dayData?.log) return { status: "-", title: "", cls: "text-slate-300" };
  const { isWorkDay, log } = dayData;
  let status = "";
  let title  = "";
  const getTitle = (key) => (ATTENDANCE_TITLE_KEYS[key] ? t(ATTENDANCE_TITLE_KEYS[key]) : "");

  if (isWorkDay) {
    if (log.late && log.lateTime > 0) {
      status = log.late + "/";
      title  = getTitle(log.late);
    }
    status += log.marker ?? "-";
    title  += (title ? " " : "") + getTitle(log.marker);
    if (log.earlyLogout && log.earlyLogout_duration > 0) {
      status += "/" + log.earlyLogout;
      title  += " " + getTitle(log.earlyLogout);
    }
    if (log.overtime && log.overTime_duration > 0) {
      status += "/" + log.overtime;
      title  += " " + getTitle(log.overtime);
    }
  } else {
    status = log.marker ?? "-";
    title  = getTitle(log.marker);
    if (log.overtime && log.overTime_duration > 0) {
      status += "/" + log.overtime;
      title  += " " + getTitle(log.overtime);
    }
  }

  return {
    status,
    title: title.trim(),
    cls: STATUS_CLS[log.marker ?? ""] ?? "text-slate-300",
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

const EmployeeAttendance = () => {
  const { t } = useTranslation();
  const {
    attendance, locations, departments, shifts,
    filters, loading, pageCount, empCount,
    setFilter, loadAttendance, fetchDepartments, fetchAttendance, exportAttendance,
  } = useAttendanceStore((state) => state);

  const SORT_COLS = useMemo(() => getSortCols(t), [t]);
  const SUMMARY_COLS = useMemo(() => getSummaryCols(t), [t]);

  const isFirstRender = useRef(true);
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  // Days for the currently-selected month — recalculated whenever date filter changes
  const daysInMonth = useMemo(() => getDaysInMonth(filters.date), [filters.date]);

  // Initial load
  useEffect(() => { loadAttendance(); }, []);

  // Re-fetch departments when location changes
  useEffect(() => { fetchDepartments(); }, [filters.locationId]);

  // Re-fetch attendance whenever any filter changes (skip first render to avoid double-fetch)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchAttendance();
  }, [filters]);

  // Debounced search (500 ms — matches Laravel's onkeypress behaviour)
  useEffect(() => {
    const t = setTimeout(() => setFilter("search", searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (filters.sortColumn === col) {
      setFilter("sortOrder", filters.sortOrder === "A" ? "D" : "A");
    } else {
      setFilter("sortColumn", col);
      setFilter("sortOrder", "D");
    }
  };

  const SortIcon = ({ col }) => {
    if (filters.sortColumn !== col)
      return <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-30" />;
    return filters.sortOrder === "A"
      ? <ArrowUp   className="inline w-3 h-3 ml-1 text-blue-500" />
      : <ArrowDown className="inline w-3 h-3 ml-1 text-blue-500" />;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 w-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="border-l-2 border-blue-500 pl-4">
          <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
            <span className="font-semibold">{t("att_attendance")}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">{t("att_overview")}</p>
        </div>
        <img src={attendanceImage} alt="attendance" className="w-32 h-24 object-contain" />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <EmpFilter
          locations={locations}
          departments={departments}
          monthValue={filters.date}
          locationValue={filters.locationId}
          departmentValue={filters.departmentId}
          onMonthChange={(v)      => setFilter("date",         Number(v))}
          onLocationChange={(v)   => setFilter("locationId",   v)}
          onDepartmentChange={(v) => setFilter("departmentId", v)}
        />
        <Button
          className="rounded-xl bg-blue-500 hover:bg-blue-600 px-5 text-xs font-semibold shadow-sm h-9"
          onClick={exportAttendance}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          {t("att_export_excel")}
        </Button>
      </div>

      {/* Show entries + Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
          {t("show")}
          <select
            value={filters.limit}
            onChange={(e) => setFilter("limit", Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1 text-[13px] focus:outline-none"
          >
            {[10, 25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {t("entries")}
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t("search")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-50 text-slate-700 border-b border-slate-200">

                {/* Sortable fixed columns */}
                {SORT_COLS.map(({ key, label, minW }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-3 py-2.5 text-left font-semibold whitespace-nowrap cursor-pointer select-none ${minW} ${key === "name" ? "sticky left-0 z-20 bg-blue-50" : ""}`}
                  >
                    {label} <SortIcon col={key} />
                  </th>
                ))}

                {/* Non-sortable fixed columns */}
                <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{t("att_shift")}</th>
                <th
                  onClick={() => handleSort("emp_code")}
                  className="px-3 py-2.5 text-left font-semibold whitespace-nowrap cursor-pointer select-none min-w-[90px]"
                >
                  {t("att_emp_code")} <SortIcon col="emp_code" />
                </th>

                {/* Day columns — dynamically generated for selected month */}
                {daysInMonth.map(({ day, abbr }) => (
                  <th key={day} className="px-1.5 py-2.5 text-center font-semibold whitespace-nowrap min-w-[34px]">
                    {day}
                    <br />
                    <span className="font-normal text-[9px] text-slate-500">{abbr}</span>
                  </th>
                ))}

                {/* Summary columns P L H A O D EL */}
                {SUMMARY_COLS.map(({ key, label, title }) => (
                  <th key={key} title={title} className="px-2 py-2.5 text-center font-semibold whitespace-nowrap min-w-[28px] text-blue-600">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5 + daysInMonth.length + SUMMARY_COLS.length} className="py-14 text-center">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan={5 + daysInMonth.length + SUMMARY_COLS.length} className="py-12 text-center text-slate-400">
                    {t("att_no_data")}
                  </td>
                </tr>
              ) : (
                attendance.map((row, idx) => {
                  // Laravel uses first_name + last_name; fall back to full_name for compatibility
                  const fullName = (row.first_name || row.last_name)
                    ? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim()
                    : row.full_name || "-";
                  const initials = fullName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={row.id ?? idx} className="hover:bg-slate-50/60 transition-colors">

                      {/* Employee Name — sticky */}
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 whitespace-nowrap border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                            {initials}
                          </div>
                          <span className="text-slate-700 font-medium truncate max-w-[140px]">{fullName}</span>
                        </div>
                      </td>

                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.location || "-"}</td>
                      {/* Laravel stores as "departament" (typo) — handle both */}
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.department ?? row.departament ?? "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.shift ?? "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.emp_code ?? "-"}</td>

                      {/* Day cells — exactly mirrors the jQuery $.each(data.date) logic */}
                      {typeof row.date === "object" && row.date !== null
                        ? daysInMonth.map(({ day }) => {
                            const { status, title, cls } = renderDayStatus(row.date[day], t);
                            return (
                              <td key={day} title={title} className="px-1 py-2 text-center whitespace-nowrap">
                                {status !== "-" ? (
                                  <span className={`inline-block px-1 rounded text-[10px] font-semibold leading-4 ${cls}`}>
                                    {status}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })
                        : daysInMonth.map(({ day }) => (
                            <td key={day} className="px-1 py-2 text-center text-slate-300">-</td>
                          ))
                      }

                      {/* Summary totals */}
                      {SUMMARY_COLS.map(({ key }) => (
                        <td key={key} className="px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">
                          {row[key] ?? 0}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[13px] text-gray-500 font-medium">
            {t("timeclaim.showing")}{" "}
            <span className="font-bold text-gray-700">{empCount > 0 ? filters.skip + 1 : 0}</span>
            {" "}{t("to")}{" "}
            <span className="font-bold text-gray-700">{Math.min(filters.skip + filters.limit, empCount)}</span>
            {" "}{t("of")}{" "}
            <span className="font-bold text-blue-600">{empCount}</span> {t("entries")}
          </p>
          <PaginationComponent
            currentPage={Math.floor(filters.skip / filters.limit) + 1}
            totalPages={pageCount}
            onPageChange={(p) => setFilter("skip", (p - 1) * filters.limit)}
          />
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendance;
