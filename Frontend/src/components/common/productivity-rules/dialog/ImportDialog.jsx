import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useProductivityRulesStore } from "@/page/protected/admin/productivity-rules/productivityRulesStore";

const ImportDialog = ({ variant = "import" }) => {  const { t } = useTranslation();

    const {
        importDialogOpen,
        closeImportDialog,
        handleImport,
        bulkImportDialogOpen,
        closeBulkImportDialog,
        handleBulkImport,
        importing,
    } = useProductivityRulesStore();

    const isBulk = variant === "bulk";
    const isOpen = isBulk ? bulkImportDialogOpen : importDialogOpen;
    const onClose = isBulk ? closeBulkImportDialog : closeImportDialog;
    const onImport = isBulk ? handleBulkImport : handleImport;

    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [error, setError] = useState("");
    const [resultErrors, setResultErrors] = useState([]);

    const handleClose = () => {
        setFile(null);
        setError("");
        setResultErrors([]);
        onClose();
    };

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        const regex = /\.(xlsx)$/i;
        if (!regex.test(selected.name)) {
            setError(t("prodRules.validXlsx"));
            setFile(null);
            return;
        }
        setError("");
        setFile(selected);
    };

    const handleSubmit = async () => {
        if (!file) {
            setError(t("prodRules.selectFileToImport"));
            return;
        }

        const result = await onImport(file);
        if (!result.success) {
            if (result.data && Array.isArray(result.data)) {
                setResultErrors(result.data);
            }
            setError(result.message || "Import failed");
        } else {
            handleClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-blue-500" />
                        <DialogTitle>{isBulk ? t("prodRules.bulkImportRules") : t("prodRules.importData")}</DialogTitle>
                    </div>
                    <DialogDescription>
                        Upload an .xlsx file to {isBulk ? "bulk import productivity rules" : "update productivity rankings"}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 transition-colors"
                    >
                        <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        {file ? (
                            <p className="text-sm text-slate-700 font-medium">{file.name}</p>
                        ) : (
                            <p className="text-sm text-slate-500">{t("prodRules.selectFile")}</p>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".xlsx"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {error && <p className="text-xs text-red-500">{error}</p>}

                    {resultErrors.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded-lg bg-red-50 p-3">
                            <p className="text-xs font-semibold text-red-600 mb-1">{t("prodRules.invalidEntries")}</p>
                            {resultErrors.map((item, idx) => (
                                <p key={idx} className="text-xs text-red-500">
                                    {item.Activity || item.name || JSON.stringify(item)}
                                </p>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-slate-500">
                        <span className="font-semibold">{t("common.note")}:</span> {t("prodRules.onlyXlsx")}
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} className="rounded-xl">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={importing || !file}
                        className="rounded-xl bg-blue-500 hover:bg-blue-600"
                    >
                        {importing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                        Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImportDialog;
