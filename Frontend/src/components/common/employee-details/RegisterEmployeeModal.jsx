import { useState } from "react";
import { UserCircle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEmployeeForm } from "./useEmployeeForm";
import EmployeeFormBody from "./EmployeeFormBody";
import { registerEmployee } from "@/page/protected/admin/employee-details/service";

export default function RegisterEmployeeModal({ open, onOpenChange, locations = [], roles = [], shifts = [], onSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success"|"error", msg }

  const { form, set, reset, errors, departments, deptLoading, validate, buildFormData } = useEmployeeForm(locations);

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setStatus(null);
    const res = await registerEmployee(await buildFormData());
    setSubmitting(false);
    if (res?.code === 200) {
      setStatus({ type: "success", msg: "Employee registered successfully." });
      reset();
      onSuccess?.();
      setTimeout(() => { onOpenChange(false); setStatus(null); }, 1200);
    } else {
      const errMsg = res?.message || res?.msg || res?.error || res?.data?.message || "Registration failed. Please try again.";
      setStatus({ type: "error", msg: errMsg });
    }
  };

  const handleClose = (open) => {
    if (!open) { reset(); setStatus(null); }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[620px] md:max-w-[660px] max-h-[92vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
        <DialogHeader className="px-8 pt-8 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="w-1 self-stretch rounded-xl bg-blue-500 flex-shrink-0" />
              <div>
                <DialogTitle className="text-2xl sm:text-[26px] leading-tight font-normal tracking-tight">
                  <span className="font-extrabold">Add</span>{" "}
                  <span className="font-semibold">Employee</span>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-blue-500 mt-1.5 italic">
                  Fill in the details to register a new employee.
                </DialogDescription>
              </div>
            </div>
            <div className="w-16 h-16 rounded-xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-11 h-11 text-blue-400" strokeWidth={1} />
            </div>
          </div>
        </DialogHeader>

        {status && (
          <div className={`mx-8 mt-4 px-4 py-2.5 rounded-xl text-[13px] font-medium ${status.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
            {status.msg}
          </div>
        )}

        <EmployeeFormBody
          form={form} set={set} errors={errors}
          showPassword={showPassword} setShowPassword={setShowPassword}
          showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
          locations={locations} roles={roles} shifts={shifts}
          departments={departments} deptLoading={deptLoading}
        />

        <DialogFooter className="px-8 pb-7 pt-2 flex flex-row items-center justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline" className="h-10 px-7 rounded-xl text-[13px] font-semibold">
              Close
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting}
            className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Register Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
