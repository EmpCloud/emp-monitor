import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import TableToolbar from "@/components/common/TableToolbar";
import PaginationFooter from "@/components/common/PaginationFooter";
import { fetchKeystrokes } from "./service";
import { fmtDateTime, diffHMS } from "@/lib/dateTimeUtils";

const columnDefs = [
  { key: "#",          labelKey: "#",            className: "text-xs font-semibold text-gray-700 w-10" },
  { key: "type",       labelKey: "type",         className: "text-xs font-semibold text-gray-700" },
  { key: "appDomain",  labelKey: "app/Domain",   className: "text-xs font-semibold text-gray-700" },
  { key: "keyStrokes", labelKey: "keystroke",     className: "text-xs font-semibold text-gray-700" },
  { key: "startTime",  labelKey: "startTime",    className: "text-xs font-semibold text-gray-700" },
  { key: "endTime",    labelKey: "endTime",       className: "text-xs font-semibold text-gray-700" },
  { key: "totalTime",  labelKey: "totalTime",    className: "text-xs font-semibold text-white bg-blue-400 text-center" },
];

// type=1 → Application, type=2 → Website
function mapRow(item, idx) {
  const isApp = Number(item.type) === 1;
  return {
    "#":        idx + 1,
    type:       isApp ? "Application" : "Website",
    appDomain:  isApp ? (item.app_name ?? "—") : (item.domain_name ?? item.app_name ?? "—"),
    keyStrokes: item.keystrokes ?? "—",
    startTime:  fmtDateTime(item.start_time),
    endTime:    fmtDateTime(item.end_time),
    totalTime:  diffHMS(item.start_time, item.end_time),
  };
}

export default function KeyStrokesTab({ employee, startDate, endDate }) {
  const { t } = useTranslation();
  const columns = columnDefs.map((col) => ({ ...col, label: col.key === "#" ? "#" : t(col.labelKey) }));
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");
  const [pageSize, setPageSize]   = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!employee?.id || !startDate || !endDate) return;
    const load = async () => {
      setLoading(true);
      const res = await fetchKeystrokes(employee.id, startDate, endDate);
      const raw = Array.isArray(res?.data) ? res.data : [];
      setRows(raw.map(mapRow));
      setCurrentPage(1);
      setLoading(false);
    };
    load();
  }, [employee?.id, startDate, endDate]);

  const filtered = rows.filter((r) =>
    [r.appDomain, r.keyStrokes, r.type].some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase())
    )
  );

  const size = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const paged = filtered.slice((currentPage - 1) * size, currentPage * size);

  return (
    <div className="space-y-4">
      <TableToolbar
        pageSize={pageSize}
        onPageSizeChange={(v) => { setPageSize(v); setCurrentPage(1); }}
        search={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
      />

      <div className="rounded-2xl border border-gray-100 overflow-x-auto bg-gray-50">
        <Table className="min-w-[800px] w-full">
          <TableHeader>
            <TableRow className="bg-blue-50/80">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-gray-400 py-10">{t("Loading")}…</TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-gray-400 py-10 italic">
                  {t("noDataAvailableInTable")}
                </TableCell>
              </TableRow>
            ) : paged.map((row, i) => (
              <TableRow key={i} className="text-xs text-gray-600">
                {columns.map((col) => (
                  <TableCell key={col.key} className="whitespace-nowrap max-w-[220px] truncate">
                    {row[col.key]}
                  </TableCell>
                ))}
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
