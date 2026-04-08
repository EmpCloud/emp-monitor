import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, ChevronRight, ChevronLeft, Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import CustomSelect from "@/components/common/elements/CustomSelect";
import PaginationComponent from "@/components/common/Pagination";
import "@/components/common/employee-details/emp.css";
import { fetchScreenshots } from "./service";
import moment from "moment";

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const v = `${String(i).padStart(2, "0")}:00`;
  return { label: v, value: v };
});

function ScreenshotCard({ ss, onClick }) {
  const { t } = useTranslation();
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-[4/3] bg-gradient-to-br from-[#1a237e] to-[#0d47a1] flex items-center justify-center relative overflow-hidden">
        {ss.link ? (
          <img
            src={ss.link}
            alt={ss.name ?? "screenshot"}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-1.5 grid grid-cols-2 gap-[3px]">
              <div className="bg-white/80 rounded-sm" />
              <div className="bg-white/80 rounded-sm" />
              <div className="bg-white/80 rounded-sm" />
              <div className="bg-white/80 rounded-sm" />
            </div>
            <p className="text-white/90 text-[11px] font-semibold">{t("noPreview")}</p>
          </div>
        )}
      </div>
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-[9px] text-red-400 leading-tight truncate font-medium">
          {ss.name ?? "Screenshot"}
        </p>
        {ss.url && (
          <p className="text-[9px] text-blue-500 leading-tight break-all hover:underline">
            {ss.url}
          </p>
        )}
      </div>
    </div>
  );
}

function TimeSlotSection({ bucket, onScreenshotClick }) {
  const { t } = useTranslation();
  const h = Number(bucket.t ?? 0);
  const hour = String(h).padStart(2, "0");
  const nextHour = String(h + 1).padStart(2, "0");
  const range = `${hour}:00 - ${nextHour}:00`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5">
        <span className="text-sm font-medium text-gray-700">{range}</span>
        <button className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {(bucket.s ?? []).map((ss, i) => (
          <div key={ss.name ?? i} className="min-w-[180px] max-w-[220px] shrink-0">
            <ScreenshotCard ss={ss} onClick={() => onScreenshotClick(ss)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenshotModal({ open, onOpenChange, screenshot, allScreenshots }) {
  const { t } = useTranslation();
  const currentIndex = useMemo(() => {
    if (!screenshot) return -1;
    return allScreenshots.findIndex((s) => s.name === screenshot.name && s.link === screenshot.link);
  }, [screenshot, allScreenshots]);

  const [activeIndex, setActiveIndex] = useState(currentIndex);

  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  const activeSS = allScreenshots[activeIndex] ?? screenshot;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < allScreenshots.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) setActiveIndex((i) => i - 1);
  }, [hasPrev]);

  const goNext = useCallback(() => {
    if (hasNext) setActiveIndex((i) => i + 1);
  }, [hasNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, goPrev, goNext]);

  if (!activeSS) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[85vw] w-fit lg:max-w-[75vw] max-h-[90vh] rounded-2xl p-0 border-0 shadow-2xl overflow-hidden gap-0 [&>button:last-child]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/80">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {activeSS.name ?? "Screenshot"}
            </p>
            <p className="text-xs text-gray-400">
              {activeIndex + 1} of {allScreenshots.length}
            </p>
          </div>
          <DialogClose className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </DialogClose>
        </div>

        {/* Image area - full view */}
        <div className="flex items-center justify-center bg-gray-950">
          {activeSS.link ? (
            <img
              src={activeSS.link}
              alt={activeSS.name ?? "screenshot"}
              className="w-full max-h-[78vh] object-contain"
            />
          ) : (
            <div className="text-center py-20">
              <p className="text-white/60 text-sm">{t("noPreviewAvailable")}</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <p className="text-[11px] text-gray-500 truncate">
            {activeSS.name ?? ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={!hasPrev}
              className="h-8 px-3 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft size={14} /> {t("prev")}
            </button>
            <button
              onClick={goNext}
              disabled={!hasNext}
              className="h-8 px-3 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {t("next")} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ScreenshotsTab({ employee }) {
  const { t } = useTranslation();
  const [date, setDate]         = useState(moment().format("YYYY-MM-DD"));
  const [fromTime, setFromTime] = useState("00:00");
  const [toTime, setToTime]     = useState("23:00");
  const [buckets, setBuckets]   = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSS, setSelectedSS] = useState(null);

  // Flatten all screenshots for prev/next navigation
  const allScreenshots = useMemo(() => {
    return buckets.flatMap((b) => b.s ?? []);
  }, [buckets]);

  const handleScreenshotClick = (ss) => {
    setSelectedSS(ss);
    setModalOpen(true);
  };

  const load = async () => {
    if (!employee?.id) return;
    setLoading(true);
    const res = await fetchScreenshots(employee.id, date, fromTime, toTime);
    const raw = Array.isArray(res?.data?.screenshot)
      ? res.data.screenshot.filter((b) => Array.isArray(b.s) && b.s.length > 0)
      : [];
    setBuckets(raw);
    setTotalCount(raw.reduce((sum, b) => sum + (b.s?.length ?? 0), 0));
    setCurrentPage(1);
    setLoading(false);
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("selectDate")}</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="date"
              value={date}
              max={moment().format("YYYY-MM-DD")}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 h-11 rounded-xl border-gray-200 text-sm w-full"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("frmTime")}</label>
          <CustomSelect placeholder={t("from")} items={timeOptions} selected={fromTime} onChange={setFromTime} width />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">{t("toTime")}</label>
          <CustomSelect placeholder={t("to")} items={timeOptions} selected={toTime} onChange={setToTime} width />
        </div>
        <Button
          onClick={load}
          disabled={loading}
          className="h-9 px-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold gap-2 w-full sm:w-auto"
        >
          <Search size={15} />
          {loading ? `${t("search")}…` : t("search")}
        </Button>
      </div>

      {/* Buckets */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm text-gray-400">{t("loadingScreenshots")}</span>
        </div>
      ) : buckets.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm text-gray-400 italic">{t("noScreenshotsFound")}</span>
        </div>
      ) : (
        buckets.map((bucket, i) => (
          <TimeSlotSection key={bucket.t ?? i} bucket={bucket} onScreenshotClick={handleScreenshotClick} />
        ))
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-2">
        <p className="text-[13px] text-gray-500">
          {t("total")} <span className="font-bold text-blue-600">{totalCount}</span> {t("totalScreenshots")}
        </p>
        <PaginationComponent
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(buckets.length / 10))}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Screenshot Lightbox Modal */}
      <ScreenshotModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        screenshot={selectedSS}
        allScreenshots={allScreenshots}
      />
    </div>
  );
}
