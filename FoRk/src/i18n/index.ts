import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './zh.json';
import en from './en.json';

const STORAGE_KEY = 'loudnessvis-lang';

function readStoredLang(): 'zh' | 'en' {
  if (typeof window === 'undefined') return 'zh';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'en' ? 'en' : 'zh';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    lng: readStoredLang(),
    fallbackLng: 'zh',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

/** 切换语言并持久化到 localStorage。 */
export function setLanguage(lang: 'zh' | 'en'): void {
  i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }
}

export function getLanguage(): 'zh' | 'en' {
  return (i18n.language === 'en' ? 'en' : 'zh');
}

export default i18n;
