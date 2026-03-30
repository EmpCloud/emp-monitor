import apiService from "@/services/api.service";

/**
 * GET employee tracking settings
 * v3 API: POST /settings/get-emp-setting-trac
 */
export const fetchUserTrackSettings = async (employeeId) => {
  try {
    const { data } = await apiService.apiInstance.post("/settings/get-emp-setting-trac", {
      employee_id: employeeId,
    });
    return data;
  } catch (error) {
    console.error("TrackUserSettings: fetch error", error);
    return { code: 500, data: null };
  }
};

/**
 * GET settings options (screenshot frequencies, idle times, etc.)
 * v3 API: GET /settings/options
 */
export const fetchSettingsOptions = async () => {
  try {
    const { data } = await apiService.apiInstance.get("/settings/options");
    return data;
  } catch (error) {
    console.error("TrackUserSettings: fetchOptions error", error);
    return { code: 500, data: null };
  }
};

/**
 * POST save user tracking settings
 * v3 API: POST /settings/user-tracking-setting
 */
export const saveUserTrackSettings = async (payload) => {
  try {
    const { data } = await apiService.apiInstance.post("/settings/user-tracking-setting", payload);
    return data;
  } catch (error) {
    console.error("TrackUserSettings: save error", error);
    return { code: 500, msg: "Failed to save settings" };
  }
};

/**
 * GET organization groups for "Setting Applied" dropdown
 * v3 API: GET /groups
 */
export const fetchGroups = async () => {
  try {
    const { data } = await apiService.apiInstance.get("/groups");
    return data?.data ?? data ?? [];
  } catch (error) {
    console.error("TrackUserSettings: fetchGroups error", error);
    return [];
  }
};

/** Normalize to array — handles string (comma-separated), array, null/undefined */
const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim()) return val.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};

/**
 * Parse API response into component-friendly state.
 */
export const parseTrackSettings = (apiData) => {
  const d = apiData?.data ?? apiData ?? {};
  const rules = d.rules ?? d;

  // Parse rules if it's a JSON string
  const r = typeof rules === "string" ? JSON.parse(rules) : rules;

  const features = r.features ?? r.trackingFeatures ?? {};
  const dlp = r.dlpFeatures ?? {};
  const screenshot = r.screenshot ?? {};
  const tracking = r.tracking ?? {};
  const fixed = tracking.fixed ?? {};
  const billing = r.work_hour_billing ?? {};
  const screenRecord = r.screen_record ?? {};
  const system = r.system ?? {};

  return {
    // General
    visibility: system.visibility === "true" || system.visibility === true,
    autoUpdate: String(system.autoUpdate) === "1",
    settingType: String(d.tracking_rule_type ?? d.type ?? r.type ?? "3"),
    groupId: d.group_id ?? r.group_id ?? "1",

    // Tracking features
    features: {
      keyStrokes: String(features.keystrokes ?? "1") === "1",
      realTimeTrack: String(features.realTimeTrack ?? "0") === "1",
      webUsed: String(features.web_usage ?? features.applications ?? "1") === "1",
      screenshots: String(features.screenshots ?? "1") === "1",
      screenRecording: String(features.screen_record ?? screenRecord.is_enabled ?? "0") === "1",
      screenRecordingWithVoice: String(screenRecord.audio ?? "0") === "1",
      fileUploadDetection: String(features.file_upload_detection ?? "0") === "1",
      fileUploadBlocking: String(features.file_upload_blocking ?? "0") === "1",
      printBlocking: String(features.print_blocking ?? "0") === "1",
      printDetection: String(features.print_detection ?? "0") === "1",
      manualClockInOut: String(r.manual_clock_in ?? "0") === "1",
      usbBlocking: String(r.usbDisable ?? "0") === "1",
      attendanceOverride: String(r.is_attendance_override ?? "0") === "1",
      systemLock: String(r.systemLock ?? "0") === "1",
      geoLocationLogs: String(r.isSilahMobileGeoLocation ?? "0") === "1",
      screenCasting: String(features.screencast ?? "0") === "1",
      webcamCast: String(features.webCamCasting ?? "0") === "1",
    },

    // DLP
    dlp: {
      bluetoothDetection: String(dlp.bluetoothDetection ?? "0") === "1",
      bluetoothBlocking: String(dlp.bluetoothBlock ?? "0") === "1",
      clipboardDetection: String(dlp.clipboardDetection ?? "0") === "1",
      clipboardBlocking: String(dlp.clipboardBlock ?? "0") === "1",
    },

    // Screenshot & video
    ssFrequency: String(screenshot.frequencyPerHour ?? "2"),
    videoQuality: String(screenRecord.video_quality ?? "2"),

    // Billing
    billingEnabled: String(billing.is_enabled ?? "0") === "1",
    billingBasedOn: billing.billing_based_on ?? "",
    amountPerHour: String(billing.hours_per_day ?? ""),
    currency: billing.currency ?? "",
    invoiceDuration: billing.invoice_duration ?? "",

    // Timing
    idleInMinute: String(r.idleInMinute ?? "5"),
    timesheetIdleTime: r.timesheetIdleTime ?? "00:00",
    breakInMinute: String(r.breakInMinute ?? "30"),

    // Tracking scenario
    trackingMode: r.trackingMode ?? "unlimited",
    tracking: {
      fixed,
      networkBased: tracking.networkBased ?? [],
      geoLocation: tracking.geoLocation ?? [],
      projectBased: tracking.projectBased ?? [],
      domain: tracking.domain ?? {},
    },

    // Advanced settings — normalize to arrays (API may return string or array)
    screenRecordWebsites: toArray(r.screen_record_when_website_visit),
    screenshotExcludeWebsites: toArray(r.screenshot_exclude_websites),
    screenshotExcludeApps: toArray(r.screenshot_exclude_application),
    disableAllWebsites: String(r.disable_access_all_websites ?? "0") === "1",
    loginFromOtherSystem: String(r.login_from_other_system ?? "0") === "1",
    userBlock: r.userBlock ?? 0,
    block: r.block ?? {},

    // Raw rules for fields not explicitly mapped
    _raw: r,
  };
};

/**
 * Build API payload from component state.
 */
export const buildSavePayload = ({ employeeId, state, trackingData }) => {
  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  const track_data = {
    system: {
      visibility: state.visibility ? "true" : "false",
      autoUpdate: state.autoUpdate ? "1" : "0",
    },
    features: {
      keystrokes: state.features.keyStrokes ? "1" : "0",
      web_usage: state.features.webUsed ? "1" : "0",
      application_usage: state.features.webUsed ? "1" : "0",
      screenshots: state.features.screenshots ? "1" : "0",
      screen_record: state.features.screenRecording ? "1" : "0",
      screencast: state.features.screenCasting ? "1" : "0",
      webCamCasting: state.features.webcamCast ? "1" : "0",
      block_websites: state.features.webUsed ? "1" : "0",
      realTimeTrack: state.features.realTimeTrack ? "1" : "0",
      file_upload_detection: state.features.fileUploadDetection ? "1" : "0",
      file_upload_blocking: state.features.fileUploadBlocking ? "1" : "0",
      print_detection: state.features.printDetection ? "1" : "0",
      print_blocking: state.features.printBlocking ? "1" : "0",
    },
    dlpFeatures: {
      bluetoothDetection: state.dlp.bluetoothDetection ? "1" : "0",
      bluetoothBlock: state.dlp.bluetoothBlocking ? "1" : "0",
      clipboardDetection: state.dlp.clipboardDetection ? "1" : "0",
      clipboardBlock: state.dlp.clipboardBlocking ? "1" : "0",
    },
    screenshot: {
      frequencyPerHour: state.ssFrequency,
      employeeAccessibility: "true",
      employeeCanDelete: "true",
    },
    screen_record: {
      is_enabled: state.features.screenRecording ? "1" : "0",
      video_quality: state.videoQuality,
      audio: state.features.screenRecordingWithVoice ? "1" : "0",
    },
    manual_clock_in: state.features.manualClockInOut ? "1" : "0",
    usbDisable: state.features.usbBlocking ? "1" : "0",
    is_attendance_override: state.features.attendanceOverride ? "1" : "0",
    systemLock: state.features.systemLock ? "1" : "0",
    isSilahMobileGeoLocation: state.features.geoLocationLogs ? "1" : "0",
    idleInMinute: state.idleInMinute,
    timesheetIdleTime: state.timesheetIdleTime,
    breakInMinute: state.breakInMinute,
    trackingMode: state.trackingMode,
    tracking: trackingData ?? state.tracking,
    work_hour_billing: {
      is_enabled: state.billingEnabled ? 1 : 0,
      billing_based_on: state.billingBasedOn || "office_hours",
      hours_per_day: parseInt(state.amountPerHour, 10) || 0,
      currency: state.currency || "USD",
      invoice_duration: state.invoiceDuration || "monthly",
    },
    ...(state.screenRecordWebsites?.length ? { screen_record_when_website_visit: toArray(state.screenRecordWebsites) } : {}),
    ...(state.screenshotExcludeWebsites?.length ? { screenshot_exclude_websites: toArray(state.screenshotExcludeWebsites) } : {}),
    ...(state.screenshotExcludeApps?.length ? { screenshot_exclude_application: toArray(state.screenshotExcludeApps) } : {}),
    disable_access_all_websites: state.disableAllWebsites ? "1" : "0",
    login_from_other_system: state.loginFromOtherSystem ? "1" : "0",
    userBlock: state.userBlock ?? 0,
    block: state.block ?? {},
  };

  const settingType = parseInt(state.settingType, 10) || 3;

  return {
    employee_id: employeeId,
    type: settingType,
    group_id: settingType === 2 ? (parseInt(state.groupId, 10) || 1) : 1,
    track_data,
  };
};
