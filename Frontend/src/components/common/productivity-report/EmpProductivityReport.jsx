import React, { useMemo, useEffect, useCallback, useState } from "react"
import ReactApexChart from "react-apexcharts"
import { Info } from "lucide-react"
import { FaFileCsv } from "react-icons/fa6"
import { BiSolidFilePdf } from "react-icons/bi"
import PaginationComponent from "@/components/common/Pagination"
import CustomSelect from "@/components/common/elements/CustomSelect"
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import EmpProductivityReportLogo from "@/assets/reports/productivity.svg"
import { useProductivityReportStore } from "@/page/protected/admin/productivity-report/productivityReportStore"

const EmpProductivityReport = () => {
  const {
    rows,
    totalCount,
    loading,
    locations,
    departments,
    employees,
    filters,
    setFilter,
    setPage,
    setPageSize,
    loadInitial,
    fetchProductivityData,
    fetchDepartmentsByLocation,
    fetchEmployeesByLocDept,
    handleExportCSV,
    handleExportPDF
  } = useProductivityReportStore()

  const [selectedRows, setSelectedRows] = useState([])

  const handleDateRangeChange = useCallback((start, end) => {
    if (!start || !end) return
    setFilter("startDate", start)
    setFilter("endDate", end)
    setFilter("skip", 0)
    setFilter("page", 1)
  }, [setFilter])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  // Refetch when pagination/filter changes
  useEffect(() => {
    fetchProductivityData()
  }, [
    fetchProductivityData,
    filters.skip,
    filters.limit,
    filters.startDate,
    filters.endDate,
    filters.location,
    filters.department,
    filters.employee
  ])

  const handleLocationChange = useCallback((value) => {
    setFilter("location", value)
    setFilter("department", "all")
    setFilter("employee", "all")
    setFilter("skip", 0)
    setFilter("page", 1)
    fetchDepartmentsByLocation(value)
    fetchEmployeesByLocDept(value, "")
  }, [setFilter, fetchDepartmentsByLocation, fetchEmployeesByLocDept])

  const handleDepartmentChange = useCallback((value) => {
    setFilter("department", value)
    setFilter("employee", "all")
    setFilter("skip", 0)
    setFilter("page", 1)
    fetchEmployeesByLocDept(filters.location, value)
  }, [setFilter, filters.location, fetchEmployeesByLocDept])

  const handleEmployeeChange = useCallback((value) => {
    setFilter("employee", value)
    setFilter("skip", 0)
    setFilter("page", 1)
  }, [setFilter])

  // Sort rows alphabetically for chart
  const sortedRows = useMemo(() =>
    [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [rows]
  )

  // Chart config — colors match old JS: green, red, gray
  const chartOptions = useMemo(() => ({
    chart: {
      type: "bar",
      height: 380,
      stacked: true,
      toolbar: { show: false },
      fontFamily: "inherit",
      parentHeightOffset: 0,
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "last",
        columnWidth: sortedRows.length <= 3 ? "30%" : "60%",
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (_val, opts) => {
        const row = sortedRows[opts.dataPointIndex]
        if (!row) return ""
        if (opts.seriesIndex === 0) return row.productive
        if (opts.seriesIndex === 1) return row.unproductive
        if (opts.seriesIndex === 2) return row.neutral
        return ""
      },
      style: { fontSize: "9px", colors: ["#fff"] },
      dropShadow: { enabled: false },
    },
    colors: ["#26c36c", "#f22f3f", "#CCCCCC"],
    fill: { type: "solid", opacity: 1 },
    states: { hover: { filter: { type: "darken", value: 0.88 } } },
    xaxis: {
      categories: sortedRows.map((r) => r.name),
      labels: {
        style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      title: {
        text: "Time Used (Hours)",
        style: { color: "#64748b", fontSize: "12px", fontWeight: 500 },
      },
      labels: {
        style: { colors: "#94a3b8", fontSize: "11px" },
        formatter: (val) => val.toFixed(2),
      },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "center",
      markers: { radius: 12 },
      labels: { colors: "#64748b" },
    },
    tooltip: {
      theme: "dark",
      style: { fontSize: "11px" },
      y: {
        formatter: (_val, opts) => {
          const row = sortedRows[opts.dataPointIndex]
          if (!row) return `${_val}`
          if (opts.seriesIndex === 0) return row.productive
          if (opts.seriesIndex === 1) return row.unproductive
          if (opts.seriesIndex === 2) return row.neutral
          return `${_val}`
        }
      }
    },
  }), [sortedRows])

  const chartSeries = useMemo(() => [
    { name: "Productive", data: sortedRows.map((r) => r.productiveHrs) },
    { name: "Unproductive", data: sortedRows.map((r) => r.unproductiveHrs) },
    { name: "Neutral", data: sortedRows.map((r) => r.neutralHrs) },
  ], [sortedRows])

  const pageSize = filters.limit
  const currentPage = filters.page
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const toggleRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedRows.length === rows.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(rows.map((r) => r.id))
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="border-l-2 border-blue-500 pl-4">
          <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
            <span className="font-semibold">Productivity Report</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
            Comprehensive productivity reports with charts and trend analysis.
          </p>
        </div>
        <div className="flex items-end gap-1 mr-2">
          <img alt="productivity" className="w-28" src={EmpProductivityReportLogo} />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
          <CustomSelect
            placeholder="All Location"
            items={locations}
            selected={filters.location}
            onChange={handleLocationChange}
            width="full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
          <CustomSelect
            placeholder="Select Department"
            items={departments}
            selected={filters.department}
            onChange={handleDepartmentChange}
            width="full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Employee</label>
          <CustomSelect
            placeholder="Select Employee"
            items={employees}
            selected={filters.employee}
            onChange={handleEmployeeChange}
            width="full"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1.5">
            Select Date Ranges :
            <Info className="w-3.5 h-3.5 text-blue-500" />
          </label>
          <DateRangeCalendar
            startDate={filters.startDate}
            endDate={filters.endDate}
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 mb-6">
        {loading && sortedRows.length === 0 ? (
          <div className="flex items-center justify-center h-[380px]">
            <div className="w-16 h-16 flex items-center justify-center">
              <video
                src="/src/assets/ai.webm"
                autoPlay loop playsInline muted
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="flex items-center justify-center h-[380px] text-gray-400 text-sm">
            No productivity data available for the selected period.
          </div>
        ) : (
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="bar"
            height={380}
          />
        )}
        <div className="flex justify-center mt-2">
          <div className="h-1 w-40 rounded-full bg-gradient-to-r from-[#6366f1] to-[#3b82f6]" />
        </div>
      </div>

      {/* Show entries + Export */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-gray-500 font-medium">Show</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              const num = parseInt(v, 10)
              setPageSize(Number.isNaN(num) ? 10 : num)
            }}
          >
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

        <div className="flex items-center gap-2">
          <Button
            size="lg"
            className="rounded-lg bg-[#2598EB] hover:bg-[#2598EB]/90 px-5 text-xs font-semibold shadow-sm"
            onClick={handleExportCSV}
          >
            <FaFileCsv className="w-4 h-4" /> CSV
          </Button>
          <Button
            size="lg"
            className="rounded-lg bg-[#8D85FF] hover:bg-[#8D85FF]/90 px-5 text-xs font-semibold shadow-sm"
            onClick={handleExportPDF}
          >
            <BiSolidFilePdf className="size-5" /> PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
        <Table className="min-w-[900px] w-full">
          <TableHeader>
            <TableRow className="bg-blue-50/80">
              <TableHead className="w-10">
                <Checkbox
                  checked={rows.length > 0 && selectedRows.length === rows.length}
                  onCheckedChange={toggleAll}
                  className="border-slate-300"
                />
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">Name</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">Office Time (Hr)</TableHead>
              <TableHead className="text-xs font-semibold text-green-600">Productive</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">Productivity %</TableHead>
              <TableHead className="text-xs font-semibold text-red-500">Unproductive</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">Unproductivity %</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">Neutral</TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">Idle Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-gray-400 py-10">
                  <div className="flex items-center justify-center">
                    <video src="/src/assets/ai.webm" autoPlay loop playsInline muted className="w-10 h-10 object-contain" />
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-gray-400 py-10">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="text-xs text-slate-600">
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(row.id)}
                      onCheckedChange={() => toggleRow(row.id)}
                      className="border-slate-300"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.total} Hr</TableCell>
                  <TableCell>{row.productive} Hr</TableCell>
                  <TableCell>{row.productivityPct}</TableCell>
                  <TableCell>{row.unproductive} Hr</TableCell>
                  <TableCell>{row.unproductivePct}</TableCell>
                  <TableCell>{row.neutral} Hr</TableCell>
                  <TableCell>{row.idleTime} Hr</TableCell>
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
            {totalCount === 0 ? 0 : filters.skip + 1}
          </span>{" "}
          to{" "}
          <span className="font-bold text-gray-700">
            {Math.min(filters.skip + pageSize, totalCount)}
          </span>{" "}
          of{" "}
          <span className="font-bold text-blue-600">{totalCount}</span>
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

export default EmpProductivityReport
