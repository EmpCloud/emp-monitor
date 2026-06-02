import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Usb,
  Info,
  Sparkles,
} from "lucide-react";
import empaiLogo from "@/assets/empai.png";
import { useDashboardStore } from "@/page/protected/admin/dashboard/dashboardStore";
import { buildInsightCards } from "./empAiInsights";
import "./EmpAi.css";

// EmpAi is rendered on both the admin and non-admin dashboards, which use
// separate Zustand stores with the same shape. Each dashboard injects its own
// store hook via the `useStore` prop; the admin store is the default so the
// existing `<EmpAi />` call sites keep working unchanged.

// Map an insight "tone" to the existing card colour palette so the visual
// design is unchanged from the original mockup.
const PALETTES = {
  good: { bg: "bg-[#E6FBF7]", bar: "bg-[#00CC9A]", text: "text-[#00CC9A]", iconBg: "bg-[#00CC9A]", divider: "bg-[#00CC9A]/30" },
  bad: { bg: "bg-[#FFEEEF]", bar: "bg-[#EB5958]", text: "text-[#EB5958]", iconBg: "bg-[#EB5958]", divider: "bg-[#EB5958]/30" },
  warn: { bg: "bg-[#FEF8E8]", bar: "bg-[#F2C84F]", text: "text-[#F2C84F]", iconBg: "bg-[#F2C84F]", divider: "bg-[#F2C84F]/30" },
  info: { bg: "bg-[#ECEDFE]", bar: "bg-[#5458F4]", text: "text-[#5458F4]", iconBg: "bg-[#5458F4]", divider: "bg-[#5458F4]/30" },
};

const ICONS = {
  "trend-up": TrendingUp,
  "trend-down": TrendingDown,
  alert: AlertTriangle,
  users: Users,
  usb: Usb,
  info: Info,
};

const MORPH_MS = 320;

const EmpAi = ({ useStore = useDashboardStore, onOpenInsight }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Pull the slices the insight engine needs. Subscribing to each slice keeps
  // re-renders tight and avoids recomputing on unrelated store changes.
  const statsLists = useStore((s) => s.statsLists);
  const activityBreakdown = useStore((s) => s.activityBreakdown);
  const productiveEmployees = useStore((s) => s.productiveEmployees);
  const unproductiveEmployees = useStore((s) => s.unproductiveEmployees);
  const nonActiveEmployees = useStore((s) => s.nonActiveEmployees);
  const activeEmployees = useStore((s) => s.activeEmployees);
  const locationPerformance = useStore((s) => s.locationPerformance);
  const departmentPerformance = useStore((s) => s.departmentPerformance);
  const webUsage = useStore((s) => s.webUsage);
  const appUsage = useStore((s) => s.appUsage);
  const loading = useStore((s) => s.loading);

  const cards = useMemo(
    () =>
      buildInsightCards({
        statsLists,
        activityBreakdown,
        productiveEmployees,
        unproductiveEmployees,
        nonActiveEmployees,
        activeEmployees,
        locationPerformance,
        departmentPerformance,
        webUsage,
        appUsage,
      }, 12),
    [statsLists, activityBreakdown, productiveEmployees, unproductiveEmployees, nonActiveEmployees, activeEmployees, locationPerformance, departmentPerformance, webUsage, appUsage],
  );

  return (
    <div className="h-full">
      <div className="relative bg-white rounded-[21px] shadow-sm border border-slate-100 h-full overflow-hidden">

        {/* Sky-blue header backdrop — grows from 0 height into view */}
        <div
          className={`absolute inset-x-0 top-0 bg-[#E9F6FF] transition-[height,opacity] duration-300 ease-out
            ${expanded ? "h-21 opacity-100" : "h-0 opacity-0"}`}
        />

        {/* Click layer:
            collapsed → covers whole panel, opens it
            expanded  → covers only the header strip, closes it back */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Back" : "Open EMP AI"}
          className={`absolute inset-x-0 top-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-300
            ${expanded ? "h-22 z-20" : "h-full z-30 rounded-[21px]"}`}
        />

        {/* The SAME logo image — morphs from centered/large to top-left/small */}
        <img
          src={empaiLogo}
          alt=""
          className={`absolute object-contain z-10 transition-all duration-300 ease-out
            ${expanded
              ? "top-4 left-4 w-14 h-14"
              : "top-[calc(50%-75px)] left-1/2 -translate-x-1/2 w-24 h-24"
            }`}
        />

        {/* The SAME text — morphs position + size to sit beside the small logo */}
        <div
          className={`absolute z-10 transition-all duration-300 ease-out
            ${expanded
              ? "top-5 left-19.5 right-4 text-left"
              : "top-[calc(50%+37px)] inset-x-0 text-center"
            }`}
        >
          <h2
            className={`font-semibold text-black transition-all duration-300 ease-out
              ${expanded ? "text-base sm:text-lg leading-tight truncate" : "2xl:text-xl"}`}
          >
            {t("askEmpAiAssistant")}
          </h2>
          <p
            className={`text-xs transition-all duration-300 ease-out
              ${expanded ? "text-black/70 mt-0.5 truncate" : "text-black/80"}`}
          >
            {t("readyToAssist")}
          </p>
        </div>

        {/* Insight cards — mounted only when expanded; each notifies-in with stagger */}
        {expanded && (
          <div className="absolute inset-x-0 bottom-0 top-22 overflow-y-auto overflow-x-hidden px-3 pt-2 pb-3 space-y-3">
            {cards.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
                <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center mb-3">
                  <Sparkles className="size-5 text-sky-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {loading ? "Analyzing today's activity…" : "No insights yet"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  {loading
                    ? "Hang tight while EMP AI reviews your team's data."
                    : "Insights appear here once there's enough activity data for today."}
                </p>
              </div>
            ) : (
              cards.map((card, idx) => {
                const palette = PALETTES[card.tone] ?? PALETTES.info;
                const Icon = ICONS[card.icon] ?? Info;
                const clickable = Boolean(card.modal && onOpenInsight);
                const open = () => onOpenInsight?.(card);
                return (
                  <div
                    key={card.id}
                    onClick={clickable ? open : undefined}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              open();
                            }
                          }
                        : undefined
                    }
                    style={{ animationDelay: `${MORPH_MS - 120 + idx * 60}ms` }}
                    className={`${palette.bg} empai-card empai-notif-in rounded-[6px] flex items-stretch overflow-hidden ${
                      clickable ? "cursor-pointer hover:brightness-[0.98] transition" : ""
                    }`}
                  >
                    <div className={`min-w-1.5 my-[1px] ${palette.bar} rounded-full`} />
                    <div className="flex-1 min-w-0 flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-semibold ${palette.text}`}>
                          {card.title}
                        </h3>
                        <p className="text-[11px] leading-snug text-slate-600 mt-1 line-clamp-2">
                          {card.desc}
                        </p>
                      </div>
                      <div className={`w-px self-stretch ${palette.divider}`} />
                      <div
                        className={`${palette.iconBg} relative shrink-0 w-11 h-11 rounded-lg
                                    flex items-center justify-center text-white shadow-sm`}
                      >
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/40" />
                        <Icon className="size-5" strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmpAi;
