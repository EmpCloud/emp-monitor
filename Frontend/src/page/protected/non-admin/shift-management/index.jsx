import React from "react";
import EmpShiftManagement from "@/components/common/shift-management/EmpShiftManagement";

const NonAdminShiftManagement = () => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
    <EmpShiftManagement />
  </div>
);

export default NonAdminShiftManagement;
