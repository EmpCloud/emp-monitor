import React from "react"
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import useMonitoringControlStore from "@/page/protected/admin/monitoring-control/monitoringControlStore"

const DeleteGroupDialog = ({ open, onOpenChange }) => {  const { t } = useTranslation();

    const { deletingGroup, deleteGroupAction, saving } = useMonitoringControlStore()

    const handleDelete = async () => {
        if (!deletingGroup) return
        const res = await deleteGroupAction(deletingGroup.group_id)
        if (!res.success) {
            alert(res.message || "Failed to delete group")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl p-0 gap-0 border-0">
                <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader className="flex-row items-center gap-3 space-y-0">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Trash2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-white">
                                Delete Group
                            </DialogTitle>
                            <DialogDescription className="text-xs text-red-100 mt-0.5">
                                {t("shift.cannotBeUndone")}
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                </div>

                <div className="px-6 py-6 space-y-5">
                    <p className="text-sm text-slate-600">
                        Are you sure you want to delete the group{" "}
                        <span className="font-semibold text-slate-900">
                            &quot;{deletingGroup?.name}&quot;
                        </span>
                        ? {t("monitoring.deleteGroupWarning")}
                    </p>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            size="lg"
                            variant="outline"
                            className="rounded-xl px-5 text-xs font-semibold"
                            onClick={() => onOpenChange(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="lg"
                            className="rounded-xl bg-red-500 hover:bg-red-600 px-5 text-xs font-semibold shadow-sm"
                            onClick={handleDelete}
                            disabled={saving}
                        >
                            {saving ? t("common.deleting") : t("delete")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default DeleteGroupDialog
