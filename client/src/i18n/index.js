import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

export const LANG_KEY = 'vt-lang';
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕ' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
];

// English ships in the main bundle; Kannada and Hindi are separate chunks loaded on demand.
const loaders = {
  kn: () => import('./locales/kn.json'),
  hi: () => import('./locales/hi.json'),
};

const readSaved = () => {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return LANGUAGES.some((l) => l.code === v) ? v : null;
  } catch {
    return null;
  }
};

export async function loadLanguage(lng) {
  if (lng !== 'en' && !i18n.hasResourceBundle(lng, 'translation')) {
    const mod = await loaders[lng]();
    i18n.addResourceBundle(lng, 'translation', mod.default || mod, true, true);
  }
  await i18n.changeLanguage(lng);
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
  try {
    localStorage.setItem(LANG_KEY, lng);
  } catch {
    /* ignore */
  }
}

/** Initialise before the first render, including the remembered language. */
export async function initI18n() {
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: { en: { translation: en } },
      lng: 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnNull: false,
      react: { useSuspense: false },
    });
  }
  const saved = readSaved();
  if (saved && saved !== 'en') await loadLanguage(saved);
  else if (typeof document !== 'undefined') document.documentElement.lang = 'en';
  return i18n;
}

/** Pick the best text from a localized object { en, kn?, hi? }. */
export const localize = (obj, lng) => (obj ? obj[lng] || obj.en || '' : '');

export default i18n;
