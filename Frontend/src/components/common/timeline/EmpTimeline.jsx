import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  FileSpreadsheet,
  Calendar,
  Info,
  ArrowRight,
  Rocket,
  CircleUser,
} from "lucide-react";
import EmpTimelineLogo from "@/assets/timeline/timeline.svg";
import { Input } from "@/components/ui/input";

// ─── Sample Data ───────────────────────────────────────────────────────────────
const generateEmployees = () => {
  const names = [
    { full: "user12 user12", email: "robinsingh123@gmail.com", emp: "abdc" },
    { full: "user21 user21", email: "robinsingh123@gmail.com", emp: "abdc" },
    { full: "user1 user1", email: "robinsingh123@gmail.com", emp: "abdc" },
    { full: "vinod vinod", email: "robinsingh123@gmail.com", emp: "abdc" },
    { full: "mihir mihir", email: "robinsingh123@gmail.com", emp: "abdc" },
    { full: "bipasha bipasha", email: "robinsingh123@gmail.com", emp: "abdc" },
    { full: "user30 user30", email: "robinsingh123@gmail.com", emp: "abdc" },
    { full: "user29 user29", email: "robinsingh123@gmail.com", emp: "abdc" },
    { full: "user27 user27", email: "robinsingh123@gmail.com", emp: "abdc" },
    { full: "user25 user25", email: "robinsingh123@gmail.com", emp: "abdc" },
  ];
  return names.map((n, i) => ({
    id: i + 1,
    fullName: n.full,
    emailId: n.email,
    empCode: n.emp,
    department: "Default",
    clockIn: "29-01-2026 / 10:31:03",
    clockOut: "29-01-2026 / 10:31:03",
    officeHours: "01:21:14",
    activeHours: "01:21:14",
    productive: `00:29:4${i}`,
  }));
};

const allEmployees = [
  ...generateEmployees(),
  ...Array.from({ length: 32 }, (_, i) => ({
    id: i + 11,
    fullName: `user${i + 31} user${i + 31}`,
    emailId: "robinsingh123@gmail.com",
    empCode: "abdc",
    department: "Default",
    clockIn: "29-01-2026 / 10:31:03",
    clockOut: "29-01-2026 / 10:31:03",
    officeHours: "01:21:14",
    activeHours: "01:21:14",
    productive: `00:25:4${i % 10}`,
  })),
];

// ─── Custom Select Component (shadcn-style) ────────────────────────────────────
const CustomSelect = ({ placeholder, options = [], value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                {opt}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function EmpTimeline() {
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [employee, setEmployee] = useState("");
  const [shift, setShift] = useState("");

  const filtered = useMemo(() => {
    return allEmployees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.emailId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.empCode.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const totalPages = Math.ceil(filtered.length / entriesPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage,
  );

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= Math.min(totalPages, 3); i++) pages.push(i);
    return pages;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
      <div className="">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          {/* Logo + Title */}
          <div className="flex items-center gap-3 border-l-2 border-blue-500 pl-4">
            <div className="relative">
              <div className="flex items-center gap-2 ">

              <h1 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                <span className="font-semibold">Timeline</span>
              </h1>
              <div className="flex items-end gap-1 mr-2">
                <img
                  alt="timesheet"
                  className="min-h-12"
                  src={EmpTimelineLogo}
                  />
              </div>
                  </div>
              <p className="text-[10px] text-gray-400 mt-1 leading-tight max-w-[220px]">
                *Lorem ipsum quia dolor sit porro quisquam est qui amet
                consectetur adipisci
              </p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button className="flex cursor-pointer items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 bg-[#2598EB] hover:bg-[#2598EB]">
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </button>
            <button className="flex cursor-pointer items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 bg-[#8D85FF] hover:bg-[#8D85FF]/90">
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        {/* ── Filters Row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-0.5">
              Location
            </label>
            <CustomSelect
              placeholder="Select Location"
              options={["Location A", "Location B", "Location C"]}
              value={location}
              onChange={setLocation}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-0.5">
              Department
            </label>
            <CustomSelect
              placeholder="Select Department"
              options={["Engineering", "Design", "Marketing", "HR"]}
              value={department}
              onChange={setDepartment}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-0.5">
              Employee
            </label>
            <CustomSelect
              placeholder="Select Employee"
              options={[
                "user12 user12",
                "user21 user21",
                "vinod vinod",
                "mihir mihir",
              ]}
              value={employee}
              onChange={setEmployee}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-0.5">
              Shift
            </label>
            <CustomSelect
              placeholder="Select Shift"
              options={["Morning", "Evening", "Night"]}
              value={shift}
              onChange={setShift}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-0.5">
              Select Date Ranges :{" "}
              <Info className="w-3 h-3 inline text-blue-500" />
            </label>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 text-xs">
                January 16, 2026 - January 22, 2026
              </span>
              <svg
                className="w-4 h-4 text-gray-400 ml-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Show Entries + Search ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-7 gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>Entries</span>
          </div>

          <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search"
            className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-red-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-[#5C6BC0] via-[#5C6BC0] to-[#2598EB] rounded-xl">
                  <th className="text-left px-4 py-3 font-semibold text-white text-xs whitespace-nowrap first:rounded-l-xl">
                    Full Name
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-white text-xs whitespace-nowrap">
                    Email id
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-white text-xs whitespace-nowrap">
                    Emp-Code
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-white text-xs whitespace-nowrap">
                    Department
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-xs whitespace-nowrap">
                    <span className="inline-block px-4 py-1 rounded-full text-white text-xs font-semibold bg-[#4CAF50]">
                      Clock In
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-xs whitespace-nowrap">
                    <span className="inline-block px-4 py-1 rounded-full text-white text-xs font-semibold bg-[#EF5350]">
                      Clock Out
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-white text-xs whitespace-nowrap">
                    Office Hours
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-white text-xs whitespace-nowrap">
                    Active Hours
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-xs whitespace-nowrap last:rounded-r-xl bg-[#2598EB]">
                    <span className="text-white font-bold">Productive</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((emp, idx) => {
                  const avatarColors = [
                    "from-orange-400 to-orange-500",
                    "from-blue-400 to-blue-500",
                    "from-red-400 to-red-500",
                    "from-purple-400 to-purple-500",
                    "from-teal-400 to-teal-500",
                    "from-indigo-400 to-indigo-500",
                    "from-pink-400 to-pink-500",
                    "from-emerald-400 to-emerald-500",
                    "from-amber-400 to-amber-500",
                    "from-cyan-400 to-cyan-500",
                  ];
                  const avatarColor = avatarColors[idx % avatarColors.length];
                  return (
                  <tr
                    key={emp.id}
                    className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center shrink-0`}>
                          <CircleUser className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-700 text-xs font-medium">
                          {emp.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                      {emp.emailId}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 text-xs font-medium whitespace-nowrap">
                      {emp.empCode}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                      {emp.department}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs text-center whitespace-nowrap">
                      {emp.clockIn}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs text-center whitespace-nowrap">
                      {emp.clockOut}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs text-center whitespace-nowrap">
                      {emp.officeHours}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs text-center whitespace-nowrap">
                      {emp.activeHours}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#EBF3FE]">
                      <span className="text-[#4CAF50] text-xs font-semibold">
                        {emp.productive}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom accent line */}
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </div>

        {/* ── Pagination ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-3">
          <p className="text-xs text-gray-500">
            Showing {(currentPage - 1) * entriesPerPage + 1} to{" "}
            {Math.min(currentPage * entriesPerPage, filtered.length)} of{" "}
            {filtered.length}
          </p>

          <div className="flex items-center gap-1.5">
            {/* Prev */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {getPageNumbers().map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                  currentPage === num
                    ? "bg-[#5C6BC0] text-white shadow-md shadow-indigo-200"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {num}
              </button>
            ))}

            {/* Next */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
