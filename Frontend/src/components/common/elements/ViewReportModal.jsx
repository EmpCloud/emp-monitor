import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import PaginationComponent from "@/components/common/Pagination";
import { getWebAppActivityForEmployees } from "@/page/protected/admin/dashboard/service";

const formatDuration = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "00:00:00";
  const total = Math.floor(n);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const PAGE_SIZES = ["10", "25", "50", "100", "200"];

const col = (key, label, opts = {}) => ({ key, label, ...opts });

const COLUMNS = {
  employee_activity: [
    col("name", "Employee"),
    col("location", "Location"),
    col("department", "Department"),
    col("appName", "App / Website"),
    col("pro", "Productive", { className: "text-emerald-600 font-semibold", aliases: ["productive"] }),
    col("non", "Non-Productive", { className: "text-red-500 font-semibold", aliases: ["nonProductive"] }),
    col("neu", "Neutral", { className: "text-amber-500 font-semibold", aliases: ["neutral"] }),
    col("idle", "Idle", { className: "text-slate-500 font-semibold", aliases: ["idle_duration"] }),
  ],
  timesheet: [
    col("name", "Employee"),
    col("email", "Email", { aliases: ["a_email"] }),
    col("location", "Location", { aliases: ["location_name"] }),
    col("department", "Department", { aliases: ["department_name"] }),
    col("office_time", "Office Time", { className: "font-semibold", isDuration: true }),
    col("active_time", "Active Time", { className: "text-emerald-600 font-semibold", isDuration: true, aliases: ["computer_activities_time"] }),
    col("idle_time", "Idle Time", { className: "text-amber-500 font-semibold", isDuration: true, aliases: ["idle_duration"] }),
    col("productive_time", "Productive", { className: "text-blue-500 font-semibold", isDuration: true, aliases: ["productive_duration"] }),
  ],
  performance: [
    col("name", "Name"),
    col("hours", "Duration"),
    col("percentage", "Percentage", { className: "text-blue-500 font-semibold", isPercent: true }),
    col("count", "Employees"),
  ],
  web_app: [
    col("name", "Name"),
    col("value", "Usage %", { className: "text-blue-500 font-semibold", isPercent: true }),
  ],
};

// Name has multiple possible source fields
const NAME_FIELDS = ["full_name", "name", "first_name"];

const resolveValue = (row, colDef) => {
  // Special handling for name column
  if (colDef.key === "name") {
    for (const f of NAME_FIELDS) {
      if (row[f]) return row[f];
    }
    return "-";
  }

  // Try primary key, then aliases
  const keys = [colDef.key, ...(colDef.aliases || [])];
  let val;
  for (const k of keys) {
    if (row[k] != null) { val = row[k]; break; }
  }

  if (val == null) return "-";
  if (colDef.isDuration) return formatDuration(val);
  if (colDef.isPercent) {
    const n = Number(val);
    return Number.isFinite(n) ? `${n.toFixed(2)}%` : String(val);
  }
  // Duration columns in employee_activity mode (pro/non/neu/idle)
  if (colDef.className?.includes("font-semibold") && COLUMNS.employee_activity.some((c) => c.key === colDef.key)) {
    return formatDuration(val);
  }
  return val;
};

/**
 * @param {Object} props
 * @param {"employee_activity"|"timesheet"|"performance"|"web_app"} props.mode
 * @param {Array} props.employees - Employee list (IDs extracted for API fetch in employee_activity mode)
 * @param {Array} props.staticData - Pre-loaded data (for timesheet/performance/web_app modes)
 * @param {string} props.by - "today" | "yesterday" | "thisweek"
 */
const ViewReportModal = ({
  open,
  onOpenChange,
  title,
  mode = "employee_activity",
  employees = [],
  staticData,
  by = "today",
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!open) { setData([]); return; }

    // Static data modes
    if (staticData) {
      setData(Array.isArray(staticData) ? staticData : []);
      setSearch("");
      setPage(1);
      return;
    }

    // Employee activity mode — fetch from API
    if (mode === "employee_activity" && employees?.length) {
      const ids = employees.map((e) => e.id ?? e.employee_id ?? e.u_id).filter(Boolean);
      if (!ids.length) return;

      // Abort previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setSearch("");
      setPage(1);

      getWebAppActivityForEmployees({ employeeIds: ids, by }).then((res) => {
        if (!controller.signal.aborted) {
          setData(res.stats);
          setLoading(false);
        }
      });

      return () => controller.abort();
    }
  }, [open, employees, staticData, by, mode]);

  const columns = COLUMNS[mode] || COLUMNS.employee_activity;

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) => {
      const searchable = [
        r.full_name, r.name, r.first_name, r.location, r.location_name,
        r.department, r.department_name, r.appName, r.a_email, r.email,
      ].filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 border border-[#8F96FF]/45 [&>button]:text-white [&>button]:opacity-100 [&>button:hover]:bg-white/10 [&>button]:rounded-full">
        <div className="bg-linear-to-r from-[#7E8CF6] to-[#713FF7] px-6 py-5 rounded-t-lg border-b border-[#C8CFFF]/55">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white">
              {title || "View Report"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Show</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(parseInt(v, 10) || 10);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs rounded-lg border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-slate-500">entries</span>
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-9 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {columns.map((c) => (
                    <TableHead key={c.key} className={`text-xs font-semibold ${c.className || ""}`}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-slate-400">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-slate-400">
                      No data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={`text-xs ${row.status === 2 ? "bg-yellow-50" : ""}`}
                    >
                      {columns.map((c) => (
                        <TableCell key={c.key} className={c.className || ""}>
                          {resolveValue(row, c)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-2">
            <p className="text-[13px] text-gray-500 font-medium">
              Showing{" "}
              <span className="font-bold text-gray-700">
                {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-gray-700">
                {Math.min(currentPage * pageSize, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-blue-600">{filtered.length}</span>{" "}
              entries
            </p>
            <PaginationComponent
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewReportModal;
