import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, FileSpreadsheet, X } from "lucide-react";
import PaginationComponent from "../Pagination";
import { fetchRemovedUsers } from "@/page/protected/admin/employee-details/service";
import DateRangeCalendar from "../elements/DateRangeCalendar";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const getDefaultDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

export default function DeletedUsersModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    const res = await fetchRemovedUsers({ startDate, endDate });
    setEmployees(res.employees);
    setCurrentPage(1);
    setLoading(false);
  }, [isOpen, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setCurrentPage(1);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) =>
      (emp.full_name || "").toLowerCase().includes(q) ||
      (emp.email || "").toLowerCase().includes(q) ||
      (emp.removed_admin_email || "").toLowerCase().includes(q) ||
      (emp.computer_name || "").toLowerCase().includes(q)
    );
  }, [employees, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleCSV = () => {
    if (!filtered.length) return;
    const headers = [t("emp_name"), t("emp_email_id"), t("emp_computer_name"), t("emp_deleted_by"), t("emp_deleted_at")];
    const rows = filtered.map((emp) => [
      emp.full_name || "-",
      emp.email || "-",
      emp.computer_name || "-",
      emp.removed_admin_email || "-",
      formatDate(emp.created_at),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deleted_users.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1100px] w-[95vw] p-0 gap-0 bg-white rounded-3xl overflow-hidden border-none shadow-2xl [&>button:last-child]:hidden">
        <div className="flex flex-col w-full max-h-[90vh] p-6 md:p-8 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{t("emp_deleted_user_history")}</h2>
              <p className="text-sm text-gray-400 mt-1">{t("emp_view_removed_history")}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="w-full h-px bg-gray-200 mb-4" />

          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="text-xs font-medium text-gray-500">{t("emp_select_date_range")} :</label>
            <DateRangeCalendar
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
              placeholder="Select date range"
            />
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t("show")}</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>{t("entries")}</span>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("search")}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50/50"
              />
            </div>
          </div>

          {/* Table */}
          <div className="w-full rounded-xl border border-gray-100 shadow-sm overflow-auto custom-scrollbar max-h-[340px]">
            <Table className="w-full min-w-[700px] text-sm text-center border-collapse">
              <TableHeader className="bg-rose-50 sticky top-0 z-10">
                <TableRow className="border-none">
                  <TableHead className="py-3 px-4 text-center font-semibold text-rose-700">{t("emp_name")}</TableHead>
                  <TableHead className="py-3 px-4 text-center font-semibold text-rose-700">{t("emp_email_id")}</TableHead>
                  <TableHead className="py-3 px-4 text-center font-semibold text-rose-700">{t("emp_computer_name")}</TableHead>
                  <TableHead className="py-3 px-4 text-center font-semibold text-rose-700">{t("emp_deleted_by")}</TableHead>
                  <TableHead className="py-3 px-4 text-center font-semibold text-rose-700">{t("emp_deleted_at")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-gray-400">{t("emp_loading")}</TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-gray-400">{t("emp_no_deleted_users")}</TableCell>
                  </TableRow>
                ) : pageRows.map((emp, idx) => (
                  <TableRow key={emp.id ?? idx} className="border-b border-dashed border-gray-200 last:border-0 hover:bg-rose-50/30 transition-colors">
                    <TableCell className="py-3 px-4 font-medium text-gray-700">{emp.full_name || "-"}</TableCell>
                    <TableCell className="py-3 px-4 text-gray-600 max-w-[200px] truncate" title={emp.email}>{emp.email || "-"}</TableCell>
                    <TableCell className="py-3 px-4 text-gray-600">{emp.computer_name === "null" ? "-" : (emp.computer_name || "-")}</TableCell>
                    <TableCell className="py-3 px-4 text-gray-600">{emp.removed_admin_email || "-"}</TableCell>
                    <TableCell className="py-3 px-4 text-gray-600">{formatDate(emp.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="w-full h-px bg-gray-200 mt-2 mb-4" />

          {/* Pagination + Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
            <span className="text-sm text-gray-500 font-medium">
              {t("emp_showing")} {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} {t("to")}{" "}
              {Math.min(safePage * pageSize, filtered.length)} {t("of")} {filtered.length}
            </span>
            <PaginationComponent currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleCSV}
              disabled={!filtered.length}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" /> {t("emp_generate_csv")}
            </button>
            <button
              onClick={onClose}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
