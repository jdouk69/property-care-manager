import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, TriangleAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";
import WebsiteHeader from "@/components/website/WebsiteHeader";
import WebsiteFooter from "@/components/website/WebsiteFooter";
import OnDemandDetails from "@/components/website/OnDemandDetails";
import { WebsiteContentProvider } from "@/components/website/WebsiteContentContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ON_DEMAND_KEYS } from "@/lib/website/serviceTerms";
import usePageMeta from "@/lib/seo";

export default function OnDemandServiceDetailsPage() {
  const { lang } = useLanguage();
  const el = lang === "el";
  const [sections, setSections] = useState(null);
  const [services, setServices] = useState(null);
  const [failed, setFailed] = useState(false);

  usePageMeta({
    title: el ? "Αναλυτικά οι Εφάπαξ Υπηρεσίες | Property Care Crete" : "One-Time Service Details | Property Care Crete",
    description: el
      ? "Δείτε τι περιλαμβάνεται και τι δεν περιλαμβάνεται σε κάθε εφάπαξ υπηρεσία φροντίδας ακινήτου."
      : "See what is included and excluded with each one-time property-care service.",
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      base44.functions.invoke("websiteContentPublic", {}),
      base44.functions.invoke("websitePrices", {}),
    ])
      .then(([contentRes, priceRes]) => {
        if (!active) return;
        const list = priceRes?.data?.services;
        if (!Array.isArray(list)) throw new Error("Service pricing unavailable");
        const available = list.filter((service) =>
          ON_DEMAND_KEYS.includes(service?.service_key) && service.active !== false && service.price != null
        );
        setSections(contentRes?.data?.sections && typeof contentRes.data.sections === "object" ? contentRes.data.sections : null);
        setServices(available);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, []);

  const ready = useMemo(() => services !== null && !failed, [services, failed]);

  return (
    <WebsiteContentProvider sections={sections}>
      <div className="website-theme min-h-screen bg-background">
        <WebsiteHeader />
        <main className="py-10 sm:py-14">
          <div className="mx-auto max-w-4xl px-4">
            <Link to="/landing-page#services" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {el ? "Πίσω στις Υπηρεσίες & Τιμές" : "Back to Services & Pricing"}
            </Link>

            <header className="mt-5 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">{el ? "Εφάπαξ υπηρεσίες" : "One-time services"}</p>
              <h1 className="mt-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">
                {el ? "Τι περιλαμβάνει κάθε υπηρεσία" : "What each service includes"}
              </h1>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {el
                  ? "Ελέγξτε τις εργασίες που περιλαμβάνονται, τι εξαιρείται και τον διαθέσιμο χρόνο πριν επιλέξετε μια υπηρεσία. Οι τιμές εμφανίζονται από τον τρέχοντα τιμοκατάλογο."
                  : "Review what is included, what is excluded, and the time allowance before choosing a service. Prices are taken from the current service price list."}
              </p>
              <p className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 text-sm font-medium leading-relaxed text-foreground">
                {el
                  ? "Οι εσωτερικές επισκέψεις σε βίλες βραχυχρόνιας μίσθωσης συμφωνούνται εκ των προτέρων και γίνονται μόνο όταν έχει επιβεβαιωθεί ότι το ακίνητο είναι κενό και δεν διαμένει κανείς εκεί. Σε ιδιωτικές κατοικίες όπου παραμένουν τα προσωπικά αντικείμενα του ιδιοκτήτη, προσφέρουμε μόνο εξωτερικές επισκέψεις."
                  : "Interior visits at short-term rentals are agreed in advance and take place only when the property is confirmed vacant and no one is staying there. Private homes where the owner's personal belongings remain are exterior-only; we do not enter."}
              </p>
            </header>

            {failed && (
              <div role="alert" className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-foreground">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <p className="text-sm leading-relaxed">
                  {el ? "Οι τρέχουσες τιμές δεν είναι προσωρινά διαθέσιμες. Δοκιμάστε ξανά αργότερα." : "Current prices are temporarily unavailable. Please try again shortly."}
                </p>
              </div>
            )}

            {!ready && !failed && (
              <div className="mt-10 flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                {el ? "Φόρτωση υπηρεσιών…" : "Loading services…"}
              </div>
            )}

            {ready && (services.length > 0
              ? <div className="mt-7"><OnDemandDetails services={services} lang={lang} /></div>
              : <p className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                  {el ? "Δεν υπάρχουν διαθέσιμες εφάπαξ υπηρεσίες αυτή τη στιγμή." : "No one-time services are currently available."}
                </p>)}
          </div>
        </main>
        <WebsiteFooter />
      </div>
    </WebsiteContentProvider>
  );
}
