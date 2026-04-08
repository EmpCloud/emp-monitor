import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Settings, Info, Camera, Shield, Cpu, DollarSign, X, Loader2 } from "lucide-react";
import { fetchEmployeeInfo } from "../employee-profile/service";
import { fetchUserTrackSettings, fetchSettingsOptions, fetchGroups, saveUserTrackSettings, parseTrackSettings, buildSavePayload } from "./service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomSelect from "@/components/common/elements/CustomSelect";
import {
  UnlimitedTab,
  FixedTab,
  ManualClockedInTab,
  ClientBasedTab,
  NetworkBasedTab,
  GeoLocationTab,
} from "./TrackingScenarioTabs";

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${checked ? "bg-blue-500" : "bg-gray-300"}`}
  >
    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

const RadioPair = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
  <div className="flex items-center gap-5">
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input type="radio" checked={value === true} onChange={() => onChange(true)} className="w-3.5 h-3.5 accent-blue-500" />
      <span className="text-[12px] text-blue-500 font-semibold">{t("track_enable")}</span>
    </label>
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input type="radio" checked={value === false} onChange={() => onChange(false)} className="w-3.5 h-3.5 accent-red-400" />
      <span className="text-[12px] text-red-400 font-semibold">{t("track_disabled")}</span>
    </label>
  </div>
  );
};

const Section = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    {title && (
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[#CAEDFF]" style={{ background: "#CAEDFF" }}>
        {icon}
        <h3 className="text-[13px] font-extrabold text-gray-800 tracking-tight">{title}</h3>
      </div>
    )}
    <div className="px-5 py-4">{children}</div>
  </div>
);

const FeatureRow = ({ label, value, onChange, hasAdvanced, onAdvancedClick, infoIcon, showAdvancedColumn = false }) => {
  const { t } = useTranslation();
  return (
  <div className={`py-2.5 border-b border-slate-50 last:border-0 ${showAdvancedColumn ? "grid grid-cols-[minmax(0,1fr)_200px_140px] gap-2 items-center px-2" : "flex items-center"}`}>
    <span className={`text-[12px] text-gray-600 flex items-center gap-1 font-medium min-w-0 ${showAdvancedColumn ? "" : "flex-1"}`}>
      {label}
      {infoIcon && <Info size={11} className="text-blue-300" />}
    </span>
    <div className={showAdvancedColumn ? "flex items-center" : "flex items-center gap-3 shrink-0"}>
      <RadioPair value={value} onChange={onChange} />
    </div>
    {showAdvancedColumn && (
      <div className="flex justify-end">
        {hasAdvanced ? (
          <Button size="xs" onClick={() => onAdvancedClick?.(label)} className="h-6 px-2.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md shadow-none whitespace-nowrap">
            {t("track_advanced_settings")}
          </Button>
        ) : null}
      </div>
    )}
    {!showAdvancedColumn && hasAdvanced ? (
      <Button size="xs" onClick={() => onAdvancedClick?.(label)} className="h-6 px-2.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md shadow-none whitespace-nowrap">
        {t("track_advanced_settings")}
      </Button>
    ) : null}
  </div>
  );
};

const TagInput = ({ value = [], onChange, placeholder }) => {
  const [input, setInput] = useState("");
  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      const newVal = input.trim().replace(/,$/,"");
      if (newVal && !value.includes(newVal)) onChange([...value, newVal]);
      setInput("");
    }
  };
  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));
  return (
    <div className="border border-gray-200 rounded-lg p-2 bg-white min-h-[40px]">
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map((tag, idx) => (
          <span key={idx} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-blue-200">
            {tag}
            <button type="button" onClick={() => remove(idx)} className="text-blue-400 hover:text-red-500"><X size={10} /></button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        className="w-full text-[12px] border-0 outline-none bg-transparent py-0.5"
      />
    </div>
  );
};

const SCENARIOS = [
  { key: "unlimited", labelKey: "track_unlimited" },
  { key: "fixed", labelKey: "track_fixed" },
  { key: "manual", labelKey: "track_manual_clocked_in" },
  { key: "client", labelKey: "track_client_based" },
  { key: "network", labelKey: "track_network_based" },
  { key: "geo", labelKey: "track_geo_location" },
];

const SCENARIO_MAP = { unlimited: "unlimited", fixed: "fixed", manual: "manual", client: "projectBased", network: "networkBased", geo: "geoLocation" };
const SCENARIO_REVERSE = Object.fromEntries(Object.entries(SCENARIO_MAP).map(([k, v]) => [v, k]));

const SCENARIO_COMPONENTS = {
  unlimited: UnlimitedTab,
  fixed: FixedTab,
  manual: ManualClockedInTab,
  client: ClientBasedTab,
  network: NetworkBasedTab,
  geo: GeoLocationTab,
};

export default function TrackEmp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [employee, setEmployee] = useState(location.state?.employee || null);
  const [loadingEmployee, setLoadingEmployee] = useState(!location.state?.employee);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ type: "", text: "" });

  // Settings options from API
  const [ssOptions, setSsOptions] = useState([]);
  const [idleOptions, setIdleOptions] = useState([]);
  const [breakOptions, setBreakOptions] = useState([]);
  const [settingTypeItems, setSettingTypeItems] = useState([]);
  const [advancedPanel, setAdvancedPanel] = useState(null); // "Web Used" | "Screenshots" | null
  const [advSaving, setAdvSaving] = useState(false);
  const [advMsg, setAdvMsg] = useState({ type: "", text: "" });

  // Parsed settings state
  const [settings, setSettings] = useState(null);

  const employeeId = employee?.id ?? employee?.user_id ?? employee?.u_id ?? searchParams.get("employee_id") ?? searchParams.get("id");
  const routeBase = location.pathname.startsWith("/non-admin") ? "/non-admin" : "/admin";

  // Load employee info
  useEffect(() => {
    if (employee) return;
    const empId = searchParams.get("employee_id") || searchParams.get("id");
    if (!empId) { setLoadingEmployee(false); return; }
    fetchEmployeeInfo(empId).then((res) => {
      if (res?.data) setEmployee(res.data);
      setLoadingEmployee(false);
    });
  }, [employee, searchParams]);

  // Load settings + options once employee is available
  useEffect(() => {
    if (!employeeId) return;

    Promise.all([
      fetchUserTrackSettings(employeeId),
      fetchSettingsOptions(),
      fetchGroups(),
    ]).then(([settingsRes, optionsRes, groupsRes]) => {
      if (settingsRes?.code === 200) {
        setSettings(parseTrackSettings(settingsRes));
      }

      const opts = optionsRes?.data?.data ?? optionsRes?.data ?? optionsRes ?? {};
      if (opts.screenshotFrequency) {
        setSsOptions(opts.screenshotFrequency.map((o) => ({
          label: o.name || `${o.value} Per Hour`,
          value: String(o.value ?? o),
        })));
      }
      if (opts.idleTime) {
        setIdleOptions(opts.idleTime.map((o) => ({
          label: o.name || `${o.value} Min`,
          value: String(o.value ?? o),
        })));
      }
      if (opts.beakTime) {
        setBreakOptions(opts.beakTime.map((o) => ({
          label: o.name || `${o.value} Min`,
          value: String(o.value ?? o),
        })));
      }

      // Build "Setting Applied" dropdown: Custom, Default, + groups
      const items = [
        { label: t("custom"), value: "3" },
        { label: t("default"), value: "1" },
      ];
      const groups = Array.isArray(groupsRes) ? groupsRes : [];
      groups.forEach((g) => {
        items.push({ label: g.name, value: `group_${g.group_id}` });
      });
      setSettingTypeItems(items);
    });
  }, [employeeId]);

  const set = useCallback((path, value) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const keys = path.split(".");
      if (keys.length === 1) return { ...prev, [keys[0]]: value };
      const copy = { ...prev };
      const parent = keys.slice(0, -1).reduce((obj, k) => {
        obj[k] = { ...obj[k] };
        return obj[k];
      }, copy);
      parent[keys[keys.length - 1]] = value;
      return copy;
    });
  }, []);

  const handleAdvanceSave = async () => {
    if (!settings || !employeeId) return;
    setAdvSaving(true);
    setAdvMsg({ type: "", text: "" });

    const payload = buildSavePayload({ employeeId, state: settings });
    const res = await saveUserTrackSettings(payload);

    setAdvSaving(false);
    if (res?.code === 200) {
      setAdvMsg({ type: "success", text: res.msg || t("track_advanced_settings_saved") });
      setTimeout(() => { setAdvancedPanel(null); setAdvMsg({ type: "", text: "" }); }, 1000);
    } else {
      setAdvMsg({ type: "error", text: res?.msg || res?.message || t("track_failed_to_save") });
    }
  };

  const handleSave = async () => {
    if (!settings || !employeeId) return;
    setSaving(true);
    setSaveMsg({ type: "", text: "" });

    const payload = buildSavePayload({ employeeId, state: settings });
    const res = await saveUserTrackSettings(payload);

    setSaving(false);
    if (res?.code === 200) {
      setSaveMsg({ type: "success", text: res.msg || t("track_settings_saved") });
    } else {
      setSaveMsg({ type: "error", text: res?.msg || res?.message || t("track_failed_to_save_settings") });
    }
  };

  const name = employee?.name || employee?.first_name || "Employee";

  // Derive UI scenario key from API trackingMode
  const trackingScenario = SCENARIO_REVERSE[settings?.trackingMode] || "unlimited";
  const setTrackingScenario = (key) => set("trackingMode", SCENARIO_MAP[key] || "unlimited");

  if (loadingEmployee) {
    return (
      <div className="bg-slate-200 w-full p-5">
        <div className="bg-white rounded-2xl p-8 text-center min-h-[400px] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-slate-200 w-full p-5">
        <div className="bg-white rounded-2xl p-8 text-center min-h-[400px] flex flex-col items-center justify-center gap-4">
          <p className="text-gray-500 text-lg">{t("track_employee_not_found")}</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft size={16} /> {t("track_go_back")}
          </Button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-slate-200 w-full p-5">
        <div className="bg-white rounded-2xl p-8 text-center min-h-[400px] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  const ActiveScenario = SCENARIO_COMPONENTS[trackingScenario];

  return (
    <div className="bg-slate-200 w-full min-h-screen">
      <div className="px-3 sm:px-4 lg:px-6 py-4">
        <div className="space-y-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">

          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-gray-800 tracking-tight">{name}</h1>
              <button
                onClick={() => navigate(`${routeBase}/get-employee-details?id=${employeeId}`, { state: { employee } })}
                className="text-[13px] text-blue-500 hover:underline font-medium"
              >
                {t("track_employee_full_details")}
              </button>
            </div>
            <div className="flex items-center gap-3">
              {saveMsg.text && (
                <span className={`text-xs font-medium ${saveMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                  {saveMsg.text}
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-6 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-bold shadow-sm"
              >
                {saving ? t("track_saving") : t("save")}
              </Button>
            </div>
          </div>

          {/* Employee General Details */}
          <Section title={t("track_employee_general_details")} icon={<Settings size={14} className="text-blue-500" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                  <Settings size={10} className="text-gray-400" /> {t("track_setting_applied")}
                </label>
                <CustomSelect placeholder="Select" items={settingTypeItems}
                  selected={settings.settingType === "2" ? `group_${settings.groupId}` : settings.settingType}
                  onChange={(v) => {
                    if (v.startsWith("group_")) {
                      set("settingType", "2");
                      set("groupId", v.replace("group_", ""));
                    } else {
                      set("settingType", v);
                      set("groupId", "1");
                    }
                  }} width />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500">{t("track_visibility")}</label>
                <div className="flex items-center gap-4 h-10">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={settings.visibility} onChange={() => set("visibility", true)} className="w-3.5 h-3.5 accent-blue-500" />
                    <span className="text-[12px] font-medium">{t("track_visible")}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={!settings.visibility} onChange={() => set("visibility", false)} className="w-3.5 h-3.5 accent-blue-500" />
                    <span className="text-[12px] font-medium">{t("track_stealth")}</span>
                  </label>
                </div>
              </div>
            </div>
          </Section>

          {/* Tracking + DLP / Screenshots / Agent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title={t("track_tracking_features")} icon={<Shield size={14} className="text-red-400" />}>
              <div className="bg-[#f5f7fb] rounded-xl p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_200px_140px] gap-2 items-center px-2 py-2 mb-1 bg-gray-200/60 rounded-md">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{t("track_feature")}</span>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{t("track_status")}</span>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide text-right">{t("track_advanced_settings")}</span>
                </div>
                <FeatureRow label={t("track_key_strokes")} value={settings.features.keyStrokes} onChange={(v) => set("features.keyStrokes", v)} showAdvancedColumn />
                <FeatureRow label={t("track_real_time_track")} value={settings.features.realTimeTrack} onChange={(v) => set("features.realTimeTrack", v)} showAdvancedColumn />
                <FeatureRow label={t("track_web_used")} value={settings.features.webUsed} onChange={(v) => set("features.webUsed", v)} hasAdvanced onAdvancedClick={(label) => setAdvancedPanel(advancedPanel === label ? null : label)} showAdvancedColumn />
                <FeatureRow label={t("track_screenshots")} value={settings.features.screenshots} onChange={(v) => set("features.screenshots", v)} hasAdvanced onAdvancedClick={(label) => setAdvancedPanel(advancedPanel === label ? null : label)} showAdvancedColumn />
                <FeatureRow label={t("track_screen_recording")} value={settings.features.screenRecording} onChange={(v) => set("features.screenRecording", v)} showAdvancedColumn />
                <FeatureRow label={t("track_screen_recording_with_voice")} value={settings.features.screenRecordingWithVoice} onChange={(v) => set("features.screenRecordingWithVoice", v)} infoIcon showAdvancedColumn />
                <FeatureRow label={t("track_file_upload_detection")} value={settings.features.fileUploadDetection} onChange={(v) => set("features.fileUploadDetection", v)} showAdvancedColumn />
                <FeatureRow label={t("track_file_upload_blocking")} value={settings.features.fileUploadBlocking} onChange={(v) => set("features.fileUploadBlocking", v)} showAdvancedColumn />
                <FeatureRow label={t("track_print_blocking")} value={settings.features.printBlocking} onChange={(v) => set("features.printBlocking", v)} showAdvancedColumn />
                <FeatureRow label={t("track_print_detection")} value={settings.features.printDetection} onChange={(v) => set("features.printDetection", v)} showAdvancedColumn />
                <FeatureRow label={t("track_manual_clock_in_and_out")} value={settings.features.manualClockInOut} onChange={(v) => set("features.manualClockInOut", v)} showAdvancedColumn />
                <FeatureRow label={t("track_usb_blocking")} value={settings.features.usbBlocking} onChange={(v) => set("features.usbBlocking", v)} showAdvancedColumn />
                <FeatureRow label={t("track_attendance_override")} value={settings.features.attendanceOverride} onChange={(v) => set("features.attendanceOverride", v)} showAdvancedColumn />
                <FeatureRow label={t("track_system_lock")} value={settings.features.systemLock} onChange={(v) => set("features.systemLock", v)} showAdvancedColumn />
                <FeatureRow label={t("track_geo_location_logs")} value={settings.features.geoLocationLogs} onChange={(v) => set("features.geoLocationLogs", v)} showAdvancedColumn />
                <FeatureRow label={t("track_screen_casting")} value={settings.features.screenCasting} onChange={(v) => set("features.screenCasting", v)} showAdvancedColumn />
                <FeatureRow label={t("track_webcam_cast")} value={settings.features.webcamCast} onChange={(v) => set("features.webcamCast", v)} showAdvancedColumn />
              </div>
              {advancedPanel && (
                <div className="fixed inset-0 z-[99999] bg-slate-900/60 flex items-center justify-center" onClick={() => setAdvancedPanel(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-[min(640px,92vw)] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                      <h3 className="text-[15px] font-bold text-gray-800">{advancedPanel}: {t("track_edit_settings")}</h3>
                      <button onClick={() => setAdvancedPanel(null)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"><X size={16} /></button>
                    </div>
                    <div className="px-6 py-5 space-y-5">
                      {advancedPanel === t("track_web_used") && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-gray-700">{t("track_block_websites")}</label>
                            <TagInput
                              value={settings.tracking?.domain?.websiteBlockList ?? []}
                              onChange={(v) => set("tracking.domain.websiteBlockList", v)}
                              placeholder={t("track_type_website_url")}
                            />
                            <p className="text-[10px] text-gray-400">{t("track_add_website_urls_block")}</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-gray-700">{t("track_block_applications")}</label>
                            <TagInput
                              value={settings.tracking?.domain?.appBlockList ?? []}
                              onChange={(v) => set("tracking.domain.appBlockList", v)}
                              placeholder={t("track_type_app_name")}
                            />
                            <p className="text-[10px] text-gray-400">{t("track_add_app_names_block")}</p>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={settings.disableAllWebsites} onChange={(e) => set("disableAllWebsites", e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
                            <span className="text-[12px] font-medium text-gray-700">{t("track_disable_all_websites")}</span>
                          </label>
                          {settings.disableAllWebsites && (
                            <div className="space-y-1.5">
                              <label className="text-[12px] font-bold text-gray-700">{t("track_exclude_websites")}</label>
                              <TagInput
                                value={settings.tracking?.domain?.excludeWebsiteList ?? []}
                                onChange={(v) => set("tracking.domain.excludeWebsiteList", v)}
                                placeholder={t("track_type_website_exclude")}
                              />
                            </div>
                          )}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={settings.loginFromOtherSystem} onChange={(e) => set("loginFromOtherSystem", e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
                            <span className="text-[12px] font-medium text-gray-700">{t("track_allow_login_other_system")}</span>
                          </label>
                        </>
                      )}
                      {advancedPanel === t("track_screenshots") && (
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-bold text-gray-700">{t("track_enable_screen_record_visit")}</label>
                          <TagInput
                            value={settings.screenRecordWebsites ?? []}
                            onChange={(v) => set("screenRecordWebsites", v)}
                            placeholder={t("track_type_website_url")}
                          />
                          <p className="text-[10px] text-gray-400">{t("track_screen_record_visit_desc")}</p>
                        </div>
                      )}
                      {advMsg.text && (
                        <div className={`p-3 rounded-lg text-[12px] font-medium ${advMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                          {advMsg.text}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                      <Button onClick={handleAdvanceSave} disabled={advSaving} className="h-9 px-5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-semibold gap-2">
                        {advSaving && <Loader2 size={13} className="animate-spin" />}
                        {t("save")}
                      </Button>
                      <Button variant="outline" onClick={() => { setAdvancedPanel(null); setAdvMsg({ type: "", text: "" }); }} className="h-9 px-5 rounded-lg text-[12px] font-semibold">{t("cancel")}</Button>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            <div className="space-y-4">
              {/* DLP */}
              <Section title={t("track_dlp_features")} icon={<Shield size={14} className="text-orange-400" />}>
                <FeatureRow label={t("track_bluetooth_detection")} value={settings.dlp.bluetoothDetection} onChange={(v) => set("dlp.bluetoothDetection", v)} />
                <FeatureRow label={t("track_bluetooth_blocking")} value={settings.dlp.bluetoothBlocking} onChange={(v) => set("dlp.bluetoothBlocking", v)} />
                <FeatureRow label={t("track_clipboard_detection")} value={settings.dlp.clipboardDetection} onChange={(v) => set("dlp.clipboardDetection", v)} />
                <FeatureRow label={t("track_clipboard_blocking")} value={settings.dlp.clipboardBlocking} onChange={(v) => set("dlp.clipboardBlocking", v)} />
              </Section>

              {/* Screenshots */}
              <Section title={t("track_screenshots_section")} icon={<Camera size={14} className="text-blue-400" />}>
                <p className="text-[11px] text-gray-400 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-800 inline-block" />
                  {t("track_screenshot_frequency_desc")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-500">{t("track_screenshots_frequency")}</label>
                    <CustomSelect
                      placeholder="Select"
                      items={ssOptions.length ? ssOptions : [{ label: "2 per hour", value: "2" }]}
                      selected={settings.ssFrequency}
                      onChange={(v) => set("ssFrequency", v)}
                      width
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-500">{t("track_video_quality")}</label>
                    <CustomSelect placeholder="Select" items={[
                      { label: t("track_high_quality"), value: "1" }, { label: t("track_low_quality"), value: "2" }, { label: t("track_ultra_low"), value: "3" },
                    ]} selected={settings.videoQuality} onChange={(v) => set("videoQuality", v)} width />
                  </div>
                </div>
              </Section>

              {/* Agent Automatic Update */}
              <Section title={t("track_agent_automatic_update")} icon={<Cpu size={14} className="text-emerald-500" />}>
                <p className="text-[12px] text-gray-400 mb-3 leading-relaxed">
                  <Info size={10} className="inline text-gray-400 mr-1 -mt-0.5" />
                  {t("track_agent_update_desc")}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-gray-700">{t("track_enable_automatic_update")}</span>
                  <Toggle checked={settings.autoUpdate} onChange={(v) => set("autoUpdate", v)} />
                </div>
              </Section>
            </div>
          </div>

          {/* Work Hours Billing */}
          <Section title={t("track_work_hours_billing")} icon={<DollarSign size={14} className="text-emerald-500" />}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-semibold text-gray-700">{t("track_enable_work_hours_billing")}</span>
              <Toggle checked={settings.billingEnabled} onChange={(v) => set("billingEnabled", v)} />
            </div>
            {settings.billingEnabled && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-500">{t("track_billing_based_on")}</label>
                  <CustomSelect placeholder="Select" items={[
                    { label: t("track_office_hours"), value: "office_hours" }, { label: t("track_active_hours"), value: "active_hours" },
                    { label: t("track_total_hours"), value: "total_hours" }, { label: t("track_productive_hours"), value: "productive_hours" },
                  ]} selected={settings.billingBasedOn} onChange={(v) => set("billingBasedOn", v)} width />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-500">{t("track_amount_per_hours")}</label>
                  <Input type="number" value={settings.amountPerHour} onChange={(e) => set("amountPerHour", e.target.value)} className="h-10 rounded-lg border-slate-200 text-[13px]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-500">{t("track_currency")}</label>
                  <CustomSelect placeholder="Select" items={[
                    { label: "INR ₹", value: "INR" }, { label: "USD $", value: "USD" }, { label: "EUR €", value: "EUR" },
                  ]} selected={settings.currency} onChange={(v) => set("currency", v)} width />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-500">{t("track_invoice_duration")}</label>
                  <CustomSelect placeholder="Select" items={[
                    { label: t("track_weekly"), value: "weekly" }, { label: t("track_bi_weekly"), value: "biweekly" }, { label: t("track_monthly"), value: "monthly" },
                  ]} selected={settings.invoiceDuration} onChange={(v) => set("invoiceDuration", v)} width />
                </div>
              </div>
            )}
          </Section>

          {/* Break / Idle / Min Time + Tracking Scenario */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-[12px] font-extrabold text-red-500 flex items-center gap-1">
                  {t("track_break_time")} <Info size={11} className="text-red-300" />
                </label>
                <div className="rounded-xl border-2 border-red-200 bg-red-50 overflow-hidden">
                  <CustomSelect placeholder="Select" items={breakOptions.length ? breakOptions : [
                    { label: t("track_no_break_time"), value: "0" }, { label: "30 Min", value: "30" },
                    { label: "60 Min", value: "60" },
                  ]} selected={settings.breakInMinute} onChange={(v) => set("breakInMinute", v)} width />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-extrabold text-orange-500 flex items-center gap-1">
                  {t("track_idle_time")} <Info size={11} className="text-orange-300" />
                </label>
                <div className="rounded-xl border-2 border-orange-200 bg-orange-50 overflow-hidden">
                  <CustomSelect
                    placeholder="Select"
                    items={idleOptions.length ? idleOptions : [
                      { label: "1 min", value: "1" }, { label: "2 min", value: "2" },
                      { label: "3 min", value: "3" }, { label: "5 min", value: "5" },
                      { label: "10 min", value: "10" }, { label: "15 min", value: "15" },
                      { label: "20 min", value: "20" }, { label: "30 min", value: "30" },
                    ]}
                    selected={settings.idleInMinute}
                    onChange={(v) => set("idleInMinute", v)}
                    width
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                  {t("track_idle_time_timesheets")} <Info size={11} className="text-gray-400" /> ( MM:SS )
                </label>
                <Input type="text" placeholder="00:00" value={settings.timesheetIdleTime} onChange={(e) => set("timesheetIdleTime", e.target.value)} className="h-10 rounded-lg border-slate-200 text-[13px]" />
              </div>
            </div>

            {/* Tracking Scenario */}
            <div className="mt-5 space-y-2">
              <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                {t("track_tracking_scenario")} <Info size={11} className="text-gray-400" />
              </label>
              <div className="bg-slate-100 rounded-full p-1 flex flex-wrap">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setTrackingScenario(s.key)}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                      trackingScenario === s.key ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <input type="radio" name="scenario" checked={trackingScenario === s.key} onChange={() => setTrackingScenario(s.key)} className="w-3 h-3 accent-blue-500" />
                    {t(s.labelKey)}
                  </button>
                ))}
              </div>
              <ActiveScenario />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
