import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useAutoEmailReportStore } from "@/page/protected/admin/auto-email-report/autoEmailReportStore";

const DeleteReportDialog = ({ open, onOpenChange }) => {  const { t } = useTranslation();

    const deleting = useAutoEmailReportStore((s) => s.deleting);
    const confirmDelete = useAutoEmailReportStore((s) => s.confirmDelete);

    const handleConfirm = async () => {
        await confirmDelete();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl p-0 gap-0 border-0">
                <div className="px-6 py-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-lg font-bold text-slate-800">
                            Delete Report
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            {t("emailReport.deleteConfirm")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-center gap-3 pt-2">
                        <Button
                            variant="destructive"
                            className="rounded-xl px-6 text-xs font-semibold"
                            onClick={handleConfirm}
                            disabled={deleting}
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            {t("locDept.yesDelete")}
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl px-6 text-xs font-semibold border-slate-300"
                            onClick={() => onOpenChange(false)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteReportDialog;
