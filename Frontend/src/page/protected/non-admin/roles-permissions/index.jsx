import React from "react";
import EmpRolesPermission from "@/components/common/roles-permission/EmpRolesPermisssion";

const NonAdminRolesPermissions = () => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
    <EmpRolesPermission />
  </div>
);

export default NonAdminRolesPermissions;
