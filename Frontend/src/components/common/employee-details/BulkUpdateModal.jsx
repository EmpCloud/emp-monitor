import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { bulkUpdateEmployees, fetchEmployeeList } from "@/page/protected/admin/employee-details/service";

// Escape translated strings before dropping them into the swal `html` body.
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default function BulkUpdateModal({ open, onOpenChange, onSuccess }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    const res = await bulkUpdateEmployees(file);
    setSubmitting(false);
    if (res?.code === 200) {
      const updated  = res.data?.added_users ?? 0;
      const notFound = res.data?.nonExistEmployeeUniqueId ?? [];
      const badRoles = res.data?.nonExistingRoles ?? [];

      onSuccess?.();
      handleClose(false);

      // Preserve the not-found / invalid-role breakdown from the inline panel.
      // Any skipped rows make this a partial result → warning, not success.
      const lines = [`<div>${esc(t("emp_count_updated", { count: updated }))}</div>`];
      if (notFound.length > 0) lines.push(`<div style="color:#d97706">${esc(t("emp_count_not_found", { count: notFound.length }))}</div>`);
      if (badRoles.length > 0) lines.push(`<div style="color:#d97706">${esc(t("emp_invalid_roles_skipped", { count: badRoles.length }))}</div>`);
      const hasIssues = notFound.length > 0 || badRoles.length > 0;

      Swal.fire({
        icon: hasIssues ? "warning" : "success",
        title: hasIssues ? t("warning") : t("success"),
        html: `<div style="font-size:14px;line-height:1.6">${lines.join("")}</div>`,
        confirmButtonColor: hasIssues ? "#f59e0b" : "#3b82f6",
        ...(hasIssues ? {} : { timer: 2500, showConfirmButton: false }),
      });
    } else {
      Swal.fire({
        icon: "error",
        title: t("error"),
        text: res?.message || res?.msg || t("emp_bulk_update_failed"),
        confirmButtonColor: "#ef4444",
      });
      // code === -1 → browser-level upload abort (commonly Chromium's
      // ERR_UPLOAD_FILE_CHANGED, which happens if the user edits and re-saves
      // the picked XLSX between attempts). The File handle is now stale and
      // the next click would fail the same way. Force a fresh selection.
      if (res?.code === -1) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleClose = (v) => {
    if (!v) { setFile(null); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[550px] rounded-3xl p-0 border-0 shadow-2xl overflow-hidden gap-0 [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">{t("emp_bulk_update")}</DialogTitle>
        <DialogDescription className="sr-only">Upload a file to bulk-update employees</DialogDescription>
        <div className="relative px-7 py-5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #7c3aed 100%)" }}>
          <h2 className="text-white text-xl font-bold tracking-tight">{t("emp_bulk_update")}</h2>
          <DialogClose className="text-white hover:text-white/80 transition-colors rounded-sm focus:outline-none">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        <div className="px-7 pt-8 pb-4 space-y-5">
          <div className="flex items-center border border-gray-300 rounded-full overflow-hidden">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
              onChange={handleFileChange} className="hidden" />
            <div className="flex-1 px-5 py-3 text-gray-400 text-[15px] truncate cursor-default"
              onClick={() => fileInputRef.current?.click()}>
              {file ? file.name : t("emp_choose_file")}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-gray-200 text-gray-500 text-[15px] font-medium hover:bg-gray-300 transition-colors">
              {t("emp_browse")}
            </button>
          </div>

          <p className="text-[14px] text-gray-600 leading-relaxed">
            {t("emp_upload_note_xlsx")}{" "}
            <button
              type="button"
              disabled={downloading}
              className="text-blue-600 font-bold hover:underline disabled:opacity-50"
              onClick={async () => {
                setDownloading(true);
                try {
                  const employees = await fetchEmployeeList();
                  // Header text must exactly match the backend's column map at
                  // Backend/admin/src/utils/helpers/LanguageTranslate.js
                  // (bulkRegAndUpdate.en) — case-sensitive. Previously this
                  // shipped "Employee ID" and "Employee Unique ID", which the
                  // backend reads as "Employee Code" and "Employee Unique Id",
                  // so every uploaded row had EmployeeCode/EmployeeUniqueId
                  // undefined and Joi 400'd with "EmployeeCode is not provided
                  // for some users." (see #198).
                  const headers = ["First Name", "Last Name", "Email",
                    "Employee Code", "Employee Unique Id", "Location",
                    "Department", "Role"];
                  const rows = employees.map((emp) => [
                    emp.first_name || emp.name || "",
                    emp.last_name || "",
                    emp.email || "",
                    emp.emp_code || "",
                    emp.employee_unique_id || "",
                    emp.location || "",
                    emp.department || "",
                    emp.role || (Array.isArray(emp.roles) && emp.roles[0]?.role) || "",
                  ]);
                  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Employees");
                  XLSX.writeFile(wb, "Employee list.xlsx");
                } catch {
                  Swal.fire({
                    icon: "error",
                    title: t("error"),
                    text: t("emp_failed_download_list"),
                    confirmButtonColor: "#ef4444",
                  });
                }
                setDownloading(false);
              }}
            >
              {downloading ? t("emp_downloading") : t("emp_download")}
            </button>{" "}{t("emp_user_list_template")}.
          </p>
        </div>

        <div className="border-t border-gray-200 mx-7" />

        <div className="px-7 py-5 flex items-center justify-end gap-3">
          <DialogClose asChild>
            <Button className="h-11 px-8 rounded-full bg-purple-400 hover:bg-purple-500 text-white text-[15px] font-semibold">{t("no")}</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!file || submitting}
            className="h-11 px-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-[15px] font-semibold gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {t("upload")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
