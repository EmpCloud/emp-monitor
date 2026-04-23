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

// #129/#130 — Radix Select forbids empty-string SelectItem values. We
// previously filtered such items out, which silently killed the "All X"
// reset option that callers pass as `{ value: "", label: "All ..." }` —
// once a user picked anything, there was no way back to "All". Use a
// sentinel internally so the All row renders, and translate it back to
// the empty string callers expect when bubbling onChange up.
const ALL_SENTINEL = "__all__";

const isAllOption = (v) => v === "" || v === null || v === undefined;

const CustomSelect = ({ placeholder, items, onChange, selected, width }) => {
  const { t } = useTranslation();
  const translatedPlaceholder = LABEL_TO_I18N_KEY[placeholder] ? t(LABEL_TO_I18N_KEY[placeholder]) : placeholder;
  const handleChange = (v) => onChange(v === ALL_SENTINEL ? "" : v);
  return (
    <div>
      <Select
        onValueChange={handleChange}
        value={
          selected !== undefined && selected !== null && selected !== ""
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
          {items?.map((d, i) => {
            const itemValue = isAllOption(d.value) ? ALL_SENTINEL : String(d.value);
            return (
              <SelectItem
                key={`${itemValue}-${i}`}
                value={itemValue}
                className="text-sm"
              >
                {LABEL_TO_I18N_KEY[d.label] ? t(LABEL_TO_I18N_KEY[d.label]) : d.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CustomSelect;
