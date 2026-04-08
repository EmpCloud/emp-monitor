import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    Mail,
    Save,
    X,
    Info,
    Search,
    Send,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useAutoEmailReportStore } from "@/page/protected/admin/auto-email-report/autoEmailReportStore";

// ─── Constants ───────────────────────────────────────────────────────────────

const getFrequencies = (t) => [
    { value: 1, label: t("emailReport.daily"), color: "text-emerald-600" },
    { value: 2, label: t("emailReport.weekly"), color: "text-blue-600" },
    { value: 3, label: t("emailReport.monthly"), color: "text-cyan-600" },
    { value: 4, label: t("emailReport.custom"), color: "text-amber-600" },
    { value: 5, label: t("emailReport.date"), color: "text-cyan-600" },
    { value: 6, label: t("emailReport.unproductive"), color: "text-red-600" },
    { value: 7, label: t("emailReport.managerTlLog"), color: "text-cyan-600" },
    { value: 9, label: t("emailReport.time"), color: "text-cyan-600" },
];

const getContentOptions = (t) => [
    { key: "productivity", label: t("emailReport.productivityContent"), minuteKey: "prodInMinutes" },
    { key: "timesheet", label: t("emailReport.timesheetContent"), minuteKey: "timesheetInMinutes" },
    { key: "websites_usage", label: t("emailReport.websiteUsage"), minuteKey: "websitesInMinutes" },
    { key: "apps_usage", label: t("emailReport.appUsage"), minuteKey: "appsInMinutes" },
];

const getAttendanceOptions = (t) => [
    { key: "attendance", label: t("emailReport.employeeAttendance") },
    { key: "hrms_attendance", label: t("emailReport.hrmsAttendance") },
];

const DATE_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

const getDefaultFormData = () => ({
    reportTitle: "",
    frequency: 2,
    recipients: [],
    emailInput: "",
    includeAdminEmail: false,
    content: {
        productivity: true,
        timesheet: true,
        apps_usage: true,
        websites_usage: true,
        prodInMinutes: false,
        timesheetInMinutes: false,
        appsInMinutes: false,
        websitesInMinutes: false,
        attendance: false,
        hrms_attendance: false,
        manager_log: false,
    },
    reportTypes: [],
    filterType: "1",
    selectedEmployees: [],
    selectedDepartments: [],
    selectedLocations: [],
    selectedShifts: [],
    customStart: "00:00:00",
    customEnd: "00:00:00",
    customDate: "0",
    fixedTime: "",
});

// ─── Main Component ──────────────────────────────────────────────────────────

const CreateEditEmailReport = ({ open, onOpenChange }) => {
    const { t } = useTranslation();
    const FREQUENCIES = getFrequencies(t);
    const CONTENT_OPTIONS = getContentOptions(t);
    const ATTENDANCE_OPTIONS = getAttendanceOptions(t);

    const dialogMode = useAutoEmailReportStore((s) => s.dialogMode);
    const editReportData = useAutoEmailReportStore((s) => s.editReportData);
    const employees = useAutoEmailReportStore((s) => s.employees);
    const departments = useAutoEmailReportStore((s) => s.departments);
    const locations = useAutoEmailReportStore((s) => s.locations);
    const shifts = useAutoEmailReportStore((s) => s.shifts);
    const saving = useAutoEmailReportStore((s) => s.saving);
    const testingEmail = useAutoEmailReportStore((s) => s.testingEmail);
    const saveReport = useAutoEmailReportStore((s) => s.saveReport);
    const sendTestEmailAction = useAutoEmailReportStore((s) => s.sendTestEmail);

    const [formData, setFormData] = useState(getDefaultFormData());
    const [errors, setErrors] = useState({});
    const [filterSearch, setFilterSearch] = useState("");
    const [alertMessage, setAlertMessage] = useState(null);

    const isEdit = dialogMode === "edit";

    // Populate form when editing
    useEffect(() => {
        if (isEdit && editReportData) {
            const data = editReportData;
            const content = data.content || {};
            setFormData({
                reportId: data.id || data.email_report_id,
                reportTitle: data.name || "",
                frequency: Number(data.frequency),
                recipients: typeof data.recipients === "string" ? data.recipients.split(",") : data.recipients || [],
                emailInput: typeof data.recipients === "string" ? data.recipients : (data.recipients || []).join(","),
                includeAdminEmail: false,
                content: {
                    productivity: parseInt(content.productivity) === 1,
                    timesheet: parseInt(content.timesheet) === 1,
                    apps_usage: parseInt(content.apps_usage) === 1,
                    websites_usage: parseInt(content.websites_usage) === 1,
                    prodInMinutes: parseInt(content.prodInMinutes) === 1,
                    timesheetInMinutes: parseInt(content.timesheetInMinutes) === 1,
                    appsInMinutes: parseInt(content.appsInMinutes) === 1,
                    websitesInMinutes: parseInt(content.websitesInMinutes) === 1,
                    attendance: parseInt(content.attendance) === 1,
                    hrms_attendance: parseInt(content.hrms_attendance) === 1,
                    manager_log: parseInt(content.manager_log) === 1,
                },
                reportTypes: data.report_types || [],
                filterType: String(data.filter_type || 1),
                selectedEmployees: (data.employees || []).map((e) => e.id),
                selectedDepartments: (data.departments || []).map((d) => d.id),
                selectedLocations: (data.locations || []).map((l) => l.id),
                selectedShifts: (data.shifts || []).map((s) => s.id),
                customStart: data.custom?.start || "00:00:00",
                customEnd: data.custom?.end || "00:00:00",
                customDate: data.custom?.date || "0",
                fixedTime: data.custom?.time || "",
            });
        } else if (!isEdit) {
            setFormData(getDefaultFormData());
        }
        setErrors({});
        setAlertMessage(null);
    }, [isEdit, editReportData, open]);

    // ── Derived state ─────────────────────────────────────────────────────
    const freq = formData.frequency;
    const isCustom = freq === 4;
    const isDate = freq === 5;
    const isUnproductive = freq === 6;
    const isManagerLog = freq === 7;
    const isTime = freq === 9;

    const showContentSection = !isUnproductive;
    const contentDisabled = isDate || isManagerLog;
    const attendanceEnabled = isDate;
    const showCustomTime = isCustom;
    const showDatePicker = isDate;
    const showFixedTime = isTime;

    // ── Handlers ──────────────────────────────────────────────────────────
    const updateField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const updateContent = (key, value) => {
        setFormData((prev) => ({
            ...prev,
            content: { ...prev.content, [key]: value },
        }));
    };

    const handleFrequencyChange = (value) => {
        const newFreq = Number(value);
        setFormData((prev) => {
            const next = { ...prev, frequency: newFreq };
            // Reset content flags based on frequency
            if (newFreq === 7) {
                // Manager log only
                next.content = {
                    ...getDefaultFormData().content,
                    productivity: false, timesheet: false, apps_usage: false, websites_usage: false,
                    manager_log: true,
                };
            } else if (newFreq === 6) {
                // Unproductive - no content
                next.content = { ...getDefaultFormData().content, productivity: false, timesheet: false, apps_usage: false, websites_usage: false };
            } else if (newFreq === 5) {
                // Date - attendance only
                next.content = { ...getDefaultFormData().content, productivity: false, timesheet: false, apps_usage: false, websites_usage: false };
            } else {
                if (!isEdit) {
                    next.content = { ...getDefaultFormData().content };
                }
            }
            // Reset custom times
            if (newFreq !== 4) { next.customStart = "00:00:00"; next.customEnd = "00:00:00"; }
            if (newFreq !== 9) next.fixedTime = "";
            return next;
        });
    };

    const handleEmailInputChange = (value) => {
        setFormData((prev) => ({
            ...prev,
            emailInput: value,
            recipients: value.split(",").map((e) => e.trim()).filter(Boolean),
        }));
    };

    const toggleFilterItem = (listKey, id) => {
        setFormData((prev) => {
            const list = prev[listKey];
            const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
            return { ...prev, [listKey]: next };
        });
    };

    const toggleAllFilterItems = (listKey, allItems) => {
        setFormData((prev) => {
            const allIds = allItems.map((item) => item.id);
            const allSelected = allIds.every((id) => prev[listKey].includes(id));
            return { ...prev, [listKey]: allSelected ? [] : allIds };
        });
    };

    const toggleReportType = (type) => {
        setFormData((prev) => {
            const types = prev.reportTypes.includes(type)
                ? prev.reportTypes.filter((t) => t !== type)
                : [...prev.reportTypes, type];
            return { ...prev, reportTypes: types };
        });
    };

    // ── Submit ─────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setAlertMessage(null);
        const result = await saveReport(formData);
        if (!result.success) {
            setAlertMessage({ type: "error", text: result.message });
        }
    };

    const handleTestEmail = async () => {
        setAlertMessage(null);
        const result = await sendTestEmailAction(formData);
        setAlertMessage({
            type: result.success ? "success" : "error",
            text: result.message || (result.success ? "Test email sent!" : "Failed"),
        });
    };

    // ── Filter lists ──────────────────────────────────────────────────────
    const filterType = formData.filterType;

    const filteredEmployees = useMemo(() => {
        if (!filterSearch) return employees;
        const q = filterSearch.toLowerCase();
        return employees.filter((e) =>
            `${e.first_name} ${e.last_name}`.toLowerCase().includes(q)
        );
    }, [employees, filterSearch]);

    const filteredDepartments = useMemo(() => {
        if (!filterSearch) return departments;
        const q = filterSearch.toLowerCase();
        return departments.filter((d) => d.name.toLowerCase().includes(q));
    }, [departments, filterSearch]);

    const filteredLocations = useMemo(() => {
        if (!filterSearch) return locations;
        const q = filterSearch.toLowerCase();
        return locations.filter((l) => l.name.toLowerCase().includes(q));
    }, [locations, filterSearch]);

    const filteredShifts = useMemo(() => {
        if (!filterSearch) return shifts;
        const q = filterSearch.toLowerCase();
        return shifts.filter((s) => s.name.toLowerCase().includes(q));
    }, [shifts, filterSearch]);

    // Loading state for edit mode
    const isLoadingEdit = isEdit && !editReportData;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 border-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5 rounded-t-2xl">
                    <DialogHeader className="flex-row items-center gap-3 space-y-0">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-white">
                                {isEdit ? t("emailReport.editEmailReport") : t("emailReport.newEmailReport")}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-blue-200 mt-0.5">
                                {t("emailReport.configureDelivery")}
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                </div>

                {isLoadingEdit ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="ml-3 text-sm text-slate-500">{t("emailReport.loadingReportData")}</span>
                    </div>
                ) : (
                    <div className="px-6 py-6 space-y-6">
                        {/* Alert */}
                        {alertMessage && (
                            <div className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
                                alertMessage.type === "error"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : "bg-green-50 text-green-700 border border-green-200"
                            }`}>
                                <Info className="w-4 h-4 shrink-0" />
                                {alertMessage.text}
                            </div>
                        )}

                        {/* Info Banner */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{t("emailReport.infoMessage")}</span>
                        </div>

                        {/* Report Title */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2 sm:min-w-[140px]">
                                <span className="w-1 h-5 rounded-full bg-blue-500" />
                                <span className="text-sm font-semibold text-slate-700">{t("emailReport.reportTitle")}</span>
                            </div>
                            <div className="flex-1">
                                <Input
                                    value={formData.reportTitle}
                                    onChange={(e) => updateField("reportTitle", e.target.value)}
                                    placeholder={t("emailReport.enterReportTitle")}
                                    className="h-10 rounded-lg border-slate-200 text-sm"
                                />
                                {errors.reportTitle && <p className="text-xs text-red-500 mt-1">{errors.reportTitle}</p>}
                            </div>
                        </div>

                        {/* Frequency */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <span className="w-1 h-5 rounded-full bg-indigo-500" />
                                <span className="text-sm font-semibold text-slate-700">{t("emailReport.frequency")}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                                {FREQUENCIES.map((f) => (
                                    <label
                                        key={f.value}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-xs font-medium ${
                                            freq === f.value
                                                ? "bg-white border-2 border-blue-400 shadow-sm"
                                                : "border border-transparent hover:bg-white/60"
                                        } ${f.color}`}
                                    >
                                        <input
                                            type="radio"
                                            name="frequency"
                                            value={f.value}
                                            checked={freq === f.value}
                                            onChange={() => handleFrequencyChange(f.value)}
                                            className="accent-blue-500"
                                        />
                                        {f.label}
                                    </label>
                                ))}
                            </div>

                            {/* Custom time range */}
                            {showCustomTime && (
                                <div className="grid grid-cols-2 gap-4 px-4">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">{t("emailReport.startTime")}</label>
                                        <Input type="text" value={formData.customStart} onChange={(e) => updateField("customStart", e.target.value)} className="h-9 text-xs" placeholder="HH:MM:SS" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">{t("emailReport.endTime")}</label>
                                        <Input type="text" value={formData.customEnd} onChange={(e) => updateField("customEnd", e.target.value)} className="h-9 text-xs" placeholder="HH:MM:SS" />
                                    </div>
                                </div>
                            )}

                            {/* Date picker */}
                            {showDatePicker && (
                                <div className="px-4">
                                    <label className="text-xs text-slate-500 mb-1 block">{t("emailReport.selectDate")}</label>
                                    <select
                                        value={formData.customDate}
                                        onChange={(e) => updateField("customDate", e.target.value)}
                                        className="h-9 w-32 px-2 border border-slate-200 rounded-lg text-xs"
                                    >
                                        <option value="0">{t("emailReport.selectDate")}</option>
                                        {DATE_OPTIONS.map((d) => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Fixed time */}
                            {showFixedTime && (
                                <div className="px-4">
                                    <label className="text-xs text-slate-500 mb-1 block">{t("emailReport.timeRequired")}</label>
                                    <Input type="time" value={formData.fixedTime} onChange={(e) => updateField("fixedTime", e.target.value)} className="h-9 w-40 text-xs" />
                                </div>
                            )}
                        </div>

                        {/* Recipients */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex items-center gap-2 sm:min-w-[140px]">
                                <span className="w-1 h-5 rounded-full bg-blue-500" />
                                <span className="text-sm font-semibold text-slate-700">{t("emailReport.recipients")}</span>
                            </div>
                            <div className="flex-1 space-y-2">
                                <Input
                                    value={formData.emailInput}
                                    onChange={(e) => handleEmailInputChange(e.target.value)}
                                    placeholder={t("emailReport.enterEmails")}
                                    className="h-10 rounded-lg border-slate-200 text-sm"
                                />
                                <p className="text-[11px] text-slate-400">{t("emailReport.separateEmails")}</p>
                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                    <Checkbox
                                        checked={formData.includeAdminEmail}
                                        onCheckedChange={(v) => updateField("includeAdminEmail", v)}
                                        className="border-slate-300"
                                    />
                                    {t("emailReport.receiveReport")}
                                </label>
                            </div>
                        </div>

                        {/* Content Selection */}
                        {showContentSection && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-1 h-5 rounded-full bg-indigo-500" />
                                    <span className="text-sm font-semibold text-slate-700">{t("emailReport.content")}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                                    {CONTENT_OPTIONS.map((opt) => (
                                        <div key={opt.key} className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2.5">
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                                <Checkbox
                                                    checked={formData.content[opt.key]}
                                                    onCheckedChange={(v) => updateContent(opt.key, v)}
                                                    disabled={contentDisabled}
                                                    className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                />
                                                {opt.label}
                                            </label>
                                            <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                                                <Checkbox
                                                    checked={formData.content[opt.minuteKey]}
                                                    onCheckedChange={(v) => updateContent(opt.minuteKey, v)}
                                                    disabled={contentDisabled}
                                                    className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                />
                                                {t("emailReport.timeInMinutes")}
                                            </label>
                                        </div>
                                    ))}

                                    {/* Attendance options */}
                                    {ATTENDANCE_OPTIONS.map((opt) => (
                                        <div key={opt.key} className="flex items-center bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2.5">
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                                <Checkbox
                                                    checked={formData.content[opt.key]}
                                                    onCheckedChange={(v) => updateContent(opt.key, v)}
                                                    disabled={!attendanceEnabled && !isEdit}
                                                    className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                />
                                                {opt.label}
                                            </label>
                                        </div>
                                    ))}

                                    {/* Manager log */}
                                    {isManagerLog && (
                                        <div className="flex items-center bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2.5">
                                            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                                <Checkbox
                                                    checked={formData.content.manager_log}
                                                    onCheckedChange={(v) => updateContent("manager_log", v)}
                                                    className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                />
                                                {t("emailReport.managerTlLog")}
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Report Types */}
                        {!isUnproductive && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-1 h-5 rounded-full bg-blue-500" />
                                    <span className="text-sm font-semibold text-slate-700">{t("emailReport.reportFormat")}</span>
                                </div>
                                <div className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                                    {["pdf", "csv"].map((type) => (
                                        <label key={type} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                            <Checkbox
                                                checked={formData.reportTypes.includes(type)}
                                                onCheckedChange={() => toggleReportType(type)}
                                                disabled={isManagerLog && type === "pdf"}
                                                className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                            />
                                            {type.toUpperCase()}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Filter Section */}
                        {!isManagerLog && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-1 h-5 rounded-full bg-indigo-500" />
                                    <span className="text-sm font-semibold text-slate-700">{t("emailReport.filter")}</span>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                                    {/* Filter type selection */}
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { value: "1", label: t("emailReport.wholeOrganization") },
                                            { value: "2", label: t("emailReport.specificEmployees") },
                                            { value: "3", label: t("emailReport.specificDepartments") },
                                            { value: "4", label: t("emailReport.specificLocations") },
                                            { value: "5", label: t("emailReport.specificShifts") },
                                        ].map((opt) => (
                                            <label key={opt.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                                                filterType === opt.value
                                                    ? "bg-white border-2 border-blue-400 text-blue-700 shadow-sm"
                                                    : "border border-slate-200 text-slate-600 hover:bg-white/60"
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="filterType"
                                                    value={opt.value}
                                                    checked={filterType === opt.value}
                                                    onChange={() => updateField("filterType", opt.value)}
                                                    className="accent-blue-500"
                                                />
                                                {opt.label}
                                            </label>
                                        ))}
                                    </div>

                                    {/* Filter list */}
                                    {filterType !== "1" && (
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                <Input
                                                    placeholder="Search..."
                                                    value={filterSearch}
                                                    onChange={(e) => setFilterSearch(e.target.value)}
                                                    className="pl-9 h-8 text-xs rounded-lg"
                                                />
                                            </div>
                                            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-0.5">
                                                {/* Employees */}
                                                {filterType === "2" && (
                                                    <>
                                                        <label className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-blue-600 cursor-pointer">
                                                            <Checkbox
                                                                checked={employees.length > 0 && formData.selectedEmployees.length === employees.length}
                                                                onCheckedChange={() => toggleAllFilterItems("selectedEmployees", employees)}
                                                                className="border-slate-300"
                                                            />
                                                            {t("emailReport.selectAll")}
                                                        </label>
                                                        {filteredEmployees.map((emp) => (
                                                            <label key={emp.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded cursor-pointer">
                                                                <Checkbox
                                                                    checked={formData.selectedEmployees.includes(emp.id)}
                                                                    onCheckedChange={() => toggleFilterItem("selectedEmployees", emp.id)}
                                                                    className="border-slate-300 data-[state=checked]:bg-blue-500"
                                                                />
                                                                {emp.first_name} {emp.last_name}
                                                            </label>
                                                        ))}
                                                    </>
                                                )}

                                                {/* Departments */}
                                                {filterType === "3" && (
                                                    <>
                                                        <label className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-blue-600 cursor-pointer">
                                                            <Checkbox
                                                                checked={departments.length > 0 && formData.selectedDepartments.length === departments.length}
                                                                onCheckedChange={() => toggleAllFilterItems("selectedDepartments", departments)}
                                                                className="border-slate-300"
                                                            />
                                                            {t("emailReport.selectAll")}
                                                        </label>
                                                        {filteredDepartments.map((dept) => (
                                                            <label key={dept.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded cursor-pointer">
                                                                <Checkbox
                                                                    checked={formData.selectedDepartments.includes(dept.id)}
                                                                    onCheckedChange={() => toggleFilterItem("selectedDepartments", dept.id)}
                                                                    className="border-slate-300 data-[state=checked]:bg-blue-500"
                                                                />
                                                                {dept.name}
                                                            </label>
                                                        ))}
                                                    </>
                                                )}

                                                {/* Locations */}
                                                {filterType === "4" && (
                                                    <>
                                                        <label className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-blue-600 cursor-pointer">
                                                            <Checkbox
                                                                checked={locations.length > 0 && formData.selectedLocations.length === locations.length}
                                                                onCheckedChange={() => toggleAllFilterItems("selectedLocations", locations)}
                                                                className="border-slate-300"
                                                            />
                                                            {t("emailReport.selectAll")}
                                                        </label>
                                                        {filteredLocations.map((loc) => (
                                                            <label key={loc.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded cursor-pointer">
                                                                <Checkbox
                                                                    checked={formData.selectedLocations.includes(loc.id)}
                                                                    onCheckedChange={() => toggleFilterItem("selectedLocations", loc.id)}
                                                                    className="border-slate-300 data-[state=checked]:bg-blue-500"
                                                                />
                                                                {loc.name}
                                                            </label>
                                                        ))}
                                                    </>
                                                )}

                                                {/* Shifts */}
                                                {filterType === "5" && (
                                                    <>
                                                        <label className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-blue-600 cursor-pointer">
                                                            <Checkbox
                                                                checked={shifts.length > 0 && formData.selectedShifts.length === shifts.length}
                                                                onCheckedChange={() => toggleAllFilterItems("selectedShifts", shifts)}
                                                                className="border-slate-300"
                                                            />
                                                            {t("emailReport.selectAll")}
                                                        </label>
                                                        <label className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded cursor-pointer">
                                                            <Checkbox
                                                                checked={formData.selectedShifts.includes(0)}
                                                                onCheckedChange={() => toggleFilterItem("selectedShifts", 0)}
                                                                className="border-slate-300 data-[state=checked]:bg-blue-500"
                                                            />
                                                            {t("emailReport.noShiftLabel")}
                                                        </label>
                                                        {filteredShifts.map((shift) => (
                                                            <label key={shift.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded cursor-pointer">
                                                                <Checkbox
                                                                    checked={formData.selectedShifts.includes(shift.id)}
                                                                    onCheckedChange={() => toggleFilterItem("selectedShifts", shift.id)}
                                                                    className="border-slate-300 data-[state=checked]:bg-blue-500"
                                                                />
                                                                {shift.name}
                                                            </label>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Footer Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg border-blue-300 text-blue-600 hover:bg-blue-50 text-xs"
                                onClick={handleTestEmail}
                                disabled={testingEmail || saving}
                            >
                                {testingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                                {t("emailReport.sendTestEmail")}
                            </Button>

                            <div className="flex gap-2">
                                <Button
                                    size="lg"
                                    className="rounded-xl bg-blue-500 hover:bg-blue-600 px-6 text-xs font-semibold shadow-sm"
                                    onClick={handleSave}
                                    disabled={saving || testingEmail}
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                                    {isEdit ? t("common.update") : t("save")}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="rounded-xl border-slate-300 text-slate-600 hover:bg-slate-50 px-5 text-xs font-semibold"
                                    onClick={() => onOpenChange(false)}
                                    disabled={saving}
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    {t("emailReport.cancel")}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default CreateEditEmailReport;
