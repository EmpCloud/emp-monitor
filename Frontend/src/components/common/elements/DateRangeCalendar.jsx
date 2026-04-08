import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Format Date to YYYY-MM-DD */
const fmt = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Parse YYYY-MM-DD to Date */
const parse = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Check if two dates are same day */
const sameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Check if date is between start and end */
const isBetween = (d, start, end) => {
  if (!start || !end) return false;
  const t = d.getTime();
  return t > start.getTime() && t < end.getTime();
};

/** Get calendar grid for a month (6 rows x 7 cols) */
function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  // Monday = 0 ... Sunday = 6
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];

  // Previous month trailing days
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, current: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, current: true, date: new Date(year, month, i) });
  }

  // Next month leading days
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, current: false, date: new Date(year, month + 1, i) });
  }

  return days;
}

/**
 * DateRangeCalendar — Shared date range picker with calendar dropdown.
 *
 * Props:
 *   startDate: string "YYYY-MM-DD"
 *   endDate: string "YYYY-MM-DD"
 *   onChange: (startDate, endDate) => void
 *   maxDate?: Date (default: today)
 *   placeholder?: string
 */
export default function DateRangeCalendar({
  startDate,
  endDate,
  onChange,
  maxDate,
  placeholder = "Select date range",
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const d = parse(startDate) || new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parse(startDate) || new Date();
    return d.getMonth();
  });
  const [rangeStart, setRangeStart] = useState(() => parse(startDate));
  const [rangeEnd, setRangeEnd] = useState(() => parse(endDate));
  const [hovered, setHovered] = useState(null);
  const ref = useRef(null);

  const max = maxDate || new Date();
  const today = new Date();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ref to track if change is internal (user click) vs external (prop sync)
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync external props — only if they actually differ from current state
  useEffect(() => {
    const newStart = parse(startDate);
    const newEnd = parse(endDate);
    if (!sameDay(newStart, rangeStart)) setRangeStart(newStart);
    if (!sameDay(newEnd, rangeEnd)) setRangeEnd(newEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayClick = useCallback((date) => {
    if (date > max) return;

    // If no start or both selected → start new selection
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }

    // If start selected, pick end — notify parent immediately
    let newStart = rangeStart;
    let newEnd = date;
    if (date < rangeStart) {
      newStart = date;
      newEnd = rangeStart;
    }
    setRangeStart(newStart);
    setRangeEnd(newEnd);
    onChangeRef.current?.(fmt(newStart), fmt(newEnd));
  }, [rangeStart, rangeEnd, max]);

  // Double-tap: select single date as both start and end
  const handleDoubleClick = useCallback((date) => {
    if (date > max) return;
    setRangeStart(date);
    setRangeEnd(date);
    onChangeRef.current?.(fmt(date), fmt(date));
    setOpen(false);
  }, [max]);

  const handleReset = () => {
    setRangeStart(null);
    setRangeEnd(null);
    onChangeRef.current?.("", "");
  };

  const days = getCalendarDays(viewYear, viewMonth);

  // Display text
  const displayText = rangeStart
    ? rangeEnd
      ? `${fmt(rangeStart)} — ${fmt(rangeEnd)}`
      : fmt(rangeStart)
    : placeholder;

  // Determine if a date is in the selection/hover range
  const getDateState = (date, isCurrent) => {
    const isDisabled = date > max || !isCurrent;
    const isStart = rangeStart && sameDay(date, rangeStart);
    const isEnd = rangeEnd && sameDay(date, rangeEnd);
    const isInRange = rangeStart && rangeEnd
      ? isBetween(date, rangeStart, rangeEnd)
      : rangeStart && !rangeEnd && hovered
        ? isBetween(date, rangeStart, hovered) || isBetween(date, hovered, rangeStart)
        : false;
    const isToday = sameDay(date, today);

    return { isDisabled, isStart, isEnd, isInRange, isToday };
  };

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 h-10 text-xs text-slate-600 bg-white hover:border-slate-300 transition-colors min-w-[220px]"
      >
        <Calendar size={14} className="text-slate-400 shrink-0" />
        <span className={rangeStart ? "text-slate-700 font-medium" : "text-slate-400"}>{displayText}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-[280px] select-none">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-800">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day header */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-semibold text-slate-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map(({ day, current, date }, i) => {
              const { isDisabled, isStart, isEnd, isInRange, isToday } = getDateState(date, current);

              return (
                <button
                  type="button"
                  key={i}
                  disabled={isDisabled}
                  onClick={() => handleDayClick(date)}
                  onDoubleClick={() => handleDoubleClick(date)}
                  onMouseEnter={() => setHovered(date)}
                  onMouseLeave={() => setHovered(null)}
                  className={`
                    relative w-full aspect-square flex items-center justify-center text-[12px] transition-all rounded-full
                    ${!current ? "text-slate-300" : ""}
                    ${isDisabled ? "text-slate-300 cursor-default" : "cursor-pointer hover:bg-slate-100"}
                    ${isInRange && !isDisabled ? "bg-slate-200/60" : ""}
                    ${(isStart || isEnd) && !isDisabled ? "bg-slate-800 text-white font-bold hover:bg-slate-700" : ""}
                    ${isToday && !isStart && !isEnd ? "font-bold text-slate-800 ring-1 ring-slate-300" : ""}
                    ${current && !isStart && !isEnd && !isInRange && !isDisabled ? "text-slate-700" : ""}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 leading-tight">
              {t("cal_double_tap_hint")}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="h-8 px-4 border border-slate-300 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {t("ts_reset")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
