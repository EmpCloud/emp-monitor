import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useLocationDepartmentStore } from "@/page/protected/admin/location-department/locationDepartmentStore";

const AddDeptToLocationDialog = ({ open, onOpenChange }) => {  const { t } = useTranslation();

    const saving = useLocationDepartmentStore((s) => s.saving);
    const allDepartments = useLocationDepartmentStore((s) => s.allDepartments);
    const saveAddDept = useLocationDepartmentStore((s) => s.saveAddDept);

    const [selectedDepts, setSelectedDepts] = useState([]);
    const [deptInput, setDeptInput] = useState("");
    const [formError, setFormError] = useState("");

    const resetForm = () => {
        setSelectedDepts([]);
        setDeptInput("");
        setFormError("");
    };

    const handleOpenChange = (isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
    };

    const filteredDepts = useMemo(() => {
        const selectedIds = selectedDepts.map((d) => d.id);
        return allDepartments.filter(
            (d) => !selectedIds.includes(d.id) && d.name.toLowerCase().includes(deptInput.toLowerCase())
        );
    }, [allDepartments, selectedDepts, deptInput]);

    const addDept = (dept) => {
        setSelectedDepts((prev) => [...prev, dept]);
        setDeptInput("");
    };

    const addCustomDept = () => {
        const name = deptInput.trim();
        if (!name) return;
        if (selectedDepts.find((d) => d.name.toLowerCase() === name.toLowerCase())) return;
        setSelectedDepts((prev) => [...prev, { id: name, name, isNew: true }]);
        setDeptInput("");
    };

    const removeDept = (dept) => {
        setSelectedDepts((prev) => prev.filter((d) => d.id !== dept.id));
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            if (filteredDepts.length > 0) {
                addDept(filteredDepts[0]);
            } else if (deptInput.trim()) {
                addCustomDept();
            }
        }
    };

    const handleSubmit = async () => {
        if (selectedDepts.length === 0) {
            setFormError(t("locDept.atLeastOneDept"));
            return;
        }
        setFormError("");

        const departmentIds = selectedDepts.filter((d) => !d.isNew).map((d) => d.id);
        const departmentNames = selectedDepts.filter((d) => d.isNew).map((d) => d.name);

        const result = await saveAddDept({ departmentIds, departmentNames });
        if (result?.success) {
            resetForm();
        } else {
            setFormError(result?.message || t("locDept.failedAddDept"));
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl p-0 gap-0 border-0">
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            {t("locDept.addDeptToLocation")}
                        </DialogTitle>
                        <DialogDescription className="text-violet-100 text-xs mt-1">
                            {t("locDept.assignDeptDesc")}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {formError && (
                        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t("locDept.departments")} *</label>
                        <div className="border border-slate-200 rounded-lg p-2 min-h-[80px]">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {selectedDepts.map((dept) => (
                                    <span
                                        key={dept.id}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-50 text-violet-700 text-xs font-medium border border-violet-200"
                                    >
                                        {dept.name}
                                        <button onClick={() => removeDept(dept)} className="hover:text-violet-900">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <input
                                value={deptInput}
                                onChange={(e) => setDeptInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t("locDept.searchOrTypeDept")}
                                className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
                            />
                            {deptInput && filteredDepts.length > 0 && (
                                <div className="mt-1 max-h-32 overflow-y-auto border-t border-slate-100 pt-1">
                                    {filteredDepts.slice(0, 8).map((dept) => (
                                        <div
                                            key={dept.id}
                                            onClick={() => addDept(dept)}
                                            className="px-2 py-1.5 text-xs text-slate-600 hover:bg-violet-50 rounded cursor-pointer"
                                        >
                                            {dept.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {deptInput && filteredDepts.length === 0 && (
                                <div className="mt-1 border-t border-slate-100 pt-1">
                                    <div
                                        onClick={addCustomDept}
                                        className="px-2 py-1.5 text-xs text-violet-600 hover:bg-violet-50 rounded cursor-pointer"
                                    >
                                        + Create "{deptInput.trim()}"
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl px-5 text-xs font-semibold border-slate-300"
                        onClick={() => handleOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="rounded-xl px-5 text-xs font-semibold bg-violet-600 hover:bg-violet-700"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Add Department
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddDeptToLocationDialog;
