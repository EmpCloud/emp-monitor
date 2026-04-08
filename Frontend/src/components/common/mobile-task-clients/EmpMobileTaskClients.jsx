import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Search, Upload } from "lucide-react";
import Swal from "sweetalert2";
import PaginationComponent from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmpMobileTaskClientsLogo from "@/assets/mobile-task/clients-users.svg";
import { useProjectStore } from "@/page/protected/admin/mobile-task-clients/projectStore";
import AddEditProjectModal from "./AddEditProjectModal";
import BulkImportModal from "../mobile-task-details/BulkImportModal";

const EmpMobileTaskClients = () => {
    const { t } = useTranslation();
    const projects = useProjectStore((s) => s.projects);
    const loading = useProjectStore((s) => s.loading);
    const tableLoading = useProjectStore((s) => s.tableLoading);
    const error = useProjectStore((s) => s.error);
    const successMsg = useProjectStore((s) => s.successMsg);
    const pagination = useProjectStore((s) => s.pagination);
    const importModalOpen = useProjectStore((s) => s.importModalOpen);
    const setPagination = useProjectStore((s) => s.setPagination);
    const loadInitialData = useProjectStore((s) => s.loadInitialData);
    const fetchProjects = useProjectStore((s) => s.fetchProjects);
    const deleteProjectAction = useProjectStore((s) => s.deleteProject);
    const assignAllAction = useProjectStore((s) => s.assignAllEmployees);
    const bulkImport = useProjectStore((s) => s.bulkImport);
    const openCreate = useProjectStore((s) => s.openCreate);
    const openEdit = useProjectStore((s) => s.openEdit);
    const clearMessages = useProjectStore((s) => s.clearMessages);

    const [search, setSearch] = useState("");
    const debounceTimer = useRef(null);
    const initialLoad = useRef(true);

    useEffect(() => { loadInitialData(); }, []);

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => { setPagination("search", search); setPagination("page", 1); }, 400);
        return () => clearTimeout(debounceTimer.current);
    }, [search]);

    useEffect(() => {
        if (initialLoad.current) { initialLoad.current = false; return; }
        fetchProjects();
    }, [pagination.page, pagination.pageSize, pagination.sortOrder, pagination.search]);

    useEffect(() => {
        if (successMsg) { Swal.fire({ icon: "success", title: "Success", text: successMsg, timer: 2500, showConfirmButton: false }); clearMessages(); }
    }, [successMsg]);
    useEffect(() => {
        if (error) { Swal.fire({ icon: "error", title: "Error", text: error }); clearMessages(); }
    }, [error]);

    const totalCount = useProjectStore((s) => s.totalCount);
    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

    const handleDelete = useCallback(async (project) => {
        const r = await Swal.fire({ title: t("projects.deleteProject"), text: project.title, icon: "warning", showCancelButton: true, confirmButtonText: t("delete") });
        if (r.isConfirmed) deleteProjectAction(project._id);
    }, [deleteProjectAction]);

    const handleAssignAll = useCallback(async () => {
        const r = await Swal.fire({ title: t("projects.assignAllQuestion"), icon: "question", showCancelButton: true, confirmButtonText: t("common.yes") });
        if (r.isConfirmed) assignAllAction();
    }, [assignAllAction]);

    const handlePageSizeChange = useCallback((v) => { setPagination("pageSize", parseInt(v, 10) || 10); setPagination("page", 1); }, [setPagination]);
    const handlePageChange = useCallback((p) => setPagination("page", p), [setPagination]);

    if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-slate-50"><div className="w-20 h-20"><video src="/src/assets/ai.webm" autoPlay loop playsInline muted className="w-full h-full object-contain" /></div></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
                <div className="flex items-center gap-2">
                    <img alt="projects" className="w-20 h-20" src={EmpMobileTaskClientsLogo} />
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}><span className="font-semibold">{t("projects.title")}</span>{" "}<span className="font-normal text-gray-500">{t("projects.andUsers")}</span></h2>
                        <p className="text-xs text-gray-400 mt-1">{t("projects.manageDesc")}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-xs" onClick={handleAssignAll}>{t("projects.assignAllEmployees")}</Button>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-xs" onClick={openCreate}>{t("projects.createProject")}</Button>
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-xs" onClick={() => useProjectStore.setState({ importModalOpen: true })}><Upload className="w-3.5 h-3.5 mr-1" />{t("common.import")}</Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#424242] font-medium">{t("show")}</span>
                    <Select value={String(pagination.pageSize)} onValueChange={handlePageSizeChange}><SelectTrigger className="h-8 w-16 text-[13px] rounded-lg border-gray-200"><SelectValue placeholder="10" /></SelectTrigger><SelectContent className="rounded-xl">{["10", "25", "50", "100"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
                    <span className="text-[13px] text-[#424242] font-medium">{t("entries")}</span>
                </div>
                <div className="relative w-full max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs" /></div>
            </div>

            <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
                <table className="min-w-[700px] w-full">
                    <thead><tr className="bg-[#CADDFF]">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("projects.projectName")}</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("projects.startDate")}</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("projects.endDate")}</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("projects.managers")}</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("employees")}</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center w-24">{t("action")}</th>
                    </tr></thead>
                    <tbody className="bg-white">
                        {tableLoading ? <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-10">{t("loadingText")}</td></tr>
                        : projects.length === 0 ? <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-10">{t("Nodata")}</td></tr>
                        : projects.map((p, idx) => (
                            <tr key={p._id || idx} className="border-b border-slate-100 last:border-0 text-xs text-slate-600">
                                <td className="px-4 py-3 font-medium text-slate-700">{p.title || "-"}</td>
                                <td className="px-4 py-3 text-center">{p.start_date?.split("T")[0] || "-"}</td>
                                <td className="px-4 py-3 text-center">{p.end_date?.split("T")[0] || "-"}</td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-wrap justify-center gap-1">{(p.assigned_non_admin_users || []).filter(Boolean).slice(0, 3).map((m, i) => <span key={i} className="px-2 py-0.5 rounded bg-blue-100 text-blue-600 text-[10px] font-medium">{typeof m === "object" ? (m.name || m.first_name || "-") : String(m)}</span>)}{(p.assigned_non_admin_users || []).filter(Boolean).length > 3 && <span className="text-[10px] text-slate-400">+{p.assigned_non_admin_users.filter(Boolean).length - 3}</span>}</div>
                                </td>
                                <td className="px-4 py-3 text-center">{(p.assigned_users || []).length}</td>
                                <td className="px-4 py-3"><div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => openEdit(p)} className="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center"><Pencil className="w-3 h-3 text-emerald-600" /></button>
                                    <button onClick={() => handleDelete(p)} className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 flex items-center justify-center"><Trash2 className="w-3 h-3 text-red-500" /></button>
                                </div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5 pt-10">
                <p className="text-[13px] text-gray-500 font-medium">{t("timeclaim.showing")} <span className="font-bold text-gray-700">{totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}</span> {t("to")} <span className="font-bold text-gray-700">{Math.min(pagination.page * pagination.pageSize, totalCount)}</span> {t("of")} <span className="font-bold text-blue-600">{totalCount}</span></p>
                <PaginationComponent currentPage={pagination.page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>

            <AddEditProjectModal />
            <BulkImportModal open={importModalOpen} onClose={() => useProjectStore.setState({ importModalOpen: false })} onImport={bulkImport} title={`${t("common.import")} ${t("projects.title")}`} />
        </div>
    );
};

export default EmpMobileTaskClients;
