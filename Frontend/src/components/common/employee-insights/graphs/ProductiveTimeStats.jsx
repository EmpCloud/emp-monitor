import React from "react";
import { useTranslation } from "react-i18next";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import ArrowDownIcon from "@/assets/employee/icons/down-arrow.svg";
import ArrowUpIcon from "@/assets/employee/icons/up-arrow.svg";

const ProductiveTimeStats = ({ today, yesterday }) => {
  const { t } = useTranslation();
  const todayTime = today?.productiveTime || "00:00:00 hrs";
  const yesterdayTime = yesterday?.productiveTime || "00:00:00 hrs";
  const isUp = Number(today?.productiveSeconds || 0) >= Number(yesterday?.productiveSeconds || 0);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <div className="text-lg font-semibold text-[#575757]">
        {t("insights_productive_time")}
      </div>
      <div className="text-xs text-[#575757] max-w-md leading-snug">
        &quot;Lorem ipsum quia dolor sit porro quisquam est qui amet consectetur
        adipisci&quot;
      </div>

      <div className="flex justify-between items-center gap-6 mt-4">
        <div className="" >
          <div className="text-sm text-[#575757] font-medium mb-1">{t("insights_previous_day")}</div>
          <div className="flex items-center gap-1">
            <div className="text-xl font-semibold text-red-500">
              {yesterdayTime}
            </div>
            <img src={ArrowUpIcon} className="size-7" />
          </div>
        </div>
        <div  className="bg-slate-200 w-0.5 h-12" ></div>
        <div className="">
          <div className="text-sm text-[#575757] font-medium mb-1">{t("insights_total_work")}</div>
          <div className="flex items-center gap-2">
            <div className={`text-xl font-semibold ${isUp ? "text-emerald-600" : "text-red-500"}`}>
              {todayTime}
            </div>
            {isUp ? <FaArrowUp className="text-emerald-600" /> : <FaArrowDown className="text-red-500" />}
            {/* <img src={ArrowDownIcon} className="size-7" /> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductiveTimeStats;
