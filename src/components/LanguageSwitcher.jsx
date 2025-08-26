import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = ({ className = '' }) => {
  const { currentLanguage, toggleLanguage, isAlbanian, isEnglish } = useLanguage();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
        isAlbanian
          ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
          : 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
      } ${className}`}
      title={isAlbanian ? 'Switch to English' : 'Ndrysho në shqip'}
    >
      <span className="text-lg">
        {isAlbanian ? '🇦🇱' : '🇬🇧'}
      </span>
      <span className="font-medium text-sm">
        {isAlbanian ? 'SQ' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;