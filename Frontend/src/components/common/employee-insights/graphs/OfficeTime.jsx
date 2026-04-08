import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ReactApexChart from "react-apexcharts";
import { FaClock } from "react-icons/fa";
import OfficeTimeIcon from "@/assets/employee/icons/office-time.svg";

const OfficeTime = ({ value = "00:00:00 hrs" }) => {
  const { t } = useTranslation();
  const officeTimeChart = useMemo(() => {
    const data = [30, 28, 15, 32, 40];
    const maxVal = 40;
    const barColors = ["#0094CA", "#7E68D6", "#0094CA", "#7E68D6", "#0094CA"];
    const grayRemainder = data.map((v) => maxVal - v);

    const series = [
      { name: "value", data },
      { name: "remainder", data: grayRemainder },
    ];
    const options = {
      chart: {
        type: "bar",
        height: 70,
        stacked: true,
        sparkline: { enabled: true },
        toolbar: { show: false },
        animations: { enabled: false },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "40%",
          borderRadius: 5,
          borderRadiusApplication: "end",
          borderRadiusWhenStacked: "last",
        },
      },
      colors: [
        function ({ dataPointIndex }) {
          return barColors[dataPointIndex];
        },
        "#e8eaed",
      ],
      grid: { show: false },
      dataLabels: { enabled: false },
      stroke: { show: false },
      tooltip: { enabled: false },
      xaxis: {
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false, max: maxVal },
      fill: { opacity: 1 },
      legend: { show: false },
    };
    return { series, options };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-5 px-7 flex gap-3 flex-wrap items-center justify-between">
      <div className="flex flex-col items-start gap-3">
        <div className="w-11 h-11 rounded-sm bg-white shadow-md flex items-center justify-center">
          <img src={OfficeTimeIcon} />
        </div>
        <div className="text-[#575757]" >
          <div className="text-sm ">{t("insights_office_time")}</div>
          <div className="text-xl font-semibold text-[#575757]">
            {value}
          </div>
        </div>
      </div>

      <div className="w-40 pr-1 flex items-center justify-end">
        <ReactApexChart
          options={officeTimeChart.options}
          series={officeTimeChart.series}
          type="bar"
          height={70}
          width={140}
        />
      </div>
    </div>
  );
};

export default OfficeTime;
