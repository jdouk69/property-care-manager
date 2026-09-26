import React from "react";
import { MapPin, ClipboardCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

export default function WebsiteHero() {
  const { lang } = useLanguage();
  const el = lang === "el";

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent via-background to-background" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-12 sm:pt-20 sm:pb-24 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <MapPin className="w-3.5 h-3.5" />
          {el ? "Χανιά · Δυτική Κρήτη" : "Chania · Western Crete"}
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl font-heading text-3xl sm:text-5xl font-bold leading-tight text-foreground">
          {el
            ? "Το σπίτι σας στην Κρήτη, με φροντίδα σαν να ήταν δικό μας."
            : "Your home in Crete, cared for as if it were our own."}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
          {el
            ? "Τακτικές επισκέψεις φροντίδας, προετοιμασία πριν την άφιξη και αξιόπιστη τοπική υποστήριξη για ιδιοκτήτες ακινήτων στα Χανιά. Κάθε επίσκεψη τεκμηριώνεται — πάντα ξέρετε τι είδαμε και τι κάναμε."
            : "Regular property-care visits, arrival preparation, and trusted local support for homeowners near Chania. Every visit is documented — you always know what we saw and what we did."}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="w-full sm:w-auto rounded-full h-12 px-7">
            <a href="#assessment">
              <ClipboardCheck className="w-4 h-4" />
              {el ? "Ζητήστε Αξιολόγηση Ακινήτου" : "Request a Property Assessment"}
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-full h-12 px-7">
            <a href="#services">{el ? "Υπηρεσίες & Τιμές" : "Services & Prices"}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}