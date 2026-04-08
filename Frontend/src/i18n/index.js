import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";

const LANG_LOADERS = {
  es: () => import("./es.json"),
  fr: () => import("./fr.json"),
  ar: () => import("./ar.json"),
  idn: () => import("./idn.json"),
  pt: () => import("./pt.json"),
};

const savedLanguage = localStorage.getItem("appLanguage") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  keySeparator: false,
  interpolation: {
    escapeValue: false,
  },
});

// Lazy-load non-English language on startup
if (savedLanguage !== "en" && LANG_LOADERS[savedLanguage]) {
  LANG_LOADERS[savedLanguage]().then((mod) => {
    i18n.addResourceBundle(savedLanguage, "translation", mod.default, true, true);
    i18n.changeLanguage(savedLanguage);
  });
}

/**
 * Load a language bundle on demand. Called by applyLanguage().
 */
export async function loadLanguageBundle(lang) {
  if (lang === "en" || i18n.hasResourceBundle(lang, "translation")) return;
  const loader = LANG_LOADERS[lang];
  if (!loader) return;
  const mod = await loader();
  i18n.addResourceBundle(lang, "translation", mod.default, true, true);
}

export default i18n;
