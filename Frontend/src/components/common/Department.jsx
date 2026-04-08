import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

import { MapPin } from "lucide-react";
import Customreport from "../../components/common/elements/Customreport";

function AmChartsPieChart({ data }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const root = am5.Root.new(chartRef.current);
    // Hide amCharts logo
    if (root._logo) root._logo.dispose();

    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        layout: root.verticalLayout,
        innerRadius: am5.percent(50),
      })
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: "value",
        categoryField: "category",
        alignLabels: false,
      })
    );

    series.labels.template.setAll({
      textType: "circular",
      centerX: 0,
      centerY: 0,
      fontSize: 10,
    });

    series.slices.template.setAll({
      stroke: am5.color(0xffffff),
      strokeWidth: 2,
      tooltipText: "{category}: {value}%",
    });

    series.data.setAll(data);

    series.appear(1000, 100);
    chart.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
        {/* No data - translated in parent */}
      </div>
    );
  }

  return <div ref={chartRef} className="w-full h-full" />;
}

export default function DepartmentPerformance({
  title,
  data = { pieData: [], rows: [] },
  loading = false,
  report,
  filter,
}) {
  const { t } = useTranslation();
  const resolvedTitle = title || t("deptPerform");
  const pieData = data?.pieData || [];
  const rows = data?.rows || [];

  return (
    <div className="bg-white rounded-[21px] shadow-sm border border-slate-100 w-full h-full p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-slate-900 font-semibold text-xl sm:text-2xl">
          {resolvedTitle}
        </h2>
        {report}
      </div>

      {/* Tabs + Filter */}
      {filter && <div className="mb-5">{filter}</div>}

      {/* Chart + List */}
      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        {/* Pie Chart */}
        <div className="2xl:w-56 w-46 h-46 shrink-0">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              {t("loadingText")}
            </div>
          ) : (
            <AmChartsPieChart data={pieData} />
          )}
        </div>

        {/* List */}
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-slate-500 text-xs font-medium">
              {t("department")}
            </span>
            <span className="text-slate-500 text-xs font-medium">
              {t("timeHoursLabel")}
            </span>
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              {t("loadingText")}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              {t("noDataAvailable")}
            </div>
          ) : (
            <div className="divide-y divide-dashed divide-slate-200">
              {rows.map((item, i) => (
                <div
                  key={`${item._id || item.name}-${i}`}
                  className="flex items-center justify-between py-3.5 px-1 hover:bg-slate-50/60 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin size={16} className="text-blue-500 shrink-0" />
                    <span className="text-slate-700 font-medium text-sm">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-blue-500 font-semibold text-sm">
                    {item.hours}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
