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

const DeleteDeptFromLocationDialog = ({ open, onOpenChange }) => {  const { t } = useTranslation();

    const deleting = useLocationDepartmentStore((s) => s.deleting);
    const depts = useLocationDepartmentStore((s) => s.deleteDeptLocationDepts);
    const confirmDeleteDeptFromLocation = useLocationDepartmentStore((s) => s.confirmDeleteDeptFromLocation);

    const [selectedDepts, setSelectedDepts] = useState([]);

    const handleOpenChange = (isOpen) => {
        if (!isOpen) setSelectedDepts([]);
        onOpenChange(isOpen);
    };

    const toggleDept = (deptId) => {
        setSelectedDepts((prev) =>
            prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
        );
    };

    const handleDelete = async () => {
        if (selectedDepts.length === 0) return;
        let hasError = false;
        for (const deptId of selectedDepts) {
            const result = await confirmDeleteDeptFromLocation(deptId);
            if (!result?.success) {
                hasError = true;
                break;
            }
        }
        setSelectedDepts([]);
        if (hasError) {
            handleOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md rounded-2xl p-0 gap-0 border-0">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5 rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            {t("locDept.removeDeptFromLocation")}
                        </DialogTitle>
                        <DialogDescription className="text-orange-100 text-xs mt-1">
                            {t("locDept.selectDeptsToRemove")}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-5">
                    {depts.length === 0 ? (
                        <div className="text-center py-6 text-sm text-slate-400">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            {t("locDept.noDeptsForLocation")}
                        </div>
                    ) : (
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {depts.map((dept) => (
                                <label
                                    key={dept.department_id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                                        selectedDepts.includes(dept.department_id)
                                            ? "bg-red-50 border border-red-200"
                                            : "hover:bg-slate-50 border border-transparent"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedDepts.includes(dept.department_id)}
                                        onChange={() => toggleDept(dept.department_id)}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-red-500 focus:ring-red-200"
                                    />
                                    <span className="text-sm text-slate-700">{dept.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl px-5 text-xs font-semibold border-slate-300"
                        onClick={() => handleOpenChange(false)}
                        disabled={deleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        className="rounded-xl px-5 text-xs font-semibold"
                        onClick={handleDelete}
                        disabled={deleting || selectedDepts.length === 0}
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        {`${t("locDept.removeSelected")} (${selectedDepts.length})`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteDeptFromLocationDialog;
