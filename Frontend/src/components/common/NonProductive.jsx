import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

const getEmployeeName = (emp) => {
  const first = emp?.first_name ?? "";
  const last = emp?.last_name ?? "";
  const full = `${first} ${last}`.trim();
  return full || emp?.name || emp?.employee_name || "-";
};

// Treat API `duration` as seconds and format as HH:MM:SS
const formatDuration = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "-";
  const total = Math.floor(n);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const buildChartDataFromEmployees = (employees = []) => {
  if (!Array.isArray(employees) || employees.length === 0) {
    return [];
  }

  return employees.slice(0, 10).map((emp, idx) => {
    const duration =
      emp?.duration ??
      emp?.time_hours ??
      emp?.timeHours ??
      emp?.duration_seconds ??
      0;

    return {
      date: String(idx + 1),
      value: Number(duration) || 0,
      name: getEmployeeName(emp),
      role: emp?.role ?? emp?.designation ?? emp?.a_email ?? emp?.email ?? "",
      hours: formatDuration(duration),
      seed: String(emp?.id ?? emp?.employee_id ?? `emp-${idx}`),
    };
  });
};

export default function TopNonProductiveEmployees({
  title,
  filter,
  report,
  employees = [],
  loading = false,
}) {
  const { t } = useTranslation();
  const resolvedTitle = title || t("topNonProductiveEmployees");
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || loading || !employees?.length) return;

    const chartData = buildChartDataFromEmployees(employees);

    const root = am5.Root.new(chartRef.current);

    // Hide amCharts logo
    if (root._logo) root._logo.dispose();

    root.setThemes([am5themes_Animated.new(root)]);

    // Chart
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        paddingTop: 80,
        paddingRight: 20,
        paddingLeft: 10,
      }),
    );

    chart.zoomOutButton.set("forceHidden", true);

    // Axes
    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 20,
      strokeOpacity: 0,
    });
    xRenderer.grid.template.setAll({
      stroke: am5.color("#e2e8f0"),
      strokeDasharray: [4, 4],
      strokeOpacity: 0.6,
    });
    xRenderer.labels.template.setAll({
      fill: am5.color("#94a3b8"),
      fontSize: 11,
      paddingTop: 8,
    });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "date",
        renderer: xRenderer,
        tooltip: am5.Tooltip.new(root, {}),
      }),
    );

    const yRenderer = am5xy.AxisRendererY.new(root, { strokeOpacity: 0 });
    yRenderer.grid.template.setAll({
      stroke: am5.color("#e2e8f0"),
      strokeDasharray: [4, 4],
      strokeOpacity: 0.7,
    });
    yRenderer.labels.template.setAll({
      fill: am5.color("#94a3b8"),
      fontSize: 11,
    });

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        strictMinMax: false,
        renderer: yRenderer,
      }),
    );

    // Series
    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        xAxis,
        yAxis,
        valueYField: "value",
        categoryXField: "date",
      }),
    );

    // gradient fill (keep visual similar to original)
    series.columns.template.adapters.add("fill", (fill, target) => {
      const val = target.dataItem?.get("valueY") ?? 0;
      const maxVal = 220;
      const t = Math.min(val / maxVal, 1);
      const g = Math.round(160 + (1 - t) * 60);
      return am5.color(`rgb(80,${g},80)`);
    });

    // Custom HTML Tooltip
    const tooltip = am5.Tooltip.new(root, {
      getFillFromSprite: false,
      autoTextColor: false,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    });

    tooltip.get("background").setAll({
      fill: am5.color("#1e293b"),
      fillOpacity: 0,
      strokeOpacity: 0,
    });

    series.set("tooltip", tooltip);

    series.columns.template.setAll({
      cornerRadiusTL: 8,
      cornerRadiusTR: 8,
      cornerRadiusBL: 8,
      cornerRadiusBR: 8,
      width: am5.percent(55),
      strokeOpacity: 0,
      fillOpacity: 1,
      tooltipY: am5.percent(0),
    });

    series.columns.template.adapters.add("tooltipHTML", (html, target) => {
      const d = target.dataItem?.dataContext;
      if (!d) return "";
      const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${d.seed}`;

      return `
        <div style="
          display:flex;
          align-items:center;
          gap:10px;
          padding:10px 12px;
          border-radius:12px;
          background:#020617;
          border:1px solid rgba(148,163,184,0.45);
          box-shadow:0 12px 30px rgba(15,23,42,0.85);
          max-width:260px;
        ">
          <img
            src="${avatarUrl}"
            style="
              width:44px;
              height:44px;
              border-radius:999px;
              border:2px solid #475569;
              flex-shrink:0;
              background:#1f2937;
            "
          />
          <div style="flex:1; min-width:0;">
            <div
              style="
                color:#e5e7eb;
                font-weight:600;
                font-size:12px;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
              "
            >
              ${d.name}
            </div>
            <div
              style="
                color:#9ca3af;
                font-size:10px;
                margin-top:2px;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
              "
            >
              ${d.role}
            </div>
            <div
              style="
                display:inline-block;
                margin-top:6px;
                background:rgba(59,130,246,0.14);
                border-radius:999px;
                padding:3px 10px;
                color:#60a5fa;
                font-weight:700;
                font-size:11px;
              "
            >
              ${d.hours}
            </div>
          </div>
        </div>
      `;
    });

    xAxis.data.setAll(chartData);
    series.data.setAll(chartData);
    series.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [employees, loading]);

  return (
    <>
      <div className="bg-white rounded-[21px] shadow-sm border border-slate-100 w-full max-w-5xl p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-slate-900 font-semibold text-xl sm:text-2xl">
            {resolvedTitle}
          </h2>
          {report}
        </div>

        {/* Tabs + Filters */}
        {filter}

        {/* Loading / Empty states */}
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            {t("loadingText")}
          </div>
        ) : !employees?.length ? (
          <div className="py-10 text-center text-sm text-slate-500">
            {t("noEmployeesForFilters")}
          </div>
        ) : null}

        {/* Chart */}
        <div ref={chartRef} style={{ width: "100%", height: 380 }} />
      </div>
    </>
  );
}
