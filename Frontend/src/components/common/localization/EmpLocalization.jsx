import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
    Download,
    ChevronDown,
    FileText,
    FileSpreadsheet,
    FileDown,
    Loader2,
} from "lucide-react"
import CustomSelect from "@/components/common/elements/CustomSelect"
import { Button } from "@/components/ui/button"
import EmpLocalizationLogo from "@/assets/settings/localization.svg"
import { useLocalizationStore } from "@/page/protected/admin/localization/localizationStore"
import { getTimezoneSelectItems, getLanguageSelectItems } from "@/page/protected/admin/localization/service"

// ─── Export Dropdown ────────────────────────────────────────────────────────

const ExportDropdown = () => {
    const [open, setOpen] = useState(false)
    const exportExcel = useLocalizationStore((s) => s.exportExcel)
    const exportCsv = useLocalizationStore((s) => s.exportCsv)
    const exportPdf = useLocalizationStore((s) => s.exportPdf)

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-slate-200 text-xs gap-1.5"
                onClick={() => setOpen(!open)}
            >
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown className="w-3 h-3" />
            </Button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[170px]">
                        <button
                            onClick={() => { exportPdf(); setOpen(false) }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors rounded-t-lg"
                        >
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                            Export as PDF
                        </button>
                        <button
                            onClick={() => { exportExcel(); setOpen(false) }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                            Export as Excel
                        </button>
                        <button
                            onClick={() => { exportCsv(); setOpen(false) }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors rounded-b-lg"
                        >
                            <FileDown className="w-3.5 h-3.5 text-blue-500" />
                            Export as CSV
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────────────────────────

const EmpLocalization = () => {
    const { t } = useTranslation()
    const {
        timezone,
        language,
        loading,
        saving,
        error,
        successMsg,
        setTimezone,
        setLanguage,
        clearError,
        clearSuccess,
        loadSettings,
        saveSettings,
    } = useLocalizationStore()

    const timezoneItems = getTimezoneSelectItems()
    const languageItems = getLanguageSelectItems()

    // Load settings on mount
    useEffect(() => {
        loadSettings()
    }, [loadSettings])

    // Auto-dismiss alerts
    useEffect(() => {
        if (successMsg) {
            const t = setTimeout(() => clearSuccess(), 4000)
            return () => clearTimeout(t)
        }
    }, [successMsg, clearSuccess])

    useEffect(() => {
        if (error) {
            const t = setTimeout(() => clearError(), 4000)
            return () => clearTimeout(t)
        }
    }, [error, clearError])

    const handleSave = async () => {
        await saveSettings()
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* Success Alert */}
            {successMsg && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center justify-between">
                    <span>{successMsg}</span>
                    <button onClick={clearSuccess} className="text-emerald-500 hover:text-emerald-700 text-lg leading-none">&times;</button>
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={clearError} className="text-red-500 hover:text-red-700 text-lg leading-none">&times;</button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-10">
                <div className="flex items-center gap-1">
                    <div className="flex items-end gap-1 mr-2">
                        <img alt="localization" className="w-42 h-32" src={EmpLocalizationLogo} />
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                            <span className="font-semibold">{t("localization")}</span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
                            {t("localizationDescription")}
                        </p>
                    </div>
                </div>
                <ExportDropdown />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Select Timezone */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-2 sm:min-w-[180px]">
                            <span className="w-1 h-5 rounded-full bg-blue-500" />
                            <span className="text-sm font-semibold text-slate-700">
                                {t("select")} {t("timezone")}
                            </span>
                        </div>
                        <div className="flex-1">
                            <CustomSelect
                                placeholder={`${t("select")} ${t("timezone")}`}
                                items={timezoneItems}
                                selected={timezone}
                                onChange={setTimezone}
                                width="full"
                            />
                        </div>
                    </div>

                    {/* Select Language */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
                        <div className="flex items-center gap-2 sm:min-w-[180px]">
                            <span className="w-1 h-5 rounded-full bg-blue-500" />
                            <span className="text-sm font-semibold text-slate-700">
                                {t("select")} {t("language")}
                            </span>
                        </div>
                        <div className="flex-1">
                            <CustomSelect
                                placeholder={`${t("select")} ${t("language")}`}
                                items={languageItems}
                                selected={language}
                                onChange={setLanguage}
                                width="full"
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button
                            size="lg"
                            className="rounded-xl bg-blue-500 hover:bg-blue-600 px-8 text-sm font-semibold shadow-sm"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t("save")}...
                                </>
                            ) : (
                                t("save")
                            )}
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

export default EmpLocalization
