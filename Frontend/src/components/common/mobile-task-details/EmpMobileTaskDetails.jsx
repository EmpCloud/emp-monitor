import React, { useEffect, useRef, useState, useCallback } from "react";
import { Search, Info, Download, Upload, Trash2, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import PaginationComponent from "@/components/common/Pagination";
import CustomSelect from "@/components/common/elements/CustomSelect";
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTaskStore } from "@/page/protected/admin/mobile-task-details/taskStore";
import AddEditTaskModal from "./AddEditTaskModal";
import BulkImportModal from "./BulkImportModal";

const EmpMobileTaskDetails = () => {
    const rows = useTaskStore((s) => s.rows);
    const totalCount = useTaskStore((s) => s.totalCount);
    const projects = useTaskStore((s) => s.projects);
    const employees = useTaskStore((s) => s.employees);
    const managers = useTaskStore((s) => s.managers);
    const filters = useTaskStore((s) => s.filters);
    const pagination = useTaskStore((s) => s.pagination);
    const loading = useTaskStore((s) => s.loading);
    const tableLoading = useTaskStore((s) => s.tableLoading);
    const error = useTaskStore((s) => s.error);
    const successMsg = useTaskStore((s) => s.successMsg);
    const importModalOpen = useTaskStore((s) => s.importModalOpen);
    const setFilter = useTaskStore((s) => s.setFilter);
    const setPagination = useTaskStore((s) => s.setPagination);
    const loadInitialData = useTaskStore((s) => s.loadInitialData);
    const fetchTasks = useTaskStore((s) => s.fetchTasks);
    const fetchFolders = useTaskStore((s) => s.fetchFolders);
    const deleteTaskAction = useTaskStore((s) => s.deleteTask);
    const downloadCsv = useTaskStore((s) => s.downloadCsv);
    const downloadConsolidated = useTaskStore((s) => s.downloadConsolidated);
    const bulkImport = useTaskStore((s) => s.bulkImport);
    const openCreate = useTaskStore((s) => s.openCreate);
    const openEdit = useTaskStore((s) => s.openEdit);
    const clearMessages = useTaskStore((s) => s.clearMessages);

    const [search, setSearch] = useState("");
    const initialLoad = useRef(true);
    const debounceTimer = useRef(null);
    useEffect(() => { loadInitialData(); }, []);

    const handleDateRangeChange = useCallback((start, end) => {
        if (!start || !end) return;
        setFilter("startDate", start);
        setFilter("endDate", end);
    }, [setFilter]);

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setFilter("search", search), 400);
        return () => clearTimeout(debounceTimer.current);
    }, [search]);

    useEffect(() => {
        if (initialLoad.current) { initialLoad.current = false; return; }
        fetchTasks();
    }, [filters.project, filters.folder, filters.employee, filters.manager, filters.startDate, filters.endDate, filters.search, pagination.page, pagination.pageSize, pagination.sortColumn, pagination.sortOrder]);

    useEffect(() => {
        if (successMsg) { Swal.fire({ icon: "success", title: "Success", text: successMsg, timer: 2500, showConfirmButton: false }); clearMessages(); }
    }, [successMsg]);
    useEffect(() => {
        if (error) { Swal.fire({ icon: "error", title: "Error", text: error }); clearMessages(); }
    }, [error]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

    const handleProjectChange = useCallback((v) => { setFilter("project", v); setFilter("folder", ""); fetchFolders(v); }, [setFilter, fetchFolders]);
    const handleDelete = useCallback(async (taskId) => {
        const r = await Swal.fire({ title: "Delete task?", icon: "warning", showCancelButton: true, confirmButtonText: "Delete" });
        if (r.isConfirmed) deleteTaskAction(taskId);
    }, [deleteTaskAction]);
    const handlePageSizeChange = useCallback((v) => { setPagination("pageSize", parseInt(v, 10) || 10); setPagination("page", 1); }, [setPagination]);
    const handlePageChange = useCallback((p) => setPagination("page", p), [setPagination]);

    if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-slate-50"><div className="w-20 h-20"><video src="/src/assets/ai.webm" autoPlay loop playsInline muted className="w-full h-full object-contain" /></div></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
                <div className="border-l-2 border-blue-500 pl-4">
                    <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}><span className="font-semibold">Task</span>{" "}<span className="font-normal text-gray-500">Details</span></h2>
                    <p className="text-xs text-gray-400 mt-1">Manage and track employee tasks across projects</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-xs" onClick={openCreate}>Add Task</Button>
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-xs" onClick={() => useTaskStore.setState({ importModalOpen: true })}><Upload className="w-3.5 h-3.5 mr-1" />Import</Button>
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-xs" onClick={downloadCsv}><Download className="w-3.5 h-3.5 mr-1" />CSV</Button>
                    <Button size="sm" className="bg-violet-500 hover:bg-violet-600 text-xs" onClick={downloadConsolidated}><Download className="w-3.5 h-3.5 mr-1" />Consolidated</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Project</label><CustomSelect placeholder="All Projects" items={[{ value: "", label: "All" }, ...projects]} selected={filters.project} onChange={handleProjectChange} width="full" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Manager</label><CustomSelect placeholder="All Managers" items={[{ value: "", label: "All" }, ...managers]} selected={filters.manager} onChange={(v) => setFilter("manager", v)} width="full" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Employee</label><CustomSelect placeholder="All Employees" items={[{ value: "", label: "All" }, ...employees]} selected={filters.employee[0] || ""} onChange={(v) => setFilter("employee", v ? [v] : [])} width="full" /></div>
                <div><label className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1">Date Range <Info className="w-3 h-3 text-blue-500" /></label><DateRangeCalendar startDate={filters.startDate} endDate={filters.endDate} onChange={handleDateRangeChange} /></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#424242] font-medium">Show</span>
                    <Select value={String(pagination.pageSize)} onValueChange={handlePageSizeChange}><SelectTrigger className="h-8 w-16 text-[13px] rounded-lg border-gray-200"><SelectValue placeholder="10" /></SelectTrigger><SelectContent className="rounded-xl">{["10", "25", "50", "100"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
                    <span className="text-[13px] text-[#424242] font-medium">Entries</span>
                </div>
                <div className="relative w-full max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs" /></div>
            </div>

            <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
                <table className="min-w-[900px] w-full">
                    <thead><tr className="bg-[#CADDFF]">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">Employee</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">Project</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">Folder</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">Task</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">Duration</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center w-24">Action</th>
                    </tr></thead>
                    <tbody className="bg-white">
                        {tableLoading ? <tr><td colSpan={7} className="text-center text-sm text-gray-400 py-10">Loading...</td></tr>
                        : rows.length === 0 ? <tr><td colSpan={7} className="text-center text-sm text-gray-400 py-10">No tasks found</td></tr>
                        : rows.map((row, idx) => (
                            <tr key={row._id || idx} className="border-b border-slate-100 last:border-0 text-xs text-slate-600">
                                <td className="px-4 py-3">{row.employee_name || "-"}</td>
                                <td className="px-4 py-3">{row.project_name || "-"}</td>
                                <td className="px-4 py-3">{row.folder_name || "-"}</td>
                                <td className="px-4 py-3 font-medium text-slate-700">{row.title || "-"}</td>
                                <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${row.status === "completed" ? "bg-emerald-100 text-emerald-600" : row.status === "in_progress" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>{row.status || "pending"}</span></td>
                                <td className="px-4 py-3 text-center">{row.duration || "-"}</td>
                                <td className="px-4 py-3"><div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => openEdit(row)} className="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center"><Pencil className="w-3 h-3 text-emerald-600" /></button>
                                    <button onClick={() => handleDelete(row._id)} className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 flex items-center justify-center"><Trash2 className="w-3 h-3 text-red-500" /></button>
                                </div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5 pt-10">
                <p className="text-[13px] text-gray-500 font-medium">Showing <span className="font-bold text-gray-700">{totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}</span> to <span className="font-bold text-gray-700">{Math.min(pagination.page * pagination.pageSize, totalCount)}</span> of <span className="font-bold text-blue-600">{totalCount}</span></p>
                <PaginationComponent currentPage={pagination.page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>

            <AddEditTaskModal />
            <BulkImportModal open={importModalOpen} onClose={() => useTaskStore.setState({ importModalOpen: false })} onImport={bulkImport} title="Import Tasks" />
        </div>
    );
};

export default EmpMobileTaskDetails;
