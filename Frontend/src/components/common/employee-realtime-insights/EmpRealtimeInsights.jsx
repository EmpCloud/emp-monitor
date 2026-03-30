import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  BarChart3,
  Download,
  Activity,
  Maximize2,
  ChartNoAxesColumn,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import EmpInsightsLogo from "../../../assets/employee/employees_real_time_insights.svg";

const MOCK_EMPLOYEES = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: "Robin Singh",
  description:
    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Nemo...",
  productivity: "14.77%",
  email: "robinsingh123@gmail.com",
}));

const avatarColors = [
  "bg-blue-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-emerald-500",
];

const EmpRealtimeInsights = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeBase = location.pathname.startsWith("/non-admin") ? "/non-admin" : "/admin";
  const [search, setSearch] = useState("");
  const [sliderMin, setSliderMin] = useState(0);
  const [sliderMax, setSliderMax] = useState(100);
  const [showMinTooltip, setShowMinTooltip] = useState(false);
  const [showMaxTooltip, setShowMaxTooltip] = useState(false);
  const [selectedId, setSelectedId] = useState(2);

  const handleAnalytics = (emp) => {
    navigate(`${routeBase}/get-employee-details?id=${emp.id}`, { state: { employee: emp } });
  };

  const handleDownloadReport = () => {
    const headers = ["Name", "Email", "Productivity"];
    const rows = filteredEmployees.map((e) =>
      [e.name, e.email, e.productivity].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `realtime_insights_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredEmployees = MOCK_EMPLOYEES.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full">
      <div className="p-9 pb-1 w-full">
        {/* Header */}
        <div className="flex relative flex-wrap items-start justify-between gap-4 mb-10">
          <div className="border-l-2 border-blue-500 pl-4">
            <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
              <span className="font-semibold">Employee&apos;s Real</span>{" "}
              <span className="font-normal text-gray-500">Time Insights</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
              &quot;Lorem ipsum quia dolor sit porro quisquam est qui amet
              consectetur adipisci&quot;
            </p>
          </div>
          <div className="absolute right-0 -top-4 hidden lg:flex items-end gap-1 mr-2">
            <img alt="realtime" className="w-30" src={EmpInsightsLogo} />
          </div>
        </div>

        {/* Search + Productivity Tracker */}
        <div className="flex flex-wrap items-center gap-x-32 gap-y-6 mb-8">
          {/* Search */}
          <div className="max-w-xs w-full" >
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Search
            </label>
            <div className="relative w-full max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-full bg-slate-50 border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Productivity Tracker Slider */}
          <div className="min-w-md max-w-md justify-self-center">
            <label className="block text-sm font-medium text-slate-700 mb-2 xl:mb-4">
              Productivity tracker
            </label>
            <div className="relative">
              {/* Min tooltip */}
              {showMinTooltip && (
                <div
                  className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md z-30"
                  style={{
                    left: `${sliderMin}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {sliderMin}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-800 rotate-45" />
                </div>
              )}
              {/* Max tooltip */}
              {showMaxTooltip && (
                <div
                  className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-md z-30"
                  style={{
                    left: `${sliderMax}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {sliderMax}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-800 rotate-45" />
                </div>
              )}
              {/* Track */}
              <div
                className="relative h-5 rounded-full"
                style={{
                  background: "linear-gradient(to right, #70A1D9, #DEDEDE)",
                }}
              >
                {/* Active range highlight */}
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    left: `${sliderMin}%`,
                    width: `${sliderMax - sliderMin}%`,
                    background: "linear-gradient(to right, #70A1D9, #DEDEDE)",
                  }}
                />
                {/* Inactive left */}
                <div
                  className="absolute h-full rounded-l-full bg-[#e2e8f0]"
                  style={{ left: 0, width: `${sliderMin}%` }}
                />
                {/* Inactive right */}
                <div
                  className="absolute h-full rounded-r-full bg-[#e2e8f0]"
                  style={{
                    left: `${sliderMax}%`,
                    width: `${100 - sliderMax}%`,
                  }}
                />
              </div>
              {/* Range inputs */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderMin}
                onChange={(e) => {
                  const val = Math.min(Number(e.target.value), sliderMax - 1);
                  setSliderMin(val);
                }}
                onMouseEnter={() => setShowMinTooltip(true)}
                onMouseLeave={() => setShowMinTooltip(false)}
                onMouseDown={() => setShowMinTooltip(true)}
                onMouseUp={() => setShowMinTooltip(false)}
                onTouchStart={() => setShowMinTooltip(true)}
                onTouchEnd={() => setShowMinTooltip(false)}
                className="absolute top-0 w-full h-5 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5B9BD5] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#5B9BD5] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={sliderMax}
                onChange={(e) => {
                  const val = Math.max(Number(e.target.value), sliderMin + 1);
                  setSliderMax(val);
                }}
                onMouseEnter={() => setShowMaxTooltip(true)}
                onMouseLeave={() => setShowMaxTooltip(false)}
                onMouseDown={() => setShowMaxTooltip(true)}
                onMouseUp={() => setShowMaxTooltip(false)}
                onTouchStart={() => setShowMaxTooltip(true)}
                onTouchEnd={() => setShowMaxTooltip(false)}
                className="absolute top-0 w-full h-5 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5B9BD5] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#5B9BD5] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
              />
            </div>
          </div>
          <div></div>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="w-full mt-6 rounded-b-2xl bg-[#EEF4FF] p-9 ">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredEmployees.map((emp, idx) => {
            const isSelected = selectedId === emp.id;
            return (
              <div
                key={emp.id}
                onClick={() => setSelectedId(emp.id)}
                className={`relative rounded-xl shadow-md border shadow-black/20 cursor-pointer transition-all overflow-hidden ${
                  isSelected
                    ? "border-blue-400 shadow-md shadow-blue-100 bg-white"
                    : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                }`}
              >
                {/* Top section - Avatar + Name + Indicator */}
                <div className="relative px-5 pt-5 pb-4 border-b border-[#989898]/30">
                  {/* Online indicator */}
                  <div className="absolute top-9 right-4">
                    <span className="size-2 rounded-full bg-red-500 inline-block" />
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-base overflow-hidden font-bold text-white shrink-0 ring-3 ring-white shadow-md`}
                    >
                      <img src="https://randomuser.me/api/portraits/men/60.jpg" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-slate-800 truncate">
                        {emp.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        &quot;Lorem ipsum quia dolor sit porro qui amet
                        consectetur adipisci.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom section - Productivity + Email + Actions */}
                <div className="px-7 pb-8 pt-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      {/* Productivity */}
                      <div>
                        <span className="text-sm  text-[#121212]">
                          Productivity :{" "}
                        </span>
                        <span className="text-sm font-semibold text-[#4558D2]">
                          {emp.productivity}
                        </span>
                      </div>

                      {/* Email */}
                      <div>
                        <span className="text-sm  text-[#121212]">
                          Email :{" "}
                        </span>
                        <span className="text-sm text-slate-400">
                          {emp.email}
                        </span>
                      </div>
                    </div>

                    {/* Bar chart icon */}
                    <div className="w-12 h-12 rounded-full bg-[#F4F7FE] flex items-center justify-center shrink-0">
                      <ChartNoAxesColumn
                        strokeWidth={4}
                        className="size-5 text-[#159DD8]"
                      />
                    </div>
                  </div>

                  {/* Footer action icons */}
                  <div className="flex items-center justify-center absolute bottom-0 right-0 bg-[#159DD8] rounded-tl-xl rounded-br-md px-3 py-0.5 gap-2 mt-3">
                    <button onClick={(e) => { e.stopPropagation(); handleAnalytics(emp); }} className="flex items-center justify-center transition-colors" title="Analytics">
                      <Maximize2 className="w-3 text-white" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDownloadReport(); }} className="flex items-center justify-center transition-colors" title="Download Report">
                      <Download className="w-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmpRealtimeInsights;
