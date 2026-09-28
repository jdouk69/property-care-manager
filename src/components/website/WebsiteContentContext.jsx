import React, { createContext, useContext } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { sectionContent } from "@/lib/website/contentModel";

// Carries the PUBLISHED section content for the public homepage (fetched from
// the websiteContentPublic function), or DRAFT content for the admin editor's
// preview. A null value (no provider / feed failure) makes every section fall
// back to the built-in default copy — the page never goes blank.
const WebsiteContentContext = createContext(null);

export function WebsiteContentProvider({ sections, children }) {
  return (
    <WebsiteContentContext.Provider value={sections}>
      {children}
    </WebsiteContentContext.Provider>
  );
}

export function useWebsiteSections() {
  return useContext(WebsiteContentContext);
}

// Language-resolved content object for one section (falls back to defaults).
export function useSectionContent(key) {
  const sections = useContext(WebsiteContentContext);
  const { lang } = useLanguage();
  return sectionContent(sections, key, lang);
}