import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { bulkDeleteEmployees } from "@/page/protected/admin/employee-details/service";

// Escape translated strings before dropping them into the swal `html` body.
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default function BulkDeleteModal({ open, onOpenChange, onSuccess }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleSubmit = async () => {
    if (!file) return;

    // Bulk delete is destructive — confirm before running.
    const confirmed = await Swal.fire({
      icon: "warning",
      title: t("emp_bulk_delete"),
      text: t("emp_bulk_delete_confirm"),
      showCancelButton: true,
      confirmButtonText: t("delete"),
      cancelButtonText: t("cancel"),
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    });
    if (!confirmed.isConfirmed) return;

    setSubmitting(true);
    const res = await bulkDeleteEmployees(file);
    setSubmitting(false);

    if (res?.code === 200) {
      const deleted = res.data?.success_email ?? [];
      const invalid = res.data?.invalid_email ?? [];

      onSuccess?.();
      handleClose(false);

      // Rows whose email matched no employee are "invalid" — a partial result,
      // so warn (and list how many) rather than claim a clean delete.
      const lines = [`<div>${esc(t("emp_count_deleted", { count: deleted.length }))}</div>`];
      if (invalid.length > 0) lines.push(`<div style="color:#d97706">${esc(t("emp_invalid_emails_skipped", { count: invalid.length }))}</div>`);
      const hasIssues = invalid.length > 0;

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
        text: res?.message || res?.msg || t("emp_bulk_delete_failed"),
        confirmButtonColor: "#ef4444",
      });
      // code === -1 → browser-level upload abort (commonly Chromium's
      // ERR_UPLOAD_FILE_CHANGED, which happens if the user edits and re-saves
      // the picked XLSX between attempts). Force a fresh selection.
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
        <DialogTitle className="sr-only">{t("emp_bulk_delete")}</DialogTitle>
        <DialogDescription className="sr-only">Upload a file to bulk-delete employees</DialogDescription>
        <div className="relative px-7 py-5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)" }}>
          <h2 className="text-white text-xl font-bold tracking-tight">{t("emp_bulk_delete")}</h2>
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
            <a href="/src/assets/registration-excel/Employee Bulk Delete.xlsx" download="Employee Bulk Delete.xlsx" className="text-blue-600 font-bold hover:underline">
              {t("emp_download")}
            </a>{" "}{t("emp_sample_template")}.
          </p>
        </div>

        <div className="border-t border-gray-200 mx-7" />

        <div className="px-7 py-5 flex items-center justify-end gap-3">
          <DialogClose asChild>
            <Button className="h-11 px-8 rounded-full bg-gray-400 hover:bg-gray-500 text-white text-[15px] font-semibold">{t("no")}</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!file || submitting}
            className="h-11 px-8 rounded-full bg-red-500 hover:bg-red-600 text-white text-[15px] font-semibold gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {t("upload")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
