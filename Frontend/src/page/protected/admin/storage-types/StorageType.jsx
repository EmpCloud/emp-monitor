import { useState, useEffect, useCallback } from "react";
import { Settings, ChevronDown, Plus, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import "@/components/common/employee-details/emp.css";
import storageTypeImg from "@/assets/storage.png";
import AddStorageModal from "./AddStorageModal";
import {
  getStorageTypeWithData,
  getStorageTypeValueFromName,
  deleteStorageData,
  updateStorageOption,
} from "./service";

const Sep = () => (
  <span className="inline-block w-[1.5px] h-4 bg-gray-300 rounded-full" />
);

export default function StorageType() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getStorageTypeWithData();
    setData(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (item) => {
    // Attach the storage_type_value key so AddStorageModal can look up field config
    const storageTypeValue = getStorageTypeValueFromName(item.name);
    setEditItem({ ...item, storage_type_value: storageTypeValue });
    setAddOpen(true);
  };

  const handleAddClose = (isOpen) => {
    setAddOpen(isOpen);
    if (!isOpen) setEditItem(null);
  };

  const handleSaveSuccess = () => {
    showSuccess(editItem ? "Storage updated successfully." : "Storage added successfully.");
    loadData();
  };

  const openDeleteConfirm = (item) => {
    setDeleteItem(item);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setActionLoading(true);
    const result = await deleteStorageData(deleteItem.storage_data_id);
    setActionLoading(false);
    setDeleteConfirmOpen(false);
    setDeleteItem(null);
    if (result) {
      showSuccess("Storage deleted successfully.");
      loadData();
    } else {
      showError("Failed to delete storage. Please try again.");
    }
  };

  const handleActivate = async (item) => {
    setActionLoading(true);
    const result = await updateStorageOption(item.storage_data_id);
    setActionLoading(false);
    if (result) {
      showSuccess("Storage activated successfully.");
      loadData();
    } else {
      showError("Failed to activate storage. Please try again.");
    }
  };

  const getStatusLabel = (status) => {
    const s = String(status);
    return s === "1" || s === "active" ? "Active" : "Not Active";
  };

  const isActive = (status) => {
    const s = String(status);
    return s === "1" || s === "active";
  };

  return (
    <div className="space-y-4">
      {/* Success / Error banners */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          <CheckCircle size={15} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {/* Header Card */}
      <div className="emp-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center shrink-0">
              <img src={storageTypeImg} alt="storage type" className="w-30 h-30" />
            </div>
            <div className="border-l-[3px] border-blue-500 pl-3 min-w-0">
              <h1 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                <span className="font-semibold">Storage</span>{" "}
                <span className="text-gray-500 font-normal">Type</span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Configure cloud and file-transfer storage integrations
              </p>
            </div>
          </div>

          <Button
            onClick={() => { setEditItem(null); setAddOpen(true); }}
            className="gradient-btn group flex items-center gap-2 text-white text-[13px] h-10 sm:h-12 px-4 sm:px-5 py-2 rounded-xl border-none shadow-md
              transition-all duration-300 ease-out
              hover:-translate-y-1 hover:shadow-xl hover:scale-[1.03] active:scale-95"
          >
            <Plus
              size={18}
              className="transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110"
            />
            <span>Add Storage</span>
          </Button>
        </div>

        {/* Table */}
        <div className="tbl-scroll w-full mt-5">
          <Table className="min-w-[600px] bg-gray-100 rounded-4xl">
            <TableHeader>
              <TableRow className="bg-gray-200">
                <TableHead className="pl-4 py-3 rounded-tl-xl">
                  <div className="flex items-center justify-between gap-2">
                    <span>Storage Type</span>
                    <Sep />
                  </div>
                </TableHead>
                <TableHead className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span>Status</span>
                    <Sep />
                  </div>
                </TableHead>
                <TableHead className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span>Note</span>
                    <Sep />
                  </div>
                </TableHead>
                <TableHead
                  className="text-center pr-4 text-white text-[12px] font-semibold rounded-tr-xl py-3"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}
                >
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-gray-400">
                    Loading...
                  </TableCell>
                </TableRow>
              )}

              {!loading && data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-gray-500">
                    No storage types configured. Click &ldquo;Add Storage&rdquo; to get started.
                  </TableCell>
                </TableRow>
              )}

              {!loading && data.map((item) => (
                <TableRow
                  key={item.storage_data_id}
                  className="tr-hover border-b border-dashed border-gray-200 transition-colors duration-100"
                >
                  <TableCell className="pl-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-gray-700 font-medium">
                        {item.name || "—"}
                      </span>
                      <Sep />
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-[11px] font-semibold border-0 rounded-lg px-2.5 ${
                          isActive(item.status)
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        {getStatusLabel(item.status)}
                      </Badge>
                      <Sep />
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-gray-500">
                        {item.note || "—"}
                      </span>
                      <Sep />
                    </div>
                  </TableCell>

                  <TableCell className="py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          disabled={actionLoading}
                          className="gradient-btn text-white rounded-lg h-8 px-3 gap-1.5 text-[12px] font-semibold shadow-sm
                            hover:shadow-md transition-all duration-200"
                        >
                          <Settings size={14} />
                          <ChevronDown size={12} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl min-w-[150px]">
                        <DropdownMenuItem
                          className="text-[13px] cursor-pointer"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-[13px] cursor-pointer text-red-500 focus:text-red-500"
                          onClick={() => openDeleteConfirm(item)}
                        >
                          Delete
                        </DropdownMenuItem>
                        {!isActive(item.status) && (
                          <DropdownMenuItem
                            className="text-[13px] cursor-pointer text-emerald-600 focus:text-emerald-600"
                            onClick={() => handleActivate(item)}
                          >
                            Activate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AddStorageModal
        open={addOpen}
        onOpenChange={handleAddClose}
        editItem={editItem}
        onSuccess={handleSaveSuccess}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[420px] rounded-xl p-0 border-0 shadow-2xl gap-0 [&>button:last-child]:hidden">
          <div
            className="px-6 py-5 flex items-center justify-between rounded-t-lg"
            style={{ background: "linear-gradient(135deg,#f87171,#ef4444)" }}
          >
            <h2 className="text-white text-lg font-bold tracking-tight">
              Delete Storage
            </h2>
            <DialogClose className="text-white hover:text-white/80 transition-colors focus:outline-none">
              <Trash2 className="h-5 w-5" />
            </DialogClose>
          </div>

          <div className="px-6 py-6 text-[14px] text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-semibold">
              {deleteItem?.name ?? "this storage"}
            </span>
            ? This action cannot be undone.
          </div>

          <div className="border-t border-gray-200 mx-6" />

          <div className="px-6 py-4 flex justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline" className="h-9 px-5 rounded-full text-[13px] font-semibold">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleDelete}
              disabled={actionLoading}
              className="h-9 px-5 rounded-full bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold disabled:opacity-50"
            >
              {actionLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
