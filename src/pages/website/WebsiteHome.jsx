import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import WebsiteHeader from "@/components/website/WebsiteHeader";
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
import AssessmentForm from "@/components/website/AssessmentForm";
import WebsiteFooter from "@/components/website/WebsiteFooter";
import LocalBusinessJsonLd from "@/components/website/LocalBusinessJsonLd";
import HashScrollManager from "@/components/website/HashScrollManager";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import usePageMeta from "@/lib/seo";

// Public Property Care Crete homepage — ONE scrolling page with all sections,
// including the live Services & Pricing (fetched server-side; no fallbacks).
export default function WebsiteHome() {
  const { lang } = useLanguage();
  const el = lang === "el";
  // PUBLISHED website content (from the admin website editor). Null (feed
  // failure or nothing published yet) falls back to the built-in default
  // copy — the page never goes blank. Drafts are never returned.
  const [sections, setSections] = useState(null);
  usePageMeta({
    title: "Property Care & Home Watch in Chania | Property Care Crete",
    description:
      "Property care and home watch in Chania, Crete. Scheduled visits, photos and reports, arrival preparation and local support for owners who are away.",
  });

  useEffect(() => {
    let active = true;
    base44.functions
      .invoke("websiteContentPublic", {})
      .then((res) => {
        if (active && res?.data && typeof res.data.sections === "object") {
          setSections(res.data.sections);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <WebsiteContentProvider sections={sections}>
    <div className="website-theme min-h-screen bg-background">
      <LocalBusinessJsonLd />
      <HashScrollManager />
      <WebsiteHeader />
      <main>
        <WebsiteHero />
        <WhoWeHelp />
        <TrustSection />
        <PricingSection />
        <HowItWorks />
        <RoleAndLimits />
        <ServiceArea />
        <FaqSection />
        <LocalContact />
        <section id="assessment" className="scroll-mt-20 py-10 sm:py-20">
          <div className="mx-auto max-w-3xl px-4">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {el ? "Αίτημα" : "Get started"}
              </p>
              <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
                {el ? "Ζητήστε Αξιολόγηση Ακινήτου" : "Request a Property Assessment"}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground leading-relaxed">
                {el
                  ? "Πείτε μας λίγα λόγια για το ακίνητό σας και θα επικοινωνήσουμε για να κανονίσουμε αξιολόγηση και εξατομικευμένη προσφορά."
                  : "Tell us a little about your property and we will get in touch to arrange an assessment and a personal quote."}
              </p>
            </div>
            <AssessmentForm />
          </div>
        </section>
      </main>
      <WebsiteFooter />
    </div>
    </WebsiteContentProvider>
  );
}