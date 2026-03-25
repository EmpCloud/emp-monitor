import React from "react";
import EmpAlertNotification from "@/components/common/alert-notification/EmpAlertNotification";

const NonAdminAlertNotification = () => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
    <EmpAlertNotification />
  </div>
);

export default NonAdminAlertNotification;
