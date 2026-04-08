import React from 'react'
import { useTranslation } from "react-i18next"
import CustomSelect from "@/components/common/elements/CustomSelect"
import { Label } from '@/components/ui/label'

const EmployeeFilter = ({
  locations,
  departments,
  shifts,
  roles,
  locationValue,
  departmentValue,
  shiftValue,
  roleValue,
  onLocationChange,
  onDepartmentChange,
  onShiftChange,
  onRoleChange,
}) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <div>
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t("emp_all_roles")}</Label>
        <CustomSelect
          placeholder={t("emp_all_roles")}
          items={roles}
          selected={roleValue}
          onChange={onRoleChange}
        />
      </div>
      <div>
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t("emp_all_locations")}</Label>
        <CustomSelect
          placeholder={t("emp_all_locations")}
          items={locations}
          selected={locationValue}
          onChange={onLocationChange}
        />
      </div>
      <div>
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t("emp_all_departments")}</Label>
        <CustomSelect
          placeholder={t("emp_all_departments")}
          items={departments}
          selected={departmentValue}
          onChange={onDepartmentChange}
        />
      </div>
      <div>
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t("emp_all_shifts")}</Label>
        <CustomSelect
          placeholder={t("emp_all_shifts")}
          items={shifts}
          selected={shiftValue}
          onChange={onShiftChange}
        />
      </div>
    </div>
  )
}

export default EmployeeFilter
