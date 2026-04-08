import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CustomSelect from "../../components/common/elements/CustomSelect";
import CustomTab from "../../components/common/elements/CustomTab";

import Customreport from "../../components/common/elements/Customreport";

const getEmployeeName = (emp) => {
  const first = emp?.first_name ?? "";
  const last = emp?.last_name ?? "";
  const full = `${first} ${last}`.trim();
  return full || emp?.name || emp?.employee_name || "-";
};

// seconds → HH:MM:SS
const formatDuration = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "-";
  const total = Math.floor(n);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s,
  ).padStart(2, "0")}`;
};

export default function NonActiveEmp({
  title,
  employees = [],
  loading = false,
  report,
  filter,
}) {
  const { t } = useTranslation();
  const resolvedTitle = title || t("topNonActiveEmployees");
  // Aggregate by employee and sort ascending by active time
  const rows = (() => {
    const byEmp = new Map();

    (employees || []).forEach((emp) => {
      const key = emp?.employee_id ?? emp?.id;
      if (!key) return;

      const current = byEmp.get(key) || {
        ...emp,
        computer_activities_time: 0,
      };

      const add = Number(emp?.computer_activities_time ?? 0);
      current.computer_activities_time += Number.isFinite(add) ? add : 0;

      byEmp.set(key, current);
    });

    return Array.from(byEmp.values())
      .sort(
        (a, b) =>
          (a?.computer_activities_time ?? 0) -
          (b?.computer_activities_time ?? 0),
      )
      .slice(0, 10);
  })();

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

        {/* ── Tabs + Filters Row ── */}
        {filter}

        {/* Loading / Empty states */}
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-500">
            {t("loadingText")}
          </div>
        ) : !rows.length ? (
          <div className="py-6 text-center text-sm text-slate-500">
            {t("noEmployeesForFilters")}
          </div>
        ) : null}

        {/* ── Table ── */}
        {rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 hover:bg-transparent">
                {[t("empName"), t("timeHoursLabel")].map((h) => (
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
              {rows.map((emp, idx) => (
                <TableRow
                  key={emp?.id ?? emp?.employee_id ?? `non-active-${idx}`}
                  className="border-b border-dashed border-slate-200 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Employee Name + Avatar */}
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          emp?.avatar ??
                          emp?.profile_image ??
                          "https://api.dicebear.com/7.x/adventurer/svg?seed=emp"
                        }
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

                  {/* Time Hours */}
                  <TableCell className="py-3.5 text-blue-500 font-semibold text-sm">
                    {formatDuration(emp?.computer_activities_time)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
