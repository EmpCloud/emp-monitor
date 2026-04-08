import { create } from "zustand";
import { applyLanguage } from "@/i18n/syncLanguage";
import {
    getLocalization,
    saveLocalization,
    exportToExcel,
    exportToCSV,
    exportToPDF,
} from "./service";

export const useLocalizationStore = create((set, get) => ({
    // ── Data ────────────────────────────────────────────────────────────────
    timezone: "",
    language: "",

    // ── UI State ────────────────────────────────────────────────────────────
    loading: false,
    saving: false,
    error: null,
    successMsg: null,

    // ── Setters ─────────────────────────────────────────────────────────────
    setTimezone: (value) => set({ timezone: value }),
    setLanguage: (value) => set({ language: value }),
    clearError: () => set({ error: null }),
    clearSuccess: () => set({ successMsg: null }),

    // ── Actions ─────────────────────────────────────────────────────────────

    loadSettings: async () => {
        try {
            set({ loading: true, error: null });
            const result = await getLocalization();

            if (result.success) {
                const lang = result.data.language || "en";
                applyLanguage(lang);
                set({
                    loading: false,
                    timezone: result.data.timezone,
                    language: lang,
                });
            } else {
                set({ loading: false, error: result.message });
            }
        } catch (error) {
            console.error("Load localization settings error:", error);
            set({ loading: false, error: "Failed to load localization settings" });
        }
    },

    saveSettings: async () => {
        const { timezone, language } = get();
        try {
            set({ saving: true, error: null });
            const result = await saveLocalization({ timezone, language });
            set({ saving: false });

            if (result.success) {
                applyLanguage(language);
                set({ successMsg: result.message });
            } else {
                set({ error: result.message });
            }
            return result;
        } catch (error) {
            console.error("Save localization settings error:", error);
            set({ saving: false, error: "Failed to save localization settings" });
            return { success: false, message: "Failed to save localization settings" };
        }
    },

    // ── Export ───────────────────────────────────────────────────────────────

    exportExcel: () => {
        const { timezone, language } = get();
        return exportToExcel({ timezone, language });
    },
    exportCsv: () => {
        const { timezone, language } = get();
        return exportToCSV({ timezone, language });
    },
    exportPdf: () => {
        const { timezone, language } = get();
        return exportToPDF({ timezone, language });
    },
}));
