import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Columns3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaFileCsv } from "react-icons/fa6";
import { BiSolidFilePdf } from "react-icons/bi";
import EmpTimesheetLogo from "../../../assets/timesheet/timesheets.svg";

const EXPORT_OPTIONS = [
    { key: "name", label: "Name" },
    { key: "timeInMinutes", label: "Time In Minutes" },
    { key: "timeInTotal", label: "Time In Total" },
    { key: "average", label: "Average" },
    { key: "absentUsers", label: "Absent User|Users" },
    { key: "assignedList", label: "Assigned List" },
    { key: "splitSheet", label: "Split sheet" },
    { key: "email", label: "Email id" },
    { key: "location", label: "Location" },
    { key: "department", label: "Department" },
    { key: "shift", label: "Shift" },
    { key: "empCode", label: "Emp-Code" },
    { key: "clockIn", label: "Clock In" },
    { key: "clockOut", label: "Clock Out" },
    { key: "loggedInIp", label: "Logged In IP" },
    { key: "totalHours", label: "Total Hours" },
    { key: "officeHours", label: "Office Hours" },
    { key: "activeHours", label: "Active Hours" },
    { key: "productive", label: "Productive" },
    { key: "unproductive", label: "Unproductive" },
    { key: "idle", label: "Idle" },
    { key: "neutral", label: "Neutral" },
    { key: "offlineHours", label: "Offline Hours" },
    { key: "breakHours", label: "Break Hours" },
    { key: "productivity", label: "Productivity" },
];

const ALL_KEYS = EXPORT_OPTIONS.map((o) => o.key);

function ExportDropdown({ open, onClose, onSubmit, align = "right" }) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState([]);
    const ref = useRef(null);

    useEffect(() => {
        if (open) setSelected([]);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handle = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [open, onClose]);

    if (!open) return null;

    const allSelected = selected.length === EXPORT_OPTIONS.length;

    return (
        <div
            ref={ref}
            className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2`}
        >
            <div className="max-h-72 overflow-y-auto px-2">
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer border-b border-slate-100 mb-1 pb-2">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => setSelected(allSelected ? [] : ALL_KEYS)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-400"
                    />
                    <span className="text-[13px] font-semibold text-slate-700">{t("ts_select_all")}</span>
                </label>

                {EXPORT_OPTIONS.map((opt) => (
                    <label
                        key={opt.key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(opt.key)}
                            onChange={() =>
                                setSelected((prev) =>
                                    prev.includes(opt.key)
                                        ? prev.filter((k) => k !== opt.key)
                                        : [...prev, opt.key]
                                )
                            }
                            className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-400"
                        />
                        <span className="text-[13px] text-slate-600">{opt.label}</span>
                    </label>
                ))}
            </div>

            <div className="px-2 pt-2 border-t border-slate-100 mt-1">
                <button
                    disabled={selected.length === 0}
                    onClick={() => { onSubmit(selected); onClose(); }}
                    className="w-full py-1.5 text-[12px] font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t("ts_submit")}
                </button>
            </div>
        </div>
    );
}

function ColumnToggleDropdown({ open, onClose, allColumns, visibleColumns, onToggle, onReset }) {
    const { t } = useTranslation();
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handle = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            ref={ref}
            className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2"
        >
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-700">{t("ts_show_hide_columns")}</span>
                <button onClick={onReset} className="text-[11px] text-blue-500 hover:text-blue-600 font-medium">
                    {t("ts_reset")}
                </button>
            </div>
            <div className="max-h-72 overflow-y-auto px-2 mt-1">
                {allColumns.map((col) => (
                    <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                        <input
                            type="checkbox"
                            checked={visibleColumns.includes(col.key)}
                            onChange={() => onToggle(col.key)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-400"
                        />
                        <span className="text-[13px] text-slate-600">{col.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

function TimesheetHeader({ onCsvExport, onPdfExport, exportLoading, allColumns, visibleColumns, onToggleColumn, onResetColumns }) {
    const { t } = useTranslation();
    const [showCsv, setShowCsv] = useState(false);
    const [showPdf, setShowPdf] = useState(false);
    const [showColumns, setShowColumns] = useState(false);

    const handleCsvToggle = useCallback(() => {
        setShowCsv((v) => !v);
        setShowPdf(false);
        setShowColumns(false);
    }, []);

    const handlePdfToggle = useCallback(() => {
        setShowPdf((v) => !v);
        setShowCsv(false);
        setShowColumns(false);
    }, []);

    const handleColumnsToggle = useCallback(() => {
        setShowColumns((v) => !v);
        setShowCsv(false);
        setShowPdf(false);
    }, []);

    return (
        <div className="flex items-start justify-between gap-4 mb-7">
            <div className="flex items-center gap-1">
                <div className="flex items-end gap-1 mr-2">
                    <img alt="timesheet" className="w-24 h-24" src={EmpTimesheetLogo} />
                </div>
                <div className="border-l-2 border-blue-500 pl-4">
                    <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                        <span className="font-semibold">{t("ts_timesheets")}</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
                        {t("ts_track_desc")}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {exportLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("ts_exporting")}
                    </div>
                )}

                {/* Column Visibility */}
                <div className="relative">
                    <Button
                        size="lg"
                        variant="outline"
                        className="rounded-lg px-4 text-xs font-semibold shadow-sm border-slate-200"
                        onClick={handleColumnsToggle}
                    >
                        <Columns3 className="w-4 h-4" />
                        {t("ts_columns")}
                    </Button>
                    <ColumnToggleDropdown
                        open={showColumns}
                        onClose={() => setShowColumns(false)}
                        allColumns={allColumns}
                        visibleColumns={visibleColumns}
                        onToggle={onToggleColumn}
                        onReset={onResetColumns}
                    />
                </div>

                {/* CSV */}
                <div className="relative">
                    <Button
                        size="lg"
                        className="rounded-lg bg-[#2598EB] hover:bg-[#2598EB]/90 px-5 text-xs font-semibold shadow-sm"
                        onClick={handleCsvToggle}
                        disabled={exportLoading}
                    >
                        <FaFileCsv className="w-4 h-4" />
                        CSV
                    </Button>
                    <ExportDropdown
                        open={showCsv}
                        onClose={() => setShowCsv(false)}
                        onSubmit={onCsvExport}
                    />
                </div>

                {/* PDF */}
                <div className="relative">
                    <Button
                        size="lg"
                        className="rounded-lg bg-[#8D85FF] hover:bg-[#8D85FF]/90 px-5 text-xs font-semibold shadow-sm"
                        onClick={handlePdfToggle}
                        disabled={exportLoading}
                    >
                        <BiSolidFilePdf className="size-5" />
                        PDF
                    </Button>
                    <ExportDropdown
                        open={showPdf}
                        onClose={() => setShowPdf(false)}
                        onSubmit={onPdfExport}
                    />
                </div>
            </div>
        </div>
    );
}

export default React.memo(TimesheetHeader);
