import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Get language from localStorage or default to Albanian
    return localStorage.getItem('language') || 'sq';
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Ensure i18n is ready before setting language
    if (i18n.isInitialized) {
      i18n.changeLanguage(currentLanguage);
      localStorage.setItem('language', currentLanguage);
      setIsInitialized(true);
    } else {
      // Wait for i18n to be ready
      const handleInitialized = () => {
        i18n.changeLanguage(currentLanguage);
        localStorage.setItem('language', currentLanguage);
        setIsInitialized(true);
      };
      
      if (i18n.isInitialized) {
        handleInitialized();
      } else {
        i18n.on('initialized', handleInitialized);
        return () => i18n.off('initialized', handleInitialized);
      }
    }
  }, [currentLanguage, i18n]);

  const changeLanguage = (language) => {
    setCurrentLanguage(language);
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'sq' ? 'en' : 'sq';
    changeLanguage(newLang);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    toggleLanguage,
    isAlbanian: currentLanguage === 'sq',
    isEnglish: currentLanguage === 'en'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};