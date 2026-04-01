import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '@/i18n/translations';

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    try { return localStorage.getItem('rs_locale') || 'TR'; }
    catch { return 'TR'; }
  });

  useEffect(() => {
    // Update html lang attribute for accessibility + SEO
    document.documentElement.lang = locale === 'TR' ? 'tr' : 'en';
    // Update page title based on locale
    if (locale === 'EN') {
      document.title = 'ReverSound - Music Career Ecosystem';
    } else {
      document.title = 'ReverSound - Müzik Kariyer Ekosistemi';
    }
  }, [locale]);

  const t = (key, replacements = {}) => {
    const dict = (locale === 'TR' ? translations.TR : translations.EN) || translations.TR;
    let text = dict?.[key];
    // Fallback: if not in target locale, try other locale, then key itself
    if (!text) text = translations.TR?.[key] || key;
    if (replacements && Object.keys(replacements).length > 0) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const toggleLocale = () => {
    const next = locale === 'TR' ? 'EN' : 'TR';
    setLocale(next);
    try { localStorage.setItem('rs_locale', next); } catch {}
  };

  const setLocaleByCode = (code) => {
    const normalized = code.toUpperCase();
    if (normalized === 'TR' || normalized === 'EN') {
      setLocale(normalized);
      try { localStorage.setItem('rs_locale', normalized); } catch {}
    }
  };

  return (
    <I18nContext.Provider value={{ locale, t, toggleLocale, setLocaleByCode }}>
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
