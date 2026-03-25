import { useState, useMemo } from "react";
import empLogo      from "@/assets/emp.png";
import smallempLogo from "@/assets/smallemp.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarFooter, SidebarHeader, useSidebar, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, Clock, BarChart3, Monitor, HandCoins, ShieldAlert,
  Settings2, Zap,
} from "lucide-react";
import AppMenuItems from "../../admin/layout/AppMenuItems";
import useNonAdminSession from "../../../../sessions/useNonAdminSession";
import { usePermission } from "../../../../hooks/usePermission";

/**
 * Menu item definitions.
 *
 * Fields:
 *   perm    – permission name that must exist in nonAdmin.permissionData
 *   feature – feature flag name that must be status==1 in nonAdmin.feature
 *
 * Items without a `perm` field are always visible (e.g. Dashboard).
 * A group item is hidden when all of its children are hidden.
 */
const ALL_MENU_ITEMS = [
  { title: "Dashboard", url: "/non-admin/dashboard", icon: LayoutDashboard },

  {
    title: "Employees",
    icon: Users,
    children: [
      {
        title: "Employees Details",
        url: "/non-admin/employee-details",
        perm: "employee_view",
        feature: "employee_details",
      },
      {
        title: "Employee Attendance",
        url: "/non-admin/attendance",
        perm: "attendance_view",
        feature: "employee_attendance",
      },
      {
        title: "Employee Insight",
        url: "/non-admin/insights",
        perm: "employee_insights_view",
        feature: "employee_insights",
      },
    ],
  },

  {
    title: "Timesheets",
    url: "/non-admin/timesheets",
    icon: Clock,
    perm: "timesheet_view",
    feature: "timesheet",
  },

  {
    title: "Live Monitor",
    url: "/non-admin/live",
    icon: Monitor,
    perm: "non_admin_live_monitoring",
  },

  {
    title: "Time Claim",
    url: "/non-admin/time-claim",
    icon: HandCoins,
    perm: "activity_alter_view",
    feature: "idle_to_productive",
  },

  {
    title: "Reports",
    icon: BarChart3,
    children: [
      {
        title: "Reports Download",
        url: "/non-admin/reports",
      },
      {
        title: "Productivity Report",
        url: "/non-admin/reports/productivity",
        perm: "employee_insights_view",
        feature: "employee_insights",
      },
      {
        title: "Auto Email Report",
        url: "/non-admin/reports/autoemail",
      },
      {
        title: "Web App Usage",
        url: "/non-admin/reports/webappusage",
        perm: "employee_webusage_view",
      },
    ],
  },
  {
    title: "DLP",
    icon: ShieldAlert,
    children: [
      {
        title: "USB Detection",
        url: "/non-admin/dlp/usb",
      },
    ],
  },

  {
    title: "Settings",
    icon: Settings2,
    children: [
      { title: "Manage Location & Department", url: "/non-admin/settings/location", perm: "settings_locations_browse" },
      { title: "Storage Types", url: "/non-admin/settings/storage", perm: "settings_storage_browse" },
      { title: "Productivity Rules", url: "/non-admin/settings/productivity", perm: "settings_productivity_rule_browse" },
      { title: "Roles & Permissions", url: "/non-admin/settings/roles", perm: "roles_browse" },
      { title: "Shift Management", url: "/non-admin/settings/shift", perm: "settings_monitoring_configuration_browse" },
      { title: "Monitoring Control", url: "/non-admin/settings/monitoring", perm: "settings_monitoring_configuration_browse" },
      { title: "Localization", url: "/non-admin/settings/localization", perm: "settings_monitoring_configuration_browse" },
    ],
  },

  {
    title: "Behaviour",
    icon: Zap,
    children: [
      { title: "Alerts", url: "/non-admin/behaviour/alerts", perm: "alert_view" },
      { title: "Alert Policies", url: "/non-admin/behaviour/alertpolicies", perm: "alert_create" },
      { title: "Alert Notification", url: "/non-admin/behaviour/alertnotification", perm: "alert_view" },
    ],
  },
];

export function NonAdminAppSidebar() {
  const { open }    = useSidebar();
  const [openKey, setOpenKey] = useState(null);
  const { nonAdmin } = useNonAdminSession();
  const { canView }  = usePermission(nonAdmin);

  const visibleItems = useMemo(() =>
    ALL_MENU_ITEMS
      .map((item) => {
        if (!item.children) {
          // Leaf item — show if no perm required, or canView passes
          if (item.perm && !canView(item.perm, item.feature ?? null)) return null;
          return item;
        }
        // Group item — filter children, hide group if none remain
        const visibleChildren = item.children.filter(
          (child) => !child.perm || canView(child.perm, child.feature ?? null)
        );
        if (visibleChildren.length === 0) return null;
        return { ...item, children: visibleChildren };
      })
      .filter(Boolean),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [nonAdmin]);

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
                alt="EmpMonitor"
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
            <SidebarMenu className="flex flex-col gap-1 group-data-[collapsible=icon]:px-0 px-3">
              {visibleItems.map((item) => (
                <AppMenuItems key={item.title} item={item} openKey={openKey} setOpenKey={setOpenKey} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-white p-3 group-data-[collapsible=icon]:hidden">
        <div className="mt-1 rounded-3xl bg-[linear-gradient(160deg,#94B6E1_0%,#1D4381_100%)] p-4 text-center text-white">
          <div className="mb-2 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.6)]">
              <img src={smallempLogo} alt="" />
            </div>
          </div>
          <p className="mb-1 text-sm font-semibold">Manager Portal</p>
          <p className="text-xs leading-relaxed text-blue-100">
            Monitor your team's
            <br />
            productivity and activity
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
