import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';

const LanguageTest = () => {
  const { currentLanguage, toggleLanguage, isAlbanian, isEnglish } = useLanguage();
  const { t, i18n } = useTranslation();

  console.log('🧪 LanguageTest render:', { 
    currentLanguage, 
    isAlbanian, 
    isEnglish,
    i18nLanguage: i18n.language,
    i18nInitialized: i18n.isInitialized
  });

  return (
    <div className="fixed top-20 right-4 bg-white p-4 rounded-lg shadow-lg border z-50">
      <h3 className="font-bold mb-2">🧪 Language Debug</h3>
      <div className="text-sm space-y-1">
        <div>Context Language: {currentLanguage}</div>
        <div>i18n Language: {i18n.language}</div>
        <div>i18n Initialized: {i18n.isInitialized ? 'Yes' : 'No'}</div>
        <div>Is Albanian: {isAlbanian ? 'Yes' : 'No'}</div>
        <div>Is English: {isEnglish ? 'Yes' : 'No'}</div>
        <div>localStorage: {localStorage.getItem('language')}</div>
      </div>
      <button 
        onClick={toggleLanguage}
        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
      >
        Toggle Language
      </button>
    </div>
  );
};

export default LanguageTest;