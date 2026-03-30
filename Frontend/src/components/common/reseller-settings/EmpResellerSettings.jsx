import React, { useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmpResellerSettingsLogo from "@/assets/reseller/reseller-settings.svg";
import { useResellerSettingsStore } from "@/page/protected/admin/reseller-settings/settingsStore";

const FIELDS = [
    { key: "facebook", label: "Facebook", placeholder: "Facebook Page Link" },
    { key: "instagram", label: "Instagram", placeholder: "Instagram Page Link" },
    { key: "twitter", label: "Twitter", placeholder: "Twitter Page Link" },
    { key: "brand_name", label: "Brand Name *", placeholder: "Brand Name" },
    { key: "copyright_name", label: "Copyright Name", placeholder: "Copyright Name" },
    { key: "copyright_year", label: "Copyright Year", placeholder: "YYYY-YYYY" },
    { key: "support_text", label: "Support Text", placeholder: "Support Text" },
    { key: "support_mail", label: "Support Email", placeholder: "Support Email" },
    { key: "skype_email", label: "Skype Email", placeholder: "Skype Email" },
    { key: "help_link", label: "Help Link", placeholder: "Help Link" },
    { key: "admin_email", label: "Admin Email", placeholder: "Admin Email" },
];

const EmpResellerSettings = () => {
    const form = useResellerSettingsStore((s) => s.form);
    const loading = useResellerSettingsStore((s) => s.loading);
    const saving = useResellerSettingsStore((s) => s.saving);
    const error = useResellerSettingsStore((s) => s.error);
    const successMsg = useResellerSettingsStore((s) => s.successMsg);
    const fieldErrors = useResellerSettingsStore((s) => s.fieldErrors);
    const setField = useResellerSettingsStore((s) => s.setField);
    const setLogoFile = useResellerSettingsStore((s) => s.setLogoFile);
    const setFaviconFile = useResellerSettingsStore((s) => s.setFaviconFile);
    const loadSettings = useResellerSettingsStore((s) => s.loadSettings);
    const saveSettings = useResellerSettingsStore((s) => s.saveSettings);
    const clearMessages = useResellerSettingsStore((s) => s.clearMessages);

    const logoRef = useRef(null);
    const faviconRef = useRef(null);

    useEffect(() => { loadSettings(); }, []);

    useEffect(() => {
        if (successMsg) {
            Swal.fire({ icon: "success", title: "Success", text: successMsg, timer: 2500, showConfirmButton: false });
            clearMessages();
        }
    }, [successMsg]);

    useEffect(() => {
        if (error) {
            Swal.fire({ icon: "error", title: "Error", text: error, showConfirmButton: true });
            clearMessages();
        }
    }, [error]);

    const validateImageAndSet = useCallback((file, maxW, maxH, setter, inputEl) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            if (img.width > maxW || img.height > maxH) {
                Swal.fire({ icon: "warning", title: "Image too large", text: `Max dimensions: ${maxW}×${maxH}px` });
                if (inputEl) inputEl.value = "";
            } else {
                setter(file);
            }
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
    }, []);

    const handleLogoChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) validateImageAndSet(file, 990, 220, setLogoFile, e.target);
    }, [validateImageAndSet, setLogoFile]);

    const handleFaviconChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) validateImageAndSet(file, 220, 220, setFaviconFile, e.target);
    }, [validateImageAndSet, setFaviconFile]);

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
                <div className="w-20 h-20"><video src="/src/assets/ai.webm" autoPlay loop playsInline muted className="w-full h-full object-contain" /></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div className="flex items-center gap-2">
                    <img alt="settings" className="w-20 h-20" src={EmpResellerSettingsLogo} />
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}><span className="font-semibold">Reseller</span>{" "}<span className="font-normal text-gray-500">Settings</span></h2>
                        <p className="text-xs text-gray-400 mt-1">Email template & branding settings</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="space-y-5 max-w-3xl">
                {FIELDS.map((f) => (
                    <div key={f.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="text-sm font-semibold text-slate-700 uppercase sm:w-48 shrink-0">{f.label}</label>
                        <div className="flex-1">
                            <Input
                                value={form[f.key]}
                                onChange={(e) => setField(f.key, e.target.value)}
                                placeholder={f.placeholder}
                                className="h-10 text-sm"
                            />
                            {fieldErrors[f.key] && (
                                <p className="text-xs text-red-500 mt-1">{fieldErrors[f.key]}</p>
                            )}
                        </div>
                    </div>
                ))}

                {/* Brand Logo */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700 uppercase sm:w-48 shrink-0">Brand Logo</label>
                    <div className="flex-1">
                        <input ref={logoRef} type="file" accept=".png" onChange={handleLogoChange} className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />
                        <p className="text-[11px] text-slate-400 mt-1">PNG only. Max 990×220px</p>
                    </div>
                </div>

                {/* Brand Favicon */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700 uppercase sm:w-48 shrink-0">Brand Favicon</label>
                    <div className="flex-1">
                        <input ref={faviconRef} type="file" accept=".png" onChange={handleFaviconChange} className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" />
                        <p className="text-[11px] text-slate-400 mt-1">PNG only. Max 220×220px</p>
                    </div>
                </div>

                {/* Save */}
                <div className="flex justify-center pt-4">
                    <Button className="bg-blue-500 hover:bg-blue-600 px-12 text-sm font-semibold" onClick={saveSettings} disabled={saving}>
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : "Save"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EmpResellerSettings;
