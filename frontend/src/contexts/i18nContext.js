import React, { createContext, useContext, useState } from 'react';
import { translations } from '@/i18n/translations';

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => localStorage.getItem('rs_locale') || 'TR');

  const t = (key, replacements = {}) => {
    const dict = translations[locale] || translations.TR;
    let text = dict[key] || translations.TR[key] || key;
    Object.entries(replacements).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
    return text;
  };

  const toggleLocale = () => {
    const next = locale === 'TR' ? 'EN' : 'TR';
    setLocale(next);
    localStorage.setItem('rs_locale', next);
  };

  return (
    <I18nContext.Provider value={{ locale, t, toggleLocale }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};

export default I18nContext;
