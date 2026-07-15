import React, { useState, useEffect } from "react";
import { ShieldPlus, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useRolesPermissionStore } from "@/page/protected/admin/roles-permissions/rolesPermissionStore";
import { getDepartmentsByLocation, validateRoleName } from "@/page/protected/admin/roles-permissions/service";

const AddRoleDialog = ({ open, onOpenChange }) => {
    const saving = useRolesPermissionStore((s) => s.saving);
    const locations = useRolesPermissionStore((s) => s.locations);
    const saveRole = useRolesPermissionStore((s) => s.saveRole);

    const [roleName, setRoleName] = useState("");
    const [sendEmail, setSendEmail] = useState(true);
    const [locationDeptRows, setLocationDeptRows] = useState([{ location: "", departments: [], deptOptions: [] }]);
    const [formError, setFormError] = useState("");

    const resetForm = () => {
        setRoleName("");
        setSendEmail(true);
        setLocationDeptRows([{ location: "", departments: [], deptOptions: [] }]);
        setFormError("");
    };

    const handleOpenChange = (isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
    };

    const handleLocationChange = async (index, locationId) => {
        const updated = [...locationDeptRows];
        updated[index].location = locationId;
        updated[index].departments = [];
        updated[index].deptOptions = [];
        setLocationDeptRows(updated);

        if (locationId) {
            const result = await getDepartmentsByLocation(locationId);
            if (result.success) {
                const rows = [...locationDeptRows];
                rows[index].deptOptions = result.data;
                setLocationDeptRows(rows);
            }
        }
    };

    const handleDeptChange = (index, deptIds) => {
        const updated = [...locationDeptRows];
        updated[index].departments = deptIds;
        setLocationDeptRows(updated);
    };

    const addRow = () => {
        setLocationDeptRows((prev) => [...prev, { location: "", departments: [], deptOptions: [] }]);
    };

    const removeRow = (index) => {
        if (locationDeptRows.length <= 1) return;
        setLocationDeptRows((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        const validationError = validateRoleName(roleName);
        if (validationError) {
            setFormError(validationError);
            return;
        }
        setFormError("");

        // The store closes the dialog + fires a success swal on success, and an
        // error swal on failure — only reset the local form here (don't also set
        // formError, which would double up with the store's error swal).
        const result = await saveRole({
            name: roleName.trim(),
            locationDept: locationDeptRows,
            mailStatus: sendEmail,
        });

        if (result?.success) {
            resetForm();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl p-0 gap-0 border-0">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <ShieldPlus className="w-5 h-5" />
                            Add New Role
                        </DialogTitle>
                        <DialogDescription className="text-blue-100 text-xs mt-1">
                            Create a new role and assign location/department access
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                    {formError && (
                        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Role Name *</label>
                        <Input
                            value={roleName}
                            onChange={(e) => { setRoleName(e.target.value); setFormError(""); }}
                            placeholder="Enter role name"
                            className="rounded-lg"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-slate-600">Send Email Notifications</label>
                        <button
                            type="button"
                            onClick={() => setSendEmail(!sendEmail)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${sendEmail ? "bg-blue-500" : "bg-slate-300"}`}
                        >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendEmail ? "left-5.5 translate-x-0" : "left-0.5"}`}
                                style={{ left: sendEmail ? "22px" : "2px" }}
                            />
                        </button>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-600">Location & Department Access</label>
                            <button onClick={addRow} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add Row
                            </button>
                        </div>

                        {locationDeptRows.map((row, idx) => (
                            <div key={idx} className="flex gap-2 mb-2 items-start">
                                <select
                                    value={row.location}
                                    onChange={(e) => handleLocationChange(idx, e.target.value)}
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Locations</option>
                                    {locations.map((loc) => (
                                        <option key={loc.location_id} value={loc.location_id}>{loc.location}</option>
                                    ))}
                                </select>
                                <select
                                    multiple
                                    value={row.departments}
                                    onChange={(e) => handleDeptChange(idx, Array.from(e.target.selectedOptions, (o) => o.value))}
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[38px]"
                                >
                                    {row.deptOptions.length === 0 ? (
                                        <option value="" disabled>Select location first</option>
                                    ) : (
                                        row.deptOptions.map((d) => (
                                            <option key={d.department_id} value={d.department_id}>{d.name}</option>
                                        ))
                                    )}
                                </select>
                                {locationDeptRows.length > 1 && (
                                    <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 mt-2">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
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
                        Add Role
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddRoleDialog;
