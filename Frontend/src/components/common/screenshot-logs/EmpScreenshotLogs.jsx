import React from "react"
import { Search, Info, ImageIcon } from "lucide-react"
import PaginationComponent from "@/components/common/Pagination"
import CustomSelect from "@/components/common/elements/CustomSelect"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import EmpScreenshotLogsLogo from "@/assets/dlp/screenshot-logs.svg"
import { useScreenshotLogsStore } from "@/page/protected/admin/screenshot-logs/screenshotLogsStore"
import { useDlpFilters } from "@/hooks/useDlpFilters"
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar"

const DOWNLOAD_OPTIONS = [
  { label: "Select Option", value: "all" },
  { label: "PDF", value: "pdf" },
  { label: "Excel", value: "excel" },
]

const openScreenshotInNewTab = (base64Data) => {
  const newTab = window.open()
  if (newTab) {
    newTab.document.write(
      `<html><head><title>Screenshot</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9;}</style></head><body><img src="data:image/png;base64,${base64Data}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`
    )
    newTab.document.close()
  }
}

const EmpScreenshotLogs = () => {
  const store = useScreenshotLogsStore()
  const { rows, totalDocs, locations, departments, employees, filters, loading, tableLoading } = store

  const {
    search, setSearch, downloadOption, handleDateRangeChange,
    totalPages, currentPage,
    handleLocationChange, handleDepartmentChange, handleEmployeeChange,
    handlePageSizeChange, handlePageChange, handleDownload,
  } = useDlpFilters(store)

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-20 h-20 flex items-center justify-center">
          <video src="/src/assets/ai.webm" autoPlay loop playsInline muted className="w-full h-full object-contain" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
      {/* Header */}
      <div className="flex items-center gap-1 mb-7">
        <div className="flex items-end gap-1 mr-2">
          <img alt="screenshot-logs" className="w-24 h-24" src={EmpScreenshotLogsLogo} />
        </div>
        <div className="border-l-2 border-blue-500 pl-4">
          <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
            <span className="font-semibold">Screenshot </span> Logs
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
            Track and review screenshot capture activity across monitored systems.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
          <CustomSelect placeholder="All Locations" items={locations} selected={filters.locationId} onChange={handleLocationChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
          <CustomSelect placeholder="All Departments" items={departments} selected={filters.departmentId} onChange={handleDepartmentChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Employee</label>
          <CustomSelect placeholder="All Employees" items={employees} selected={filters.employeeId} onChange={handleEmployeeChange} />
        </div>
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1.5">
            Select Date Ranges :
            <Info className="w-3.5 h-3.5 text-blue-500" />
          </label>
          <div className="relative">
            <DateRangeCalendar
              startDate={filters.startDate}
              endDate={filters.endDate}
              onChange={handleDateRangeChange}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Download</label>
          <CustomSelect placeholder="Select Option" items={DOWNLOAD_OPTIONS} selected={downloadOption} onChange={handleDownload} />
        </div>
      </div>

      {/* Show entries + Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-gray-500 font-medium">Show</span>
          <Select value={String(filters.limit)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-16 text-[13px] rounded-lg border-gray-200">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {["10", "25", "50", "100"].map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[13px] text-gray-500 font-medium">Entries</span>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50">
        {/* Table Header */}
        <div className="grid grid-cols-12 bg-blue-50/80">
          <div className="col-span-2 px-4 py-3 text-xs font-semibold text-slate-700">Employee Name</div>
          <div className="col-span-2 px-4 py-3 text-xs font-semibold text-slate-700">Computer</div>
          <div className="col-span-1 px-4 py-3 text-xs font-semibold text-slate-700">Event Date</div>
          <div className="col-span-1 px-4 py-3 text-xs font-semibold text-slate-700">Event Time (hr)</div>
          <div className="col-span-6 px-4 py-3 text-xs font-semibold text-white bg-blue-500 rounded-tr-2xl">Screenshot</div>
        </div>

        {/* Rows */}
        {tableLoading ? (
          <div className="bg-white text-center text-sm text-gray-400 py-10">
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white text-center text-sm text-gray-400 py-10">No records found</div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={row._id}
              className={`grid grid-cols-12 bg-white ${idx !== rows.length - 1 ? "border-b border-slate-100" : ""}`}
            >
              <div className="col-span-2 px-4 py-6 flex items-start">
                <span className="text-xs font-medium text-slate-700">{row.fullName}</span>
              </div>
              <div className="col-span-2 px-4 py-6 flex items-start">
                <span className="text-xs text-slate-600">{row.computer}</span>
              </div>
              <div className="col-span-1 px-4 py-6 flex items-start">
                <span className="text-xs text-slate-600">{row.date}</span>
              </div>
              <div className="col-span-1 px-4 py-6 flex items-start">
                <span className="text-xs text-slate-600">{row.time}</span>
              </div>
              <div className="col-span-6 px-4 py-4">
                {row.screenshot ? (
                  <img
                    src={`data:image/png;base64,${row.screenshot}`}
                    alt="Screenshot"
                    onClick={() => openScreenshotInNewTab(row.screenshot)}
                    className="w-full max-h-48 rounded-xl border border-slate-200 object-contain bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-48 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-2">
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                    <span className="text-xs text-slate-400">No screenshot available</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5">
        <p className="text-[13px] text-gray-500 font-medium">
          Showing{" "}
          <span className="font-bold text-gray-700">{totalDocs === 0 ? 0 : (currentPage - 1) * filters.limit + 1}</span>{" "}
          to <span className="font-bold text-gray-700">{Math.min(currentPage * filters.limit, totalDocs)}</span>{" "}
          of <span className="font-bold text-blue-600">{totalDocs}</span>
        </p>
        <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>
    </div>
  )
}

export default EmpScreenshotLogs
