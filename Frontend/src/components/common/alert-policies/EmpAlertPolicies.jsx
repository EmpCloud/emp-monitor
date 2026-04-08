import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PaginationComponent from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import ShowEntries from "@/components/common/elements/ShowEntries";
import EmpAlertPoliciesLogo from "@/assets/behavior/alert-policies.svg";
import { CONDITION_TYPE_MAP } from "@/page/protected/admin/alerts/service";
import { useAlertPoliciesStore } from "@/page/protected/admin/alert-policies/alertPoliciesStore";

const AppliesToCell = React.memo(function AppliesToCell({ appliesTo }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? appliesTo : appliesTo.slice(0, 5);
    const hiddenCount = appliesTo.length - 5;
    const expand = useCallback(() => setExpanded(true), []);
    const collapse = useCallback(() => setExpanded(false), []);

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {visible.map((emp, i) => (
                <span key={emp.id ?? i} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-500 text-white text-[10px] font-semibold">
                    {emp.name || emp}
                </span>
            ))}
            {appliesTo.length > 5 && !expanded && (
                <button onClick={expand} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold transition-colors">
                    +{hiddenCount} {t("alertPol.more")}
                </button>
            )}
            {expanded && appliesTo.length > 5 && (
                <button onClick={collapse} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-semibold transition-colors">
                    {t("alertPol.hide")}
                </button>
            )}
        </div>
    );
});

const EmpAlertPolicies = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const rows = useAlertPoliciesStore((s) => s.rows);
    const totalCount = useAlertPoliciesStore((s) => s.totalCount);
    const loading = useAlertPoliciesStore((s) => s.loading);
    const tableLoading = useAlertPoliciesStore((s) => s.tableLoading);
    const error = useAlertPoliciesStore((s) => s.error);
    const successMsg = useAlertPoliciesStore((s) => s.successMsg);
    const selectedIds = useAlertPoliciesStore((s) => s.selectedIds);
    const pagination = useAlertPoliciesStore((s) => s.pagination);
    const searchValue = useAlertPoliciesStore((s) => s.search);
    const setPagination = useAlertPoliciesStore((s) => s.setPagination);
    const setSearch = useAlertPoliciesStore((s) => s.setSearch);
    const toggleSelectRow = useAlertPoliciesStore((s) => s.toggleSelectRow);
    const toggleSelectAll = useAlertPoliciesStore((s) => s.toggleSelectAll);
    const loadPolicies = useAlertPoliciesStore((s) => s.loadPolicies);
    const fetchPolicies = useAlertPoliciesStore((s) => s.fetchPolicies);
    const deletePolicyAction = useAlertPoliciesStore((s) => s.deletePolicy);
    const applySelectedRules = useAlertPoliciesStore((s) => s.applySelectedRules);
    const applyAllRules = useAlertPoliciesStore((s) => s.applyAllRules);
    const handleSort = useAlertPoliciesStore((s) => s.handleSort);
    const clearMessages = useAlertPoliciesStore((s) => s.clearMessages);

    const [localSearch, setLocalSearch] = useState("");
    const initialLoad = useRef(true);
    const debounceTimer = useRef(null);

    useEffect(() => {
        loadPolicies();
    }, []);

    // Debounce search
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setSearch(localSearch), 400);
        return () => clearTimeout(debounceTimer.current);
    }, [localSearch]);

    // Re-fetch on pagination/sort/search change
    useEffect(() => {
        if (initialLoad.current) {
            initialLoad.current = false;
            return;
        }
        fetchPolicies();
    }, [pagination.page, pagination.pageSize, pagination.sortColumn, pagination.sortOrder, searchValue]);

    // Show SweetAlert on success/error
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

    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
    const allSelected = rows.length > 0 && selectedIds.length === rows.length;

    const handleEdit = useCallback((policy) => {
        localStorage.setItem("updatePolicy", JSON.stringify({
            id: policy.id,
            name: policy.name,
            note: policy.note,
            type: policy.type,
            risk_level: policy.riskLevel,
            is_multiple_alerts_in_day: policy.isMultipleAlertsInDay,
            is_action_notify: policy.isActionNotify,
            conditions: policy.conditions,
            recipients: policy.recipients,
            include_employees: {
                ids: policy.appliesTo.map((e) => e.id ?? e),
                all_employees: policy.allEmployees,
                all_locations: policy.allLocations,
                all_departments: policy.allDepartments,
            },
        }));
        navigate("/admin/behaviour/alerts");
    }, [navigate]);

    const goToNewAlert = useCallback(() => {
        navigate("/admin/behaviour/alerts");
    }, [navigate]);

    const handlePageSizeChange = useCallback((v) => {
        setPagination("pageSize", parseInt(v, 10) || 10);
        setPagination("page", 1);
    }, [setPagination]);

    const handlePageChange = useCallback((p) => {
        setPagination("page", p);
    }, [setPagination]);

    const handleSearchInput = useCallback((e) => {
        setLocalSearch(e.target.value);
    }, []);

    const handleDelete = useCallback(async (policyId) => {
        const result = await Swal.fire({
            title: t("alertPol.areYouSure"),
            text: t("alertPol.deleteWarning"),
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: t("delete"),
            cancelButtonText: t("cancel"),
        });
        if (!result.isConfirmed) return;
        const success = await deletePolicyAction(policyId);
        if (success) {
            Swal.fire({ icon: "success", title: t("alertPol.deleted"), text: t("alertPol.ruleDeletedSuccess"), timer: 2000, showConfirmButton: false });
        }
    }, [deletePolicyAction]);

    const handleApplySelected = useCallback(async () => {
        const success = await applySelectedRules();
        if (success) fetchPolicies();
    }, [applySelectedRules, fetchPolicies]);

    const handleApplyAll = useCallback(async () => {
        const result = await Swal.fire({
            title: t("alertPol.applyAllRules"),
            text: t("alertPol.applyAllConfirm"),
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: t("alertPol.yesApplyAll"),
            cancelButtonText: t("cancel"),
        });
        if (!result.isConfirmed) return;
        const success = await applyAllRules();
        if (success) fetchPolicies();
    }, [applyAllRules, fetchPolicies]);

    const formatConditions = (conditions) => {
        if (!conditions.length) return "Day Off";
        return conditions.map((c, i) => {
            const typeName = CONDITION_TYPE_MAP[c.type] || c.type;
            return (
                <span key={i} className="block">
                    {typeName} {c.cmp_operator} {c.app_domain_name || c.cmp_argument}
                </span>
            );
        });
    };

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
                <div className="flex items-center gap-0">
                    <div className="flex items-end gap-1">
                        <img alt="policies" className="w-24 h-24" src={EmpAlertPoliciesLogo} />
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                            <span className="font-semibold">{t("alertPol.title")}</span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
                            {t("alertPol.description")}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {selectedIds.length > 0 ? (
                        <Button
                            className="rounded-full bg-blue-500 hover:bg-blue-600 px-6 text-sm font-semibold shadow-sm"
                            onClick={handleApplySelected}
                        >
                            {t("alertPol.applySelectedRules")}
                        </Button>
                    ) : (
                        <Button
                            className="rounded-full bg-blue-500 hover:bg-blue-600 px-6 text-sm font-semibold shadow-sm"
                            onClick={handleApplyAll}
                        >
                            {t("alertPol.applyAllRulesToAll")}
                        </Button>
                    )}
                    <Button
                        className="rounded-full bg-blue-500 hover:bg-blue-600 px-6 text-sm font-semibold shadow-sm"
                        onClick={goToNewAlert}
                    >
                        {t("alertPol.addNewAlert")}
                    </Button>
                </div>
            </div>

            {/* Show entries + Search */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
                <ShowEntries value={pagination.pageSize} onChange={handlePageSizeChange} />
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder={t("search")}
                        value={localSearch}
                        onChange={handleSearchInput}
                        className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
                <table className="min-w-[1100px] w-full">
                    <thead>
                        <tr className="bg-[#CADDFF]">
                            <th className="w-10 px-4 py-3 text-left">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={toggleSelectAll}
                                    className="border-slate-300"
                                />
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("alertPol.dateTime")}</th>
                            <th
                                className="px-4 py-3 text-xs font-semibold text-slate-700 text-left cursor-pointer select-none"
                                onClick={() => handleSort("name")}
                            >
                                <div className="flex items-center gap-1">
                                    {t("alertPol.ruleName")}
                                    <span className="text-slate-300">
                                        {pagination.sortColumn === "name" ? (
                                            pagination.sortOrder === "D" ? <ArrowDown className="w-3 h-3 text-blue-500" /> : <ArrowUp className="w-3 h-3 text-blue-500" />
                                        ) : <ArrowUp className="w-3 h-3" />}
                                    </span>
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("alertPol.notifyAs")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("alertPol.conditions")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("alertPol.appliesTo")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("alertPol.recipients")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("action")}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {tableLoading ? (
                            <tr>
                                <td colSpan={8} className="text-center text-sm text-gray-400 py-10">{t("loadingText")}</td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center text-sm text-gray-400 py-10">{t("Nodata")}</td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 last:border-b-0 text-xs text-slate-600">
                                    <td className="px-4 py-4">
                                        <Checkbox
                                            checked={selectedIds.includes(row.id)}
                                            onCheckedChange={() => toggleSelectRow(row.id)}
                                            className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                        />
                                    </td>
                                    <td className="px-4 py-4 font-medium text-slate-700">{row.dateTime}</td>
                                    <td className="px-4 py-4" style={{ borderLeft: `4px solid ${row.riskColor}` }}>
                                        {row.name}
                                    </td>
                                    <td className="px-4 py-4">
                                        {row.notifyAs}
                                        {row.isActionNotify && (
                                            <span className="block mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-500">
                                                Notify
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">{formatConditions(row.conditions)}</td>
                                    <td className="px-4 py-4">
                                        <AppliesToCell appliesTo={row.appliesTo} />
                                    </td>
                                    <td className="px-4 py-4">
                                        {row.recipients.map((r, i) => (
                                            <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200 mr-1 mb-1">
                                                {r.email || "-"}
                                            </span>
                                        ))}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(row)}
                                                className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(row.id)}
                                                className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5 pt-10">
                <p className="text-[13px] text-gray-500 font-medium">
                    {t("timeclaim.showing")} <span className="font-bold text-gray-700">{totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}</span>{" "}
                    {t("to")} <span className="font-bold text-gray-700">{Math.min(pagination.page * pagination.pageSize, totalCount)}</span>{" "}
                    {t("of")} <span className="font-bold text-blue-600">{totalCount}</span>
                </p>
                <PaginationComponent currentPage={pagination.page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
        </div>
    );
};

export default EmpAlertPolicies;
