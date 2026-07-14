import { useState } from "react";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import { UserCircle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEmployeeForm } from "./useEmployeeForm";
import EmployeeFormBody from "./EmployeeFormBody";
import { registerEmployee, uploadEmployeeProfilePic } from "@/page/protected/admin/employee-details/service";

export default function RegisterEmployeeModal({ open, onOpenChange, locations = [], roles = [], shifts = [], onSuccess }) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { form, set, reset, errors, setErrors, departments, deptLoading, validate, buildFormData } = useEmployeeForm(locations);

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await registerEmployee(buildFormData());
      if (res?.code === 200) {
        // The register endpoint is JSON-only and can't accept the picked file.
        // The controller assigns the new employee id to req.body.user_id before
        // echoing it back, so use that to drive the dedicated avatar upload.
        const newUserId = res?.data?.user_id ?? res?.data?.userId;
        if (form.profilePicture && newUserId) {
          await uploadEmployeeProfilePic(newUserId, form.profilePicture);
        }
        setSubmitting(false);
        reset();
        onSuccess?.();
        onOpenChange(false);
        Swal.fire({
          icon: "success",
          title: t("success"),
          text: t("emp_registered_successfully"),
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setSubmitting(false);
        const errMsg = res?.error || res?.message || res?.msg || res?.data?.message || t("emp_registration_failed");
        showError(errMsg);
      }
    } catch (err) {
      setSubmitting(false);
      showError(err?.response?.data?.message || err?.message || t("emp_registration_failed"));
    }
  };

  // Map an error message onto the relevant field (so it highlights inline) and
  // always show a swal so the user gets a clear, unmissable reason.
  const showError = (errMsg) => {
    const errLower = (errMsg || "").toLowerCase();
    const fieldErrors = {};

    if (errLower.includes("password"))       fieldErrors.password = errMsg;
    if (errLower.includes("email"))          fieldErrors.email = errMsg;
    if (errLower.includes("first_name") || errLower.includes("first name"))  fieldErrors.firstName = errMsg;
    if (errLower.includes("last_name") || errLower.includes("last name"))    fieldErrors.lastName = errMsg;
    if (errLower.includes("emp_code") || errLower.includes("employee code")) fieldErrors.employeeCode = errMsg;
    if (errLower.includes("location"))       fieldErrors.locationId = errMsg;
    if (errLower.includes("department"))     fieldErrors.departmentId = errMsg;
    if (errLower.includes("role"))           fieldErrors.roleId = errMsg;
    if (errLower.includes("phone") || errLower.includes("mobile")) fieldErrors.mobile = errMsg;
    if (errLower.includes("timezone"))       fieldErrors.timezone = errMsg;

    if (Object.keys(fieldErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
    }

    Swal.fire({
      icon: "error",
      title: t("error"),
      text: errMsg || t("emp_registration_failed"),
      confirmButtonColor: "#ef4444",
    });
  };

  const handleClose = (open) => {
    if (!open) reset();
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
                  <span className="font-extrabold">{t("emp_add")}</span>{" "}
                  <span className="font-semibold">{t("employee")}</span>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-blue-500 mt-1.5 italic">
                  {t("emp_fill_details_register")}
                </DialogDescription>
              </div>
            </div>
            <div className="w-16 h-16 rounded-xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-11 h-11 text-blue-400" strokeWidth={1} />
            </div>
          </div>
        </DialogHeader>

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
              {t("close")}
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting}
            className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {t("emp_register_employee")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
