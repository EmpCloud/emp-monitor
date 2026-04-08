import React, { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next";
import { Users, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import CustomSelect from "@/components/common/elements/CustomSelect"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import useMonitoringControlStore from "@/page/protected/admin/monitoring-control/monitoringControlStore"

const CreateGroup = ({ open, onOpenChange, isEdit = false }) => {  const { t } = useTranslation();

  const {
    roles,
    locations,
    departments,
    employees,
    editingGroup,
    saving,
    createGroupAction,
    updateGroupAction,
    loadLocations,
    loadDepartments,
    loadEmployees,
  } = useMonitoringControlStore()

  const [groupName, setGroupName] = useState("")
  const [note, setNote] = useState("")
  const [roleId, setRoleId] = useState("all")
  const [locationId, setLocationId] = useState("all")
  const [departmentId, setDepartmentId] = useState("all")
  const [employeeIds, setEmployeeIds] = useState([])
  const [error, setError] = useState("")

  // Populate form for edit mode
  useEffect(() => {
    if (open && isEdit && editingGroup) {
      setGroupName(editingGroup.name || "")
      setNote(editingGroup.note || "")
      setRoleId(editingGroup.role_id ? String(editingGroup.role_id) : "all")
      setLocationId(editingGroup.location_id ? String(editingGroup.location_id) : "all")
      setDepartmentId(editingGroup.department_id ? String(editingGroup.department_id) : "all")
      setEmployeeIds(editingGroup.employee_ids || [])
    } else if (open && !isEdit) {
      setGroupName("")
      setNote("")
      setRoleId("all")
      setLocationId("all")
      setDepartmentId("all")
      setEmployeeIds([])
    }
    setError("")
  }, [open, isEdit, editingGroup])

  // Cascade: role → location
  useEffect(() => {
    if (open) loadLocations(roleId)
  }, [roleId, open])

  // Cascade: role + location → department
  useEffect(() => {
    if (open) loadDepartments(roleId, locationId)
  }, [roleId, locationId, open])

  // Cascade: role + location + department → employees
  useEffect(() => {
    if (open) loadEmployees(roleId, locationId, departmentId)
  }, [roleId, locationId, departmentId, open])

  const handleRoleChange = useCallback((val) => {
    setRoleId(val)
    setLocationId("all")
    setDepartmentId("all")
    setEmployeeIds([])
  }, [])

  const handleLocationChange = useCallback((val) => {
    setLocationId(val)
    setDepartmentId("all")
    setEmployeeIds([])
  }, [])

  const handleDepartmentChange = useCallback((val) => {
    setDepartmentId(val)
    setEmployeeIds([])
  }, [])

  const handleSubmit = async () => {
    if (!groupName.trim()) {
      setError(t("monitoring.groupNameRequired"))
      return
    }
    setError("")

    const payload = {
      name: groupName.trim(),
      note: note.trim(),
      role_id: roleId !== "all" ? roleId : "",
      location_id: locationId !== "all" ? locationId : "",
      department_id: departmentId !== "all" ? departmentId : "",
      employee_ids: employeeIds.length > 0 ? employeeIds : [],
    }

    let res
    if (isEdit && editingGroup) {
      payload.group_id = editingGroup.group_id
      res = await updateGroupAction(payload)
    } else {
      res = await createGroupAction(payload)
    }

    if (!res.success) {
      if (res.code === 205) {
        setError(res.message || "Duplicate employees found in another group. Overwrite?")
      } else {
        setError(res.message || "Failed to save group")
      }
    }
  }

  // Filter out "all" option for employee multi-select display
  const selectedEmployeeLabels = employees
    .filter((e) => e.value !== "all" && employeeIds.includes(e.value))
    .map((e) => e.label)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 border-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 rounded-t-2xl">
          <DialogHeader className="flex-row items-center gap-3 space-y-0">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-white">
                {isEdit ? t("monitoring.editGroup") : t("monitoring.createGroup")}
              </DialogTitle>
              <DialogDescription className="text-xs text-violet-200 mt-0.5">
                {isEdit
                  ? t("monitoring.modifyGroupDetails")
                  : t("monitoring.setupNewGroup")}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-6 space-y-7">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 sm:min-w-[140px]">
              <span className="w-1 h-5 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-slate-700">{t("monitoring.groupName")}</span>
            </div>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="h-10 rounded-lg border-slate-200 text-sm"
              placeholder={t("monitoring.enterGroupName")}
            />
          </div>

          {/* Role, Location, Departments, Employees */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("monitoring.role")}</label>
                <CustomSelect
                  placeholder="All Roles"
                  items={roles}
                  selected={roleId}
                  onChange={handleRoleChange}
                  width="full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("location")}</label>
                <CustomSelect
                  placeholder="All Locations"
                  items={locations}
                  selected={locationId}
                  onChange={handleLocationChange}
                  width="full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("department")}</label>
                <CustomSelect
                  placeholder="All Departments"
                  items={departments}
                  selected={departmentId}
                  onChange={handleDepartmentChange}
                  width="full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("monitoring.employees")}</label>
                <div className="flex items-center flex-wrap gap-1.5 min-h-[40px]">
                  {employeeIds.length === 0 ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold">
                      All Employees
                    </span>
                  ) : (
                    selectedEmployeeLabels.map((label, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs"
                      >
                        {label}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Add Employees Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Select Employees
            </label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white">
              {employees
                .filter((e) => e.value !== "all")
                .map((emp) => (
                  <label
                    key={emp.value}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={employeeIds.includes(emp.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEmployeeIds((prev) => [...prev, emp.value])
                        } else {
                          setEmployeeIds((prev) => prev.filter((id) => id !== emp.value))
                        }
                      }}
                      className="w-3.5 h-3.5 accent-blue-500"
                    />
                    <span className="text-xs text-slate-700">{emp.label}</span>
                  </label>
                ))}
              {employees.filter((e) => e.value !== "all").length === 0 && (
                <p className="text-xs text-slate-400 py-2 text-center">{t("monitoring.noEmployeesFound")}</p>
              )}
            </div>
          </div>

          {/* Note */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-5 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-slate-700">{t("common.note")}</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("monitoring.optionalNote")}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl px-5 text-xs font-semibold"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              className="rounded-xl bg-violet-500 hover:bg-violet-600 px-5 text-xs font-semibold shadow-sm"
              onClick={handleSubmit}
              disabled={saving}
            >
              <Users className="w-4 h-4" />
              {saving ? t("common.saving") : isEdit ? t("monitoring.updateGroup") : t("monitoring.createGroup")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateGroup
