import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

import Stats             from "@/components/common/Stats";
import ActivitySnapshot  from "@/components/common/Snapshot";
import ActivityBreakDown from "@/components/common/ActivityBreakDown";
import EmpAi             from "@/components/common/EmpAi";
import ActiveEmp         from "@/components/common/ActiveEmp";
import NonActiveEmp      from "@/components/common/NonActiveEmp";
import LocationPerformance   from "@/components/common/Location";
import DepartmentPerformance from "@/components/common/Department";
import WebUsageChart     from "@/components/common/WebUsage";
import AppUsageChart     from "@/components/common/ApplicationUsage";
import TopProductiveEmployees    from "@/components/common/Productive";
import TopNonProductiveEmployees from "@/components/common/NonProductive";
import Customreport from "@/components/common/elements/Customreport";

import DashboardFilter  from "../../admin/dashboard/DashboardFilter";
import PerformanceFilter from "../../admin/dashboard/PerformanceFilter";

import { useNonAdminDashboardStore } from "./dashboardStore";
import useNonAdminSession from "../../../../sessions/useNonAdminSession";
import { usePermission }  from "../../../../hooks/usePermission";
import { isEmpAiAssistantEnabled } from "@/lib/utils";

// ── PDF export helpers (shared across modules) ──────────────────────
const fmtDuration = (sec) => {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return "-";
  const total = Math.floor(n);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
const fmtPercent = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(2)}%` : "-";
};
const empName = (e) => {
  const f = e?.first_name ?? "";
  const l = e?.last_name ?? "";
  const full = `${f} ${l}`.trim();
  return full || e?.name || e?.employee_name || "-";
};

const NonAdminDashboard = () => {
  const { t } = useTranslation();
  const { nonAdmin }   = useNonAdminSession();
  const { canView }    = usePermission(nonAdmin);
  const showEmpAiAssistant = isEmpAiAssistantEnabled();

  const {
    stats,
    activitySnapshot,
    activityBreakdown,
    webUsage,
    appUsage,
    locations,
    departments,
    productiveEmployees,
    productiveEmployeesLoading,
    unproductiveEmployees,
    unproductiveEmployeesLoading,
    activeEmployees,
    activeEmployeesLoading,
    nonActiveEmployees,
    nonActiveEmployeesLoading,
    locationPerformance,
    locationPerformanceLoading,
    departmentPerformance,
    departmentPerformanceLoading,
    filters,
    loading,
    setFilter,
    loadDashboard,
    fetchDepartmentsByLocation,
    fetchProductiveEmployees,
    fetchNonProductiveEmployees,
    fetchActiveEmployees,
    fetchNonActiveEmployees,
    fetchLocationPerformance,
    fetchDepartmentPerformance,
  } = useNonAdminDashboardStore();

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    fetchProductiveEmployees({
      by: filters.productiveBy,
      locationId: filters.productiveLocation,
      departmentId: filters.productiveDepartment,
    });
  }, [fetchProductiveEmployees, filters.productiveBy, filters.productiveLocation, filters.productiveDepartment]);

  useEffect(() => {
    fetchNonProductiveEmployees({
      by: filters.unproductiveBy,
      locationId: filters.unproductiveLocation,
      departmentId: filters.unproductiveDepartment,
    });
  }, [fetchNonProductiveEmployees, filters.unproductiveBy, filters.unproductiveLocation, filters.unproductiveDepartment]);

  useEffect(() => {
    fetchActiveEmployees({
      by: filters.activeBy,
      locationId: filters.activeLocation,
      departmentId: filters.activeDepartment,
    });
  }, [fetchActiveEmployees, filters.activeBy, filters.activeLocation, filters.activeDepartment]);

  useEffect(() => {
    fetchNonActiveEmployees({
      by: filters.nonActiveBy,
      locationId: filters.nonActiveLocation,
      departmentId: filters.nonActiveDepartment,
    });
  }, [fetchNonActiveEmployees, filters.nonActiveBy, filters.nonActiveLocation, filters.nonActiveDepartment]);

  useEffect(() => {
    fetchLocationPerformance({
      by: filters.locationPerformanceBy,
      type: filters.locationPerformanceType,
    });
  }, [fetchLocationPerformance, filters.locationPerformanceBy, filters.locationPerformanceType]);

  useEffect(() => {
    fetchDepartmentPerformance({
      by: filters.departmentPerformanceBy,
      type: filters.departmentPerformanceType,
    });
  }, [fetchDepartmentPerformance, filters.departmentPerformanceBy, filters.departmentPerformanceType]);

  const handleLocationChange = useCallback(async (value, type) => {
    setFilter(`${type}Location`, value);
    setFilter(`${type}Department`, "all");
    await fetchDepartmentsByLocation(value, type);
  }, [setFilter, fetchDepartmentsByLocation]);

  const handleDepartmentChange = useCallback((value, type) => {
    setFilter(`${type}Department`, value);
  }, [setFilter]);

  const handleTabChange = useCallback((value, type) => {
    if (type === "locationPerformance") {
      setFilter("locationPerformanceBy", value);
    } else if (type === "departmentPerformance") {
      setFilter("departmentPerformanceBy", value);
    } else {
      setFilter(`${type}By`, value);
    }
  }, [setFilter]);

  // Permission flags — mirrors the Laravel blade dual-gate pattern
  const showInsights   = canView("employee_insights_view", "employee_insights");
  const showEmpDetails = canView("employee_view",          "employee_details");
  const showWebUsage   = canView("employee_webusage_view");
  const showAppUsage   = canView("employee_application_usage_view");

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-20 h-20 flex items-center justify-center">
          <video
            src="/src/assets/ai.webm"
            autoPlay loop playsInline muted
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    );
  }

  // Each module supplies its own data/columns so the downloaded PDF
  // reflects what's actually visible on that card.
  const makeControls = ({ pdfTitle, pdfSubtitle, pdfMeta, pdfData, pdfColumns } = {}) => (
    <Customreport
      title={pdfTitle}
      showShield={showEmpAiAssistant}
      showButton
      showMaximize
      showDownload
      pdfTitle={pdfTitle}
      pdfSubtitle={pdfSubtitle}
      pdfMeta={pdfMeta}
      pdfData={pdfData}
      pdfColumns={pdfColumns}
    />
  );

  const employeeListColumns = [
    { header: "#", render: (_, i) => i, width: 24 },
    { header: "Employee", render: empName },
    { header: "Emp Code", render: (r) => r?.emp_code ?? "-" },
    { header: "Department", render: (r) => r?.department ?? "-" },
    { header: "Location", render: (r) => r?.location ?? "-" },
    { header: "Active Time", render: (r) => fmtDuration(r?.computer_activities_time) },
    { header: "Productivity", render: (r) => fmtPercent(r?.productivity) },
  ];

  const productiveListColumns = [
    { header: "#", render: (_, i) => i, width: 24 },
    { header: "Employee", render: empName },
    { header: "Emp Code", render: (r) => r?.emp_code ?? "-" },
    { header: "Active Time", render: (r) => fmtDuration(r?.duration ?? r?.time_hours) },
    { header: "Productivity", render: (r) => fmtPercent(r?.percentage ?? r?.productivity) },
  ];

  const usageListColumns = (entityHeader) => [
    { header: "#", render: (_, i) => i, width: 24 },
    { header: entityHeader, render: (r) => r?.name ?? "-" },
    { header: "Usage %", render: (r) => fmtPercent(r?.value) },
  ];

  const performanceListColumns = (entityHeader) => [
    { header: "#", render: (_, i) => i, width: 24 },
    { header: entityHeader, render: (r) => r?.name ?? "-" },
    { header: "Total Time", render: (r) => r?.hours ?? r?.time ?? "-" },
  ];

  const today = new Date().toLocaleDateString();

  return (
    <div className="bg-slate-200 w-full p-5">

      <Stats stats={stats} />

      <div className="grid grid-cols-12 gap-3 py-5">

        <div className="xl:col-span-4 col-span-12">
          <ActivitySnapshot data={activitySnapshot} />
        </div>

        <div className={`${showEmpAiAssistant ? "xl:col-span-5" : "xl:col-span-8"} col-span-12`}>
          <ActivityBreakDown data={activityBreakdown} />
        </div>

        {showEmpAiAssistant && (
          <div className="xl:col-span-3 col-span-12">
            <EmpAi useStore={useNonAdminDashboardStore} />
          </div>
        )}

        {/* Productive / Non-Productive — gated by employee_insights_view */}
        {showInsights && (
          <>
            <div className="xl:col-span-6 col-span-12">
              <TopProductiveEmployees
                title={t("top10productive")}
                columns={[`${t("employee")} ${t("name")}`, `${t("time")} (${t("hours")})`, "Productivity"]}
                employees={productiveEmployees}
                loading={productiveEmployeesLoading}
                report={makeControls({
                  pdfTitle: t("top10productive"),
                  pdfSubtitle: "Employees with the highest productive time over the selected period.",
                  pdfMeta: {
                    Module: "Top 10 Productive Employees",
                    "Date Generated": today,
                    "View By": filters.productiveBy || "today",
                    Location: filters.productiveLocation || "All",
                    Department: filters.productiveDepartment || "All",
                  },
                  pdfData: productiveEmployees,
                  pdfColumns: productiveListColumns,
                })}
                filter={
                  <DashboardFilter
                    locations={locations}
                    departments={departments.productive}
                    locationValue={filters.productiveLocation}
                    departmentValue={filters.productiveDepartment}
                    tabValue={filters.productiveBy}
                    onLocationChange={(v) => handleLocationChange(v, "productive")}
                    onDepartmentChange={(v) => handleDepartmentChange(v, "productive")}
                    onTabChange={(v) => handleTabChange(v, "productive")}
                  />
                }
              />
            </div>

            <div className="xl:col-span-6 col-span-12">
              <TopNonProductiveEmployees
                title={t("top10nonproductive")}
                columns={[`${t("employee")} ${t("name")}`, `${t("time")} (${t("hours")})`]}
                employees={unproductiveEmployees}
                loading={unproductiveEmployeesLoading}
                report={makeControls({
                  pdfTitle: t("top10nonproductive"),
                  pdfSubtitle: "Employees with the lowest productive time / highest idle time.",
                  pdfMeta: {
                    Module: "Top 10 Non-Productive Employees",
                    "Date Generated": today,
                    "View By": filters.unproductiveBy || "today",
                    Location: filters.unproductiveLocation || "All",
                    Department: filters.unproductiveDepartment || "All",
                  },
                  pdfData: unproductiveEmployees,
                  pdfColumns: productiveListColumns,
                })}
                filter={
                  <DashboardFilter
                    locations={locations}
                    departments={departments.unproductive}
                    locationValue={filters.unproductiveLocation}
                    departmentValue={filters.unproductiveDepartment}
                    tabValue={filters.unproductiveBy}
                    onLocationChange={(v) => handleLocationChange(v, "unproductive")}
                    onDepartmentChange={(v) => handleDepartmentChange(v, "unproductive")}
                    onTabChange={(v) => handleTabChange(v, "unproductive")}
                  />
                }
              />
            </div>
          </>
        )}

        {/* Active / Non-Active — gated by employee_view */}
        {showEmpDetails && (
          <>
            <div className="xl:col-span-6 col-span-12">
              <ActiveEmp
                title={t("top10active")}
                employees={activeEmployees}
                loading={activeEmployeesLoading}
                report={makeControls({
                  pdfTitle: t("top10active"),
                  pdfSubtitle: "Employees with the highest active hours on their workstations.",
                  pdfMeta: {
                    Module: "Top 10 Active Employees",
                    "Date Generated": today,
                    "View By": filters.activeBy || "today",
                    Location: filters.activeLocation || "All",
                    Department: filters.activeDepartment || "All",
                  },
                  pdfData: activeEmployees,
                  pdfColumns: employeeListColumns,
                })}
                filter={
                  <DashboardFilter
                    locations={locations}
                    departments={departments.active || []}
                    locationValue={filters.activeLocation}
                    departmentValue={filters.activeDepartment}
                    tabValue={filters.activeBy}
                    onLocationChange={(v) => handleLocationChange(v, "active")}
                    onDepartmentChange={(v) => handleDepartmentChange(v, "active")}
                    onTabChange={(v) => handleTabChange(v, "active")}
                  />
                }
              />
            </div>

            <div className="xl:col-span-6 col-span-12">
              <NonActiveEmp
                title={t("top10nonactive")}
                employees={nonActiveEmployees}
                loading={nonActiveEmployeesLoading}
                report={makeControls({
                  pdfTitle: t("top10nonactive"),
                  pdfSubtitle: "Employees with the lowest active hours during the period.",
                  pdfMeta: {
                    Module: "Top 10 Non-Active Employees",
                    "Date Generated": today,
                    "View By": filters.nonActiveBy || "today",
                    Location: filters.nonActiveLocation || "All",
                    Department: filters.nonActiveDepartment || "All",
                  },
                  pdfData: nonActiveEmployees,
                  pdfColumns: employeeListColumns,
                })}
                filter={
                  <DashboardFilter
                    locations={locations}
                    departments={departments.nonActive || []}
                    locationValue={filters.nonActiveLocation}
                    departmentValue={filters.nonActiveDepartment}
                    tabValue={filters.nonActiveBy}
                    onLocationChange={(v) => handleLocationChange(v, "nonActive")}
                    onDepartmentChange={(v) => handleDepartmentChange(v, "nonActive")}
                    onTabChange={(v) => handleTabChange(v, "nonActive")}
                  />
                }
              />
            </div>
          </>
        )}

        {/* Location & Department Performance — always visible for non-admin */}
        <div className="xl:col-span-6 col-span-12">
          <LocationPerformance
            title={t("locPerform")}
            data={locationPerformance}
            loading={locationPerformanceLoading}
            report={makeControls({
              pdfTitle: t("locPerform"),
              pdfSubtitle: "Aggregated productive hours grouped by office location.",
              pdfMeta: {
                Module: "Location Performance",
                "Date Generated": today,
                "View By": filters.locationPerformanceBy || "today",
                "Metric Type": filters.locationPerformanceType || "default",
              },
              pdfData: locationPerformance?.rows || [],
              pdfColumns: performanceListColumns("Location"),
            })}
            filter={
              <PerformanceFilter
                tabValue={filters.locationPerformanceBy}
                typeValue={filters.locationPerformanceType}
                onTabChange={(v) => handleTabChange(v, "locationPerformance")}
                onTypeChange={(v) => setFilter("locationPerformanceType", v)}
                typePlaceholder={t("idleLabel")}
              />
            }
          />
        </div>

        <div className="xl:col-span-6 col-span-12">
          <DepartmentPerformance
            title={t("deptPerform")}
            data={departmentPerformance}
            loading={departmentPerformanceLoading}
            report={makeControls({
              pdfTitle: t("deptPerform"),
              pdfSubtitle: "Aggregated productive hours grouped by department.",
              pdfMeta: {
                Module: "Department Performance",
                "Date Generated": today,
                "View By": filters.departmentPerformanceBy || "today",
                "Metric Type": filters.departmentPerformanceType || "default",
              },
              pdfData: departmentPerformance?.rows || [],
              pdfColumns: performanceListColumns("Department"),
            })}
            filter={
              <PerformanceFilter
                tabValue={filters.departmentPerformanceBy}
                typeValue={filters.departmentPerformanceType}
                onTabChange={(v) => handleTabChange(v, "departmentPerformance")}
                onTypeChange={(v) => setFilter("departmentPerformanceType", v)}
                typePlaceholder={t("productive")}
              />
            }
          />
        </div>

        {/* Web Usage — gated by employee_webusage_view */}
        {showWebUsage && (
          <div className="xl:col-span-6 col-span-12">
            <WebUsageChart
              title={t("top10webUsage")}
              data={webUsage}
              report={makeControls({
                pdfTitle: t("top10webUsage"),
                pdfSubtitle: "The 10 websites that received the most total time during the period.",
                pdfMeta: {
                  Module: "Top 10 Website Usage",
                  "Date Generated": today,
                  Period: "Today",
                },
                pdfData: webUsage?.today || [],
                pdfColumns: usageListColumns("Website"),
              })}
            />
          </div>
        )}

        {/* App Usage — gated by employee_application_usage_view */}
        {showAppUsage && (
          <div className="xl:col-span-6 col-span-12">
            <AppUsageChart
              title={t("top10appUsage")}
              data={appUsage}
              report={makeControls({
                pdfTitle: t("top10appUsage"),
                pdfSubtitle: "The 10 applications that received the most total time during the period.",
                pdfMeta: {
                  Module: "Top 10 Application Usage",
                  "Date Generated": today,
                  Period: "Today",
                },
                pdfData: appUsage?.today || [],
                pdfColumns: usageListColumns("Application"),
              })}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default NonAdminDashboard;
