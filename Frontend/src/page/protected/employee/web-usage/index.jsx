import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import useEmployeeSession from "../../../../sessions/employeeSession";
import WebHistoryTab      from "../../admin/employee-profile/WebHistoryTab";

export default function EmployeeWebUsage() {
  const { t } = useTranslation();
  const { employee } = useEmployeeSession();
  const employeeData = { id: employee?.user_id ?? null, name: employee?.full_name ?? "" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Globe size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#2B3674]">{t("webUsage")}</h1>
          <p className="text-xs text-[#A3AED0]">{t("ep_web_usage_desc")}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <WebHistoryTab employee={employeeData} />
      </div>
    </div>
  );
}
