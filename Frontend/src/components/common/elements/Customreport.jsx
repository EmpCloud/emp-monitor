import React, { useRef, useCallback, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Download, Fullscreen, Minimize2 } from "lucide-react";
import aiVideo from "@/assets/ai.webm";
import { generateModulePdf } from "@/utils/dashboardPdfExport";

/**
 * Walk up the DOM from `start` to the nearest card-looking ancestor
 * (has a `rounded-*` class alongside `shadow-*` or `border`). Falls back
 * to the immediate parent if nothing matches.
 */
const findCardAncestor = (start) => {
  let el = start?.parentElement;
  while (el && el !== document.body) {
    const cls = typeof el.className === "string" ? el.className : "";
    if (cls && /\brounded/.test(cls) && /\b(shadow|border)/.test(cls)) {
      return el;
    }
    el = el.parentElement;
  }
  return start?.parentElement ?? null;
};

const slugify = (s) =>
  (s || "dashboard").toString().trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const Customreport = ({
  title = "",
  showShield = false,
  showButton = false,
  buttonText,
  showMaximize = false,
  showDownload = false,
  onViewReport,
  onAiClick,
  onMaximize,
  onDownload,
  pdfTitle,
  pdfSubtitle,
  pdfData,
  pdfColumns,
  pdfMeta,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const rootRef = useRef(null);
  const fsTargetRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const resolvedButtonText = buttonText || t("viewReport");

  const handleVideoMouseEnter = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = 0.6;
    el.play().catch(() => {});
  }, []);

  const handleVideoMouseLeave = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }, []);

  // Exit fullscreen on ESC and clean up on unmount
  useEffect(() => {
    if (!isFullscreen) {
      document.body.classList.remove("has-emp-fullscreen");
      return;
    }
    document.body.classList.add("has-emp-fullscreen");
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        fsTargetRef.current?.classList.remove("emp-fullscreen");
        setIsFullscreen(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = original;
      document.body.classList.remove("has-emp-fullscreen");
    };
  }, [isFullscreen]);

  useEffect(() => () => {
    // safety: if unmounted while fullscreen, clean up the class
    fsTargetRef.current?.classList.remove("emp-fullscreen");
    document.body.classList.remove("has-emp-fullscreen");
  }, []);

  const handleMaximize = useCallback(() => {
    if (onMaximize) return onMaximize();
    const target = findCardAncestor(rootRef.current);
    if (!target) return;
    fsTargetRef.current = target;
    if (target.classList.contains("emp-fullscreen")) {
      target.classList.remove("emp-fullscreen");
      setIsFullscreen(false);
    } else {
      target.classList.add("emp-fullscreen");
      setIsFullscreen(true);
    }
  }, [onMaximize]);

  const handleDownload = useCallback(async () => {
    if (onDownload) return onDownload();
    const target = findCardAncestor(rootRef.current);
    if (!target) return;
    try {
      await generateModulePdf({
        title: pdfTitle || title || "Dashboard Report",
        subtitle: pdfSubtitle,
        target,
        data: pdfData,
        columns: pdfColumns,
        meta: pdfMeta,
        fileName: `${slugify(pdfTitle || title)}-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  }, [onDownload, title, pdfTitle, pdfSubtitle, pdfData, pdfColumns, pdfMeta]);

  return (
    <div ref={rootRef} className="emp-pdf-hide-on-capture flex flex-wrap items-center justify-between gap-3">
      {showShield && (
        <div
          className="w-12 h-12 flex items-center justify-center shrink-0 cursor-pointer"
          onMouseEnter={handleVideoMouseEnter}
          onMouseLeave={handleVideoMouseLeave}
          onClick={onAiClick}
        >
          <video
            ref={videoRef}
            src={aiVideo}
            loop
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {showButton && (
        <Button
          variant="outline"
          className="text-blue-500 border-blue-200 hover:bg-blue-50 font-semibold rounded-lg px-4 text-sm h-9"
          onClick={onViewReport}
        >
          {resolvedButtonText}
        </Button>
      )}

      {showMaximize && (
        <button
          type="button"
          onClick={handleMaximize}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="emp-pdf-hide-on-capture text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Fullscreen size={16} />}
        </button>
      )}

      {showDownload && (
        <button
          type="button"
          onClick={handleDownload}
          title="Download as PDF"
          aria-label="Download as PDF"
          className="emp-pdf-hide-on-capture text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <Download size={16} />
        </button>
      )}
    </div>
  );
};

export default Customreport;
