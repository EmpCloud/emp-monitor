import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/page/protected/admin/mobile-task-clients/projectStore";

function MultiSelectDropdown({ label, items, selectedIds, onToggle, onSelectAll }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        if (!open) return;
        const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [open]);

    useEffect(() => {
        if (open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
        }
    }, [open]);

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter((item) => item.label.toLowerCase().includes(q));
    }, [items, search]);

    const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.value));

    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => setOpen((v) => !v)}
                className="flex items-center justify-between w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none transition-all">
                <span className="text-slate-600">
                    {label} {selectedIds.length > 0 && <span className="text-blue-500 font-semibold">({selectedIds.length})</span>}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && createPortal(
                <div
                    className="fixed bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden"
                    style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="sticky top-0 bg-white border-b border-slate-100 p-1.5">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t("search")}...`}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-400" />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                        <label className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                            <input type="checkbox" checked={allSelected} onChange={() => onSelectAll(!allSelected)} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-500" />
                            <span className="text-xs font-semibold text-blue-600">{t("projects.selectAll")}</span>
                        </label>
                        {filtered.map((item) => (
                            <label key={item.value} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                                <input type="checkbox" checked={selectedIds.includes(item.value)} onChange={() => onToggle(item.value)} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-500" />
                                <span className="text-xs text-slate-600">{item.label}</span>
                            </label>
                        ))}
                        {filtered.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">{t("projects.noResults")}</p>}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default function AddEditProjectModal() {
    const { t } = useTranslation();
    const createOpen = useProjectStore((s) => s.createModalOpen);
    const editOpen = useProjectStore((s) => s.editModalOpen);
    const project = useProjectStore((s) => s.editingProject);
    const employees = useProjectStore((s) => s.employees);
    const managers = useProjectStore((s) => s.managers);
    const createAction = useProjectStore((s) => s.createProject);
    const updateAction = useProjectStore((s) => s.updateProject);

    const open = createOpen || editOpen;
    const isEdit = editOpen && !!project;

    const [form, setForm] = useState({ title: "", startDate: "", endDate: "", managers: [], employees: [] });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && isEdit) {
            setForm({
                title: project.title || "",
                startDate: project.start_date?.split("T")[0] || "",
                endDate: project.end_date?.split("T")[0] || "",
                managers: (project.assigned_non_admin_users || []).map((m) => typeof m === "object" ? String(m.id) : String(m)),
                employees: (project.assigned_users || []).map((e) => typeof e === "object" ? String(e.id) : String(e)),
            });
        } else if (open) {
            setForm({ title: "", startDate: "", endDate: "", managers: [], employees: [] });
        }
    }, [open, isEdit, project]);

    const close = useCallback(() => {
        useProjectStore.setState({ createModalOpen: false, editModalOpen: false, editingProject: null });
    }, []);

    const toggleManager = useCallback((id) => {
        setForm((p) => ({
            ...p,
            managers: p.managers.includes(id) ? p.managers.filter((i) => i !== id) : [...p.managers, id],
        }));
    }, []);

    const toggleEmployee = useCallback((id) => {
        setForm((p) => ({
            ...p,
            employees: p.employees.includes(id) ? p.employees.filter((i) => i !== id) : [...p.employees, id],
        }));
    }, []);

    const selectAllManagers = useCallback((select) => {
        setForm((p) => ({ ...p, managers: select ? managers.map((m) => m.value) : [] }));
    }, [managers]);

    const selectAllEmployees = useCallback((select) => {
        setForm((p) => ({ ...p, employees: select ? employees.map((e) => e.value) : [] }));
    }, [employees]);

    const handleSubmit = useCallback(async () => {
        if (!form.title) return;
        setSaving(true);
        if (isEdit) {
            await updateAction({
                _id: project._id, title: form.title, start_date: form.startDate, end_date: form.endDate,
                assigned_non_admin_users: form.managers, assigned_users: form.employees,
            });
        } else {
            await createAction({
                title: form.title, description: "description", start_date: form.startDate, end_date: form.endDate,
                assigned_non_admin_users: form.managers, assigned_users: form.employees,
            });
        }
        setSaving(false);
    }, [form, isEdit, project, createAction, updateAction]);

    if (!open) return null;

    const getLabel = (list, id) => list.find((i) => i.value === id)?.label || id;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 bg-blue-500 rounded-t-2xl shrink-0">
                    <h3 className="text-white font-semibold text-lg">{isEdit ? t("projects.editProject") : t("projects.createProject")}</h3>
                    <button onClick={close} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("projects.projectName")} <span className="text-red-500">*</span></label>
                        <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder={t("projects.enterProjectName")} className="h-10 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("projects.startDate")}</label>
                            <Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className="h-10 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("projects.endDate")}</label>
                            <Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className="h-10 text-sm" />
                        </div>
                    </div>

                    {/* Managers multi-select dropdown */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("projects.managers")}</label>
                        <MultiSelectDropdown
                            label={t("projects.selectManagers")}
                            items={managers}
                            selectedIds={form.managers}
                            onToggle={toggleManager}
                            onSelectAll={selectAllManagers}
                        />
                        {form.managers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {form.managers.map((id) => (
                                    <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500 text-white text-[11px] font-medium">
                                        {getLabel(managers, id)}
                                        <button type="button" onClick={() => toggleManager(id)} className="hover:text-blue-200"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Employees multi-select dropdown */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("employees")}</label>
                        <MultiSelectDropdown
                            label={t("projects.selectEmployees")}
                            items={employees}
                            selectedIds={form.employees}
                            onToggle={toggleEmployee}
                            onSelectAll={selectAllEmployees}
                        />
                        {form.employees.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {form.employees.map((id) => (
                                    <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-medium">
                                        {getLabel(employees, id)}
                                        <button type="button" onClick={() => toggleEmployee(id)} className="hover:text-emerald-200"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/50 rounded-b-2xl">
                    <Button variant="outline" onClick={close} className="px-5">{t("common.cancel")}</Button>
                    <Button className="bg-blue-500 hover:bg-blue-600 px-6" onClick={handleSubmit} disabled={saving}>{saving ? t("projects.saving") : isEdit ? t("common.update") : t("common.create")}</Button>
                </div>
            </div>
        </div>
    );
}
