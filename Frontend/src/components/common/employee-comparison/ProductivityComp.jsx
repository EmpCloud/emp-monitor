import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as am5 from "@amcharts/amcharts5"
import * as am5percent from "@amcharts/amcharts5/percent"
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated"
import { Clock, Activity, Zap, TrendingDown, Minus, Settings2 } from 'lucide-react'
import prodImage from "@/assets/prod.png"
import ProductiveEmp from "./ProductiveEmp"
import { getEmployeesList, getEmployeeProductivity } from "@/page/protected/admin/employee-comparison/service"

const BASE_CHART_DATA = [
  { name: "Productive",   value: 0, color: "#3B82F6" },
  { name: "Unproductive", value: 0, color: "#93C5FD" },
  { name: "Neutral",      value: 0, color: "#1D4ED8" },
  { name: "Other",        value: 0, color: "#F59E0B" },
]

const getBaseLegendItems = (t) => [
  { label: t("comparison.productiveTimeVsTotal"), value: "0.00%", dotColor: "bg-blue-500",  textColor: "text-blue-500"  },
  { label: t("comparison.unproductiveTimeEst"),   value: "0.00%", dotColor: "bg-orange-500", textColor: "text-orange-500" },
  { label: t("comparison.neutralTimeEst"),        value: "0.00%", dotColor: "bg-green-500",  textColor: "text-green-500"  },
  { label: t("comparison.other"),                 value: "0.00%", dotColor: "bg-slate-400",  textColor: "text-slate-500"  },
]

const getBaseTimeStats = (t) => [
  { label: t("comparison.officeTime"),       value: "00:00:00 hrs", Icon: Clock,        iconBg: "bg-blue-50",   iconColor: "text-blue-500"   },
  { label: t("comparison.unproductiveTime"), value: "00:00:00 hrs", Icon: TrendingDown, iconBg: "bg-orange-50", iconColor: "text-orange-400" },
  { label: t("comparison.activeTime"),       value: "00:00:00 hrs", Icon: Activity,     iconBg: "bg-teal-50",   iconColor: "text-teal-500"   },
  { label: t("comparison.neutralTime"),      value: "00:00:00 hrs", Icon: Minus,        iconBg: "bg-green-50",  iconColor: "text-green-500"  },
  { label: t("comparison.productiveTime"),   value: "00:00:00 hrs", Icon: Zap,          iconBg: "bg-purple-50", iconColor: "text-purple-500" },
  { label: t("comparison.productivity"),     value: "0.00%",        Icon: Settings2,    iconBg: "bg-red-50",    iconColor: "text-red-400"    },
]

function DonutChart({ data, centerText, centerSubText }) {
  const chartRef = useRef(null)
  const rootRef  = useRef(null)

  useEffect(() => {
    if (rootRef.current) rootRef.current.dispose()

    const root = am5.Root.new(chartRef.current)
    if (root._logo) root._logo.dispose()
    rootRef.current = root
    root.setThemes([am5themes_Animated.new(root)])

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, { innerRadius: am5.percent(68) })
    )
    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: "value", categoryField: "name", fillField: "color",
      })
    )
    series.slices.template.setAll({
      strokeWidth: 3, stroke: am5.color(0xffffff),
      cornerRadiusTL: 4, cornerRadiusTR: 4, cornerRadiusBL: 4, cornerRadiusBR: 4,
      tooltipText: "{category}: {value}%",
    })
    series.slices.template.states.create("hover", { scale: 1.04 })
    series.labels.template.set("visible", false)
    series.ticks.template.set("visible", false)

    root.container.children.push(
      am5.Label.new(root, {
        text: centerText, fontSize: 20, fontWeight: "700",
        fill: am5.color(0x1e293b),
        x: am5.percent(50), y: am5.percent(44),
        centerX: am5.percent(50), centerY: am5.percent(50),
        textAlign: "center",
      })
    )

    if (centerSubText) {
      root.container.children.push(
        am5.Label.new(root, {
          text: centerSubText, fontSize: 8, fontWeight: "400",
          fill: am5.color(0x22c55e),
          x: am5.percent(50), y: am5.percent(57),
          centerX: am5.percent(50), centerY: am5.percent(50),
          textAlign: "center",
        })
      )
    }

    series.data.setAll(data.map((d) => ({
      name: d.name, value: d.value === 0 ? 0.001 : d.value, color: am5.color(d.color),
    })))
    series.appear(1000)

    return () => { root.dispose(); rootRef.current = null }
  }, [data, centerText, centerSubText])

  return <div ref={chartRef} className="w-48 h-48 shrink-0" />
}

const LEGEND_COLORS = ["#3B82F6", "#f97316", "#22C55E", "#6366f1", "#a855f7", "#f59e0b"]

function ComparisonCard({ chartData, legendItems, timeStats, centerText = "0%", stats }) {
  const { t } = useTranslation()
  const hasData =
    stats &&
    (
      Number(stats.officeSeconds || 0) > 0 ||
      Number(stats.unproductiveSeconds || 0) > 0 ||
      Number(stats.activeSeconds || 0) > 0 ||
      Number(stats.neutralSeconds || 0) > 0 ||
      Number(stats.productiveSeconds || 0) > 0
    )

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex-1 min-w-0 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm font-semibold text-slate-600">{t("comparison.noActivityData")}</p>
          <p className="text-xs text-slate-400 mt-1">
            {t("comparison.noActivityDesc")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex-1 min-w-0">
      
      <div className="flex gap-4 items-center">
        
        <div className="shrink-0">
          <DonutChart
            data={chartData}
            centerText={centerText}
            centerSubText="Lorem ipsum quia"
          />
        </div>
  
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${item.dotColor}`}
              />
              <div className="min-w-0">
                <p
                  className={`text-sm font-bold leading-none ${item.textColor}`}
                >
                  {item.value}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight truncate">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 my-4" />

      <div className="grid grid-cols-2 gap-3">
        {timeStats.map(({ label, value, Icon, iconBg, iconColor }, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}
            >
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
  
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 leading-none truncate">
                {label}
              </p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

const ProductivityComp = () => {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]

  const BASE_LEGEND_ITEMS = getBaseLegendItems(t)
  const BASE_TIME_STATS = getBaseTimeStats(t)

  const [employees, setEmployees] = useState([{ value: "all", label: t("comparison.seeAllEmployee") }])
  const [leftEmployee,   setLeftEmployee]   = useState("all")
  const [leftDateFrom,   setLeftDateFrom]   = useState(today)
  const [leftDateTo,     setLeftDateTo]     = useState(today)
  const [rightEmployee,  setRightEmployee]  = useState("all")
  const [rightDateFrom,  setRightDateFrom]  = useState(today)
  const [rightDateTo,    setRightDateTo]    = useState(today)

  const [leftStats,  setLeftStats]  = useState(null)
  const [rightStats, setRightStats] = useState(null)
  const [loadingLeft, setLoadingLeft] = useState(false)
  const [loadingRight, setLoadingRight] = useState(false)

  useEffect(() => {
    const fetchEmployees = async () => {
      const res = await getEmployeesList()
      if (Array.isArray(res?.stats) && res.stats.length) {
        setEmployees(res.stats)
      }
    }

    fetchEmployees()
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      if (!leftEmployee || leftEmployee === "all") {
        setLeftStats(null)
        return
      }

      setLoadingLeft(true)
      const res = await getEmployeeProductivity({
        employeeId: leftEmployee,
        startDate: leftDateFrom,
        endDate: leftDateTo,
      })
      setLeftStats(res?.stats || null)
      setLoadingLeft(false)
    }

    fetchStats()
  }, [leftEmployee, leftDateFrom, leftDateTo])

  useEffect(() => {
    const fetchStats = async () => {
      if (!rightEmployee || rightEmployee === "all") {
        setRightStats(null)
        return
      }

      setLoadingRight(true)
      const res = await getEmployeeProductivity({
        employeeId: rightEmployee,
        startDate: rightDateFrom,
        endDate: rightDateTo,
      })
      setRightStats(res?.stats || null)
      setLoadingRight(false)
    }

    fetchStats()
  }, [rightEmployee, rightDateFrom, rightDateTo])

  const buildChartData = (stats) => {
    if (!stats) return BASE_CHART_DATA

    const p = Number(stats.productivityPercentValue || 0)
    const productive = Math.min(100, Math.max(0, p))
    const unproductive = Math.max(0, 100 - productive)

    return BASE_CHART_DATA.map((item) => {
      if (item.name === "Productive") return { ...item, value: productive }
      if (item.name === "Unproductive") return { ...item, value: unproductive }
      return { ...item, value: 0 }
    })
  }

  const buildLegendItems = (stats) => {
    if (!stats) return BASE_LEGEND_ITEMS

    const productive = Number(stats.productivityPercentValue || 0)
    const unproductive = Math.max(0, 100 - productive)

    return [
      { ...BASE_LEGEND_ITEMS[0], value: `${productive.toFixed(2)}%` },
      { ...BASE_LEGEND_ITEMS[1], value: `${unproductive.toFixed(2)}%` },
      BASE_LEGEND_ITEMS[2],
      BASE_LEGEND_ITEMS[3],
    ]
  }

  const buildTimeStats = (stats) => {
    if (!stats) return BASE_TIME_STATS

    return BASE_TIME_STATS.map((item, idx) => {
      // Map by index: 0=Office, 1=Unproductive, 2=Active, 3=Neutral, 4=Productive, 5=Productivity
      switch (idx) {
        case 0:
          return { ...item, value: stats.officeTime }
        case 2:
          return { ...item, value: stats.activeTime }
        case 4:
          return { ...item, value: stats.productiveTime }
        case 5:
          return { ...item, value: stats.productivityPercent }
        default:
          return item
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="border-l-2 border-blue-500 pl-4">
          <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
            <span className="font-semibold">{t("comparison.productivityLabel")}</span>{" "}
            <span className="font-normal text-gray-500">{t("comparison.comparisonLabel")}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xs leading-tight">
            &quot;Lorem ipsum quia dolor sit porro quisquam est qui amet consectetur adipisci&quot;
          </p>
        </div>
        <div className="flex items-end gap-1 mr-2">
          <img src={prodImage} alt="productivity" className="w-32 h-32" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <ProductiveEmp
          employees={employees}
          employeeValue={leftEmployee}
          onEmployeeChange={setLeftEmployee}
          dateFrom={leftDateFrom}
          dateTo={leftDateTo}
          onDateFromChange={setLeftDateFrom}
          onDateToChange={setLeftDateTo}
        />
        <ProductiveEmp
          employees={employees}
          employeeValue={rightEmployee}
          onEmployeeChange={setRightEmployee}
          dateFrom={rightDateFrom}
          dateTo={rightDateTo}
          onDateFromChange={setRightDateFrom}
          onDateToChange={setRightDateTo}
        />
      </div>

      {/* Comparison cards */}
      <div className="flex flex-col sm:flex-row gap-5 bg-slate-100 p-5 rounded-2xl shadow-sm border border-slate-100">
        <ComparisonCard
          chartData={buildChartData(leftStats)}
          legendItems={buildLegendItems(leftStats)}
          timeStats={buildTimeStats(leftStats)}
          centerText={leftStats ? leftStats.productivityPercent : "0%"}
          stats={leftStats}
        />
        <ComparisonCard
          chartData={buildChartData(rightStats)}
          legendItems={buildLegendItems(rightStats)}
          timeStats={buildTimeStats(rightStats)}
          centerText={rightStats ? rightStats.productivityPercent : "0%"}
          stats={rightStats}
        />
      </div>
    </div>
  )
}

export default ProductivityComp;
