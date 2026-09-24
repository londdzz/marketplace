import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import mk from './locales/mk.json';

/**
 * Launch is Macedonian and English.
 *
 * Albanian, Serbian and Bulgarian are translated and sit in
 * app/src/i18n/locales, and the sync copies all five across — but only the two
 * the site can show are imported. The app bundles all five because that costs
 * a phone nothing after the install; a website would be sending every first
 * visitor 80 kB of strings it will never draw. Shipping one is adding it here
 * and to the line below.
 */
export const SUPPORTED_LANGUAGES = ['mk', 'en'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORED = 'autevo.language';

function initial(): string {
  try {
    const saved = globalThis.localStorage?.getItem(STORED);

    if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
      return saved;
    }
  } catch {
    // Private browsing throws rather than returning nothing.
  }

  const browser = globalThis.navigator?.language?.slice(0, 2);

  return (SUPPORTED_LANGUAGES as readonly string[]).includes(browser ?? '') ? (browser as string) : 'mk';
}

void i18n.use(initReactI18next).init({
  resources: { mk, en },
  lng: initial(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLanguage(language: Language): void {
  void i18n.changeLanguage(language);
  document.documentElement.lang = language;

  try {
    globalThis.localStorage?.setItem(STORED, language);
  } catch {
    // The choice holds for this tab either way.
  }
}

document.documentElement.lang = i18n.language;

export default i18n;
