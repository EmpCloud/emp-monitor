import { useState, useEffect } from "react";
import { fetchDepartmentsByLocation } from "@/page/protected/admin/employee-details/service";
import { encryptPassword } from "@/utils/crypto";

export const TIMEZONES = [
  { value: "Asia/Kolkata|+05:30",       label: "IST (UTC+5:30) – Asia/Kolkata" },
  { value: "UTC|+00:00",                label: "UTC (UTC+0:00)" },
  { value: "America/New_York|-05:00",   label: "EST (UTC-5:00) – New York" },
  { value: "America/Chicago|-06:00",    label: "CST (UTC-6:00) – Chicago" },
  { value: "America/Denver|-07:00",     label: "MST (UTC-7:00) – Denver" },
  { value: "America/Los_Angeles|-08:00",label: "PST (UTC-8:00) – Los Angeles" },
  { value: "Europe/London|+00:00",      label: "GMT (UTC+0:00) – London" },
  { value: "Europe/Paris|+01:00",       label: "CET (UTC+1:00) – Paris" },
  { value: "Europe/Berlin|+01:00",      label: "CET (UTC+1:00) – Berlin" },
  { value: "Asia/Dubai|+04:00",         label: "GST (UTC+4:00) – Dubai" },
  { value: "Asia/Singapore|+08:00",     label: "SGT (UTC+8:00) – Singapore" },
  { value: "Asia/Tokyo|+09:00",         label: "JST (UTC+9:00) – Tokyo" },
  { value: "Australia/Sydney|+11:00",   label: "AEDT (UTC+11:00) – Sydney" },
];

export const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  countryCode: "91",
  mobile: "",
  employeeCode: "",
  locationId: "",
  departmentId: "",
  roleId: "",
  timezone: "",
  shift: "",
  dateOfJoining: "",
  address: "",
  profilePicture: null,
};

/** "+05:30" → "19800" (seconds), matching PHP's timezone_offset */
function offsetToSeconds(offset) {
  if (!offset) return "0";
  const m = offset.match(/^([+-])(\d{1,2}):(\d{2})$/);
  if (!m) return "0";
  const sign = m[1] === "+" ? 1 : -1;
  return String(sign * (parseInt(m[2], 10) * 3600 + parseInt(m[3], 10) * 60));
}

/** "YYYY-MM-DD" → "MM/DD/YYYY", matching PHP's date_join format */
function formatDateJoin(dateStr) {
  if (!dateStr) return "";
  const [y, mo, d] = dateStr.split("-");
  if (!y || !mo || !d) return dateStr;
  return `${mo}/${d}/${y}`;
}

/**
 * Shared form state + department loading logic for Register & Edit modals.
 * locations/roles/shifts come from the parent (already loaded).
 */
export function useEmployeeForm(locations = []) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Re-fetch departments when location changes
  useEffect(() => {
    if (!form.locationId) { setDepartments([]); return; }
    setDeptLoading(true);
    fetchDepartmentsByLocation(form.locationId).then((deps) => {
      setDepartments(deps);
      setDeptLoading(false);
    });
  }, [form.locationId]);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const reset = () => { setForm(EMPTY_FORM); setErrors({}); setDepartments([]); };

  const validate = (isEdit = false) => {
    const e = {};
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.firstName.trim()) e.firstName = "First name is required";
    else if (!nameRegex.test(form.firstName.trim())) e.firstName = "First name must contain only letters";
    else if (form.firstName.trim().length < 2) e.firstName = "First name must be at least 2 characters";

    if (!form.lastName.trim()) e.lastName = "Last name is required";
    else if (!nameRegex.test(form.lastName.trim())) e.lastName = "Last name must contain only letters";
    else if (form.lastName.trim().length < 2) e.lastName = "Last name must be at least 2 characters";

    if (!form.email.trim()) e.email = "Email is required";
    else if (!emailRegex.test(form.email.trim())) e.email = "Please enter a valid email address";

    if (!isEdit && !form.password) e.password = "Password is required";
    else if (!isEdit && form.password && form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!isEdit && form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";

    if (!form.employeeCode.trim()) e.employeeCode = "Employee code is required";
    else if (form.employeeCode.trim().length < 2) e.employeeCode = "Employee code must be at least 2 characters";
    else if (form.employeeCode.trim().length > 50) e.employeeCode = "Employee code must not exceed 50 characters";

    if (!form.locationId)          e.locationId = "Location is required";
    if (!form.departmentId)        e.departmentId = "Department is required";
    if (!form.roleId)              e.roleId = "Role is required";
    if (!form.timezone)            e.timezone = "Timezone is required";
    if (form.mobile) {
      const digits = form.mobile.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) e.mobile = "Mobile number must be 7–15 digits";
    }
    if (form.mobile && !form.countryCode.trim()) e.countryCode = "Country code is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /**
   * Build a plain payload object matching the v3 API field names.
   * Register → POST /user/user-register
   * Edit     → POST /user/user-profile-update
   *
   * The v3 API expects JSON (or x-www-form-urlencoded), NOT multipart FormData.
   */
  const buildFormData = async (extraFields = {}) => {
    const [tzName, tzOffset] = (form.timezone || "|").split("|");
    const locationLabel = locations.find((l) => l.value === form.locationId)?.label ?? "";
    const deptLabel = departments.find((d) => d.value === form.departmentId)?.label ?? "";

    const encryptedPwd = form.password ? await encryptPassword(form.password) : "";

    const payload = {
      name:            form.firstName,
      first_name:      form.firstName,
      last_name:       form.lastName,
      email:           form.email.toLowerCase(),
      phone:           form.mobile ? `${form.countryCode}-${form.mobile}` : "",
      emp_code:        form.employeeCode,
      location_id:     form.locationId,
      department_id:   form.departmentId,
      role_id:         form.roleId,
      role:            form.roleId,
      location:        locationLabel,
      department:      deptLabel,
      timezone:        tzName,
      timezone_offset: offsetToSeconds(tzOffset),
      date_join:       formatDateJoin(form.dateOfJoining),
      shift_id:        form.shift || "0",
      address:         form.address,
      status:          "1",
      project_name:    "",
      hris_id:         "",
      employement_id:  "",
      expiry_period:   "",
      is_mobile:       "0",
      skip:            "0",
      limit:           "100",
      ...extraFields,
    };

    if (encryptedPwd) payload.password = encryptedPwd;

    return payload;
  };

  return { form, set, reset, errors, departments, deptLoading, validate, buildFormData };
}
