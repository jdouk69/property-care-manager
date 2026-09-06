import React, { createContext, useContext, useState, useCallback } from "react";
import { EL } from "./translations";

// Central interface-language context. English is the default; Greek is a
// display-only layer — stored data and enum values are never modified.
const LanguageContext = createContext({ lang: "en", setLang: () => {}, t: (s) => s });

const STORAGE_KEY = "pcm-interface-language";

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "el" ? "el" : "en";
    } catch (e) {
      return "en";
    }
  });

  const setLang = useCallback((next) => {
    setLangState(next === "el" ? "el" : "en");
    try {
      localStorage.setItem(STORAGE_KEY, next === "el" ? "el" : "en");
    } catch (e) {}
  }, []);

  // t(englishText, vars) — returns the Greek display string when Greek is
  // active and a translation exists; otherwise returns the English source
  // unchanged. Optional {placeholders} in the pattern are substituted from vars.
  const t = useCallback((key, vars) => {
    let s = (lang === "el" && EL[key]) || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.split(`{${k}}`).join(String(vars[k]));
      });
    }
    return s;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}