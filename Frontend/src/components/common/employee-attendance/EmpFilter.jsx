import React from "react";
import { useTranslation } from "react-i18next";
import CustomSelect    from "@/components/common/elements/CustomSelect";
import { Label }       from "@/components/ui/label";
import MonthYearPicker from "./MonthYearPicker";

const EmpFilter = ({
  locations,
  departments,
  monthValue,
  locationValue,
  departmentValue,
  onMonthChange,
  onLocationChange,
  onDepartmentChange,
}) => {
  const { t } = useTranslation();
  return (
  <div className="flex flex-wrap items-end gap-4">

    <div>
      <Label className="text-xs font-medium text-slate-500 mb-1.5 block">
        {t("att.monthYear")}
      </Label>
      <MonthYearPicker value={monthValue} onChange={onMonthChange} />
    </div>

    <div>
      <Label className="text-xs font-medium text-slate-500 mb-1.5 block">
        {t("location")}
      </Label>
      <CustomSelect
        placeholder={t("allLocations")}
        items={locations}
        selected={locationValue}
        onChange={onLocationChange}
        width="w-55 2xl:w-65"
      />
    </div>

    <div>
      <Label className="text-xs font-medium text-slate-500 mb-1.5 block">
        {t("department")}
      </Label>
      <CustomSelect
        placeholder={t("allDepartments")}
        items={departments}
        selected={departmentValue}
        onChange={onDepartmentChange}
        width="w-55 2xl:w-65"
      />
    </div>

  </div>
);
};

export default React.memo(EmpFilter);
