import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = ({ className = '' }) => {
  const { currentLanguage, toggleLanguage, isAlbanian, isEnglish } = useLanguage();
  const { t } = useTranslation();

  console.log('🔤 LanguageSwitcher render:', { currentLanguage, isAlbanian, isEnglish });

  const handleClick = () => {
    console.log('🔤 LanguageSwitcher clicked! Current language:', currentLanguage);
    toggleLanguage();
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
        isAlbanian
          ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
          : 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
      } ${className}`}
      title={isAlbanian ? 'Switch to English' : 'Ndrysho në shqip'}
    >
      <span className="flag-emoji font-bold">
        {isAlbanian ? '🇦🇱' : '🇬🇧'}
      </span>
      <span className="font-medium text-sm">
        {isAlbanian ? 'SQ' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;