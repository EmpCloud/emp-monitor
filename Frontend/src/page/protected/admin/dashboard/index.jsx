import React, { useEffect, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import Stats from "@/components/common/Stats";
import ActivitySnapshot from "@/components/common/Snapshot";
import ActivityBreakDown from "@/components/common/ActivityBreakDown";
import EmpAi from "@/components/common/EmpAi";

import ActiveEmp from "@/components/common/ActiveEmp";
import NonActiveEmp from "@/components/common/NonActiveEmp";

import LocationPerformance from "@/components/common/Location";
import DepartmentPerformance from "@/components/common/Department";

import WebUsageChart from "@/components/common/WebUsage";
import AppUsageChart from "@/components/common/ApplicationUsage";

import TopProductiveEmployees from "@/components/common/Productive";
import TopNonProductiveEmployees from "@/components/common/NonProductive";

import Customreport from "@/components/common/elements/Customreport";
import CustomTab from "@/components/common/elements/CustomTab";

import ViewReportModal from "@/components/common/elements/ViewReportModal";
import EmpAiAssistant from "@/components/common/aempaiassistant";
import DashboardFilter from "./DashboardFilter";
import PerformanceFilter from "./PerformanceFilter";

import { useDashboardStore } from "./dashboardStore";

const Dashboard = () => {

  const { t } = useTranslation();

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
    fetchDepartmentPerformance
  } = useDashboardStore();

  const [reportModal, setReportModal] = useState({ open: false, title: "", mode: "employee_activity", employees: [], staticData: null, by: "today" });
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiContext, setAiContext] = useState(null);

  const openAiAssistant = useCallback((ctx) => {
    setAiContext(ctx);
    setAiAssistantOpen(true);
  }, []);

  const openViewReport = useCallback((title, opts = {}) => {
    setReportModal({
      open: true,
      title,
      mode: opts.mode || "employee_activity",
      employees: opts.employees || [],
      staticData: opts.staticData || null,
      by: opts.by || "today",
    });
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Refetch productive employees whenever productive filters change
  useEffect(() => {
    fetchProductiveEmployees({
      by: filters.productiveBy,
      locationId: filters.productiveLocation,
      departmentId: filters.productiveDepartment
    });
  }, [
    fetchProductiveEmployees,
    filters.productiveBy,
    filters.productiveLocation,
    filters.productiveDepartment
  ]);

  // Refetch non-productive employees whenever unproductive filters change
  useEffect(() => {
    fetchNonProductiveEmployees({
      by: filters.unproductiveBy,
      locationId: filters.unproductiveLocation,
      departmentId: filters.unproductiveDepartment
    });
  }, [
    fetchNonProductiveEmployees,
    filters.unproductiveBy,
    filters.unproductiveLocation,
    filters.unproductiveDepartment
  ]);

  // Refetch active employees whenever active filters change
  useEffect(() => {
    fetchActiveEmployees({
      by: filters.activeBy,
      locationId: filters.activeLocation,
      departmentId: filters.activeDepartment
    });
  }, [
    fetchActiveEmployees,
    filters.activeBy,
    filters.activeLocation,
    filters.activeDepartment
  ]);

  // Refetch non-active employees whenever non-active filters change
  useEffect(() => {
    fetchNonActiveEmployees({
      by: filters.nonActiveBy,
      locationId: filters.nonActiveLocation,
      departmentId: filters.nonActiveDepartment
    });
  }, [
    fetchNonActiveEmployees,
    filters.nonActiveBy,
    filters.nonActiveLocation,
    filters.nonActiveDepartment
  ]);

  // Refetch location performance whenever location performance filters change
  useEffect(() => {
    fetchLocationPerformance({
      by: filters.locationPerformanceBy,
      type: filters.locationPerformanceType,
    });
  }, [
    fetchLocationPerformance,
    filters.locationPerformanceBy,
    filters.locationPerformanceType
  ]);

  // Refetch department performance whenever department performance filters change
  useEffect(() => {
    fetchDepartmentPerformance({
      by: filters.departmentPerformanceBy,
      type: filters.departmentPerformanceType,
    });
  }, [
    fetchDepartmentPerformance,
    filters.departmentPerformanceBy,
    filters.departmentPerformanceType
  ]);

  const handleLocationChange = useCallback(async (value, type) => {

    setFilter(`${type}Location`, value);
    setFilter(`${type}Department`, "all");

    await fetchDepartmentsByLocation(value, type);

  }, []);

  const handleDepartmentChange = useCallback((value, type) => {

    setFilter(`${type}Department`, value);

  }, []);

  const handleTabChange = useCallback((value, type) => {
    if (type === "locationPerformance") {
      setFilter("locationPerformanceBy", value);
    } else if (type === "departmentPerformance") {
      setFilter("departmentPerformanceBy", value);
    } else {
      setFilter(`${type}By`, value);
    }
  }, [setFilter]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-20 h-20 flex items-center justify-center">
          <video 
            src="/src/assets/ai.webm" 
            autoPlay
            loop
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    );
  }

  return (

    <div className="bg-slate-200 w-full p-5">

      <Stats stats={stats} />

      <div className="grid grid-cols-12 gap-3 py-5">

        <div className="xl:col-span-4 col-span-12">
          <ActivitySnapshot data={activitySnapshot} />
        </div>

        <div className="xl:col-span-5 col-span-12">
          <ActivityBreakDown data={activityBreakdown} />
        </div>

        <div className="xl:col-span-3 col-span-12">
          <EmpAi />
        </div>

        {/* Productive */}

        <div className="xl:col-span-6 col-span-12">

          <TopProductiveEmployees
            title={t("top10productive")}
            columns={[`${t("employee")} ${t("name")}`, `${t("time")} (${t("hours")})`]}
            employees={productiveEmployees}
            loading={productiveEmployeesLoading}
            report={
              <Customreport
                showShield
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10productive"))}
                onViewReport={() => openViewReport(t("topProductiveReport"), { employees: productiveEmployees, by: filters.productiveBy })}
              />
            }
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

        {/* Non Productive */}

        <div className="xl:col-span-6 col-span-12">

          <TopNonProductiveEmployees
            title={t("top10nonproductive")}
            columns={[`${t("employee")} ${t("name")}`, `${t("time")} (${t("hours")})`]}
            employees={unproductiveEmployees}
            loading={unproductiveEmployeesLoading}
            report={
              <Customreport
                showShield
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10nonproductive"))}
                onViewReport={() => openViewReport(t("topNonProductiveReport"), { employees: unproductiveEmployees, by: filters.unproductiveBy })}
              />
            }
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

        <div className="xl:col-span-6 col-span-12">
          <ActiveEmp
            title={t("top10active")}
            employees={activeEmployees}
            loading={activeEmployeesLoading}
            report={
              <Customreport
                showShield
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10active"))}
                onViewReport={() => openViewReport(t("topActiveReport"), { mode: "timesheet", staticData: activeEmployees, by: filters.activeBy })}
              />
            }
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
            report={
              <Customreport
                showShield
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10nonactive"))}
                onViewReport={() => openViewReport(t("topNonActiveReport"), { mode: "timesheet", staticData: nonActiveEmployees, by: filters.nonActiveBy })}
              />
            }
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

        <div className="xl:col-span-6 col-span-12">
          <LocationPerformance
            title={t("locPerform")}
            data={locationPerformance}
            loading={locationPerformanceLoading}
            report={
              <Customreport
                showShield
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("locPerform"))}
                onViewReport={() => openViewReport(t("locPerform"), { mode: "performance", staticData: locationPerformance?.rows || [] })}
              />
            }
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
            report={
              <Customreport
                showShield
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("deptPerform"))}
                onViewReport={() => openViewReport(t("deptPerform"), { mode: "performance", staticData: departmentPerformance?.rows || [] })}
              />
            }
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

        <div className="xl:col-span-6 col-span-12">
          <WebUsageChart
            title={t("top10webUsage")}
            data={webUsage}
            report={
              <Customreport
                showShield
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10webUsage"))}
                onViewReport={() => openViewReport(t("topWebUsageReport"), { mode: "web_app", staticData: webUsage?.today || [] })}
              />
            }
          />
        </div>

        <div className="xl:col-span-6 col-span-12">
          <AppUsageChart
            title={t("top10appUsage")}
            data={appUsage}
            report={
              <Customreport
                showShield
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10appUsage"))}
                onViewReport={() => openViewReport(t("topAppUsageReport"), { mode: "web_app", staticData: appUsage?.today || [] })}
              />
            }
          />
        </div>

      </div>

      <ViewReportModal
        open={reportModal.open}
        onOpenChange={(v) => setReportModal((prev) => ({ ...prev, open: v }))}
        title={reportModal.title}
        mode={reportModal.mode}
        employees={reportModal.employees}
        staticData={reportModal.staticData}
        by={reportModal.by}
      />

      <EmpAiAssistant
        open={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        context={aiContext}
      />

    </div>

  );

};

export default Dashboard;