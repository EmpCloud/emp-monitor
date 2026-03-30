import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
    ChevronDown,
    Trash2,
    Plus,
    Settings,
    MapPin,
    Search,
    Download,
    FileText,
    FileSpreadsheet,
    Loader2,
    Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PaginationComponent from "@/components/common/Pagination";
import { useLocationDepartmentStore } from "@/page/protected/admin/location-department/locationDepartmentStore";
import EmpLocationDepartmentLogo from "@/assets/settings/locations-department.svg";

import AddLocationDialog from "@/components/common/location-department/dialog/AddLocationDialog";
import EditLocationDialog from "@/components/common/location-department/dialog/EditLocationDialog";
import AddDeptToLocationDialog from "@/components/common/location-department/dialog/AddDeptToLocationDialog";
import DeleteDeptFromLocationDialog from "@/components/common/location-department/dialog/DeleteDeptFromLocationDialog";
import DeleteLocationDialog from "@/components/common/location-department/dialog/DeleteLocationDialog";
import DeleteDepartmentsDialog from "@/components/common/location-department/dialog/DeleteDepartmentsDialog";

// ─── Badge Colors ───────────────────────────────────────────────────────────

const BADGE_COLORS = [
    { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
    { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" },
    { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
    { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
    { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
    { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
    { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
    { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
];

const getBadgeColor = (index) => BADGE_COLORS[index % BADGE_COLORS.length];

// ─── Debounce Hook ──────────────────────────────────────────────────────────

const useDebounce = (callback, delay) => {
    const timer = useRef(null);
    return useCallback(
        (...args) => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => callback(...args), delay);
        },
        [callback, delay]
    );
};

// ─── Department Badges ──────────────────────────────────────────────────────

const DepartmentBadges = ({ departments, rowIdx }) => {
    const [expanded, setExpanded] = useState(false);
    const visibleCount = 5;
    const visible = expanded ? departments : departments.slice(0, visibleCount);

    return (
        <div className="flex flex-wrap gap-1.5">
            {visible.map((dept, deptIdx) => {
                const color = getBadgeColor(deptIdx + rowIdx);
                return (
                    <span
                        key={dept.department_id}
                        className={`inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border ${color.bg} ${color.text} ${color.border}`}
                    >
                        {dept.name}
                    </span>
                );
            })}
            {departments.length > visibleCount && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-medium border bg-cyan-100 text-cyan-700 border-cyan-200 cursor-pointer hover:bg-cyan-200 transition-colors"
                >
                    {expanded ? "Show Less" : `+${departments.length - visibleCount} More`}
                </button>
            )}
        </div>
    );
};

// ─── Export Dropdown ─────────────────────────────────────────────────────────

const ExportDropdown = () => {
    const [open, setOpen] = useState(false);
    const exportCsv = useLocationDepartmentStore((s) => s.exportCsv);
    const exportPdf = useLocationDepartmentStore((s) => s.exportPdf);

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
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px]">
                        <button
                            onClick={() => { exportPdf(); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors rounded-t-lg"
                        >
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                            Export as PDF
                        </button>
                        <button
                            onClick={() => { exportCsv(); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors rounded-b-lg"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                            Export as Excel
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Action Menu ─────────────────────────────────────────────────────────────

const ActionMenu = ({ location }) => {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const dropdownRef = useRef(null);
    const locationRef = useRef(location);
    locationRef.current = location;

    const [pos, setPos] = useState({ top: 0, left: 0 });

    const handleAction = useCallback((actionType) => {
        setOpen(false);
        const loc = locationRef.current;
        const store = useLocationDepartmentStore.getState();
        switch (actionType) {
            case "edit":
                store.openEditLocationDialog(loc);
                break;
            case "addDept":
                store.openAddDeptDialog(loc.location_id);
                break;
            case "deleteDept":
                store.openDeleteDeptDialog(loc.location_id);
                break;
            case "deleteLocation":
                store.openDeleteLocationDialog(loc.location_id);
                break;
        }
    }, []);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + 4,
                left: rect.right - 200,
            });
        }
        setOpen(!open);
    };

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    return (
        <div className="relative inline-flex">
            <button
                ref={btnRef}
                onClick={handleToggle}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-500 transition-colors"
            >
                <Settings className="w-3.5 h-3.5" />
                <ChevronDown className="w-3 h-3" />
            </button>
            {open && createPortal(
                <div
                    ref={dropdownRef}
                    style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
                    className="bg-white border border-slate-200 rounded-lg shadow-lg min-w-[200px]"
                >
                    <button
                        onClick={() => handleAction("edit")}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors rounded-t-lg"
                    >
                        <Pencil className="w-3.5 h-3.5 text-emerald-500" />
                        Rename Location
                    </button>
                    <button
                        onClick={() => handleAction("addDept")}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5 text-blue-500" />
                        Add Department
                    </button>
                    <button
                        onClick={() => handleAction("deleteDept")}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Department
                    </button>
                    <button
                        onClick={() => handleAction("deleteLocation")}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-red-500 hover:bg-red-50 cursor-pointer transition-colors rounded-b-lg"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Location
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function EmpLocationDepartment() {
    // Store
    const locations = useLocationDepartmentStore((s) => s.locations);
    const loading = useLocationDepartmentStore((s) => s.loading);
    const error = useLocationDepartmentStore((s) => s.error);
    const successMsg = useLocationDepartmentStore((s) => s.successMsg);
    const clearError = useLocationDepartmentStore((s) => s.clearError);
    const clearSuccess = useLocationDepartmentStore((s) => s.clearSuccess);
    const loadInitialData = useLocationDepartmentStore((s) => s.loadInitialData);

    const pagination = useLocationDepartmentStore((s) => s.pagination);
    const setPagination = useLocationDepartmentStore((s) => s.setPagination);
    const search = useLocationDepartmentStore((s) => s.search);
    const setSearch = useLocationDepartmentStore((s) => s.setSearch);


    // Dialogs
    const addLocationDialogOpen = useLocationDepartmentStore((s) => s.addLocationDialogOpen);
    const openAddLocationDialog = useLocationDepartmentStore((s) => s.openAddLocationDialog);
    const closeAddLocationDialog = useLocationDepartmentStore((s) => s.closeAddLocationDialog);

    const editLocationDialogOpen = useLocationDepartmentStore((s) => s.editLocationDialogOpen);
    const closeEditLocationDialog = useLocationDepartmentStore((s) => s.closeEditLocationDialog);

    const addDeptDialogOpen = useLocationDepartmentStore((s) => s.addDeptDialogOpen);
    const closeAddDeptDialog = useLocationDepartmentStore((s) => s.closeAddDeptDialog);

    const deleteDeptDialogOpen = useLocationDepartmentStore((s) => s.deleteDeptDialogOpen);
    const closeDeleteDeptDialog = useLocationDepartmentStore((s) => s.closeDeleteDeptDialog);

    const deleteLocationDialogOpen = useLocationDepartmentStore((s) => s.deleteLocationDialogOpen);
    const closeDeleteLocationDialog = useLocationDepartmentStore((s) => s.closeDeleteLocationDialog);

    const deleteDepartmentsDialogOpen = useLocationDepartmentStore((s) => s.deleteDepartmentsDialogOpen);
    const openDeleteDepartmentsDialog = useLocationDepartmentStore((s) => s.openDeleteDepartmentsDialog);
    const closeDeleteDepartmentsDialog = useLocationDepartmentStore((s) => s.closeDeleteDepartmentsDialog);

    // Load data on mount
    useEffect(() => {
        loadInitialData();
    }, []);

    // Auto-dismiss success message
    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(clearSuccess, 4000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    // Filter + paginate
    const filtered = useMemo(() => {
        if (!search.trim()) return locations;
        const q = search.toLowerCase();
        return locations.filter(
            (loc) =>
                loc.location.toLowerCase().includes(q) ||
                loc.departments.some((d) => d.name.toLowerCase().includes(q))
        );
    }, [locations, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pagination.pageSize));

    const paginated = useMemo(() => {
        const start = (pagination.page - 1) * pagination.pageSize;
        return filtered.slice(start, start + pagination.pageSize);
    }, [filtered, pagination.page, pagination.pageSize]);

    const debouncedSearch = useDebounce((val) => setSearch(val), 300);

    const showingFrom = filtered.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
    const showingTo = Math.min(pagination.page * pagination.pageSize, filtered.length);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* ── Alerts ──────────────────────────────────────────────── */}
            {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={clearError} className="text-red-400 hover:text-red-600 text-xs ml-4">Dismiss</button>
                </div>
            )}
            {successMsg && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center justify-between">
                    <span>{successMsg}</span>
                    <button onClick={clearSuccess} className="text-green-400 hover:text-green-600 text-xs ml-4">Dismiss</button>
                </div>
            )}

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-end gap-1 mr-2">
                        <img alt="location-department" className="w-24 h-24" src={EmpLocationDepartmentLogo} />
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h1 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                            <span className="font-semibold">Manage</span>{" "}
                            <span className="font-normal text-gray-500">Locations & Departments</span>
                        </h1>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                            Create and manage office locations and<br />
                            department structures
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <ExportDropdown />
                    <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-lg text-xs font-semibold gap-1.5"
                        onClick={openDeleteDepartmentsDialog}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Departments
                    </Button>
                    <Button
                        size="sm"
                        className="rounded-lg text-xs font-semibold gap-1.5 bg-[#1e293b] hover:bg-[#0f172a]"
                        onClick={openAddLocationDialog}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Location & Departments
                    </Button>
                </div>
            </div>

            {/* ── Search ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search locations or departments..."
                        defaultValue={search}
                        onChange={(e) => debouncedSearch(e.target.value)}
                        className="pl-9 rounded-lg text-xs h-9"
                    />
                </div>
                <p className="text-xs text-slate-400">
                    {filtered.length} location{filtered.length !== 1 ? "s" : ""} found
                </p>
            </div>

            {/* ── Loading State ────────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-sm text-slate-500">Loading locations...</span>
                </div>
            ) : (
                <>
                    {/* ── Table ─────────────────────────────────────────── */}
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[13px]">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-4 py-3 text-left bg-slate-50/60 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                                                <span className="text-[12px] font-semibold text-slate-600">Location</span>
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left bg-slate-50/60 whitespace-nowrap">
                                            <span className="text-[12px] font-semibold text-slate-600">Department</span>
                                        </th>
                                        <th className="px-4 py-3 bg-slate-50/60" />
                                        <th className="px-4 py-3 text-center text-[12px] font-semibold text-white bg-[#5C6BC0] whitespace-nowrap w-28">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-12 text-sm text-slate-400">
                                                {search ? "No locations match your search" : "No locations found. Add your first location."}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginated.map((row, rowIdx) => (
                                            <tr
                                                key={row.location_id}
                                                className="border-b border-slate-50 transition-colors hover:bg-slate-50/40"
                                            >
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className="text-[13px] text-slate-700 font-medium">
                                                        {row.location}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4" colSpan={2}>
                                                    <DepartmentBadges
                                                        departments={row.departments}
                                                        rowIdx={rowIdx}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <ActionMenu location={row} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
                    </div>

                    {/* ── Pagination ────────────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-3">
                        <p className="text-[12px] text-slate-400">
                            Showing {showingFrom} to {showingTo} of {filtered.length}
                        </p>
                        <PaginationComponent
                            currentPage={pagination.page}
                            totalPages={totalPages}
                            onPageChange={(page) => setPagination("page", page)}
                        />
                    </div>
                </>
            )}

            {/* ── Dialogs ─────────────────────────────────────────────── */}
            <AddLocationDialog
                open={addLocationDialogOpen}
                onOpenChange={(open) => { if (!open) closeAddLocationDialog(); }}
            />
            <EditLocationDialog
                open={editLocationDialogOpen}
                onOpenChange={(open) => { if (!open) closeEditLocationDialog(); }}
            />
            <AddDeptToLocationDialog
                open={addDeptDialogOpen}
                onOpenChange={(open) => { if (!open) closeAddDeptDialog(); }}
            />
            <DeleteDeptFromLocationDialog
                open={deleteDeptDialogOpen}
                onOpenChange={(open) => { if (!open) closeDeleteDeptDialog(); }}
            />
            <DeleteLocationDialog
                open={deleteLocationDialogOpen}
                onOpenChange={(open) => { if (!open) closeDeleteLocationDialog(); }}
            />
            <DeleteDepartmentsDialog
                open={deleteDepartmentsDialogOpen}
                onOpenChange={(open) => { if (!open) closeDeleteDepartmentsDialog(); }}
            />
        </div>
    );
}
