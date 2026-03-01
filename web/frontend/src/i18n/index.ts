import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';

const STORAGE_KEY = 'pmspec-language-v2';
const SUPPORTED_LANGUAGES = ['zh', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function normalizeLanguage(value: string | null): SupportedLanguage | null {
  if (!value) {
    return null;
  }

  const short = value.toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(short as SupportedLanguage) ? (short as SupportedLanguage) : null;
}

const savedLanguage =
  typeof window !== 'undefined'
    ? normalizeLanguage(localStorage.getItem(STORAGE_KEY))
    : null;
const initialLanguage: SupportedLanguage = savedLanguage ?? 'zh';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    lng: initialLanguage,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
  });

export const changeLanguage = (lang: string) => {
  const nextLanguage = normalizeLanguage(lang) ?? 'zh';
  localStorage.setItem(STORAGE_KEY, nextLanguage);
  i18n.changeLanguage(nextLanguage);
};

export default i18n;
