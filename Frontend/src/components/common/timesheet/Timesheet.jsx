import React, { useState, useEffect, useRef, useCallback } from "react"
import { Search } from "lucide-react"
import moment from "moment-timezone"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import PaginationComponent from "@/components/common/Pagination"

import TimesheetHeader from "./TimesheetHeader"
import TimesheetFilters from "./TimesheetFilters"
import TimesheetTable from "./TimesheetTable"

import { useTimesheetStore } from "@/page/protected/admin/timesheets/timesheetStore"

const EmployeeTimesheet = () => {
    const rows = useTimesheetStore((s) => s.rows)
    const totalCount = useTimesheetStore((s) => s.totalCount)
    const locations = useTimesheetStore((s) => s.locations)
    const departments = useTimesheetStore((s) => s.departments)
    const shifts = useTimesheetStore((s) => s.shifts)
    const employees = useTimesheetStore((s) => s.employees)
    const filters = useTimesheetStore((s) => s.filters)
    const pagination = useTimesheetStore((s) => s.pagination)
    const loading = useTimesheetStore((s) => s.loading)
    const tableLoading = useTimesheetStore((s) => s.tableLoading)
    const exportLoading = useTimesheetStore((s) => s.exportLoading)
    const error = useTimesheetStore((s) => s.error)
    const setFilter = useTimesheetStore((s) => s.setFilter)
    const setPagination = useTimesheetStore((s) => s.setPagination)
    const loadInitialData = useTimesheetStore((s) => s.loadInitialData)
    const fetchTimesheet = useTimesheetStore((s) => s.fetchTimesheet)
    const fetchDepartmentsByLocation = useTimesheetStore((s) => s.fetchDepartmentsByLocation)
    const fetchEmployeesByFilters = useTimesheetStore((s) => s.fetchEmployeesByFilters)
    const exportCsv = useTimesheetStore((s) => s.exportCsv)
    const exportPdf = useTimesheetStore((s) => s.exportPdf)

    // Column visibility
    const visibleColumns = useTimesheetStore((s) => s.visibleColumns)
    const allColumns = useTimesheetStore((s) => s.allColumns)
    const toggleColumn = useTimesheetStore((s) => s.toggleColumn)
    const resetColumns = useTimesheetStore((s) => s.resetColumns)

    const [search, setSearch] = useState("")
    const initialLoad = useRef(true)
    const debounceTimer = useRef(null)

    // Initial load
    useEffect(() => {
        loadInitialData()
    }, [])

    // Debounce search → update store filter (triggers server-side search)
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
            setFilter("search", search)
        }, 400)
        return () => clearTimeout(debounceTimer.current)
    }, [search])

    // Re-fetch when filters or pagination change (skip initial mount)
    useEffect(() => {
        if (initialLoad.current) {
            initialLoad.current = false
            return
        }
        fetchTimesheet()
    }, [
        filters.location,
        filters.department,
        filters.employee,
        filters.shift,
        filters.startDate,
        filters.endDate,
        filters.search,
        pagination.page,
        pagination.pageSize,
        pagination.sortColumn,
        pagination.sortOrder,
    ])

    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize))

    const handleLocationChange = useCallback((value) => {
        setFilter("location", value)
        setFilter("department", "all")
        setFilter("employee", "all")
        fetchDepartmentsByLocation(value)
        fetchEmployeesByFilters(value, "all")
    }, [setFilter, fetchDepartmentsByLocation, fetchEmployeesByFilters])

    const handleDepartmentChange = useCallback((value) => {
        setFilter("department", value)
        setFilter("employee", "all")
        fetchEmployeesByFilters(filters.location, value)
    }, [setFilter, fetchEmployeesByFilters, filters.location])

    const handleEmployeeChange = useCallback((value) => {
        setFilter("employee", value)
    }, [setFilter])

    const handleShiftChange = useCallback((value) => {
        setFilter("shift", value)
    }, [setFilter])

    const handleDateRangeChange = useCallback((start, end) => {
        if (!start || !end) {
            setFilter("startDate", "")
            setFilter("endDate", "")
            return
        }
        setFilter("startDate", moment(start).format("YYYY-MM-DD"))
        setFilter("endDate", moment(end).format("YYYY-MM-DD"))
    }, [setFilter])

    const handlePageSizeChange = useCallback((value) => {
        const num = parseInt(value, 10)
        setPagination("pageSize", Number.isNaN(num) ? 10 : num)
        setPagination("page", 1)
    }, [setPagination])

    const handlePageChange = useCallback((p) => {
        setPagination("page", p)
    }, [setPagination])

    const handleCsvExport = useCallback((selectedKeys) => {
        exportCsv(selectedKeys)
    }, [exportCsv])

    const handlePdfExport = useCallback((selectedKeys) => {
        exportPdf(selectedKeys)
    }, [exportPdf])

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
                <div className="w-20 h-20 flex items-center justify-center">
                    <video
                        src="/src/assets/ai.webm"
                        autoPlay
                        loop
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            <TimesheetHeader
                onCsvExport={handleCsvExport}
                onPdfExport={handlePdfExport}
                exportLoading={exportLoading}
                allColumns={allColumns}
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
                onResetColumns={resetColumns}
            />

            {error && (
                <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                </div>
            )}

            <TimesheetFilters
                locations={locations}
                departments={departments}
                employees={employees}
                shifts={shifts}
                locationValue={filters.location}
                departmentValue={filters.department}
                employeeValue={filters.employee}
                shiftValue={filters.shift}
                startDate={filters.startDate}
                endDate={filters.endDate}
                onLocationChange={handleLocationChange}
                onDepartmentChange={handleDepartmentChange}
                onEmployeeChange={handleEmployeeChange}
                onShiftChange={handleShiftChange}
                onDateRangeChange={handleDateRangeChange}
            />

            {/* Show entries + Search */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#424242] font-medium">Show</span>
                    <Select
                        value={String(pagination.pageSize)}
                        onValueChange={handlePageSizeChange}
                    >
                        <SelectTrigger className="h-8 w-[70px] text-[13px] rounded-lg border-gray-200">
                            <SelectValue placeholder="10" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {["10", "25", "50", "100"].map((n) => (
                                <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-[13px] text-[#424242] font-medium">Entries</span>
                </div>

                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
                    />
                </div>
            </div>

            <TimesheetTable
                rows={rows}
                loading={tableLoading}
                visibleColumns={visibleColumns}
            />

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5 pt-10">
                <p className="text-[13px] text-gray-500 font-medium">
                    Showing{" "}
                    <span className="font-bold text-gray-700">
                        {totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-bold text-gray-700">
                        {Math.min(pagination.page * pagination.pageSize, totalCount)}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-blue-600">{totalCount}</span>
                </p>
                <PaginationComponent
                    currentPage={pagination.page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </div>
        </div>
    )
}

export default EmployeeTimesheet
