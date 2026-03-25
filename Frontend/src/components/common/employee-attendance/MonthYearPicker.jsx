import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const MONTH_NAMES  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** Convert YYYYMM number → { year, month 0-indexed } */
const fromValue = (v) => {
  const s = String(v ?? "");
  return s.length === 6
    ? { year: parseInt(s.slice(0, 4), 10), month: parseInt(s.slice(4, 6), 10) - 1 }
    : { year: new Date().getFullYear(), month: new Date().getMonth() };
};

/** Convert { year, month 0-indexed } → YYYYMM number */
const toValue = (year, month) =>
  Number(`${year}${String(month + 1).padStart(2, "0")}`);

/**
 * Month / Year picker.
 *
 * Props:
 *   value      – YYYYMM number (e.g. 202603)
 *   onChange   – (YYYYMM: number) => void
 *   maxMonths  – how many past months are selectable (default 6, matches Laravel minDate: '-180d')
 */
const MonthYearPicker = ({ value, onChange, maxMonths = 6 }) => {
  const { year: initYear, month: initMonth } = fromValue(value);

  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(initYear);
  const wrapRef = useRef(null);

  // Sync viewYear if value changes from outside
  useEffect(() => {
    setViewYear(fromValue(value).year);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const now        = new Date();
  const nowYear    = now.getFullYear();
  const nowMonth   = now.getMonth();          // 0-indexed

  // Earliest selectable month
  const minDate    = new Date(nowYear, nowMonth - (maxMonths - 1), 1);
  const minYear    = minDate.getFullYear();
  const minMonth   = minDate.getMonth();      // 0-indexed

  const isDisabled = (yr, mo) =>
    toValue(yr, mo) > toValue(nowYear, nowMonth) ||
    toValue(yr, mo) < toValue(minYear, minMonth);

  const isSelected = (yr, mo) => yr === initYear && mo === initMonth;

  const select = (yr, mo) => {
    if (isDisabled(yr, mo)) return;
    onChange(toValue(yr, mo));
    setOpen(false);
  };

  const label = value
    ? `${MONTH_NAMES[initMonth]}/${initYear}`
    : "Select month";

  return (
    <div ref={wrapRef} className="relative">

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50/40 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-[130px]"
      >
        <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 w-64 select-none">

          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              disabled={viewYear <= minYear}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>

            <span className="text-sm font-bold text-slate-800">{viewYear}</span>

            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              disabled={viewYear >= nowYear}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Month grid — 3 columns × 4 rows */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, mo) => {
              const disabled = isDisabled(viewYear, mo);
              const selected = isSelected(viewYear, mo);
              return (
                <button
                  key={mo}
                  type="button"
                  disabled={disabled}
                  onClick={() => select(viewYear, mo)}
                  title={`${MONTH_FULL[mo]} ${viewYear}`}
                  className={[
                    "rounded-xl py-1.5 text-xs font-semibold transition-colors focus:outline-none",
                    selected
                      ? "bg-blue-500 text-white shadow-sm"
                      : disabled
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-600",
                  ].join(" ")}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthYearPicker;
