import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import TableToolbar from "@/components/common/TableToolbar";
import PaginationFooter from "@/components/common/PaginationFooter";
import DonutChart from "@/components/common/DonutChart";
import { fetchApplications } from "./service";
import { secToHMS, fmtDateTime } from "@/lib/dateTimeUtils";
import { CHART_COLORS } from "@/lib/tableUtils";

function typeColor(type) {
  if (!type) return "text-gray-500";
  const t = String(type).toLowerCase();
  if (t === "productive") return "text-green-500";
  if (t === "unproductive") return "text-red-500";
  return "text-gray-500";
}

export default function AppHistoryTab({ employee, startDate, endDate }) {
  const { t } = useTranslation();
  const [tableRows, setTableRows] = useState([]);
  const [groups, setGroups]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");
  const [pageSize, setPageSize]   = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!employee?.id || !startDate || !endDate) return;
    const load = async () => {
      setLoading(true);
      const res = await fetchApplications(employee.id, startDate, endDate);
      const raw = Array.isArray(res?.data) ? res.data : [];
      setGroups(raw);
      const flat = [];
      raw.forEach((group) => {
        (group.applications ?? []).forEach((item) => {
          flat.push({
            app:        group.app_name ?? item.name ?? "—",
            name:       item.title    ?? item.name  ?? "—",
            type:       group.type    ?? "—",
            startTime:  fmtDateTime(item.start_time),
            endTime:    fmtDateTime(item.end_time),
            activeTime: secToHMS(item.active_seconds),
            idleTime:   "00:00:00",
            totalTime:  secToHMS(item.active_seconds),
          });
        });
      });
      setTableRows(flat);
      setCurrentPage(1);
      setLoading(false);
    };
    load();
  }, [employee?.id, startDate, endDate]);

  const topApps = useMemo(() => {
    const totalSec = groups.reduce((s, g) => s + (g.total_duration ?? 0), 0) || 1;
    const top = groups.slice().sort((a, b) => (b.total_duration ?? 0) - (a.total_duration ?? 0)).slice(0, 5);
    return {
      list: top.map((g) => ({
        name: g.app_name ?? "—",
        type: g.type ?? "—",
        time: secToHMS(g.total_duration ?? 0),
      })),
      chart: top.map((g, i) => ({
        name:       g.app_name ?? "—",
        value:      parseFloat(((( g.total_duration ?? 0) / totalSec) * 100).toFixed(1)),
        color:      CHART_COLORS[i] ?? "#6366f1",
        rawSeconds: g.total_duration ?? 0,
      })),
    };
  }, [groups]);

  const filtered = tableRows.filter((r) =>
    [r.app, r.name].some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  const size = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const paged = filtered.slice((currentPage - 1) * size, currentPage * size);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-800">{t("topau")}</h3>
            <LayoutGrid size={18} className="text-green-500" />
          </div>
          <p className="text-[10px] text-gray-400 mb-4 italic">{t("topAppsByDuration")}</p>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">{t("Loading")}…</p>
          ) : topApps.list.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 italic">{t("noDataAvailable")}</p>
          ) : (
            <div className="space-y-3">
              {topApps.list.map((app, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1.5 h-6 rounded-full bg-violet-400" />
                    <span className="text-sm text-gray-700 truncate">{app.name}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={`text-xs font-medium ${typeColor(app.type)}`}>{app.type}</span>
                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{app.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-1">{t("apChart")}</h3>
          <p className="text-[10px] text-gray-400 mb-4 italic">{t("topAppsByPercentage")}</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col gap-2.5 flex-1">
              {topApps.chart.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600 truncate">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 tabular-nums flex-shrink-0">{item.value}%</span>
                </div>
              ))}
            </div>
            <DonutChart data={topApps.chart} />
          </div>
        </div>
      </div>

      <TableToolbar
        pageSize={pageSize}
        onPageSizeChange={(v) => { setPageSize(v); setCurrentPage(1); }}
        search={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
      />

      <div className="rounded-2xl border border-gray-100 overflow-x-auto bg-gray-50">
        <Table className="min-w-[900px] w-full">
          <TableHeader>
            <TableRow className="bg-blue-50/80">
              <TableHead className="text-xs font-semibold text-blue-600">{t("application")}</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">{t("windowTitle")}</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">{t("startTime")}</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">{t("endTime")}</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">{t("activeTime")}</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700">{t("idleTime")}</TableHead>
              <TableHead className="text-xs font-semibold text-white bg-blue-400 text-center">{t("totalTime")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-gray-400 py-10">{t("Loading")}…</TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-gray-400 py-10 italic">{t("noDataAvailable")}</TableCell>
              </TableRow>
            ) : paged.map((row, i) => (
              <TableRow key={i} className="text-xs text-gray-600">
                <TableCell className="font-medium text-blue-600 whitespace-nowrap">{row.app}</TableCell>
                <TableCell className="max-w-[200px] truncate">{row.name}</TableCell>
                <TableCell className="whitespace-nowrap">{row.startTime}</TableCell>
                <TableCell className="whitespace-nowrap">{row.endTime}</TableCell>
                <TableCell className="whitespace-nowrap">{row.activeTime}</TableCell>
                <TableCell className="whitespace-nowrap">{row.idleTime}</TableCell>
                <TableCell className="text-center font-semibold whitespace-nowrap">{row.totalTime}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        filteredLength={filtered.length}
        pagedLength={paged.length}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
