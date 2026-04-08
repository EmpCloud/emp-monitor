import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import "@/components/common/employee-details/emp.css";
import TableToolbar from "@/components/common/TableToolbar";
import PaginationFooter from "@/components/common/PaginationFooter";
import { fetchTimesheets } from "./service";
import { secToHMS, fmtDateTime } from "@/lib/dateTimeUtils";

const columnDefs = [
  { key: "clockIn",            labelKey: "clockin",         className: "text-gray-800" },
  { key: "clockOut",           labelKey: "clockout",        className: "text-gray-800" },
  { key: "totalHours",         labelKey: "totalHours",      className: "text-gray-800" },
  { key: "officeHours",        labelKey: "officeHours",     className: "text-gray-800" },
  { key: "activeHours",        labelKey: "activeHours",     className: "text-gray-800" },
  { key: "productiveHours",    labelKey: "prodHour",        className: "text-green-600", hasInfo: true },
  { key: "unproductiveHours",  labelKey: "unProdHour",      className: "text-red-500",   hasInfo: true },
];

// API: { code, data: { user_data: [{start_time, end_time, total_time, office_time,
//   computer_activities_time, productive_duration, non_productive_duration}] } }
const mapRow = (d) => ({
  clockIn:           fmtDateTime(d.start_time),
  clockOut:          fmtDateTime(d.end_time),
  totalHours:        secToHMS(d.total_time),
  officeHours:       secToHMS(d.office_time ?? d.computer_activities_time),
  activeHours:       secToHMS(d.computer_activities_time),
  productiveHours:   secToHMS(d.productive_duration),
  unproductiveHours: secToHMS(d.non_productive_duration),
});

export default function TimesheetsTab({ employee, startDate, endDate }) {
  const { t } = useTranslation();
  const columns = columnDefs.map((col) => ({ ...col, label: t(col.labelKey) }));
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [pageSize, setPageSize]     = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!employee?.id || !startDate || !endDate) return;
    const load = async () => {
      setLoading(true);
      const res = await fetchTimesheets(employee.id, startDate, endDate);
      const raw = Array.isArray(res?.data?.user_data) ? res.data.user_data : [];
      setRows(raw.map(mapRow));
      setCurrentPage(1);
      setLoading(false);
    };
    load();
  }, [employee?.id, startDate, endDate]);

  const filtered = rows.filter((r) =>
    Object.values(r).some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  const size = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const paged = filtered.slice((currentPage - 1) * size, currentPage * size);

  return (
    <div className="space-y-5">
      <TableToolbar
        pageSize={pageSize}
        onPageSizeChange={(v) => { setPageSize(v); setCurrentPage(1); }}
        search={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
      />

      <div className="rounded-2xl tbl-scroll">
        <table className="min-w-[900px] w-full border-collapse">
          <thead>
            <tr style={{ background: "linear-gradient(135deg, #e0f2fe 0%, #cffafe 40%, #dbeafe 100%)" }}>
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 text-[13px] font-bold text-center whitespace-nowrap ${col.className} ${i === 0 ? "rounded-tl-2xl" : ""} ${i === columns.length - 1 ? "rounded-tr-2xl" : ""}`}
                >
                  {col.label}
                  {col.hasInfo && <Info size={13} className="inline ml-1 text-blue-400 -mt-0.5" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-sm text-gray-400">{t("Loading")}…</td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-sm text-gray-400 italic">{t("noDataAvailable")}</td>
              </tr>
            ) : paged.map((row, ri) => (
              <tr key={ri} className="bg-white">
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={`px-4 py-4 text-[13px] text-center whitespace-nowrap ${
                      col.key === "productiveHours"   ? "text-green-600 font-semibold" :
                      col.key === "unproductiveHours" ? "text-red-500 font-semibold"  : "text-gray-600"
                    } ${i < columns.length - 1 ? "border-r border-gray-200" : ""}`}
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
