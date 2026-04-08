import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { bulkUpdateEmployees, fetchEmployeeList } from "@/page/protected/admin/employee-details/service";

export default function BulkUpdateModal({ open, onOpenChange, onSuccess }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    setResult(null);
    const res = await bulkUpdateEmployees(file);
    setSubmitting(false);
    if (res?.code === 200) {
      setResult({ type: "success", updated: res.data?.added_users ?? 0,
        notFound:  res.data?.nonExistEmployeeUniqueId ?? [],
        badRoles:  res.data?.nonExistingRoles ?? [],
      });
      onSuccess?.();
    } else {
      setResult({ type: "error", msg: res?.msg || t("emp_bulk_update_failed") });
    }
  };

  const handleClose = (v) => {
    if (!v) { setFile(null); setResult(null); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[550px] rounded-3xl p-0 border-0 shadow-2xl overflow-hidden gap-0 [&>button:last-child]:hidden">
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
                  const headers = ["First Name", "Last Name", "Full Name", "UserName", "Email",
                    "Employee ID", "Employee Unique ID", "Last Login", "Location", "Department",
                    "Role"];
                  const rows = employees.map((emp) => [
                    emp.first_name || emp.name || "",
                    emp.last_name || "",
                    emp.full_name || "",
                    emp.username || "",
                    emp.email || "",
                    emp.emp_code || "",
                    emp.employee_unique_id || "",
                    emp.employee_updated_at || "",
                    emp.location || "",
                    emp.department || "",
                    emp.role || (Array.isArray(emp.roles) && emp.roles[0]?.role) || "",
                  ]);
                  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Employees");
                  XLSX.writeFile(wb, "Employee list.xlsx");
                } catch (err) {
                  setResult({ type: "error", msg: t("emp_failed_download_list") });
                }
                setDownloading(false);
              }}
            >
              {downloading ? t("emp_downloading") : t("emp_download")}
            </button>{" "}{t("emp_user_list_template")}.
          </p>

          {result && (
            <div className={`rounded-xl p-4 text-[13px] space-y-1 ${result.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              {result.type === "success" ? (
                <>
                  <p className="flex items-center gap-2 text-green-700 font-semibold">
                    <CheckCircle2 size={15} /> {t("emp_count_updated", { count: result.updated })}
                  </p>
                  {result.notFound.length > 0 && <p className="text-amber-600">{t("emp_count_not_found", { count: result.notFound.length })}</p>}
                  {result.badRoles.length > 0 && <p className="text-amber-600">{t("emp_invalid_roles_skipped", { count: result.badRoles.length })}</p>}
                </>
              ) : (
                <p className="flex items-center gap-2 text-red-600 font-semibold">
                  <AlertCircle size={15} /> {result.msg}
                </p>
              )}
            </div>
          )}
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
