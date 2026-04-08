import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ReactApexChart from "react-apexcharts";
import { BsFillLightningChargeFill } from "react-icons/bs";
import ProductiveTimeIcon from "@/assets/employee/icons/productivity-time.svg";

const ProductiveTime = ({ value = "00:00:00 hrs" }) => {
  const { t } = useTranslation();
  const productiveSparkChart = useMemo(() => {
    const series = [{ data: [28, 18, 26, 10, 22, 12, 6] }];
    const options = {
      chart: {
        type: "area",
        height: 56,
        sparkline: { enabled: true },
        toolbar: { show: false },
        animations: { enabled: false },
      },
      colors: ["#38bdf8"],
      stroke: { curve: "straight", width: 2 },
      fill: {
        type: "solid",
        opacity: 0.15,
      },
      grid: { show: false },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
      markers: { size: 0 },
    };
    return { series, options };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-5 px-7 flex gap-3 flex-wrap items-center justify-between">
      <div className="flex flex-col items-start gap-3">
        <div className="w-11 h-11 rounded-sm bg-white shadow-md flex items-center justify-center">
          <img src={ProductiveTimeIcon} />
        </div>
        <div className="text-[#0ABF01]">
          <div className="text-sm text-emerald-600">{t("insights_productive_time")}</div>
          <div className="text-xl font-semibold ">{value}</div>
        </div>
      </div>

      <div className="h-12 w-40 rounded-lg bg-sky-100/70 overflow-hidden flex items-center">
        <ReactApexChart
          options={{
            ...productiveSparkChart.options,
            chart: {
              ...productiveSparkChart.options.chart,
              background: "transparent",
            },
          }}
          series={productiveSparkChart.series}
          type="area"
          height={48}
          width={160}
        />
      </div>
    </div>
  );
};

export default ProductiveTime;
