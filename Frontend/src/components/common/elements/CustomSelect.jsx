import React from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Maps common English labels from service/store data to i18n keys.
 * Service files can't use hooks, so they return hardcoded English labels
 * for "all" options. This map auto-translates them at render time.
 */
const LABEL_TO_I18N_KEY = {
  "All Locations": "allLocations",
  "All Location": "allLocations",
  "All Departments": "allDepartments",
  "All Employees": "allEmployees",
  "All Shifts": "allShifts",
  "All Roles": "allRoles",
  "Select Option": "usbDetection.selectOption",
};

const CustomSelect = ({ placeholder, items, onChange, selected, width }) => {
  const { t } = useTranslation();
  const translatedPlaceholder = LABEL_TO_I18N_KEY[placeholder] ? t(LABEL_TO_I18N_KEY[placeholder]) : placeholder;
  return (
    <div>
      <Select
        onValueChange={onChange}
        value={
          selected !== undefined && selected !== null
            ? String(selected)
            : undefined
        }
      >
        <SelectTrigger className={`border-slate-200 text-slate-600 text-sm rounded-lg h-10 ${width? `w-full`:"w-44"} focus:ring-0 focus:ring-offset-0`}>
          <SelectValue placeholder={translatedPlaceholder} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="rounded-xl shadow-md border-slate-100"
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            width: "var(--radix-select-trigger-width)",
          }}
        >
          {items?.filter((d) => d.value !== "" && d.value !== null && d.value !== undefined).map((d, i) => (
            <SelectItem
              key={`${d.value}-${i}`}
              value={String(d.value)}
              className="text-sm"
            >
              {LABEL_TO_I18N_KEY[d.label] ? t(LABEL_TO_I18N_KEY[d.label]) : d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CustomSelect;
