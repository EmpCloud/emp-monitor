import React, { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next";
import { Settings, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import CustomSelect from "@/components/common/elements/CustomSelect"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import useMonitoringControlStore from "@/page/protected/admin/monitoring-control/monitoringControlStore"

// ─── Toggle Row Component ────────────────────────────────────────────────────

const ToggleRow = ({ label, name, value, onChange }) => {
    const { t } = useTranslation();
    return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
        <span className="text-sm text-slate-700">{label}</span>
        <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                    type="radio"
                    name={name}
                    checked={String(value) === "1"}
                    onChange={() => onChange("1")}
                    className="w-3.5 h-3.5 accent-emerald-500"
                />
                <span className="text-xs text-slate-600">{t("common.enable")}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                    type="radio"
                    name={name}
                    checked={String(value) === "0"}
                    onChange={() => onChange("0")}
                    className="w-3.5 h-3.5 accent-red-500"
                />
                <span className="text-xs text-slate-600">{t("common.disable")}</span>
            </label>
        </div>
    </div>
    );
}

// ─── Accordion Section Component ─────────────────────────────────────────────

const AccordionSection = ({ title, children, defaultOpen = false }) => {  const { t } = useTranslation();

    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
                <span className="text-sm font-semibold text-slate-700">{title}</span>
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
            </button>
            {isOpen && <div className="px-4 py-3">{children}</div>}
        </div>
    )
}

// ─── Tracking Mode Tabs ──────────────────────────────────────────────────────

const DAYS = [
    { key: "mon", label: "Monday" },
    { key: "tue", label: "Tuesday" },
    { key: "wed", label: "Wednesday" },
    { key: "thu", label: "Thursday" },
    { key: "fri", label: "Friday" },
    { key: "sat", label: "Saturday" },
    { key: "sun", label: "Sunday" },
]

const TRACKING_MODES = [
    { value: "unlimited", label: "Unlimited" },
    { value: "fixed", label: "Fixed Hours" },
    { value: "manual", label: "Manual Clock" },
    { value: "networkBased", label: "Network Based" },
    { value: "geoLocation", label: "Geo-Location" },
]

const SCREENSHOT_FREQUENCIES = [
    { value: "1", label: "1 per hour" },
    { value: "2", label: "2 per hour" },
    { value: "3", label: "3 per hour" },
    { value: "4", label: "4 per hour" },
    { value: "6", label: "6 per hour" },
    { value: "10", label: "10 per hour" },
    { value: "12", label: "12 per hour" },
    { value: "20", label: "20 per hour" },
    { value: "30", label: "30 per hour" },
]

const IDLE_TIMES = [
    { value: "1", label: "1 min" },
    { value: "2", label: "2 min" },
    { value: "3", label: "3 min" },
    { value: "5", label: "5 min" },
    { value: "10", label: "10 min" },
    { value: "15", label: "15 min" },
    { value: "20", label: "20 min" },
    { value: "30", label: "30 min" },
]

const VIDEO_QUALITY_OPTIONS = [
    { value: "1", label: "High Quality" },
    { value: "2", label: "Low Quality" },
    { value: "3", label: "Ultra Low" },
]

const BILLING_BASED_ON = [
    { value: "", label: "Select" },
    { value: "office_hours", label: "Office Hours" },
    { value: "active_hours", label: "Active Hours" },
    { value: "total_hours", label: "Total Hours" },
    { value: "productive_hours", label: "Productive Hours" },
]

const CURRENCY_OPTIONS = [
    { value: "", label: "Select Currency" },
    { value: "INR", label: "INR ₹" },
    { value: "USD", label: "USD $" },
    { value: "EUR", label: "Euros €" },
]

const INVOICE_DURATIONS = [
    { value: "", label: "Select Duration" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Biweekly" },
    { value: "monthly", label: "Monthly" },
]

// ─── Main Dialog Component ───────────────────────────────────────────────────

const MonitoringControlDialog = ({ open, onOpenChange }) => {
    const { t } = useTranslation();
    const {
        settingsGroupId,
        settingsGroupRules,
        updateMonitoringControlAction,
        saving,
    } = useMonitoringControlStore()

    const [rules, setRules] = useState(null)
    const [activeTrackingTab, setActiveTrackingTab] = useState("unlimited")
    const [networkRows, setNetworkRows] = useState([{ networkName: "", ipAddress: "", officeNetwork: false }])
    const [geoRows, setGeoRows] = useState([{ location: "", lat: "", lon: "", distance: "" }])
    const [errors, setErrors] = useState({})

    useEffect(() => {
        if (settingsGroupRules && open) {
            setRules({ ...settingsGroupRules })
            setActiveTrackingTab(settingsGroupRules.trackingMode || "unlimited")

            if (settingsGroupRules.tracking?.networkBased?.length > 0) {
                setNetworkRows(settingsGroupRules.tracking.networkBased.map((n) => ({
                    networkName: n.networkName || n.NetworkName || "",
                    ipAddress: n.ipAddress || n.MACaddress || "",
                    officeNetwork: n.officeNetwork === "true" || n.officeNetwork === true,
                })))
            } else {
                setNetworkRows([{ networkName: "", ipAddress: "", officeNetwork: false }])
            }

            if (settingsGroupRules.tracking?.geoLocation?.length > 0) {
                setGeoRows(settingsGroupRules.tracking.geoLocation.map((g) => ({
                    location: g.location || "",
                    lat: g.lat || "",
                    lon: g.lon || "",
                    distance: g.distance || "",
                })))
            } else {
                setGeoRows([{ location: "", lat: "", lon: "", distance: "" }])
            }

            setErrors({})
        }
    }, [settingsGroupRules, open])

    const updateRule = useCallback((path, value) => {
        setRules((prev) => {
            const newRules = { ...prev }
            const keys = path.split(".")
            let obj = newRules
            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) obj[keys[i]] = {}
                obj[keys[i]] = { ...obj[keys[i]] }
                obj = obj[keys[i]]
            }
            obj[keys[keys.length - 1]] = value
            return newRules
        })
    }, [])

    const handleSave = async () => {
        if (!rules) return
        setErrors({})

        const updatedRules = { ...rules, trackingMode: activeTrackingTab }

        // Build fixed schedule
        if (activeTrackingTab === "fixed") {
            const fixed = { ...updatedRules.tracking?.fixed }
            DAYS.forEach((day) => {
                if (!fixed[day.key]) {
                    fixed[day.key] = { status: "false", time: { start: "", end: "" } }
                }
            })
            updatedRules.tracking = { ...updatedRules.tracking, fixed }
        }

        // Build scenario value
        const scenarioMap = {
            unlimited: "Unlimited",
            fixed: "Fixed",
            manual: "Manual",
            projectBased: "projectBased",
            networkBased: "networkBased",
            geoLocation: "geoLocation",
        }

        // Network-based data
        const networkData = networkRows
            .filter((r) => r.networkName && r.ipAddress)
            .map((r) => ({
                NetworkName: r.networkName,
                MACaddress: r.ipAddress,
                officeNetwork: r.officeNetwork,
            }))

        // Geo-location data
        if (activeTrackingTab === "geoLocation") {
            const geoData = geoRows
                .filter((r) => r.location && r.lat && r.lon && r.distance)
                .map((r) => ({
                    location: r.location,
                    lat: r.lat,
                    lon: r.lon,
                    distance: r.distance,
                }))
            updatedRules.tracking = { ...updatedRules.tracking, geoLocation: geoData }
        }

        // Build fixed list
        const FixedList = DAYS
            .filter((day) => {
                const dayData = updatedRules.tracking?.fixed?.[day.key]
                return dayData?.status === "true" || dayData?.status === true
            })
            .map((day) => {
                const dayData = updatedRules.tracking.fixed[day.key]
                return `${day.label.toUpperCase()}#${dayData.time.start}#${dayData.time.end}`
            })

        // Build track_data matching PHP's SettingsController transform
        const trackData = { ...updatedRules }

        // Screen record settings (PHP merges these from separate fields)
        trackData.screen_record = {
            is_enabled: updatedRules.features?.screen_record || "0",
            video_quality: updatedRules.screen_record?.video_quality || "2",
            audio: updatedRules.screen_record?.audio || "0",
        }
        trackData.screen_record_when_website_visit = updatedRules.screen_record_when_website_visit || []
        trackData.screenshot_exclude_websites = updatedRules.screenshot_exclude_websites || []
        trackData.screenshot_exclude_application = updatedRules.screenshot_exclude_application || []
        trackData.file_upload_detection = updatedRules.features?.file_upload_detection || "0"
        trackData.file_upload_blocking = updatedRules.features?.file_upload_blocking || "0"
        trackData.print_detection = updatedRules.features?.print_detection || "0"
        trackData.print_blocking = updatedRules.features?.print_blocking || "0"

        // Productivity hours
        if (settingsGroupId === 0 && updatedRules.productiveHours?.hour) {
            trackData.productiveHours = {
                mode: "fixed",
                hour: updatedRules.productiveHours.hour,
            }
        }

        // Work hour billing
        trackData.work_hour_billing = {
            is_enabled: updatedRules.work_hour_billing?.is_enabled === "1" ? 1 : 0,
            currency: updatedRules.work_hour_billing?.currency || "",
            hours_per_day: parseInt(updatedRules.work_hour_billing?.hours_per_day, 10) || 0,
            billing_based_on: updatedRules.work_hour_billing?.billing_based_on || "",
            invoice_duration: updatedRules.work_hour_billing?.invoice_duration || "",
        }

        // Network-based tracking (PHP reformats these)
        if (activeTrackingTab === "networkBased" && networkData.length > 0) {
            trackData.tracking = {
                ...trackData.tracking,
                networkBased: networkData.map((n) => ({
                    networkName: n.NetworkName,
                    ipAddress: n.MACaddress,
                    officeNetwork: n.officeNetwork,
                })),
            }
        }

        const payload = {
            track_data: trackData,
            group_id: settingsGroupId,
        }

        const res = await updateMonitoringControlAction(payload)
        if (!res.success) {
            if (res.code === 205) {
                setErrors({ general: "Please select at least one day for Fixed tracking" })
            } else if (res.code === 207) {
                setErrors({ network: res.message })
            } else {
                setErrors({ general: typeof res.message === "string" ? res.message : "Failed to save settings" })
            }
        }
    }

    if (!rules) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 border-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader className="flex-row items-center gap-3 space-y-0">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-white">
                                Monitoring Control Settings
                            </DialogTitle>
                            <DialogDescription className="text-xs text-blue-200 mt-0.5">
                                {settingsGroupId === 0
                                    ? t("monitoring.defaultSettingsDesc")
                                    : t("monitoring.groupSpecificSettings")}
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                </div>

                <div className="px-6 py-6 space-y-4">
                    {errors.general && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
                            {errors.general}
                        </div>
                    )}

                    {/* 1. General Settings */}
                    <AccordionSection title={t("monitoring.generalSettings")} defaultOpen={true}>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between py-2.5">
                                <span className="text-sm text-slate-700">{t("monitoring.visibilityMode")}</span>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            checked={rules.system?.visibility === "true" || rules.system?.visibility === true}
                                            onChange={() => updateRule("system.visibility", "true")}
                                            className="w-3.5 h-3.5 accent-blue-500"
                                        />
                                        <span className="text-xs text-slate-600">{t("monitoring.visible")}</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            checked={rules.system?.visibility === "false" || rules.system?.visibility === false}
                                            onChange={() => updateRule("system.visibility", "false")}
                                            className="w-3.5 h-3.5 accent-blue-500"
                                        />
                                        <span className="text-xs text-slate-600">{t("monitoring.stealth")}</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2.5 border-t border-slate-100">
                                <span className="text-sm text-slate-700">{t("monitoring.agentAutoUpdate")}</span>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={String(rules.system?.autoUpdate) === "1"}
                                        onChange={(e) => updateRule("system.autoUpdate", e.target.checked ? "1" : "0")}
                                        className="w-4 h-4 accent-blue-500"
                                    />
                                    <span className="text-xs text-slate-600">
                                        {String(rules.system?.autoUpdate) === "1" ? t("common.enabled") : t("common.disabled")}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </AccordionSection>

                    {/* 2. Tracking Features */}
                    <AccordionSection title={t("monitoring.trackingFeatures")} defaultOpen={true}>
                        <div className="space-y-0">
                            <ToggleRow
                                label="Keystroke Monitoring"
                                name="keystrokes"
                                value={rules.features?.keystrokes}
                                onChange={(v) => updateRule("features.keystrokes", v)}
                            />
                            <ToggleRow
                                label="Web Usage Tracking"
                                name="web_usage"
                                value={rules.features?.web_usage}
                                onChange={(v) => updateRule("features.web_usage", v)}
                            />
                            <ToggleRow
                                label="Screenshots"
                                name="screenshots"
                                value={rules.features?.screenshots}
                                onChange={(v) => updateRule("features.screenshots", v)}
                            />
                            <ToggleRow
                                label="Screen Recording"
                                name="screen_record"
                                value={rules.features?.screen_record}
                                onChange={(v) => updateRule("features.screen_record", v)}
                            />
                            <ToggleRow
                                label="Real-Time Tracking"
                                name="realTimeTrack"
                                value={rules.features?.realTimeTrack}
                                onChange={(v) => updateRule("features.realTimeTrack", v)}
                            />
                            <ToggleRow
                                label="Screen Casting"
                                name="screencast"
                                value={rules.features?.screencast}
                                onChange={(v) => updateRule("features.screencast", v)}
                            />
                            <ToggleRow
                                label="Webcam Casting"
                                name="webCamCasting"
                                value={rules.features?.webCamCasting}
                                onChange={(v) => updateRule("features.webCamCasting", v)}
                            />
                            <ToggleRow
                                label="File Upload Detection"
                                name="file_upload_detection"
                                value={rules.features?.file_upload_detection}
                                onChange={(v) => updateRule("features.file_upload_detection", v)}
                            />
                            <ToggleRow
                                label="File Upload Blocking"
                                name="file_upload_blocking"
                                value={rules.features?.file_upload_blocking}
                                onChange={(v) => updateRule("features.file_upload_blocking", v)}
                            />
                            <ToggleRow
                                label="Print Detection"
                                name="print_detection"
                                value={rules.features?.print_detection}
                                onChange={(v) => updateRule("features.print_detection", v)}
                            />
                            <ToggleRow
                                label="Print Blocking"
                                name="print_blocking"
                                value={rules.features?.print_blocking}
                                onChange={(v) => updateRule("features.print_blocking", v)}
                            />
                            <ToggleRow
                                label="Manual Log Entry"
                                name="manual_clock_in"
                                value={rules.manual_clock_in}
                                onChange={(v) => updateRule("manual_clock_in", v)}
                            />
                            <ToggleRow
                                label="USB Blocking"
                                name="usbDisable"
                                value={rules.usbDisable}
                                onChange={(v) => updateRule("usbDisable", v)}
                            />
                            <ToggleRow
                                label="System Locking"
                                name="systemLock"
                                value={rules.systemLock}
                                onChange={(v) => updateRule("systemLock", v)}
                            />
                            <ToggleRow
                                label="Geolocation Logs"
                                name="isSilahMobileGeoLocation"
                                value={rules.isSilahMobileGeoLocation}
                                onChange={(v) => updateRule("isSilahMobileGeoLocation", v)}
                            />
                        </div>
                    </AccordionSection>

                    {/* 3. DLP Features */}
                    <AccordionSection title={t("monitoring.dlpFeatures")}>
                        <div className="space-y-0">
                            <ToggleRow
                                label="Bluetooth Detection"
                                name="bluetoothDetection"
                                value={rules.dlpFeatures?.bluetoothDetection}
                                onChange={(v) => updateRule("dlpFeatures.bluetoothDetection", v)}
                            />
                            <ToggleRow
                                label="Bluetooth Blocking"
                                name="bluetoothBlock"
                                value={rules.dlpFeatures?.bluetoothBlock}
                                onChange={(v) => updateRule("dlpFeatures.bluetoothBlock", v)}
                            />
                            <ToggleRow
                                label="Clipboard Detection"
                                name="clipboardDetection"
                                value={rules.dlpFeatures?.clipboardDetection}
                                onChange={(v) => updateRule("dlpFeatures.clipboardDetection", v)}
                            />
                            <ToggleRow
                                label="Clipboard Blocking"
                                name="clipboardBlock"
                                value={rules.dlpFeatures?.clipboardBlock}
                                onChange={(v) => updateRule("dlpFeatures.clipboardBlock", v)}
                            />
                        </div>
                    </AccordionSection>

                    {/* 4. Screenshot Settings */}
                    <AccordionSection title={t("monitoring.screenshotSettings")}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-700 min-w-[150px]">{t("monitoring.screenshotFrequency")}</span>
                                <CustomSelect
                                    placeholder="Select frequency"
                                    items={SCREENSHOT_FREQUENCIES}
                                    selected={rules.screenshot?.frequencyPerHour || "2"}
                                    onChange={(v) => updateRule("screenshot.frequencyPerHour", v)}
                                />
                            </div>
                            {String(rules.features?.screen_record) === "1" && (
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-slate-700 min-w-[150px]">{t("monitoring.videoQuality")}</span>
                                    <CustomSelect
                                        placeholder="Select quality"
                                        items={VIDEO_QUALITY_OPTIONS}
                                        selected={rules.screen_record?.video_quality || "2"}
                                        onChange={(v) => updateRule("screen_record.video_quality", v)}
                                    />
                                </div>
                            )}
                        </div>
                    </AccordionSection>

                    {/* 5. Tracking Time Configuration */}
                    <AccordionSection title={t("monitoring.trackingTimeConfig")}>
                        <div className="space-y-5">
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-700 min-w-[150px]">{t("monitoring.idleTime")}</span>
                                <CustomSelect
                                    placeholder="Select idle time"
                                    items={IDLE_TIMES}
                                    selected={rules.idleInMinute || "5"}
                                    onChange={(v) => updateRule("idleInMinute", v)}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-700 min-w-[150px]">{t("monitoring.timesheetIdleTime")}</span>
                                <Input
                                    type="text"
                                    value={rules.timesheetIdleTime || "00:00"}
                                    onChange={(e) => updateRule("timesheetIdleTime", e.target.value)}
                                    placeholder="MM:SS"
                                    className="w-28 h-9 text-sm"
                                />
                            </div>

                            {/* Tracking Mode Tabs */}
                            <div>
                                <span className="text-sm font-medium text-slate-700 mb-3 block">{t("monitoring.trackingScenario")}</span>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {TRACKING_MODES.map((mode) => (
                                        <button
                                            key={mode.value}
                                            type="button"
                                            onClick={() => setActiveTrackingTab(mode.value)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                                activeTrackingTab === mode.value
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Unlimited Tab */}
                                {activeTrackingTab === "unlimited" && (
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <p className="text-xs text-slate-500 mb-2">All days enabled — tracking runs 24/7</p>
                                        <div className="grid grid-cols-7 gap-2">
                                            {DAYS.map((day) => (
                                                <div
                                                    key={day.key}
                                                    className={`text-center text-xs py-2 rounded-lg font-medium ${
                                                        ["sat", "sun"].includes(day.key)
                                                            ? "bg-red-100 text-red-600"
                                                            : "bg-blue-100 text-blue-600"
                                                    }`}
                                                >
                                                    {day.label.slice(0, 3)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Fixed Hours Tab */}
                                {activeTrackingTab === "fixed" && (
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                                        {DAYS.map((day) => {
                                            const dayData = rules.tracking?.fixed?.[day.key] || {
                                                status: "false",
                                                time: { start: "", end: "" },
                                            }
                                            const isChecked = dayData.status === "true" || dayData.status === true

                                            return (
                                                <div key={day.key} className="flex items-center gap-3">
                                                    <label className="flex items-center gap-2 min-w-[120px] cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                updateRule(`tracking.fixed.${day.key}.status`, e.target.checked ? "true" : "false")
                                                            }}
                                                            className="w-3.5 h-3.5 accent-blue-500"
                                                        />
                                                        <span className="text-xs text-slate-700">{day.label}</span>
                                                    </label>
                                                    <Input
                                                        type="time"
                                                        value={dayData.time?.start || ""}
                                                        onChange={(e) => updateRule(`tracking.fixed.${day.key}.time.start`, e.target.value)}
                                                        disabled={!isChecked}
                                                        className="w-28 h-8 text-xs"
                                                    />
                                                    <span className="text-xs text-slate-400">to</span>
                                                    <Input
                                                        type="time"
                                                        value={dayData.time?.end || ""}
                                                        onChange={(e) => updateRule(`tracking.fixed.${day.key}.time.end`, e.target.value)}
                                                        disabled={!isChecked}
                                                        className="w-28 h-8 text-xs"
                                                    />
                                                </div>
                                            )
                                        })}
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="text-xs mt-2"
                                            onClick={() => {
                                                const monData = rules.tracking?.fixed?.mon
                                                if (monData?.status === "true" && monData?.time?.start && monData?.time?.end) {
                                                    DAYS.forEach((day) => {
                                                        updateRule(`tracking.fixed.${day.key}.status`, "true")
                                                        updateRule(`tracking.fixed.${day.key}.time.start`, monData.time.start)
                                                        updateRule(`tracking.fixed.${day.key}.time.end`, monData.time.end)
                                                    })
                                                }
                                            }}
                                        >
                                            Apply Monday to All
                                        </Button>
                                    </div>
                                )}

                                {/* Manual Tab */}
                                {activeTrackingTab === "manual" && (
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <p className="text-sm text-slate-600">
                                            Employees will manually clock in and out. Tracking starts when they clock in and stops when they clock out.
                                        </p>
                                    </div>
                                )}

                                {/* Network Based Tab */}
                                {activeTrackingTab === "networkBased" && (
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                                        {errors.network && (
                                            <p className="text-xs text-red-500">{errors.network}</p>
                                        )}
                                        {networkRows.map((row, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Input
                                                    type="text"
                                                    placeholder="Network Name"
                                                    value={row.networkName}
                                                    onChange={(e) => {
                                                        const updated = [...networkRows]
                                                        updated[idx] = { ...updated[idx], networkName: e.target.value }
                                                        setNetworkRows(updated)
                                                    }}
                                                    className="h-8 text-xs flex-1"
                                                />
                                                <Input
                                                    type="text"
                                                    placeholder="IP / MAC Address"
                                                    value={row.ipAddress}
                                                    onChange={(e) => {
                                                        const updated = [...networkRows]
                                                        updated[idx] = { ...updated[idx], ipAddress: e.target.value }
                                                        setNetworkRows(updated)
                                                    }}
                                                    className="h-8 text-xs flex-1"
                                                />
                                                <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={row.officeNetwork}
                                                        onChange={(e) => {
                                                            const updated = [...networkRows]
                                                            updated[idx] = { ...updated[idx], officeNetwork: e.target.checked }
                                                            setNetworkRows(updated)
                                                        }}
                                                        className="w-3 h-3"
                                                    />
                                                    <span className="text-[10px] text-slate-500">Office</span>
                                                </label>
                                                {idx > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setNetworkRows(networkRows.filter((_, i) => i !== idx))}
                                                        className="text-red-500 text-xs hover:text-red-700"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="text-xs"
                                            onClick={() => setNetworkRows([...networkRows, { networkName: "", ipAddress: "", officeNetwork: false }])}
                                        >
                                            + Add Network
                                        </Button>
                                    </div>
                                )}

                                {/* Geo-Location Tab */}
                                {activeTrackingTab === "geoLocation" && (
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                                        {geoRows.map((row, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Input
                                                    type="text"
                                                    placeholder="Location"
                                                    value={row.location}
                                                    onChange={(e) => {
                                                        const updated = [...geoRows]
                                                        updated[idx] = { ...updated[idx], location: e.target.value }
                                                        setGeoRows(updated)
                                                    }}
                                                    className="h-8 text-xs flex-1"
                                                />
                                                <Input
                                                    type="text"
                                                    placeholder="Lat, Lon"
                                                    value={row.lat && row.lon ? `${row.lat}, ${row.lon}` : ""}
                                                    onChange={(e) => {
                                                        const parts = e.target.value.split(",").map((s) => s.trim())
                                                        const updated = [...geoRows]
                                                        updated[idx] = {
                                                            ...updated[idx],
                                                            lat: parts[0] || "",
                                                            lon: parts[1] || "",
                                                        }
                                                        setGeoRows(updated)
                                                    }}
                                                    className="h-8 text-xs w-36"
                                                />
                                                <Input
                                                    type="number"
                                                    placeholder="Range (m)"
                                                    value={row.distance}
                                                    onChange={(e) => {
                                                        const updated = [...geoRows]
                                                        updated[idx] = { ...updated[idx], distance: e.target.value }
                                                        setGeoRows(updated)
                                                    }}
                                                    className="h-8 text-xs w-24"
                                                />
                                                {idx > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setGeoRows(geoRows.filter((_, i) => i !== idx))}
                                                        className="text-red-500 text-xs hover:text-red-700"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="text-xs"
                                            onClick={() => setGeoRows([...geoRows, { location: "", lat: "", lon: "", distance: "" }])}
                                        >
                                            + Add Location
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </AccordionSection>

                    {/* 6. Work Hours Billing */}
                    <AccordionSection title={t("monitoring.workHoursBilling")}>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-slate-700">{t("monitoring.enableWorkHoursBilling")}</span>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={
                                            String(rules.work_hour_billing?.is_enabled) === "1"
                                        }
                                        onChange={(e) =>
                                            updateRule("work_hour_billing.is_enabled", e.target.checked ? "1" : "0")
                                        }
                                        className="w-4 h-4 accent-blue-500"
                                    />
                                </label>
                            </div>

                            {String(rules.work_hour_billing?.is_enabled) === "1" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">{t("monitoring.billingBasedOn")}</label>
                                        <CustomSelect
                                            placeholder="Select"
                                            items={BILLING_BASED_ON}
                                            selected={rules.work_hour_billing?.billing_based_on || ""}
                                            onChange={(v) => updateRule("work_hour_billing.billing_based_on", v)}
                                            width="full"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">{t("monitoring.amountPerHour")}</label>
                                        <Input
                                            type="number"
                                            placeholder="Enter amount"
                                            value={rules.work_hour_billing?.hours_per_day || ""}
                                            onChange={(e) => updateRule("work_hour_billing.hours_per_day", e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">{t("monitoring.currency")}</label>
                                        <CustomSelect
                                            placeholder="Select Currency"
                                            items={CURRENCY_OPTIONS}
                                            selected={rules.work_hour_billing?.currency || ""}
                                            onChange={(v) => updateRule("work_hour_billing.currency", v)}
                                            width="full"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">{t("monitoring.invoiceDuration")}</label>
                                        <CustomSelect
                                            placeholder="Select Duration"
                                            items={INVOICE_DURATIONS}
                                            selected={rules.work_hour_billing?.invoice_duration || ""}
                                            onChange={(v) => updateRule("work_hour_billing.invoice_duration", v)}
                                            width="full"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </AccordionSection>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-2 pt-3">
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
                            className="rounded-xl bg-blue-500 hover:bg-blue-600 px-5 text-xs font-semibold shadow-sm"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? t("common.saving") : t("monitoring.saveSettings")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default MonitoringControlDialog
