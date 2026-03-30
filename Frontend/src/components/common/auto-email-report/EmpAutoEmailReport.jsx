import React, { useEffect, useCallback, useRef, useState } from "react";
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    Download,
    FileText,
    FileSpreadsheet,
    Loader2,
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import PaginationComponent from "@/components/common/Pagination";
import CreateEditEmailReport from "@/components/common/auto-email-report/dialog/CreateEditEmailReport";
import DeleteReportDialog from "@/components/common/auto-email-report/dialog/DeleteReportDialog";
import { useAutoEmailReportStore } from "@/page/protected/admin/auto-email-report/autoEmailReportStore";
import { getFrequencyLabel, getContentLabels, FILTER_TYPE_MAP } from "@/page/protected/admin/auto-email-report/service";
import EmpAutoEmailReportLogo from "@/assets/reports/email_reports.svg";

// ─── Debounce Hook ───────────────────────────────────────────────────────────

const useDebounce = (callback, delay) => {
    const timer = useRef(null);
    return useCallback((...args) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => callback(...args), delay);
    }, [callback, delay]);
};

// ─── Recipient Cell ──────────────────────────────────────────────────────────

const RecipientCell = ({ recipients }) => {
    const [expanded, setExpanded] = useState(false);
    const list = Array.isArray(recipients) ? recipients : [];
    const visible = expanded ? list : list.slice(0, 3);

    return (
        <div className="space-y-0.5">
            {visible.map((email, i) => (
                <div key={i} className="text-xs text-slate-500 truncate max-w-[200px]" title={email}>
                    {email}
                </div>
            ))}
            {list.length > 3 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[11px] text-blue-500 hover:text-blue-600 font-medium mt-0.5"
                >
                    {expanded ? "Show less" : `+${list.length - 3} more`}
                </button>
            )}
        </div>
    );
};

// ─── Content Badges ──────────────────────────────────────────────────────────

const ContentBadges = ({ content }) => {
    const labels = getContentLabels(content);
    if (labels.length === 0) return <span className="text-xs text-slate-400">-</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {labels.map((label) => (
                <span
                    key={label}
                    className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-medium text-blue-600 border border-blue-100"
                >
                    {label}
                </span>
            ))}
        </div>
    );
};

// ─── Export Dropdown ─────────────────────────────────────────────────────────

const ExportDropdown = () => {
    const [open, setOpen] = useState(false);
    const exportCsv = useAutoEmailReportStore((s) => s.exportCsv);
    const exportPdf = useAutoEmailReportStore((s) => s.exportPdf);

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-slate-200 text-xs gap-1.5"
                onClick={() => setOpen(!open)}
            >
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[140px] py-1">
                        <button
                            onClick={() => { exportPdf(); setOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                            Export PDF
                        </button>
                        <button
                            onClick={() => { exportCsv(); setOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                            Export Excel
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EmpAutoEmailReport() {
    // ── Store ────────────────────────────────────────────────────────────
    const reports = useAutoEmailReportStore((s) => s.reports);
    const totalCount = useAutoEmailReportStore((s) => s.totalCount);
    const loading = useAutoEmailReportStore((s) => s.loading);
    const tableLoading = useAutoEmailReportStore((s) => s.tableLoading);
    const pagination = useAutoEmailReportStore((s) => s.pagination);
    const search = useAutoEmailReportStore((s) => s.search);
    const dialogOpen = useAutoEmailReportStore((s) => s.dialogOpen);
    const deleteDialogOpen = useAutoEmailReportStore((s) => s.deleteDialogOpen);
    const error = useAutoEmailReportStore((s) => s.error);

    const setSearch = useAutoEmailReportStore((s) => s.setSearch);
    const setPagination = useAutoEmailReportStore((s) => s.setPagination);
    const fetchReports = useAutoEmailReportStore((s) => s.fetchReports);
    const openCreateDialog = useAutoEmailReportStore((s) => s.openCreateDialog);
    const openEditDialog = useAutoEmailReportStore((s) => s.openEditDialog);
    const closeDialog = useAutoEmailReportStore((s) => s.closeDialog);
    const openDeleteDialog = useAutoEmailReportStore((s) => s.openDeleteDialog);
    const closeDeleteDialog = useAutoEmailReportStore((s) => s.closeDeleteDialog);
    const loadInitialData = useAutoEmailReportStore((s) => s.loadInitialData);
    const clearError = useAutoEmailReportStore((s) => s.clearError);

    // ── Local State ──────────────────────────────────────────────────────
    const [sortColumn, setSortColumn] = useState("");
    const [sortOrder, setSortOrder] = useState("");

    // ── Load data on mount ───────────────────────────────────────────────
    useEffect(() => {
        loadInitialData();
    }, []);

    // ── Fetch when pagination/search changes ─────────────────────────────
    useEffect(() => {
        fetchReports();
    }, [pagination.page, pagination.pageSize, pagination.sortColumn, pagination.sortOrder]);

    // ── Debounced search ─────────────────────────────────────────────────
    const debouncedFetch = useDebounce(() => fetchReports(), 400);

    const handleSearchChange = (value) => {
        setSearch(value);
        debouncedFetch();
    };

    // ── Sort ─────────────────────────────────────────────────────────────
    const handleSort = (column) => {
        const newOrder = sortColumn === column && sortOrder === "A" ? "D" : "A";
        setSortColumn(column);
        setSortOrder(newOrder);
        setPagination("sortColumn", column);
        setPagination("sortOrder", newOrder);
    };

    // ── Derived ──────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
    const currentPage = Math.min(pagination.page, totalPages);
    const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * pagination.pageSize + 1;
    const showingTo = Math.min(currentPage * pagination.pageSize, totalCount);

    // ── Sort icon ────────────────────────────────────────────────────────
    const SortIcon = ({ column }) => {
        if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
        return sortOrder === "A"
            ? <ChevronUp className="w-3 h-3 text-blue-500 ml-1 inline" />
            : <ChevronDown className="w-3 h-3 text-blue-500 ml-1 inline" />;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-sm text-slate-500">Loading email reports...</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* ── Error Banner ──────────────────────────────────────────── */}
            {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={clearError} className="text-red-400 hover:text-red-600 text-xs ml-4">Dismiss</button>
                </div>
            )}

            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-1">
                    <div className="flex items-end gap-1 mr-2">
                        <img alt="email reports" className="w-24 h-24" src={EmpAutoEmailReportLogo} />
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                            <span className="font-semibold">Email</span>{" "}
                            <span className="font-normal text-gray-500">Reports</span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
                            Configure automated scheduled report delivery via email
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ExportDropdown />
                    <Button
                        size="lg"
                        className="rounded-xl px-6 text-xs font-semibold shadow-md shadow-blue-200 bg-gradient-to-r from-[#42A5F5] to-[#5C6BC0] hover:shadow-lg transition-all"
                        onClick={openCreateDialog}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Create New Report
                    </Button>
                </div>
            </div>

            {/* ── Show Entries + Search ─────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-gray-500 font-medium">Show</span>
                    <Select
                        value={String(pagination.pageSize)}
                        onValueChange={(v) => {
                            setPagination("pageSize", parseInt(v, 10));
                            setPagination("page", 1);
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

                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
                    />
                </div>
            </div>

            {/* ── Table ────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50 relative">
                {tableLoading && (
                    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                )}

                <table className="min-w-[800px] w-full">
                    <thead>
                        <tr className="bg-blue-50/80">
                            <th
                                className="px-4 py-3 text-xs font-semibold text-slate-700 text-left cursor-pointer select-none"
                                onClick={() => handleSort("Name")}
                            >
                                Title <SortIcon column="Name" />
                            </th>
                            <th
                                className="px-4 py-3 text-xs font-semibold text-slate-700 text-left cursor-pointer select-none"
                                onClick={() => handleSort("Frequency")}
                            >
                                Frequency <SortIcon column="Frequency" />
                            </th>
                            <th
                                className="px-4 py-3 text-xs font-semibold text-slate-700 text-left cursor-pointer select-none"
                                onClick={() => handleSort("Recipients")}
                            >
                                Recipients <SortIcon column="Recipients" />
                            </th>
                            <th
                                className="px-4 py-3 text-xs font-semibold text-slate-700 text-left cursor-pointer select-none"
                                onClick={() => handleSort("Filter Type")}
                            >
                                Content <SortIcon column="Filter Type" />
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                                Filter
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center bg-slate-200/60">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center text-sm text-gray-400 py-16">
                                    <div className="flex flex-col items-center gap-2">
                                        <FileText className="w-10 h-10 text-slate-200" />
                                        <p>No email reports found</p>
                                        <button
                                            onClick={openCreateDialog}
                                            className="text-xs text-blue-500 hover:text-blue-600 font-medium mt-1"
                                        >
                                            Create your first report
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            reports.map((report) => (
                                <tr
                                    key={report.id}
                                    className="border-b border-slate-100 last:border-b-0 text-xs text-slate-600"
                                >
                                    <td className="px-4 py-4 font-medium text-slate-700">
                                        {report.name}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                            Number(report.frequency) === 1 ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                                            Number(report.frequency) === 2 ? "bg-blue-50 text-blue-600 border border-blue-200" :
                                            Number(report.frequency) === 3 || Number(report.frequency) === 7 ? "bg-cyan-50 text-cyan-600 border border-cyan-200" :
                                            "bg-amber-50 text-amber-600 border border-amber-200"
                                        }`}>
                                            {getFrequencyLabel(report.frequency)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <RecipientCell recipients={report.recipients} />
                                    </td>
                                    <td className="px-4 py-4">
                                        <ContentBadges content={report.content} />
                                    </td>
                                    <td className="px-4 py-4 text-xs text-slate-500">
                                        {FILTER_TYPE_MAP[report.filter_type] || "Organization"}
                                    </td>
                                    <td className="px-4 py-4 bg-slate-50/50">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openEditDialog(report.id)}
                                                className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors"
                                                title="Edit report"
                                            >
                                                <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                                            </button>
                                            <button
                                                onClick={() => openDeleteDialog(report.id)}
                                                className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                                                title="Delete report"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Bottom accent ─────────────────────────────────────────── */}
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-blue-300 to-transparent mt-0" />

            {/* ── Pagination ────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5">
                <p className="text-[13px] text-gray-500 font-medium">
                    Showing{" "}
                    <span className="font-bold text-gray-700">{showingFrom}</span> to{" "}
                    <span className="font-bold text-gray-700">{showingTo}</span> of{" "}
                    <span className="font-bold text-blue-600">{totalCount}</span>
                </p>
                <PaginationComponent
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(p) => setPagination("page", p)}
                />
            </div>

            {/* ── Dialogs ──────────────────────────────────────────────── */}
            <CreateEditEmailReport
                open={dialogOpen}
                onOpenChange={(open) => { if (!open) closeDialog(); }}
            />
            <DeleteReportDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}
            />
        </div>
    );
}
