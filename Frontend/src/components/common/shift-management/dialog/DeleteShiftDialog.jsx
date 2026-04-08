import React from "react"
import { useTranslation } from "react-i18next";
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

const DeleteShiftDialog = ({ open, onOpenChange, onConfirm, deleting }) => {  const { t } = useTranslation();

    const handleDelete = async () => {
        await onConfirm()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm rounded-2xl p-0 gap-0 border-0">
                <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Delete Shift
                        </DialogTitle>
                        <DialogDescription className="text-red-100 text-xs mt-1">
                            {t("shift.cannotBeUndone")}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-6">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-800">{t("shift.deleteShiftConfirm")}</p>
                            <p className="text-xs text-slate-500 mt-1">
                                {t("shift.deleteShiftWarning")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl px-5 text-xs font-semibold border-slate-300"
                        onClick={() => onOpenChange(false)}
                        disabled={deleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        className="rounded-xl px-5 text-xs font-semibold"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Delete Shift
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default DeleteShiftDialog
