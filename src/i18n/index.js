import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import sq from './locales/sq.json';
import en from './locales/en.json';

const resources = {
  sq: {
    translation: sq
  },
  en: {
    translation: en
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'sq', // default language
    fallbackLng: 'sq',
    interpolation: {
      escapeValue: false
    },
    debug: process.env.NODE_ENV === 'development'
  });

export default i18n;