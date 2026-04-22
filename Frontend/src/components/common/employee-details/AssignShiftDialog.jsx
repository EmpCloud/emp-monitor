import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { assignShiftToMultiple } from "@/page/protected/admin/employee-details/service";

export default function AssignShiftDialog({
  open,
  onOpenChange,
  userIds = [],
  shifts = [],
  onSuccess,
  onResult,
}) {
  const { t } = useTranslation();
  const [shiftId, setShiftId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (next) => {
    if (!next) {
      setShiftId("");
      setSubmitting(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!shiftId || userIds.length === 0 || submitting) return;
    setSubmitting(true);
    const res = await assignShiftToMultiple(userIds, shiftId);
    setSubmitting(false);
    if (res?.code === 200) {
      onResult?.("success", res?.message || t("emp_shift_assigned_success"));
      onSuccess?.();
      handleOpenChange(false);
    } else {
      onResult?.("error", res?.message || t("emp_shift_assign_failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 border-0 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Clock3 size={18} className="text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-gray-800">
              {t("emp_assign_shift")}
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {t("emp_assign_shift_to_count", { count: userIds.length })}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-[13px] font-semibold text-gray-700">
            {t("emp_shift")}
          </label>
          <Select value={shiftId} onValueChange={setShiftId} disabled={submitting}>
            <SelectTrigger className="h-10 rounded-xl border-gray-200 text-[13px]">
              <SelectValue placeholder={t("emp_select_shift")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-60">
              {shifts.length === 0 ? (
                <div className="px-3 py-2 text-[12px] text-gray-400">
                  {t("emp_no_shifts_available")}
                </div>
              ) : (
                shifts.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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
            disabled={!shiftId || submitting}
            className="h-9 px-5 rounded-xl text-[13px] text-white bg-blue-500 hover:bg-blue-600 gap-2"
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            {t("emp_assign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
