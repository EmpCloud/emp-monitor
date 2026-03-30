import React, { useEffect, useCallback, useMemo, useRef, useState } from "react";
import ReactApexChart from "react-apexcharts";
import {
  Info,
  Download,
  Search,
  Globe,
  Smartphone,
  Monitor,
  LayoutGrid,
  ArrowDownUp,
} from "lucide-react";

import PaginationComponent from "@/components/common/Pagination";
import CustomSelect from "@/components/common/elements/CustomSelect";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import EmpWebAppUsageLogo from "@/assets/reports/webapp_usage.svg";
import { useWebAppUsageStore } from "@/page/protected/admin/web-app-usage/webAppUsageStore";
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar";

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_MAP = {
  0: { label: "Neutral", color: "text-amber-500" },
  1: { label: "Productive", color: "text-green-500" },
  2: { label: "Unproductive", color: "text-red-500" },
  4: { label: "Customization", color: "text-blue-500" },
};

function getStatusInfo(status) {
  return STATUS_MAP[status] || { label: "Unknown", color: "text-gray-400" };
}

// ── Date Range (shared calendar, same as TimesheetFilters) ──────────────────

function DateRangePicker({ startDate, endDate, onDateRangeChange }) {
  return (
    <DateRangeCalendar
      startDate={startDate}
      endDate={endDate}
      onChange={(s, e) => {
        if (!s || !e) return;
        onDateRangeChange(s, e);
      }}
    />
  );
}

// ── TAB CONFIG ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 0, label: "Both", Icon: Monitor },
  { id: 2, label: "Website", Icon: Globe },
  { id: 1, label: "Application", Icon: LayoutGrid },
];

// ═════════════════════════════════════════════════════════════════════════════
// LEFT PANEL — Web/App list with tabs, search, and ranking table
// ═════════════════════════════════════════════════════════════════════════════

function LeftPanel() {
  const {
    filters,
    listData,
    listTotal,
    listSkip,
    listLoading,
    setTab,
    setSearch,
    setSorting,
    loadMoreListData,
    openModal,
  } = useWebAppUsageStore();

  const [searchInput, setSearchInput] = useState("");
  const scrollRef = useRef(null);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight + 2 >= el.scrollHeight) {
      if (listSkip < listTotal) loadMoreListData();
    }
  }, [listSkip, listTotal, loadMoreListData]);

  const handleSearchSubmit = () => {
    if (searchInput.length >= 3 || searchInput === "") {
      setSearch(searchInput);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") handleSearchSubmit();
  };

  return (
    <div className="bg-gray-100 rounded-2xl p-4 pb-0 overflow-hidden flex-shrink-0 w-full lg:w-[430px] flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 overflow-auto">
          {TABS.map(({ id, label, Icon }) => {
            const active = filters.tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-700 shadow-sm hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 mb-3 shadow-sm w-fit min-w-[210px]">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search"
          className="border-none outline-none text-sm text-gray-500 bg-transparent w-40"
        />
        <button
          onClick={handleSearchSubmit}
          className="text-blue-600 text-xs font-medium hover:underline"
        >
          Go
        </button>
      </div>

      {/* White table area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="bg-white rounded-t-2xl rounded-b-2xl -mx-4 px-5 pb-4 flex-1 overflow-y-auto"
        style={{ maxHeight: 420 }}
      >
        {/* Column headers */}
        <div className="flex items-center py-3 border-b border-dashed border-gray-300 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 flex-[2.2]">
            <span className="text-sm font-bold text-gray-900">Web / App</span>
          </div>
          <div className="flex-[1.3]">
            <span className="text-sm font-bold text-gray-900">Ranking</span>
          </div>
          <div className="flex items-center justify-end gap-1 flex-[1.5]">
            <button
              onClick={() => setSorting("total_duration")}
              className="text-sm font-bold text-gray-900 flex items-center gap-1 hover:text-blue-600"
            >
              Duration (hr)
              <ArrowDownUp className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Data rows */}
        {listData.length === 0 && !listLoading && (
          <div className="py-10 text-center text-gray-400 text-sm">
            No data found
          </div>
        )}

        {listData.map((row, i) => {
          const statusInfo = getStatusInfo(row.status);
          const isWeb = row.type == 2 || row.type === "2";
          const isCustomizable = row.status == 4 || row.status === "4";

          return (
            <div
              key={`${row._id}-${i}`}
              className="flex items-center py-3 border-t border-dashed border-gray-200"
            >
              <div className="flex items-center gap-2 flex-[2.2] min-w-0">
                {isWeb ? (
                  <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                ) : (
                  <Smartphone className="w-4 h-4 text-gray-500 shrink-0" />
                )}
                {isCustomizable ? (
                  <button
                    className="text-sm font-medium text-blue-500 truncate hover:underline text-left"
                    onClick={() => openModal(row._id, row.name, row.type)}
                    title={row.name}
                  >
                    {row.name}
                  </button>
                ) : isWeb ? (
                  <a
                    href={`https://${row.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-500 truncate hover:underline"
                    title={row.name}
                  >
                    {row.name}
                  </a>
                ) : (
                  <span
                    className="text-sm font-medium text-gray-700 truncate"
                    title={row.name}
                  >
                    {row.name}
                  </span>
                )}
              </div>
              <div className="flex-[1.3]">
                {isCustomizable ? (
                  <button
                    className="text-sm font-semibold text-blue-500 hover:underline"
                    onClick={() => openModal(row._id, row.name, row.type)}
                  >
                    Customization
                  </button>
                ) : (
                  <span className={`text-sm font-semibold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                )}
              </div>
              <div className="flex justify-end flex-[1.5]">
                <span className="text-sm text-gray-700 tracking-wide">
                  {row.durationDisplay}
                </span>
              </div>
            </div>
          );
        })}

        {listLoading && (
          <div className="py-4 text-center">
            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Footer info */}
        <div className="border-t border-dashed border-gray-300 pt-3 mt-1">
          <span className="text-xs text-gray-500">
            Showing {Math.min(listSkip, listTotal)} of {listTotal}
          </span>
          <div className="text-xs mt-2">
            <span className="text-red-500 font-bold">Note : </span>
            <span className="text-gray-500">
              Here we are showing only the APP/WEB usage having more than twenty
              seconds
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CHART — ApexCharts bar chart (replaces amCharts from old JS)
// ═════════════════════════════════════════════════════════════════════════════

function UsageChart() {
  const { chartData, listLoading } = useWebAppUsageStore();

  // Generate per-bar gradient colors from blue → purple
  const barColors = useMemo(() => {
    if (!chartData.length) return [];
    return chartData.map((_, i) => {
      const ratio = chartData.length === 1 ? 0 : i / (chartData.length - 1);
      // Interpolate from #5b8def (blue) → #8b5cf6 (purple)
      const r = Math.round(91 + (139 - 91) * ratio);
      const g = Math.round(141 + (92 - 141) * ratio);
      const b = Math.round(239 + (246 - 239) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    });
  }, [chartData]);

  const options = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: 420,
        toolbar: { show: false },
        fontFamily: "inherit",
        parentHeightOffset: 0,
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          borderRadiusApplication: "end",
          columnWidth: chartData.length <= 3 ? "25%" : chartData.length <= 8 ? "40%" : "55%",
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      colors: barColors,
      fill: {
        type: "gradient",
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.15,
          gradientToColors: barColors.map(() => "#e0e7ff"),
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.35,
          stops: [0, 100],
        },
      },
      stroke: {
        show: false,
      },
      states: {
        hover: { filter: { type: "darken", value: 0.85 } },
      },
      xaxis: {
        categories: chartData.map((d) => d.name),
        labels: {
          rotate: -55,
          rotateAlways: true,
          style: {
            colors: "#94a3b8",
            fontSize: "9px",
            fontWeight: 500,
            fontFamily: "inherit",
          },
          maxHeight: 110,
          trim: true,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        title: {
          text: "Hours",
          style: {
            color: "#94a3b8",
            fontSize: "11px",
            fontWeight: 600,
            fontFamily: "inherit",
          },
        },
        labels: {
          style: { colors: "#cbd5e1", fontSize: "10px" },
          formatter: (val) => val.toFixed(0),
        },
      },
      grid: {
        borderColor: "#e2e8f0",
        strokeDashArray: 5,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { left: 10, right: 10 },
      },
      tooltip: {
        theme: "light",
        style: { fontSize: "11px" },
        custom: ({ dataPointIndex }) => {
          const d = chartData[dataPointIndex];
          if (!d) return "";
          return `<div style="padding:8px 12px;border-radius:8px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.1);font-size:12px">
            <div style="font-weight:700;color:#334155;margin-bottom:2px">${d.fullName}</div>
            <div style="color:#64748b">Duration: ${d.durationDisplay}</div>
          </div>`;
        },
      },
      // Add markers (circles) on top of bars
      annotations: {
        points: chartData.map((d, i) => ({
          x: d.name,
          y: d.hours,
          marker: {
            size: 6,
            fillColor: barColors[i] || "#5b8def",
            strokeColor: "#fff",
            strokeWidth: 2,
            shape: "circle",
          },
          label: { text: "" },
        })),
      },
    }),
    [chartData, barColors]
  );

  const series = useMemo(
    () => [{ name: "Usage", data: chartData.map((d) => d.hours) }],
    [chartData]
  );

  if (listLoading && chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[420px]">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[420px] text-gray-400 text-sm">
        No data available for chart
      </div>
    );
  }

  return (
    <ReactApexChart options={options} series={series} type="bar" height={420} />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CUSTOMIZE MODAL — department-level rules for customization-status apps
// ═════════════════════════════════════════════════════════════════════════════

function CustomizeModal() {
  const {
    modalOpen,
    modalAppName,
    modalAppType,
    modalData,
    modalTotal,
    modalPage,
    modalPageSize,
    modalLoading,
    closeModal,
    setModalPage,
    setModalPageSize,
    setModalSearch,
  } = useWebAppUsageStore();

  const [searchInput, setSearchInput] = useState("");
  const totalPages = Math.max(1, Math.ceil(modalTotal / modalPageSize));

  const handleSearch = () => {
    if (searchInput.length >= 3 || searchInput === "") {
      setModalSearch(searchInput);
    }
  };

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {modalAppType == 1 || modalAppType === "1" ? (
              <Smartphone className="w-5 h-5" />
            ) : (
              <Globe className="w-5 h-5" />
            )}
            {modalAppName}
          </DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Show</span>
            <Select
              value={String(modalPageSize)}
              onValueChange={(v) => setModalPageSize(parseInt(v, 10))}
            >
              <SelectTrigger className="h-8 w-16 text-sm rounded-lg border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {["10", "25", "50", "100"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">entries</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search ..."
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none w-48"
            />
            <Button size="sm" onClick={handleSearch}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-100 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50/80">
                <TableHead className="text-xs font-semibold text-slate-700 w-[300px]">
                  Department
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 w-[200px]">
                  Ranking
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 w-[200px]">
                  Duration (hr)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {modalLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-10 text-gray-400"
                  >
                    <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </TableCell>
                </TableRow>
              ) : modalData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-10 text-gray-400 text-sm"
                  >
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                modalData.map((row, i) => {
                  const s = getStatusInfo(row.status);
                  return (
                    <TableRow key={i} className="text-sm">
                      <TableCell>{row.name}</TableCell>
                      <TableCell className={s.color}>{s.label}</TableCell>
                      <TableCell>{row.durationDisplay}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 mt-3">
          <span className="text-xs text-gray-500">
            Showing {modalTotal === 0 ? 0 : (modalPage - 1) * modalPageSize + 1}{" "}
            to {Math.min(modalPage * modalPageSize, modalTotal)} of {modalTotal}
          </span>
          <PaginationComponent
            currentPage={modalPage}
            totalPages={totalPages}
            onPageChange={setModalPage}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function EmpWebAppUsage() {
  const {
    // dropdowns
    locations,
    departments,
    employees,
    filters,
    // cumulative
    cumulativeData,
    cumulativeLoading,
    cTablePage,
    cTablePageSize,
    setCTablePage,
    setCTablePageSize,
    // actions
    loadInitial,
    handleLocationChange,
    handleDepartmentChange,
    handleEmployeeChange,
    handleDateChange,
    handleExportExcel,
    handleExportPDF,
    handleExportCumulativeExcel,
  } = useWebAppUsageStore();

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Paginated cumulative data
  const cTotalPages = Math.max(
    1,
    Math.ceil(cumulativeData.length / cTablePageSize)
  );
  const paginatedCumulative = useMemo(() => {
    const start = (cTablePage - 1) * cTablePageSize;
    return cumulativeData.slice(start, start + cTablePageSize);
  }, [cumulativeData, cTablePage, cTablePageSize]);

  const handleDateRangeChange = useCallback(
    (start, end) => {
      handleDateChange(start, end);
    },
    [handleDateChange]
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:p-9 w-full">
      {/* ══ HEADER ══ */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          <img alt="Web App Usage" className="w-24 h-24" src={EmpWebAppUsageLogo} />
          <div className="border-l-2 border-blue-500 pl-4">
            <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
              <span className="font-semibold">Web App </span> Usage
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
              Detailed breakdown of web and application usage by employees.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-64">
            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
          <Info
            className="w-4 h-4 text-blue-500 shrink-0 cursor-help"
            title="Custom Range allows maximum 30 days selection"
          />
        </div>
      </div>

      {/* ══ FILTER ROW ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <CustomSelect
          placeholder="All Location"
          items={locations}
          selected={filters.location}
          onChange={handleLocationChange}
          width="full"
        />
        <CustomSelect
          placeholder="All Departments"
          items={departments}
          selected={filters.department}
          onChange={handleDepartmentChange}
          width="full"
        />
        <CustomSelect
          placeholder="All Employees"
          items={employees}
          selected={filters.employee}
          onChange={handleEmployeeChange}
          width="full"
        />

        {/* Export buttons */}
        <Button
          className="rounded-lg bg-[#2563eb] hover:bg-[#2563eb]/90 px-5 text-sm font-bold shadow-md"
          onClick={handleExportExcel}
        >
          <Download className="w-4 h-4 mr-1" /> Export Excel
        </Button>
        <Button
          className="rounded-lg bg-[#ede9fe] hover:bg-[#ede9fe]/80 text-[#6d28d9] px-5 text-sm font-bold shadow-sm"
          onClick={handleExportPDF}
        >
          <Download className="w-4 h-4 mr-1" /> PDF
        </Button>
      </div>

      {/* ══ MIDDLE ROW: Left Panel + Chart ══ */}
      <div className="flex gap-4 mb-6 flex-col lg:flex-row">
        <LeftPanel />

        <div className="flex-1 min-w-0 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col">
          <UsageChart />
        </div>
      </div>

      {/* ══ BOTTOM TABLE — Cumulative Employee Report ══ */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-gray-500 font-medium">Show</span>
          <Select
            value={String(cTablePageSize)}
            onValueChange={(v) => setCTablePageSize(parseInt(v, 10))}
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
          <span className="text-[13px] text-gray-500 font-medium">Entries</span>
        </div>

        <Button
          size="lg"
          className="rounded-lg bg-green-600 hover:bg-green-700 px-5 text-xs font-semibold shadow-sm"
          onClick={handleExportCumulativeExcel}
        >
          <Download className="w-4 h-4 mr-1" /> Export Excel
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50 mb-4">
        <Table className="min-w-[1100px] w-full">
          <TableHeader>
            <TableRow className="bg-blue-50/80">
              <TableHead className="text-xs font-semibold text-slate-700">
                Name
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Email
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Location
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Department
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Computer Name
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Web App
              </TableHead>
              <TableHead className="text-xs font-semibold text-green-600">
                Productive
              </TableHead>
              <TableHead className="text-xs font-semibold text-red-500">
                Unproductive
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">
                Neutral
              </TableHead>
              <TableHead className="text-xs font-semibold text-amber-500">
                Idle
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {cumulativeLoading ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center text-sm text-gray-400 py-10"
                >
                  <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </TableCell>
              </TableRow>
            ) : paginatedCumulative.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center text-sm text-gray-400 py-10"
                >
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              paginatedCumulative.map((row) => {
                return (
                  <TableRow
                    key={row.id}
                    className="text-xs text-slate-600"
                  >
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.location}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="font-semibold">
                      {row.computerName}
                    </TableCell>
                    <TableCell>{row.webApp}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {row.productive}
                    </TableCell>
                    <TableCell className="text-red-500 font-semibold">
                      {row.unproductive}
                    </TableCell>
                    <TableCell className="text-gray-500 font-semibold">
                      {row.neutral}
                    </TableCell>
                    <TableCell className="text-amber-500 font-semibold">
                      {row.idle}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ══ PAGINATION ══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3">
        <p className="text-[13px] text-gray-500 font-medium">
          Showing{" "}
          <span className="font-bold text-gray-700">
            {cumulativeData.length === 0 ? 0 : (cTablePage - 1) * cTablePageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-bold text-gray-700">
            {Math.min(cTablePage * cTablePageSize, cumulativeData.length)}
          </span>{" "}
          of{" "}
          <span className="font-bold text-blue-600">
            {cumulativeData.length}
          </span>
        </p>
        <PaginationComponent
          currentPage={cTablePage}
          totalPages={cTotalPages}
          onPageChange={setCTablePage}
        />
      </div>

      {/* ══ CUSTOMIZE MODAL ══ */}
      <CustomizeModal />
    </div>
  );
}
