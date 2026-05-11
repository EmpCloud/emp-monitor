import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAlertList } from "@/page/protected/admin/alerts/service";

const REFRESH_MS = 60_000;
const HOVER_CLOSE_DELAY = 220;

/**
 * Notification bell that
 *  - fetches the last 4 alerts from /alerts-and-notifications/alerts/find-by
 *  - shows a red dot only when there are any
 *  - reveals a hover/click dropdown with the recent alerts
 *  - falls back to "No new notifications" when the list is empty
 */
export default function NotificationBell({ viewAllPath }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef(null);

  const loadRecent = useCallback(async () => {
    try {
      setLoading(true);
      // Use a wide date window so the "recent 4" reflect real alerts even
      // when nothing has fired today.
      const today = new Date();
      const monthBack = new Date();
      monthBack.setDate(today.getDate() - 30);
      const fmt = (d) => d.toISOString().slice(0, 10);

      const res = await getAlertList({
        skip: 0,
        limit: 4,
        startDate: fmt(monthBack),
        endDate: fmt(today),
        sortName: "datetime",
        sortOrder: "D",
      });
      setAlerts(Array.isArray(res?.rows) ? res.rows.slice(0, 4) : []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
    const id = setInterval(loadRecent, REFRESH_MS);
    return () => clearInterval(id);
  }, [loadRecent]);

  const hasAlerts = alerts.length > 0;

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  };

  const goToViewAll = () => {
    setOpen(false);
    navigate(viewAllPath);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={t("alerts")}
            aria-label={t("alerts")}
            onClick={goToViewAll}
            className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full shadow-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {hasAlerts && (
              <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-80 p-0 rounded-xl shadow-xl border-slate-100 overflow-hidden"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/60">
            <span className="text-sm font-semibold text-slate-800">
              {t("alerts")}
            </span>
            {hasAlerts && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                Last {alerts.length}
              </span>
            )}
          </div>

          {loading && alerts.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">
              Loading…
            </div>
          ) : !hasAlerts ? (
            <div className="flex flex-col items-center gap-2 px-4 py-7 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                No new notifications
              </p>
              <p className="text-[11px] text-slate-400">
                You're all caught up.
              </p>
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  onClick={goToViewAll}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: a.riskColor || "#94a3b8" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {a.ruleName || a.behaviorRule || "Alert"}
                        </p>
                        <span
                          className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-white shrink-0"
                          style={{ backgroundColor: a.riskColor || "#94a3b8" }}
                        >
                          {a.riskCode || "-"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {a.employee}
                      </p>
                      {a.message && (
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                          {a.message}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {a.dateTime}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={goToViewAll}
            className="block w-full text-center text-xs font-semibold text-blue-600 hover:bg-blue-50 py-2.5 border-t border-slate-100 transition-colors cursor-pointer"
          >
            View all
          </button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
