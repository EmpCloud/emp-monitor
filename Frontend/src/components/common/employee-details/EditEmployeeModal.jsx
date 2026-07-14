import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import { UserCircle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEmployeeForm, TIMEZONES } from "./useEmployeeForm";
import EmployeeFormBody from "./EmployeeFormBody";
import { getEmployeeDetails, editEmployee, uploadEmployeeProfilePic } from "@/page/protected/admin/employee-details/service";

export default function EditEmployeeModal({ open, onOpenChange, employeeId, locations = [], roles = [], shifts = [], onSuccess }) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [originalUid, setOriginalUid] = useState("");
  const [existingPhoto, setExistingPhoto] = useState("");

  const { form, set, reset, errors, setErrors, departments, deptLoading, validate, buildFormData } = useEmployeeForm(locations);

  // Load employee details when modal opens
  useEffect(() => {
    if (!open || !employeeId) return;
    setLoadingDetails(true);
    getEmployeeDetails(employeeId).then((res) => {
      setLoadingDetails(false);
      // /user/get-user returns { code, data: { id, name, last_name, ... } }
      const d = res?.data;
      if (!d) return;
      setOriginalUid(d.uid ?? "");
      setExistingPhoto(d.photo_path ?? "");

      const tzMatch = TIMEZONES.find((tz) => tz.value.startsWith(d.timezone ?? ""))?.value ?? "";

      set("firstName",     d.name ?? d.first_name ?? "");
      set("lastName",      d.last_name ?? "");
      set("email",         d.email ?? "");
      set("password",      d.password ?? "");
      // phone may be stored as "countryCode-number" (e.g. "91-9876543210")
      const rawPhone = d.phone ?? "";
      const dashIdx = rawPhone.indexOf("-");
      if (dashIdx > 0 && dashIdx <= 4) {
        set("countryCode", rawPhone.slice(0, dashIdx));
        set("mobile",      rawPhone.slice(dashIdx + 1));
      } else {
        set("mobile", rawPhone);
      }
      set("employeeCode",  d.emp_code ?? "");
      set("locationId",    d.location_id ? String(d.location_id) : "");
      set("departmentId",  d.department_id ? String(d.department_id) : "");
      set("roleId",        d.role_id ? String(d.role_id) : (Array.isArray(d.roles) && d.roles[0]?.role_id ? String(d.roles[0].role_id) : ""));
      set("timezone",      tzMatch);
      set("shift",         d.shift_id ? String(d.shift_id) : "");
      set("dateOfJoining", d.date_join ? d.date_join.slice(0, 10) : "");
      set("address",       d.address ?? "");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId]);

  const handleSubmit = async () => {
    if (!validate(true)) return;
    setSubmitting(true);
    try {
      const fd = buildFormData({ userId: employeeId, uid: originalUid });
      const res = await editEmployee(fd);
      if (res?.code === 200) {
        // /user/user-profile-update is JSON-only and preserves the existing
        // photo_path; the picked file has to go to the dedicated multer endpoint
        // separately so the avatar actually updates.
        if (form.profilePicture) {
          await uploadEmployeeProfilePic(employeeId, form.profilePicture);
        }
        setSubmitting(false);
        onSuccess?.();
        onOpenChange(false);
        Swal.fire({
          icon: "success",
          title: t("success"),
          text: t("emp_updated_successfully"),
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        setSubmitting(false);
        const errMsg = res?.error || res?.message || res?.msg || res?.data?.message || t("emp_update_failed");
        showError(errMsg);
      }
    } catch (err) {
      // Network / unexpected failure — surface it rather than leaving the
      // button spinning silently.
      setSubmitting(false);
      showError(err?.response?.data?.message || err?.message || t("emp_update_failed"));
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
      text: errMsg || t("emp_update_failed"),
      confirmButtonColor: "#ef4444",
    });
  };

  const handleClose = (open) => {
    if (!open) { reset(); setExistingPhoto(""); }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[620px] md:max-w-[660px] max-h-[92vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
        <DialogHeader className="px-8 pt-8 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="w-1 self-stretch rounded-xl bg-emerald-500 flex-shrink-0" />
              <div>
                <DialogTitle className="text-2xl sm:text-[26px] leading-tight font-normal tracking-tight">
                  <span className="font-extrabold">{t("edit")}</span>{" "}
                  <span className="font-semibold">{t("employee")}</span>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-emerald-500 mt-1.5 italic">
                  {t("emp_update_info_below")}
                </DialogDescription>
              </div>
            </div>
            <div className="w-16 h-16 rounded-xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center flex-shrink-0">
              <UserCircle className="w-11 h-11 text-emerald-400" strokeWidth={1} />
            </div>
          </div>
        </DialogHeader>

        {loadingDetails ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400 text-sm">
            <Loader2 size={20} className="animate-spin" /> {t("emp_loading_employee_data")}
          </div>
        ) : (
          <EmployeeFormBody
            form={form} set={set} errors={errors}
            showPassword={showPassword} setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
            locations={locations} roles={roles} shifts={shifts}
            departments={departments} deptLoading={deptLoading}
            existingPhoto={existingPhoto}
            isEdit
          />
        )}

        <DialogFooter className="px-8 pb-7 pt-2 flex flex-row items-center justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline" className="h-10 px-7 rounded-xl text-[13px] font-semibold">
              {t("close")}
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting || loadingDetails}
            className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {t("emp_save_changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
