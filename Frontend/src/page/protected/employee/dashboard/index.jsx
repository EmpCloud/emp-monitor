import { useState } from "react";
import { useTranslation } from "react-i18next";
import moment from "moment";
import {
  BarChart3, Clock, Camera, Monitor, Video,
  Globe, LayoutGrid, PenTool,
} from "lucide-react";
import useEmployeeSession from "../../../../sessions/employeeSession";

import ProfileHeader      from "../../admin/employee-profile/ProfileHeader";
import ProductivityTab    from "../../admin/employee-profile/ProductivityTab";
import TimesheetsTab      from "../../admin/employee-profile/TimesheetsTab";
import ScreenshotsTab     from "../../admin/employee-profile/ScreenshotsTab";
import ScreenCastTab      from "../../admin/employee-profile/ScreenCastTab";
import ScreenRecordingTab from "../../admin/employee-profile/ScreenRecordingTab";
import WebHistoryTab      from "../../admin/employee-profile/WebHistoryTab";
import AppHistoryTab      from "../../admin/employee-profile/AppHistoryTab";
import KeyStrokesTab      from "../../admin/employee-profile/KeyStrokesTab";

const getTabItems = (t) => [
  { key: "productivity",    label: t("productivity"),        icon: BarChart3  },
  { key: "timesheets",      label: t("timesheets"),          icon: Clock      },
  { key: "screenshots",     label: t("ss"),                  icon: Camera     },
  { key: "screencast",      label: t("screenCast"),          icon: Monitor    },
  { key: "screenrecording", label: t("ep_screen_recording"), icon: Video      },
  { key: "webhistory",      label: t("ep_web_history"),      icon: Globe      },
  { key: "apphistory",      label: t("ep_app_history"),      icon: LayoutGrid },
  { key: "keystrokes",      label: t("keystroke"),           icon: PenTool    },
];

const tabComponents = {
  productivity:    ProductivityTab,
  timesheets:      TimesheetsTab,
  screenshots:     ScreenshotsTab,
  screencast:      ScreenCastTab,
  screenrecording: ScreenRecordingTab,
  webhistory:      WebHistoryTab,
  apphistory:      AppHistoryTab,
  keystrokes:      KeyStrokesTab,
};

export default function EmployeeDashboard() {
  const { t } = useTranslation();
  const { employee: session } = useEmployeeSession();

  const [activeTab, setActiveTab] = useState("productivity");
  const [startDate, setStartDate] = useState(moment().subtract(6, "days").format("YYYY-MM-DD"));
  const [endDate,   setEndDate]   = useState(moment().format("YYYY-MM-DD"));

  const tabs = getTabItems(t);

  // Build the employee object all tab components expect
  const employee = {
    id:   session?.user_id  ?? null,
    name: session?.full_name ?? session?.user_name ?? t("ep_my_account"),
  };

  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="bg-slate-200 w-full min-h-screen">
      <div className="p-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
          {/* Profile header */}
          <ProfileHeader
            employee={employee}
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => { setStartDate(start); setEndDate(end); }}
            showActions={false}
          />

          {/* Tab navigation */}
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

          {/* Active tab content */}
          <ActiveComponent
            employee={employee}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  );
}
