import React from "react";
import { useTranslation } from "react-i18next";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResellerStore } from "@/page/protected/admin/reseller-dashboard/resellerStore";

export default function ViewAssignedModal() {
    const { t } = useTranslation();
    const open = useResellerStore((s) => s.viewAssignedModalOpen);
    const employees = useResellerStore((s) => s.assignedEmployees);
    const setModal = useResellerStore((s) => s.setModal);
    const deleteAction = useResellerStore((s) => s.deleteAssignedEmployee);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="font-semibold text-slate-800">{t("reseller.assignedEmployees")}</h3>
                    <button onClick={() => setModal("viewAssignedModalOpen", false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-blue-50">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">{t("reseller.empCode")}</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700">{t("employee")}</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">{t("department")}</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700 w-16">{t("action")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.length === 0 ? (
                                <tr><td colSpan={4} className="text-center text-slate-400 py-8">{t("reseller.noAssignedEmployees")}</td></tr>
                            ) : employees.map((e) => (
                                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                                    <td className="px-4 py-2 text-xs">{e.empCode}</td>
                                    <td className="px-4 py-2 text-xs text-center">{e.name}</td>
                                    <td className="px-4 py-2 text-xs">{e.department}</td>
                                    <td className="px-4 py-2 text-center">
                                        <button onClick={() => deleteAction(e.id)} className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 flex items-center justify-center mx-auto">
                                            <Trash2 className="w-3 h-3 text-red-500" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end px-6 py-4 border-t">
                    <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => setModal("viewAssignedModalOpen", false)}>{t("common.close")}</Button>
                </div>
            </div>
        </div>
    );
}
