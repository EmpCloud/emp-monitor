import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import EmployeeDetailsTable from "@/components/common/employee-details/EmployeeDetails";
import EmployeeFilter       from "@/components/common/employee-details/EmployeeFilter";
import { fetchEmployees, mapEmployeeForTable, fetchFilterOptions } from "./service";

const TAB_STATUS = { active: "1", suspended: "2", deleted: "3" };

const NonAdminEmployeeDetails = () => {
  const { t } = useTranslation();

  const ALL_ROLES       = [{ value: "all", label: t("allRoles") }];
  const ALL_LOCATIONS   = [{ value: "all", label: t("allLocations") }];
  const ALL_DEPARTMENTS = [{ value: "all", label: t("allDepartments") }];
  const ALL_SHIFTS      = [{ value: "all", label: t("allShifts") }];

  const [activeTab, setActiveTab]             = useState("active");
  const [locationValue, setLocationValue]     = useState("all");
  const [departmentValue, setDepartmentValue] = useState("all");
  const [roleValue, setRoleValue]             = useState("all");
  const [shiftValue, setShiftValue]           = useState("all");

  const [roles, setRoles]             = useState(ALL_ROLES);
  const [locations, setLocations]     = useState(ALL_LOCATIONS);
  const [departments, setDepartments] = useState(ALL_DEPARTMENTS);
  const [shifts, setShifts]           = useState(ALL_SHIFTS);

  const [rawRoles, setRawRoles]         = useState([]);
  const [rawLocations, setRawLocations] = useState([]);
  const [rawShifts, setRawShifts]       = useState([]);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(false);

  // Keep dropdown defaults in sync with language changes
  useEffect(() => {
    setRoles((prev) => [{ value: "all", label: t("allRoles") }, ...prev.slice(1)]);
    setLocations((prev) => [{ value: "all", label: t("allLocations") }, ...prev.slice(1)]);
    setDepartments((prev) => [{ value: "all", label: t("allDepartments") }, ...prev.slice(1)]);
    setShifts((prev) => [{ value: "all", label: t("allShifts") }, ...prev.slice(1)]);
  }, [t]);

  useEffect(() => {
    fetchFilterOptions().then(({ roles: r, locations: l, departments: d, shifts: s }) => {
      if (r.length) { setRoles([...ALL_ROLES, ...r]);         setRawRoles(r); }
      if (l.length) { setLocations([...ALL_LOCATIONS, ...l]); setRawLocations(l); }
      if (d.length)   setDepartments([...ALL_DEPARTMENTS, ...d]);
      if (s.length) { setShifts([...ALL_SHIFTS, ...s]);       setRawShifts(s); }
    });
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { employees: raw } = await fetchEmployees({
        activeStatus:  TAB_STATUS[activeTab],
        locationId:    locationValue   === "all" ? "" : locationValue,
        departmentId:  departmentValue === "all" ? "" : departmentValue,
        roleId:        roleValue       === "all" ? "" : roleValue,
        shiftId:       shiftValue      === "all" ? -1 : shiftValue,
      });
      setEmployees(raw.map(mapEmployeeForTable));
    } finally {
      setLoading(false);
    }
  }, [activeTab, locationValue, departmentValue, roleValue, shiftValue]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  return (
    <div className="bg-slate-200 w-full p-5 min-h-screen">
      <EmployeeDetailsTable
        employees={employees}
        loading={loading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={loadEmployees}
        filterData={{ roles: rawRoles, locations: rawLocations, shifts: rawShifts }}
        filter={
          <EmployeeFilter
            roles={roles}
            locations={locations}
            departments={departments}
            shifts={shifts}
            roleValue={roleValue}
            locationValue={locationValue}
            departmentValue={departmentValue}
            shiftValue={shiftValue}
            onRoleChange={setRoleValue}
            onLocationChange={setLocationValue}
            onDepartmentChange={setDepartmentValue}
            onShiftChange={setShiftValue}
          />
        }
      />
    </div>
  );
};

export default NonAdminEmployeeDetails;
