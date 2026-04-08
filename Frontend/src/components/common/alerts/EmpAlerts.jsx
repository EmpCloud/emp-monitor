import React, { useEffect, useCallback, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Info, Loader2, X, ChevronDown, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import CustomSelect from "@/components/common/elements/CustomSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import EmpAlertsLogo from "@/assets/behavior/rules-alerts.svg";
import { RULE_TYPES, CONDITION_TYPE_MAP } from "@/page/protected/admin/alerts/service";
import { useAlertRulesStore } from "@/page/protected/admin/alerts/alertRulesStore";

const getRiskLevels = (t) => [
    { value: "NR", label: t("alerts.noRisk"), color: "bg-emerald-400" },
    { value: "LR", label: t("alerts.lowRisk"), color: "bg-yellow-400" },
    { value: "MR", label: t("alerts.mediumRisk"), color: "bg-orange-400" },
    { value: "HR", label: t("alerts.highRisk"), color: "bg-red-400" },
    { value: "CR", label: t("alerts.critical"), color: "bg-red-600" },
];

const RULE_TYPE_ITEMS = RULE_TYPES.map((r) => ({ value: r.value, label: r.label }));

const getConditionTypesDwt = (t) => [
    { value: "HUR", label: t("alerts.hours") },
    { value: "MNT", label: t("alerts.minutes") },
];
const getConditionTypesMnt = (t) => [{ value: "MNT", label: t("alerts.minutes") }];
const getConditionTypesAbt = (t) => [{ value: "ABT", label: t("alerts.days") }];

const OPERATORS_FULL = [
    { value: ">", label: ">" },
    { value: ">=", label: ">=" },
    { value: "<=", label: "<=" },
    { value: "<", label: "<" },
];
const OPERATORS_GT = [
    { value: ">", label: ">" },
    { value: ">=", label: ">=" },
];

const getConditionConfig = (ruleType, t) => {
    const CONDITION_TYPES_DWT = getConditionTypesDwt(t);
    const CONDITION_TYPES_MNT = getConditionTypesMnt(t);
    const CONDITION_TYPES_ABT = getConditionTypesAbt(t);
    switch (ruleType) {
        case "DWT": return { types: CONDITION_TYPES_DWT, operators: OPERATORS_FULL, canAdd: true, showWebApp: false };
        case "SEE": case "SSE": case "SSL": return { types: CONDITION_TYPES_MNT, operators: OPERATORS_FULL, canAdd: true, showWebApp: false };
        case "ABT": return { types: CONDITION_TYPES_ABT, operators: OPERATORS_GT, canAdd: true, showWebApp: false };
        case "IDL": case "OFFL": return { types: CONDITION_TYPES_MNT, operators: OPERATORS_GT, canAdd: true, showWebApp: false };
        case "STA": return { types: CONDITION_TYPES_DWT, operators: OPERATORS_GT, canAdd: false, showWebApp: true };
        case "ASA": return { types: [], operators: [], canAdd: false, showWebApp: true };
        case "WDO": return { types: [], operators: [], canAdd: false, showWebApp: false };
        default: return { types: [], operators: [], canAdd: false, showWebApp: false };
    }
};

const ToggleSwitch = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${checked ? "bg-blue-500" : "bg-gray-300"}`}
    >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
);

const MultiSelectDropdown = React.memo(function MultiSelectDropdown({ label, items, selectedIds, onToggle, onSelectAll, idKey = "id", labelKey = "name" }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handle = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [open]);

    const filtered = search
        ? items.filter((item) => (item[labelKey] || "").toLowerCase().includes(search.toLowerCase()))
        : items;

    const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item[idKey]));

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center justify-between w-full px-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none transition-all"
            >
                <span className="text-slate-600">
                    {label} {selectedIds.length > 0 && <span className="text-blue-500 font-semibold">({selectedIds.length})</span>}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="sticky top-0 bg-white border-b border-slate-100 p-1.5">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t("search")}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-400"
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                        <label className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => onSelectAll(!allSelected)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-500"
                            />
                            <span className="text-xs font-semibold text-blue-600">{t("ts_select_all")}</span>
                        </label>
                        {filtered.map((item) => (
                            <label
                                key={item[idKey]}
                                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(item[idKey])}
                                    onChange={() => onToggle(item[idKey])}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-500"
                                />
                                <span className="text-xs text-slate-600">{item[labelKey]}</span>
                            </label>
                        ))}
                        {filtered.length === 0 && (
                            <p className="px-3 py-2 text-xs text-slate-400">{t("alerts_no_results")}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

const EmpAlerts = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const form = useAlertRulesStore((s) => s.form);
    const isEditMode = useAlertRulesStore((s) => s.isEditMode);
    const locationsWithDepts = useAlertRulesStore((s) => s.locationsWithDepts);
    const selectedLocationIds = useAlertRulesStore((s) => s.selectedLocationIds);
    const selectedDepartmentIds = useAlertRulesStore((s) => s.selectedDepartmentIds);
    const selectedEmployeeIds = useAlertRulesStore((s) => s.selectedEmployeeIds);
    const allEmployees = useAlertRulesStore((s) => s.allEmployees);
    const notifyUsers = useAlertRulesStore((s) => s.notifyUsers);
    const selectedNotifyIds = useAlertRulesStore((s) => s.selectedNotifyIds);
    const loading = useAlertRulesStore((s) => s.loading);
    const saving = useAlertRulesStore((s) => s.saving);
    const error = useAlertRulesStore((s) => s.error);
    const successMsg = useAlertRulesStore((s) => s.successMsg);
    const setFormField = useAlertRulesStore((s) => s.setFormField);
    const setRuleType = useAlertRulesStore((s) => s.setRuleType);
    const addCondition = useAlertRulesStore((s) => s.addCondition);
    const removeCondition = useAlertRulesStore((s) => s.removeCondition);
    const updateCondition = useAlertRulesStore((s) => s.updateCondition);
    const selectAllLocations = useAlertRulesStore((s) => s.selectAllLocations);
    const toggleLocation = useAlertRulesStore((s) => s.toggleLocation);
    const toggleDepartment = useAlertRulesStore((s) => s.toggleDepartment);
    const selectAllDepartments = useAlertRulesStore((s) => s.selectAllDepartments);
    const toggleEmployee = useAlertRulesStore((s) => s.toggleEmployee);
    const selectAllEmployees = useAlertRulesStore((s) => s.selectAllEmployees);
    const toggleNotifyUser = useAlertRulesStore((s) => s.toggleNotifyUser);
    const fetchEmployees = useAlertRulesStore((s) => s.fetchEmployees);
    const loadInitialData = useAlertRulesStore((s) => s.loadInitialData);
    const saveRule = useAlertRulesStore((s) => s.saveRule);
    const clearMessages = useAlertRulesStore((s) => s.clearMessages);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (successMsg) {
            Swal.fire({ icon: "success", title: "Success", text: successMsg, timer: 2000, showConfirmButton: false });
            clearMessages();
        }
    }, [successMsg]);

    useEffect(() => {
        if (error) {
            Swal.fire({ icon: "error", title: "Error", text: error, showConfirmButton: true });
            clearMessages();
        }
    }, [error]);

    const handleSave = useCallback(async () => {
        const success = await saveRule();
        if (success) {
            setTimeout(() => navigate("/admin/behaviour/alertpolicies"), 2000);
        }
    }, [saveRule, navigate]);

    const RISK_LEVELS = getRiskLevels(t);
    const conditionConfig = getConditionConfig(form.ruleType, t);

    // Build department list from selected locations
    const availableDepartments = [];
    const deptSet = new Set();
    locationsWithDepts
        .filter((l) => selectedLocationIds.includes(l.location_id))
        .forEach((l) => (l.department || []).forEach((d) => {
            if (!deptSet.has(d.department_id)) {
                deptSet.add(d.department_id);
                availableDepartments.push(d);
            }
        }));

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
                <div className="w-20 h-20 flex items-center justify-center">
                    <video src="/src/assets/ai.webm" autoPlay loop playsInline muted className="w-full h-full object-contain" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div className="border-l-2 border-blue-500 pl-4">
                    <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                        <span className="font-semibold">{isEditMode ? t("alerts_edit_rule") : t("alerts_rule_and_alerts")}</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
                        {t("alerts_create_desc")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-lg" onClick={() => navigate("/admin/behaviour/alertpolicies")}>
                        {t("alerts_back_to_policies")}
                    </Button>
                    <img alt="alerts" className="w-20 h-16" src={EmpAlertsLogo} />
                </div>
            </div>

            {/* ── RULE TRIGGER ── */}
            <div className="mb-8">
                <div className="bg-gradient-to-r from-cyan-400 to-sky-400 rounded-t-xl px-5 py-2.5">
                    <span className="text-sm font-semibold text-white">{t("alerts_rule_trigger")}</span>
                </div>
                <div className="border border-t-0 border-slate-100 rounded-b-xl px-5 py-6 space-y-6">
                    {/* Rule Name */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 sm:min-w-[220px]">
                            <span className="w-1 h-5 rounded-full bg-blue-500" />
                            <span className="text-sm font-semibold text-slate-700">{t("alerts_rule_name")} <span className="text-red-500">*</span></span>
                        </div>
                        <Input value={form.ruleName} onChange={(e) => setFormField("ruleName", e.target.value)} placeholder={t("alerts_rule")} maxLength={32} className="h-10 rounded-lg border-slate-200 text-sm" />
                    </div>

                    {/* Apply Rule to new registrations */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 sm:min-w-[220px]">
                            <span className="w-1 h-5 rounded-full bg-blue-500" />
                            <span className="text-sm font-semibold text-slate-700">{t("alerts_apply_rule_new_reg")}</span>
                            <Info className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="flex-1 flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={form.allLocations} onCheckedChange={(v) => { setFormField("allLocations", v); selectAllLocations(v); }} className="border-slate-300" />
                                <span className="text-sm text-slate-600">{t("alerts_all_location")}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={form.allDepartments} onCheckedChange={(v) => { setFormField("allDepartments", v); selectAllDepartments(v); }} className="border-slate-300" />
                                <span className="text-sm text-slate-600">{t("alerts_all_department")}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={form.allEmployees} onCheckedChange={(v) => { setFormField("allEmployees", v); selectAllEmployees(v); }} className="border-slate-300" />
                                <span className="text-sm text-slate-600">{t("alerts_all_employee")}</span>
                            </label>
                        </div>
                    </div>

                    {/* Applies To — Location / Department / Employee multi-select dropdowns */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex items-center gap-2 sm:min-w-[220px]">
                            <span className="w-1 h-5 rounded-full bg-blue-500" />
                            <span className="text-sm font-semibold text-slate-700">{t("alerts_applies_to")} <span className="text-red-500">*</span></span>
                            <Info className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <MultiSelectDropdown
                                label={t("location")}
                                items={locationsWithDepts.map((l) => ({ id: l.location_id, name: l.location || l.name || `Location ${l.location_id}` }))}
                                selectedIds={selectedLocationIds}
                                onToggle={(id) => { toggleLocation(id); setTimeout(fetchEmployees, 300); }}
                                onSelectAll={(v) => { selectAllLocations(v); setFormField("allLocations", v); setTimeout(fetchEmployees, 300); }}
                            />
                            <MultiSelectDropdown
                                label={t("department")}
                                items={availableDepartments.map((d) => ({ id: d.department_id, name: d.name }))}
                                selectedIds={selectedDepartmentIds}
                                onToggle={(id) => { toggleDepartment(id); setTimeout(fetchEmployees, 300); }}
                                onSelectAll={(v) => { selectAllDepartments(v); setFormField("allDepartments", v); setTimeout(fetchEmployees, 300); }}
                            />
                            <MultiSelectDropdown
                                label={t("employee")}
                                items={allEmployees.map((e) => ({ id: e.id ?? e.u_id, name: `${e.first_name || ""} ${e.last_name || ""}`.trim() }))}
                                selectedIds={selectedEmployeeIds}
                                onToggle={toggleEmployee}
                                onSelectAll={(v) => { selectAllEmployees(v); setFormField("allEmployees", v); }}
                            />
                        </div>
                    </div>

                    {/* What Trigger The Rule */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 sm:min-w-[220px]">
                            <span className="w-1 h-5 rounded-full bg-red-500" />
                            <span className="text-sm font-semibold text-slate-700">{t("alerts_what_trigger")} <span className="text-red-500">*</span></span>
                        </div>
                        <div className="flex-1">
                            <CustomSelect placeholder={t("alerts_choose_rule")} items={RULE_TYPE_ITEMS} selected={form.ruleType} onChange={setRuleType} width="full" />
                        </div>
                    </div>

                    {/* Web/App input (for ASA, STA) */}
                    {conditionConfig.showWebApp && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 ml-0 sm:ml-[232px]">
                            <select
                                value={form.webAppType}
                                onChange={(e) => setFormField("webAppType", e.target.value)}
                                className="h-10 rounded-lg border border-slate-200 px-3 text-sm w-40"
                            >
                                <option value="DMN">{t("alerts_website")}</option>
                                <option value="APP">{t("alerts_application")}</option>
                            </select>
                            <Input
                                value={form.webAppValue}
                                onChange={(e) => setFormField("webAppValue", e.target.value)}
                                placeholder={t("alerts_enter_web_app")}
                                className="h-10 rounded-lg border-slate-200 text-sm"
                            />
                        </div>
                    )}

                    {/* Conditions */}
                    {form.ruleType && form.ruleType !== "WDO" && form.ruleType !== "ASA" && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            <div className="flex items-center gap-2 sm:min-w-[220px]">
                                <span className="w-1 h-5 rounded-full bg-blue-500" />
                                <span className="text-sm font-semibold text-slate-700">{t("alerts_condition")} <span className="text-red-500">*</span></span>
                            </div>
                            <div className="flex-1 space-y-2">
                                {form.conditions.map((cond, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <select value={cond.type} onChange={(e) => updateCondition(i, "type", e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm flex-1">
                                            {conditionConfig.types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                        <select value={cond.cmp_operator} onChange={(e) => updateCondition(i, "cmp_operator", e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm w-20">
                                            {conditionConfig.operators.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        <Input type="number" min={1} value={cond.cmp_argument} onChange={(e) => updateCondition(i, "cmp_argument", e.target.value)} placeholder={t("alerts_value")} className="h-10 rounded-lg border-slate-200 text-sm w-24" />
                                        {i > 0 && (
                                            <button type="button" onClick={() => removeCondition(i)} className="text-red-500 hover:text-red-700">
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {conditionConfig.canAdd && (
                                    <Button type="button" size="sm" className="rounded-lg bg-blue-500 hover:bg-blue-600 text-xs" onClick={addCondition}>
                                        {t("alerts_add_condition")}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Any Note */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex items-center gap-2 sm:min-w-[220px]">
                            <span className="w-1 h-5 rounded-full bg-emerald-500" />
                            <span className="text-sm font-semibold text-slate-700">{t("alerts_any_note")}</span>
                        </div>
                        <textarea value={form.note} onChange={(e) => setFormField("note", e.target.value)} rows={3} className="flex-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                    </div>
                </div>
            </div>

            {/* ── RULE RISK LEVEL ── */}
            <div className="mb-8">
                <div className="bg-gradient-to-r from-cyan-400 to-sky-400 rounded-t-xl px-5 py-2.5">
                    <span className="text-sm font-semibold text-white">{t("alerts_rule_risk_level")}</span>
                </div>
                <div className="border border-t-0 border-slate-100 rounded-b-xl px-5 py-6 space-y-6">
                    {/* Select Risk */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-2 sm:min-w-[220px]">
                            <span className="w-1 h-5 rounded-full bg-blue-500" />
                            <span className="text-sm font-semibold text-slate-700">{t("alerts_select_risk")} <span className="text-red-500">*</span></span>
                            <Info className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="flex-1 flex rounded-xl overflow-hidden border border-slate-200">
                            {RISK_LEVELS.map((risk) => (
                                <button
                                    key={risk.value}
                                    type="button"
                                    onClick={() => setFormField("riskLevel", risk.value)}
                                    className={`flex-1 py-2.5 text-xs font-semibold text-center text-white transition-all ${risk.color} ${form.riskLevel === risk.value ? "ring-2 ring-inset ring-white/50 brightness-110" : "opacity-80 hover:opacity-100"}`}
                                >
                                    {risk.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Multiple Alerts */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 sm:min-w-[220px]">
                            <span className="w-1 h-5 rounded-full bg-emerald-500" />
                            <span className="text-sm font-semibold text-slate-700">{t("alerts_multiple_alerts_day")}</span>
                        </div>
                        <ToggleSwitch checked={form.isMultipleAlerts} onChange={(v) => setFormField("isMultipleAlerts", v)} />
                    </div>

                    {/* Desktop notification */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 sm:min-w-[220px]">
                            <span className="w-1 h-5 rounded-full bg-amber-500" />
                            <span className="text-sm font-semibold text-slate-700">{t("alerts_desktop_notification")}</span>
                        </div>
                        <ToggleSwitch checked={form.isDesktopNotify} onChange={(v) => setFormField("isDesktopNotify", v)} />
                    </div>

                    {/* Whom to be notified */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex items-center gap-2 sm:min-w-[220px]">
                            <span className="w-1 h-5 rounded-full bg-blue-500" />
                            <span className="text-sm font-semibold text-slate-700">{t("alerts_whom_notified")} <span className="text-red-500">*</span></span>
                        </div>
                        <div className="flex-1">
                            <MultiSelectDropdown
                                label={t("alerts_select_users_notify")}
                                items={notifyUsers.map((u) => ({ id: u.u_id ?? u.id, name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email }))}
                                selectedIds={selectedNotifyIds}
                                onToggle={toggleNotifyUser}
                                onSelectAll={(v) => {
                                    if (v) {
                                        const allIds = notifyUsers.map((u) => u.u_id ?? u.id);
                                        allIds.forEach((id) => { if (!selectedNotifyIds.includes(id)) toggleNotifyUser(id); });
                                    } else {
                                        selectedNotifyIds.forEach((id) => toggleNotifyUser(id));
                                    }
                                }}
                            />
                            {selectedNotifyIds.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {selectedNotifyIds.map((id) => {
                                        const user = notifyUsers.find((u) => (u.u_id ?? u.id) === id);
                                        if (!user) return null;
                                        return (
                                            <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500 text-white text-[11px] font-medium">
                                                {user.first_name} {user.last_name}
                                                <button type="button" onClick={() => toggleNotifyUser(id)} className="hover:text-blue-200">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button className="rounded-xl bg-blue-500 hover:bg-blue-600 px-8 text-sm font-semibold shadow-sm" onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t("alerts_saving")}</> : <>{isEditMode ? t("alerts_update_launch") : t("alerts_save_launch")}</>}
                </Button>
            </div>
        </div>
    );
};

export default EmpAlerts;
