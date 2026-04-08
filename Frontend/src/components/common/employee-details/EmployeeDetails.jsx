import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserPlus, Upload, RefreshCw, UserCheck, UserX, Trash2,
  Download, Search, Settings, ArrowUpDown, Eye, Edit, Trash,
  Monitor, FileDiff, FileBox, Loader2, UserCog,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import employee from "@/assets/employe.png";
import PaginationComponent from "@/components/common/Pagination";
import RegisterEmployeeModal from "./RegisterEmployeeModal";
import EditEmployeeModal from "./EditEmployeeModal";
import BulkUpdateModal from "./BulkUpdateModal";
import BulkRegisterModal from "./BulkRegisterModal";
import DeletedUsersModal from "./DeletedUsersModal";
import {
  deleteEmployee, deleteMultipleEmployees,
  suspendMultipleEmployees, activateMultipleEmployees,
} from "@/page/protected/admin/employee-details/service";
import { useTranslation } from "react-i18next";
import "./emp.css";

const avatarColors = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500",
  "bg-orange-400", "bg-rose-500", "bg-teal-500", "bg-cyan-500",
];

const RowAvatar = ({ name, idx }) => {
  const color = avatarColors[idx % avatarColors.length];
  return (
    <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
};

/** Small confirm dialog used for delete / suspend / activate */
function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, confirmClass, onConfirm, loading }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-6 border-0 shadow-xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h3 className="text-[17px] font-bold text-gray-800">{title}</h3>
          <p className="text-[13px] text-gray-500 leading-relaxed">{description}</p>
        </div>
        <DialogFooter className="mt-4 flex gap-3 justify-center">
          <DialogClose asChild>
            <Button variant="outline" className="h-9 px-6 rounded-xl text-[13px]">{t("cancel")}</Button>
          </DialogClose>
          <Button onClick={onConfirm} disabled={loading}
            className={`h-9 px-6 rounded-xl text-[13px] text-white gap-2 ${confirmClass}`}>
            {loading && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TAB_STATUS = { active: "1", suspended: "2", deleted: "3" };

export default function EmployeeDetailsTable({
  filter,
  employees = [],
  loading = false,
  activeTab,
  onTabChange,
  onRefresh,
  filterData = {},
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState("10");

  // Modal open states
  const [registerOpen, setRegisterOpen] = useState(false);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkRegisterOpen, setBulkRegisterOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deletedUsersOpen, setDeletedUsersOpen] = useState(false);

  // Confirm dialog state
  const [confirm, setConfirm] = useState(null); // { type, ids, label }
  const [actionLoading, setActionLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const perPage = Number(entriesPerPage);
  const routeBase = location.pathname.startsWith("/non-admin") ? "/non-admin" : "/admin";
  const employeeProfilePath = `${routeBase}/get-employee-details`;

  const handleExport = () => {
    if (filtered.length === 0) return;
    const headers = [t("emp_full_name"),t("emp_email_id"),t("location"),t("department"),t("emp_shift"),t("emp_role"),t("emp_emp_code"),t("emp_os"),t("emp_computer_name"),t("version")];
    const rows = filtered.map((e) => [
      e.name, e.email, e.location, e.department, e.shift,
      e.role, e.empCode, e.os, e.computer, e.version,
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { filtered, paginated, totalPages } = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    const q = (searchQuery || "").trim().toLowerCase();
    const filteredList = !q
      ? list
      : list.filter((e) => {
          const fields = [e.name, e.email, e.empCode, e.department, e.location, e.shift, e.role];
          return fields.some((f) => (f || "").toLowerCase().includes(q));
        });
    const total = Math.max(1, Math.ceil(filteredList.length / perPage));
    return {
      filtered: filteredList,
      paginated: filteredList.slice((currentPage - 1) * perPage, currentPage * perPage),
      totalPages: total,
    };
  }, [employees, searchQuery, currentPage, perPage]);

  const toggleRow = (id) =>
    setSelectedRows((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelectedRows((prev) => prev.length === paginated.length ? [] : paginated.map((e) => e.id));

  const handleTabChange = (key) => {
    setSelectedRows([]);
    setSearchQuery("");
    setCurrentPage(1);
    onTabChange?.(key);
  };

  // ── Row actions ──────────────────────────────────────────────────────────
  const openDelete = (id) => setConfirm({ type: "delete", ids: [id], label: t("emp_delete_this_employee") });
  const openSuspend = (id) => setConfirm({ type: "suspend", ids: [id], label: t("emp_suspend_this_employee") });
  const openActivate = (id) => setConfirm({ type: "activate", ids: [id], label: t("emp_restore_this_employee") });

  // ── Bulk actions ─────────────────────────────────────────────────────────
  const openBulkDelete   = () => setConfirm({ type: "delete",   ids: selectedRows, label: t("emp_delete_count_employees", { count: selectedRows.length }) });
  const openBulkSuspend  = () => setConfirm({ type: "suspend",  ids: selectedRows, label: t("emp_suspend_count_employees", { count: selectedRows.length }) });
  const openBulkActivate = () => setConfirm({ type: "activate", ids: selectedRows, label: t("emp_restore_count_employees", { count: selectedRows.length }) });

  const executeConfirm = async () => {
    if (!confirm) return;
    setActionLoading(true);
    let res = null;
    if (confirm.type === "delete") {
      res = confirm.ids.length === 1
        ? await deleteEmployee(confirm.ids[0])
        : await deleteMultipleEmployees(confirm.ids);
    } else if (confirm.type === "suspend") {
      res = await suspendMultipleEmployees(confirm.ids);
    } else if (confirm.type === "activate") {
      res = await activateMultipleEmployees(confirm.ids);
    }
    setActionLoading(false);
    setConfirm(null);
    if (res?.code === 200) {
      showToast("success", `${confirm.type === "delete" ? t("emp_deleted") : confirm.type === "suspend" ? t("emp_suspended") : t("emp_restored")} ${t("emp_successfully")}.`);
      setSelectedRows([]);
      onRefresh?.();
    } else {
      showToast("error", res?.msg || t("emp_action_failed"));
    }
  };

  const tabs = [
    { key: "active",    label: t("emp_active"),    icon: <UserCheck size={15} /> },
    { key: "suspended", label: t("emp_suspended_tab"), icon: <UserX size={15} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-[13px] font-medium text-white ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      <div className="emp-card p-4 sm:p-5">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img src={employee} alt="employee" className="w-50 h-50" />
            <div className="border-l-[3px] border-blue-500 pl-3 min-w-0">
              <h1 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                <span className="font-semibold">{t("employee")}</span>{" "}
                <span className="text-gray-500 font-normal">{t("emp_details")}</span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {t("emp_manage_desc")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setRegisterOpen(true)}
              className="gradient-btn group flex items-center gap-2 text-white text-[13px] h-12 px-3 py-2 rounded-xl border-none shadow-md hover:-translate-y-1 hover:shadow-xl hover:scale-[1.03] active:scale-95 transition-all duration-300">
              <UserPlus size={20} className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
              <span className="hidden sm:inline">{t("emp_register_employee")}</span>
            </Button>
            <Button onClick={() => setBulkRegisterOpen(true)}
              className="gradient-btn group flex items-center gap-2 text-white text-[13px] h-12 px-3 py-2 rounded-xl border-none shadow-md hover:-translate-y-1 hover:shadow-xl hover:scale-[1.03] active:scale-95 transition-all duration-300">
              <FileDiff size={20} className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110" />
              <span className="hidden sm:inline">{t("emp_bulk_register")}</span>
            </Button>
            <Button onClick={() => setBulkUpdateOpen(true)}
              className="gradient-btn group flex items-center gap-2 text-white text-[13px] h-12 px-3 py-2 rounded-xl border-none shadow-md hover:-translate-y-1 hover:shadow-xl hover:scale-[1.03] active:scale-95 transition-all duration-300">
              <FileBox size={20} className="transition-transform duration-300 group-hover:rotate-180 group-hover:scale-110" />
              <span className="hidden sm:inline">{t("emp_bulk_update")}</span>
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 mt-3 justify-end">
          {tabs.map(({ key, label, icon }) => (
            <Button key={key} onClick={() => handleTabChange(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                activeTab === key ? "tab-active" : "tab-inactive"
              }`}>
              {icon} {label}
            </Button>
          ))}
          <Button
            onClick={() => setDeletedUsersOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Trash2 size={15} /> {t("emp_deleted_user_history")}
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4">{filter}</div>

        {/* Bulk Action Bar */}
        {selectedRows.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-[13px] font-semibold text-blue-700 mr-1">
              {selectedRows.length} {t("selected")}:
            </span>
            {activeTab !== "deleted" && (
              <Button onClick={openBulkDelete} size="sm"
                className="h-8 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[12px] gap-1.5">
                <Trash size={12} /> {t("delete")}
              </Button>
            )}
            {activeTab === "active" && (
              <Button onClick={openBulkSuspend} size="sm"
                className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[12px] gap-1.5">
                <UserX size={12} /> {t("emp_suspend")}
              </Button>
            )}
            {(activeTab === "suspended" || activeTab === "deleted") && (
              <Button onClick={openBulkActivate} size="sm"
                className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] gap-1.5">
                <UserCheck size={12} /> {t("emp_restore")}
              </Button>
            )}
            <button onClick={() => setSelectedRows([])}
              className="ml-auto text-[12px] text-blue-500 hover:underline">{t("emp_clear")}</button>
          </div>
        )}

        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-gray-500 font-medium">{t("show")}</span>
            <Select value={entriesPerPage} onValueChange={(v) => { setEntriesPerPage(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[80px] text-[13px] rounded-lg border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {["10","25","50","100"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-[13px] text-gray-500 font-medium">{t("entries")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}
              className="h-9 gap-2 text-[13px] font-semibold text-blue-600 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl px-3 disabled:opacity-40">
              <Download size={14} /> {t("emp_export")}
            </Button>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder={t("search")} value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-9 text-[13px] w-44 sm:w-52 rounded-xl border-gray-200 focus:border-blue-300" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="tbl-scroll w-full p-3">
          <Table className="min-w-[900px] bg-gray-100 rounded-4xl">
            <TableHeader>
              <TableRow className="border-b-2 border-blue-100">
                <TableHead className="emp-th w-10 pl-4">
                  <Checkbox checked={selectedRows.length === paginated.length && paginated.length > 0}
                    onCheckedChange={toggleAll} className="border-blue-300" />
                </TableHead>
                <TableHead className="emp-th pl-3 py-3">{t("emp_full_name")}</TableHead>
                <TableHead className="emp-th">{t("emp_email_id")}</TableHead>
                <TableHead className="emp-th">{t("location")}</TableHead>
                <TableHead className="emp-th">{t("department")}</TableHead>
                <TableHead className="emp-th">{t("emp_shift")}</TableHead>
                <TableHead className="emp-th">{t("emp_role")}</TableHead>
                <TableHead className="emp-th">{t("emp_emp_code")}</TableHead>
                <TableHead className="emp-th">{t("emp_os")}</TableHead>
                <TableHead className="emp-th">{t("emp_computer_name")}</TableHead>
                <TableHead className="emp-th">{t("version")}</TableHead>
                <TableHead className="text-center pr-4 text-white text-[12px] font-semibold rounded-tr-xl"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>
                  {t("action")}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={12} className="py-10 text-center text-sm text-gray-400">
                    <Loader2 size={20} className="animate-spin inline mr-2" />{t("emp_loading_employees")}
                  </TableCell>
                </TableRow>
              )}
              {!loading && paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="py-10 text-center text-sm text-gray-400">
                    {t("emp_no_employees_found")}
                  </TableCell>
                </TableRow>
              )}
              {!loading && paginated.map((emp, idx) => (
                <TableRow key={emp.id}
                  className={`tr-hover border-b border-gray-50 transition-colors ${selectedRows.includes(emp.id) ? "bg-blue-50/60" : ""}`}>
                  <TableCell className="pl-4 py-2.5">
                    <Checkbox checked={selectedRows.includes(emp.id)}
                      onCheckedChange={() => toggleRow(emp.id)} className="border-blue-300" />
                  </TableCell>
                  <TableCell className="pl-3 py-2.5">
                    <div className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => navigate(`${employeeProfilePath}?id=${emp.id}`, { state: { employee: emp } })}>
                      <RowAvatar name={emp.name} idx={idx} />
                      <span className="text-[13px] font-medium text-gray-700 whitespace-nowrap group-hover:text-blue-600 group-hover:underline transition-colors">
                        {emp.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-400 py-2.5 whitespace-nowrap">{emp.email}</TableCell>
                  <TableCell className="text-[13px] text-gray-600 py-2.5 whitespace-nowrap">{emp.location}</TableCell>
                  <TableCell className="text-[13px] text-gray-600 py-2.5 whitespace-nowrap">{emp.department}</TableCell>
                  <TableCell className="text-[13px] text-gray-400 py-2.5 whitespace-nowrap">{emp.shift}</TableCell>
                  <TableCell className="py-2.5">
                    <Badge variant="secondary" className="text-[11px] font-semibold bg-blue-50 text-blue-600 border-0 rounded-lg px-2.5 whitespace-nowrap">
                      {emp.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600 py-2.5 whitespace-nowrap">{emp.empCode}</TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Monitor size={13} className="text-blue-400 flex-shrink-0" />
                      <span className="text-[13px] text-gray-600 whitespace-nowrap">{emp.os}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600 py-2.5 whitespace-nowrap">{emp.computer}</TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-[13px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
                      {emp.version}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 pr-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {activeTab !== "deleted" && (
                        <button className="action-icon bg-gray-100 text-gray-500 hover:bg-gray-200" title={t("emp_settings")}
                          onClick={() => navigate(`${routeBase}/track-user-settings?employee_id=${emp.id}`)}>
                          <Settings size={13} />
                        </button>
                      )}
                      {activeTab !== "deleted" && (
                        <button className="action-icon bg-emerald-50 text-emerald-500 hover:bg-emerald-100" title={t("edit")}
                          onClick={() => setEditId(emp.id)}>
                          <Edit size={13} />
                        </button>
                      )}
                      {activeTab === "active" && (
                        <button className="action-icon bg-amber-50 text-amber-500 hover:bg-amber-100" title={t("emp_suspend")}
                          onClick={() => openSuspend(emp.id)}>
                          <UserX size={13} />
                        </button>
                      )}
                      {(activeTab === "suspended" || activeTab === "deleted") && (
                        <button className="action-icon bg-emerald-50 text-emerald-500 hover:bg-emerald-100" title={t("emp_restore")}
                          onClick={() => openActivate(emp.id)}>
                          <UserCheck size={13} />
                        </button>
                      )}
                      {activeTab !== "deleted" && (
                        <button className="action-icon bg-rose-50 text-rose-500 hover:bg-rose-100" title={t("delete")}
                          onClick={() => openDelete(emp.id)}>
                          <Trash size={13} />
                        </button>
                      )}
                      <button className="action-icon bg-sky-50 text-sky-500 hover:bg-sky-100" title={t("emp_view")}
                        onClick={() => navigate(`${employeeProfilePath}?id=${emp.id}`, { state: { employee: emp } })}>
                        <Eye size={13} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[13px] text-gray-500 font-medium">
            {t("emp_showing")}{" "}
            <span className="font-bold text-gray-700">{filtered.length === 0 ? 0 : (currentPage - 1) * perPage + 1}</span>{" "}
            {t("to")}{" "}
            <span className="font-bold text-gray-700">{Math.min(currentPage * perPage, filtered.length)}</span>{" "}
            {t("of")} <span className="font-bold text-blue-600">{filtered.length}</span> {t("entries")}
          </p>
          <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* Modals */}
      <RegisterEmployeeModal
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        locations={filterData.locations ?? []}
        roles={filterData.roles ?? []}
        shifts={filterData.shifts ?? []}
        onSuccess={onRefresh}
      />
      <EditEmployeeModal
        open={!!editId}
        onOpenChange={(v) => { if (!v) setEditId(null); }}
        employeeId={editId}
        locations={filterData.locations ?? []}
        roles={filterData.roles ?? []}
        shifts={filterData.shifts ?? []}
        onSuccess={onRefresh}
      />
      <BulkRegisterModal open={bulkRegisterOpen} onOpenChange={setBulkRegisterOpen} onSuccess={onRefresh} />
      <BulkUpdateModal   open={bulkUpdateOpen}   onOpenChange={setBulkUpdateOpen}   onSuccess={onRefresh} />
      <DeletedUsersModal isOpen={deletedUsersOpen} onClose={() => setDeletedUsersOpen(false)} />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => { if (!v) setConfirm(null); }}
        title={confirm?.type === "delete" ? t("emp_confirm_delete") : confirm?.type === "suspend" ? t("emp_confirm_suspend") : t("emp_confirm_restore")}
        description={confirm?.label}
        confirmLabel={confirm?.type === "delete" ? t("delete") : confirm?.type === "suspend" ? t("emp_suspend") : t("emp_restore")}
        confirmClass={confirm?.type === "delete" ? "bg-red-500 hover:bg-red-600" : confirm?.type === "suspend" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}
        onConfirm={executeConfirm}
        loading={actionLoading}
      />
    </div>
  );
}
