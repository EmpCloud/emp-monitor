import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const avatarColors = [
    "bg-blue-500", "bg-cyan-500", "bg-sky-500", "bg-amber-500", "bg-rose-500",
];

const getInitials = (name) =>
    name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

// Column definitions with styling from development design.
// `textColor` is applied to BOTH the header label and body cells so the
// Productive/Unproductive/Neutral/Idle/Productivity columns stand out per the
// blade design.
// `infoKey` (when present) renders an info icon next to the header label with
// a tooltip containing the corresponding translated explanation.
const getColumnDefs = (t) => [
    { key: "email", label: t("ts_email"), headClass: "bg-[#CADDFF]", cellClass: "px-4" },
    { key: "empCode", label: t("ts_emp_code"), headClass: "bg-[#CADDFF]", cellClass: "px-4" },
    { key: "location", label: t("location"), headClass: "bg-[#CADDFF]", cellClass: "px-4" },
    { key: "department", label: t("department"), headClass: "bg-[#CADDFF]", cellClass: "px-4" },
    { key: "shift", label: t("ts_shift"), headClass: "bg-[#CADDFF]", cellClass: "px-4" },
    { key: "computerName", label: t("ts_computer_name"), headClass: "bg-[#CADDFF]", cellClass: "px-4" },
    { key: "clockIn", label: t("ts_clock_in"), headClass: "text-white bg-[#0F79F3]/90 text-center", cellClass: "text-center px-4 whitespace-nowrap" },
    { key: "clockOut", label: t("ts_clock_out"), headClass: "text-white bg-blue-800 text-center", cellClass: "text-center px-4 whitespace-nowrap" },
    { key: "checkInIp", label: t("ts_check_in_ip"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4" },
    { key: "checkOutIp", label: t("ts_check_out_ip"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4" },
    { key: "totalTime", label: t("ts_total_hours"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4", infoKey: "ts_total_hours_info" },
    { key: "officeTime", label: t("ts_office_hours"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4", infoKey: "ts_office_hours_info" },
    { key: "activeTime", label: t("ts_active_hours"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4", infoKey: "ts_active_hours_info" },
    { key: "productiveTime", label: t("ts_productive"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4", textColor: "text-green-600", infoKey: "ts_productive_info" },
    { key: "nonProductiveTime", label: t("ts_unproductive"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4", textColor: "text-red-600", infoKey: "ts_unproductive_info" },
    { key: "neutralTime", label: t("ts_neutral"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4", textColor: "text-gray-500", infoKey: "ts_neutral_info" },
    { key: "idleTime", label: t("ts_idle"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4", textColor: "text-amber-500", infoKey: "ts_idle_info" },
    { key: "offlineTime", label: t("ts_offline"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4" },
    { key: "breakTime", label: t("ts_break_hours"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4", infoKey: "ts_break_info" },
    { key: "productivity", label: t("ts_productivity_pct"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4 font-semibold", textColor: "text-blue-600", infoKey: "ts_productivity_info" },
    { key: "unproductivity", label: t("ts_unproductivity_pct"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4 font-semibold", textColor: "text-blue-600", infoKey: "ts_unproductivity_info" },
    { key: "mobileUsage", label: t("ts_mobile_usage"), headClass: "bg-[#CADDFF]", cellClass: "text-center px-4" },
];

function HeaderLabel({ label, textColor, infoText }) {
    return (
        <span className={`inline-flex items-center gap-1 ${textColor || ""}`}>
            {label}
            {infoText && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-blue-500 cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4} className="max-w-xs">
                        {infoText}
                    </TooltipContent>
                </Tooltip>
            )}
        </span>
    );
}

function TimesheetTable({ rows, loading, visibleColumns }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const COLUMN_DEFS = React.useMemo(() => getColumnDefs(t), [t]);
    const activeCols = COLUMN_DEFS.filter((col) => visibleColumns.includes(col.key));
    const colCount = activeCols.length + 1; // +1 for sticky name column

    const handleNameClick = (row) => {
        navigate(`/admin/employee-details?id=${row.id}`);
    };

    return (
        <TooltipProvider delayDuration={150}>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 overflow-x-auto">
                <Table className="min-w-[1200px] w-full">
                    <TableHeader className="h-12">
                        <TableRow className="bg-[#F9F9F9]">
                            <TableHead
                                className="text-sm px-4 font-semibold text-slate-700 border-b border-[#717171]/20 sticky left-0 z-20 bg-[#F9F9F9]"
                            >
                                {t("emp_name")}
                            </TableHead>
                            {activeCols.map((col) => (
                                <TableHead
                                    key={col.key}
                                    className={`text-sm px-4 font-semibold text-slate-700 ${col.headClass || ""}`}
                                >
                                    <HeaderLabel
                                        label={col.label}
                                        textColor={col.textColor}
                                        infoText={col.infoKey ? t(col.infoKey) : null}
                                    />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody className="bg-[#F9F9F9]">
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={colCount} className="text-center text-sm text-gray-400 py-10">
                                    {t("emp_loading")}
                                </TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={colCount} className="text-center text-sm text-gray-400 py-10">
                                    {t("ts_no_records_found")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, idx) => (
                                <TableRow key={`${row.id}-${idx}`} className="text-xs text-[#121212]">
                                    <TableCell
                                        className="border-r border-[#717171]/20 px-4 sticky left-0 z-10 bg-[#F9F9F9] min-w-[180px]"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-7 h-7 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-[10px] font-semibold text-white shrink-0`}
                                            >
                                                {getInitials(row.name)}
                                            </div>
                                            <button
                                                onClick={() => handleNameClick(row)}
                                                className="truncate text-blue-600 hover:text-blue-800 hover:underline text-left"
                                                title={t("ts_view_full_details")}
                                            >
                                                {row.name}
                                            </button>
                                        </div>
                                    </TableCell>
                                    {activeCols.map((col) => (
                                        <TableCell
                                            key={col.key}
                                            className={`${col.cellClass || "px-4"} ${col.textColor || ""}`}
                                        >
                                            {row[col.key] ?? "-"}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
}

export default React.memo(TimesheetTable);
