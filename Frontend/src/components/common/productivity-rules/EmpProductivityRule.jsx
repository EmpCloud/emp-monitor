import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    Search,
    Eye,
    Globe,
    Wrench,
    Plus,
    MonitorSmartphone,
    AppWindow,
    Download,
    Upload,
    LayoutGrid,
    Grip,
    Loader2,
    ChevronDown,
    ChevronUp,
    List,
    Clock,
    ArrowUpDown,
    FileDown,
    FileText,
    FileSpreadsheet,
} from "lucide-react";
import PaginationComponent from "@/components/common/Pagination";
import CustomSelect from "@/components/common/elements/CustomSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ShowEntries from "@/components/common/elements/ShowEntries";
import EmpProductivityRuleLogo from "@/assets/settings/productivity-rules.svg";
import { useProductivityRulesStore } from "@/page/protected/admin/productivity-rules/productivityRulesStore";
import { convertSecToHM, RANKING_OPTIONS } from "@/page/protected/admin/productivity-rules/service";
import AddDomainDialog from "./dialog/AddDomainDialog";
import ImportDialog from "./dialog/ImportDialog";
import AlwaysActiveDialog from "./dialog/AlwaysActiveDialog";
import URLUsageDialog from "./dialog/URLUsageDialog";

// ─── Tabs Config ────────────────────────────────────────────────────────────

const getTabs = (t) => [
    { id: "All", label: t("prodRules.seeAll"), icon: Eye },
    { id: "Global", label: t("prodRules.global"), icon: Globe },
    { id: "Custom", label: t("prodRules.custom"), icon: Wrench },
    { id: "New", label: t("prodRules.new"), icon: Plus },
];

// ─── Ranking Button Component ───────────────────────────────────────────────

const RankingButton = ({ label, active, color, dotColor, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
            active
                ? `${color.bg} ${color.text} ${color.border}`
                : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
        }`}
    >
        <span className={`w-2 h-2 rounded-full ${active ? dotColor : "bg-slate-300"}`} />
        {label}
    </button>
);

// ─── Department Rules Dropdown ──────────────────────────────────────────────

const DepartmentRulesRow = ({ dept, applicationId, currentStatus, preRequest, departments, onUpdate, onAlwaysActive }) => {
    const { t } = useTranslation();
    const deptName = departments.find((d) => d.id === dept.department_id)?.name || `Dept ${dept.department_id}`;

    return (
        <tr className="bg-slate-50/50 border-b border-slate-100">
            <td className="px-4 py-3 pl-10">
                <span className="text-xs text-slate-600">{deptName}</span>
            </td>
            <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { status: 1, label: t("prodRules.productive"), color: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" }, dot: "bg-emerald-500" },
                        { status: 0, label: t("prodRules.neutral"), color: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" }, dot: "bg-amber-500" },
                        { status: 2, label: t("prodRules.unproductive"), color: { bg: "bg-red-50", text: "text-red-500", border: "border-red-200" }, dot: "bg-red-500" },
                    ].map((r) => (
                        <RankingButton
                            key={r.status}
                            label={r.label}
                            active={dept.status === r.status}
                            color={r.color}
                            dotColor={r.dot}
                            onClick={() => onUpdate({
                                applicationId,
                                status: r.status,
                                departmentId: dept.department_id,
                                preRequest: dept.pre_request || 0,
                            })}
                        />
                    ))}

                    <button
                        onClick={() => onAlwaysActive({
                            applicationId,
                            status: dept.status,
                            departmentId: dept.department_id,
                            isCustom: true,
                            currentTime: dept.pre_request || 0,
                        })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                            dept.pre_request >= 60
                                ? "bg-violet-50 text-violet-600 border-violet-200"
                                : "bg-white text-slate-400 border-slate-200"
                        }`}
                    >
                        <Clock className="w-3 h-3" />
                        {t("prodRules.alwaysActive")}: {convertSecToHM(dept.pre_request || 0)} {t("prodRules.hr")}
                    </button>
                </div>
            </td>
            <td className="px-4 py-3" />
        </tr>
    );
};

// ─── Export Dropdown ────────────────────────────────────────────────────────

const ExportDropdown = ({ onExport, exporting }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <Button
                size="lg"
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 text-xs font-semibold shadow-sm"
                onClick={() => setOpen(!open)}
                disabled={exporting}
            >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {t("prodRules.export")}
                <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
            {open && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 min-w-[140px]">
                    {[
                        { format: "excel", label: t("prodRules.excelXlsx"), icon: FileSpreadsheet },
                        { format: "csv", label: t("prodRules.csv"), icon: FileText },
                        { format: "pdf", label: t("prodRules.pdf"), icon: FileDown },
                    ].map(({ format, label, icon: Icon }) => (
                        <button
                            key={format}
                            onClick={() => { onExport(format); setOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                            <Icon className="w-3.5 h-3.5 text-slate-400" />
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const EmpProductivityRule = () => {
    const { t } = useTranslation();
    const store = useProductivityRulesStore();
    const {
        rows,
        totalCount,
        loading,
        departments,
        activeTab,
        activeSubTab,
        filteredValue,
        rankingFilter,
        searchText,
        page,
        pageSize,
        exporting,
        error,
        successMsg,
        clearError,
        clearSuccess,
        setActiveTab,
        setActiveSubTab,
        setFilteredValue,
        setRankingFilter,
        setSearchText,
        doSearch,
        setSort,
        setPage,
        setPageSize,
        updateRanking,
        openAlwaysActiveDialog,
        openAddDomainDialog,
        openImportDialog,
        openBulkImportDialog,
        openURLUsageDialog,
        handleExport,
        openCategoryModal,
    } = store;

    const [expandedRows, setExpandedRows] = useState({});

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // Auto-clear messages
    useEffect(() => {
        if (successMsg) {
            const t = setTimeout(clearSuccess, 3000);
            return () => clearTimeout(t);
        }
    }, [successMsg, clearSuccess]);

    useEffect(() => {
        if (error) {
            const t = setTimeout(clearError, 5000);
            return () => clearTimeout(t);
        }
    }, [error, clearError]);

    const toggleExpand = (id) => {
        setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleRankingUpdate = useCallback(({ applicationId, status, departmentId, preRequest }) => {
        updateRanking({ applicationId, status, departmentId, preRequest });
    }, [updateRanking]);

    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") doSearch();
    };

    const isActivityView = filteredValue === "1";

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* Success / Error Messages */}
            {successMsg && (
                <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
                    {successMsg}
                </div>
            )}
            {error && (
                <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-200">
                    {error}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-0">
                    <div className="flex items-end gap-1 mr-2">
                        <img alt="productivity-rules" className="w-24 h-24" src={EmpProductivityRuleLogo} />
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                            <span className="font-semibold">{t("prodRules.title")}</span>{" "}
                            <span className="font-normal text-gray-500">{t("prodRules.rules")}</span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
                            {t("prodRules.description")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="lg"
                        onClick={() => setFilteredValue("1")}
                        className={`rounded-xl px-5 text-xs font-semibold shadow-sm ${
                            isActivityView
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : "bg-slate-300 hover:bg-slate-400"
                        }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        {t("prodRules.activity")}
                    </Button>
                    <Button
                        size="lg"
                        onClick={() => setFilteredValue("2")}
                        className={`rounded-xl px-5 text-xs font-semibold shadow-sm ${
                            !isActivityView
                                ? "bg-violet-500 hover:bg-violet-600"
                                : "bg-slate-300 hover:bg-slate-400"
                        }`}
                    >
                        <Grip className="w-4 h-4" />
                        {t("prodRules.category")}
                    </Button>
                </div>
            </div>

            {/* Tabs Row */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                {getTabs(t).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                                isActive
                                    ? "bg-blue-500 text-white shadow-sm"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Sub-tabs + Category + Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Website / Application toggle — only for Activity view */}
                    {isActivityView && (
                        <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden">
                            <button
                                onClick={() => setActiveSubTab(activeSubTab === "website" ? "" : "website")}
                                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                                    activeSubTab === "website"
                                        ? "bg-red-50 text-red-600 border-red-200"
                                        : "bg-white text-slate-500 hover:bg-slate-50"
                                }`}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                {t("prodRules.website")}
                            </button>
                            <button
                                onClick={() => setActiveSubTab(activeSubTab === "application" ? "" : "application")}
                                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-l border-slate-200 transition-colors ${
                                    activeSubTab === "application"
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                        : "bg-white text-slate-500 hover:bg-slate-50"
                                }`}
                            >
                                <AppWindow className="w-3.5 h-3.5" />
                                {t("prodRules.application")}
                            </button>
                        </div>
                    )}

                    {/* Productivity Category */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">{t("prodRules.productivityCategory")}</span>
                        <CustomSelect
                            placeholder={t("prodRules.seeAll")}
                            items={RANKING_OPTIONS}
                            selected={rankingFilter}
                            onChange={(val) => setRankingFilter(val)}
                            width="full"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="lg"
                        className="rounded-xl bg-blue-500 hover:bg-blue-600 px-4 text-xs font-semibold shadow-sm"
                        onClick={openAddDomainDialog}
                    >
                        <Plus className="w-4 h-4" />
                        {t("prodRules.addNewDomain")}
                    </Button>

                    {isActivityView && activeTab === "All" && (
                        <>
                            <ExportDropdown onExport={handleExport} exporting={exporting} />
                            <Button
                                size="lg"
                                className="rounded-xl bg-red-500 hover:bg-red-600 px-4 text-xs font-semibold shadow-sm"
                                onClick={openImportDialog}
                            >
                                <Upload className="w-4 h-4" />
                                {t("prodRules.import")}
                            </Button>
                        </>
                    )}

                    <Button
                        size="lg"
                        className="rounded-xl bg-violet-500 hover:bg-violet-600 px-4 text-xs font-semibold shadow-sm"
                        onClick={openBulkImportDialog}
                    >
                        <Upload className="w-4 h-4" />
                        {t("prodRules.bulkImport")}
                    </Button>
                </div>
            </div>

            {/* Show entries + Search */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <ShowEntries value={pageSize} onChange={(v) => setPageSize(parseInt(v, 10) || 10)} />

                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder={t("prodRules.searchByActivity")}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
                <table className="min-w-[900px] w-full">
                    <thead>
                        <tr className="bg-blue-50/80">
                            <th className="px-4 py-3 text-left" width="300">
                                <button
                                    onClick={() => setSort("Name")}
                                    className="flex items-center gap-1 text-xs font-semibold text-slate-700"
                                >
                                    {t("prodRules.activity")}
                                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                                {t("prodRules.productivityRanking")}
                            </th>
                            <th className="px-4 py-3 bg-slate-200/60 w-14" />
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="text-center py-16">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                                    <p className="text-sm text-slate-400 mt-2">{t("loadingText")}</p>
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="text-center text-sm text-gray-400 py-10">
                                    {t("Nodata")}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const isExpanded = expandedRows[row.id];
                                const hasCustom = row.status === 4;
                                const hasDeptRules = row.departmentRules && row.departmentRules.length > 0;

                                return (
                                    <React.Fragment key={row.id}>
                                        <tr className="border-b border-slate-100 last:border-b-0">
                                            {/* Activity */}
                                            <td className="px-4 py-4">
                                                {isActivityView ? (
                                                    <div className="flex items-center gap-2">
                                                        {row.type === 2 ? (
                                                            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                                                        ) : (
                                                            <MonitorSmartphone className="w-4 h-4 text-slate-400 shrink-0" />
                                                        )}
                                                        <span
                                                            className="text-xs text-slate-700 font-medium truncate max-w-[200px]"
                                                            title={row.name}
                                                        >
                                                            {row.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => openCategoryModal(row.id, row.name)}
                                                        className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
                                                    >
                                                        {row.name}
                                                        {row.domainCount > 0 && (
                                                            <span className="bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full">
                                                                {row.domainCount}
                                                            </span>
                                                        )}
                                                    </button>
                                                )}
                                            </td>

                                            {/* Productivity Ranking */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {[
                                                        { status: 1, label: t("prodRules.productive"), color: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" }, dot: "bg-emerald-500" },
                                                        { status: 0, label: t("prodRules.neutral"), color: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" }, dot: "bg-amber-500" },
                                                        { status: 2, label: t("prodRules.unproductive"), color: { bg: "bg-red-50", text: "text-red-500", border: "border-red-200" }, dot: "bg-red-500" },
                                                    ].map((r) => (
                                                        <RankingButton
                                                            key={r.status}
                                                            label={r.label}
                                                            active={row.status === r.status}
                                                            color={r.color}
                                                            dotColor={r.dot}
                                                            onClick={() => handleRankingUpdate({
                                                                applicationId: row.id,
                                                                status: r.status,
                                                                departmentId: 0,
                                                                preRequest: row.preRequest,
                                                            })}
                                                        />
                                                    ))}

                                                    {/* Customize By Department */}
                                                    <button
                                                        onClick={() => toggleExpand(row.id)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                                                            hasCustom
                                                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                                                : "bg-white text-slate-400 border-slate-200 hover:border-blue-200"
                                                        }`}
                                                    >
                                                        <span className={`w-2 h-2 rounded-full ${hasCustom ? "bg-blue-500" : "bg-slate-300"}`} />
                                                        {t("prodRules.customizeByDept")}
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-3 h-3" />
                                                        ) : (
                                                            <ChevronDown className="w-3 h-3" />
                                                        )}
                                                    </button>

                                                    {/* Always Active badge */}
                                                    {row.status !== 4 && (
                                                        <button
                                                            onClick={() => openAlwaysActiveDialog({
                                                                applicationId: row.id,
                                                                status: row.status,
                                                                departmentId: 0,
                                                                isCustom: false,
                                                                currentTime: row.preRequest,
                                                            })}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                                                                row.preRequest >= 60
                                                                    ? "bg-violet-50 text-violet-600 border-violet-200"
                                                                    : "bg-white text-slate-400 border-slate-200"
                                                            }`}
                                                        >
                                                            <Clock className="w-3 h-3" />
                                                            {t("prodRules.alwaysActive")}: {convertSecToHM(row.preRequest)} {t("prodRules.hr")}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Action icon — View Usage */}
                                            <td className="px-4 py-4 bg-slate-100/50">
                                                <button
                                                    onClick={() => openURLUsageDialog(row.id, row.name)}
                                                    className="w-8 h-8 rounded-lg bg-violet-100 hover:bg-violet-200 flex items-center justify-center mx-auto transition-colors"
                                                    title={t("prodRules.viewUsage")}
                                                >
                                                    <List className="w-4 h-4 text-violet-500" />
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expanded Department Rules */}
                                        {isExpanded && hasDeptRules && row.departmentRules.map((dept, idx) => (
                                            <DepartmentRulesRow
                                                key={`${row.id}-dept-${dept.department_id || idx}`}
                                                dept={dept}
                                                applicationId={row.id}
                                                currentStatus={dept.status}
                                                preRequest={dept.pre_request}
                                                departments={departments}
                                                onUpdate={handleRankingUpdate}
                                                onAlwaysActive={openAlwaysActiveDialog}
                                            />
                                        ))}

                                        {/* Expanded but no dept rules — show all departments with default */}
                                        {isExpanded && !hasDeptRules && departments.map((dept) => (
                                            <DepartmentRulesRow
                                                key={`${row.id}-dept-${dept.id}`}
                                                dept={{
                                                    department_id: dept.id,
                                                    status: row.status === 4 ? 0 : row.status,
                                                    pre_request: 0,
                                                }}
                                                applicationId={row.id}
                                                currentStatus={row.status}
                                                preRequest={0}
                                                departments={departments}
                                                onUpdate={handleRankingUpdate}
                                                onAlwaysActive={openAlwaysActiveDialog}
                                            />
                                        ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5">
                <p className="text-[13px] text-gray-500 font-medium">
                    {t("timeclaim.showing")}{" "}
                    <span className="font-bold text-gray-700">
                        {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
                    </span>{" "}
                    {t("to")}{" "}
                    <span className="font-bold text-gray-700">
                        {Math.min(page * pageSize, totalCount)}
                    </span>{" "}
                    {t("of")}{" "}
                    <span className="font-bold text-blue-600">{totalCount}</span>
                </p>
                <PaginationComponent
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p)}
                />
            </div>

            {/* Dialogs */}
            <AddDomainDialog />
            <ImportDialog variant="import" />
            <ImportDialog variant="bulk" />
            <AlwaysActiveDialog />
            <URLUsageDialog />
        </div>
    );
};

export default EmpProductivityRule;
