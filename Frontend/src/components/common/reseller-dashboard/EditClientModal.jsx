import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResellerStore } from "@/page/protected/admin/reseller-dashboard/resellerStore";

export default function EditClientModal() {
    const { t } = useTranslation();
    const open = useResellerStore((s) => s.editModalOpen);
    const client = useResellerStore((s) => s.editingClient);
    const setModal = useResellerStore((s) => s.setModal);
    const updateAction = useResellerStore((s) => s.updateClient);
    const licenses = useResellerStore((s) => s.licenses);
    const fetchLicenses = useResellerStore((s) => s.fetchLicenses);

    const [form, setForm] = useState({ licenses: "", expiryDate: "", note: "", resellerId: "", resellerNumber: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && client) {
            setForm({
                licenses: String(client.totalUsers || ""),
                expiryDate: client.expiry !== "-" ? client.expiry : "",
                note: client.note === "--" ? "" : (client.note || ""),
                resellerId: client.resellerId || "",
                resellerNumber: client.resellerNumber || "",
            });
            fetchLicenses();
        }
    }, [open, client]);

    if (!open || !client) return null;

    const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

    const handleSubmit = async () => {
        setSaving(true);
        await updateAction({
            client_id: client.clientUserId,
            expiry_date: form.expiryDate || undefined,
            total_allowed_user_count: Number(form.licenses),
            notes: form.note || undefined,
            reseller_id_client: form.resellerId || undefined,
            reseller_number_client: form.resellerNumber || undefined,
        });
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between px-6 py-4 bg-blue-500 rounded-t-2xl">
                    <h3 className="text-white font-semibold">{t("reseller.updateClient")}</h3>
                    <button onClick={() => setModal("editModalOpen", false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">{t("reseller.username")}</label>
                            <Input value={client.username} disabled className="h-9 text-sm bg-slate-50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">{t("common.email")}</label>
                            <Input value={client.email} disabled className="h-9 text-sm bg-slate-50" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">{t("reseller.licenses")} * <span className="text-slate-400 font-normal">({t("common.max")} {licenses.leftOverLicenses + client.totalUsers})</span></label>
                            <Input type="number" min={0} value={form.licenses} onChange={(e) => set("licenses", e.target.value)} className="h-9 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">{t("reseller.expiryDate")}</label>
                            <Input type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} className="h-9 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t("common.note")}</label>
                        <textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t">
                    <Button variant="outline" onClick={() => setModal("editModalOpen", false)}>{t("common.cancel")}</Button>
                    <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleSubmit} disabled={saving}>{saving ? t("reseller.updating") : t("reseller.updateClient")}</Button>
                </div>
            </div>
        </div>
    );
}
