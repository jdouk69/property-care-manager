import React from "react";
import { Button } from "@/components/ui/button";
import WebsiteHashLink from "@/components/website/WebsiteHashLink";
import WebsiteHeader from "@/components/website/WebsiteHeader";
import WebsiteFooter from "@/components/website/WebsiteFooter";
import LocalContact from "@/components/website/LocalContact";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import usePageMeta from "@/lib/seo";

// Public Contact page — h1 plus the owner's real contact methods (from
// business settings, with bilingual placeholders) and a link to the
// assessment form on the homepage.
export default function WebsiteContact() {
  const { lang } = useLanguage();
  const el = lang === "el";
  usePageMeta({
    title: "Contact | Property Care Crete",
    description:
      "Contact Property Care Crete to discuss home watch, scheduled property visits and arrival preparation in Chania and Western Crete.",
  });

  return (
    <div className="website-theme min-h-screen bg-background">
      <WebsiteHeader />
      <main className="py-12 sm:py-20">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {el ? "Επικοινωνία" : "Get in touch"}
          </p>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold text-foreground">
            {el ? "Επικοινωνήστε μαζί μας" : "Contact Us"}
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
            {el
              ? "Ο πιο γρήγορος τρόπος να μας βρείτε είναι τα στοιχεία επικοινωνίας παρακάτω — μιλάμε με χαρά στα ελληνικά ή στα αγγλικά. Αν προτιμάτε, συμπληρώστε τη φόρμα αξιολόγησης και θα επικοινωνήσουμε εμείς με εσάς."
              : "The quickest way to reach us is the contact details below — we are happy to talk in English or Greek. If you prefer, fill in the assessment form and we will get in touch with you instead."}
          </p>
          <Button asChild size="lg" className="mt-6 rounded-full">
            <WebsiteHashLink href="#assessment">
              {el ? "Ζητήστε Αξιολόγηση Ακινήτου" : "Request a Property Assessment"}
            </WebsiteHashLink>
          </Button>
        </div>

        {/* Real contact methods (phone, WhatsApp/Viber, email) straight from
            the owner profile — placeholders shown when a field is empty. */}
        <LocalContact />
      </main>
      <WebsiteFooter />
    </div>
  );
}