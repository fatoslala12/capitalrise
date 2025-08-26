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
    lng: localStorage.getItem('language') || 'sq', // Get from localStorage or default to Albanian
    fallbackLng: 'sq',
    interpolation: {
      escapeValue: false
    },
    debug: true // Always enable debug for now
  }).then(() => {
    console.log('🌐 i18n initialized with language:', i18n.language);
    console.log('🌐 Available languages:', Object.keys(resources));
    console.log('🌐 Current language from localStorage:', localStorage.getItem('language'));
  });

export default i18n;