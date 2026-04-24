import React, { useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Download, Fullscreen } from "lucide-react";
import aiVideo from "@/assets/ai.webm";

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
}) => {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const rootRef = useRef(null);
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

  const handleMaximize = useCallback(async () => {
    if (onMaximize) return onMaximize();
    const target = findCardAncestor(rootRef.current);
    if (!target) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  }, [onMaximize]);

  const handleDownload = useCallback(async () => {
    if (onDownload) return onDownload();
    const target = findCardAncestor(rootRef.current);
    if (!target) return;
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(target, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slugify(title)}-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (err) {
      console.error("Card download failed:", err);
    }
  }, [onDownload, title]);

  return (
    <div ref={rootRef} className="flex flex-wrap items-center justify-between gap-3">
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
          title="Fullscreen"
          aria-label="Fullscreen"
          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <Fullscreen size={16} />
        </button>
      )}

      {showDownload && (
        <button
          type="button"
          onClick={handleDownload}
          title="Download as image"
          aria-label="Download as image"
          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <Download size={16} />
        </button>
      )}
    </div>
  );
};

export default Customreport;
