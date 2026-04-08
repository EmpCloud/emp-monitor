import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Maximize2, Download } from "lucide-react";
import CustomSelect from "../../components/common/elements/CustomSelect";
import CustomTab from "../../components/common/elements/CustomTab";

import Customreport from "../../components/common/elements/Customreport";

const getEmployeeName = (emp) => {
  const first = emp?.first_name ?? "";
  const last = emp?.last_name ?? "";
  const full = `${first} ${last}`.trim();
  return full || emp?.name || emp?.employee_name || "-";
};

// Treat API `duration` as seconds and format as HH:MM:SS
const formatDuration = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "-";
  const total = Math.floor(n);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function TopProductiveEmployees({
  title,
  columns,
  filter,
  report,
  employees = [],
  loading = false
}) {
  const { t } = useTranslation();
  const resolvedTitle = title || t("topProductiveEmployees");
  const resolvedColumns = columns || [
    t("empName"),
    t("shift"),
    t("clockedIn"),
    t("clockedOut"),
    t("timeHoursCol")
  ];
  return (
    <>
      <div className="bg-white rounded-[21px] shadow-sm border border-slate-100 w-full max-w-4xl p-6 h-full">
        {/* ── Top Header Row ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-slate-900 font-semibold text-xl sm:text-2xl">
            {resolvedTitle}
          </h2>

          {report}
        </div>

        {filter}

        {/* ── Table ── */}
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200 hover:bg-transparent">
              {resolvedColumns.map((h) => (
                <TableHead
                  key={h}
                  className="text-slate-500 font-medium text-sm pb-3"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow className="border-b border-dashed border-slate-200 hover:bg-slate-50/60 transition-colors">
                <TableCell colSpan={resolvedColumns.length} className="py-6 text-slate-500 text-sm">
                  {t("loadingText")}
                </TableCell>
              </TableRow>
            ) : !employees?.length ? (
              <TableRow className="border-b border-dashed border-slate-200 hover:bg-slate-50/60 transition-colors">
                <TableCell colSpan={resolvedColumns.length} className="py-6 text-slate-500 text-sm">
                  {t("noEmployeesForFilters")}
                </TableCell>
              </TableRow>
            ) : employees.map((emp, idx) => (
              <TableRow
                key={emp?.id ?? emp?.employee_id ?? `${emp?.name ?? "emp"}-${idx}`}
                className="border-b border-dashed border-slate-200 hover:bg-slate-50/60 transition-colors"
              >
                {/* Dynamic column rendering (supports the 2-column dashboard usage) */}
                {resolvedColumns.map((col, cIdx) => {
                  const key = `${col}-${cIdx}`;

                  if (/employee\s*name/i.test(col)) {
                    return (
                      <TableCell key={key} className="py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp?.avatar ?? emp?.profile_image ?? "https://api.dicebear.com/7.x/adventurer/svg?seed=emp"}
                            alt={getEmployeeName(emp)}
                            className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 bg-slate-100 shrink-0"
                          />
                          <div>
                            <p className="text-slate-800 font-semibold text-sm leading-tight">
                              {getEmployeeName(emp)}
                            </p>
                            <p className="text-slate-400 text-xs mt-0.5">
                              {emp?.a_email ?? emp?.email ?? emp?.role ?? emp?.designation ?? "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    );
                  }

                  if (/time/i.test(col)) {
                    return (
                      <TableCell key={key} className="py-3.5 text-blue-500 font-semibold text-sm">
                        {formatDuration(emp?.duration ?? emp?.time_hours ?? emp?.timeHours ?? emp?.duration_seconds)}
                      </TableCell>
                    );
                  }

                  // fallback: show a dash for unknown columns
                  return (
                    <TableCell key={key} className="py-3.5 text-slate-700 font-semibold text-sm">
                      -
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
