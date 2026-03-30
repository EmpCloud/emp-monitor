import React, { useMemo, useState } from "react"
import { Download, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PaginationComponent from "@/components/common/Pagination"
import NotificationFilter from "@/components/common/emplyee-notification/NotificationFilter"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const LOCATIONS = [
  { label: "Select Location", value: "all" },
  { label: "default", value: "default" },
]

const DEPARTMENTS = [
  { label: "Select Department", value: "all" },
  { label: "Default", value: "default" },
]

const EMPLOYEES = [
  { label: "Select Employee", value: "all" },
  { label: "Rupes Dhru", value: "rupes" },
  { label: "Rakshaa R", value: "raksha" },
  { label: "Harish VS", value: "harish" },
]

const DATE_RANGES = [
  { label: "January 16, 2026 - January 22, 2026", value: "week-1" },
]

const PAGE_SIZES = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
]

const MOCK_ROWS = [
  "Rupes Dhru",
  "Rakshaa R",
  "GBSBHL37Z-PC - GBS...",
  "Harish VS",
].map((name, idx) => ({
  id: idx + 1,
  name,
  avatarColor: ["bg-blue-500", "bg-cyan-500", "bg-sky-500", "bg-amber-500"][idx % 4],
  location: "default",
  department: "Default",
  shift: "New Nightshift",
  code: "Rgergerg",
  day1: idx === 0 ? "A" : "-",
  day2: idx === 0 ? "B" : "-",
  present: 0,
  late: 0,
}))

const initialsFromName = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

const EmpNotification = () => {
  const [location, setLocation] = useState("all")
  const [department, setDepartment] = useState("all")
  const [employee, setEmployee] = useState("all")
  const [dateRange, setDateRange] = useState("week-1")
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const perPage = Number(entriesPerPage) || 10

  const { filtered, paginated, totalPages } = useMemo(() => {
    const employeeLabel =
      employee === "all"
        ? null
        : EMPLOYEES.find((e) => e.value === employee)?.label ?? null

    const filteredList = MOCK_ROWS.filter((row) => {
      if (search && !row.name.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (location !== "all" && row.location !== location) return false
      if (department !== "all" && row.department !== "Default") return false
      if (employeeLabel && row.name !== employeeLabel) return false
      return true
    })

    const total = Math.max(1, Math.ceil(filteredList.length / perPage))
    const safePage = Math.min(Math.max(1, currentPage), total)
    const start = (safePage - 1) * perPage
    const end = safePage * perPage

    return {
      filtered: filteredList,
      paginated: filteredList.slice(start, end),
      totalPages: total,
    }
  }, [search, location, department, employee, currentPage, perPage])

  const handleExport = () => {
    // eslint-disable-next-line no-alert
    alert("Download Report coming soon")
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="border-l-2 border-blue-500 pl-4">
          <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
            <span className="font-semibold">Notifications</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
            &quot;Lorem ipsum quia dolor sit porro quisquam est qui amet
            consectetur adipisci&quot;
          </p>
        </div>
        <div className="flex items-end">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-amber-100/70" />
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              1
            </div>
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-amber-300" />
          </div>
        </div>
      </div>

      {/* Filters + show entries (like attendance with a dedicated filter component) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <NotificationFilter
          locations={LOCATIONS}
          departments={DEPARTMENTS}
          employees={EMPLOYEES}
          dateRanges={DATE_RANGES}
          pageSizeItems={PAGE_SIZES}
          locationValue={location}
          departmentValue={department}
          employeeValue={employee}
          dateRangeValue={dateRange}
          pageSizeValue={entriesPerPage}
          onLocationChange={(v) => {
            setLocation(v)
            setCurrentPage(1)
          }}
          onDepartmentChange={(v) => {
            setDepartment(v)
            setCurrentPage(1)
          }}
          onEmployeeChange={(v) => {
            setEmployee(v)
            setCurrentPage(1)
          }}
          onDateRangeChange={(v) => {
            setDateRange(v)
            setCurrentPage(1)
          }}
          onPageSizeChange={(v) => {
            setEntriesPerPage(String(v))
            setCurrentPage(1)
          }}
        />

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-blue-50/80">
              <TableHead className="text-xs font-semibold text-slate-700">
                Employee Name
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Location
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Department
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Shift
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Employee Code
              </TableHead>
              <TableHead className="text-xs font-semibold text-white text-center bg-blue-300">
                1 Thursday
              </TableHead>
              <TableHead className="text-xs font-semibold text-white text-center bg-blue-400">
                2 Friday
              </TableHead>
              <TableHead className="text-xs font-semibold text-white text-center bg-blue-600">
                P
              </TableHead>
              <TableHead className="text-xs font-semibold text-white text-center bg-blue-800">
                L
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {paginated.map((row) => (
              <TableRow key={row.id} className="text-xs text-slate-600">
                <TableCell>
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full ${row.avatarColor} flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0`}
                    >
                      {initialsFromName(row.name)}
                    </div>
                    <span className="truncate max-w-[170px]">{row.name}</span>
                  </div>
                </TableCell>
                <TableCell>{row.location}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>{row.shift}</TableCell>
                <TableCell>{row.code}</TableCell>
                <TableCell className="text-center">{row.day1}</TableCell>
                <TableCell className="text-center">{row.day2}</TableCell>
                <TableCell className="text-center">{row.present}</TableCell>
                <TableCell className="text-center">{row.late}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
        <p className="text-xs text-slate-500">
          Showing{" "}
          {filtered.length === 0
            ? 0
            : (Math.min(filtered.length, perPage) * (currentPage - 1) + 1)}
          {" "}to{" "}
          {Math.min(filtered.length, currentPage * perPage)} of{" "}
          {filtered.length} entries
        </p>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

   
    </div>
  )
}

export default EmpNotification