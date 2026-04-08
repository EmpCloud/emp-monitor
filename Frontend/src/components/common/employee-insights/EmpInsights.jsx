
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { MapPin, Pencil } from "lucide-react"
import InsightsFilter from "./InsightsFilter"
import InsightsGraphs from "./InsightsGraphs"
import {
  getDepartments,
  getEmployeeInsights,
  getEmployeesList,
  getLocations,
  getRoles,
} from "@/page/protected/admin/employee-insights/service"
import { getSessionCookie } from "@/lib/sessionCookie"



import { FaLocationDot, FaPen } from "react-icons/fa6";
import EmpInsightsLogo from "../../../assets/employee/employee_insights.svg";

// import React, { useState } from "react";
// import { MapPin, Pencil } from "lucide-react";
// import { FaLocationDot, FaPen } from "react-icons/fa6";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import InsightsFilter from "./InsightsFilter";
// import InsightsGraphs from "./InsightsGraphs";
// import EmpInsightsLogo from "../../../assets/employee/employee_insights.svg";



const ROLES = [
  { label: "See all", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "manager" },
  { label: "Employee", value: "employee" },
];

const LOCATIONS = [
  { label: "See all", value: "all" },
  { label: "default", value: "default" },
];

const DEPARTMENTS = [
  { label: "See all", value: "all" },
  { label: "Default", value: "default" },
];

const EMPLOYEES = [
  { label: "See All Employee", value: "all" },
];

const DATE_RANGES = [
  { label: "January 16, 2026 - January 22, 2026", value: "week-1" },
];

const EmpInsights = () => {
  const { t } = useTranslation()
  const session = getSessionCookie()
  const managerId = session?.is_admin ? null : session?.user_id ?? session?.id ?? null
  const today = new Date().toISOString().split("T")[0]
  const [roles, setRoles] = useState(ROLES)
  const [locations, setLocations] = useState(LOCATIONS)
  const [departments, setDepartments] = useState(DEPARTMENTS)
  const [role, setRole] = useState("all")
  const [location, setLocation] = useState("all")
  const [department, setDepartment] = useState("all")
  const [employee, setEmployee] = useState("all")
  const [dateRange, setDateRange] = useState("week-1")
  const [selectedDate, setSelectedDate] = useState(today)
  const [employees, setEmployees] = useState(EMPLOYEES)
  const [insightStats, setInsightStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const fetchFilterData = async () => {
      const [rolesRes, locationsRes, departmentsRes] = await Promise.all([
        getRoles(),
        getLocations(),
        getDepartments(),
      ])

      if (Array.isArray(rolesRes?.stats) && rolesRes.stats.length) {
        setRoles(rolesRes.stats)
      }
      if (Array.isArray(locationsRes?.stats) && locationsRes.stats.length) {
        setLocations(locationsRes.stats)
      }
      if (Array.isArray(departmentsRes?.stats) && departmentsRes.stats.length) {
        setDepartments(departmentsRes.stats)
      }
    }

    fetchFilterData()
  }, [])

  useEffect(() => {
    const fetchEmployees = async () => {
      const employeesRes = await getEmployeesList({
        roleId: role,
        locationId: location,
        departmentId: department,
        managerId,
      })
      if (Array.isArray(employeesRes?.stats) && employeesRes.stats.length) {
        setEmployees(employeesRes.stats)
        const exists = employeesRes.stats.some((item) => item.value === employee)
        if (!exists) {
          const firstRealEmployee = employeesRes.stats.find((item) => item.value !== "all")?.value || "all"
          setEmployee(firstRealEmployee)
        }
      } else {
        setEmployees([{ value: "all", label: "See All Employee" }])
        setEmployee("all")
      }
    }

    fetchEmployees()
  }, [role, location, department, managerId])

  useEffect(() => {
    const fetchInsights = async () => {
      const resolvedEmployeeId =
        employee && employee !== "all"
          ? employee
          : employees.find((item) => item.value !== "all")?.value

      if (!resolvedEmployeeId) {
        setInsightStats(null)
        return
      }
      setLoading(true)
      const res = await getEmployeeInsights({
        employeeId: resolvedEmployeeId,
        date: selectedDate,
      })
      setInsightStats(res?.stats || null)
      setLoading(false)
    }
    fetchInsights()
  }, [role, location, department, employee, selectedDate, dateRange, employees])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full">
      <div className="p-9 pb-1 w-full">
        {/* Header */}
        <div className="flex relative items-start justify-between gap-4 mb-7">
          <div className="border-l-2 border-blue-500 pl-4">
            <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
              <span className="font-semibold">{t("employee")}</span> {t("insights_title")}
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-sm leading-5">


            </p>
          </div>
          <div className="absolute right-0 -top-4 hidden lg:flex items-end gap-1 mr-2">
            <img alt="attendance" className="w-42 h-32" src={EmpInsightsLogo} />
          </div>
        </div>

      {/* Filters + show entries (like attendance with a dedicated filter component) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <InsightsFilter
          roles={roles}
          locations={locations}
          departments={departments}
          employees={employees}
          dateRanges={DATE_RANGES}
          roleValue={role}
          locationValue={location}
          departmentValue={department}
          employeeValue={employee}
          dateRangeValue={dateRange}
          selectedDate={selectedDate}
          pageSizeValue={undefined}
          onRoleChange={(v) => {
            setRole(v)
            setCurrentPage(1)
          }}
          onLocationChange={(v) => {
            setLocation(v)
            setCurrentPage(1)
          }}
          onDepartmentChange={(v) => {
            setDepartment(v)
            setCurrentPage(1)
          }}
          onEmployeeChange={(v) => {
            setEmployee(v)
            setCurrentPage(1)
          }}
          onDateRangeChange={(v) => {
            setDateRange(v)
            setCurrentPage(1)
          }}
          onSelectedDateChange={(v) => {
            setSelectedDate(v)
            setCurrentPage(1)
          }}
          onPageSizeChange={undefined}
          onDownloadCsv={null}
        />
      </div>



        <div className="flex items-center gap-6 w-full mt-8  border-t border-[#6B6B6B]/20 pt-4">
          <div className="flex items-center gap-2 min-w-fit">
            <span className="text-sm text-[#424242]">
              {t("insights_current_location")} :{" "}
            </span>
            <FaLocationDot className="h-4 w-4 text-red-500 fill-red-500" />
          </div>

          <div className="relative flex-1">
            <div className="h-10 w-full rounded-lg bg-[#DADADA] px-4 pr-12 flex items-center">
              <span className="text-xs text-slate-500 truncate">
                {insightStats?.currentLocation || ""}
              </span>
            </div>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700"
              aria-label="Edit current location"
            >
              <FaPen className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <InsightsGraphs insightStats={insightStats} />
      {loading ? <p className="text-xs text-slate-400 mt-3">{t("insights_loading")}</p> : null}

    </div>

  );
};

export default EmpInsights;
