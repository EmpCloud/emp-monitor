import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ReactApexChart from "react-apexcharts";
import { IoIosAlarm } from "react-icons/io";
import UnProductiveTimeIcon from "@/assets/employee/icons/unproductive-time.svg";

const UnProductiveTime = ({ value = "00:00:00 hrs" }) => {
  const { t } = useTranslation();
  const unproductiveSparkChart = useMemo(() => {
    const series = [{ data: [18, 14, 26, 20, 32, 24, 30] }];
    const options = {
      chart: {
        type: "line",
        height: 56,
        sparkline: { enabled: true },
        toolbar: { show: false },
        animations: { enabled: false },
      },
      colors: ["#822C2C"],
      stroke: { curve: "straight", width: 1 },
      grid: { show: false },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
      markers: {
        size: 5,
        colors: ["#FFB9B9"],
        strokeColors: "#FFB9B9",
        strokeWidth: 0,
        hover: { size: 4 },
      },
    };
    return { series, options };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-5 px-7 flex gap-3 flex-wrap items-center justify-between">
      <div className="flex flex-col items-start gap-3">
        <div className="w-11 h-11 rounded-sm bg-white shadow-md flex items-center justify-center">
          <img src={UnProductiveTimeIcon} />
        </div>
        <div className="text-[#EB5757]">
          <div className="text-sm text-red-500">{t("insights_unproductive_time")}</div>
          <div className="text-xl font-semibold">
            {value}
          </div>
        </div>
      </div>

      <div className="rounded-lg  flex items-center ">
        <ReactApexChart
          options={{
            ...unproductiveSparkChart.options,
            chart: {
              ...unproductiveSparkChart.options.chart,
              background: "transparent",
            },
          }}
          series={unproductiveSparkChart.series}
          type="line"
          height={48}
          width={160}
        />
      </div>
    </div>
  );
};

export default UnProductiveTime;
