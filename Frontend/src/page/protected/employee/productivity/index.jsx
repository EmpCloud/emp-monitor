import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import useEmployeeSession from "../../../../sessions/employeeSession";
import ProductivityTab    from "../../admin/employee-profile/ProductivityTab";

export default function EmployeeProductivity() {
  const { t } = useTranslation();
  const { employee } = useEmployeeSession();
  const employeeData = { id: employee?.user_id ?? null, name: employee?.full_name ?? "" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <BarChart3 size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#2B3674]">{t("productivity")}</h1>
          <p className="text-xs text-[#A3AED0]">{t("ep_productivity_desc")}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <ProductivityTab employee={employeeData} />
      </div>
    </div>
  );
}
