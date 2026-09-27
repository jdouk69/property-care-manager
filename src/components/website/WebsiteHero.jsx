import React from "react";
import { MapPin, ClipboardCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import ArchMotif from "@/components/website/ArchMotif";

export default function WebsiteHero() {
  const { lang } = useLanguage();
  const el = lang === "el";

  return (
    <section id="top" className="website-navy relative overflow-hidden">
      <ArchMotif className="pointer-events-none absolute -bottom-8 left-1/2 w-[720px] max-w-none -translate-x-1/2 text-white/10" />
      <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-16 sm:pt-24 sm:pb-28 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90">
          <MapPin className="w-3.5 h-3.5" />
          {el ? "Χανιά · Δυτική Κρήτη" : "Chania · Western Crete"}
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl font-heading text-3xl sm:text-5xl font-bold leading-tight text-white">
          {el
            ? "Το σπίτι σας στην Κρήτη, με φροντίδα σαν να ήταν δικό μας."
            : "Your home in Crete, cared for as if it were our own."}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-white/75 leading-relaxed">
          {el
            ? "Είτε λείπετε για λίγες εβδομάδες είτε για το μεγαλύτερο μέρος του χρόνου, το Property Care Crete σας προσφέρει μια αξιόπιστη τοπική παρουσία στα Χανιά και τη Δυτική Κρήτη. Πραγματοποιούμε προγραμματισμένες επισκέψεις στο ακίνητό σας, καταγράφουμε όσα βλέπουμε, σας κρατάμε ενήμερους και σας βοηθάμε να συντονίσετε τους κατάλληλους επαγγελματίες όταν κάτι χρειάζεται προσοχή."
            : "Whether you're away for a few weeks or most of the year, Property Care Crete gives you a dependable local presence in Chania and Western Crete. We carry out scheduled property visits, document what we see, keep you informed, and help coordinate the right professionals when something needs attention."}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="w-full sm:w-auto rounded-lg h-12 px-7">
            <a href="#assessment">
              <ClipboardCheck className="w-4 h-4" />
              {el ? "Ζητήστε Αξιολόγηση Ακινήτου" : "Request a Property Assessment"}
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto rounded-lg h-12 px-7 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <a href="#services">{el ? "Υπηρεσίες & Τιμές" : "Services & Prices"}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}