import React, { useState, useEffect, useMemo } from "react";
import { Settings, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useRolesPermissionStore } from "@/page/protected/admin/roles-permissions/rolesPermissionStore";

const PermissionSettingsDialog = ({ open, onOpenChange }) => {
    const saving = useRolesPermissionStore((s) => s.saving);
    const permissionRoleData = useRolesPermissionStore((s) => s.permissionRoleData);
    const categorizedPermissions = useRolesPermissionStore((s) => s.categorizedPermissions);
    const saveFeaturePermissions = useRolesPermissionStore((s) => s.saveFeaturePermissions);

    const [checkedIds, setCheckedIds] = useState(new Set());
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [sendEmail, setSendEmail] = useState(true);

    useEffect(() => {
        if (permissionRoleData && open) {
            const ids = new Set();
            if (permissionRoleData.permission_ids) {
                permissionRoleData.permission_ids.split(",").forEach((id) => {
                    const parsed = parseInt(id, 10);
                    if (!isNaN(parsed)) ids.add(parsed);
                });
            }
            setCheckedIds(ids);
            setSendEmail(permissionRoleData.permission?.send_mail !== false);
            setExpandedCategories(new Set());
        }
    }, [permissionRoleData, open]);

    const rolePermission = permissionRoleData?.permission || {};

    // Mirrors PHP roleCommonScript.permissionSetting() filter for EMP module only.
    // For the "Employee" role, PHP only surfaces the "My Productivity" card.
    // Category headers render whenever the category has any source perms — even
    // if every checkbox inside is filtered out by the role's RWD — so the user
    // still sees what's available and understands why it's empty.
    const visibleCategories = useMemo(() => {
        const result = {};
        Object.entries(categorizedPermissions).forEach(([category, perms]) => {
            const categoryKeyNoSpace = category.replace(/\s+/g, "");
            if (permissionRoleData?.name === "Employee" && categoryKeyNoSpace !== "MyProductivity") {
                return;
            }
            if (!perms?.length) return;

            const allowedPerms = perms.filter((p) => {
                if (p.status === 1 && rolePermission.read === true) return true;
                if (p.status === 2 && rolePermission.write === true) return true;
                if (p.status === 3 && rolePermission.delete === true) return true;
                return false;
            });
            result[category] = allowedPerms;
        });
        return result;
    }, [categorizedPermissions, rolePermission, permissionRoleData]);

    const hasAnyVisibleCheckbox = useMemo(
        () => Object.values(visibleCategories).some((arr) => arr.length > 0),
        [visibleCategories]
    );

    const toggleCategory = (category) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) next.delete(category);
            else next.add(category);
            return next;
        });
    };

    const togglePermission = (permId, status, category) => {
        setCheckedIds((prev) => {
            const next = new Set(prev);
            if (next.has(permId)) {
                next.delete(permId);
            } else {
                next.add(permId);
            }

            // PHP checkedChnage: any non-View toggle also forces the View checkbox on.
            if (status === 2 || status === 3) {
                const viewPerm = visibleCategories[category]?.find((p) => p.status === 1);
                if (viewPerm) next.add(viewPerm.id);
            }

            return next;
        });
    };

    const handleSubmit = async () => {
        if (!permissionRoleData) return;

        const permissionIds = Array.from(checkedIds).map(String);
        const added = [];
        const removed = [];

        ["read", "write", "delete"].forEach((p) => {
            if (rolePermission[p]) added.push(p);
            else removed.push(p);
        });

        await saveFeaturePermissions({
            roleId: permissionRoleData.id,
            name: permissionRoleData.name,
            permissionIds,
            added,
            removed,
            mailStatus: sendEmail,
        });
    };

    if (!permissionRoleData) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-2xl p-0 gap-0 border-0">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Permission Settings [{permissionRoleData.name}]
                        </DialogTitle>
                        <DialogDescription className="text-indigo-100 text-xs mt-1">
                            Configure feature-level permissions for this role
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                    {permissionRoleData.type !== 0 && (
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                            <label className="text-xs font-semibold text-slate-600">Send Email Notifications</label>
                            <button
                                type="button"
                                onClick={() => setSendEmail(!sendEmail)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${sendEmail ? "bg-indigo-500" : "bg-slate-300"}`}
                            >
                                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                                    style={{ left: sendEmail ? "22px" : "2px" }}
                                />
                            </button>
                        </div>
                    )}

                    <div className="space-y-1">
                        {Object.entries(visibleCategories).map(([category, perms]) => {
                            const isExpanded = expandedCategories.has(category);

                            return (
                                <div key={category} className="border border-slate-100 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleCategory(category)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        <span className="text-xs font-semibold text-slate-700">{category}</span>
                                        {isExpanded
                                            ? <ChevronDown className="w-4 h-4 text-slate-400" />
                                            : <ChevronRight className="w-4 h-4 text-slate-400" />
                                        }
                                    </button>
                                    {isExpanded && (
                                        <div className="px-4 py-3 flex flex-wrap gap-4">
                                            {perms.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">
                                                    Enable Read / Write / Delete on this role to access these permissions.
                                                </p>
                                            ) : perms.map((perm) => {
                                                const isChecked = checkedIds.has(perm.id);
                                                const isViewLocked = perm.status === 1 && perms.some(
                                                    (p) => p.status !== 1 && checkedIds.has(p.id)
                                                );

                                                return (
                                                    <label
                                                        key={perm.id}
                                                        className="flex items-center gap-2 cursor-pointer"
                                                    >
                                                        <Checkbox
                                                            checked={isChecked}
                                                            disabled={isViewLocked}
                                                            onCheckedChange={() => togglePermission(perm.id, perm.status, category)}
                                                            className="border-slate-300 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                                        />
                                                        <span className="text-xs text-slate-600">{perm.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {Object.keys(visibleCategories).length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-sm text-slate-400">
                                    {Object.keys(categorizedPermissions).length === 0
                                        ? "Loading permissions…"
                                        : "No permissions defined for this role."}
                                </p>
                            </div>
                        )}

                        {Object.keys(visibleCategories).length > 0 && !hasAnyVisibleCheckbox && (
                            <div className="text-center py-3">
                                <p className="text-xs text-slate-400 italic">
                                    Tip: enable Read / Write / Delete on the role (in the table) to populate these categories.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl px-5 text-xs font-semibold border-slate-300"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="rounded-xl px-5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Save Permissions
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PermissionSettingsDialog;
