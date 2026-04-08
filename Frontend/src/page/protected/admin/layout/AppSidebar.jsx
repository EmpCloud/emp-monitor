import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import empLogo from "@/assets/emp.png";
import smallempLogo from "@/assets/smallemp.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Clock,
  History,
  Monitor,
  HandCoins,
  Briefcase,
  BarChart3,
  ShieldAlert,
  Settings2,
  Zap,
  Download,
  Smartphone,
  Code2,
  ReceiptText,
  Key,
  Store,
} from "lucide-react";
import AppMenuItems from "./AppMenuItems";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import downloadIcon from "@/assets/agentdwnld.png";
import AgentDownloadOverlay from "@/page/protected/admin/agent-download";
import apiService from "@/services/api.service";

const getMenuItems = (t) => [
  { title: t("dashboard"), url: "/admin/dashboard", icon: LayoutDashboard },
  {
    title: t("employees"),
    icon: Users,
    children: [
      { title: t("sidebar_employees_details"), url: "/admin/employee-details" },
      { title: t("sidebar_employee_comparison"), url: "/admin/comparison" },
      { title: t("sidebar_employee_attendance"), url: "/admin/attendance" },
      { title: t("sidebar_employee_insights"), url: "/admin/insights" },
      { title: t("sidebar_real_time_track"), url: "/admin/realtime" },
    ],
  },
  { title: t("timesheets"), url: "/admin/timesheets", icon: Clock },
  { title: t("sidebar_live_monitoring"), url: "/admin/livemonitoring", icon: Monitor },
  { title: t("sidebar_time_claim"), url: "/admin/timeclaim", icon: HandCoins },
  {
    title: t("reports"),
    icon: BarChart3,
    children: [
      { title: t("sidebar_reports_download"), url: "/admin/reports/download" },
      { title: t("sidebar_productivity_report"), url: "/admin/reports/productivity" },
      { title: t("sidebar_auto_email_report"), url: "/admin/reports/autoemail" },
      { title: t("sidebar_web_app_usage"), url: "/admin/reports/webappusage" },
    ],
  },
  {
    title: t("sidebar_dlp"),
    icon: ShieldAlert,
    children: [
      { title: t("sidebar_usb_detection"), url: "/admin/dlp/usb" },
      { title: t("sidebar_system_logs"), url: "/admin/dlp/systemlogs" },
      { title: t("sidebar_screenshot_logs"), url: "/admin/dlp/screenshotlogs" },
      { title: t("sidebar_email_activity_logs"), url: "/admin/dlp/emailactivitylogs" },
    ],
  },
  {
    title: t("settings"),
    icon: Settings2,
    children: [
      { title: t("sidebar_manage_location_dept"), url: "/admin/settings/location" },
      { title: t("sidebar_storage_types"), url: "/admin/settings/storage" },
      { title: t("sidebar_productivity_rules"), url: "/admin/settings/productivity" },
      { title: t("sidebar_roles_permissions"), url: "/admin/settings/roles" },
      { title: t("sidebar_shift_management"), url: "/admin/settings/shift" },
      { title: t("sidebar_monitoring_control"), url: "/admin/settings/monitoring" },
      { title: t("localization"), url: "/admin/settings/localization" },
    ],
  },
  {
    title: t("behaviour"),
    icon: Zap,
    children: [
      { title: t("alerts"), url: "/admin/behaviour/alerts" },
      { title: t("sidebar_alert_policies"), url: "/admin/behaviour/alertpolicies" },
      { title: t("sidebar_alert_notification"), url: "/admin/behaviour/alertnotification" },
    ],
  },
  {
    title: t("sidebar_mobile_task"),
    icon: Smartphone,
    children: [
      { title: t("sidebar_clients_users"), url: "/admin/mobiletask/clientuser" },
      { title: t("sidebar_task_details"), url: "/admin/mobiletask/task" },
      { title: t("sidebar_geo_location"), url: "/admin/mobiletask/geolocation" },
    ],
  },
  {
    title: t("reseller"),
    icon: Store,
    children: [
      { title: t("dashboard"), url: "/admin/reseller/dashboard" },
      { title: t("settings"), url: "/admin/reseller/settings" },
    ],
  },
];

const normalizeResellerStats = (payload = {}) => {
  const rawExpiry = String(payload.expiry_date || "").replace(/"/g, "").trim();
  const formattedExpiry = rawExpiry
    ? new Date(rawExpiry).toLocaleDateString("en-GB")
    : "-";

  return {
    totalLicenses: Number(payload.total_licenses_count) || 0,
    usedLicenses: Number(payload.total_licenses_used_by_me) || 0,
    leftLicenses: Number(payload.left_over_licenses) || 0,
    expiryDate: formattedExpiry === "Invalid Date" ? rawExpiry || "-" : formattedExpiry,
  };
};

export function AppSidebar() {
  const { t } = useTranslation();
  const { open } = useSidebar();
  const [openKey, setOpenKey] = useState(null);
  const [agentDownloadOpen, setAgentDownloadOpen] = useState(false);
  const menuItems = getMenuItems(t);
  const [licenseStats, setLicenseStats] = useState({
    totalLicenses: 0,
    usedLicenses: 0,
    leftLicenses: 0,
    expiryDate: "-",
  });

  useEffect(() => {
    const controller = new AbortController();

    const loadResellerStats = async () => {
      try {
        const { data } = await apiService.apiInstance.get("/settings/reseller-stats", {
          signal: controller.signal,
        });
        if (data?.code !== 200 || !data?.data) return;

        const nextStats = normalizeResellerStats(data.data);
        setLicenseStats((prev) => (
          prev.totalLicenses === nextStats.totalLicenses &&
          prev.usedLicenses === nextStats.usedLicenses &&
          prev.leftLicenses === nextStats.leftLicenses &&
          prev.expiryDate === nextStats.expiryDate
        ) ? prev : nextStats);
      } catch (error) {
        if (error?.name !== "CanceledError" && error?.name !== "AbortError") {
          console.error("Reseller stats fetch failed:", error);
        }
      }
    };

    loadResellerStats();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="bg-white border-b border-slate-200/60 p-0">
        <div
          className={`flex items-center justify-between transition-all duration-200 ease-in-out ${
            !open ? "px-2 py-4 justify-center" : "p-2"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center font-bold">
              <img
                src={open ? empLogo : smallempLogo}
                className={open ? "w-40" : "w-8 h-8 object-contain"}
                alt="Logo"
              />
            </div>
          </div>

          {open && (
            <SidebarTrigger className="h-8 w-8 cursor-pointer rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="flex flex-col gap-1 group-data-[collapsible=icon]:px-0 px-3 ">
              {menuItems.map((item) => (
                <AppMenuItems
                  key={item.title}
                  item={item}
                  openKey={openKey}
                  setOpenKey={setOpenKey}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-white p-3 group-data-[collapsible=icon]:hidden">
        {/* Download Agent Button */}
        {/* <button className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:opacity-90 hover:shadow-blue-300">
          
        </button> */}
        <ShimmerButton className=" flex items-center justify-center gap-2 shadow-sm border-2 border-blue-600 text-md " onClick={() => setAgentDownloadOpen(true)} >
          <span className="flex h-7 w-7 items-center justify-center rounded-full  shadow-sm">
            <img src={downloadIcon} alt="download" />

          </span>
          <p>

             {t("sidebar_download_agent")}
          </p>
        </ShimmerButton>

        {/* License Information Card */}
        <div className="mt-1 rounded-3xl bg-[linear-gradient(160deg,#94B6E1_0%,#1D4381_100%)] p-4 text-center text-white">
          <div className="mb-2 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_0_20px_9px_rgba(255,255,255,0.6)] ">
                <img src={smallempLogo} alt=""  />
              </div>
          </div>
          <p className="mb-1 text-sm font-semibold">{t("sidebar_license_info")}</p>
          <p className="text-xs leading-relaxed text-blue-100">
            {t("sidebar_used")} {licenseStats.usedLicenses} {t("sidebar_out_of")} {licenseStats.totalLicenses} {t("sidebar_licenses")},
            <br />
            {licenseStats.leftLicenses} - {t("sidebar_licenses_left")}
          </p>
          <div className="mt-3 inline-block rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-semibold">
            {licenseStats.expiryDate}
          </div>
        </div>
      </SidebarFooter>

      <AgentDownloadOverlay open={agentDownloadOpen} onClose={() => setAgentDownloadOpen(false)} />
    </Sidebar>
  );
}
