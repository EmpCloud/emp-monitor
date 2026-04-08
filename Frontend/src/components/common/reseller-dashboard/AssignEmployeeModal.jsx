import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResellerStore } from "@/page/protected/admin/reseller-dashboard/resellerStore";

export default function AssignEmployeeModal() {
    const { t } = useTranslation();
    const open = useResellerStore((s) => s.assignModalOpen);
    const clients = useResellerStore((s) => s.clients);
    const employees = useResellerStore((s) => s.employees);
    const setModal = useResellerStore((s) => s.setModal);
    const assignAction = useResellerStore((s) => s.assignEmployees);
    const getPreAssigned = useResellerStore((s) => s.getPreAssignedIds);

    const [selectedReseller, setSelectedReseller] = useState("");
    const [selectedEmpIds, setSelectedEmpIds] = useState([]);
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setSelectedReseller("");
            setSelectedEmpIds([]);
            setSearch("");
        }
    }, [open]);

    // Load pre-assigned when reseller changes
    useEffect(() => {
        if (selectedReseller) {
            getPreAssigned(selectedReseller).then((ids) => setSelectedEmpIds(ids));
        } else {
            setSelectedEmpIds([]);
        }
    }, [selectedReseller]);

    const filtered = useMemo(() => {
        if (!search) return employees;
        const q = search.toLowerCase();
        return employees.filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
    }, [employees, search]);

    const allSelected = employees.length > 0 && selectedEmpIds.length === employees.length;

    const toggleEmp = useCallback((id) => {
        setSelectedEmpIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    }, []);

    const toggleAll = useCallback(() => {
        setSelectedEmpIds((prev) => prev.length === employees.length ? [] : employees.map((e) => e.id));
    }, [employees]);

    const handleSubmit = useCallback(async () => {
        if (!selectedReseller) return;
        setSaving(true);
        await assignAction(selectedReseller, selectedEmpIds);
        setSaving(false);
    }, [selectedReseller, selectedEmpIds, assignAction]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="font-semibold text-slate-800">{t("reseller.assignEmployee")}</h3>
                    <button onClick={() => setModal("assignModalOpen", false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t("reseller.reseller")}</label>
                        <select
                            value={selectedReseller}
                            onChange={(e) => setSelectedReseller(e.target.value)}
                            className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t("reseller.selectReseller")}</option>
                            {clients.map((c) => (
                                <option key={c.clientOrgId} value={c.clientOrgId}>{c.username} ({c.email})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t("reseller.selectEmployees")}</label>
                        <div className="border border-slate-200 rounded-lg">
                            <div className="p-1.5 border-b border-slate-100">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={`${t("search")}...`}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-400"
                                    />
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                <label className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 rounded" />
                                    <span className="text-xs font-semibold text-blue-600">{t("reseller.selectAll")}</span>
                                </label>
                                {filtered.map((emp) => (
                                    <label key={emp.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                                        <input type="checkbox" checked={selectedEmpIds.includes(emp.id)} onChange={() => toggleEmp(emp.id)} className="w-3.5 h-3.5 rounded" />
                                        <span className="text-xs text-slate-600">{emp.name} ({emp.email})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t">
                    <Button variant="outline" onClick={() => setModal("assignModalOpen", false)}>{t("common.cancel")}</Button>
                    <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleSubmit} disabled={saving || !selectedReseller}>{saving ? t("reseller.assigning") : t("common.update")}</Button>
                </div>
            </div>
        </div>
    );
}
