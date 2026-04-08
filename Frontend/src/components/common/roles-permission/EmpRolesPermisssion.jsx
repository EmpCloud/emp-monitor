import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
    Search,
    Plus,
    Settings,
    Pencil,
    Trash2,
    Eye,
    Copy,
    Download,
    ChevronDown,
    FileText,
    FileSpreadsheet,
    FileDown,
    Loader2,
} from "lucide-react";
import PaginationComponent from "@/components/common/Pagination";
import CustomSelect from "@/components/common/elements/CustomSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import ShowEntries from "@/components/common/elements/ShowEntries";
import EmpRolesPermissionLogo from "@/assets/settings/roles-permissions.svg";
import { useRolesPermissionStore } from "@/page/protected/admin/roles-permissions/rolesPermissionStore";

import AddRoleDialog from "@/components/common/roles-permission/dialog/AddRoleDialog";
import EditRoleDialog from "@/components/common/roles-permission/dialog/EditRoleDialog";
import DeleteRoleDialog from "@/components/common/roles-permission/dialog/DeleteRoleDialog";
import CloneRoleDialog from "@/components/common/roles-permission/dialog/CloneRoleDialog";
import ViewRoleDialog from "@/components/common/roles-permission/dialog/ViewRoleDialog";
import PermissionSettingsDialog from "@/components/common/roles-permission/dialog/PermissionSettingsDialog";

// ─── Constants ──────────────────────────────────────────────────────────────

const MODULE_OPTIONS = [
    { label: "EMP Monitor", value: "1" },
    { label: "HRMS", value: "2" },
];

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

// ─── Export Dropdown ────────────────────────────────────────────────────────

const ExportDropdown = () => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const exportExcel = useRolesPermissionStore((s) => s.exportExcel);
    const exportCsv = useRolesPermissionStore((s) => s.exportCsv);
    const exportPdf = useRolesPermissionStore((s) => s.exportPdf);

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-slate-200 text-xs gap-1.5"
                onClick={() => setOpen(!open)}
            >
                <Download className="w-3.5 h-3.5" />
                {t("common.export")}
                <ChevronDown className="w-3 h-3" />
            </Button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[170px]">
                        <button
                            onClick={() => { exportPdf(); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors rounded-t-lg"
                        >
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                            {t("roles.exportAsPdf")}
                        </button>
                        <button
                            onClick={() => { exportExcel(); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                            {t("roles.exportAsExcel")}
                        </button>
                        <button
                            onClick={() => { exportCsv(); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors rounded-b-lg"
                        >
                            <FileDown className="w-3.5 h-3.5 text-blue-500" />
                            {t("roles.exportAsCsv")}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Action Buttons ─────────────────────────────────────────────────────────

const ActionButtons = ({ role }) => {
    const isDefaultRole = role.type === 1;

    const handleEdit = () => useRolesPermissionStore.getState().openEditRoleDialog(role.id);
    const handleDelete = () => useRolesPermissionStore.getState().openDeleteRoleDialog(role.id);
    const handleClone = () => useRolesPermissionStore.getState().openCloneRoleDialog(role.id);
    const handlePermissions = () => useRolesPermissionStore.getState().openPermissionDialog(role.id);
    const handleView = () => useRolesPermissionStore.getState().openViewRoleDialog(role.id);

    return (
        <div className="flex items-center justify-center gap-1.5">
            {!isDefaultRole && (
                <>
                    <button
                        onClick={handleEdit}
                        title="Edit"
                        className="w-7 h-7 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center transition-colors"
                    >
                        <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                    <button
                        onClick={handleDelete}
                        title="Delete"
                        className="w-7 h-7 rounded-md bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                    <button
                        onClick={handleClone}
                        title="Clone"
                        className="w-7 h-7 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center justify-center transition-colors"
                    >
                        <Copy className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                </>
            )}
            <button
                onClick={handlePermissions}
                title="Permission Settings"
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center transition-colors"
            >
                <Settings className="w-3.5 h-3.5 text-blue-600" />
            </button>
            <button
                onClick={handleView}
                title="View Details"
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center transition-colors"
            >
                <Eye className="w-3.5 h-3.5 text-slate-600" />
            </button>
        </div>
    );
};

// ─── Location & Department Formatters ───────────────────────────────────────

const LocationCell = ({ role }) => {
    const { t } = useTranslation();
    if (role.locations?.length > 0) {
        return (
            <div className="flex flex-wrap gap-1">
                {role.locations.map((loc, i) => (
                    <span key={i} className="text-xs">{loc.location}{i < role.locations.length - 1 ? "," : ""}</span>
                ))}
            </div>
        );
    }
    return <span className="text-xs text-slate-400">{t("roles.all")}</span>;
};

const DepartmentCell = ({ role }) => {
    const { t } = useTranslation();
    const depts = [];

    if (role.departments?.length > 0) {
        role.departments.forEach((d) => depts.push(d.department));
    } else if (role.locations?.length > 0) {
        let hasDepts = false;
        role.locations.forEach((loc) => {
            if (loc.departments?.length > 0) {
                hasDepts = true;
                loc.departments.forEach((d) => {
                    if (d.department) depts.push(`${d.department} (${d.location})`);
                });
            }
        });
        if (!hasDepts) return <span className="text-xs text-slate-400">{t("roles.all")}</span>;
    } else {
        return <span className="text-xs text-slate-400">{t("roles.all")}</span>;
    }

    if (depts.length === 0) return <span className="text-xs text-slate-400">All</span>;

    const visible = depts.slice(0, 3);
    const remaining = depts.length - 3;

    return (
        <div className="flex flex-wrap gap-1">
            {visible.map((d, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {d}
                </span>
            ))}
            {remaining > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
                    +{remaining} {t("roles.more")}
                </span>
            )}
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const EmpRolesPermission = () => {
    const { t } = useTranslation();
    const roles = useRolesPermissionStore((s) => s.roles);
    const totalCount = useRolesPermissionStore((s) => s.totalCount);
    const loading = useRolesPermissionStore((s) => s.loading);
    const error = useRolesPermissionStore((s) => s.error);
    const successMsg = useRolesPermissionStore((s) => s.successMsg);
    const clearError = useRolesPermissionStore((s) => s.clearError);
    const clearSuccess = useRolesPermissionStore((s) => s.clearSuccess);
    const loadInitialData = useRolesPermissionStore((s) => s.loadInitialData);

    const pagination = useRolesPermissionStore((s) => s.pagination);
    const search = useRolesPermissionStore((s) => s.search);
    const setSearch = useRolesPermissionStore((s) => s.setSearch);
    const changePage = useRolesPermissionStore((s) => s.changePage);
    const changePageSize = useRolesPermissionStore((s) => s.changePageSize);

    const selectedModule = useRolesPermissionStore((s) => s.selectedModule);
    const setSelectedModule = useRolesPermissionStore((s) => s.setSelectedModule);

    const toggleRWDPermission = useRolesPermissionStore((s) => s.toggleRWDPermission);
    const toggleHRMS = useRolesPermissionStore((s) => s.toggleHRMS);

    // Dialogs
    const addRoleDialogOpen = useRolesPermissionStore((s) => s.addRoleDialogOpen);
    const openAddRoleDialog = useRolesPermissionStore((s) => s.openAddRoleDialog);
    const closeAddRoleDialog = useRolesPermissionStore((s) => s.closeAddRoleDialog);

    const editRoleDialogOpen = useRolesPermissionStore((s) => s.editRoleDialogOpen);
    const closeEditRoleDialog = useRolesPermissionStore((s) => s.closeEditRoleDialog);

    const deleteRoleDialogOpen = useRolesPermissionStore((s) => s.deleteRoleDialogOpen);
    const closeDeleteRoleDialog = useRolesPermissionStore((s) => s.closeDeleteRoleDialog);

    const cloneRoleDialogOpen = useRolesPermissionStore((s) => s.cloneRoleDialogOpen);
    const closeCloneRoleDialog = useRolesPermissionStore((s) => s.closeCloneRoleDialog);

    const viewRoleDialogOpen = useRolesPermissionStore((s) => s.viewRoleDialogOpen);
    const closeViewRoleDialog = useRolesPermissionStore((s) => s.closeViewRoleDialog);

    const permissionDialogOpen = useRolesPermissionStore((s) => s.permissionDialogOpen);
    const closePermissionDialog = useRolesPermissionStore((s) => s.closePermissionDialog);

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

    const isHRMS = selectedModule === "2";

    const serverTotalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
    const debouncedSearch = useDebounce((val) => setSearch(val), 300);

    const showingFrom = roles.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
    const showingTo = Math.min(pagination.page * pagination.pageSize, totalCount);
    const colSpanCount = isHRMS ? 8 : 7;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* ── Alerts ──────────────────────────────────────────────── */}
            {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={clearError} className="text-red-400 hover:text-red-600 text-xs ml-4">{t("roles.dismiss")}</button>
                </div>
            )}
            {successMsg && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center justify-between">
                    <span>{successMsg}</span>
                    <button onClick={clearSuccess} className="text-green-400 hover:text-green-600 text-xs ml-4">{t("roles.dismiss")}</button>
                </div>
            )}

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-end gap-1 mr-2">
                        <img alt="roles-permissions" className="w-24 h-24" src={EmpRolesPermissionLogo} />
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h1 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                            <span className="font-semibold">{t("roles.title")}</span>{" "}
                            <span className="font-normal text-gray-500">{t("roles.andPermissions")}</span>
                        </h1>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                            {t("roles.manageDesc")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <CustomSelect
                        placeholder="EMP Monitor"
                        items={MODULE_OPTIONS}
                        selected={selectedModule}
                        onChange={setSelectedModule}
                    />
                    <ExportDropdown />
                    <Button
                        size="sm"
                        className="rounded-lg bg-blue-500 hover:bg-blue-600 px-5 text-xs font-semibold shadow-sm gap-1.5"
                        onClick={openAddRoleDialog}
                    >
                        <Plus className="w-4 h-4" />
                        {t("roles.addNewRole")}
                    </Button>
                </div>
            </div>

            {/* ── Show entries + Search ───────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <ShowEntries value={pagination.pageSize} onChange={(v) => {
                            const num = parseInt(v, 10);
                            changePageSize(Number.isNaN(num) ? 10 : num);
                        }} />

                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder={t("roles.searchRoles")}
                        defaultValue={search}
                        onChange={(e) => debouncedSearch(e.target.value)}
                        className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
                    />
                </div>
            </div>

            {/* ── Loading State ───────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-sm text-slate-500">{t("roles.loadingRoles")}</span>
                </div>
            ) : (
                <>
                    {/* ── Table ───────────────────────────────────────── */}
                    <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
                        <table className="min-w-[850px] w-full">
                            <thead>
                                <tr className="bg-blue-50/80">
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("roles.roleName")}</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("read")}</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("write")}</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("delete")}</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("location")}</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("department")}</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-white text-center bg-[#5C6BC0] min-w-[180px]">{t("action")}</th>
                                    {isHRMS && (
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("roles.enableHRMS")}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {roles.length === 0 ? (
                                    <tr>
                                        <td colSpan={colSpanCount} className="text-center text-sm text-gray-400 py-10">
                                            {search ? t("roles.noRolesMatch") : t("roles.noRolesFound")}
                                        </td>
                                    </tr>
                                ) : (
                                    roles.map((role) => (
                                        <tr
                                            key={role.id}
                                            className="border-b border-slate-100 last:border-b-0 text-xs text-slate-600 hover:bg-slate-50/40 transition-colors"
                                        >
                                            <td className="px-4 py-4 font-medium text-slate-700">{role.name}</td>

                                            <td className="px-4 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        checked={role.permission?.read === true || role.permission?.read === "1" || role.permission?.read === undefined}
                                                        disabled={true}
                                                        className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                    />
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        checked={role.permission?.write === true || role.permission?.write === "1"}
                                                        onCheckedChange={(checked) => toggleRWDPermission(role.id, role.name, "write", checked)}
                                                        className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                    />
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        checked={role.permission?.delete === true || role.permission?.delete === "1"}
                                                        onCheckedChange={(checked) => toggleRWDPermission(role.id, role.name, "delete", checked)}
                                                        className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                    />
                                                </div>
                                            </td>

                                            <td className="px-4 py-4">
                                                <LocationCell role={role} />
                                            </td>

                                            <td className="px-4 py-4">
                                                <DepartmentCell role={role} />
                                            </td>

                                            <td className="px-4 py-4 bg-slate-50/50 text-center">
                                                <ActionButtons role={role} />
                                            </td>

                                            {isHRMS && (
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        <Checkbox
                                                            checked={role.permission?.hrms_permission === true || role.permission?.hrms_permission === "1"}
                                                            onCheckedChange={(checked) => toggleHRMS(role.id, checked)}
                                                            className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                        />
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ──────────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5">
                        <p className="text-[13px] text-gray-500 font-medium">
                            {t("timeclaim.showing")}{" "}
                            <span className="font-bold text-gray-700">{showingFrom}</span>{" "}
                            {t("to")}{" "}
                            <span className="font-bold text-gray-700">{showingTo}</span>{" "}
                            {t("of")}{" "}
                            <span className="font-bold text-blue-600">{totalCount}</span>
                        </p>
                        <PaginationComponent
                            currentPage={pagination.page}
                            totalPages={serverTotalPages}
                            onPageChange={(page) => changePage(page)}
                        />
                    </div>
                </>
            )}

            {/* ── Dialogs ────────────────────────────────────────────── */}
            <AddRoleDialog
                open={addRoleDialogOpen}
                onOpenChange={(open) => { if (!open) closeAddRoleDialog(); }}
            />
            <EditRoleDialog
                open={editRoleDialogOpen}
                onOpenChange={(open) => { if (!open) closeEditRoleDialog(); }}
            />
            <DeleteRoleDialog
                open={deleteRoleDialogOpen}
                onOpenChange={(open) => { if (!open) closeDeleteRoleDialog(); }}
            />
            <CloneRoleDialog
                open={cloneRoleDialogOpen}
                onOpenChange={(open) => { if (!open) closeCloneRoleDialog(); }}
            />
            <ViewRoleDialog
                open={viewRoleDialogOpen}
                onOpenChange={(open) => { if (!open) closeViewRoleDialog(); }}
            />
            <PermissionSettingsDialog
                open={permissionDialogOpen}
                onOpenChange={(open) => { if (!open) closePermissionDialog(); }}
            />
        </div>
    );
};

export default EmpRolesPermission;
