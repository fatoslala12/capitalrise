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
    return localStorage.getItem('language') || 'en';
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

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

  // Additional effect to handle language changes from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && savedLanguage !== currentLanguage) {
      console.log('🔄 Found saved language in localStorage:', savedLanguage);
      setCurrentLanguage(savedLanguage);
      i18n.changeLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (language) => {
    console.log('🔤 Changing language to:', language);
    setCurrentLanguage(language);
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
    // Force a re-render of all components
    setForceUpdate(prev => prev + 1);
    console.log('🔤 Language changed, current:', currentLanguage);
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'sq' ? 'en' : 'sq';
    console.log('🔄 Toggling language from', currentLanguage, 'to', newLang);
    changeLanguage(newLang);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    toggleLanguage,
    isAlbanian: currentLanguage === 'sq',
    isEnglish: currentLanguage === 'en',
    forceUpdate
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};