import { useState, useEffect, useRef, useCallback } from "react";

/** Shared download format options for DLP pages. Call inside a component with t from useTranslation. */
export const getDownloadOptions = (t) => [
  { label: t("usbDetection.selectOption"), value: "all" },
  { label: "PDF", value: "pdf" },
  { label: "Excel", value: "excel" },
];

/**
 * Custom hook that encapsulates all shared DLP filter/pagination behavior.
 *
 * @param {Object} store - Zustand store slice (from useXxxStore())
 * @param {string[]} [extraDeps] - Additional filter keys to watch for re-fetch
 * @returns {Object} Computed values and handlers for the DLP component
 */
export const useDlpFilters = (store, extraDeps = []) => {
    const {
        rows, totalDocs, filters, setFilters,
        loadInitialData, fetchLogs,
        fetchDepartmentsByLocation, fetchEmployeesByFilters,
        exportCsv, exportPdf,
    } = store;

    const [search, setSearch] = useState("");
    const [downloadOption, setDownloadOption] = useState("all");
    const initialLoad = useRef(true);
    const debounceTimer = useRef(null);

    const handleDateRangeChange = useCallback((startDate, endDate) => {
        if (!startDate || !endDate) return;
        setFilters({ startDate, endDate, skip: 0, page: 1 });
    }, [setFilters]);

    // Initial load
    useEffect(() => {
        loadInitialData();
    }, []);

    // Debounce search
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setFilters({ searchText: search, skip: 0, page: 1 });
        }, 400);
        return () => clearTimeout(debounceTimer.current);
    }, [search]);

    // Re-fetch when filters change (skip initial mount)
    const baseDeps = [
        filters.locationId, filters.departmentId, filters.employeeId,
        filters.startDate, filters.endDate, filters.searchText,
        filters.skip, filters.limit, filters.sortName, filters.sortOrder,
    ];
    const watchedDeps = [...baseDeps, ...extraDeps.map((k) => filters[k])];

    useEffect(() => {
        if (initialLoad.current) {
            initialLoad.current = false;
            return;
        }
        fetchLogs();
    }, watchedDeps);

    // Computed
    const totalPages = Math.max(1, Math.ceil(totalDocs / filters.limit));
    const currentPage = filters.page;

    // Handlers
    const handleLocationChange = useCallback((value) => {
        setFilters({ locationId: value, departmentId: "all", employeeId: "all", skip: 0, page: 1 });
        fetchDepartmentsByLocation(value);
        fetchEmployeesByFilters();
    }, [setFilters, fetchDepartmentsByLocation, fetchEmployeesByFilters]);

    const handleDepartmentChange = useCallback((value) => {
        setFilters({ departmentId: value, employeeId: "all", skip: 0, page: 1 });
        fetchEmployeesByFilters();
    }, [setFilters, fetchEmployeesByFilters]);

    const handleEmployeeChange = useCallback((value) => {
        setFilters({ employeeId: value, skip: 0, page: 1 });
    }, [setFilters]);

    const handlePageSizeChange = useCallback((value) => {
        const num = parseInt(value, 10);
        setFilters({ limit: Number.isNaN(num) ? 10 : num, skip: 0, page: 1 });
    }, [setFilters]);

    const handlePageChange = useCallback((p) => {
        setFilters({ page: p, skip: (p - 1) * filters.limit });
    }, [setFilters, filters.limit]);

    const handleDownload = useCallback((value) => {
        setDownloadOption(value);
        if (value === "pdf" || value === "excel") {
            if (rows.length === 0) {
                alert("No data available to download.");
                setTimeout(() => setDownloadOption("all"), 100);
                return;
            }
            if (value === "pdf") exportPdf();
            else exportCsv();
        }
        setTimeout(() => setDownloadOption("all"), 500);
    }, [exportPdf, exportCsv, rows.length]);

    return {
        search, setSearch,
        downloadOption,
        handleDateRangeChange,
        totalPages, currentPage,
        handleLocationChange,
        handleDepartmentChange,
        handleEmployeeChange,
        handlePageSizeChange,
        handlePageChange,
        handleDownload,
    };
};
