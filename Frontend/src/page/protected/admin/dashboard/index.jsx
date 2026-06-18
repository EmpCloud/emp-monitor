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
import { generateCombinedDashboardPdf } from "@/utils/dashboardPdfExport";
import { isEmpAiAssistantEnabled } from "@/lib/utils";
import { FileDown, Loader2, Calendar, CalendarDays, CalendarRange } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ── PDF export helpers ────────────────────────────────────────────────
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

const Dashboard = () => {

  const { t } = useTranslation();

  const {
    stats,
    statsLists,
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
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [webTab, setWebTab] = useState("today");
  const [appTab, setAppTab] = useState("today");
  const showEmpAiAssistant = isEmpAiAssistantEnabled();

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

  // Open an EMP-AI insight card in the dashboard's ViewReportModal instead of
  // navigating away. The card's `modal.dataset` names a store slice; resolve it
  // to the actual rows here. web/app slices store the list under `.today`;
  // statsLists buckets and the *Employees arrays are already plain lists.
  const handleOpenInsight = useCallback((card) => {
    const m = card?.modal;
    if (!m) return;
    const SOURCES = {
      absentEmp: statsLists?.absentEmp,
      idleEmps: statsLists?.idleEmps,
      offlineEmp: statsLists?.offlineEmp,
      onlineEmps: statsLists?.onlineEmps,
      registeredEmp: statsLists?.registeredEmp,
      suspendedEmp: statsLists?.suspendedEmp,
      productiveEmployees,
      unproductiveEmployees,
      nonActiveEmployees,
      activeEmployees,
      locationPerformance: locationPerformance?.rows,
      departmentPerformance: departmentPerformance?.rows,
      webUsage: webUsage?.today,
      appUsage: appUsage?.today,
    };
    const data = Array.isArray(SOURCES[m.dataset]) ? SOURCES[m.dataset] : [];
    if (m.mode === "employee_activity") {
      // Activity columns are fetched per-employee from the ids in `employees`.
      openViewReport(m.title, { mode: "employee_activity", employees: data });
    } else {
      // employee_list / timesheet / web_app all render staticData directly.
      openViewReport(m.title, { mode: m.mode, staticData: data });
    }
  }, [statsLists, productiveEmployees, unproductiveEmployees, nonActiveEmployees, activeEmployees, locationPerformance, departmentPerformance, webUsage, appUsage, openViewReport]);

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

  const handleDownloadAll = useCallback(async (period = "today") => {
    if (downloadingAll) return;
    setDownloadingAll(true);
    setPeriodDialogOpen(false);

    // Map period token → labels + webUsage / appUsage object key
    const periodLabel =
      period === "today" ? "Today"
      : period === "yesterday" ? "Yesterday"
      : "This Week";
    const usageKey = period === "thisweek" ? "thisWeek" : period;
    const today = new Date().toLocaleDateString();

    try {
      // Sync the live filter UI with the chosen period so the captured
      // screenshots show the right tab highlighted.
      setFilter("productiveBy", period);
      setFilter("unproductiveBy", period);
      setFilter("activeBy", period);
      setFilter("nonActiveBy", period);
      setFilter("locationPerformanceBy", period);
      setFilter("departmentPerformanceBy", period);
      // Web / App Usage chart cards keep their own internal tab — push
      // it so the screenshot reflects the chosen period too.
      setWebTab(period);
      setAppTab(period);

      // Re-fetch every module with the chosen period. Promise.all
      // resolves only after the store has been updated by each fetch.
      await Promise.all([
        fetchProductiveEmployees({
          by: period,
          locationId: filters.productiveLocation,
          departmentId: filters.productiveDepartment,
        }),
        fetchNonProductiveEmployees({
          by: period,
          locationId: filters.unproductiveLocation,
          departmentId: filters.unproductiveDepartment,
        }),
        fetchActiveEmployees({
          by: period,
          locationId: filters.activeLocation,
          departmentId: filters.activeDepartment,
        }),
        fetchNonActiveEmployees({
          by: period,
          locationId: filters.nonActiveLocation,
          departmentId: filters.nonActiveDepartment,
        }),
        fetchLocationPerformance({
          by: period,
          type: filters.locationPerformanceType,
        }),
        fetchDepartmentPerformance({
          by: period,
          type: filters.departmentPerformanceType,
        }),
      ]);

      // Let React commit the new data into the cards (two animation
      // frames is enough — was a 350ms blanket wait before).
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      );

      // Read fresh store state (the local closures above were captured
      // before the fetches resolved).
      const fresh = useDashboardStore.getState();
      const getEl = (key) =>
        document.querySelector(`[data-pdf-section="${key}"]`);

      // Guarantee all 6 stat buckets show up in the PDF even when the
      // dashboard store hasn't populated them yet (slow fetch / error /
      // empty response). Friendly names map to the existing i18n keys.
      const STAT_BUCKETS = [
        { key: "stat_total_enrollments", label: "Total Enrollments" },
        { key: "stat_currently_active",  label: "Currently Active (Present)" },
        { key: "stat_currently_idle",    label: "Currently Idle" },
        { key: "stat_currently_offline", label: "Currently Offline" },
        { key: "stat_absent",            label: "Absent" },
        { key: "stat_suspended",         label: "Suspended" },
      ];
      const freshStatsByKey = new Map(
        (fresh.stats || []).map((s) => [s?.labelKey, s])
      );
      const statRows = STAT_BUCKETS.map(({ key, label }) => {
        const match = freshStatsByKey.get(key);
        return {
          labelKey: key,
          friendlyLabel: label,
          value: match?.value ?? "-",
        };
      });

      // ── Per-bucket employee rosters (data behind each Stat card) ──
      const statsLists = fresh.statsLists || {};
      const rosterEmpName = (e) => {
        const f = e?.first_name ?? e?.firstName ?? "";
        const l = e?.last_name ?? e?.lastName ?? "";
        const full = `${f} ${l}`.trim();
        return full || e?.name || e?.employee_name || "-";
      };
      const ROSTER_COLUMNS = [
        { header: "#", render: (_, i) => i, width: 24 },
        { header: "Name", render: rosterEmpName },
        { header: "Emp Code", render: (e) => e?.emp_code ?? e?.empCode ?? "-" },
        { header: "Email", render: (e) => e?.a_email ?? e?.email ?? "-" },
        { header: "Department", render: (e) => e?.department ?? e?.department_name ?? "-" },
        { header: "Location", render: (e) => e?.location ?? e?.location_name ?? "-" },
      ];
      const ROSTERS = [
        { title: "Total Enrollments — Employee Roster",   key: "registeredEmp", subtitle: "Every employee registered on this organisation." },
        { title: "Currently Active Employees",            key: "onlineEmps",    subtitle: "Employees marked Active (Present) right now." },
        { title: "Currently Idle Employees",              key: "idleEmps",      subtitle: "Employees whose workstation is idle right now." },
        { title: "Currently Offline Employees",           key: "offlineEmp",    subtitle: "Employees whose agent is offline right now." },
        { title: "Absent Employees",                      key: "absentEmp",     subtitle: "Employees marked absent for today." },
        { title: "Suspended Employees",                   key: "suspendedEmp",  subtitle: "Employees whose accounts are suspended." },
      ];
      const rosterModules = ROSTERS
        .map(({ title, subtitle, key }) => {
          const list = Array.isArray(statsLists?.[key]) ? statsLists[key] : [];
          return list.length > 0
            ? {
                title,
                subtitle,
                target: null, // text-only; no card to screenshot
                data: list,
                meta: {
                  "Date Generated": today,
                  Bucket: title.split(" — ")[0],
                  Count: String(list.length),
                },
                columns: ROSTER_COLUMNS,
              }
            : null;
        })
        .filter(Boolean);

      const modules = [
        {
          title: "Dashboard Statistics",
          subtitle: "Real-time headcount across every employee bucket — total, present, idle, offline, absent and suspended.",
          target: getEl("stats"),
          data: statRows,
          meta: { "Date Generated": today },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Bucket", render: (r) => r?.friendlyLabel || t(r?.labelKey) || "-" },
            { header: "Count", render: (r) => r?.value ?? "-" },
          ],
        },
        ...rosterModules,
        {
          title: "Today's Activity Snapshot",
          subtitle: "Distribution of time across idle, active, productive, non-productive, and neutral buckets for today.",
          target: getEl("snapshot"),
          data: fresh.activitySnapshot,
          meta: { "Date Generated": today },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Activity", render: (r) => r?.label ?? "-" },
            { header: "Duration", render: (r) => fmtDuration(r?.value) },
          ],
        },
        {
          title: "Activity Break Down",
          subtitle: "Office, active, idle, productive, non-productive and neutral hours compared across Today / Yesterday / This Week.",
          target: getEl("breakdown"),
          data: fresh.activityBreakdown,
          meta: { "Date Generated": today },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Activity", render: (r) => r?.activity ?? "-" },
            { header: "Today", render: (r) => r?.today ?? "-" },
            { header: "Yesterday", render: (r) => r?.yesterday ?? "-" },
            { header: "This Week", render: (r) => r?.thisWeek ?? "-" },
          ],
        },
        {
          title: t("top10productive"),
          subtitle: "Employees with the highest productive time over the selected period.",
          target: getEl("productive"),
          data: fresh.productiveEmployees,
          meta: {
            "Date Generated": today,
            "View By": periodLabel,
            Location: filters.productiveLocation || "All",
            Department: filters.productiveDepartment || "All",
          },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Employee", render: empName },
            { header: "Emp Code", render: (r) => r?.emp_code ?? "-" },
            { header: "Active Time", render: (r) => fmtDuration(r?.duration ?? r?.time_hours) },
            { header: "Productivity", render: (r) => fmtPercent(r?.percentage ?? r?.productivity) },
          ],
        },
        {
          title: t("top10nonproductive"),
          subtitle: "Employees with the lowest productive time / highest idle time.",
          target: getEl("nonproductive"),
          data: fresh.unproductiveEmployees,
          meta: {
            "Date Generated": today,
            "View By": periodLabel,
            Location: filters.unproductiveLocation || "All",
            Department: filters.unproductiveDepartment || "All",
          },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Employee", render: empName },
            { header: "Emp Code", render: (r) => r?.emp_code ?? "-" },
            { header: "Active Time", render: (r) => fmtDuration(r?.duration ?? r?.time_hours) },
            { header: "Productivity", render: (r) => fmtPercent(r?.percentage ?? r?.productivity) },
          ],
        },
        {
          title: t("top10active"),
          subtitle: "Employees with the highest active hours on their workstations.",
          target: getEl("active"),
          data: fresh.activeEmployees,
          meta: {
            "Date Generated": today,
            "View By": periodLabel,
            Location: filters.activeLocation || "All",
            Department: filters.activeDepartment || "All",
          },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Employee", render: empName },
            { header: "Emp Code", render: (r) => r?.emp_code ?? "-" },
            { header: "Department", render: (r) => r?.department ?? "-" },
            { header: "Location", render: (r) => r?.location ?? "-" },
            { header: "Active Time", render: (r) => fmtDuration(r?.computer_activities_time) },
            { header: "Productivity", render: (r) => fmtPercent(r?.productivity) },
          ],
        },
        {
          title: t("top10nonactive"),
          subtitle: "Employees with the lowest active hours during the period.",
          target: getEl("nonactive"),
          data: fresh.nonActiveEmployees,
          meta: {
            "Date Generated": today,
            "View By": periodLabel,
            Location: filters.nonActiveLocation || "All",
            Department: filters.nonActiveDepartment || "All",
          },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Employee", render: empName },
            { header: "Emp Code", render: (r) => r?.emp_code ?? "-" },
            { header: "Department", render: (r) => r?.department ?? "-" },
            { header: "Location", render: (r) => r?.location ?? "-" },
            { header: "Active Time", render: (r) => fmtDuration(r?.computer_activities_time) },
            { header: "Productivity", render: (r) => fmtPercent(r?.productivity) },
          ],
        },
        {
          title: t("locPerform"),
          subtitle: "Aggregated productive hours grouped by office location.",
          target: getEl("location"),
          data: fresh.locationPerformance?.rows || [],
          meta: {
            "Date Generated": today,
            "View By": periodLabel,
            "Metric Type": filters.locationPerformanceType || "default",
          },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Location", render: (r) => r?.name ?? "-" },
            { header: "Total Time", render: (r) => r?.hours ?? r?.time ?? "-" },
          ],
        },
        {
          title: t("deptPerform"),
          subtitle: "Aggregated productive hours grouped by department.",
          target: getEl("department"),
          data: fresh.departmentPerformance?.rows || [],
          meta: {
            "Date Generated": today,
            "View By": periodLabel,
            "Metric Type": filters.departmentPerformanceType || "default",
          },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Department", render: (r) => r?.name ?? "-" },
            { header: "Total Time", render: (r) => r?.hours ?? r?.time ?? "-" },
          ],
        },
        {
          title: t("top10webUsage"),
          subtitle: "The 10 websites that received the most total time during the period.",
          target: getEl("web"),
          data: fresh.webUsage?.[usageKey] || [],
          meta: { "Date Generated": today, Period: periodLabel },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Website", render: (r) => r?.name ?? "-" },
            { header: "Usage %", render: (r) => fmtPercent(r?.value) },
          ],
        },
        {
          title: t("top10appUsage"),
          subtitle: "The 10 applications that received the most total time during the period.",
          target: getEl("app"),
          data: fresh.appUsage?.[usageKey] || [],
          meta: { "Date Generated": today, Period: periodLabel },
          columns: [
            { header: "#", render: (_, i) => i, width: 24 },
            { header: "Application", render: (r) => r?.name ?? "-" },
            { header: "Usage %", render: (r) => fmtPercent(r?.value) },
          ],
        },
      ];

      await generateCombinedDashboardPdf({
        title: "EmpMonitor Dashboard Report",
        subtitle: `Consolidated view of every dashboard module for ${periodLabel}.`,
        modules,
        fileName: `empmonitor-dashboard-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (err) {
      console.error("Combined PDF export failed:", err);
    } finally {
      setDownloadingAll(false);
    }
  }, [
    downloadingAll,
    t,
    filters,
    setFilter,
    fetchProductiveEmployees,
    fetchNonProductiveEmployees,
    fetchActiveEmployees,
    fetchNonActiveEmployees,
    fetchLocationPerformance,
    fetchDepartmentPerformance,
  ]);

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

      <div data-pdf-section="stats">
        <Stats stats={stats} />
      </div>

      <div className="grid grid-cols-12 gap-3 py-5">

        <div className="xl:col-span-4 col-span-12" data-pdf-section="snapshot">
          <ActivitySnapshot data={activitySnapshot} />
        </div>

        <div
          className={`${showEmpAiAssistant ? "xl:col-span-5" : "xl:col-span-8"} col-span-12`}
          data-pdf-section="breakdown"
        >
          <ActivityBreakDown data={activityBreakdown} />
        </div>

        {showEmpAiAssistant && (
          <div className="xl:col-span-3 col-span-12">
            <EmpAi onOpenInsight={handleOpenInsight} />
          </div>
        )}

        {/* Productive */}

        <div className="xl:col-span-6 col-span-12" data-pdf-section="productive">

          <TopProductiveEmployees
            title={t("top10productive")}
            columns={[`${t("employee")} ${t("name")}`, `${t("time")} (${t("hours")})`, "Productivity"]}
            employees={productiveEmployees}
            loading={productiveEmployeesLoading}
            report={
              <Customreport
                title={t("top10productive")}
                showShield={showEmpAiAssistant}
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10productive"))}
                onViewReport={() => openViewReport(t("topProductiveReport"), { employees: productiveEmployees, by: filters.productiveBy })}
                pdfTitle={t("top10productive")}
                pdfSubtitle="Employees with the highest productive time over the selected period."
                pdfMeta={{
                  Module: "Top 10 Productive Employees",
                  "Date Generated": new Date().toLocaleDateString(),
                  "View By": filters.productiveBy || "today",
                  Location: filters.productiveLocation || "All",
                  Department: filters.productiveDepartment || "All",
                }}
                pdfData={productiveEmployees}
                pdfColumns={[
                  { header: "#", render: (_, i) => i, width: 24 },
                  { header: "Employee", render: empName },
                  { header: "Emp Code", render: (r) => r?.emp_code ?? "-" },
                  { header: "Active Time", render: (r) => fmtDuration(r?.duration ?? r?.time_hours) },
                  { header: "Productivity", render: (r) => fmtPercent(r?.percentage ?? r?.productivity) },
                ]}
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

        <div className="xl:col-span-6 col-span-12" data-pdf-section="nonproductive">

          <TopNonProductiveEmployees
            title={t("top10nonproductive")}
            columns={[`${t("employee")} ${t("name")}`, `${t("time")} (${t("hours")})`]}
            employees={unproductiveEmployees}
            loading={unproductiveEmployeesLoading}
            report={
              <Customreport
                title={t("top10nonproductive")}
                showShield={showEmpAiAssistant}
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10nonproductive"))}
                onViewReport={() => openViewReport(t("topNonProductiveReport"), { employees: unproductiveEmployees, by: filters.unproductiveBy })}
                pdfTitle={t("top10nonproductive")}
                pdfSubtitle="Employees with the lowest productive time / highest idle time."
                pdfMeta={{
                  Module: "Top 10 Non-Productive Employees",
                  "Date Generated": new Date().toLocaleDateString(),
                  "View By": filters.unproductiveBy || "today",
                  Location: filters.unproductiveLocation || "All",
                  Department: filters.unproductiveDepartment || "All",
                }}
                pdfData={unproductiveEmployees}
                pdfColumns={[
                  { header: "#", render: (_, i) => i, width: 24 },
                  { header: "Employee", render: empName },
                  { header: "Emp Code", render: (r) => r?.emp_code ?? "-" },
                  { header: "Active Time", render: (r) => fmtDuration(r?.duration ?? r?.time_hours) },
                  { header: "Productivity", render: (r) => fmtPercent(r?.percentage ?? r?.productivity) },
                ]}
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

        <div className="xl:col-span-6 col-span-12" data-pdf-section="active">
          <ActiveEmp
            title={t("top10active")}
            employees={activeEmployees}
            loading={activeEmployeesLoading}
            report={
              <Customreport
                title={t("top10active")}
                showShield={showEmpAiAssistant}
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10active"))}
                onViewReport={() => openViewReport(t("topActiveReport"), { mode: "timesheet", staticData: activeEmployees, by: filters.activeBy })}
                pdfTitle={t("top10active")}
                pdfSubtitle="Employees with the highest active hours on their workstations."
                pdfMeta={{
                  Module: "Top 10 Active Employees",
                  "Date Generated": new Date().toLocaleDateString(),
                  "View By": filters.activeBy || "today",
                  Location: filters.activeLocation || "All",
                  Department: filters.activeDepartment || "All",
                }}
                pdfData={activeEmployees}
                pdfColumns={[
                  { header: "#", render: (_, i) => i, width: 24 },
                  { header: "Employee", render: empName },
                  { header: "Emp Code", render: (r) => r?.emp_code ?? "-" },
                  { header: "Department", render: (r) => r?.department ?? "-" },
                  { header: "Location", render: (r) => r?.location ?? "-" },
                  { header: "Active Time", render: (r) => fmtDuration(r?.computer_activities_time) },
                  { header: "Productivity", render: (r) => fmtPercent(r?.productivity) },
                ]}
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

        <div className="xl:col-span-6 col-span-12" data-pdf-section="nonactive">
          <NonActiveEmp
            title={t("top10nonactive")}
            employees={nonActiveEmployees}
            loading={nonActiveEmployeesLoading}
            report={
              <Customreport
                title={t("top10nonactive")}
                showShield={showEmpAiAssistant}
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10nonactive"))}
                onViewReport={() => openViewReport(t("topNonActiveReport"), { mode: "timesheet", staticData: nonActiveEmployees, by: filters.nonActiveBy })}
                pdfTitle={t("top10nonactive")}
                pdfSubtitle="Employees with the lowest active hours during the period."
                pdfMeta={{
                  Module: "Top 10 Non-Active Employees",
                  "Date Generated": new Date().toLocaleDateString(),
                  "View By": filters.nonActiveBy || "today",
                  Location: filters.nonActiveLocation || "All",
                  Department: filters.nonActiveDepartment || "All",
                }}
                pdfData={nonActiveEmployees}
                pdfColumns={[
                  { header: "#", render: (_, i) => i, width: 24 },
                  { header: "Employee", render: empName },
                  { header: "Emp Code", render: (r) => r?.emp_code ?? "-" },
                  { header: "Department", render: (r) => r?.department ?? "-" },
                  { header: "Location", render: (r) => r?.location ?? "-" },
                  { header: "Active Time", render: (r) => fmtDuration(r?.computer_activities_time) },
                  { header: "Productivity", render: (r) => fmtPercent(r?.productivity) },
                ]}
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

        <div className="xl:col-span-6 col-span-12" data-pdf-section="location">
          <LocationPerformance
            title={t("locPerform")}
            data={locationPerformance}
            loading={locationPerformanceLoading}
            report={
              <Customreport
                title={t("locPerform")}
                showShield={showEmpAiAssistant}
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("locPerform"))}
                onViewReport={() => openViewReport(t("locPerform"), { mode: "performance", staticData: locationPerformance?.rows || [] })}
                pdfTitle={t("locPerform")}
                pdfSubtitle="Aggregated productive hours grouped by office location."
                pdfMeta={{
                  Module: "Location Performance",
                  "Date Generated": new Date().toLocaleDateString(),
                  "View By": filters.locationPerformanceBy || "today",
                  "Metric Type": filters.locationPerformanceType || "default",
                }}
                pdfData={locationPerformance?.rows || []}
                pdfColumns={[
                  { header: "#", render: (_, i) => i, width: 24 },
                  { header: "Location", render: (r) => r?.name ?? "-" },
                  { header: "Total Time", render: (r) => r?.hours ?? r?.time ?? "-" },
                ]}
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

        <div className="xl:col-span-6 col-span-12" data-pdf-section="department">
          <DepartmentPerformance
            title={t("deptPerform")}
            data={departmentPerformance}
            loading={departmentPerformanceLoading}
            report={
              <Customreport
                title={t("deptPerform")}
                showShield={showEmpAiAssistant}
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("deptPerform"))}
                onViewReport={() => openViewReport(t("deptPerform"), { mode: "performance", staticData: departmentPerformance?.rows || [] })}
                pdfTitle={t("deptPerform")}
                pdfSubtitle="Aggregated productive hours grouped by department."
                pdfMeta={{
                  Module: "Department Performance",
                  "Date Generated": new Date().toLocaleDateString(),
                  "View By": filters.departmentPerformanceBy || "today",
                  "Metric Type": filters.departmentPerformanceType || "default",
                }}
                pdfData={departmentPerformance?.rows || []}
                pdfColumns={[
                  { header: "#", render: (_, i) => i, width: 24 },
                  { header: "Department", render: (r) => r?.name ?? "-" },
                  { header: "Total Time", render: (r) => r?.hours ?? r?.time ?? "-" },
                ]}
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

        <div className="xl:col-span-6 col-span-12" data-pdf-section="web">
          <WebUsageChart
            title={t("top10webUsage")}
            data={webUsage}
            activeTab={webTab}
            onTabChange={setWebTab}
            report={
              <Customreport
                title={t("top10webUsage")}
                showShield={showEmpAiAssistant}
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10webUsage"))}
                onViewReport={() => openViewReport(t("topWebUsageReport"), { mode: "web_app", staticData: webUsage?.today || [] })}
                pdfTitle={t("top10webUsage")}
                pdfSubtitle="The 10 websites that received the most total time during the period."
                pdfMeta={{
                  Module: "Top 10 Website Usage",
                  "Date Generated": new Date().toLocaleDateString(),
                  Period: "Today",
                }}
                pdfData={webUsage?.today || []}
                pdfColumns={[
                  { header: "#", render: (_, i) => i, width: 24 },
                  { header: "Website", render: (r) => r?.name ?? "-" },
                  { header: "Usage %", render: (r) => fmtPercent(r?.value) },
                ]}
              />
            }
          />
        </div>

        <div className="xl:col-span-6 col-span-12" data-pdf-section="app">
          <AppUsageChart
            title={t("top10appUsage")}
            data={appUsage}
            activeTab={appTab}
            onTabChange={setAppTab}
            report={
              <Customreport
                title={t("top10appUsage")}
                showShield={showEmpAiAssistant}
                showButton
                showMaximize
                showDownload
                onAiClick={() => openAiAssistant(t("top10appUsage"))}
                onViewReport={() => openViewReport(t("topAppUsageReport"), { mode: "web_app", staticData: appUsage?.today || [] })}
                pdfTitle={t("top10appUsage")}
                pdfSubtitle="The 10 applications that received the most total time during the period."
                pdfMeta={{
                  Module: "Top 10 Application Usage",
                  "Date Generated": new Date().toLocaleDateString(),
                  Period: "Today",
                }}
                pdfData={appUsage?.today || []}
                pdfColumns={[
                  { header: "#", render: (_, i) => i, width: 24 },
                  { header: "Application", render: (r) => r?.name ?? "-" },
                  { header: "Usage %", render: (r) => fmtPercent(r?.value) },
                ]}
              />
            }
          />
        </div>

      </div>

      {/* Dashboard footer — full-report download */}
      <div className="mt-2 mb-4 bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-800">
            EmpMonitor Dashboard Report
          </span>
          <span className="text-xs text-slate-500">
            Generate a single PDF combining every module currently shown on this page.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setPeriodDialogOpen(true)}
          disabled={downloadingAll}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-wait text-white text-sm font-semibold shadow-sm transition-colors"
        >
          {downloadingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Building report…
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              Download Full Report
            </>
          )}
        </button>
      </div>

      {/* Period selection dialog for the combined report */}
      <Dialog
        open={periodDialogOpen}
        onOpenChange={(v) => !downloadingAll && setPeriodDialogOpen(v)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Select Report Period</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Choose the time range the combined PDF should cover. Every module
              will be re-fetched for the selected period.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {[
              { label: "Today", value: "today", Icon: Calendar },
              { label: "Yesterday", value: "yesterday", Icon: CalendarDays },
              { label: "This Week", value: "thisweek", Icon: CalendarRange },
            ].map(({ label, value, Icon }) => (
              <button
                key={value}
                type="button"
                disabled={downloadingAll}
                onClick={() => handleDownloadAll(value)}
                className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-slate-700 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                <Icon className="w-5 h-5 text-blue-500" />
                {label}
              </button>
            ))}
          </div>
          {downloadingAll && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Fetching data and building report…
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ViewReportModal
        open={reportModal.open}
        onOpenChange={(v) => setReportModal((prev) => ({ ...prev, open: v }))}
        title={reportModal.title}
        mode={reportModal.mode}
        employees={reportModal.employees}
        staticData={reportModal.staticData}
        by={reportModal.by}
      />

      {showEmpAiAssistant && (
        <EmpAiAssistant
          open={aiAssistantOpen}
          onClose={() => setAiAssistantOpen(false)}
          context={aiContext}
        />
      )}

    </div>

  );

};

export default Dashboard;