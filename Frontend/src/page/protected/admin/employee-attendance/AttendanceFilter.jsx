import React from "react";
import { useTranslation } from "react-i18next";
import { useAttendanceStore } from "./attendanceStore";
import EmpFilter from "@/components/common/employee-attendance/EmpFilter";

const MONTHS = [
  { label: "Jan/2026", value: 202601 },
  { label: "Feb/2026", value: 202602 },
  { label: "Mar/2026", value: 202603 },
];

const AttendanceFilter = () => {
  const { t } = useTranslation();
  const { locations, departments, shifts, filters, setFilter } =
    useAttendanceStore();

  return (
    <EmpFilter
      months={MONTHS}
      locations={locations}
      departments={departments}
      shifts={shifts.length ? shifts : [{ label: t("allShifts"), value: "all" }]}
      monthValue={filters.date}
      locationValue={filters.locationId}
      departmentValue={filters.departmentId}
      shiftValue={filters.shiftId}
      onMonthChange={(v) => setFilter("date", Number(v))}
      onLocationChange={(v) => setFilter("locationId", v)}
      onDepartmentChange={(v) => setFilter("departmentId", v)}
      onShiftChange={(v) => setFilter("shiftId", v)}
    />
  );
};

export default React.memo(AttendanceFilter);
