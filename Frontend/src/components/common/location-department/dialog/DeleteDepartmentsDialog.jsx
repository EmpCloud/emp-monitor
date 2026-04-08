import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useLocationDepartmentStore } from "@/page/protected/admin/location-department/locationDepartmentStore";

const DeleteDepartmentsDialog = ({ open, onOpenChange }) => {  const { t } = useTranslation();

    const allDepartments = useLocationDepartmentStore((s) => s.allDepartments);
    const deleting = useLocationDepartmentStore((s) => s.deleting);
    const confirmDeleteDepartment = useLocationDepartmentStore((s) => s.confirmDeleteDepartment);

    const [confirmId, setConfirmId] = useState(null);

    const handleOpenChange = (isOpen) => {
        if (!isOpen) setConfirmId(null);
        onOpenChange(isOpen);
    };

    const handleDelete = async (deptId) => {
        const result = await confirmDeleteDepartment(deptId);
        if (result?.success) {
            setConfirmId(null);
        } else {
            setConfirmId(null);
            handleOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md rounded-2xl p-0 gap-0 border-0">
                <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Delete Departments
                        </DialogTitle>
                        <DialogDescription className="text-red-100 text-xs mt-1">
                            {t("locDept.permanentlyDeleteDepts")}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-4">
                    {allDepartments.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-400">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            {t("locDept.noDepartmentsFound")}
                        </div>
                    ) : (
                        <div className="max-h-[50vh] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">{t("department")}</th>
                                        <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 w-24">{t("action")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allDepartments.map((dept) => (
                                        <tr key={dept.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="py-2.5 px-2 text-slate-700">{dept.name}</td>
                                            <td className="py-2.5 px-2 text-center">
                                                {confirmId === dept.id ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            className="h-7 px-2 text-[10px] rounded-lg"
                                                            onClick={() => handleDelete(dept.id)}
                                                            disabled={deleting}
                                                        >
                                                            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : t("common.yes")}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2 text-[10px] rounded-lg"
                                                            onClick={() => setConfirmId(null)}
                                                            disabled={deleting}
                                                        >
                                                            No
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmId(dept.id)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                    <Button
                        variant="outline"
                        className="rounded-xl px-5 text-xs font-semibold border-slate-300"
                        onClick={() => handleOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteDepartmentsDialog;
