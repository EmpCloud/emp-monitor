import React from "react";
import EmpInsights from "@/components/common/employee-insights/EmpInsights";

const NonAdminEmployeeInsights = () => {
  return (
    <div className="bg-slate-200 w-full min-h-screen p-5">
      <EmpInsights />
    </div>
  );
};

export default NonAdminEmployeeInsights;
