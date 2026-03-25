import React from "react";
import EmpUsbDetection from "@/components/common/usb-detection/EmpUsbDetection";

const NonAdminUSBDetection = () => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
    <EmpUsbDetection />
  </div>
);

export default NonAdminUSBDetection;
