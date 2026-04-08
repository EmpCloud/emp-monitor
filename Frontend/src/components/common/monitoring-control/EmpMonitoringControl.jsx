import React, { useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next";
import { Search, Settings, Edit2, Trash2, ChevronDown } from "lucide-react"
import PaginationComponent from "@/components/common/Pagination"
import CustomSelect from "@/components/common/elements/CustomSelect"
import CreateGroup from "@/components/common/monitoring-control/dialog/CreateGroup"
import DeleteGroupDialog from "@/components/common/monitoring-control/dialog/DeleteGroupDialog"
import MonitoringControlDialog from "@/components/common/monitoring-control/dialog/MonitoringControlDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ShowEntries from "@/components/common/elements/ShowEntries"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import EmpMonitoringControlLogo from "@/assets/settings/monitoring-control.svg"
import useMonitoringControlStore from "@/page/protected/admin/monitoring-control/monitoringControlStore"

const CUSTOM_PRODUCTIVITY_TIMES = [
  { label: "06:00", value: "06:00" },
  { label: "07:00", value: "07:00" },
  { label: "08:00", value: "08:00" },
  { label: "09:00", value: "09:00" },
  { label: "10:00", value: "10:00" },
]

const getProductivityCategories = (t) => [
  { label: t("prodReport.neutral"), value: "0" },
  { label: t("productive"), value: "1" },
  { label: t("prodReport.unproductive"), value: "2" },
];

const EmpMonitoringControl = () => {
    const { t } = useTranslation();
  const PRODUCTIVITY_CATEGORIES = getProductivityCategories(t);
  const {
    groups,
    totalCount,
    loading,
    tableLoading,
    page,
    pageSize,
    search,
    defaultRules,
    productivityTime,
    productivityCategory,
    createDialogOpen,
    editDialogOpen,
    deleteDialogOpen,
    monitoringDialogOpen,
    setPage,
    setPageSize,
    setSearch,
    setCreateDialogOpen,
    setEditDialogOpen,
    setDeleteDialogOpen,
    setMonitoringDialogOpen,
    loadInitialData,
    fetchGroups,
    openEditDialog,
    openDeleteDialog,
    openMonitoringDialog,
    updateProductivitySettings,
  } = useMonitoringControlStore()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [page, pageSize, search])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(page, totalPages)

  const handleProductivityTimeChange = useCallback(
    (val) => {
      updateProductivitySettings(val, productivityCategory)
    },
    [productivityCategory]
  )

  const handleProductivityCategoryChange = useCallback(
    (val) => {
      updateProductivitySettings(productivityTime, val)
    },
    [productivityTime]
  )

  const parseRules = (group) => {
    if (!group?.rules) return null
    try {
      return typeof group.rules === "string" ? JSON.parse(group.rules) : group.rules
    } catch {
      return null
    }
  }

  const tableRows = useMemo(() => {
    const rows = []

    // Default org row
    rows.push(
      <tr
        key="default-0"
        className="border-b border-slate-100 text-xs text-slate-600 bg-blue-50/30"
      >
        <td className="px-4 py-4 font-semibold text-slate-800">{t("monitoring.defaultSettings")}</td>
        <td className="px-4 py-4">All</td>
        <td className="px-4 py-4">All</td>
        <td className="px-4 py-4">All</td>
        <td className="px-4 py-4">{t("monitoring.allEmployees")}</td>
        <td className="px-4 py-4 text-center">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => openMonitoringDialog(0, defaultRules)}
            title="Monitoring Settings"
          >
            <Settings className="w-4 h-4 text-blue-500" />
          </Button>
        </td>
      </tr>
    )

    // Group rows
    groups.forEach((group) => {
      const rules = parseRules(group)
      rows.push(
        <tr
          key={group.group_id}
          className="border-b border-slate-100 last:border-b-0 text-xs text-slate-600"
        >
          <td className="px-4 py-4 font-medium text-slate-700">{group.name || "—"}</td>
          <td className="px-4 py-4">{group.role_name || t("timeclaim.all")}</td>
          <td className="px-4 py-4">{group.location_name || t("timeclaim.all")}</td>
          <td className="px-4 py-4">{group.department_name || t("timeclaim.all")}</td>
          <td className="px-4 py-4">
            {group.employee_count != null ? `${group.employee_count} ${t("employees")}` : t("timeclaim.all")}
          </td>
          <td className="px-4 py-4 text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1">
                  {t("monitoring.actions")} <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => openMonitoringDialog(group.group_id, rules)}
                  className="text-xs gap-2"
                >
                  <Settings className="w-3.5 h-3.5" /> {t("monitoring.settings")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openEditDialog(group)}
                  className="text-xs gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" /> {t("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openDeleteDialog(group)}
                  className="text-xs gap-2 text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
      )
    })

    return rows
  }, [groups, defaultRules, openMonitoringDialog, openEditDialog, openDeleteDialog])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="border-l-2 border-blue-500 pl-4">
          <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
            <span className="font-semibold">{t("monitoring.title")}</span>{" "}
            <span className="font-normal text-gray-500">{t("monitoring.control")}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
            {t("monitoring.description")}
          </p>
        </div>
        <div className="flex items-end gap-1 mr-2">
          <img alt="monitoring control" className="w-42 h-32" src={EmpMonitoringControlLogo} />
        </div>
      </div>

      {/* Custom Productivity Time + Productivity Category */}
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {t("monitoring.customProductivityTime")}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {t("monitoring.productivityCalc")}
            </span>
            <CustomSelect
              placeholder="08:00"
              items={CUSTOM_PRODUCTIVITY_TIMES}
              selected={productivityTime}
              onChange={handleProductivityTimeChange}
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
            {t("monitoring.productivityCategory")}
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-slate-800 inline-block" />
          </label>
          <CustomSelect
            placeholder="Neutral"
            items={PRODUCTIVITY_CATEGORIES}
            selected={productivityCategory}
            onChange={handleProductivityCategoryChange}
          />
        </div>
      </div>

      {/* Show entries + Create Group + Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <ShowEntries value={pageSize} onChange={(v) => {
                const num = parseInt(v, 10)
                setPageSize(Number.isNaN(num) ? 10 : num)
              }} />

          <Button
            size="lg"
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-5 text-xs font-semibold shadow-sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            {t("monitoring.createGroup")}
          </Button>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-slate-50">
        <table className="min-w-[750px] w-full">
          <thead>
            <tr className="bg-blue-50/80">
              <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                {t("monitoring.groupName")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                {t("monitoring.role")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                {t("location")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                {t("department")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-700 text-left">
                {t("employees")}
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-white bg-blue-500 text-center rounded-tr-2xl">
                {t("action")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading || tableLoading ? (
              <tr>
                <td colSpan={6} className="text-center text-sm text-gray-400 py-10">
                  {t("loadingText")}
                </td>
              </tr>
            ) : (
              tableRows
            )}
            {!loading && !tableLoading && groups.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-sm text-gray-400 py-6">
                  {t("monitoring.noGroupsFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3.5">
        <p className="text-[13px] text-gray-500 font-medium">
          {t("timeclaim.showing")}{" "}
          <span className="font-bold text-gray-700">
            {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          </span>{" "}
          {t("to")}{" "}
          <span className="font-bold text-gray-700">
            {Math.min(currentPage * pageSize, totalCount)}
          </span>{" "}
          {t("of")}{" "}
          <span className="font-bold text-blue-600">{totalCount}</span>
        </p>
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Dialogs */}
      <CreateGroup
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <CreateGroup
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        isEdit
      />
      <DeleteGroupDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
      <MonitoringControlDialog
        open={monitoringDialogOpen}
        onOpenChange={setMonitoringDialogOpen}
      />
    </div>
  )
}

export default EmpMonitoringControl
