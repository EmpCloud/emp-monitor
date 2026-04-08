import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import CustomTab from "../../components/common/elements/CustomTab";

const fallbackData = {
  today: [
    { name: "Windows Explorer ", value: 99.4, color: "#6366f1" },
    { name: "Google Chrome ", value: 0.6, color: "#818cf8" },
    { name: "Desktop Window ", value: 0.0, color: "#c7d2fe" },
    { name: "Empmonitor - 00 ", value: 0.0, color: "#e0e7ff" },
  ],
  yesterday: [
    { name: "Windows Explorer ", value: 87.2, color: "#6366f1" },
    { name: "Google Chrome ", value: 9.3, color: "#818cf8" },
    { name: "Desktop Window ", value: 2.1, color: "#c7d2fe" },
    { name: "Empmonitor - 00 ", value: 1.4, color: "#e0e7ff" },
  ],
  thisWeek: [
    { name: "Windows Explorer ", value: 72.5, color: "#6366f1" },
    { name: "Google Chrome ", value: 18.4, color: "#818cf8" },
    { name: "Desktop Window ", value: 6.7, color: "#c7d2fe" },
    { name: "Empmonitor - 00 ", value: 2.4, color: "#e0e7ff" },
  ],
};

export default function AppUsageChart({
  data,
  title,
  report
}) {
  const { t } = useTranslation();
  const resolvedTitle = title || t("topTenAppUsage");
  const chartRef = useRef(null);
  const rootRef = useRef(null);
  const seriesRef = useRef(null);
  const [activeTab, setActiveTab] = useState("today");

  // Keys are aligned with CustomTab values: "today", "yesterday", "thisweek"
  const chartData = {
    today: data?.today?.length ? data.today : fallbackData.today,
    yesterday: data?.yesterday?.length ? data.yesterday : fallbackData.yesterday,
    thisweek: data?.thisWeek?.length ? data.thisWeek : fallbackData.thisWeek,
  };

  useEffect(() => {
    // Clean up previous root to prevent duplicates
    if (rootRef.current) {
      rootRef.current.dispose();
    }

    const root = am5.Root.new(chartRef.current);
    if (root._logo) root._logo.dispose();

    rootRef.current = root;
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        innerRadius: am5.percent(70),
      }),
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: "value",
        categoryField: "name",
        fillField: "color",
      }),
    );

    series.slices.template.setAll({
      strokeWidth: 3,
      stroke: am5.color(0xffffff),
      cornerRadiusTL: 3,
      cornerRadiusTR: 3,
      cornerRadiusBL: 3,
      cornerRadiusBR: 3,
      tooltipText: "{category}: {value}%",
    });

    series.slices.template.adapters.add("tooltipText", (text, target) => {
      const dataItem = target.dataItem;
      if (dataItem) {
        const name = dataItem.get("category") || "";
        const truncated = name.length > 20 ? name.slice(0, 20) + "..." : name;
        const val = dataItem.get("value") || 0;
        return `${truncated}: ${val}%`;
      }
      return text;
    });

    series.slices.template.states.create("hover", { scale: 1.04 });
    series.labels.template.set("visible", false);
    series.ticks.template.set("visible", false);

    root.container.children.push(
      am5.Label.new(root, {
        text: t("application"),
        fontSize: 13,
        fontWeight: "500",
        fill: am5.color(0x6b7280),
        x: am5.percent(50),
        y: am5.percent(50),
        centerX: am5.percent(50),
        centerY: am5.percent(50),
        textAlign: "center",
      }),
    );

    seriesRef.current = series;

    // Initial data load
    series.data.setAll(
      chartData.today.map((d) => ({
        name: d.name,
        value: d.value === 0 ? 0.001 : d.value,
        color: am5.color(d.color),
      })),
    );
    series.appear(1000);

    return () => {
      root.dispose();
      rootRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    if (!seriesRef.current) return;

    const current = chartData[activeTab] || [];

    seriesRef.current.data.setAll(
      current.map((d) => ({
        name: d.name,
        value: d.value === 0 ? 0.001 : d.value,
        color: am5.color(d.color),
      })),
    );
  }, [activeTab, chartData.today, chartData.yesterday, chartData.thisweek]);

  const currentData = chartData[activeTab] || [];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 w-full h-full p-5 sm:p-7 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-slate-900 font-bold text-xl sm:text-2xl tracking-tight">
            {resolvedTitle}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-medium text-slate-400">
              {t("fromDateRange")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {report}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-wrap sm:flex-row gap-6 items-center sm:items-start">
        {/* Donut Chart */}
        <div className="shrink-0 w-full 2xl:w-auto flex justify-center">
          <div
            ref={chartRef}
            className="w-48 h-48 sm:w-56 sm:h-56 lg:w-60 lg:h-60"
          />
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col gap-4 w-full sm:items-end items-stretch">
          {/* Tabs */}
          <div className="w-full sm:w-auto flex justify-center sm:justify-end">
            <CustomTab onChange={setActiveTab} value={activeTab} />
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-3 mt-1 w-full">
            {currentData.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex gap-2 items-center min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600 truncate">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-800 tabular-nums shrink-0">
                  {item.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
