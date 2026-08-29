import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LANGUAGES, TRANSLATIONS } from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [currentLang, setCurrentLang] = useState(() => {
    try {
      return localStorage.getItem('tb_lang') || 'en';
    } catch (e) {
      return 'en';
    }
  });

  const [langModalOpen, setLangModalOpen] = useState(false);

  const changeLanguage = useCallback((code) => {
    setCurrentLang(code);
    try {
      localStorage.setItem('tb_lang', code);
    } catch (e) {}
    setLangModalOpen(false);
  }, []);

  const t = useCallback(
    (key, fallback = '') => {
      const langDict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
      return langDict[key] || TRANSLATIONS.en[key] || fallback || key;
    },
    [currentLang]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        languages: LANGUAGES,
        changeLanguage,
        t,
        langModalOpen,
        setLangModalOpen,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
