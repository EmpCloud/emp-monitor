import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Info, ArrowUp, ArrowDown } from "lucide-react";
import PaginationComponent from "@/components/common/Pagination";
import CustomSelect from "@/components/common/elements/CustomSelect";
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar";
import { Input } from "@/components/ui/input";
import ShowEntries from "@/components/common/elements/ShowEntries";
import EmpAlertNotificationLogo from "@/assets/behavior/alert-notifs.svg";
import { useAlertNotificationStore } from "@/page/protected/admin/alert-notification/alertNotificationStore";

const getSortableColumns = (t) => [
    { key: "datetime", label: t("alert_date_time") },
    { key: "employee", label: t("employee") },
    { key: "computer", label: t("alert_emp_code") },
    { key: "policy", label: t("alert_rule_name") },
    { key: "behavior_rule", label: t("alert_triggered_point") },
    { key: "action", label: t("alert_action") },
    { key: "risk_level", label: t("alert_risk_level") },
];

const SortHeader = ({ column, currentSort, currentOrder, onSort }) => (
    <th
        className="px-4 py-3 text-xs font-semibold text-slate-700 text-left cursor-pointer select-none hover:bg-cyan-100/50 transition-colors"
        onClick={() => onSort(column.key)}
    >
        <div className="flex items-center gap-1">
            {column.label}
            <span className="text-slate-300">
                {currentSort === column.key ? (
                    currentOrder === "D" ? (
                        <ArrowDown className="w-3 h-3 text-blue-500" />
                    ) : (
                        <ArrowUp className="w-3 h-3 text-blue-500" />
                    )
                ) : (
                    <ArrowUp className="w-3 h-3" />
                )}
            </span>
        </div>
    </th>
);

const EmpAlertNotification = () => {
    const { t } = useTranslation();
    const SORTABLE_COLUMNS = useMemo(() => getSortableColumns(t), [t]);
    const rows = useAlertNotificationStore((s) => s.rows);
    const totalCount = useAlertNotificationStore((s) => s.totalCount);
    const locations = useAlertNotificationStore((s) => s.locations);
    const departments = useAlertNotificationStore((s) => s.departments);
    const employees = useAlertNotificationStore((s) => s.employees);
    const filters = useAlertNotificationStore((s) => s.filters);
    const pagination = useAlertNotificationStore((s) => s.pagination);
    const loading = useAlertNotificationStore((s) => s.loading);
    const tableLoading = useAlertNotificationStore((s) => s.tableLoading);
    const error = useAlertNotificationStore((s) => s.error);
    const setFilter = useAlertNotificationStore((s) => s.setFilter);
    const setPagination = useAlertNotificationStore((s) => s.setPagination);
    const loadInitialData = useAlertNotificationStore((s) => s.loadInitialData);
    const fetchAlerts = useAlertNotificationStore((s) => s.fetchAlerts);
    const fetchDepartmentsByLocation = useAlertNotificationStore((s) => s.fetchDepartmentsByLocation);
    const fetchEmployeesByFilters = useAlertNotificationStore((s) => s.fetchEmployeesByFilters);
    const handleSort = useAlertNotificationStore((s) => s.handleSort);

    const [search, setSearch] = useState("");
    const initialLoad = useRef(true);
    const debounceTimer = useRef(null);
    useEffect(() => {
        loadInitialData();
    }, []);

    const handleDateRangeChange = useCallback((start, end) => {
        if (!start || !end) return;
        setFilter("startDate", start);
        setFilter("endDate", end);
    }, [setFilter]);

    // Debounced search
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setFilter("search", search), 400);
        return () => clearTimeout(debounceTimer.current);
    }, [search]);

    // Re-fetch on filter/pagination change
    useEffect(() => {
        if (initialLoad.current) {
            initialLoad.current = false;
            return;
        }
        fetchAlerts();
    }, [
        filters.location, filters.department, filters.employee,
        filters.startDate, filters.endDate, filters.search,
        pagination.page, pagination.pageSize,
        pagination.sortColumn, pagination.sortOrder,
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

    const handleLocationChange = useCallback((v) => {
        setFilter("location", v);
        setFilter("department", "all");
        setFilter("employee", "all");
        fetchDepartmentsByLocation(v);
        fetchEmployeesByFilters(v, "all");
    }, [setFilter, fetchDepartmentsByLocation, fetchEmployeesByFilters]);

    const handleDepartmentChange = useCallback((v) => {
        setFilter("department", v);
        setFilter("employee", "all");
        fetchEmployeesByFilters(filters.location, v);
    }, [setFilter, fetchEmployeesByFilters, filters.location]);

    const handleEmployeeChange = useCallback((v) => {
        setFilter("employee", v);
    }, [setFilter]);

    const handlePageSizeChange = useCallback((v) => {
        setPagination("pageSize", parseInt(v, 10) || 10);
        setPagination("page", 1);
    }, [setPagination]);

    const handlePageChange = useCallback((p) => {
        setPagination("page", p);
    }, [setPagination]);

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
                <div className="w-20 h-20 flex items-center justify-center">
                    <video src="/src/assets/ai.webm" autoPlay loop playsInline muted className="w-full h-full object-contain" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
                <div className="border-l-2 border-blue-500 pl-4">
                    <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                        <span className="font-semibold">{t("alert_title")}</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
                        {t("alert_description")}
                    </p>
                </div>
                <div className="flex items-end gap-1 mr-2">
                    <img alt="alerts" className="w-20" src={EmpAlertNotificationLogo} />
                </div>
            </div>

            {error && (
                <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 mb-9">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("alert_locations")}</label>
                    <CustomSelect placeholder="All Locations" items={locations} selected={filters.location} onChange={handleLocationChange} width="full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("alert_departments")}</label>
                    <CustomSelect placeholder="All Departments" items={departments} selected={filters.department} onChange={handleDepartmentChange} width="full" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("alert_employees")}</label>
                    <CustomSelect placeholder="All Employees" items={employees} selected={filters.employee} onChange={handleEmployeeChange} width="full" />
                </div>
                <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1.5">
                        {t("alert_date_ranges")} <Info className="w-3.5 h-3.5 text-blue-500" />
                    </label>
                    <DateRangeCalendar
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onChange={handleDateRangeChange}
                    />
                </div>
            </div>

            {/* Show entries + Search */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
                <ShowEntries value={pagination.pageSize} onChange={handlePageSizeChange} />
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder={t("search")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
                <table className="min-w-[900px] w-full">
                    <thead>
                        <tr className="bg-[#CADDFF]">
                            {SORTABLE_COLUMNS.map((col) => (
                                <SortHeader
                                    key={col.key}
                                    column={col}
                                    currentSort={pagination.sortColumn}
                                    currentOrder={pagination.sortOrder}
                                    onSort={handleSort}
                                />
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {tableLoading ? (
                            <tr>
                                <td colSpan={7} className="text-center text-sm text-gray-400 py-10">{t("loadingText")}</td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center text-sm text-gray-400 py-10">{t("alert_no_data")}</td>
                            </tr>
                        ) : (
                            rows.map((row, idx) => (
                                <tr key={`${row.id}-${idx}`} className="border-b border-slate-100 last:border-b-0 text-xs text-slate-600">
                                    <td className="px-4 py-4">{row.dateTime}</td>
                                    <td className="px-4 py-4">{row.employee}</td>
                                    <td className="px-4 py-4">{row.employeeCode}</td>
                                    <td className="px-4 py-4">{row.ruleName}</td>
                                    <td className="px-4 py-4">{row.alertTriggeredPoint}</td>
                                    <td className="px-4 py-4">{row.action}</td>
                                    <td className="px-4 py-4" style={{ borderLeft: `4px solid ${row.riskColor}` }}>
                                        {row.riskLevel}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5 pt-10">
                <p className="text-[13px] text-gray-500 font-medium">
                    {t("timeclaim.showing")} <span className="font-bold text-gray-700">{totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}</span>{" "}
                    {t("to")} <span className="font-bold text-gray-700">{Math.min(pagination.page * pagination.pageSize, totalCount)}</span>{" "}
                    {t("of")} <span className="font-bold text-blue-600">{totalCount}</span>
                </p>
                <PaginationComponent currentPage={pagination.page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
        </div>
    );
};

export default EmpAlertNotification;
