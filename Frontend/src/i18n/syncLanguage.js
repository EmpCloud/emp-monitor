import i18n, { loadLanguageBundle } from "@/i18n";
import apiService from "@/services/api.service";

/**
 * Apply a language to i18n, localStorage, and document direction.
 * Lazy-loads the language bundle if not already loaded.
 */
export async function applyLanguage(lang) {
  if (!lang) return;
  await loadLanguageBundle(lang);
  i18n.changeLanguage(lang);
  localStorage.setItem("appLanguage", lang);
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}

/**
 * Fetch the organization's saved language from the API and apply it.
 * Called on session hydration (page refresh) and after login.
 */
export async function syncLanguageFromSession() {
  try {
    const { data } = await apiService.apiInstance.get(
      "/organization/organization-details"
    );
    if (data?.code === 200 && data.data?.language) {
      applyLanguage(data.data.language);
    }
  } catch {
    // Silently fall back to whatever is already in localStorage / i18n default
  }
}
