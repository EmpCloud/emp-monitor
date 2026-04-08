import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Loader2 } from "lucide-react";
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
import { TIMEZONES, validateEditLocationForm } from "@/page/protected/admin/location-department/service";

const EditLocationDialog = ({ open, onOpenChange }) => {  const { t } = useTranslation();

    const saving = useLocationDepartmentStore((s) => s.saving);
    const editLocationData = useLocationDepartmentStore((s) => s.editLocationData);
    const saveEditLocation = useLocationDepartmentStore((s) => s.saveEditLocation);

    const [locName, setLocName] = useState("");
    const [selectedTimezone, setSelectedTimezone] = useState("");
    const [formError, setFormError] = useState("");

    useEffect(() => {
        if (editLocationData && open) {
            setLocName(editLocationData.location || "");
            const tz = editLocationData.timezone?.replace("/", "") || "";
            const matched = TIMEZONES.find(
                (t) => t.zone.replace("/", "") === tz || t.zone === editLocationData.timezone
            );
            setSelectedTimezone(matched?.zone || "");
            setFormError("");
        }
    }, [editLocationData, open]);

    const handleOpenChange = (isOpen) => {
        if (!isOpen) {
            setFormError("");
        }
        onOpenChange(isOpen);
    };

    const handleSubmit = async () => {
        const tz = TIMEZONES.find((t) => t.zone === selectedTimezone);
        const validationError = validateEditLocationForm({
            locName,
            timezone: selectedTimezone,
        });
        if (validationError) {
            setFormError(validationError);
            return;
        }
        setFormError("");

        const result = await saveEditLocation({
            locationId: editLocationData.location_id,
            name: locName.trim(),
            timezone: tz?.zone || "",
            timezoneOffset: tz?.offset || "",
        });

        if (!result.success) {
            setFormError(result.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl p-0 gap-0 border-0">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <Pencil className="w-5 h-5" />
                            Edit Location
                        </DialogTitle>
                        <DialogDescription className="text-emerald-100 text-xs mt-1">
                            {t("locDept.updateLocationDesc")}
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
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                        className="rounded-xl px-5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Update Location
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EditLocationDialog;
