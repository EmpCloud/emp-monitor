import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { bulkUpdateEmployees } from "@/page/protected/admin/employee-details/service";

export default function BulkUpdateModal({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
      setResult({ type: "error", msg: res?.msg || "Bulk update failed." });
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
          <h2 className="text-white text-xl font-bold tracking-tight">Bulk Update</h2>
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
              {file ? file.name : "Choose file…"}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-gray-200 text-gray-500 text-[15px] font-medium hover:bg-gray-300 transition-colors">
              Browse
            </button>
          </div>

          <p className="text-[14px] text-gray-600 leading-relaxed">
            Note: Upload file only in <strong>.xlsx</strong> format.{" "}
            <button
              type="button"
              className="text-blue-600 font-bold hover:underline"
              onClick={() => {
                const headers = [["Unique ID", "First Name", "Last Name", "Email", "Emp Code", "Role", "Location", "Department", "Shift"]];
                const ws = XLSX.utils.aoa_to_sheet(headers);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Template");
                XLSX.writeFile(wb, "bulk_update_template.xlsx");
              }}
            >
              Download
            </button>{" "}User List template.
          </p>

          {result && (
            <div className={`rounded-xl p-4 text-[13px] space-y-1 ${result.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              {result.type === "success" ? (
                <>
                  <p className="flex items-center gap-2 text-green-700 font-semibold">
                    <CheckCircle2 size={15} /> {result.updated} employee(s) updated.
                  </p>
                  {result.notFound.length > 0 && <p className="text-amber-600">⚠ {result.notFound.length} employee(s) not found.</p>}
                  {result.badRoles.length > 0 && <p className="text-amber-600">⚠ {result.badRoles.length} invalid role(s) skipped.</p>}
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
            <Button className="h-11 px-8 rounded-full bg-purple-400 hover:bg-purple-500 text-white text-[15px] font-semibold">No</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!file || submitting}
            className="h-11 px-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-[15px] font-semibold gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
