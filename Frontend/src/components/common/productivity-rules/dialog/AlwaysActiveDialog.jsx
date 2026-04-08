import React from "react";
import { useTranslation } from "react-i18next";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useProductivityRulesStore } from "@/page/protected/admin/productivity-rules/productivityRulesStore";

const AlwaysActiveDialog = () => {
    const { t } = useTranslation();
    const {
        alwaysActiveDialogOpen,
        closeAlwaysActiveDialog,
        alwaysActiveTime,
        setAlwaysActiveTime,
        saveAlwaysActive,
        updating,
    } = useProductivityRulesStore();

    const handleTimeChange = (e) => {
        let val = e.target.value.replace(/[^0-9:]/g, "");
        // Auto-format: allow HH:MM
        if (val.length === 2 && !val.includes(":")) {
            val = val + ":";
        }
        if (val.length > 5) val = val.slice(0, 5);
        setAlwaysActiveTime(val);
    };

    return (
        <Dialog open={alwaysActiveDialogOpen} onOpenChange={(open) => !open && closeAlwaysActiveDialog()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-violet-500" />
                        <DialogTitle>{t("prodRules.setAlwaysActiveTime")}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {t("prodRules.setAlwaysActiveDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-3">
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Enter Time (HH:MM)
                    </label>
                    <Input
                        value={alwaysActiveTime}
                        onChange={handleTimeChange}
                        placeholder="00:00"
                        className="rounded-lg text-center text-lg font-mono tracking-wider"
                        maxLength={5}
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                        {t("prodRules.timeFormat")}
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={closeAlwaysActiveDialog} className="rounded-xl">
                        Cancel
                    </Button>
                    <Button
                        onClick={saveAlwaysActive}
                        disabled={updating}
                        className="rounded-xl bg-violet-500 hover:bg-violet-600"
                    >
                        {updating && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AlwaysActiveDialog;
