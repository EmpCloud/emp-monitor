import React, { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Fullscreen } from "lucide-react";
import aiVideo from "@/assets/ai.webm";



const Customreport = ({
  title ="",
  showShield = false,
  showButton = false,
  buttonText = "View Report",
  showMaximize = false,
  showDownload = false,
  onViewReport,
  onAiClick,
}) => {
  const videoRef = useRef(null);

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

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
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
          {buttonText}
        </Button>
      )}

      {showMaximize && (
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <Fullscreen size={16} />
        </button>
      )}

      {showDownload && (
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <Download size={16} />
        </button>
      )}
    </div>
  );
};

export default Customreport;
