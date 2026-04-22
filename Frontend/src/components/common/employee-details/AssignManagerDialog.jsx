import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserCog, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  fetchNonAdminList, assignManagerToMultiple,
} from "@/page/protected/admin/employee-details/service";

const SYSTEM_ROLE_NAMES = new Set(["admin", "employee"]);

export default function AssignManagerDialog({
  open,
  onOpenChange,
  userIds = [],
  allRoles = [],
  onSuccess,
  onResult,
}) {
  const { t } = useTranslation();
  const [nonAdmins, setNonAdmins] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      const list = await fetchNonAdminList();
      if (!cancelled) {
        setNonAdmins(list);
        setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Roles come from the page's /settings/roles fetch — show every role that
  // isn't "Admin" or "Employee", even if no users are in it yet.
  const roles = useMemo(
    () => allRoles.filter((r) => !SYSTEM_ROLE_NAMES.has((r.label || "").toLowerCase())),
    [allRoles],
  );

  const managers = useMemo(
    () => (roleId ? nonAdmins.filter((m) => m.roleId === roleId) : []),
    [nonAdmins, roleId],
  );

  const handleRoleChange = (next) => {
    setRoleId(next);
    setManagerId("");
  };

  const handleOpenChange = (next) => {
    if (!next) {
      setRoleId("");
      setManagerId("");
      setSubmitting(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!roleId || !managerId || userIds.length === 0 || submitting) return;
    setSubmitting(true);
    const res = await assignManagerToMultiple({ userIds, managerId, roleId });
    setSubmitting(false);
    if (res?.code === 200) {
      onResult?.("success", res?.message || t("emp_manager_assigned_success"));
      onSuccess?.();
      handleOpenChange(false);
    } else if (res?.code === 207) {
      onResult?.("error", res?.message || t("emp_manager_assign_partial"));
      onSuccess?.();
    } else {
      onResult?.("error", res?.message || t("emp_manager_assign_failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 border-0 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <UserCog size={18} className="text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-gray-800">
              {t("emp_assign_manager")}
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {t("emp_assign_manager_to_count", { count: userIds.length })}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-gray-700">
              {t("emp_role")}
            </label>
            <Select value={roleId} onValueChange={handleRoleChange} disabled={submitting || loadingList}>
              <SelectTrigger className="h-10 rounded-xl border-gray-200 text-[13px]">
                <SelectValue placeholder={loadingList ? t("emp_loading") : t("emp_select_role")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {roles.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-gray-400">
                    {loadingList ? t("emp_loading") : t("emp_no_roles_available")}
                  </div>
                ) : (
                  roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-gray-700">
              {t("emp_manager")}
            </label>
            <Select value={managerId} onValueChange={setManagerId} disabled={!roleId || submitting}>
              <SelectTrigger className="h-10 rounded-xl border-gray-200 text-[13px]">
                <SelectValue placeholder={!roleId ? t("emp_select_role_first") : t("emp_select_manager")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {managers.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-gray-400">
                    {t("emp_no_managers_for_role")}
                  </div>
                ) : (
                  managers.map((m) => (
                    <SelectItem key={m.managerId} value={String(m.managerId)}>
                      {m.name}{m.empCode ? ` (${m.empCode})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-5 flex gap-3 justify-end">
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}
              className="h-9 px-5 rounded-xl text-[13px]">
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!roleId || !managerId || submitting}
            className="h-9 px-5 rounded-xl text-[13px] text-white bg-violet-500 hover:bg-violet-600 gap-2"
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            {t("emp_assign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
