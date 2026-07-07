import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Search, Trash2 } from "lucide-react";

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
export function FixedTab({ value = {}, onChange }) {
  const { t } = useTranslation();
  const [applyError, setApplyError] = useState("");

  // A day is "on" if it has an entry in the saved `fixed` object; its times come
  // from fixed[day].time. Backend/write shape: { <Day>: { time: { start, end } } }.
  const fixed = value && typeof value === "object" ? value : {};
  const workingDays = DAYS.reduce((acc, d) => {
    acc[d.name] = d.name in fixed;
    return acc;
  }, {});
  const shifts = DAYS.map((d) => ({
    day: d.name,
    start: fixed[d.name]?.time?.start ?? "",
    end: fixed[d.name]?.time?.end ?? "",
  }));

  // Rebuild the `fixed` object from the given days/times and push it up so the
  // schedule actually persists on Save.
  const emit = (nextDays, nextShifts) => {
    const out = {};
    nextShifts.forEach((s) => {
      if (nextDays[s.day]) out[s.day] = { time: { start: s.start, end: s.end } };
    });
    onChange?.(out);
  };

  const updateShift = (idx, field, val) => {
    setApplyError("");
    const nextShifts = shifts.map((s, i) => (i === idx ? { ...s, [field]: val } : s));
    emit(workingDays, nextShifts);
  };

  const toggleDay = (day) => {
    setApplyError("");
    emit({ ...workingDays, [day]: !workingDays[day] }, shifts);
  };

  const applyToAll = () => {
    // Need a selected day that already has both start and end set to copy from.
    const source = shifts.find((s) => workingDays[s.day] && s.start && s.end);
    if (!source) {
      setApplyError(t("track_fixed_apply_hint"));
      return;
    }
    setApplyError("");
    const nextShifts = shifts.map((s) =>
      workingDays[s.day] ? { ...s, start: source.start, end: source.end } : s
    );
    emit(workingDays, nextShifts);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div>
        <h4 className="text-base font-bold text-gray-800">{t("track_select_working_days_timings")}</h4>
        <p className="text-xs text-gray-400 mt-0.5">{t("track_fixed_hours_desc")}</p>
        {applyError && <p className="text-sm text-red-500 mt-2">{applyError}</p>}
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
export function NetworkBasedTab({ value = [], onChange }) {
  const { t } = useTranslation();
  const [networkName, setNetworkName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [officeNetwork, setOfficeNetwork] = useState(true);
  const [error, setError] = useState("");

  const networks = Array.isArray(value) ? value : [];

  const resetForm = () => {
    setNetworkName("");
    setIpAddress("");
    setOfficeNetwork(true);
    setError("");
  };

  const handleAdd = () => {
    const name = networkName.trim();
    const ip = ipAddress.trim();

    if (!name) return setError(t("track_enter_network_name"));
    if (!ip) return setError(t("track_enter_ip_address"));

    // Write schema (see @/utils/trackData): { networkName, ipAddress, officeNetwork }.
    const entry = { networkName: name, ipAddress: ip, officeNetwork };
    onChange?.([...networks, entry]);
    resetForm();
  };

  const handleRemove = (idx) => {
    onChange?.(networks.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8 space-y-6">
      {/* Title + Button */}
      <div className="flex flex-wrap items-center gap-4">
        <h4 className="text-lg font-bold text-gray-800">{t("track_specific_network")}</h4>
        <Button
          type="button"
          onClick={handleAdd}
          className="h-8 px-5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold"
        >
          {t("track_add_new_location")}
        </Button>
      </div>

      {/* Added networks */}
      {networks.length > 0 && (
        <div className="space-y-2">
          {networks.map((n, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 min-w-0">
                <span className="font-medium text-gray-800 truncate">{n.networkName}</span>
                <span className="text-xs text-gray-500">{n.ipAddress}</span>
                {n.officeNetwork && (
                  <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {t("track_office_network")}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                title="Remove"
                className="shrink-0 w-7 h-7 rounded-md text-red-500 hover:bg-red-50 flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form fields + Office Network in a 2-column layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {/* Network Name */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-gray-600">{t("track_network_name")}</label>
          <Input
            placeholder={t("track_enter_network_name")}
            value={networkName}
            onChange={(e) => { setNetworkName(e.target.value); setError(""); }}
            className="h-10 rounded-xl border-gray-200 text-sm"
          />
        </div>

        {/* IP Address */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-gray-600">{t("track_ip_address")}</label>
          <Input
            placeholder={t("track_enter_ip_address")}
            value={ipAddress}
            onChange={(e) => { setIpAddress(e.target.value); setError(""); }}
            className="h-10 rounded-xl border-gray-200 text-sm"
          />
        </div>

        {/* Office Network toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOfficeNetwork((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              officeNetwork ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 ${
                officeNetwork ? "bg-white/30" : "border border-gray-400"
              }`}
            >
              {officeNetwork && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="text-[13px] font-semibold">{t("track_office_network")}</span>
          </button>
        </div>

        {/* Note */}
        <div className="flex items-center">
          <span className="text-[12px] text-gray-500">{t("track_office_network_note")}</span>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ── GEO Location Tab ── */
export function GeoLocationTab({ value = [], onChange }) {
  const { t } = useTranslation();
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [range, setRange] = useState("");
  const [error, setError] = useState("");

  const locations = Array.isArray(value) ? value : [];

  const resetForm = () => {
    setLocation("");
    setLatitude("");
    setLongitude("");
    setRange("");
    setError("");
  };

  const handleAdd = () => {
    const name = location.trim();
    const latStr = latitude.trim();
    const lngStr = longitude.trim();
    const rangeVal = range.trim();

    if (!name) return setError(t("track_enter_location"));
    if (!latStr || !lngStr) return setError(t("track_enter_lat_lng"));

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      return setError(t("track_enter_latitude"));
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      return setError(t("track_enter_longitude"));
    }
    const radius = parseFloat(rangeVal);
    if (rangeVal && Number.isNaN(radius)) return setError(t("track_enter_range"));

    const entry = {
      location: name,
      latitude: String(lat),
      longitude: String(lng),
      range: rangeVal ? String(radius) : "",
    };
    onChange?.([...locations, entry]);
    resetForm();
  };

  const handleRemove = (idx) => {
    onChange?.(locations.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
      <div className="flex items-center gap-3">
        <h4 className="text-base font-bold text-gray-800">{t("track_geo_location_title")}</h4>
        <Button
          type="button"
          onClick={handleAdd}
          className="h-8 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold"
        >
          {t("track_add_new_location")}
        </Button>
      </div>

      {/* Added locations */}
      {locations.length > 0 && (
        <div className="space-y-2">
          {locations.map((loc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 min-w-0">
                <span className="font-medium text-gray-800 truncate">{loc.location}</span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={11} className="text-gray-400" />
                  {loc.latitude}, {loc.longitude}
                </span>
                {loc.range && (
                  <span className="text-xs text-gray-500">{t("track_range_mts")}: {loc.range}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                title={t("track_advanced_settings") ? "Remove" : "Remove"}
                className="shrink-0 w-7 h-7 rounded-md text-red-500 hover:bg-red-50 flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">{t("track_location")}</label>
          <Input
            placeholder={t("track_enter_location")}
            value={location}
            onChange={(e) => { setLocation(e.target.value); setError(""); }}
            className="h-10 rounded-lg border-gray-200 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
            {t("track_latitude")} <MapPin size={12} className="text-gray-400" />
          </label>
          <Input
            type="number"
            step="any"
            placeholder={t("track_enter_latitude")}
            value={latitude}
            onChange={(e) => { setLatitude(e.target.value); setError(""); }}
            className="h-10 rounded-lg bg-gray-50 border-gray-200 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">{t("track_longitude")}</label>
          <Input
            type="number"
            step="any"
            placeholder={t("track_enter_longitude")}
            value={longitude}
            onChange={(e) => { setLongitude(e.target.value); setError(""); }}
            className="h-10 rounded-lg bg-gray-50 border-gray-200 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">{t("track_range_mts")}</label>
          <Input
            type="number"
            step="any"
            placeholder={t("track_enter_range")}
            value={range}
            onChange={(e) => { setRange(e.target.value); setError(""); }}
            className="h-10 rounded-lg bg-gray-50 border-gray-200 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button
        type="button"
        variant="outline"
        onClick={handleAdd}
        className="h-9 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold border-0"
      >
        {t("track_add_new_location")}
      </Button>
    </div>
  );
}
