import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bg from './locales/bg.json';
import en from './locales/en.json';
import mk from './locales/mk.json';
import sq from './locales/sq.json';
import sr from './locales/sr.json';

/**
 * The languages the app ships in.
 *
 * Launch is North Macedonia, so it ships in Macedonian and English. The other
 * three are translated and still in the repository, ready for the markets they
 * belong to: adding one here is all it takes to ship it, and the API's
 * `supported_locales` has to agree.
 */
export const SUPPORTED_LANGUAGES = ['mk', 'en'] as const;

/** Translated and waiting for their market to open. */
export const PLANNED_LANGUAGES = ['sq', 'sr', 'bg'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<string, string> = {
  mk: 'Македонски',
  en: 'English',
  sq: 'Shqip',
  sr: 'Српски',
  bg: 'Български',
};

/**
 * The device language when we ship in it, Macedonian otherwise, because that
 * is the market we are open in.
 */
export function deviceLanguage(): Language {
  const tag = Localization.getLocales()[0]?.languageCode ?? 'mk';

  return (SUPPORTED_LANGUAGES as readonly string[]).includes(tag) ? (tag as Language) : 'mk';
}

void i18n.use(initReactI18next).init({
  // Every translation is bundled, including the ones for markets that are not
  // open. Nothing renders them until a language joins SUPPORTED_LANGUAGES.
  resources: { sq: sq, mk: mk, sr: sr, bg: bg, en: en },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'tabs', 'auth', 'home', 'search', 'listing', 'sell', 'messages', 'profile'],
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
