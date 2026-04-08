import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next";
import {
    Search,
    Pencil,
    Trash2,
    Download,
    ChevronDown,
    FileText,
    FileSpreadsheet,
    FileDown,
    Loader2,
} from "lucide-react"
import PaginationComponent from "@/components/common/Pagination"
import CreateShift from "@/components/common/shift-management/dialog/CreateShift"
import DeleteShiftDialog from "@/components/common/shift-management/dialog/DeleteShiftDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ShowEntries from "@/components/common/elements/ShowEntries"
import EmpShiftManagementLogo from "@/assets/settings/shift-management.svg"
import { useShiftManagementStore } from "@/page/protected/admin/shift-management/shiftManagementStore"

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_LABELS = {
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu",
    fri: "Fri", sat: "Sat", sun: "Sun",
}

const COLOR_CLASSES = {
    1: "bg-emerald-500",   // green
    2: "bg-yellow-400",    // yellow
    3: "bg-red-500",       // red
    4: "bg-blue-600",      // blue
    5: "bg-gray-800",      // black
    6: "bg-sky-400",       // light blue
}

// ─── Debounce Hook ──────────────────────────────────────────────────────────

const useDebounce = (callback, delay) => {
    const timer = useRef(null)
    return useCallback(
        (...args) => {
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => callback(...args), delay)
        },
        [callback, delay]
    )
}

// ─── Export Dropdown ────────────────────────────────────────────────────────

const ExportDropdown = () => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false)
    const exportExcel = useShiftManagementStore((s) => s.exportExcel)
    const exportCsv = useShiftManagementStore((s) => s.exportCsv)
    const exportPdf = useShiftManagementStore((s) => s.exportPdf)

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
                <ChevronDown className="w-3 h-3" />
            </Button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[170px]">
                        <button
                            onClick={() => { exportPdf(); setOpen(false) }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors rounded-t-lg"
                        >
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                            {t("shift.exportPdf")}
                        </button>
                        <button
                            onClick={() => { exportExcel(); setOpen(false) }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                            {t("shift.exportExcel")}
                        </button>
                        <button
                            onClick={() => { exportCsv(); setOpen(false) }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors rounded-b-lg"
                        >
                            <FileDown className="w-3.5 h-3.5 text-blue-500" />
                            {t("shift.exportCsv")}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

// ─── Days Cell ──────────────────────────────────────────────────────────────

const DaysCell = ({ data }) => {
    const days = data && typeof data === "object" ? Object.keys(data) : []
    if (days.length === 0) return <span className="text-slate-400">--</span>
    return (
        <div className="flex flex-wrap gap-1">
            {days.map((day) => (
                <span
                    key={day}
                    className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-semibold text-blue-600 border border-blue-100"
                >
                    {DAY_LABELS[day] || day}
                </span>
            ))}
        </div>
    )
}

// ─── Time Cell ──────────────────────────────────────────────────────────────

const getFirstTime = (data, field) => {
    if (!data || typeof data !== "object") return "--"
    const entries = Object.values(data)
    if (entries.length === 0) return "--"
    return entries[0]?.time?.[field] || "--"
}

// ─── Main Component ────────────────────────────────────────────────────────

const EmpShiftManagement = () => {
    const { t } = useTranslation();
    const {
        shifts,
        totalCount,
        loading,
        error,
        successMsg,
        pagination,
        search,
        createDialogOpen,
        editDialogOpen,
        editShiftData,
        deleteDialogOpen,
        deleting,
        setSearch,
        clearError,
        clearSuccess,
        openCreateDialog,
        openEditDialog,
        openDeleteDialog,
        closeDeleteDialog,
        confirmDeleteShift,
        loadInitialData,
        changePage,
        changePageSize,
    } = useShiftManagementStore()

    // Load data on mount
    useEffect(() => {
        loadInitialData()
    }, [loadInitialData])

    // Auto-dismiss alerts
    useEffect(() => {
        if (successMsg) {
            const t = setTimeout(() => clearSuccess(), 4000)
            return () => clearTimeout(t)
        }
    }, [successMsg, clearSuccess])

    useEffect(() => {
        if (error) {
            const t = setTimeout(() => clearError(), 4000)
            return () => clearTimeout(t)
        }
    }, [error, clearError])

    // Client-side search filtering
    const filteredShifts = useMemo(() => {
        if (!search) return shifts
        const q = search.toLowerCase()
        return shifts.filter((s) => s.name?.toLowerCase().includes(q))
    }, [shifts, search])

    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize))
    const currentPage = Math.min(pagination.page, totalPages)

    const debouncedSearch = useDebounce((value) => {
        setSearch(value)
    }, 300)

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* Success Alert */}
            {successMsg && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center justify-between">
                    <span>{successMsg}</span>
                    <button onClick={clearSuccess} className="text-emerald-500 hover:text-emerald-700 text-lg leading-none">&times;</button>
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={clearError} className="text-red-500 hover:text-red-700 text-lg leading-none">&times;</button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-1">
                    <div className="flex items-end gap-1 mr-2">
                        <img alt="shift management" className="w-24 h-24" src={EmpShiftManagementLogo} />
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                            <span className="font-semibold">{t("shift.title")}</span>{" "}
                            <span className="font-normal text-gray-500">{t("shift.management")}</span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
                            {t("shift.description")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ExportDropdown />
                    <Button
                        size="lg"
                        className="rounded-xl bg-violet-500 hover:bg-violet-600 px-6 text-xs font-semibold shadow-sm"
                        onClick={openCreateDialog}
                    >
                        {t("shift.createShift")}
                    </Button>
                </div>
            </div>

            {/* Show entries + Search */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <ShowEntries value={pagination.pageSize} onChange={(v) => {
                            const num = parseInt(v, 10)
                            changePageSize(Number.isNaN(num) ? 10 : num)
                        }} />

                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder={t("search")}
                        defaultValue={search}
                        onChange={(e) => debouncedSearch(e.target.value)}
                        className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                    </div>
                ) : (
                    <table className="min-w-[700px] w-full">
                        <thead>
                            <tr className="bg-blue-50/80">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                                    {t("shift.shiftName")}
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                                    {t("shift.days")}
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                                    {t("shift.startTime")}
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                                    {t("shift.endTime")}
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center bg-slate-200/60">
                                    {t("action")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {filteredShifts.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center text-sm text-gray-400 py-10"
                                    >
                                        {t("Nodata")}
                                    </td>
                                </tr>
                            ) : (
                                filteredShifts.map((row) => {
                                    const startTime = getFirstTime(row.data, "start")
                                    const endTime = getFirstTime(row.data, "end")

                                    return (
                                        <tr
                                            key={row.id}
                                            className="border-b border-slate-100 last:border-b-0 text-xs text-slate-600"
                                        >
                                            {/* Shift Name with color indicator */}
                                            <td className="px-4 py-4 font-medium text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_CLASSES[row.color_code] || "bg-blue-600"}`} />
                                                    {row.name}
                                                </div>
                                            </td>

                                            {/* Days */}
                                            <td className="px-4 py-4">
                                                <DaysCell data={row.data} />
                                            </td>

                                            {/* Start Time */}
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-600">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    {startTime}
                                                </span>
                                            </td>

                                            {/* End Time */}
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-semibold text-red-500">
                                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                                    {endTime}
                                                </span>
                                            </td>

                                            {/* Action */}
                                            <td className="px-4 py-4 bg-slate-50/50">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditDialog(row.id)}
                                                        title={t("shift.editShift")}
                                                        className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteDialog(row.id)}
                                                        title={t("shift.deleteShift")}
                                                        className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5">
                <p className="text-[13px] text-gray-500 font-medium">
                    {t("timeclaim.showing")}{" "}
                    <span className="font-bold text-gray-700">
                        {totalCount === 0 ? 0 : (currentPage - 1) * pagination.pageSize + 1}
                    </span>{" "}
                    {t("to")}{" "}
                    <span className="font-bold text-gray-700">
                        {Math.min(currentPage * pagination.pageSize, totalCount)}
                    </span>{" "}
                    {t("of")}{" "}
                    <span className="font-bold text-blue-600">
                        {totalCount}
                    </span>
                </p>
                <PaginationComponent
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(p) => changePage(p)}
                />
            </div>

            {/* Create Shift Dialog */}
            <CreateShift mode="create" />

            {/* Edit Shift Dialog */}
            <CreateShift mode="edit" />

            {/* Delete Shift Dialog */}
            <DeleteShiftDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => { if (!open) closeDeleteDialog() }}
                onConfirm={confirmDeleteShift}
                deleting={deleting}
            />
        </div>
    )
}

export default EmpShiftManagement
