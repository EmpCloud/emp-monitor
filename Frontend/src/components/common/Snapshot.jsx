import { useEffect, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
// import snapemp from "@/assets/snap.png";

const SEGMENTS = [
  { label: "Idle Time", value: 18 },
  { label: "Active Time", value: 20 },
  { label: "Productive Time", value: 15 },
  { label: "Non-Productive Time", value: 12 },
  { label: "Neutral Time", value: 12 },
];

const LEGEND_ITEMS = [
  { label: "Idle Time", color: "#5bc8f5" },
  { label: "Active Time", color: "#9dc940" },
  { label: "Productive Time", color: "#8b5cf6" },
  { label: "Non-Productive Time", color: "#f08080" },
  { label: "Neutral Time", color: "#b3adad" },      
];

const colorMap = {
  "Idle Time": am5.color("#5bc8f5"),
  "Active Time": am5.color("#9dc940"),
  "Productive Time": am5.color("#8b5cf6"),
  "Non-Productive Time": am5.color("#f08080"),
  "Neutral Time": am5.color("#b3adad"),
};

import Customreport from "../../components/common/elements/Customreport";

export default function ActivitySnapshot({ data }) {
  const chartRef = useRef(null);

  useEffect(() => {
    const hasData =
      Array.isArray(data) && data.some((item) => Number(item?.value || 0) > 0);

    if (!chartRef.current || !hasData) return;

    const root = am5.Root.new(chartRef.current);

    // Hide amCharts logo
    if (root._logo) root._logo.dispose();
    root.tooltipContainer.set("zIndex", 1000);

    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        innerRadius: am5.percent(72),
        layout: root.verticalLayout,
      }),
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: "value",
        categoryField: "label",
        fillField: "color",
      }),
    );

    // Rounded, gapped slices matching design
    series.slices.template.setAll({
      cornerRadiusTL: 8,
      cornerRadiusTR: 8,
      cornerRadiusBL: 8,
      cornerRadiusBR: 8,
      strokeWidth: 6,
      stroke: am5.color("#ffffff"),
      tooltipText: "{category}: {value}",
      
    });

    series.labels.template.set("visible", false);
    series.ticks.template.set("visible", false);

    series.slices.template.adapters.add("fill", (fill, target) => {
      const cat = target.dataItem?.get("category");
      return colorMap[cat] || fill;
    });

    series.slices.template.adapters.add("stroke", () => am5.color("#ffffff"));

    series.data.setAll(data);
    series.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [data]);

  return (
    <>
      <div className="bg-white flex flex-col rounded-[21px] shadow-md w-full h-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-900 font-semibold text-xl sm:text-2xl">
            Today Activity Snapshot
          </h2>
          <Customreport showMaximize={true} showDownload={true} />
        </div>

        {/* Chart + Legend */}
        <div className="flex flex-col sm:flex-row items-center flex-1 gap-6 flex-wrap">
          {/* Chart / Empty State */}
          <div className="relative flex-1 w-full h-full" style={{  }}>
            {Array.isArray(data) && data.some((item) => Number(item?.value || 0) > 0) ? (
              <div ref={chartRef} className="w-full min-w-50 min-h-50 flex-1 h-full" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center text-slate-400">
                <div className="text-3xl mb-2">📊</div>
                <p className="text-sm font-semibold text-slate-600">No Activity Data</p>
                <p className="text-xs text-slate-400 mt-1">
                  No employee activity recorded for the selected date.
                </p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="2xl:flex w-fit flex-col gap-4 flex-1 hidden ">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: `0 0 6px ${item.color}80`,
                  }}
                />
                <span className="text-slate-600 text-sm font-medium">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
