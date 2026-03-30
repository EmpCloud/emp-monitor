import { useEffect, useState } from "react";
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

const menuItems = [
  // Singular items (no children)
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },

  // Group item with children
  {
    title: "Employees",
    icon: Users,
    children: [
      { title: "Employees Details", url: "/admin/employee-details" },
      { title: "Employee Comparison", url: "/admin/comparison" },
      { title: "Employee Attendance", url: "/admin/attendance" },
      { title: "Employee Insights", url: "/admin/insights" },
      { title: "Real Time Track", url: "/admin/realtime" },
    ],
  },

  // Singular items (no children)
  { title: "Timesheets", url: "/admin/timesheets", icon: Clock },
  // { title: "Timeline", url: "/admin/timeline", icon: History },
  { title: "Live Monitoring", url: "/admin/livemonitoring", icon: Monitor },
  { title: "Time Claim", url: "/admin/timeclaim", icon: HandCoins },

  // Group item with children
  {
    title: "Reports",
    icon: BarChart3,
    children: [
      { title: "Reports Download", url: "/admin/reports/download" },
      { title: "Productivity Report", url: "/admin/reports/productivity" },
      { title: "Auto Email Report", url: "/admin/reports/autoemail" },
      { title: "Web App Usage", url: "/admin/reports/webappusage" },
    ],
  },
  {
    title: "DLP",
    icon: ShieldAlert,
    children: [
      { title: "USB Detection", url: "/admin/dlp/usb" },
      { title: "System Logs", url: "/admin/dlp/systemlogs" },
      { title: "Screenshot Logs", url: "/admin/dlp/screenshotlogs" },
      { title: "Email Activity Logs", url: "/admin/dlp/emailactivitylogs" },
    ],
  },
  {
    title: "Settings",
    icon: Settings2,
    children: [
      { title: "Manage Location & Department", url: "/admin/settings/location" },
      { title: "Storage Types", url: "/admin/settings/storage" },
      { title: "Productivity Rules", url: "/admin/settings/productivity" },
      { title: "Roles & Permissions", url: "/admin/settings/roles" },
      { title: "Shift Management", url: "/admin/settings/shift" },
      { title: "Monitoring Control", url: "/admin/settings/monitoring" },
      { title: "Localization", url: "/admin/settings/localization" },
    ],
  },
  {
    title: "Behaviour",
    icon: Zap,
    children: [
      { title: "Alerts", url: "/admin/behaviour/alerts" },
      { title: "Alert Policies", url: "/admin/behaviour/alertpolicies" },
      { title: "Alert Notification", url: "/admin/behaviour/alertnotification" },
    ],
  },
  {
    title: "Mobile Task",
    icon: Smartphone,
    children: [
      { title: "Clients And Users", url: "/admin/mobiletask/clientuser" },
      { title: "Task Details", url: "/admin/mobiletask/task" },
      { title: "GEO Location Tracking", url: "/admin/mobiletask/geolocation" },
    ],
  },
  // { title: "API Management", url: "/apimanagement", icon: Code2 },
  // { title: "Invoice Management", url: "/invoicemanagement", icon: ReceiptText },
  // { title: "Access Logs", url: "/accesslogs", icon: Key },
  {
    title: "Reseller",
    icon: Store,
    children: [
      { title: "Dashboard", url: "/admin/reseller/dashboard" },
      { title: "Settings", url: "/admin/reseller/settings" },
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
  const { open } = useSidebar();
  const [openKey, setOpenKey] = useState(null);
  const [agentDownloadOpen, setAgentDownloadOpen] = useState(false);
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

             Download Agent
          </p>
        </ShimmerButton>

        {/* License Information Card */}
        <div className="mt-1 rounded-3xl bg-[linear-gradient(160deg,#94B6E1_0%,#1D4381_100%)] p-4 text-center text-white">
          <div className="mb-2 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_0_20px_9px_rgba(255,255,255,0.6)] ">
                <img src={smallempLogo} alt=""  />
              </div>
          </div>
          <p className="mb-1 text-sm font-semibold">License information</p>
          <p className="text-xs leading-relaxed text-blue-100">
            Used {licenseStats.usedLicenses} out of {licenseStats.totalLicenses} Licenses,
            <br />
            {licenseStats.leftLicenses} - Licenses left &amp; Expires on
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
