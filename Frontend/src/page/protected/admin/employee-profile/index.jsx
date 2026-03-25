import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";
import {
  BarChart3, Clock, Camera, Monitor, Video,
  Globe, LayoutGrid, PenTool,
} from "lucide-react";
import EditEmployeeModal from "@/components/common/employee-details/EditEmployeeModal";
import { fetchFilterOptions } from "@/page/protected/admin/employee-details/service";

import ProfileHeader from "./ProfileHeader";
import ProductivityTab from "./ProductivityTab";
import TimesheetsTab from "./TimesheetsTab";
import ScreenshotsTab from "./ScreenshotsTab";
import ScreenCastTab from "./ScreenCastTab";
import ScreenRecordingTab from "./ScreenRecordingTab";
import WebHistoryTab from "./WebHistoryTab";
import AppHistoryTab from "./AppHistoryTab";
import KeyStrokesTab from "./KeyStrokesTab";

const tabs = [
  { key: "productivity", label: "Productivity", icon: BarChart3 },
  { key: "timesheets", label: "Timesheets", icon: Clock },
  { key: "screenshots", label: "Screenshots", icon: Camera },
  { key: "screencast", label: "Screen Cast", icon: Monitor },
  { key: "screenrecording", label: "Screen Recording", icon: Video },
  { key: "webhistory", label: "Web History", icon: Globe },
  { key: "apphistory", label: "App History", icon: LayoutGrid },
  { key: "keystrokes", label: "Key Strokes", icon: PenTool },
];

const tabComponents = {
  productivity: ProductivityTab,
  timesheets: TimesheetsTab,
  screenshots: ScreenshotsTab,
  screencast: ScreenCastTab,
  screenrecording: ScreenRecordingTab,
  webhistory: WebHistoryTab,
  apphistory: AppHistoryTab,
  keystrokes: KeyStrokesTab,
};

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const employee = location.state?.employee;
  const routeBase = location.pathname.startsWith("/non-admin") ? "/non-admin" : "/admin";
  const [activeTab, setActiveTab] = useState("productivity");
  const [startDate, setStartDate] = useState(moment().subtract(6, "days").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(moment().format("YYYY-MM-DD"));
  const [editOpen, setEditOpen] = useState(false);
  const [filterData, setFilterData] = useState({ roles: [], locations: [], shifts: [] });

  useEffect(() => {
    fetchFilterOptions().then(({ roles, locations, shifts }) => {
      setFilterData({ roles, locations, shifts });
    });
  }, []);

  if (!employee) {
    return (
      <div className="bg-slate-200 w-full p-5">
        <div className="bg-white rounded-2xl p-8 text-center min-h-[400px] flex flex-col items-center justify-center gap-4">
          <p className="text-gray-500 text-lg">Employee not found.</p>
          <Button
            variant="outline"
            onClick={() => navigate(`${routeBase}/employee-details`)}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Back to Employee List
          </Button>
        </div>
      </div>
    );
  }

  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="bg-slate-200 w-full min-h-screen">
      {/* Breadcrumb */}
      <div className="px-2 sm:px-5 pt-3 sm:pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-sm">
          <button
            onClick={() => navigate(`${routeBase}/dashboard`)}
            className="text-blue-600 hover:underline font-medium"
          >
            Home
          </button>
          <span className="text-gray-400">/</span>
          <button
            onClick={() => navigate(`${routeBase}/employee-details`)}
            className="text-blue-600 hover:underline font-medium"
          >
            Employee
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500 font-medium">Employee Full Details</span>
        </nav>
      </div>

      <div className="px-1 sm:px-3 lg:px-5 py-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 sm:p-3 lg:p-5 space-y-4 sm:space-y-5">
          {/* Profile Header */}
          <ProfileHeader
            employee={employee}
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => { setStartDate(start); setEndDate(end); }}
            onEdit={() => setEditOpen(true)}
          />

          {/* Tab Navigation */}
          <div className="grid grid-cols-4 2xl:grid-cols-8 gap-4">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium border transition-all duration-200 ${
                  activeTab === key
                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Active Tab Content */}
          <ActiveComponent employee={employee} startDate={startDate} endDate={endDate} />
        </div>
      </div>

      <EditEmployeeModal
        open={editOpen}
        onOpenChange={setEditOpen}
        employeeId={employee?.id ?? employee?.user_id ?? employee?.u_id}
        locations={filterData.locations}
        roles={filterData.roles}
        shifts={filterData.shifts}
        onSuccess={() => setEditOpen(false)}
      />
    </div>
  );
};

export default EmployeeProfile;
