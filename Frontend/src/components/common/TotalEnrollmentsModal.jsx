import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, FileSpreadsheet } from "lucide-react";
import PaginationComponent from "./Pagination";
import clip from "@/assets/clipboard.png";

const getEmployeeName = (emp) => {
  const first = emp?.first_name ?? emp?.firstName ?? "";
  const last = emp?.last_name ?? emp?.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || emp?.name || emp?.employee_name || emp?.employeeName || "-";
};

const getEmployeeEmail = (emp) =>
  emp?.a_email ?? emp?.email ?? emp?.employee_email ?? "-";

const getEmployeeCode = (emp) =>
  emp?.emp_code ?? emp?.empCode ?? emp?.employee_code ?? emp?.employeeCode ?? "-";

const getEmployeeDepartment = (emp) =>
  emp?.department ?? emp?.department_name ?? emp?.dept_name ?? emp?.deptName ?? "-";

const getEmployeeLocation = (emp) =>
  emp?.location ?? emp?.location_name ?? emp?.loc_name ?? emp?.locName ?? "-";

export default function TotalEnrollmentsModal({
  isOpen,
  onClose,
  title = "Employees",
  employees = [],
  loading = false,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const getEmployeeId = (emp) =>
    emp?.id ?? emp?.u_id ?? emp?.employee_id ?? emp?.employeeId ?? emp?._id;

  const handleEmployeeClick = (emp) => {
    const empId = getEmployeeId(emp);
    if (!empId) return;
    onClose();
    navigate(`/admin/get-employee-details?id=${empId}`, {
      state: {
        employee: {
          id: empId,
          name: getEmployeeName(emp),
          email: getEmployeeEmail(emp),
          empCode: getEmployeeCode(emp),
          department: getEmployeeDepartment(emp),
          location: getEmployeeLocation(emp),
          role: emp?.role || "Employee",
          shift: emp?.shift_name || "-",
          os: emp?.system_architecture || "Windows",
          computer: emp?.computer_name || emp?.username || "N/A",
          version: emp?.software_version || "N/A",
        },
      },
    });
  };

  const handleGenerateCSV = () => {
    const list = Array.isArray(employees) ? employees : [];
    if (list.length === 0) return;

    const headers = ["Name", "Email", "EMP Code", "Department", "Location"];
    const rows = list.map((emp) => [
      getEmployeeName(emp),
      getEmployeeEmail(emp),
      getEmployeeCode(emp),
      getEmployeeDepartment(emp),
      getEmployeeLocation(emp),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}_employees.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    const list = Array.isArray(employees) ? employees : [];
    if (!q) return list;

    return list.filter((emp) => {
      const name = getEmployeeName(emp).toLowerCase();
      const email = String(getEmployeeEmail(emp)).toLowerCase();
      const code = String(getEmployeeCode(emp)).toLowerCase();
      const dept = String(getEmployeeDepartment(emp)).toLowerCase();
      const loc = String(getEmployeeLocation(emp)).toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        code.includes(q) ||
        dept.includes(q) ||
        loc.includes(q)
      );
    });
  }, [employees, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1300px] w-[95vw] p-0 gap-0 bg-white rounded-3xl overflow-hidden border-none shadow-2xl">
        <div className="flex flex-col w-full max-h-[90vh] p-6 md:p-10 overflow-auto ">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-8 relative">
            <div className="flex flex-col gap-2 relative z-10 w-2/3">
              <h2 className="text-2xl font-bold text-[#1A202C]">
                {title}
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
                {t("enrollments.description")}
              </p>
            </div>

            <div className="absolute right-0 top-[-20px] w-28 h-28 hidden sm:block z-0 opacity-90">
              {/* Fallback illustration using simple CSS shapes if image isn't available, but we will try to load a placeholder */}
              <img
                src={clip}
                alt="Clipboard illustration"
                className="w-full h-full object-contain drop-shadow-md"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          </div>

          <div className="w-full h-px bg-gray-200 mb-6"></div>

          {/* Controls Section */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t("show")}</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none border border-gray-200 rounded-md px-3 py-1.5 pr-8 bg-white text-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 1L5 5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <span>{t("entries")}</span>
            </div>

            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t("search")}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50/50"
              />
            </div>
          </div>

          {/* Table Section — single scroll container so header + body move together */}
          <div className="w-full rounded-xl border border-gray-100 shadow-sm overflow-auto custom-scrollbar max-h-[340px]">
            <Table className="w-full min-w-[700px] text-sm text-center border-collapse">
              <TableHeader className="bg-[#b3d1ff] text-[#2B3674] sticky top-0 z-10">
                <TableRow className="border-none">
                  <TableHead className="py-3.5 px-5 text-center font-semibold text-[#2B3674] w-[22%]">
                    {t("name")}
                  </TableHead>
                  <TableHead className="py-3.5 px-5 text-center font-semibold text-[#2B3674] w-[22%]">
                    {t("emailid")}
                  </TableHead>
                  <TableHead className="py-3.5 px-5 text-center font-semibold text-[#2B3674] w-[14%]">
                    {t("enrollments.empCode")}
                  </TableHead>
                  <TableHead className="py-3.5 px-5 text-center font-semibold text-[#2B3674] w-[16%]">
                    {t("department")}
                  </TableHead>
                  <TableHead className="py-3.5 px-5 text-center font-semibold text-[#2B3674] w-[14%]">
                    {t("location")}
                  </TableHead>
                  <TableHead className="py-3.5 px-5 text-center font-semibold text-[#2B3674] w-[12%]">
                    {t("status")}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                      {t("loadingText")}
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                      {t("Nodata")}
                    </TableCell>
                  </TableRow>
                ) : pageRows.map((row, idx) => (
                  <TableRow
                    key={
                      row?.id ??
                      row?.employee_id ??
                      row?.employeeId ??
                      row?._id ??
                      `${getEmployeeName(row)}-${idx}`
                    }
                    className="border-b border-dashed border-gray-200 last:border-0 hover:bg-blue-50/30 transition-colors"
                  >
                    <TableCell className="py-3.5 px-5 w-[22%]">
                      <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => handleEmployeeClick(row)}
                      >
                        <img
                          src={
                            row?.avatar ??
                            row?.profile_image ??
                            "https://api.dicebear.com/7.x/adventurer/svg?seed=emp"
                          }
                          alt={getEmployeeName(row)}
                          className="w-8 h-8 rounded-full border border-gray-200 object-cover bg-white shrink-0"
                        />
                        <span className="font-medium text-gray-700 whitespace-nowrap group-hover:text-blue-600 group-hover:underline transition-colors">
                          {getEmployeeName(row)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-5 text-gray-600 w-[22%]">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-200 select-none">|</span>
                        <span className="whitespace-nowrap">{getEmployeeEmail(row)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-5 text-gray-600 w-[14%]">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-200 select-none">|</span>
                        <span className="whitespace-nowrap">{getEmployeeCode(row)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-5 text-gray-600 w-[16%]">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-200 select-none">|</span>
                        <span className="whitespace-nowrap">
                          {getEmployeeDepartment(row)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-5 text-gray-600 w-[14%]">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-200 select-none">|</span>
                        <span className="whitespace-nowrap">
                          {getEmployeeLocation(row)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-5 w-[12%]">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-200 select-none">|</span>
                        <div
                          className="w-4 h-4 rounded-full bg-slate-300 shadow-sm border border-black/5 shrink-0"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="w-full h-px bg-gray-200 mt-2 mb-6 border-dashed border-t border-gray-300"></div>

          {/* Pagination Row */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <span className="text-sm text-gray-500 font-medium">
              {t("timeclaim.showing")} {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} {t("to")}{" "}
              {Math.min(safePage * pageSize, filtered.length)} {t("of")} {filtered.length}
            </span>
            <PaginationComponent
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>

          <div className="w-full h-px bg-gray-200 mb-6"></div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 mt-auto">
            <button
              onClick={handleGenerateCSV}
              disabled={!employees?.length}
              className="flex items-center gap-2 bg-[#0066ff] hover:bg-[#0052cc] text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t("enrollments.generateCsv")}
            </button>
            <button
              onClick={onClose}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
