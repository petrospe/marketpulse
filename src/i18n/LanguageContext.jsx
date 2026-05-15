import { useCallback, useEffect, useMemo, useState } from 'react';
import { LanguageContext } from './language-context.js';
import { translations, tradingViewLocales } from './translations.js';

const STORAGE_KEY = 'marketpulse_lang';

function readStoredLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'el') {
    return stored;
  }
  return navigator.language.startsWith('el') ? 'el' : 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage);

  const setLanguage = useCallback((lang) => {
    if (lang !== 'en' && lang !== 'el') {
      return;
    }
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
      tradingViewLocale: tradingViewLocales[language],
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
