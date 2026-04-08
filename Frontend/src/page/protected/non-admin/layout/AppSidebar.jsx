import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
const getAllMenuItems = (t) => [
  { title: t("dashboard"), url: "/non-admin/dashboard", icon: LayoutDashboard },

  {
    title: t("employees"),
    icon: Users,
    children: [
      {
        title: t("sidebar_employees_details"),
        url: "/non-admin/employee-details",
        perm: "employee_view",
        feature: "employee_details",
      },
      {
        title: t("sidebar_employee_attendance"),
        url: "/non-admin/attendance",
        perm: "attendance_view",
        feature: "employee_attendance",
      },
      {
        title: t("sidebar_employee_insight"),
        url: "/non-admin/insights",
        perm: "employee_insights_view",
        feature: "employee_insights",
      },
    ],
  },

  {
    title: t("timesheets"),
    url: "/non-admin/timesheets",
    icon: Clock,
    perm: "timesheet_view",
    feature: "timesheet",
  },

  {
    title: t("sidebar_live_monitor"),
    url: "/non-admin/live",
    icon: Monitor,
    perm: "non_admin_live_monitoring",
  },

  {
    title: t("sidebar_time_claim"),
    url: "/non-admin/time-claim",
    icon: HandCoins,
    perm: "activity_alter_view",
    feature: "idle_to_productive",
  },

  {
    title: t("reports"),
    icon: BarChart3,
    children: [
      {
        title: t("sidebar_reports_download"),
        url: "/non-admin/reports",
      },
      {
        title: t("sidebar_productivity_report"),
        url: "/non-admin/reports/productivity",
        perm: "employee_insights_view",
        feature: "employee_insights",
      },
      {
        title: t("sidebar_auto_email_report"),
        url: "/non-admin/reports/autoemail",
      },
      {
        title: t("sidebar_web_app_usage"),
        url: "/non-admin/reports/webappusage",
        perm: "employee_webusage_view",
      },
    ],
  },
  {
    title: t("sidebar_dlp"),
    icon: ShieldAlert,
    children: [
      {
        title: t("sidebar_usb_detection"),
        url: "/non-admin/dlp/usb",
      },
    ],
  },

  {
    title: t("settings"),
    icon: Settings2,
    children: [
      { title: t("sidebar_manage_location_dept"), url: "/non-admin/settings/location", perm: "settings_locations_browse" },
      { title: t("sidebar_storage_types"), url: "/non-admin/settings/storage", perm: "settings_storage_browse" },
      { title: t("sidebar_productivity_rules"), url: "/non-admin/settings/productivity", perm: "settings_productivity_rule_browse" },
      { title: t("sidebar_roles_permissions"), url: "/non-admin/settings/roles", perm: "roles_browse" },
      { title: t("sidebar_shift_management"), url: "/non-admin/settings/shift", perm: "settings_monitoring_configuration_browse" },
      { title: t("sidebar_monitoring_control"), url: "/non-admin/settings/monitoring", perm: "settings_monitoring_configuration_browse" },
      { title: t("localization"), url: "/non-admin/settings/localization", perm: "settings_monitoring_configuration_browse" },
    ],
  },

  {
    title: t("behaviour"),
    icon: Zap,
    children: [
      { title: t("alerts"), url: "/non-admin/behaviour/alerts", perm: "alert_view" },
      { title: t("sidebar_alert_policies"), url: "/non-admin/behaviour/alertpolicies", perm: "alert_create" },
      { title: t("sidebar_alert_notification"), url: "/non-admin/behaviour/alertnotification", perm: "alert_view" },
    ],
  },
];

export function NonAdminAppSidebar() {
  const { t } = useTranslation();
  const { open }    = useSidebar();
  const [openKey, setOpenKey] = useState(null);
  const { nonAdmin } = useNonAdminSession();
  const { canView }  = usePermission(nonAdmin);

  const visibleItems = useMemo(() =>
    getAllMenuItems(t)
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
  [nonAdmin, t]);

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
          <p className="mb-1 text-sm font-semibold">{t("sidebar_manager_portal")}</p>
          <p className="text-xs leading-relaxed text-blue-100">
            {t("sidebar_manager_portal_desc")}
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
