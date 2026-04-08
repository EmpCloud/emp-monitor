import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar";
import { useLocation, useNavigate } from "react-router-dom";

export default function ProfileHeader({ employee, startDate, endDate, onDateChange, showActions = true, onEdit }) {
  const { t } = useTranslation();
  const name = employee?.name || t("employee");
  const navigate = useNavigate();
  const location = useLocation();

  const handleDateRangeChange = (start, end) => {
    if (!start || !end) return;
    onDateChange?.(start, end);
  };

  const handleSettingsClick = () => {
    const employeeId = employee?.id ?? employee?.user_id ?? employee?.u_id;
    if (!employeeId) return;

    const basePath = location.pathname.startsWith("/non-admin") ? "/non-admin" : "/admin";
    navigate(`${basePath}/track-user-settings?employee_id=${encodeURIComponent(employeeId)}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left: Avatar + Info */}
      <div className="flex items-center gap-4">
        {/* Avatar with gradient ring */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #f97316, #eab308, #22c55e, #3b82f6)",
              padding: "3px",
            }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
              {name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl text-gray-800 leading-tight">
            <span className="font-extrabold">{name}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{t("employeeFullDetails")}</span>
            {showActions && (
              <>
                <Badge
                  className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-md px-2 py-0.5 cursor-pointer"
                  onClick={onEdit}
                >
                  {t("edit")}
                </Badge>
                <Badge
                  className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white border-0 rounded-md px-2 py-0.5 cursor-pointer"
                  onClick={handleSettingsClick}
                >
                  {t("settings")}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Date Range */}
      <div className="self-start sm:self-center">
        <DateRangeCalendar
          startDate={startDate}
          endDate={endDate}
          onChange={handleDateRangeChange}
        />
      </div>
    </div>
  );
}
