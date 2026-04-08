import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Search } from "lucide-react";

/* ── Day colors (matching reference: cyan for weekdays, rose for Saturday, red for Sunday) ── */
const DAYS = [
  { name: "Monday", bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-700", checkBg: "bg-cyan-500" },
  { name: "Tuesday", bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-700", checkBg: "bg-cyan-500" },
  { name: "Wednesday", bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-700", checkBg: "bg-cyan-500" },
  { name: "Thursday", bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-700", checkBg: "bg-cyan-500" },
  { name: "Friday", bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-700", checkBg: "bg-cyan-500" },
  { name: "Saturday", bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-600", checkBg: "bg-rose-500" },
  { name: "Sunday", bg: "bg-red-500", border: "border-red-500", text: "text-white", checkBg: "bg-white" },
];

/* ── Unlimited Tab ── */
export function UnlimitedTab() {
  const { t } = useTranslation();
  const [workingDays, setWorkingDays] = useState({
    Monday: true, Tuesday: true, Wednesday: true, Thursday: true,
    Friday: true, Saturday: true, Sunday: false,
  });

  const toggleDay = (day) => setWorkingDays((p) => ({ ...p, [day]: !p[day] }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div>
        <h4 className="text-base font-bold text-gray-800">{t("track_select_working_days")}</h4>
        <p className="text-xs text-gray-400 mt-0.5">{t("track_tracker_constantly_working")}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DAYS.map((d) => {
          const active = workingDays[d.name];
          return (
            <button
              key={d.name}
              onClick={() => toggleDay(d.name)}
              className={`flex items-center gap-3 h-10 px-3 rounded-lg text-[13px] font-medium transition-all border ${d.bg} ${d.border} ${d.text}`}
            >
              <span className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 ${active ? d.checkBg : "bg-white border border-gray-300"}`}>
                {active && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={d.name === "Sunday" ? "text-red-500" : "text-white"} />
                  </svg>
                )}
              </span>
              {d.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Fixed Tab ── */
export function FixedTab() {
  const { t } = useTranslation();
  const [workingDays, setWorkingDays] = useState(
    DAYS.reduce((acc, d) => {
      acc[d.name] = true;
      return acc;
    }, {})
  );

  const [shifts, setShifts] = useState(DAYS.map((d) => ({ day: d.name, start: "", end: "" })));

  const updateShift = (idx, field, val) =>
    setShifts((p) => p.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));

  const toggleDay = (day) => setWorkingDays((p) => ({ ...p, [day]: !p[day] }));

  const applyToAll = () => {
    const firstIdx = shifts.findIndex((s) => workingDays[s.day]);
    if (firstIdx < 0) return;
    const first = shifts[firstIdx];

    setShifts((p) =>
      p.map((s) => (workingDays[s.day] ? { ...s, start: first.start, end: first.end } : s))
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div>
        <h4 className="text-base font-bold text-gray-800">{t("track_select_working_days_timings")}</h4>
        <p className="text-xs text-gray-400 mt-0.5">{t("track_fixed_hours_desc")}</p>
      </div>

      <div className="bg-[#F8FAFC] border border-gray-100 rounded-3xl p-6">
        <div className="flex items-start gap-8">
          {/* Left: day pills */}
          <div className="flex flex-col gap-3">
            {DAYS.map((d) => {
              const active = !!workingDays[d.name];
              return (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => toggleDay(d.name)}
                  className={`flex items-center gap-3 w-[220px] h-9 px-4 rounded-lg text-[13px] font-medium border transition-all ${
                    active ? `${d.bg} ${d.border} ${d.text}` : "bg-white border-gray-300 text-gray-600"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 ${
                      active ? d.checkBg : "bg-white border border-gray-300"
                    }`}
                  >
                    {active && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6L5 9L10 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={d.name === "Sunday" ? "text-red-500" : "text-white"}
                        />
                      </svg>
                    )}
                  </span>
                  {d.name}
                </button>
              );
            })}
          </div>

          {/* Middle + Right: per-day timing rows */}
          <div className="flex-1">
            <div className="grid gap-3">
              {DAYS.map((d, idx) => {
                const active = !!workingDays[d.name];
                return (
                  <div key={d.name} className="grid grid-cols-2 gap-x-12 items-center">
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                        {t("track_shift_starts_at")}
                      </span>
                      <Input
                        type="time"
                        value={shifts[idx].start}
                        onChange={(e) => updateShift(idx, "start", e.target.value)}
                        disabled={!active}
                        className="h-9 w-[110px] rounded-lg border-gray-200 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                        {t("track_shift_ends_at")}
                      </span>
                      <Input
                        type="time"
                        value={shifts[idx].end}
                        onChange={(e) => updateShift(idx, "end", e.target.value)}
                        disabled={!active}
                        className="h-9 w-[110px] rounded-lg border-gray-200 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: apply button */}
          <div className="w-[160px] flex justify-end pt-2">
            <Button
              onClick={applyToAll}
              className="h-9 px-5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold"
            >
              {t("track_apply_to_all")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Manual Clocked In Tab ── */
export function ManualClockedInTab() {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h4 className="text-base font-bold text-gray-800 mb-8">{t("track_manual_clock_in_out")}</h4>
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <Briefcase size={36} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 max-w-md leading-relaxed">
          {t("track_manual_clock_desc")}
        </p>
      </div>
    </div>
  );
}

/* ── Client Based Tab ── */
export function ClientBasedTab() {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h4 className="text-base font-bold text-gray-800 mb-8">{t("track_clients_list")}</h4>
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <Search size={32} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">{t("track_no_data_found")}</p>
      </div>
    </div>
  );
}

/* ── Network Based Tab ── */
export function NetworkBasedTab() {
  const { t } = useTranslation();
  const [networkName, setNetworkName] = useState("");
  const [ipAddress, setIpAddress] = useState("");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8 space-y-6">
      {/* Title + Button */}
      <div className="flex flex-wrap items-center gap-4">
        <h4 className="text-lg font-bold text-gray-800">{t("track_specific_network")}</h4>
        <Button className="h-8 px-5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold">
          {t("track_add_new_location")}
        </Button>
      </div>

      {/* Form fields + Office Network in a 2-column layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* Network Name */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-gray-600">{t("track_network_name")}</label>
          <Input
            placeholder={t("track_enter_network_name")}
            value={networkName}
            onChange={(e) => setNetworkName(e.target.value)}
            className="h-10 rounded-xl border-gray-200 text-sm"
          />
        </div>

        {/* IP Address */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-gray-600">{t("track_ip_address")}</label>
          <Input
            placeholder={t("track_enter_ip_address")}
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            className="h-10 rounded-xl border-gray-200 text-sm"
          />
        </div>

        {/* Office Network pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg">
            <span className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0 bg-white/30">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[13px] font-semibold">{t("track_office_network")}</span>
          </div>
        </div>

        {/* Note */}
        <div className="flex items-center">
          <span className="text-[12px] text-gray-500">{t("track_office_network_note")}</span>
        </div>
      </div>
    </div>
  );
}

/* ── GEO Location Tab ── */
export function GeoLocationTab() {
  const { t } = useTranslation();
  const [location, setLocation] = useState("");
  const [latLng, setLatLng] = useState("");
  const [range, setRange] = useState("");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
      <div className="flex items-center gap-3">
        <h4 className="text-base font-bold text-gray-800">{t("track_geo_location_title")}</h4>
        <Button className="h-8 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold">
          {t("track_add_new_location")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">{t("track_location")}</label>
          <Input
            placeholder={t("track_enter_location")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-10 rounded-lg border-gray-200 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
            {t("track_lat_lng")} <MapPin size={12} className="text-gray-400" />
          </label>
          <Input
            placeholder={t("track_enter_lat_lng")}
            value={latLng}
            onChange={(e) => setLatLng(e.target.value)}
            className="h-10 rounded-lg bg-gray-50 border-gray-200 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">{t("track_range_mts")}</label>
          <Input
            placeholder={t("track_enter_range")}
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="h-10 rounded-lg bg-gray-50 border-gray-200 text-sm"
          />
        </div>
      </div>

      <Button variant="outline" className="h-9 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold border-0">
        {t("track_add_new_location")}
      </Button>
    </div>
  );
}
