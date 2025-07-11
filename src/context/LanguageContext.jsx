import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Fillojmë me pak përkthime bazike
const translations = {
  sq: {
    // Navigation
    dashboard: "Dashboard",
    contracts: "Kontrata", 
    employees: "Punonjës",
    workHours: "Orët e Punës",
    payments: "Pagesat",
    tasks: "Detyrat",
    reports: "Raportet",
    myTasks: "Detyrat e Mia",
    logout: "Dil"
  },
  en: {
    // Navigation  
    dashboard: "Dashboard",
    contracts: "Contracts",
    employees: "Employees", 
    workHours: "Work Hours",
    payments: "Payments",
    tasks: "Tasks",
    reports: "Reports",
    myTasks: "My Tasks",
    logout: "Logout"
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('sq'); // Default Albanian

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  const value = {
    language,
    changeLanguage,
    t,
    isAlbanian: language === 'sq',
    isEnglish: language === 'en'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};