import React from "react"
import { useTranslation } from "react-i18next"
import { Download } from "lucide-react"
import CustomSelect from "@/components/common/elements/CustomSelect"
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const InsightsFilter = ({
  roles = [],
  locations = [],
  departments = [],
  employees = [],
  dateRanges = [],
  pageSizeItems, // kept for backward compatibility (unused here)
  roleValue,
  locationValue,
  departmentValue,
  employeeValue,
  dateRangeValue,
  selectedDate,
  pageSizeValue,
  onRoleChange = () => {},
  onLocationChange = () => {},
  onDepartmentChange = () => {},
  onEmployeeChange = () => {},
  onDateRangeChange = () => {},
  onSelectedDateChange = () => {},
  onPageSizeChange = () => {},
  onDownloadCsv = () => {},
}) => {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-start justify-between gap-6 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-5">
        <div className="min-w-[220px]">
          <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("insights_select_date")}
          </Label>
          <br />
          <DateRangeCalendar
            startDate={selectedDate}
            endDate={selectedDate}
            onChange={(start) => onSelectedDateChange(start)}
            placeholder={t("insights.selectDate")}
          />
        </div>

        <div className="min-w-[220px]">
          <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("emp_role")}
          </Label>
          <CustomSelect
            placeholder={t("insights.seeAll")}
            items={roles}
            selected={roleValue}
            onChange={onRoleChange}
            width="w-full"
          />
        </div>

        <div className="min-w-[220px]">
          <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("location")}
          </Label>
          <CustomSelect
            placeholder={t("insights.seeAll")}
            items={locations}
            selected={locationValue}
            onChange={onLocationChange}
            width="w-full"
          />
        </div>

        <div className="min-w-[220px]">
          <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("department")}
          </Label>
          <CustomSelect
            placeholder={t("insights.seeAll")}
            items={departments}
            selected={departmentValue}
            onChange={onDepartmentChange}
            width="w-full"
          />
        </div>

        <div className="min-w-[220px]">
          <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("employee")}
          </Label>
          <CustomSelect
            placeholder={t("insights.seeAllEmployee")}
            items={employees}
            selected={employeeValue}
            onChange={onEmployeeChange}
            width="w-full"
          />
        </div>
      </div>

      {onDownloadCsv && (
        <div className="flex items-start mt-5">
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5"
            onClick={onDownloadCsv}
          >
            <Download className="mr-2 h-4 w-4" />
            {t("insights_download_csv")}
          </Button>
        </div>
      )}
    </div>
  )
}

export default React.memo(InsightsFilter)
