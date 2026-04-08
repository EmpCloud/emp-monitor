import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next";
import {
  Search, Info, FileText, Printer, Download, ChevronUp, ChevronDown,
  Loader2, ArrowUpDown, X
} from "lucide-react"
import PaginationComponent from "@/components/common/Pagination"
import CustomSelect from "@/components/common/elements/CustomSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import ShowEntries from "@/components/common/elements/ShowEntries"
import EmpReportsDownloadLogo from "@/assets/reports/reports_download.svg"
import { useReportsDownloadStore } from "@/page/protected/admin/reports-download/reportsDownloadStore"
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar"
import { printSingleUserReport, exportReportPDF, CSV_COLUMN_OPTIONS, BROWSER_EXTRA_COLUMNS } from "@/page/protected/admin/reports-download/service"

// Default store hook — can be overridden by passing `useStore` prop
const _defaultStore = useReportsDownloadStore

const avatarColors = [
  "bg-blue-500", "bg-cyan-500", "bg-amber-500", "bg-rose-500", "bg-sky-500",
]

const getInitials = (name) =>
  (name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

// ─── Date Range Picker ─────────────────────────────────────────────

function DateRangePicker({ startDate, endDate, onDateRangeChange }) {
  return (
    <DateRangeCalendar
      startDate={startDate}
      endDate={endDate}
      onChange={(s, e) => {
        if (!s || !e) return
        onDateRangeChange(s, e)
      }}
    />
  )
}

// ─── CSV Column Selector Dropdown ──────────────────────────────────

function CSVColumnDropdown({ downloadOption, onSubmit, disabled, noOptionSelected, onNoOption }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(() =>
    CSV_COLUMN_OPTIONS.filter((c) => c.default).map((c) => c.value)
  )
  const dropdownRef = useRef(null)

  const allColumns = useMemo(() => {
    const base = [...CSV_COLUMN_OPTIONS]
    if (downloadOption === "2") return [...base, ...BROWSER_EXTRA_COLUMNS]
    if (downloadOption === "1") return [...base, { value: "application_used", label: "Application Used", default: false }]
    return base
  }, [downloadOption])

  const allChecked = selected.length === allColumns.filter((c) => !c.disabled).length

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // For Download All, auto-select everything and disable
  const isDownloadAll = downloadOption === "3"

  const toggleAll = () => {
    if (allChecked) setSelected(["employee_name"])
    else setSelected(allColumns.map((c) => c.value))
  }

  const toggleColumn = (val) => {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    )
  }

  const handleClick = () => {
    if (noOptionSelected) {
      onNoOption?.()
      return
    }
    setOpen(!open)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        size="lg"
        disabled={disabled}
        onClick={handleClick}
        className="rounded-xl bg-blue-500 hover:bg-blue-600 px-6 text-xs font-semibold shadow-sm"
      >
        {disabled ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating CSV...</>
        ) : (
          t("reportsDownload.generateCsv")
        )}
      </Button>

      {open && !disabled && !noOptionSelected && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg w-64 py-2 max-h-80 overflow-y-auto">
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 font-medium cursor-pointer hover:bg-blue-50">
            <input
              type="checkbox"
              checked={isDownloadAll || allChecked}
              disabled={isDownloadAll}
              onChange={toggleAll}
              className="accent-blue-500"
            />
            {t("rd_select_all")}
          </label>
          <hr className="my-1 border-slate-100" />
          {allColumns.map((col) => (
            <label
              key={col.value}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 cursor-pointer hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={isDownloadAll || selected.includes(col.value)}
                disabled={isDownloadAll || col.disabled}
                onChange={() => toggleColumn(col.value)}
                className="accent-blue-500"
              />
              {col.label}
            </label>
          ))}
          <hr className="my-1 border-slate-100" />
          <div className="px-3 py-1.5 text-center">
            <Button
              size="sm"
              onClick={() => {
                onSubmit(isDownloadAll ? allColumns.map((c) => c.value) : selected)
                setOpen(false)
              }}
              className="rounded-lg bg-blue-500 hover:bg-blue-600 text-xs px-6"
            >
              {t("rd_submit")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CSV Download Status ───────────────────────────────────────────

function CSVDownloadLinks({ csvStatus }) {
  const doneFiles = csvStatus.filter((f) => f.stage === "done")
  if (!doneFiles.length) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {doneFiles.map((file, idx) => {
        const isApp = file.download_link?.includes("application")
        const label = isApp ? "Application Used Report" : "Website Used Report"
        return (
          <a
            key={idx}
            href={file.download_link}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {label}
          </a>
        )
      })}
    </div>
  )
}

// ─── Sortable Header ───────────────────────────────────────────────

function SortableHeader({ label, sortKey, currentSort, currentOrder, onSort }) {
  const isActive = currentSort === sortKey
  return (
    <TableHead
      className="text-xs font-semibold text-slate-700 cursor-pointer select-none hover:bg-blue-100/50 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="inline-flex flex-col leading-none">
          {isActive ? (
            currentOrder === "asc" ? (
              <ChevronUp className="w-3 h-3 text-blue-500" />
            ) : (
              <ChevronDown className="w-3 h-3 text-blue-500" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-300" />
          )}
        </span>
      </div>
    </TableHead>
  )
}

// ─── Main Component ────────────────────────────────────────────────

const EmpReportsDownload = ({ useStore = _defaultStore }) => {
  const { t } = useTranslation();
  const {
    employees, totalCount, loading,
    roles, locations, departments, downloadOptions,
    csvStatus, csvGenerating,
    filters, selectedIds, pdfEligible,
    loadInitial, fetchEmployees,
    onRoleChange, onLocationChange, onDepartmentChange, onDateRangeChange,
    setFilter, setPage, setPageSize, onSearchChange, onSort,
    toggleRow, toggleAll,
    updatePdfEligibility,
    downloadPDF, downloadCSV,
  } = useStore()

  const [searchInput, setSearchInput] = useState("")
  const [toastMsg, setToastMsg] = useState(null)
  const searchTimerRef = useRef(null)

  // Load initial data
  useEffect(() => {
    loadInitial()
  }, [])

  // Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      onSearchChange(searchInput)
    }, 500)
    return () => clearTimeout(searchTimerRef.current)
  }, [searchInput])

  // Update PDF eligibility when download option changes
  useEffect(() => {
    updatePdfEligibility()
  }, [filters.downloadOption, selectedIds.length, totalCount])

  // Fetch employees when page/limit changes
  useEffect(() => {
    fetchEmployees()
  }, [filters.page, filters.limit])

  const showToast = useCallback((msg, type = "warning") => {
    setToastMsg({ msg, type })
    setTimeout(() => setToastMsg(null), 4000)
  }, [])

  // ─── Print single user report ────────────────────────────────

  const handlePrintDetails = useCallback(async (employeeId, employeeName) => {
    if (filters.downloadOption === "all") {
      showToast("Please select a download option first")
      return
    }

    // Download All (option 3) - not allowed for single print
    if (filters.downloadOption === "3") {
      showToast("'Download All' is not available for single user print. Please use Application Used or Browser History.")
      return
    }

    const res = await printSingleUserReport({
      employeeId,
      downloadOption: filters.downloadOption,
      startDate: filters.startDate,
      endDate: filters.endDate,
    })

    if (res.code === 200 && res.data) {
      const type = filters.downloadOption === "1" ? "application" : "browser"
      const hasData =
        type === "application"
          ? res.data.application_used?.length > 0
          : res.data.browser_history?.length > 0

      if (!hasData) {
        showToast(`No ${type === "application" ? "application" : "browser"} data found for ${employeeName}`)
        return
      }

      exportReportPDF(res.data, type, employeeName)
    } else {
      showToast(res.msg || "Failed to get report data")
    }
  }, [filters.downloadOption, filters.startDate, filters.endDate])

  // ─── PDF download ────────────────────────────────────────────

  const handleDownloadPDF = useCallback(async () => {
    const result = await downloadPDF()
    if (!result.success) showToast(result.msg)
  }, [downloadPDF])

  // ─── CSV download ────────────────────────────────────────────

  const handleGenerateCSV = useCallback(async (selectedColumns) => {
    if (totalCount === 0) {
      showToast("No data available to generate CSV. Please adjust your filters.")
      return
    }
    const result = await downloadCSV(selectedColumns)
    if (result.success) {
      showToast("CSV generation started. Files will appear shortly.", "success")
    } else {
      showToast(result.msg)
    }
  }, [downloadCSV, totalCount])

  // ─── Derived values ──────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(totalCount / filters.limit))
  const currentPage = Math.min(filters.page, totalPages)
  const showStart = totalCount === 0 ? 0 : (currentPage - 1) * filters.limit + 1
  const showEnd = Math.min(currentPage * filters.limit, totalCount)
  const pageIds = employees.map((e) => e.id)

  const doneFiles = csvStatus.filter((f) => f.stage === "done")

  return (
    <TooltipProvider>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-[999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all ${
            toastMsg.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {toastMsg.msg}
          <button onClick={() => setToastMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/70 z-[998] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-600 font-medium">
              {t("reportsDownload.generatingReport")}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="border-l-2 border-blue-500 pl-4">
          <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
            <span className="font-semibold">{t("reportsDownload.title")}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
            Download detailed employee reports including application usage,
            browser history, and productivity metrics.
          </p>
        </div>
        <div className="flex items-end gap-1 mr-2">
          <img alt="reports" className="w-42 h-32" src={EmpReportsDownloadLogo} />
        </div>
      </div>

      {/* Filters Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {t("rd_role")}
          </label>
          <CustomSelect
            placeholder="See All"
            items={roles}
            selected={filters.role}
            onChange={onRoleChange}
            width="full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {t("location")}
          </label>
          <CustomSelect
            placeholder="See All"
            items={locations}
            selected={filters.location}
            onChange={onLocationChange}
            width="full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {t("department")}
          </label>
          <CustomSelect
            placeholder="See All"
            items={departments}
            selected={filters.department}
            onChange={onDepartmentChange}
            width="full"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1.5">
            Select Date Ranges :
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-blue-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                {t("reportsDownload.maxDaysRange")}
              </TooltipContent>
            </Tooltip>
          </label>
          <DateRangePicker
            startDate={filters.startDate}
            endDate={filters.endDate}
            onDateRangeChange={onDateRangeChange}
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1.5">
            {t("rd_download_option")}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-blue-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                {t("reportsDownload.downloadOptionTooltip")}
              </TooltipContent>
            </Tooltip>
          </label>
          <CustomSelect
            placeholder="Select Option"
            items={downloadOptions}
            selected={filters.downloadOption}
            onChange={(v) => setFilter("downloadOption", v)}
            width="full"
          />
        </div>
      </div>

      {/* Filters Row 2 */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div className="w-full sm:w-auto sm:min-w-[280px]">
          <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1.5">
            {t("rd_search_web_app")}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-blue-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                {t("reportsDownload.searchWebAppTooltip")}
              </TooltipContent>
            </Tooltip>
          </label>
          <Input
            placeholder={t("reportsDownload.searchVisitedPlaceholder")}
            value={filters.searchWebApp}
            onChange={(e) => setFilter("searchWebApp", e.target.value)}
            className="h-10 rounded-lg border-slate-200 text-sm"
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* PDF Note & PDF Download Button */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              {t("rd_pdf_note")}
              <FileText className="w-4 h-4 text-slate-600" />
            </span>
            {pdfEligible && filters.downloadOption !== "all" && filters.downloadOption !== "3" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDownloadPDF}
                disabled={loading}
                className="rounded-lg text-xs font-semibold px-4 h-8 shadow-sm"
              >
                PDF
              </Button>
            )}
          </div>

          {/* CSV Download Links (for completed reports) */}
          {doneFiles.length > 0 && (
            <CSVDownloadLinks csvStatus={csvStatus} />
          )}

          {/* Generate CSV Button with column selector */}
          <CSVColumnDropdown
            downloadOption={filters.downloadOption}
            disabled={csvGenerating}
            noOptionSelected={filters.downloadOption === "all"}
            onSubmit={handleGenerateCSV}
            onNoOption={() => showToast("Please select a download option first")}
          />
        </div>
      </div>

      {/* Show entries + Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <ShowEntries value={filters.limit} onChange={(v) => {
              const num = parseInt(v, 10)
              setPageSize(Number.isNaN(num) ? 10 : num)
            }} />

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t("search")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
        <Table className="min-w-[1000px] w-full">
          <TableHeader>
            <TableRow className="bg-blue-50/80">
              <TableHead className="w-10">
                <Checkbox
                  checked={pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))}
                  onCheckedChange={() => toggleAll(pageIds)}
                  className="border-slate-300"
                />
              </TableHead>
              <SortableHeader
                label={t("rd_full_name")}
                sortKey="Full Name"
                currentSort={filters.sortName}
                currentOrder={filters.sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t("rd_email")}
                sortKey="Email"
                currentSort={filters.sortName}
                currentOrder={filters.sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t("location")}
                sortKey="Location"
                currentSort={filters.sortName}
                currentOrder={filters.sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t("department")}
                sortKey="Department"
                currentSort={filters.sortName}
                currentOrder={filters.sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label={t("rd_designation")}
                sortKey="Role"
                currentSort={filters.sortName}
                currentOrder={filters.sortOrder}
                onSort={onSort}
              />
              <TableHead className="text-xs font-semibold text-slate-700">
                {t("rd_computer_name")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-white bg-blue-500 text-center">
                {t("rd_view_reports")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-gray-400 py-10">
                  {loading ? t("loadingText") : t("Nodata")}
                </TableCell>
              </TableRow>
            ) : (
              employees.map((row, idx) => (
                <TableRow
                  key={row.id}
                  className={`text-xs ${
                    row.status === 1
                      ? "text-slate-600"
                      : "text-white bg-amber-600"
                  }`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onCheckedChange={() => toggleRow(row.id)}
                      className="border-slate-300"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full ${
                          avatarColors[idx % avatarColors.length]
                        } flex items-center justify-center text-[10px] font-semibold text-white shrink-0`}
                      >
                        {getInitials(row.name)}
                      </div>
                      <span className="truncate capitalize">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell className="capitalize">{row.location}</TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell>{row.designation}</TableCell>
                  <TableCell className="font-semibold text-slate-700">
                    {row.computerName}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      onClick={() => handlePrintDetails(row.id, row.name)}
                      className="rounded-lg bg-blue-500 hover:bg-blue-600 text-[10px] font-semibold px-4 h-7 shadow-sm gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      {t("rd_print")}
                    </Button>
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
          {t("timeclaim.showing")}{" "}
          <span className="font-bold text-gray-700">{showStart}</span> {t("to")}{" "}
          <span className="font-bold text-gray-700">{showEnd}</span> {t("of")}{" "}
          <span className="font-bold text-blue-600">{totalCount}</span>
        </p>
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
    </TooltipProvider>
  )
}

export default EmpReportsDownload
