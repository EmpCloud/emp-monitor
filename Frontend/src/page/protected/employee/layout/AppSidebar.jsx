import { useState } from "react";
import { useTranslation } from "react-i18next";
import empLogo      from "@/assets/emp.png";
import smallempLogo from "@/assets/smallemp.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarFooter, SidebarHeader, useSidebar, SidebarTrigger,
} from "@/components/ui/sidebar";
import { LayoutDashboard, HandCoins } from "lucide-react";
import AppMenuItems from "./AppMenuItems";

const getEmployeeMenuItems = (t) => [
  { title: t("dashboard"), url: "/employee/dashboard", icon: LayoutDashboard },
  { title: t("sidebar_time_claim"), url: "/employee/time-claim", icon: HandCoins },
];

export function EmployeeAppSidebar() {
  const { t } = useTranslation();
  const { open } = useSidebar();
  const [openKey, setOpenKey] = useState(null);
  const employeeMenuItems = getEmployeeMenuItems(t);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="bg-white border-b border-slate-200/60 p-0">
        <div className={`flex items-center justify-between transition-all duration-200 ease-in-out ${!open ? "px-2 py-4 justify-center" : "p-2"}`}>
          <div className="flex items-center gap-2">
            <img
              src={open ? empLogo : smallempLogo}
              className={open ? "w-40" : "w-8 h-8 object-contain"}
              alt="EmpMonitor"
            />
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
              {employeeMenuItems.map((item) => (
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
        <div className="rounded-3xl bg-[linear-gradient(160deg,#94B6E1_0%,#1D4381_100%)] p-4 text-center text-white">
          <div className="mb-2 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.6)]">
              <img src={smallempLogo} alt="" />
            </div>
          </div>
          <p className="mb-1 text-sm font-semibold">{t("sidebar_employee_portal")}</p>
          <p className="text-xs leading-relaxed text-blue-100">
            {t("sidebar_employee_portal_desc")}
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
