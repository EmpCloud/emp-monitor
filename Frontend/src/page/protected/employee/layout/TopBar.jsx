import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Bell, HelpCircle, LogOut, User, ChevronDown,
  RefreshCw, Loader2, AlertCircle,
} from "lucide-react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import useEmployeeSession  from "../../../../sessions/employeeSession";
import useAdminSession     from "../../../../sessions/adminSession";
import useNonAdminSession  from "../../../../sessions/useNonAdminSession";
import { switchRole }      from "../../../auth/employee-login/service";
import BackToCloud from "@/components/BackToCloud";

export default function EmployeeTopBar() {
  const { t }                                 = useTranslation();
  const navigate                              = useNavigate();
  const { open }                              = useSidebar();
  const { employee, setEmployee, clearEmployee } = useEmployeeSession();
  const { setAdmin }                          = useAdminSession();
  const { setNonAdmin }                       = useNonAdminSession();

  const [switchingRoleId, setSwitchingRoleId] = useState(null);
  const [switchError,     setSwitchError]     = useState("");

  const displayName   = employee?.full_name ?? employee?.user_name ?? t("topbar_employee");
  const displayEmail  = employee?.email ?? "";
  const currentRole   = employee?.role  ?? t("topbar_employee");
  const currentRoleId = employee?.role_id;
  const initials      = displayName.charAt(0).toUpperCase();

  // Roles the user can switch to (all except the currently active one)
  const otherRoles  = (employee?.roles ?? []).filter((r) => r.role_id !== currentRoleId);
  const canSwitchRole = otherRoles.length > 0;

  const handleLogout = () => {
    clearEmployee();
    navigate("/employee-login");
  };

  const handleRoleSwitch = async (role) => {
    setSwitchingRoleId(role.role_id);
    setSwitchError("");

    const result = await switchRole(role.role_id);
    setSwitchingRoleId(null);

    if (result.error) { setSwitchError(result.error); return; }
    if (!result.code || result.code !== 200 || !result.data) {
      setSwitchError(result.message || t("topbar_role_switch_failed")); return;
    }

    const newRole = (result.role || "").toLowerCase().replace(/\s+/g, "");

    if (result.is_admin === true) {
      setAdmin(result);
      navigate("/admin/dashboard");
    } else if (newRole === "employee") {
      setEmployee(result);
      navigate("/employee/dashboard");
    } else {
      setNonAdmin(result);
      navigate("/non-admin/dashboard");
    }
  };

  return (
    <div className="flex items-center justify-between border-b sticky top-0 z-50 border-slate-200/60 bg-white px-5 py-3 w-full">
      {/* Left — trigger + greeting */}
      <div className="flex items-center gap-2">
        {(!open || window.innerWidth <= 768) && (
          <div className="trigger_button mr-3 flex h-7 w-7 items-center justify-center rounded-md bg-slate-200/70">
            <SidebarTrigger />
          </div>
        )}
        <div className="md:flex flex-col hidden">
          <span className="text-xs text-[#707EAE] font-bold">
            {t("topbar_hi")} {displayName.split(" ")[0]},
          </span>
          <h2 className="text-lg font-bold text-[#2B3674]">{t("topbar_welcome")}</h2>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-3">
        <BackToCloud />
        {/* Role switch error */}
        {switchError && (
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-red-500 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
            <AlertCircle size={11} /> {switchError}
          </span>
        )}

        {/* Role switch dropdown */}
        {canSwitchRole && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-100 transition-colors outline-none">
                <RefreshCw size={13} />
                <span className="hidden lg:inline">{t("topbar_switch_role")}</span>
                <ChevronDown size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-2xl border-slate-100 mt-2 p-2">
              <DropdownMenuLabel className="text-[11px] text-gray-400 font-medium px-3 py-1.5">
                {t("topbar_switch_to")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100 my-1" />
              {otherRoles.map((role) => {
                const isSwitching = switchingRoleId === role.role_id;
                return (
                  <DropdownMenuItem
                    key={role.role_id}
                    disabled={!!switchingRoleId}
                    onClick={() => handleRoleSwitch(role)}
                    className="py-2.5 px-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-[#0066FF]">
                        {isSwitching ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
                      </div>
                      <span className="text-sm font-semibold text-[#2B3674]">{role.name}</span>
                      {isSwitching && <span className="text-[11px] text-blue-500 ml-auto">{t("topbar_switching")}</span>}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Help */}
        <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden lg:inline">{t("topbar_help")}</span>
        </button>

        {/* Notification */}
        <div className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full shadow-lg hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-red-500" />
        </div>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-blue-100 transition-all hover:ring-blue-200">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-2 rounded-2xl shadow-2xl border-slate-100 mt-2" align="end">
            {/* User info */}
            <div className="flex items-center gap-3 px-3 py-4">
              <Avatar className="h-10 w-10 ring-2 ring-blue-50">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-[#2B3674] truncate text-base">{displayName}</span>
                <span className="text-xs text-[#7B8EB1] font-medium">{currentRole}</span>
                {displayEmail && <span className="text-[11px] text-[#A3AED0] truncate">{displayEmail}</span>}
              </div>
            </div>
            <DropdownMenuSeparator className="bg-slate-100 border-dashed border-t h-px mx-0 my-2" />

            <DropdownMenuSeparator className="bg-slate-100 mx-0 my-2" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="py-2.5 px-3 rounded-xl cursor-pointer hover:bg-red-50 transition-colors group mt-1 text-red-600"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-1.5 rounded-lg bg-red-50 text-[#FF4D49] group-hover:bg-red-100 transition-colors">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">{t("topbar_logout")}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
