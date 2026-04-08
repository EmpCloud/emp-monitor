import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import CustomTab from "../../components/common/elements/CustomTab";

const fallbackData = {
  today: [

  ],
  yesterday: [

  ],
  thisWeek: [

  ],
};

export default function WebUsageChart({
  data,
  title,
  report
}) {
  const { t } = useTranslation();
  const resolvedTitle = title || t("topTenWebUsage");
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
        text: t("website"),
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
    <div className="bg-white rounded-[21px] shadow-sm border border-slate-100 w-full h-full p-5 sm:p-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-slate-900 font-semibold text-xl sm:text-2xl">
            {resolvedTitle}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{t("fromDateRange")}</p>
        </div>

        {report}
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
