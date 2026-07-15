import React, { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
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
import { validateRoleName } from "@/page/protected/admin/roles-permissions/service";

const CloneRoleDialog = ({ open, onOpenChange }) => {
    const saving = useRolesPermissionStore((s) => s.saving);
    const confirmCloneRole = useRolesPermissionStore((s) => s.confirmCloneRole);

    const [newName, setNewName] = useState("");
    const [formError, setFormError] = useState("");

    const resetForm = () => {
        setNewName("");
        setFormError("");
    };

    const handleOpenChange = (isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
    };

    const handleSubmit = async () => {
        const validationError = validateRoleName(newName);
        if (validationError) {
            setFormError(validationError);
            return;
        }
        setFormError("");

        // Store closes the dialog + fires a success swal on success, error swal
        // on failure — only reset the local form here.
        const result = await confirmCloneRole(newName.trim());
        if (result?.success) {
            resetForm();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-sm rounded-2xl p-0 gap-0 border-0">
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <Copy className="w-5 h-5" />
                            Clone Role
                        </DialogTitle>
                        <DialogDescription className="text-violet-100 text-xs mt-1">
                            Create a copy of this role with a new name
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
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">New Role Name *</label>
                        <Input
                            value={newName}
                            onChange={(e) => { setNewName(e.target.value); setFormError(""); }}
                            placeholder="Enter new role name"
                            className="rounded-lg"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
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
                        className="rounded-xl px-5 text-xs font-semibold bg-violet-600 hover:bg-violet-700"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Clone Role
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CloneRoleDialog;
