import React from "react";
import { useTranslation } from "react-i18next";
import CustomTab from "@/components/common/elements/CustomTab";
import CustomSelect from "@/components/common/elements/CustomSelect";

const PerformanceFilter = ({
  tabValue,
  typeValue,
  onTabChange,
  onTypeChange,
  typePlaceholder = "Productive",
}) => {
  const { t } = useTranslation();

  const productivityOptions = [
    { value: "pro", label: t("productive") },
    { value: "non", label: t("nonProductiveLabel") },
    { value: "neu", label: t("idleLabel") },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <CustomTab onChange={onTabChange} value={tabValue} />
      <div className="flex items-center gap-2">
        <CustomSelect
          placeholder={typePlaceholder}
          items={productivityOptions}
          onChange={onTypeChange}
          selected={typeValue}
        />
      </div>
    </div>
  );
};

export default React.memo(PerformanceFilter);
