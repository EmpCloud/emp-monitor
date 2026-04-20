import apiService from "@/services/api.service";

export const fetchEmployees = async ({
  locationId = "",
  departmentId = "",
  roleId = "",
  shiftId = -1,
  activeStatus = "",
  showEntries = 10000,
  skipValue = 0,
  searchText = "",
} = {}) => {
  try {
    const payload = {
      status:        activeStatus !== "" ? Number(activeStatus) : "",
      shift_id:      shiftId ?? -1,
      location_id:   locationId ?? "",
      department_id: departmentId ?? "",
      role_id:       roleId ?? "",
      day:           new Date().toISOString().slice(0, 10),
      limit:         showEntries,
      skip:          skipValue,
      name:          searchText ?? "",
    };

    const { data } = await apiService.apiInstance.post("/user/employee-list", payload);

    const dataBlock = data?.data ?? {};
    const users = Array.isArray(dataBlock.user_data)
      ? dataBlock.user_data
      : Array.isArray(dataBlock)
      ? dataBlock
      : [];

    return {
      employees:  users,
      statusData: dataBlock.status_data ?? null,
      raw:        data,
    };
  } catch (error) {
    console.error("Non-Admin Employee Details: fetchEmployees error", error);
    return { employees: [], statusData: null, raw: null };
  }
};

export const mapEmployeeForTable = (emp, idx = 0) => ({
  id:         emp.id ?? emp.u_id ?? idx,
  name:       emp.full_name || emp.name || "-",
  email:      emp.email || "-",
  location:   emp.location || "-",
  department: emp.department || "-",
  shift:      emp.shift_name || "-",
  role:
    emp.role ||
    (Array.isArray(emp.roles) && emp.roles.length ? emp.roles[0].role : "Employee"),
  empCode:  emp.emp_code || "-",
  os:       emp.system_architecture || "Windows",
  computer: emp.computer_name || emp.username || "N/A",
  version:  emp.software_version || "N/A",
});

export { fetchFilterOptions } from "../../admin/employee-details/service";
