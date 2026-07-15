import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import {
  Clock, Activity, TrendingUp, TrendingDown, Minus, BarChart3,
} from "lucide-react";
import { fetchProductivity } from "./service";
import { secToHMS } from "@/lib/dateTimeUtils";

const legendKeys = [
  { key: "productive",   color: "#818cf8" },
  { key: "neutral",      color: "#a78bfa" },
  { key: "idles",        color: "#c4b5fd" },
  { key: "offlineTime",  color: "#e9d5ff" },
];

function StatCard({ label, value, icon: Icon, iconBg, iconColor, ring, ringColor }) {
  return (
    <div className={`flex items-center justify-between gap-2 bg-white rounded-2xl border shadow-sm px-3 py-3.5 min-w-0 ${ring ? `border-2 ${ringColor || "border-rose-400"}` : "border-gray-100"}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 font-medium whitespace-nowrap" title={label}>{label}</p>
        <p
          className="text-sm font-bold text-gray-800 mt-1.5 border border-gray-200 rounded-lg px-2 py-1 tabular-nums whitespace-nowrap"
          title={String(value)}
        >
          {value}
        </p>
      </div>
      <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={iconColor} />
      </div>
    </div>
  );
}

function TimelineBar({ days }) {
  const { t } = useTranslation();
  const day = days?.[0];
  if (!day) return null;

  const total = day.total_duration || 1;
  // Keep the bar segment colors in sync with the legend (legendKeys) and the
  // stacked chart below — same productive/neutral/idle/offline palette — so the
  // same category isn't drawn in different colors across the three views.
  const segments = [
    { key: "productive_duration", color: "#818cf8" },
    { key: "neutral_duration",    color: "#a78bfa" },
    { key: "idle_duration",       color: "#c4b5fd" },
  ];
  const offlineSec = Math.max(0, day.total_duration - (day.computer_activities_time ?? 0));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
        <span className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {day.date}
        </span>
        {legendKeys.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5 text-[13px] text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {t(item.key)}
          </span>
        ))}
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1.5 font-medium">{day.date}</div>
        <div className="w-full h-10 rounded-xl overflow-hidden flex">
          {segments.map(({ key, color }) => {
            const pct = ((day[key] ?? 0) / total * 100).toFixed(1);
            return pct > 0 ? (
              <div key={key} className="h-full" style={{ width: `${pct}%`, backgroundColor: color }} title={`${key}: ${secToHMS(day[key])}`} />
            ) : null;
          })}
          {offlineSec > 0 && (
            <div className="h-full" style={{ width: `${(offlineSec / total * 100).toFixed(1)}%`, backgroundColor: "#e9d5ff" }} title={`${t("offlineKey")}: ${secToHMS(offlineSec)}`} />
          )}
        </div>
        <div className="flex justify-between mt-2.5 text-[11px] text-gray-400 font-medium">
          <span>{day.date}</span>
          <span>{t("office")}: {secToHMS(day.office_time)}</span>
          <span>{t("actives")}: {secToHMS(day.computer_activities_time)}</span>
          <span>{t("productive")}: {secToHMS(day.productive_duration)}</span>
        </div>
      </div>
    </div>
  );
}

function StackedBarChart({ days }) {
  const { t } = useTranslation();
  const chartRef = useRef(null);

  const chartData = useMemo(() =>
    days.slice().reverse().map((d) => ({
      date:       d.date,
      productive: parseFloat((d.productive_duration     / 3600).toFixed(2)),
      neutral:    parseFloat((d.neutral_duration        / 3600).toFixed(2)),
      idle:       parseFloat((d.idle_duration           / 3600).toFixed(2)),
      offline:    parseFloat((Math.max(0, d.total_duration - (d.computer_activities_time ?? 0)) / 3600).toFixed(2)),
    })),
  [days]);

  useEffect(() => {
    if (!chartData || chartData.length === 0) return;

    const root = am5.Root.new(chartRef.current);
    if (root._logo) root._logo.dispose();
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false, panY: false,
        layout: root.verticalLayout,
        paddingTop: 10, paddingBottom: 0,
      })
    );

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "date",
        renderer: am5xy.AxisRendererX.new(root, {
          cellStartLocation: 0.15, cellEndLocation: 0.85, minGridDistance: 40,
        }),
      })
    );
    xAxis.data.setAll(chartData);
    xAxis.get("renderer").labels.template.setAll({ fontSize: 12, fill: am5.color(0x9ca3af), paddingTop: 8 });
    xAxis.get("renderer").grid.template.setAll({ strokeOpacity: 0.05 });

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}), min: 0 })
    );
    yAxis.get("renderer").labels.template.setAll({ fontSize: 11, fill: am5.color(0x9ca3af) });
    yAxis.get("renderer").grid.template.setAll({ strokeOpacity: 0.08, strokeDasharray: [4, 4] });
    yAxis.children.unshift(
      am5.Label.new(root, {
        text: "Hours", rotation: -90,
        y: am5.percent(50), centerX: am5.percent(50),
        fontSize: 12, fill: am5.color(0x9ca3af), fontWeight: "500",
      })
    );

    const makeSeries = (name, field, color) => {
      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          name, xAxis, yAxis,
          valueYField: field, categoryXField: "date",
          stacked: true,
          fill: am5.color(color), stroke: am5.color(0xffffff),
        })
      );
      series.columns.template.setAll({
        cornerRadiusTL: 3, cornerRadiusTR: 3,
        width: am5.percent(55), strokeWidth: 1,
        tooltipText: "{name}: {valueY}h",
      });
      series.data.setAll(chartData);
      series.appear(1000);
    };

    makeSeries("Productive",   "productive", 0x818cf8);
    makeSeries("Neutral",      "neutral",    0xa78bfa);
    makeSeries("Idle",         "idle",       0xc4b5fd);
    makeSeries("Offline Time", "offline",    0xe9d5ff);

    chart.appear(1000, 100);
    return () => root.dispose();
  }, [chartData]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <div ref={chartRef} className="w-full h-[350px] sm:h-[420px]" />
      <div className="flex flex-wrap items-center justify-center gap-5 mt-3 pt-3 border-t border-gray-50">
        {legendKeys.map((item) => (
          <span key={item.key} className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            {t(item.key)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProductivityTab({ employee, startDate, endDate }) {
  const { t } = useTranslation();
  const [days, setDays]       = useState([]);
  const [totals, setTotals]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee?.id || !startDate || !endDate) return;
    const load = async () => {
      setLoading(true);
      const res = await fetchProductivity(employee.id, startDate, endDate);
      if (res?.code === 200) {
        setDays(Array.isArray(res.data) ? res.data : []);
        setTotals(res.production_data ?? null);
      }
      setLoading(false);
    };
    load();
  }, [employee?.id, startDate, endDate]);

  const totalUnproductive = days.reduce((s, d) => s + (d.non_productive_duration ?? 0), 0);
  const totalNeutral      = days.reduce((s, d) => s + (d.neutral_duration        ?? 0), 0);
  // total_productivity already arrives as a percentage from the backend
  // ((productive / custom_time) * 100, and capped at 100 for capping orgs). The
  // extra * 100 here double-counted it (e.g. 9.19 → 919.32%). Use it directly.
  const productivityPct   = totals ? `${(Number(totals.total_productivity) || 0).toFixed(2)}%` : "—";

  const statCards = [
    {
      label: t("officeTime"),
      value: totals ? secToHMS(totals.total_office_time) : "—",
      icon: Clock, iconBg: "bg-blue-100", iconColor: "text-blue-500", ring: false,
    },
    {
      label: t("activeTime"),
      value: totals ? secToHMS(totals.total_computer_activities_time) : "—",
      icon: Activity, iconBg: "bg-rose-100", iconColor: "text-rose-500",
      ring: true, ringColor: "ring-rose-400",
    },
    {
      label: t("prodTime"),
      value: totals ? secToHMS(totals.total_productive_duration) : "—",
      icon: TrendingUp, iconBg: "bg-cyan-100", iconColor: "text-cyan-500", ring: false,
    },
    {
      label: t("unProdTime"),
      value: secToHMS(totalUnproductive),
      icon: TrendingDown, iconBg: "bg-orange-100", iconColor: "text-orange-400", ring: false,
    },
    {
      label: t("neutralTime"),
      value: secToHMS(totalNeutral),
      icon: Minus, iconBg: "bg-pink-100", iconColor: "text-pink-500", ring: false,
    },
    {
      label: t("productivity"),
      value: productivityPct,
      icon: BarChart3, iconBg: "bg-violet-100", iconColor: "text-violet-500", ring: false,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center h-32">
          <span className="text-sm text-gray-400">{t("Loading")}…</span>
        </div>
      ) : (
        <TimelineBar days={days} />
      )}

      {days.length > 0 && <StackedBarChart days={days} />}
    </div>
  );
}
