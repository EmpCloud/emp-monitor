import React, { useMemo, useState } from "react"
import { Download, Search, Info, Printer } from "lucide-react"
import PaginationComponent from "@/components/common/Pagination"
import CustomSelect from "@/components/common/elements/CustomSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import EmpPrintLogsLogo from "@/assets/dlp/print-logs.svg";

const LOCATIONS = [
  { label: "See All Location", value: "all" },
  { label: "Bangalore", value: "bangalore" },
  { label: "Mumbai", value: "mumbai" },
]

const DEPARTMENTS = [
  { label: "See All Department", value: "all" },
  { label: "Developer", value: "developer" },
  { label: "Testing", value: "testing" },
]

const EMPLOYEES = [
  { label: "See All Employee", value: "all" },
  { label: "Amir Khan", value: "amir" },
  { label: "Robin Singh", value: "robin" },
]

const DATE_RANGES = [
  { label: "January 27, 2026 - February 2, 2026", value: "jan-27-feb-2" },
  { label: "February 3, 2026 - February 9, 2026", value: "feb-3-9" },
]

const MOCK_ROWS = [
  {
    id: 1,
    employeeName: "Amir Khan",
    computer: "GLB-BLR-159-PC",
    eventDate: "2026-03-06",
    eventTime: "10:40:27",
    description: "Clipboard Data : qt_developers",
  },
  {
    id: 2,
    employeeName: "Amir Khan",
    computer: "GLB-BLR-159-PC",
    eventDate: "2026-03-06",
    eventTime: "10:40:27",
    description:
      "Clipboard Data : Searching browser processes.. Injecting into PID: 21932..........",
  },
  {
    id: 3,
    employeeName: "Amir Khan",
    computer: "GLB-BLR-159-PC",
    eventDate: "2026-03-06",
    eventTime: "10:40:27",
    description:
      "Clipboard Data : Searching browser processes.. Injecting into PID: 21932..........",
  },
  {
    id: 4,
    employeeName: "Amir Khan",
    computer: "GLB-BLR-159-PC",
    eventDate: "2026-03-06",
    eventTime: "10:40:27",
    description:
      "Clipboard Data : Searching browser processes.. Injecting into PID: 21932..........",
  },
  {
    id: 5,
    employeeName: "Amir Khan",
    computer: "GLB-BLR-159-PC",
    eventDate: "2026-03-06",
    eventTime: "10:40:27",
    description:
      "Clipboard Data : Searching browser processes.. Injecting into PID: 21932..........",
  },
]

const EmpPrintLogs = () => {
  const [location, setLocation] = useState("all")
  const [department, setDepartment] = useState("all")
  const [employee, setEmployee] = useState("all")
  const [dateRange, setDateRange] = useState(DATE_RANGES[0].value)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const filteredRows = useMemo(() => {
    return MOCK_ROWS.filter((row) => {
      if (
        search &&
        !row.employeeName.toLowerCase().includes(search.toLowerCase())
      )
        return false
      return true
    })
  }, [search])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-1">
          <div className="flex items-end gap-1 mr-2">
            <img
              alt="timesheet"
              className="w-24 h-24"
              src={EmpPrintLogsLogo}
            />
          </div>

          <div className="border-l-2 border-blue-500 pl-4">
            <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
              <span className="font-semibold">Print</span>{" "}
              <span className="font-normal text-gray-500">Logs</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
              &quot;Lorem ipsum quia dolor sit porro quisquam est qui amet
              consectetur adipisci&quot;
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <CustomSelect
            placeholder="Select Date Range"
            items={DATE_RANGES}
            selected={dateRange}
            onChange={(v) => {
              setDateRange(v)
              setPage(1)
            }}
            width="full"
          />
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
        </div>
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 flex-1 min-w-0">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Location
            </label>
            <CustomSelect
              placeholder="See All Location"
              items={LOCATIONS}
              selected={location}
              onChange={(v) => {
                setLocation(v)
                setPage(1)
              }}
              width="full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Department
            </label>
            <CustomSelect
              placeholder="See All Department"
              items={DEPARTMENTS}
              selected={department}
              onChange={(v) => {
                setDepartment(v)
                setPage(1)
              }}
              width="full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Employee
            </label>
            <CustomSelect
              placeholder="See All Employee"
              items={EMPLOYEES}
              selected={employee}
              onChange={(v) => {
                setEmployee(v)
                setPage(1)
              }}
              width="full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="lg"
            className="rounded-xl bg-blue-500 hover:bg-blue-600 px-5 text-xs font-semibold shadow-sm"
          >
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button
            size="lg"
            className="rounded-xl bg-violet-500 hover:bg-violet-600 px-5 text-xs font-semibold shadow-sm"
          >
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Show entries + Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-gray-500 font-medium">Show</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              const num = parseInt(v, 10)
              setPageSize(Number.isNaN(num) ? 10 : num)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-16 text-[13px] rounded-lg border-gray-200">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {["10", "25", "50", "100"].map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[13px] text-gray-500 font-medium">
            Entries
          </span>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
        <Table className="min-w-[850px] w-full">
          <TableHeader>
            <TableRow className="bg-blue-50/80">
              <TableHead className="text-xs font-semibold text-slate-700">
                Employee Name
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Computer
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Event Date
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Event Time (hr)
              </TableHead>
              <TableHead className="text-xs font-semibold text-white bg-blue-500">
                Description
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-sm text-gray-400 py-10"
                >
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={row.id} className="text-xs text-slate-600">
                  <TableCell className="font-medium">{row.employeeName}</TableCell>
                  <TableCell>{row.computer}</TableCell>
                  <TableCell>{row.eventDate}</TableCell>
                  <TableCell>{row.eventTime}</TableCell>
                  <TableCell className="truncate max-w-[350px]">
                    {row.description}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5">
        <p className="text-[13px] text-gray-500 font-medium">
          Showing{" "}
          <span className="font-bold text-gray-700">
            {filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-bold text-gray-700">
            {Math.min(currentPage * pageSize, filteredRows.length)}
          </span>{" "}
          of{" "}
          <span className="font-bold text-blue-600">
            {filteredRows.length}
          </span>
        </p>
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  )
}

export default EmpPrintLogs
