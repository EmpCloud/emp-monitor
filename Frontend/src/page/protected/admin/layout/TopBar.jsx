import {
  Bell,
  HelpCircle,
  Settings,
  ShieldCheck,
  Fingerprint,
  LogOut,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import userData from "@/data/user.json";
import hrms from "@/assets/hrms.png";
import useAdminSession from "@/sessions/adminSession";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import UniPass from "@/components/common/UniPass";
import BackToCloud from "@/components/BackToCloud";

export default function TopHeader() {
  const { t } = useTranslation();
  const { open } = useSidebar();
  const { admin, clearAdmin } = useAdminSession();
  const [openUniPass, setOpenUniPass] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      clearAdmin();
    } catch (e) {
      // ignore, navigation will still proceed
    }
    navigate("/admin-login");
  };

  return (
    <div className="flex items-center justify-between border-b sticky top-0 z-50 border-slate-200/60 bg-white px-5 py-3 w-full">
      {/* Left — Greeting */}
      <div className="flex items-center gap-2">
        {(!open || window.innerWidth <= 768) && (
          <div className="trigger_button mr-3 flex h-7 w-7 items-center justify-center rounded-md bg-slate-200/70">
            <SidebarTrigger />
          </div>
        )}
        <div className="md:flex flex-col hidden">
          <span className="text-xs text-[#707EAE] font-bold">
            {t("topbar_hi")}{" "}
            {admin?.user_name &&
              admin?.user_name?.charAt(0)?.toUpperCase() +
                admin?.user_name?.slice(1)}
            ,
          </span>
          <h2 className="text-lg font-bold text-[#2B3674]">
            {t("topbar_welcome")}
          </h2>
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-4">
        <BackToCloud />
        {/* HRMS Badge */}
        {/* <button className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-slate-50 transition-colors">
          <img src={hrms} alt="" className="h-6 w-6" />
          <span className="hidden lg:inline"> HRMS</span>
        </button> */}

        {/* Help */}
        <a
          href="http://help.empmonitor.com/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          {t("topbar_help")}
        </a>

        {/* Notification Bell */}
        <div className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full shadow-lg  hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
        </div>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-blue-100 transition-all hover:ring-blue-200">
              <AvatarImage src={userData.avatar} alt={userData.firstName} />
              <AvatarFallback>{userData.firstName?.[0]}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 p-2 rounded-2xl shadow-2xl border-slate-100 mt-2"
            align="end"
          >
            {/* User Info Section */}
            <div className="flex items-center gap-3 px-3 py-4">
              <Avatar className="h-10 w-10 ring-2 ring-blue-50">
                <AvatarImage src={userData.avatar} alt={userData.firstName} />
                <AvatarFallback>{userData.firstName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-[#2B3674] truncate text-base">
                  {admin?.user_name
                    ? admin.user_name.charAt(0).toUpperCase() +
                      admin.user_name.slice(1)
                    : "Andrei Luca"}
                </span>
                <span className="text-xs text-[#7B8EB1] font-medium">
                  {t("topbar_admin")}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-slate-100 border-dashed border-t h-px mx-0 my-2" />

            {/* Menu Items */}
            <div className="space-y-1">
              <DropdownMenuItem className="py-2.5 px-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-[#0066FF] group-hover:bg-blue-100 transition-colors">
                    <Settings className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-[#2B3674]">
                    {t("topbar_account_settings")}
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem className="py-2.5 px-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group"  onClick={() => setOpenUniPass(true)}>
                <div className="flex items-center gap-3 w-full">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-[#0066FF] group-hover:bg-blue-100 transition-colors">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-[#2B3674]">
                    {t("topbar_uninstall_password")}
                  </span>
                </div>
              </DropdownMenuItem>

              {/* <DropdownMenuItem className="py-2.5 px-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-[#0066FF] group-hover:bg-blue-100 transition-colors">
                    <Fingerprint className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-[#2B3674]">
                    MFA Authentication
                  </span>
                </div>
              </DropdownMenuItem> */}
            </div>

            <DropdownMenuSeparator className="bg-slate-100 mx-0 my-2" />

            {/* Logout Section */}
            <DropdownMenuItem
              className="py-2.5 px-3 rounded-xl cursor-pointer hover:bg-red-50 transition-colors group mt-1 text-red-600"
              onClick={handleLogout}
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

       <UniPass isOpen={openUniPass} onClose={() => setOpenUniPass(false)}/>
    </div>

  );
}
