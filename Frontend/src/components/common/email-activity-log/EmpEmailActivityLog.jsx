import React, { useState, useCallback } from "react"
import { Search, Info, Eye, Send, Inbox, Paperclip } from "lucide-react"
import moment from "moment"
import PaginationComponent from "@/components/common/Pagination"
import CustomSelect from "@/components/common/elements/CustomSelect"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import EmpEmailActivityLogLogo from "@/assets/dlp/email-activity-logs.svg"
import { useEmailActivityLogsStore } from "@/page/protected/admin/email-activity-logs/emailActivityLogsStore"
import { useDlpFilters } from "@/hooks/useDlpFilters"
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar"

const TYPE_OPTIONS = [
  { label: "Sent Mails", value: "0" },
  { label: "Received Mails", value: "4" },
  { label: "Click Event", value: "1" },
  { label: "Page Visit", value: "2" },
]

const DOWNLOAD_OPTIONS = [
  { label: "Select Option", value: "all" },
  { label: "PDF", value: "pdf" },
  { label: "Excel", value: "excel" },
]

const EmpEmailActivityLog = () => {
  const store = useEmailActivityLogsStore()
  const { rows, totalDocs, locations, departments, employees, filters, loading, tableLoading, setFilters } = store

  const {
    search, setSearch, downloadOption, handleDateRangeChange,
    totalPages, currentPage,
    handleLocationChange, handleDepartmentChange, handleEmployeeChange,
    handlePageSizeChange, handlePageChange, handleDownload,
  } = useDlpFilters(store, ["type"])

  const [viewRow, setViewRow] = useState(null)
  const isEmailType = filters.type === "0" || filters.type === "4"

  const handleTypeChange = useCallback((value) => {
    setFilters({ type: value, skip: 0, page: 1 })
  }, [setFilters])

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
          <img alt="email-activity-logs" className="w-24 h-24" src={EmpEmailActivityLogLogo} />
        </div>
        <div className="border-l-2 border-blue-500 pl-4">
          <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
            <span className="font-semibold">Email</span>{" "}
            <span className="font-normal text-gray-500">Activity Logs</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
            Granular email activity logs including attachments and recipients.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-4 mb-5">
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
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
          <CustomSelect placeholder="Sent Mails" items={TYPE_OPTIONS} selected={filters.type} onChange={handleTypeChange} />
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
      {isEmailType ? (
        <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
          <Table className="min-w-[1100px] w-full">
            <TableHeader>
              <TableRow className="bg-blue-50/80">
                <TableHead className="text-xs font-semibold text-slate-700 w-[60px]">View</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Employee</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">{filters.type === "4" ? "From" : "To"}</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">CC</TableHead>
                {filters.type === "0" && <TableHead className="text-xs font-semibold text-slate-700">BCC</TableHead>}
                <TableHead className="text-xs font-semibold text-slate-700">Subject</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Body</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Attachments</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Event Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {tableLoading ? (
                <TableRow>
                  <TableCell colSpan={filters.type === "0" ? 9 : 8} className="text-center text-sm text-gray-400 py-10">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={filters.type === "0" ? 9 : 8} className="text-center text-sm text-gray-400 py-10">No records found</TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row._id} className="text-xs text-slate-600">
                    <TableCell>
                      <button onClick={() => setViewRow(row)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">{row.employeeName}</TableCell>
                    <TableCell>{filters.type === "4" ? row.from : row.to}</TableCell>
                    <TableCell>{row.cc}</TableCell>
                    {filters.type === "0" && <TableCell>{row.bcc}</TableCell>}
                    <TableCell>{row.subject}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate" title={row.body}>{row.body}</div>
                    </TableCell>
                    <TableCell>
                      {row.attachments.length > 0 ? (
                        <div className="space-y-0.5">
                          {row.attachments.slice(0, 2).map((att, i) => (
                            <a key={i} href={att.link || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-[11px] block truncate max-w-[180px]" title={att.name || `Attachment ${i + 1}`}>
                              {att.name || `Attachment ${i + 1}`}
                            </a>
                          ))}
                          {row.attachments.length > 2 && <span className="text-[11px] text-gray-400">+{row.attachments.length - 2} more</span>}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.timestamp}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
          <Table className="min-w-[950px] w-full">
            <TableHeader>
              <TableRow className="bg-blue-50/80">
                <TableHead className="text-xs font-semibold text-slate-700">Employee</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Page Title</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">URL</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Label</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Start Time</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">End Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {tableLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-gray-400 py-10">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-gray-400 py-10">No records found</TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row._id} className="text-xs text-slate-600">
                    <TableCell className="font-medium text-slate-700">{row.employeeName}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>
                      <a href={row.url !== "-" ? row.url : undefined} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block max-w-[300px]" title={row.url}>{row.url}</a>
                    </TableCell>
                    <TableCell>
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-medium">{row.label}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.startTime}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.endTime}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

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

      {/* Email View Modal */}
      <Dialog open={!!viewRow} onOpenChange={(open) => { if (!open) setViewRow(null) }}>
        <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
          {viewRow && (
            <>
              <div className="bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-4">
                <DialogHeader>
                  <DialogTitle className="text-white text-base font-semibold flex items-center gap-2 flex-wrap">
                    {viewRow.subject !== "-" ? viewRow.subject : "(No Subject)"}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      filters.type === "4" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                    }`}>
                      {filters.type === "4" ? <><Inbox className="w-3 h-3" /> RECEIVED</> : <><Send className="w-3 h-3" /> SENT</>}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="sr-only">Email details</DialogDescription>
                </DialogHeader>
              </div>

              <div className="px-6 py-4 space-y-0">
                {filters.type === "4" ? (
                  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100">
                    <span className="text-xs font-medium text-slate-400 w-16 shrink-0 pt-0.5">From:</span>
                    <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-700">{viewRow.from}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100">
                    <span className="text-xs font-medium text-slate-400 w-16 shrink-0 pt-0.5">To:</span>
                    <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-700">{viewRow.to}</span>
                  </div>
                )}

                {viewRow.cc && viewRow.cc !== "-" && (
                  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100">
                    <span className="text-xs font-medium text-slate-400 w-16 shrink-0 pt-0.5">CC:</span>
                    <div className="flex flex-wrap gap-1">
                      {viewRow.cc.split(",").map((email, i) => (
                        <span key={i} className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-700">{email.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}

                {filters.type === "0" && viewRow.bcc && viewRow.bcc !== "-" && (
                  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100">
                    <span className="text-xs font-medium text-slate-400 w-16 shrink-0 pt-0.5">BCC:</span>
                    <div className="flex flex-wrap gap-1">
                      {viewRow.bcc.split(",").map((email, i) => (
                        <span key={i} className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-700">{email.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-400 w-16 shrink-0">Date:</span>
                  <span className="text-xs text-slate-700">
                    {viewRow.timestamp !== "-" ? moment(viewRow.timestamp, "YYYY-MM-DD HH:mm:ss").format("DD MMM YYYY") : "-"}
                  </span>
                </div>

                <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-400 w-16 shrink-0">Time:</span>
                  <span className="text-xs text-slate-700">
                    {viewRow.timestamp !== "-" ? moment(viewRow.timestamp, "YYYY-MM-DD HH:mm:ss").format("hh:mm A") : "-"}
                  </span>
                </div>

                <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-400 w-16 shrink-0">Subject:</span>
                  <span className="text-sm font-semibold text-slate-800">{viewRow.subject}</span>
                </div>

                <div className="py-3">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{viewRow.body}</p>
                </div>

                {viewRow.attachments.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {viewRow.attachments.map((att, i) => (
                        <a key={i} href={att.link || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-blue-600 hover:bg-blue-50 transition-colors">
                          <Paperclip className="w-3 h-3" />
                          {att.name || `Attachment ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="px-6 py-3 border-t border-slate-100">
                <DialogClose asChild>
                  <Button className="rounded-lg bg-blue-500 hover:bg-blue-600 text-white px-6">Close</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EmpEmailActivityLog
