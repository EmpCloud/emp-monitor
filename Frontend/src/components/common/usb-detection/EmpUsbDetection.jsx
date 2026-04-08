import React from "react"
import { useTranslation } from "react-i18next";
import { Search, Info } from "lucide-react"
import PaginationComponent from "@/components/common/Pagination"
import CustomSelect from "@/components/common/elements/CustomSelect"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import ShowEntries from "@/components/common/elements/ShowEntries"
import EmpUsbDetectionLogo from "@/assets/dlp/usb-detection.svg"
import { useUsbDetectionStore } from "@/page/protected/admin/usb-detection/usbDetectionStore"
import { useDlpFilters } from "@/hooks/useDlpFilters"
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar"

const DOWNLOAD_OPTIONS = [
  { label: "Select Option", value: "all" },
  { label: "PDF", value: "pdf" },
  { label: "Excel", value: "excel" },
]

const EmpUsbDetection = () => {
    const { t } = useTranslation();
  const store = useUsbDetectionStore()
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
          <img alt="usb-detection" className="w-24 h-24" src={EmpUsbDetectionLogo} />
        </div>
        <div className="border-l-2 border-blue-500 pl-4">
          <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
            <span className="font-semibold">{t("usbDetection.title")}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
            {t("usbDetection.description")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("location")}</label>
          <CustomSelect placeholder={t("allLocations")} items={locations} selected={filters.locationId} onChange={handleLocationChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("department")}</label>
          <CustomSelect placeholder={t("allDepartments")} items={departments} selected={filters.departmentId} onChange={handleDepartmentChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("employee")}</label>
          <CustomSelect placeholder={t("allEmployees")} items={employees} selected={filters.employeeId} onChange={handleEmployeeChange} />
        </div>
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1.5">
            {t("timeclaim.selectDateRanges")} :
            <Info className="w-3.5 h-3.5 text-blue-500" />
          </label>
          <DateRangeCalendar
            startDate={filters.startDate}
            endDate={filters.endDate}
            onChange={handleDateRangeChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("downloads")}</label>
          <CustomSelect placeholder={t("usbDetection.selectOption")} items={DOWNLOAD_OPTIONS} selected={downloadOption} onChange={handleDownload} />
        </div>
      </div>

      {/* Show entries + Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <ShowEntries value={filters.limit} onChange={handlePageSizeChange} />
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
        <Table className="min-w-[1000px] w-full">
          <TableHeader>
            <TableRow className="bg-blue-50/80">
              <TableHead className="text-xs font-semibold text-slate-700">{t("screenshotLogs.employeeName")}</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">{t("usbDetection.employeeId")}</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">{t("screenshotLogs.computer")}</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">{t("location")}</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">{t("department")}</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">{t("usbDetection.title_col")}</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">{t("usbDetection.dateTime")}</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">{t("systemLogs.description_col")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {tableLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-gray-400 py-10">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    {t("loadingText")}
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-gray-400 py-10">{t("Nodata")}</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row._id} className="text-xs text-slate-600">
                  <TableCell className="font-medium text-slate-700">{row.fullName}</TableCell>
                  <TableCell>{row.employeeId}</TableCell>
                  <TableCell className="font-semibold text-slate-700">{row.computer}</TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-medium">{row.title}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{row.start}</TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="truncate" title={row.description}>
                      {row.parsedDescription?.map((d, i) => (
                        <div key={i} className="text-[11px] leading-tight">
                          {d.fileName && <span className="font-medium">{d.fileName}</span>}
                          {d.Application && <span className="text-gray-400"> - {d.Application}</span>}
                          {d.blockReason && <span className="text-red-500 ml-1">({d.blockReason})</span>}
                          {!d.fileName && d.description && <span>{d.description}</span>}
                        </div>
                      ))}
                    </div>
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
          <span className="font-bold text-gray-700">{totalDocs === 0 ? 0 : (currentPage - 1) * filters.limit + 1}</span>{" "}
          {t("to")} <span className="font-bold text-gray-700">{Math.min(currentPage * filters.limit, totalDocs)}</span>{" "}
          {t("of")} <span className="font-bold text-blue-600">{totalDocs}</span>
        </p>
        <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>
    </div>
  )
}

export default EmpUsbDetection
