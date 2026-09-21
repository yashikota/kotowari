import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ja from './locales/ja.json';
import { APP_LOCALES, defaultLocale, resolveLocale, type AppLocale } from './locale.ts';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
  },
  lng: defaultLocale(),
  fallbackLng: 'en',
  supportedLngs: [...APP_LOCALES],
  interpolation: { escapeValue: false },
});

export function applyLocale(locale: string | undefined | null): AppLocale {
  const resolved = resolveLocale(locale);
  void i18n.changeLanguage(resolved);
  document.documentElement.lang = resolved;
  return resolved;
}

export default i18n;
