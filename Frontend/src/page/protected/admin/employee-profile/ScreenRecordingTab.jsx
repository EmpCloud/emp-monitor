import { useState, useEffect } from "react";
import { Search, Calendar, Play, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CustomSelect from "@/components/common/elements/CustomSelect";
import PaginationComponent from "@/components/common/Pagination";
import { fetchScreenRecords } from "./service";
import moment from "moment";

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const v = String(i).padStart(2, "0");
  return { label: `${v}:00`, value: v };
});

function RecordingCard({ recording, apiBase }) {
  const videoSrc = recording.video_path
    ? `${apiBase}${recording.video_path}`
    : recording.video_url ?? null;

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-violet-400 transition-all cursor-pointer group">
      <div className="aspect-[4/3] relative flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {videoSrc ? (
          <video src={videoSrc} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        ) : (
          <div className="absolute inset-0 opacity-30 p-2 overflow-hidden">
            <div className="text-[6px] text-green-400 font-mono leading-tight">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i}>{">"} npm run build --output...</div>
              ))}
            </div>
          </div>
        )}
        <div className="relative z-10 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <Play size={20} className="text-white ml-0.5" fill="white" />
        </div>
      </div>
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-[10px] text-gray-400 truncate">
          {recording.time ?? recording.start_time ?? recording.created_at ?? "—"}
        </p>
      </div>
    </div>
  );
}

// Group recordings into hour slots
function groupByHour(recordings) {
  const map = {};
  recordings.forEach((r) => {
    const raw = r.time ?? r.start_time ?? r.created_at ?? "";
    const hour = raw ? String(raw).slice(11, 13) : "00";
    const key = `${hour}:00 - ${String(Number(hour) + 1).padStart(2, "0")}:00`;
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  return Object.entries(map).map(([range, recordings]) => ({ range, recordings }));
}

export default function ScreenRecordingTab({ employee }) {
  const [date, setDate]         = useState(moment().format("YYYY-MM-DD"));
  const [fromTime, setFromTime] = useState("00");
  const [toTime, setToTime]     = useState("23");
  const [slots, setSlots]       = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const apiBase = import.meta.env.VITE_API_URL;

  const load = async () => {
    if (!employee?.id) return;
    setLoading(true);
    const res = await fetchScreenRecords(employee.id, date, fromTime, toTime);
    if (res?.code === 200 && Array.isArray(res.data)) {
      setSlots(groupByHour(res.data));
      setTotalCount(res.data.length);
    } else {
      setSlots([]);
      setTotalCount(0);
    }
    setCurrentPage(1);
    setLoading(false);
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="space-y-1 w-full">
          <label className="text-xs font-medium text-gray-600">Select Date</label>
          <div className="relative w-full">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="date"
              value={date}
              max={moment().format("YYYY-MM-DD")}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 h-10 w-full rounded-xl border-gray-200 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1 w-full">
          <label className="text-xs font-medium text-gray-600">From Time</label>
          <CustomSelect placeholder="From" items={timeOptions} selected={fromTime} onChange={setFromTime} width />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">To Time</label>
          <CustomSelect placeholder="To" items={timeOptions} selected={toTime} onChange={setToTime} width />
        </div>
        <div className="flex items-end w-full">
          <Button
            onClick={load}
            disabled={loading}
            className="h-10 px-6 rounded-xl w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold gap-2"
          >
            <Search size={14} />
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>

      {/* Slots */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm text-gray-400">Loading recordings…</span>
        </div>
      ) : slots.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm text-gray-400 italic">No recordings found for the selected period.</span>
        </div>
      ) : slots.map((slot, i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            <span className="text-sm font-medium text-gray-700">{slot.range}</span>
            <button className="ml-auto w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {slot.recordings.map((rec, ri) => (
              <RecordingCard key={rec.id ?? ri} recording={rec} apiBase={apiBase} />
            ))}
          </div>
        </div>
      ))}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-2">
        <p className="text-[13px] text-gray-500">
          Total <span className="font-bold text-blue-600">{totalCount}</span> recordings
        </p>
        <PaginationComponent
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(totalCount / 10))}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
