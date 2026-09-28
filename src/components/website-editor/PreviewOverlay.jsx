import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageContext, useLanguage } from "@/lib/i18n/LanguageContext";
import { WebsiteContentProvider } from "@/components/website/WebsiteContentContext";
import WebsiteHero from "@/components/website/WebsiteHero";
import WhoWeHelp from "@/components/website/WhoWeHelp";
import TrustSection from "@/components/website/TrustSection";
import PricingSection from "@/components/website/PricingSection";
import HowItWorks from "@/components/website/HowItWorks";
import RoleAndLimits from "@/components/website/RoleAndLimits";
import ServiceArea from "@/components/website/ServiceArea";
import FaqSection from "@/components/website/FaqSection";
import LocalContact from "@/components/website/LocalContact";

// Full-page draft preview for the website editor. Renders the REAL public
// section components with the current (possibly unsaved) draft content and an
// independent EN/EL toggle — it never touches the live site: drafts are only
// ever visible here until an admin clicks Publish.
export default function PreviewOverlay({ open, drafts, onClose }) {
  const { lang } = useLanguage();
  const [previewLang, setPreviewLang] = useState(lang);
  if (!open) return null;
  return (
    <div className="website-theme fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
        <p className="text-sm font-semibold text-foreground">
          Preview — draft, not yet public
        </p>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant={previewLang === "en" ? "default" : "outline"} onClick={() => setPreviewLang("en")}>
            EN
          </Button>
          <Button size="sm" variant={previewLang === "el" ? "default" : "outline"} onClick={() => setPreviewLang("el")}>
            EL
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} aria-label="Close preview">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {/* Local language override: previewing Greek must not switch the whole
          admin interface, so we shadow the global context inside the overlay. */}
      <LanguageContext.Provider value={{ lang: previewLang, setLang: setPreviewLang, t: (s) => s, tEnum: (v) => v }}>
        <WebsiteContentProvider sections={drafts}>
          <WebsiteHero />
          <WhoWeHelp />
          <TrustSection />
          <PricingSection />
          <HowItWorks />
          <RoleAndLimits />
          <ServiceArea />
          <FaqSection />
          <LocalContact />
        </WebsiteContentProvider>
      </LanguageContext.Provider>
    </div>
  );
}