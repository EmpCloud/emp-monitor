import React from "react"
import { useTranslation } from "react-i18next"
import CustomSelect from "@/components/common/elements/CustomSelect"
import { Label } from "@/components/ui/label"

const NotificationFilter = ({
  locations,
  departments,
  employees,
  dateRanges,
  pageSizeItems,
  locationValue,
  departmentValue,
  employeeValue,
  dateRangeValue,
  pageSizeValue,
  onLocationChange,
  onDepartmentChange,
  onEmployeeChange,
  onDateRangeChange,
  onPageSizeChange,
}) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 w-full">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Location
          </Label>
          <CustomSelect
            placeholder="Select Location"
            items={locations}
            selected={locationValue}
            onChange={onLocationChange}
          />
        </div>

        <div>
          <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Department
          </Label>
          <CustomSelect
            placeholder="Select Department"
            items={departments}
            selected={departmentValue}
            onChange={onDepartmentChange}
          />
        </div>

        <div>
          <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Employee
          </Label>
          <CustomSelect
            placeholder="Select Employee"
            items={employees}
            selected={employeeValue}
            onChange={onEmployeeChange}
          />
        </div>

        <div className="min-w-[260px]">
          <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Date
          </Label>
          <CustomSelect
            placeholder="Select Date"
            items={dateRanges}
            selected={dateRangeValue}
            onChange={onDateRangeChange}
            width="w-full"
          />
        </div>
      </div>

      {pageSizeItems != null && onPageSizeChange != null && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-gray-500 font-medium">{t("show")}</span>
          <div className="w-[84px]">
            <CustomSelect
              placeholder="10"
              items={pageSizeItems}
              selected={pageSizeValue}
              onChange={onPageSizeChange}
              width="w-full"
            />
          </div>
          <span className="text-[13px] text-gray-500 font-medium">{t("entries")}</span>
        </div>
      )}
    </div>
  )
}

export default React.memo(NotificationFilter)