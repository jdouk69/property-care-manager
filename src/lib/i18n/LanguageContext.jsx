import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { EL } from "./translations";

// Central interface-language context. English is the default; Greek is a
// display-only layer — stored data and enum values are never modified.
export const LanguageContext = createContext({ lang: "en", setLang: () => {}, t: (s) => s, tEnum: (v) => v });

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

  // Keep <html lang> in sync with the active interface language (en / el).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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

  // tEnum(storedValue, context) — context-aware enum display. Greek adjectives
  // agree with the grammatical gender of what they describe, so the same stored
  // English value can have several Greek labels ("client:Active" → "Ενεργός"
  // but the global fallback stays "Ενεργό"). Falls back to t(value) — the
  // global enum map — when no context override exists. English always shows the
  // raw stored value. Display-only; nothing is written back to the database.
  const tEnum = useCallback((value, context) => {
    if (!value) return "";
    const keyed = context ? `${context}:${value}` : null;
    if (lang === "el" && keyed && EL[keyed]) return EL[keyed];
    return t(value);
  }, [lang, t]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tEnum }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}