import apiService from "@/services/api.service";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Timezone Data (from legacy final-timezone.js) ──────────────────────────

export const TIMEZONES = [
    { zone: "Atlantic/Canary", name: "(UTC +00:00) Canary, Atlantic", offset: 3600 },
    { zone: "Antarctica/Troll", name: "(UTC +00:00) Troll, Antarctica", offset: 7200 },
    { zone: "Europe/London", name: "(UTC +00:00) London, Europe", offset: 3600 },
    { zone: "America/Danmarkshavn", name: "(UTC +00:00) Danmarkshavn, America", offset: 0 },
    { zone: "Africa/Abidjan", name: "(UTC +00:00) Abidjan, Africa", offset: 0 },
    { zone: "Atlantic/Cape_Verde", name: "(UTC -01:00) CapeVerde, Atlantic", offset: -3600 },
    { zone: "Atlantic/Azores", name: "(UTC -01:00) Azores, Atlantic", offset: 0 },
    { zone: "Africa/Algiers", name: "(UTC +01:00) Algiers, Africa", offset: 3600 },
    { zone: "Arctic/Longyearbyen", name: "(UTC +01:00) Longyearbyen, Arctic", offset: 7200 },
    { zone: "Europe/Amsterdam", name: "(UTC +01:00) Amsterdam, Europe", offset: 7200 },
    { zone: "Atlantic/South_Georgia", name: "(UTC -02:00) SouthGeorgia, Atlantic", offset: -7200 },
    { zone: "Africa/Cairo", name: "(UTC +02:00) Cairo, Africa", offset: 7200 },
    { zone: "Africa/Johannesburg", name: "(UTC +02:00) Johannesburg, Africa", offset: 120 },
    { zone: "America/Godthab", name: "(UTC -03:00) Godthab, America", offset: -7200 },
    { zone: "America/Argentina/cordoba", name: "(UTC -03:00) Argentina, America", offset: -10800 },
    { zone: "Antarctica/Palmer", name: "(UTC -03:00) Palmer, Antarctica", offset: -10800 },
    { zone: "Africa/Nairobi", name: "(UTC +03:00) Nairobi, Africa", offset: 10800 },
    { zone: "Antarctica/Syowa", name: "(UTC +03:00) Syowa, Antarctica", offset: 10800 },
    { zone: "Asia/Kuwait", name: "(UTC +03:00) Kuwait, Asia", offset: 10800 },
    { zone: "Europe/Istanbul", name: "(UTC +03:00) Istanbul, Europe", offset: 10800 },
    { zone: "Indian/Antananarivo", name: "(UTC +03:00) Antananarivo, Indian", offset: 10800 },
    { zone: "America/St_Johns", name: "(UTC -03:30) StJohns, America", offset: -9000 },
    { zone: "America/Caracas", name: "(UTC -04:00) Caracas, America", offset: -14400 },
    { zone: "Atlantic/Bermuda", name: "(UTC -04:00) Bermuda, Atlantic", offset: -10800 },
    { zone: "Asia/Dubai", name: "(UTC +04:00) Dubai, Asia", offset: 14400 },
    { zone: "Europe/Samara", name: "(UTC +04:00) Samara, Europe", offset: 14400 },
    { zone: "America/Asuncion", name: "(UTC -04:00) Asuncion, America", offset: -14400 },
    { zone: "Indian/Mauritius", name: "(UTC +04:00) Mauritius, Indian", offset: 14400 },
    { zone: "Asia/Kabul", name: "(UTC +04:30) Kabul, Asia", offset: 16200 },
    { zone: "Antarctica/Mawson", name: "(UTC +05:00) Mawson, Antarctica", offset: 18000 },
    { zone: "America/Toronto", name: "(UTC -05:00) Toronto, America", offset: -14400 },
    { zone: "America/Bogota", name: "(UTC -05:00) Colombia, America", offset: -18000 },
    { zone: "America/Lima", name: "(UTC -05:00) Lima, Peru", offset: -18000 },
    { zone: "America/Rio_Branco", name: "(UTC -05:00) Rio Branco, America", offset: -18000 },
    { zone: "America/Santiago", name: "(UTC -05:00) Santiago, Chile", offset: -18000 },
    { zone: "US/Eastern", name: "(UTC -05:00) Eastern Time (US & Canada)", offset: -18000 },
    { zone: "Asia/Karachi", name: "(UTC +05:00) Karachi, Asia", offset: 18000 },
    { zone: "Indian/Maldives", name: "(UTC +05:00) Maldives, Indian", offset: 18000 },
    { zone: "Asia/Kolkata", name: "(UTC +05:30) Kolkata, Asia", offset: 19800 },
    { zone: "Asia/Kathmandu", name: "(UTC +05:45) Kathmandu, Asia", offset: 20700 },
    { zone: "America/Chicago", name: "(UTC -06:00) Chicago, America", offset: -18000 },
    { zone: "Antarctica/Vostok", name: "(UTC +06:00) Vostok, Antarctica", offset: 21600 },
    { zone: "Asia/Dhaka", name: "(UTC +06:00) Dhaka, Asia", offset: 21600 },
    { zone: "Indian/Chagos", name: "(UTC +06:00) Chagos, Indian", offset: 21600 },
    { zone: "America/Costa_Rica", name: "(UTC -06:00) CostaRica, America", offset: -21600 },
    { zone: "Pacific/Easter", name: "(UTC -06:00) Easter, Pacific", offset: -21600 },
    { zone: "Asia/Yangon", name: "(UTC +06:30) Yangon, Asia", offset: 23400 },
    { zone: "Indian/Cocos", name: "(UTC +06:30) Cocos, Indian", offset: 23400 },
    { zone: "Antarctica/Davis", name: "(UTC +07:00) Davis, Antarctica", offset: 25200 },
    { zone: "America/Phoenix", name: "(UTC -07:00) Phoenix, America", offset: -25200 },
    { zone: "America/Los_Angeles", name: "(UTC -07:00) Los Angeles, America", offset: -25200 },
    { zone: "Asia/Bangkok", name: "(UTC +07:00) Bangkok, Asia", offset: 25200 },
    { zone: "Asia/Jakarta", name: "(UTC +07:00) Western Indonesia, Asia", offset: 25200 },
    { zone: "Indian/Christmas", name: "(UTC +07:00) Christmas, Indian", offset: 25200 },
    { zone: "Antarctica/Casey", name: "(UTC +08:00) Casey, Antarctica", offset: 28800 },
    { zone: "Asia/Singapore", name: "(UTC +08:00) Singapore, Asia", offset: 28800 },
    { zone: "Australia/Perth", name: "(UTC +08:00) Perth, Australia", offset: 28800 },
    { zone: "Asia/Makassar", name: "(UTC +08:00) Central Indonesia, Asia", offset: 28800 },
    { zone: "Pacific/Pitcairn", name: "(UTC -08:00) Pitcairn, Pacific", offset: -28800 },
    { zone: "Canada/Pacific", name: "(UTC -08:00) Canada, Pacific", offset: -28800 },
    { zone: "Australia/Eucla", name: "(UTC +08:45) Eucla, Australia", offset: 31500 },
    { zone: "Asia/Tokyo", name: "(UTC +09:00) Tokyo, Asia", offset: 32400 },
    { zone: "Asia/Jayapura", name: "(UTC +09:00) Eastern Indonesia, Asia", offset: 32400 },
    { zone: "America/Anchorage", name: "(UTC -09:00) Anchorage, America", offset: -28800 },
    { zone: "Pacific/Gambier", name: "(UTC -09:00) Gambier, Pacific", offset: -32400 },
    { zone: "Pacific/Palau", name: "(UTC +09:00) Palau, Pacific", offset: 32400 },
    { zone: "Australia/Darwin", name: "(UTC +09:30) Darwin, Australia", offset: 34200 },
    { zone: "Pacific/Marquesas", name: "(UTC -09:30) Marquesas, Pacific", offset: -34200 },
    { zone: "Antarctica/DumontDUrville", name: "(UTC +10:00) DumontDUrville, Antarctica", offset: 36000 },
    { zone: "America/Adak", name: "(UTC -10:00) Adak, America", offset: -32400 },
    { zone: "Asia/Vladivostok", name: "(UTC +10:00) Vladivostok, Asia", offset: 36000 },
    { zone: "Australia/Sydney", name: "(UTC +10:00) Sydney, Australia", offset: 36000 },
    { zone: "Australia/Brisbane", name: "(UTC +10:00) Brisbane, Australia", offset: 36000 },
    { zone: "Pacific/Guam", name: "(UTC +10:00) Guam, Pacific", offset: 36000 },
    { zone: "Pacific/Honolulu", name: "(UTC -10:00) Honolulu, Pacific", offset: -36000 },
    { zone: "Australia/Lord_Howe", name: "(UTC +10:30) LordHowe, Australia", offset: 37800 },
    { zone: "Antarctica/Macquarie", name: "(UTC +11:00) Macquarie, Antarctica", offset: 39600 },
    { zone: "Pacific/Midway", name: "(UTC -11:00) Midway, Pacific", offset: -39600 },
    { zone: "Asia/Sakhalin", name: "(UTC +11:00) Sakhalin, Asia", offset: 39600 },
    { zone: "Pacific/Pohnpei", name: "(UTC +11:00) Pohnpei, Pacific", offset: 39600 },
    { zone: "Antarctica/McMurdo", name: "(UTC +12:00) McMurdo, Antarctica", offset: 43200 },
    { zone: "Asia/Kamchatka", name: "(UTC +12:00) Kamchatka, Asia", offset: 43200 },
    { zone: "Pacific/Fiji", name: "(UTC +12:00) Fiji, Pacific", offset: 43200 },
    { zone: "Pacific/Chatham", name: "(UTC +12:45) Chatham, Pacific", offset: 45900 },
    { zone: "Pacific/Tongatapu", name: "(UTC +13:00) Tongatapu, Pacific", offset: 46800 },
    { zone: "Pacific/Kiritimati", name: "(UTC +14:00) Kiritimati, Pacific", offset: 50400 },
];

// ─── Language Data (from legacy blade template) ─────────────────────────────

export const LANGUAGES = [
    { label: "English", value: "en" },
    { label: "Español", value: "es" },
    { label: "Indonesia", value: "idn" },
    { label: "Français", value: "fr" },
    { label: "العربية", value: "ar" },
    { label: "Português", value: "pt" },
];

// ─── API: Get Localization Settings ─────────────────────────────────────────

export const getLocalization = async () => {
    try {
        const { data } = await apiService.apiInstance.get("/organization/organization-details");
        if (data?.code === 200) {
            return {
                success: true,
                data: {
                    language: data.data?.language || "",
                    timezone: data.data?.timezone || "",
                },
            };
        }
        return { success: false, message: data?.message || "Failed to fetch localization settings" };
    } catch (error) {
        console.error("Localization: Fetch settings error:", error);
        return { success: false, message: "Failed to fetch localization settings" };
    }
};

// ─── API: Save Localization Settings ────────────────────────────────────────

export const saveLocalization = async ({ timezone, language }) => {
    if (!language) return { success: false, message: "Please select a language" };
    if (!timezone) return { success: false, message: "Please select a timezone" };

    try {
        const { data } = await apiService.apiInstance.put("/organization/update-org-details", {
            timezone,
            language,
        });

        if (data?.code === 200) {
            return { success: true, message: "Localization settings saved successfully" };
        }
        return { success: false, message: data?.message || "Failed to save localization settings" };
    } catch (error) {
        console.error("Localization: Save settings error:", error);
        const errData = error.response?.data;
        return { success: false, message: errData?.message || "Failed to save localization settings" };
    }
};

// ─── Helpers: Build select items from timezone data ─────────────────────────

export const getTimezoneSelectItems = () =>
    TIMEZONES.map((tz) => ({
        label: tz.name,
        value: tz.zone,
    }));

export const getLanguageSelectItems = () =>
    LANGUAGES.map((lang) => ({
        label: lang.label,
        value: lang.value,
    }));

// ─── Helpers: Lookup display names ──────────────────────────────────────────

export const getTimezoneDisplayName = (zone) => {
    const tz = TIMEZONES.find((t) => t.zone === zone);
    return tz ? tz.name : zone || "--";
};

export const getLanguageDisplayName = (value) => {
    const lang = LANGUAGES.find((l) => l.value === value);
    return lang ? lang.label : value || "--";
};

// ─── Export Helpers ──────────────────────────────────────────────────────────

const buildExportRows = (settings) => {
    return [
        {
            Setting: "Timezone",
            Value: getTimezoneDisplayName(settings.timezone),
            Code: settings.timezone || "--",
        },
        {
            Setting: "Language",
            Value: getLanguageDisplayName(settings.language),
            Code: settings.language || "--",
        },
    ];
};

// ─── Export: Excel ───────────────────────────────────────────────────────────

export const exportToExcel = async (settings) => {
    try {
        const rows = buildExportRows(settings);
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Localization");
        XLSX.writeFile(wb, "Localization_Settings.xlsx");
        return { success: true };
    } catch (error) {
        console.error("Export Excel Error:", error);
        return { success: false };
    }
};

// ─── Export: CSV ─────────────────────────────────────────────────────────────

export const exportToCSV = async (settings) => {
    try {
        const rows = buildExportRows(settings);
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Localization");
        XLSX.writeFile(wb, "Localization_Settings.csv", { bookType: "csv" });
        return { success: true };
    } catch (error) {
        console.error("Export CSV Error:", error);
        return { success: false };
    }
};

// ─── Export: PDF ─────────────────────────────────────────────────────────────

export const exportToPDF = async (settings) => {
    try {
        const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

        doc.setFontSize(14);
        doc.text("Localization Settings", 40, 30);

        const headers = ["#", "Setting", "Value", "Code"];
        const body = buildExportRows(settings).map((row, idx) => [
            idx + 1,
            row.Setting,
            row.Value,
            row.Code,
        ]);

        autoTable(doc, {
            head: [headers],
            body,
            startY: 50,
            styles: { fontSize: 9, cellPadding: 6 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 40, right: 40 },
        });

        doc.save("Localization_Settings.pdf");
        return { success: true };
    } catch (error) {
        console.error("Export PDF Error:", error);
        return { success: false };
    }
};
