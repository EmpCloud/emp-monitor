import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { fetchAssignedManagersForEmployee } from "@/page/protected/admin/employee-details/service";

const avatarColors = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500",
  "bg-orange-400", "bg-rose-500", "bg-teal-500", "bg-cyan-500",
];

const Avatar = ({ name, idx }) => (
  <div className={`w-7 h-7 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}>
    {(name || "?").charAt(0).toUpperCase()}
  </div>
);

export default function AssignedManagersDialog({
  open,
  onOpenChange,
  employee,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !employee?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await fetchAssignedManagersForEmployee(employee.id);
      if (cancelled) return;
      setLoading(false);
      if (res.code === 200) {
        setGroups(res.groups);
      } else {
        setGroups([]);
        setError(res.message || t("emp_failed_to_load"));
      }
    })();
    return () => { cancelled = true; };
  }, [open, employee?.id, t]);

  const totalCount = groups.reduce(
    (sum, g) => sum + (Array.isArray(g.employees) ? g.employees.length : 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-6 border-0 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-gray-800 truncate">
              {t("emp_assigned_managers")}
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5 truncate">
              {employee?.name || "-"}
            </p>
          </div>
        </div>

        <div className="mt-4 min-h-[120px] max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Loader2 size={20} className="animate-spin mb-2" />
              <span className="text-[13px]">{t("emp_loading")}</span>
            </div>
          )}

          {!loading && error && (
            <div className="py-8 text-center text-[13px] text-rose-500">{error}</div>
          )}

          {!loading && !error && totalCount === 0 && (
            <div className="py-10 text-center text-[13px] text-gray-400">
              {t("emp_no_managers_assigned")}
            </div>
          )}

          {!loading && !error && totalCount > 0 && (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.role_id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] font-bold uppercase tracking-wide text-blue-600">
                      {group.role_name}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      ({group.employees?.length ?? 0})
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {(group.employees ?? []).map((m, idx) => (
                      <li key={`${group.role_id}-${m.user_id}`}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-white border border-gray-100">
                        <Avatar name={m.name} idx={idx} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-gray-700 truncate">
                            {m.name || "-"}
                          </div>
                          {m.email && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 truncate">
                              <Mail size={10} /> {m.email}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" className="h-9 px-5 rounded-xl text-[13px]">
              {t("close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
