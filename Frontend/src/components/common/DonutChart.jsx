import { useEffect, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

/**
 * Reusable amCharts5 donut chart.
 * data: Array<{ name: string, value: number, color: string, rawSeconds?: number }>
 */
export default function DonutChart({ data }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const root = am5.Root.new(chartRef.current);
    if (root._logo) root._logo.dispose();
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, { innerRadius: am5.percent(65) })
    );
    const series = chart.series.push(
      am5percent.PieSeries.new(root, { valueField: "value", categoryField: "name", fillField: "color" })
    );
    series.slices.template.setAll({ strokeWidth: 3, stroke: am5.color(0xffffff), tooltipText: "{category}: {value}%" });
    series.labels.template.set("visible", false);
    series.ticks.template.set("visible", false);

    const totalSec = data.reduce((s, d) => s + (d.rawSeconds ?? 0), 0);
    root.container.children.push(
      am5.Label.new(root, {
        text: totalSec ? `${(totalSec / 3600).toFixed(1)}h\nTOTAL MONITORED` : "No Data",
        fontSize: 12, fontWeight: "600", fill: am5.color(0x6b7280),
        x: am5.percent(50), y: am5.percent(50),
        centerX: am5.percent(50), centerY: am5.percent(50), textAlign: "center",
      })
    );
    series.data.setAll(data.map((d) => ({ name: d.name, value: d.value || 0.001, color: am5.color(d.color) })));
    series.appear(1000);
    return () => root.dispose();
  }, [data]);

  return <div ref={chartRef} className="w-44 h-44 sm:w-52 sm:h-52" />;
}
