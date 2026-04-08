import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import TotalEnrollmentsModal from "./TotalEnrollmentsModal";
import { getDashboardEmployeesByType } from "@/page/protected/admin/dashboard/service";

const MiniBarChart = ({ bars = [], color = "#a78bfa" }) => (
  <div className="flex items-end gap-[3px] h-8">
    {bars.map((h, i) => (
      <div
        key={i}
        className="w-[4px] rounded-sm"
        style={{ height: `${h}%`, backgroundColor: color, opacity: 0.85 }}
      />
    ))}
  </div>
);

const MiniWave = ({ color = "white" }) => (
  <svg
    width="56"
    height="32"
    viewBox="0 0 56 32"
    fill="none"
    className="opacity-60"
  >
    <path
      d="M0 24 C8 24, 8 8, 16 8 S24 24, 32 20 S44 8, 56 12"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);


const getStatType = (labelKey) => {
  switch (labelKey) {
    case "stat_currently_active":
      return 1;
    case "stat_currently_idle":
      return 2;
    case "stat_currently_offline":
      return 6;
    case "stat_absent":
      return 3;
    case "stat_suspended":
      return 4;
    case "stat_total_enrollments":
      return 5; // Registered
    default:
      return null;
  }
};

export default function Stats({ stats, timezone = "Asia/Kolkata" }) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState(t("employees"));
  const [modalType, setModalType] = useState(null);
  const [modalEmployees, setModalEmployees] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalLoading(false);
    setModalEmployees([]);
    setModalTitle(t("employees"));
    setModalType(null);
  }, [t]);

  const openForStat = useCallback(
    async (labelKey) => {
      const type = getStatType(labelKey);
      if (!type) return;

      setModalTitle(t(labelKey));
      setModalType(type);
      setIsModalOpen(true);
      setModalLoading(true);

      const res = await getDashboardEmployeesByType({ type, timezone });
      setModalEmployees(res?.stats || []);
      setModalLoading(false);
    },
    [timezone, t],
  );

  return (
    <>
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ">
        {stats.map((stat, i) => {
          const isBlue = stat.variant === "blue";
          const isSteel = stat.variant === "steel";
          const isHighlight = stat.highlight;

          // Special design for Idle and Offline
          const isIdleOrOffline =
            stat.labelKey === "stat_currently_idle" ||
            stat.labelKey === "stat_currently_offline";

          if (isIdleOrOffline) {
            const iconColor =
              stat.labelKey === "stat_currently_idle" ? "#0066cc" : "#86ef47";
            return (
              <div
                key={i}
                onClick={() => openForStat(stat.labelKey)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 h-25 cursor-pointer hover:shadow-md transition-shadow"
              >
                {/* Circular Icon Background */}
                <div className="w-14 h-14 rounded-full bg-blue-50/50 flex items-center justify-center shrink-0">
                  <div className="flex items-end gap-[3px] h-6">
                    {[40, 70, 50, 30].map((h, idx) => (
                      <div
                        key={idx}
                        className="w-[4px] rounded-full"
                        style={{ height: `${h}%`, backgroundColor: iconColor }}
                      />
                    ))}
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex flex-col">
                  <span className="text-[#A3AED0] text-xs font-medium whitespace-wrap">
                    {t(stat.labelKey)}
                  </span>
                  <span className="text-[#2B3674] text-2xl font-bold">
                    {stat.value}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              onClick={() => openForStat(stat.labelKey)}
              className={`relative flex items-center h-25 justify-between rounded-2xl px-4 py-3 overflow-hidden
              ${isBlue ? "bg-linear-to-br from-[#4f8ef7] to-[#3b5fc0] text-white shadow-blue-200 shadow-md" : ""}
              ${isSteel ? "bg-linear-to-br from-[#6b80a8] to-[#3d5080] text-white shadow-slate-300 shadow-md" : ""}
              ${!isHighlight ? "bg-white border border-slate-100 shadow-sm" : ""}
              cursor-pointer hover:shadow-lg transition-shadow
            `}
            >
              <div className="flex flex-col gap-1 z-10">
                <span
                  className={`text-xs font-medium leading-tight ${isHighlight ? "text-white/80" : "text-slate-400"}`}
                >
                  {t(stat.labelKey)}
                </span>
                <span
                  className={`text-2xl font-bold ${isHighlight ? "text-white" : "text-slate-800"}`}
                >
                  {stat.value}
                </span>
              </div>

              <div className="z-10">
                {stat.chart === "wave" ? (
                  <MiniWave color="white" />
                ) : (
                  <MiniBarChart bars={stat.bars} color={stat.barColor} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <TotalEnrollmentsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalTitle}
        employees={modalEmployees}
        loading={modalLoading}
      />
    </>
  );
}
