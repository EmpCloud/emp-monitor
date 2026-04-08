import React from "react";
import { useTranslation } from "react-i18next";

import CustomTab from "@/components/common/elements/CustomTab";
import CustomSelect from "@/components/common/elements/CustomSelect";

const DashboardFilter = ({
  locations,
  departments,
  locationValue,
  departmentValue,
  tabValue,
  onLocationChange,
  onDepartmentChange,
  onTabChange
}) => {

  const { t } = useTranslation();

  const translateItems = (items, allKey) =>
    items?.map((item) =>
      item.value === "all" ? { ...item, label: t(allKey) } : item
    );

  return (

    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">

      <CustomTab onChange={onTabChange} value={tabValue} />

      <div className="flex flex-wrap items-center gap-2">

        <CustomSelect
          placeholder={t("allLocations")}
          items={translateItems(locations, "allLocations")}
          selected={locationValue}
          onChange={onLocationChange}
        />

        <CustomSelect
          placeholder={t("allDepartments")}
          items={translateItems(departments, "allDepartments")}
          selected={departmentValue}
          onChange={onDepartmentChange}
        />

      </div>

    </div>

  );

};

export default React.memo(DashboardFilter);