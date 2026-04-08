import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useLocationDepartmentStore } from "@/page/protected/admin/location-department/locationDepartmentStore";
import { TIMEZONES, validateLocationForm } from "@/page/protected/admin/location-department/service";

const AddLocationDialog = ({ open, onOpenChange }) => {  const { t } = useTranslation();

    const saving = useLocationDepartmentStore((s) => s.saving);
    const allDepartments = useLocationDepartmentStore((s) => s.allDepartments);
    const saveLocation = useLocationDepartmentStore((s) => s.saveLocation);

    const [locName, setLocName] = useState("");
    const [selectedTimezone, setSelectedTimezone] = useState("");
    const [selectedDepts, setSelectedDepts] = useState([]);
    const [deptInput, setDeptInput] = useState("");
    const [formError, setFormError] = useState("");

    const resetForm = () => {
        setLocName("");
        setSelectedTimezone("");
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
        const tz = TIMEZONES.find((t) => t.zone === selectedTimezone);
        const validationError = validateLocationForm({
            locName,
            timezone: selectedTimezone,
            departments: selectedDepts,
        });
        if (validationError) {
            setFormError(validationError);
            return;
        }
        setFormError("");

        const departmentIds = selectedDepts.filter((d) => !d.isNew).map((d) => String(d.id));
        const departmentNames = selectedDepts.filter((d) => d.isNew).map((d) => d.name);

        const result = await saveLocation({
            locName: locName.trim(),
            departmentIds,
            departmentNames,
            timezone: tz?.zone || "",
            timezoneOffset: tz?.offset || "",
        });

        if (result.success) {
            resetForm();
        } else {
            setFormError(result.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl p-0 gap-0 border-0">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Add Location & Departments
                        </DialogTitle>
                        <DialogDescription className="text-blue-100 text-xs mt-1">
                            {t("locDept.addLocDesc")}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {formError && (
                        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                            {formError}
                        </div>
                    )}

                    {/* Timezone */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t("locDept.timezone")} *</label>
                        <select
                            value={selectedTimezone}
                            onChange={(e) => { setSelectedTimezone(e.target.value); setFormError(""); }}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">{t("locDept.selectTimezone")}</option>
                            {TIMEZONES.map((tz) => (
                                <option key={tz.zone} value={tz.zone}>{tz.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Location Name */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t("locDept.locationName")} *</label>
                        <Input
                            value={locName}
                            onChange={(e) => { setLocName(e.target.value); setFormError(""); }}
                            placeholder={t("locDept.typeLocationName")}
                            className="rounded-lg"
                        />
                    </div>

                    {/* Departments */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t("locDept.departments")} *</label>
                        <div className="border border-slate-200 rounded-lg p-2 min-h-[80px]">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {selectedDepts.map((dept) => (
                                    <span
                                        key={dept.id}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200"
                                    >
                                        {dept.name}
                                        <button onClick={() => removeDept(dept)} className="hover:text-blue-900">
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
                                            className="px-2 py-1.5 text-xs text-slate-600 hover:bg-blue-50 rounded cursor-pointer"
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
                                        className="px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
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
                        className="rounded-xl px-5 text-xs font-semibold bg-blue-600 hover:bg-blue-700"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Add Location
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddLocationDialog;
