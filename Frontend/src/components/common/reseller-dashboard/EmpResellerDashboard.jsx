import React, { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Key, Eye } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import EmpResellerDashboardLogo from "@/assets/reseller/reseller-dashboard.svg";
import { useResellerStore } from "@/page/protected/admin/reseller-dashboard/resellerStore";
import RegisterClientModal from "./RegisterClientModal";
import EditClientModal from "./EditClientModal";
import AssignEmployeeModal from "./AssignEmployeeModal";
import ViewAssignedModal from "./ViewAssignedModal";

const EmpResellerDashboard = () => {
    const { t } = useTranslation();
    const clients = useResellerStore((s) => s.clients);
    const loading = useResellerStore((s) => s.loading);
    const error = useResellerStore((s) => s.error);
    const successMsg = useResellerStore((s) => s.successMsg);
    const loadDashboard = useResellerStore((s) => s.loadDashboard);
    const setModal = useResellerStore((s) => s.setModal);
    const openEdit = useResellerStore((s) => s.openEdit);
    const removeClientAction = useResellerStore((s) => s.removeClient);
    const toggleStorageAction = useResellerStore((s) => s.toggleStorage);
    const toggleAllStorageAction = useResellerStore((s) => s.toggleAllStorage);
    const clientLoginAction = useResellerStore((s) => s.clientLogin);
    const fetchAssigned = useResellerStore((s) => s.fetchAssignedEmployees);
    const downloadEmpStats = useResellerStore((s) => s.downloadEmployeeStats);
    const downloadMgrStats = useResellerStore((s) => s.downloadManagerStats);
    const clearMessages = useResellerStore((s) => s.clearMessages);

    useEffect(() => { loadDashboard(); }, []);

    useEffect(() => {
        if (successMsg) {
            Swal.fire({ icon: "success", title: "Success", text: successMsg, timer: 2500, showConfirmButton: false });
            clearMessages();
        }
    }, [successMsg]);

    useEffect(() => {
        if (error) {
            Swal.fire({ icon: "error", title: "Error", text: error, showConfirmButton: true });
            clearMessages();
        }
    }, [error]);

    const allStorageChecked = clients.length > 0 && clients.every((c) => c.storage);

    const handleDelete = useCallback(async (client) => {
        const result = await Swal.fire({
            title: t("reseller.areYouSure"),
            text: t("reseller.removeClient", { email: client.email }),
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: t("delete"),
        });
        if (result.isConfirmed) {
            await removeClientAction(client.email, client.clientUserId);
        }
    }, [removeClientAction]);

    const handleStorageToggle = useCallback(async (client) => {
        const enable = !client.storage;
        const msg = enable ? t("reseller.enableStorage") : t("reseller.disableStorage");
        const result = await Swal.fire({
            title: t("reseller.areYouSure"),
            text: msg,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: t("common.yes"),
        });
        if (result.isConfirmed) {
            await toggleStorageAction(client.clientOrgId, enable);
        }
    }, [toggleStorageAction]);

    const handleAllStorage = useCallback(async () => {
        const enable = !allStorageChecked;
        const result = await Swal.fire({
            title: t("reseller.areYouSure"),
            text: enable ? t("reseller.enableAllStorage") : t("reseller.disableAllStorage"),
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: t("common.yes"),
        });
        if (result.isConfirmed) {
            await toggleAllStorageAction(enable);
        }
    }, [allStorageChecked, toggleAllStorageAction]);

    const handleClientLogin = useCallback(async (client) => {
        const result = await Swal.fire({
            title: t("reseller.areYouSure"),
            text: t("reseller.loginConfirm"),
            icon: "info",
            showCancelButton: true,
            confirmButtonText: t("reseller.proceed"),
        });
        if (result.isConfirmed) {
            await clientLoginAction(client.clientOrgId);
        }
    }, [clientLoginAction]);

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
                <div className="w-20 h-20"><video src="/src/assets/ai.webm" autoPlay loop playsInline muted className="w-full h-full object-contain" /></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div className="flex items-center gap-2">
                    <img alt="reseller" className="w-20 h-20" src={EmpResellerDashboardLogo} />
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}><span className="font-semibold">{t("reseller.reseller")}</span>{" "}<span className="font-normal text-gray-500">{t("reseller.dashboard")}</span></h2>
                        <p className="text-xs text-gray-400 mt-1">{t("reseller.manageDesc")}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-xs" onClick={downloadEmpStats}>{t("reseller.employeeStatistics")}</Button>
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-xs" onClick={downloadMgrStats}>{t("reseller.managerStatistics")}</Button>
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-xs" onClick={() => setModal("registerModalOpen", true)}>{t("reseller.addClient")}</Button>
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-xs" onClick={() => setModal("assignModalOpen", true)}>{t("reseller.assignEmployee")}</Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
                <table className="min-w-[1100px] w-full">
                    <thead>
                        <tr className="bg-[#CADDFF]">
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left sticky left-0 bg-[#CADDFF] z-10">{t("common.email")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("reseller.username")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("reseller.totalUsers")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("reseller.usersAdded")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("reseller.canAdd")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("reseller.expiryDate")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">{t("common.note")}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">
                                {t("reseller.storage")}
                                <Checkbox checked={allStorageChecked} onCheckedChange={handleAllStorage} className="ml-1.5 border-slate-400" />
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-center">{t("action")}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {clients.length === 0 ? (
                            <tr><td colSpan={9} className="text-center text-sm text-gray-400 py-10">{t("reseller.noClientsFound")}</td></tr>
                        ) : clients.map((c) => (
                            <tr key={c.clientUserId} className="border-b border-slate-100 last:border-0 text-xs text-slate-600">
                                <td className="px-4 py-3 sticky left-0 bg-white z-10 font-medium">{c.email}</td>
                                <td className="px-4 py-3">{c.username}</td>
                                <td className="px-4 py-3 text-center">{c.totalUsers}</td>
                                <td className="px-4 py-3 text-center">{c.usersAdded}</td>
                                <td className="px-4 py-3 text-center">{c.usersCanAdd}</td>
                                <td className="px-4 py-3 text-center">{c.expiry}</td>
                                <td className="px-4 py-3 max-w-[120px] truncate" title={c.note}>{c.note}</td>
                                <td className="px-4 py-3 text-center">
                                    <Checkbox checked={c.storage} onCheckedChange={() => handleStorageToggle(c)} className="border-slate-300" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button onClick={() => handleClientLogin(c)} className="w-6 h-6 rounded bg-blue-100 hover:bg-blue-200 flex items-center justify-center" title={t("reseller.loginAsClient")}>
                                            <Key className="w-3 h-3 text-blue-600" />
                                        </button>
                                        <button onClick={() => openEdit(c)} className="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center" title={t("edit")}>
                                            <Pencil className="w-3 h-3 text-emerald-600" />
                                        </button>
                                        <button onClick={() => handleDelete(c)} className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 flex items-center justify-center" title={t("delete")}>
                                            <Trash2 className="w-3 h-3 text-red-500" />
                                        </button>
                                        <button onClick={() => fetchAssigned(c.clientOrgId)} className="w-6 h-6 rounded bg-blue-100 hover:bg-blue-200 flex items-center justify-center" title={t("reseller.viewAssigned")}>
                                            <Eye className="w-3 h-3 text-blue-600" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <RegisterClientModal />
            <EditClientModal />
            <AssignEmployeeModal />
            <ViewAssignedModal />
        </div>
    );
};

export default EmpResellerDashboard;
