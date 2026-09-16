import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bg from './locales/bg.json';
import en from './locales/en.json';
import mk from './locales/mk.json';
import sq from './locales/sq.json';
import sr from './locales/sr.json';

export const SUPPORTED_LANGUAGES = ['sq', 'mk', 'sr', 'bg', 'en'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, string> = {
  sq: 'Shqip',
  mk: 'Македонски',
  sr: 'Српски',
  bg: 'Български',
  en: 'English',
};

/**
 * The device language when we ship in it, Albanian otherwise. Albanian is the
 * default because Kosovo and Albania are the first two markets.
 */
export function deviceLanguage(): Language {
  const tag = Localization.getLocales()[0]?.languageCode ?? 'sq';

  return (SUPPORTED_LANGUAGES as readonly string[]).includes(tag) ? (tag as Language) : 'sq';
}

void i18n.use(initReactI18next).init({
  resources: { sq: sq, mk: mk, sr: sr, bg: bg, en: en },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'tabs', 'auth', 'home', 'search', 'listing'],
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
