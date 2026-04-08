import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ReactApexChart from "react-apexcharts";

const ProductivePercentage = ({ today, yesterday, organization }) => {
  const { t } = useTranslation();
  const todayPercent = Number(today?.productivity ?? 0);
  const yesterdayPercent = Number(yesterday?.productivity ?? 0);
  const orgPercent = Number(organization?.productivity ?? 0);

  const donutChart = useMemo(() => {
    const productive = Math.max(0, Math.min(100, todayPercent));
    const average = Math.max(0, Math.min(100, orgPercent));
    const other = Math.max(0, 100 - productive);
    const series = [productive, average, other];
    const options = {
      chart: {
        type: "donut",
        height: 96,
        sparkline: { enabled: true },
        toolbar: { show: false },
        animations: { enabled: false },
      },
      labels: ["Productive", "Average", "Other"],
      colors: ["#1d4ed8", "#93c5fd", "#e5e7eb"],
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 0 },
      tooltip: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: "62%",
          },
        },
      },
    };
    return { series, options };
  }, [todayPercent, orgPercent]);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex items-start justify-between gap-6">
      <div className="flex-1">
        <div className="text-lg font-semibold text-slate-700">
          {t("insights_productivity_percentage")}
        </div>
        <div className="text-xs text-slate-400 mt-1 max-w-md leading-snug">
          &quot;Lorem ipsum quia dolor sit porro quisquam est qui amet
          consectetur adipisci&quot;
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
          <div>
            <div className="text-xs text-[#575757] font-medium">
              {t("insights_previous_day_avg")}
            </div>
            <div className="text-sm font-semibold text-blue-600 mt-1 flex justify-between items-center">
              <div className="">{yesterdayPercent.toFixed(2)}%</div>
              <div className="size-2 rounded-full bg-[#193CB8]"></div>
            </div>
          </div>
          <div className="sm:border-l sm:border-slate-200 sm:pl-6">
            <div className="text-xs text-[#575757] font-medium">
              {t("insights_total_work_avg")}
            </div>
            <div className="text-sm font-semibold text-blue-600 mt-1 flex justify-between items-center">
              <div className="">{todayPercent.toFixed(2)}%</div>
              <div className="size-2 rounded-full bg-[#193CB8]"></div>
            </div>
          </div>
          <div className="sm:border-l sm:border-slate-200 sm:pl-6">
            <div className="text-xs text-[#575757] font-medium">
              {t("insights_whole_org_avg")}
            </div>
            <div className="text-sm font-semibold text-blue-600 mt-1 flex justify-between items-center">
              <div className="">{orgPercent.toFixed(2)}%</div>
              <div className="size-2 rounded-full bg-[#193CB8]"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-[110px] flex items-center justify-center">
        <div className="relative w-20 h-20">
          <ReactApexChart
            options={donutChart.options}
            series={donutChart.series}
            type="donut"
            height={80}
            width={80}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <span className="text-xs font-semibold text-slate-600">
                {todayPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductivePercentage;
