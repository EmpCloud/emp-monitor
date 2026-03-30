import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const defaultData = [
  {
    activity: "Office Hours",
    highlight: true,
    today: "45:37:40 hr",
    yesterday: "71:59:57 hr",
    thisWeek: "259:56:78 hr",
  },
  {
    activity: "Active Hours",
    highlight: false,
    today: "45:37:40 hr",
    yesterday: "71:59:57 hr",
    thisWeek: "259:56:78 hr",
  },
  {
    activity: "Idle Hours",
    highlight: false,
    today: "45:37:40 hr",
    yesterday: "71:59:57 hr",
    thisWeek: "259:56:78 hr",
  },
  {
    activity: "Productive Hours",
    highlight: false,
    today: "45:37:40 hr",
    yesterday: "71:59:57 hr",
    thisWeek: "259:56:78 hr",
  },
  {
    activity: "Non Productive Hours",
    highlight: false,
    today: "45:37:40 hr",
    yesterday: "71:59:57 hr",
    thisWeek: "259:56:78 hr",
  },
  {
    activity: "Natural Hours",
    highlight: false,
    today: "45:37:40 hr",
    yesterday: "71:59:57 hr",
    thisWeek: "259:56:78 hr",
  },
];

const Pill = ({ value, variant }) => {
  const styles = {
    green: "bg-green-100 text-green-500",
    pink: "bg-pink-100 text-pink-400",
    blue: "bg-blue-100 text-blue-400",
  };
  return (
    <span
      className={`inline-block px-4 py-1.5 rounded-full text-xs  font-medium ${styles[variant]}`}
    >
      {value}
    </span>
  );
};

import Customreport from "../../components/common/elements/Customreport";

export default function ActivityBreakDown({ data = [] }) {
  const rows = data?.length ? data : defaultData;
  return (
    <>
      <div className="bg-white rounded-[21px] shadow-sm border border-slate-100 p-4 h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-900 font-semibold text-xl sm:text-2xl">
            Activity Break Down
          </h2>
          <Customreport showMaximize={true} showDownload={true} />
        </div>

        {/* Table */}
        <Table className="">
          <TableHeader>
            <TableRow className="border-b border-slate-200 hover:bg-transparent ">
              <TableHead className="text-slate-800 font-semibold text-xs pb-3 w-[220px]">
                Activity
              </TableHead>
              <TableHead className="text-slate-800 font-semibold text-xs pb-3">
                Today
              </TableHead>
              <TableHead className="text-slate-800 font-semibold text-xs pb-3">
                Yesterday
              </TableHead>
              <TableHead className="text-slate-800 font-semibold text-xs pb-3">
                This Week
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.activity}
                className="border-b border-dashed border-slate-200 hover:bg-slate-50/60 transition-colors"
              >
                {/* Activity name */}
                <TableCell
                  className={`py-2 text-xs font-medium ${row.highlight ? "text-blue-500" : "text-slate-600"}`}
                >
                  {row.activity}
                </TableCell>

                {/* Today */}
                <TableCell className="py-2 text-xs">
                  {row.highlight ? (
                    <Pill value={row.today} variant="green" />
                  ) : (
                    <span className=" font-medium text-green-500">
                      {row.today}
                    </span>
                  )}
                </TableCell>

                {/* Yesterday */}
                <TableCell className="py-2 ">
                  {row.highlight ? (
                    <Pill value={row.yesterday} variant="pink" />
                  ) : (
                    <span className="text-xs font-medium text-pink-400">
                      {row.yesterday}
                    </span>
                  )}
                </TableCell>

                {/* This Week */}
                <TableCell className="py-2">
                  {row.highlight ? (
                    <Pill value={row.thisWeek} variant="blue" />
                  ) : (
                    <span className="text-xs font-medium text-blue-400">
                      {row.thisWeek}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
