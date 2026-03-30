import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Info, Eye, Trash2, CheckCircle, XCircle, Plus } from "lucide-react";
import PaginationComponent from "@/components/common/Pagination";
import CustomSelect from "@/components/common/elements/CustomSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import EmpTimeclaimLogo from "@/assets/reports/time_claim.svg";
import { useTimeClaimStore } from "@/page/protected/admin/time-claim/timeClaimStore";
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar";
import {
  REQUEST_TYPES, STATUS_MAP,
  createIdleRequest, createOfflineRequest, createAttendanceRequest,
  fetchIdleAppWebData, fetchTotalOfflineTime, fetchReasons,
} from "@/page/protected/admin/time-claim/service";

const REQUEST_TYPE_OPTIONS = [
  { key: "Idle", value: REQUEST_TYPES.IDLE },
  { key: "Offline", value: REQUEST_TYPES.OFFLINE },
  { key: "Break", value: REQUEST_TYPES.BREAK },
  { key: "Attendance", value: REQUEST_TYPES.ATTENDANCE },
];

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "0" },
  { label: "Approved", value: "1" },
  { label: "Declined", value: "2" },
];

const avatarColors = ["bg-blue-500", "bg-cyan-500", "bg-sky-500", "bg-amber-500", "bg-rose-500"];

const getInitials = (name) =>
  (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 1).toUpperCase();

const StatusBadge = ({ status }) => {
  const info = STATUS_MAP[status] || STATUS_MAP[0];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${info.bg} border ${info.border} ${info.color} text-[11px] font-semibold`}>
      <span className={`w-2 h-2 rounded-full ${info.color === "text-green-600" ? "bg-green-500" : info.color === "text-red-600" ? "bg-red-500" : "bg-amber-500"}`} />
      {info.label}
    </span>
  );
};

// ─── View Request Modal ─────────────────────────────────────────────────────

const ViewRequestModal = ({ open, onClose, row, onApprove, onDecline, requestType, isEmployee = false }) => {
  if (!row) return null;

  const isPending = row.status === 0;
  const isIdle = requestType === REQUEST_TYPES.IDLE;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>View Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-slate-500">Name:</span> <span className="font-medium">{row.name}</span></div>
            <div><span className="text-slate-500">Date:</span> <span className="font-medium">{row.date}</span></div>
            {isIdle ? (
              <>
                <div><span className="text-slate-500">Start Time:</span> <span className="font-medium">{row.startTime}</span></div>
                <div><span className="text-slate-500">End Time:</span> <span className="font-medium">{row.endTime}</span></div>
              </>
            ) : requestType === REQUEST_TYPES.OFFLINE ? (
              <div><span className="text-slate-500">Offline Time:</span> <span className="font-medium">{row.offlineTime}</span></div>
            ) : (
              <>
                <div><span className="text-slate-500">Start Time:</span> <span className="font-medium">{row.startTime}</span></div>
                <div><span className="text-slate-500">End Time:</span> <span className="font-medium">{row.endTime}</span></div>
              </>
            )}
            {row.computerName && <div><span className="text-slate-500">Computer:</span> <span className="font-medium">{row.computerName}</span></div>}
            {row.taskName && <div><span className="text-slate-500">Task:</span> <span className="font-medium">{row.taskName}</span></div>}
          </div>
          <div>
            <span className="text-slate-500">Reason:</span>
            <p className="mt-1 font-medium bg-slate-50 p-2 rounded">{row.reason}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Status:</span>
            <StatusBadge status={row.status} />
          </div>
          <div><span className="text-slate-500">Approver:</span> <span className="font-medium">{row.approverName}</span></div>

          {isIdle && row.activities?.length > 0 && (
            <div>
              <p className="text-slate-500 mb-1">Activities:</p>
              <div className="max-h-40 overflow-y-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-2 py-1 text-left">App/URL</th>
                      <th className="px-2 py-1 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.activities.map((act, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{act.url || act.app?.name || "-"}</td>
                        <td className="px-2 py-1">
                          {act.status === 1 ? <span className="text-green-600">Productive</span> :
                            act.status === 2 ? <span className="text-red-600">Unproductive</span> :
                              <span className="text-amber-600">Neutral</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        {isPending && !isEmployee && (
          <DialogFooter className="gap-2">
            <Button onClick={() => onApprove(row)} className="bg-green-600 hover:bg-green-700 text-xs">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button onClick={() => onDecline(row)} variant="destructive" className="text-xs">
              <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Delete Confirmation Modal ──────────────────────────────────────────────

const DeleteModal = ({ open, onClose, onConfirm }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Request</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-slate-600">Are you sure you want to delete this request?</p>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} className="text-xs">Cancel</Button>
        <Button variant="destructive" onClick={onConfirm} className="text-xs">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ─── Table Components Per Request Type ──────────────────────────────────────

const IdleTable = ({ rows, tableLoading, onView, onDelete, selectedIds, toggleSelect, toggleSelectAll }) => (
  <Table className="min-w-[1100px] w-full">
    <TableHeader>
      <TableRow className="bg-[#E9E9E9] h-12">
        <TableHead className="w-10 px-2">
          <input type="checkbox" onChange={toggleSelectAll} checked={rows.filter((r) => r.status === 0).length > 0 && rows.filter((r) => r.status === 0).every((r) => selectedIds.includes(r._id))} className="accent-blue-500" />
        </TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Full Name</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Date</TableHead>
        <TableHead className="text-xs px-2 font-semibold">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDF3FF] text-blue-500">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Start Time
          </span>
        </TableHead>
        <TableHead className="text-xs px-2 font-semibold">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF0F0] text-red-500">
            <span className="w-2 h-2 rounded-full bg-red-500" /> End Time
          </span>
        </TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Computer Name</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Reason</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Approver</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Status</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-white bg-[#7B9CDA] text-center">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody className="bg-[#F9F9F9]">
      {tableLoading ? (
        <TableRow><TableCell colSpan={10} className="text-center py-10"><Spinner /></TableCell></TableRow>
      ) : rows.length === 0 ? (
        <TableRow><TableCell colSpan={10} className="text-center text-sm text-gray-400 py-10">No records found</TableCell></TableRow>
      ) : rows.map((row, idx) => (
        <TableRow key={row._id} className="h-12 text-xs text-slate-600">
          <TableCell className="px-2">
            {row.status === 0 && <input type="checkbox" checked={selectedIds.includes(row._id)} onChange={() => toggleSelect(row._id)} className="accent-blue-500" />}
          </TableCell>
          <TableCell className="px-4">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-[10px] font-semibold text-white shrink-0`}>
                {getInitials(row.name)}
              </div>
              <span className="truncate text-[#121212]">{row.name}</span>
            </div>
          </TableCell>
          <TableCell className="px-4 text-[#121212]">{row.date}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.startTime}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.endTime}</TableCell>
          <TableCell className="px-4 truncate max-w-[180px]">{row.computerName}</TableCell>
          <TableCell className="px-4 max-w-[180px]"><span className="truncate text-[#121212]">{row.reason}</span></TableCell>
          <TableCell className="px-4 text-[#121212]">{row.approverName}</TableCell>
          <TableCell className="px-4"><StatusBadge status={row.status} /></TableCell>
          <TableCell className="px-4">
            <div className="flex items-center gap-1 justify-center">
              <Button size="sm" onClick={() => onView(row)} className="rounded-md bg-[#1A61DB] hover:bg-[#1A61DB]/90 text-[10px] font-semibold px-3 h-7 shadow-sm">
                View <Eye className="w-3 h-3 ml-1" />
              </Button>
              {row.status === 0 && (
                <Button size="sm" variant="ghost" onClick={() => onDelete(row)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const OfflineTable = ({ rows, tableLoading, onView, onDelete, selectedIds, toggleSelect, toggleSelectAll }) => (
  <Table className="min-w-[1000px] w-full">
    <TableHeader>
      <TableRow className="bg-[#E9E9E9] h-12">
        <TableHead className="w-10 px-2">
          <input type="checkbox" onChange={toggleSelectAll} checked={rows.filter((r) => r.status === 0).length > 0 && rows.filter((r) => r.status === 0).every((r) => selectedIds.includes(r._id))} className="accent-blue-500" />
        </TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Full Name</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Date</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Offline Time</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Computer Name</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Reason</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Approver</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Status</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-white bg-[#7B9CDA] text-center">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody className="bg-[#F9F9F9]">
      {tableLoading ? (
        <TableRow><TableCell colSpan={9} className="text-center py-10"><Spinner /></TableCell></TableRow>
      ) : rows.length === 0 ? (
        <TableRow><TableCell colSpan={9} className="text-center text-sm text-gray-400 py-10">No records found</TableCell></TableRow>
      ) : rows.map((row, idx) => (
        <TableRow key={row._id} className="h-12 text-xs text-slate-600">
          <TableCell className="px-2">
            {row.status === 0 && <input type="checkbox" checked={selectedIds.includes(row._id)} onChange={() => toggleSelect(row._id)} className="accent-blue-500" />}
          </TableCell>
          <TableCell className="px-4">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-[10px] font-semibold text-white shrink-0`}>{getInitials(row.name)}</div>
              <span className="truncate text-[#121212]">{row.name}</span>
            </div>
          </TableCell>
          <TableCell className="px-4 text-[#121212]">{row.date}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.offlineTime}</TableCell>
          <TableCell className="px-4 truncate max-w-[180px]">{row.computerName}</TableCell>
          <TableCell className="px-4 max-w-[180px] truncate text-[#121212]">{row.reason}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.approverName}</TableCell>
          <TableCell className="px-4"><StatusBadge status={row.status} /></TableCell>
          <TableCell className="px-4">
            <div className="flex items-center gap-1 justify-center">
              <Button size="sm" onClick={() => onView(row)} className="rounded-md bg-[#1A61DB] hover:bg-[#1A61DB]/90 text-[10px] font-semibold px-3 h-7 shadow-sm">
                View <Eye className="w-3 h-3 ml-1" />
              </Button>
              {row.status === 0 && (
                <Button size="sm" variant="ghost" onClick={() => onDelete(row)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const BreakTable = ({ rows, tableLoading, onView, onDelete, selectedIds, toggleSelect, toggleSelectAll }) => (
  <Table className="min-w-[1100px] w-full">
    <TableHeader>
      <TableRow className="bg-[#E9E9E9] h-12">
        <TableHead className="w-10 px-2">
          <input type="checkbox" onChange={toggleSelectAll} checked={rows.filter((r) => r.status === 0).length > 0 && rows.filter((r) => r.status === 0).every((r) => selectedIds.includes(r._id))} className="accent-blue-500" />
        </TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Full Name</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Date</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Break Time</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Start Time</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">End Time</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Reason</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Approver</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Status</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-white bg-[#7B9CDA] text-center">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody className="bg-[#F9F9F9]">
      {tableLoading ? (
        <TableRow><TableCell colSpan={10} className="text-center py-10"><Spinner /></TableCell></TableRow>
      ) : rows.length === 0 ? (
        <TableRow><TableCell colSpan={10} className="text-center text-sm text-gray-400 py-10">No records found</TableCell></TableRow>
      ) : rows.map((row, idx) => (
        <TableRow key={row._id} className="h-12 text-xs text-slate-600">
          <TableCell className="px-2">
            {row.status === 0 && <input type="checkbox" checked={selectedIds.includes(row._id)} onChange={() => toggleSelect(row._id)} className="accent-blue-500" />}
          </TableCell>
          <TableCell className="px-4">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-[10px] font-semibold text-white shrink-0`}>{getInitials(row.name)}</div>
              <span className="truncate text-[#121212]">{row.name}</span>
            </div>
          </TableCell>
          <TableCell className="px-4 text-[#121212]">{row.date}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.offlineTime}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.startTime}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.endTime}</TableCell>
          <TableCell className="px-4 max-w-[180px] truncate text-[#121212]">{row.reason}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.approverName}</TableCell>
          <TableCell className="px-4"><StatusBadge status={row.status} /></TableCell>
          <TableCell className="px-4">
            <div className="flex items-center gap-1 justify-center">
              <Button size="sm" onClick={() => onView(row)} className="rounded-md bg-[#1A61DB] hover:bg-[#1A61DB]/90 text-[10px] font-semibold px-3 h-7 shadow-sm">
                View <Eye className="w-3 h-3 ml-1" />
              </Button>
              {row.status === 0 && (
                <Button size="sm" variant="ghost" onClick={() => onDelete(row)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const AttendanceTable = ({ rows, tableLoading, onView }) => (
  <Table className="min-w-[1100px] w-full">
    <TableHeader>
      <TableRow className="bg-[#E9E9E9] h-12">
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Full Name</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Task</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Date</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Start Time</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">End Time</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Reason</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Approver</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-slate-700">Status</TableHead>
        <TableHead className="text-xs px-4 font-semibold text-white bg-[#7B9CDA] text-center">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody className="bg-[#F9F9F9]">
      {tableLoading ? (
        <TableRow><TableCell colSpan={9} className="text-center py-10"><Spinner /></TableCell></TableRow>
      ) : rows.length === 0 ? (
        <TableRow><TableCell colSpan={9} className="text-center text-sm text-gray-400 py-10">No records found</TableCell></TableRow>
      ) : rows.map((row, idx) => (
        <TableRow key={row._id} className="h-12 text-xs text-slate-600">
          <TableCell className="px-4">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-[10px] font-semibold text-white shrink-0`}>{getInitials(row.name)}</div>
              <span className="truncate text-[#121212]">{row.name}</span>
            </div>
          </TableCell>
          <TableCell className="px-4 text-[#121212]">{row.taskName}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.date}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.startTime}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.endTime}</TableCell>
          <TableCell className="px-4 max-w-[180px] truncate text-[#121212]">{row.reason}</TableCell>
          <TableCell className="px-4 text-[#121212]">{row.approverName}</TableCell>
          <TableCell className="px-4"><StatusBadge status={row.status} /></TableCell>
          <TableCell className="px-4">
            <div className="flex justify-center">
              <Button size="sm" onClick={() => onView(row)} disabled={row.status !== 0} className="rounded-md bg-[#1A61DB] hover:bg-[#1A61DB]/90 text-[10px] font-semibold px-3 h-7 shadow-sm disabled:opacity-50">
                View <Eye className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ─── Create Request Modal ────────────────────────────────────────────────────

const CreateRequestModal = ({ open, onClose, requestType, onSuccess }) => {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [reasons, setReasons] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedApps, setSelectedApps] = useState([]);
  const [offlineSlots, setOfflineSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [error, setError] = useState("");

  const isIdle = requestType === REQUEST_TYPES.IDLE;
  const isOffline = requestType === REQUEST_TYPES.OFFLINE;
  const isAttendance = requestType === REQUEST_TYPES.ATTENDANCE;

  useEffect(() => {
    if (!open) return;
    setDate(""); setStartTime(""); setEndTime(""); setReason("");
    setActivities([]); setSelectedApps([]); setOfflineSlots([]); setSelectedSlots([]);
    setError("");
    fetchReasons(requestType).then((list) => setReasons(Array.isArray(list) ? list : []));
  }, [open, requestType]);

  const handleGetActivities = async () => {
    if (!date || !startTime || !endTime) { setError("Date, start time and end time are required"); return; }
    setLoadingActivities(true); setError("");
    const res = await fetchIdleAppWebData({ date, startTime: `${date}T${startTime}`, endTime: `${date}T${endTime}` });
    setActivities(res?.code === 200 ? (res.data || []) : []);
    setSelectedApps([]);
    setLoadingActivities(false);
  };

  const handleGetOfflineSlots = async () => {
    if (!date) { setError("Please select a date"); return; }
    setLoadingActivities(true); setError("");
    const res = await fetchTotalOfflineTime(date);
    const slots = res?.code === 200 ? (res.data?.offlineEntities || res.data || []) : [];
    setOfflineSlots(Array.isArray(slots) ? slots : []);
    setSelectedSlots([]);
    setLoadingActivities(false);
  };

  const toggleApp = (id) => setSelectedApps((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  const toggleSlot = (idx) => setSelectedSlots((prev) => prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]);

  const formatSec = (s) => {
    const n = Number(s) || 0;
    const h = Math.floor(n / 3600); const m = Math.floor((n % 3600) / 60); const sec = n % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (!reason.trim()) { setError("Reason is required"); return; }
    setSaving(true); setError("");

    let res;
    if (isIdle) {
      if (!date || !startTime || !endTime) { setError("Date and time range are required"); setSaving(false); return; }
      res = await createIdleRequest({
        date, startTime: `${date}T${startTime}`, endTime: `${date}T${endTime}`,
        request_reason: reason, requestValue: "1", requestId: "", attendanceId: "",
        selectedApp: selectedApps,
      });
    } else if (isOffline) {
      const selected = selectedSlots.map((idx) => offlineSlots[idx]).filter(Boolean);
      if (!selected.length) { setError("Select at least one offline period"); setSaving(false); return; }
      res = await createOfflineRequest({
        selected_offline_timeclaim: selected.map((s) => ({
          date, reason, offline_time: s.offlineTime || s.offline_time || 0,
          start_time: s.from || s.start_time, end_time: s.to || s.end_time,
        })),
      });
    } else if (isAttendance) {
      if (!date || !startTime || !endTime) { setError("Date and time range are required"); setSaving(false); return; }
      res = await createAttendanceRequest({
        date, startTime: `${date}T${startTime}`, endTime: `${date}T${endTime}`,
        request_reason: reason, requestValue: "1", attendanceId: "",
      });
    }

    setSaving(false);
    if (res?.code === 200) {
      onSuccess?.();
      onClose(false);
    } else {
      setError(res?.msg || "Failed to create request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create {isIdle ? "Idle" : isOffline ? "Offline" : isAttendance ? "Attendance" : "Break"} Request</DialogTitle>
        </DialogHeader>

        {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded">{error}</p>}

        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().split("T")[0]} className="text-sm" />
          </div>

          {/* Time range (idle / attendance) */}
          {(isIdle || isAttendance) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="text-sm" />
              </div>
            </div>
          )}

          {/* Idle: Get Activities */}
          {isIdle && (
            <div>
              <Button size="sm" variant="outline" onClick={handleGetActivities} disabled={loadingActivities} className="text-xs mb-2">
                {loadingActivities ? "Loading..." : "Get Activity List"}
              </Button>
              {activities.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded text-xs">
                  <table className="w-full">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left w-8"><input type="checkbox" onChange={(e) => setSelectedApps(e.target.checked ? activities.map((a) => a._id || a.activity_id) : [])} checked={selectedApps.length === activities.length && activities.length > 0} className="accent-blue-500" /></th>
                        <th className="px-2 py-1 text-left">App / URL</th>
                        <th className="px-2 py-1 text-left">Ranking</th>
                        <th className="px-2 py-1 text-left">Idle Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((act) => {
                        const id = act._id || act.activity_id;
                        return (
                          <tr key={id} className="border-t">
                            <td className="px-2 py-1"><input type="checkbox" checked={selectedApps.includes(id)} onChange={() => toggleApp(id)} className="accent-blue-500" /></td>
                            <td className="px-2 py-1 truncate max-w-[180px]">{act.url || "-"}</td>
                            <td className="px-2 py-1">{act.prodRanking || "-"}</td>
                            <td className="px-2 py-1">{formatSec(act.idleTime)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Offline: Get Slots */}
          {isOffline && (
            <div>
              <Button size="sm" variant="outline" onClick={handleGetOfflineSlots} disabled={loadingActivities || !date} className="text-xs mb-2">
                {loadingActivities ? "Loading..." : "Get Offline Periods"}
              </Button>
              {offlineSlots.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded text-xs">
                  <table className="w-full">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 w-8"><input type="checkbox" onChange={(e) => setSelectedSlots(e.target.checked ? offlineSlots.map((_, i) => i) : [])} checked={selectedSlots.length === offlineSlots.length && offlineSlots.length > 0} className="accent-blue-500" /></th>
                        <th className="px-2 py-1 text-left">Start</th>
                        <th className="px-2 py-1 text-left">End</th>
                        <th className="px-2 py-1 text-left">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offlineSlots.map((slot, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1"><input type="checkbox" checked={selectedSlots.includes(idx)} onChange={() => toggleSlot(idx)} className="accent-blue-500" /></td>
                          <td className="px-2 py-1">{new Date(slot.from || slot.start_time).toLocaleTimeString()}</td>
                          <td className="px-2 py-1">{new Date(slot.to || slot.end_time).toLocaleTimeString()}</td>
                          <td className="px-2 py-1">{formatSec(slot.offlineTime || slot.offline_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            {reasons.length > 0 ? (
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
              >
                <option value="">Select reason</option>
                {reasons.map((r) => (
                  <option key={r._id || r.reason_value} value={r.reason_name || r.reason_value}>{r.reason_name}</option>
                ))}
                <option value="__other">Other</option>
              </select>
            ) : null}
            {(reasons.length === 0 || reason === "__other") && (
              <Input
                placeholder="Enter reason"
                value={reason === "__other" ? "" : reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 text-sm"
              />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={() => onClose(false)} className="text-xs">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-xs">
            {saving ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Spinner = () => (
  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    Loading...
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

const EmpTimeclaim = ({ isEmployee = false }) => {
  const store = useTimeClaimStore();
  const {
    rows, totalDocs, filters, loading, tableLoading, autoApprove, selectedIds,
    setFilters, loadInitialData, fetchData, switchRequestType,
    toggleSelect, toggleSelectAll, bulkAction,
    approveRequest, declineRequest, deleteRequest,
    approveOffline, declineOffline, approveBreak, declineBreak,
  } = store;

  const [search, setSearch] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const debounceRef = useRef(null);
  const initialLoad = useRef(true);

  // Date range picker (shared calendar UI)
  const handleDateRangeChange = (startDate, endDate) => {
    if (!startDate || !endDate) return;
    setFilters({ startDate, endDate, skip: 0, page: 1 });
  };

  // Initial load
  useEffect(() => { loadInitialData(); }, []);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters({ searchText: search, skip: 0, page: 1 });
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Re-fetch on filter change
  useEffect(() => {
    if (initialLoad.current) { initialLoad.current = false; return; }
    fetchData();
  }, [
    filters.startDate, filters.endDate, filters.status, filters.requestType,
    filters.searchText, filters.skip, filters.limit, filters.sortName, filters.sortOrder,
  ]);

  // Computed
  const totalPages = Math.max(1, Math.ceil(totalDocs / filters.limit));
  const currentPage = filters.page;
  const isAttendance = filters.requestType === REQUEST_TYPES.ATTENDANCE;

  // Handlers
  const handleRequestType = (value) => switchRequestType(value);

  const handlePageSizeChange = useCallback((v) => {
    const num = parseInt(v, 10);
    setFilters({ limit: Number.isNaN(num) ? 10 : num, skip: 0, page: 1 });
  }, [setFilters]);

  const handlePageChange = useCallback((p) => {
    setFilters({ page: p, skip: (p - 1) * filters.limit });
  }, [setFilters, filters.limit]);

  const handleView = (row) => setViewRow(row);

  const handleApprove = async (row) => {
    if (filters.requestType === REQUEST_TYPES.IDLE) await approveRequest(row._id);
    else if (filters.requestType === REQUEST_TYPES.OFFLINE) await approveOffline(row._id, row.employeeId, row.offlineTimeRaw, row.date);
    else if (filters.requestType === REQUEST_TYPES.BREAK) await approveBreak(row._id);
    else await approveRequest(row._id);
    setViewRow(null);
  };

  const handleDecline = async (row) => {
    if (filters.requestType === REQUEST_TYPES.IDLE) await declineRequest(row._id);
    else if (filters.requestType === REQUEST_TYPES.OFFLINE) await declineOffline(row._id, row.employeeId, row.offlineTimeRaw, row.date);
    else if (filters.requestType === REQUEST_TYPES.BREAK) await declineBreak(row._id);
    else await declineRequest(row._id);
    setViewRow(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow) return;
    const forBreak = filters.requestType === REQUEST_TYPES.BREAK ? "ForBreak" : "";
    await deleteRequest(deleteRow._id, forBreak);
    setDeleteRow(null);
  };

  const handleAutoApproveToggle = () => store.toggleAutoApprove();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-20 h-20 flex items-center justify-center">
          <video src="/src/assets/ai.webm" autoPlay loop playsInline muted className="w-full h-full object-contain" />
        </div>
      </div>
    );
  }

  const tableProps = {
    rows, tableLoading, selectedIds,
    onView: handleView,
    onDelete: (row) => setDeleteRow(row),
    toggleSelect,
    toggleSelectAll,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
      {/* Header */}
      <div className="flex relative items-start justify-between gap-4 mb-8">
        <div className="border-l-2 border-blue-500 pl-4">
          <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
            <span className="font-semibold">Time</span>{" "}
            <span className="font-normal text-gray-500">Claim</span>
          </h2>
          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
            Manage employee time claim requests for idle, offline,
            <br />break, and attendance adjustments.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            className="rounded-xl bg-blue-500 hover:bg-blue-600 px-5 text-xs font-semibold shadow-sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Create Request
          </Button>
          <div className="hidden lg:flex items-end gap-1">
            <img alt="timeclaim" className="w-24" src={EmpTimeclaimLogo} />
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] gap-x-6 gap-y-4 mb-7 items-start">
        {/* Date Range */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1.5">
            Select Date Ranges :
            <Info className="w-3.5 h-3.5 text-blue-500" />
          </label>
            <DateRangeCalendar
              startDate={filters.startDate}
              endDate={filters.endDate}
              onChange={handleDateRangeChange}
            />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
          <CustomSelect
            placeholder="All"
            items={STATUS_OPTIONS}
            selected={filters.status}
            onChange={(v) => setFilters({ status: v, skip: 0, page: 1 })}
            width="full"
          />
        </div>

        {/* Request Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Request Type</label>
          <div className="flex items-center gap-2 flex-nowrap">
            {REQUEST_TYPE_OPTIONS.map(({ key, value }) => (
              <button
                key={key}
                onClick={() => handleRequestType(value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs whitespace-nowrap cursor-pointer transition-colors ${
                  filters.requestType === value
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 bg-white text-slate-500"
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  filters.requestType === value ? "border-blue-500" : "border-gray-300"
                }`}>
                  {filters.requestType === value && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </span>
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Auto Approve (admin/manager only) */}
        {!isEmployee && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Auto Approve</label>
            <div className="flex items-center gap-2 h-10">
              <button
                onClick={handleAutoApproveToggle}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${autoApprove ? "bg-blue-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${autoApprove ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm text-slate-600">{autoApprove ? "On" : "Off"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons (admin/manager only) */}
      {!isEmployee && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-7">
          <Button size="lg" onClick={() => bulkAction(1)} className="rounded-md bg-green-600 hover:bg-green-700 px-5 text-xs font-semibold shadow-sm">
            <CheckCircle className="w-4 h-4 mr-1" /> Approve Selected ({selectedIds.length})
          </Button>
          <Button size="lg" onClick={() => bulkAction(2)} className="rounded-md bg-red-500 hover:bg-red-600 px-5 text-xs font-semibold shadow-sm">
            <XCircle className="w-4 h-4 mr-1" /> Decline Selected ({selectedIds.length})
          </Button>
        </div>
      )}

      {/* Show entries + Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-gray-500 font-medium">Show</span>
          <Select value={String(filters.limit)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-16 text-[13px] rounded-lg border-gray-200">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {["10", "25", "50", "100"].map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[13px] text-gray-500 font-medium">Entries</span>
          </div>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
        {filters.requestType === REQUEST_TYPES.IDLE && <IdleTable {...tableProps} />}
        {filters.requestType === REQUEST_TYPES.OFFLINE && <OfflineTable {...tableProps} />}
        {filters.requestType === REQUEST_TYPES.BREAK && <BreakTable {...tableProps} />}
        {filters.requestType === REQUEST_TYPES.ATTENDANCE && <AttendanceTable rows={rows} tableLoading={tableLoading} onView={handleView} />}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5">
        <p className="text-[13px] text-gray-500 font-medium">
          Showing{" "}
          <span className="font-bold">{totalDocs === 0 ? 0 : (currentPage - 1) * filters.limit + 1}</span>{" "}
          to <span className="font-bold">{Math.min(currentPage * filters.limit, totalDocs)}</span>{" "}
          of <span className="font-bold">{totalDocs}</span>
        </p>
        <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>

      {/* Modals */}
      <ViewRequestModal
        open={!!viewRow}
        onClose={() => setViewRow(null)}
        row={viewRow}
        onApprove={handleApprove}
        onDecline={handleDecline}
        requestType={filters.requestType}
        isEmployee={isEmployee}
      />
      <DeleteModal
        open={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        onConfirm={handleDeleteConfirm}
      />
      <CreateRequestModal
        open={createOpen}
        onClose={setCreateOpen}
        requestType={filters.requestType}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default EmpTimeclaim;
