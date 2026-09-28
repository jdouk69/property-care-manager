import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TriangleAlert } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import ServiceTermCard from "@/components/website/ServiceTermCard";
import UnavailableServiceCard from "@/components/website/UnavailableServiceCard";
import {
  serviceTerms,
  billingUnitLabel,
  MONTHLY_KEYS,
  ON_DEMAND_KEYS,
  REQUIRED_KEYS,
} from "@/lib/website/serviceTerms";

// Live pricing section. Prices come from the server-side websitePrices function
// (the access key stays server-side). Fail-closed: if the feed is down, or even
// ONE approved service or live price is missing, the whole section shows the
// unavailable state — never a hard-coded number.
export default function PricingSection() {
  const { lang } = useLanguage();
  const el = lang === "el";
  const [services, setServices] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    base44.functions
      .invoke("websitePrices", {})
      .then((res) => {
        if (!active) return;
        const list = res?.data?.services;
        // Fail-closed: ALL approved services must arrive with live prices.
        const ok =
          Array.isArray(list) &&
          REQUIRED_KEYS.every((k) => {
            const s = list.find((x) => x && x.service_key === k);
            return s && s.price != null;
          });
        if (ok) setServices(list);
        else setError(true);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const byKey = {};
  (services || []).forEach((s) => {
    if (s && s.service_key) byKey[s.service_key] = s;
  });
  const card = (key, highlight) => {
    const s = byKey[key];
    // Fail-closed per card: if the live feed is missing this service or any
    // required price component for its copy (e.g. hourly rate), the service is
    // shown as unavailable — never a crash, never invented or partial pricing.
    const terms = s ? serviceTerms(s, lang) : null;
    if (!s || !terms) return <UnavailableServiceCard key={key} name={s ? s.name : null} />;
    return <ServiceTermCard key={key} service={s} terms={terms} unitLabel={billingUnitLabel(s.billing_unit, lang)} highlight={highlight} />;
  };

  return (
    <section id="services" className="scroll-mt-20 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {el ? "Υπηρεσίες & Τιμές" : "Services & Pricing"}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {el ? "Ξεκάθαρες τιμές και συμφωνημένη εργασία." : "Clear prices and agreed work."}
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            {el
              ? "Αυτές είναι οι τρέχουσες τιμές των υπηρεσιών μας. Μετά την αξιολόγηση του ακινήτου, συμφωνούμε μαζί σας κάθε προτεινόμενη εργασία και την τιμή της πριν προχωρήσουμε."
              : "These are our current service prices. After a property assessment, we agree any proposed work and its price with you before we proceed."}
          </p>
        </div>

        {error && (
          <div className="mt-6 sm:mt-10 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center">
            <TriangleAlert className="w-8 h-8 text-amber-500" />
            <p className="font-medium text-foreground">
              {el ? "Οι τιμές είναι προσωρινά μη διαθέσιμες." : "Prices are temporarily unavailable."}
            </p>
            <p className="text-sm text-muted-foreground">
              {el
                ? "Παρακαλούμε ελέγξτε σύντομα ή επικοινωνήστε μαζί μας απευθείας για προσωπική προσφορά."
                : "Please check back shortly or contact us directly for a personal quote."}
            </p>
          </div>
        )}

        {!error && !services && (
          <div className="mt-6 sm:mt-10 flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {el ? "Φόρτωση τρεχουσών τιμών…" : "Loading current prices…"}
            </p>
          </div>
        )}

        {services && !error && (
          <div className="mt-6 sm:mt-10 space-y-10">
            <div>
              <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">
                {el ? "Μηνιαία Πακέτα Φροντίδας — προγραμματισμένες επισκέψεις κάθε μήνα" : "Recurring Care Plans — scheduled visits every month"}
              </h3>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {MONTHLY_KEYS.map((k) => card(k, k === "complete_care"))}
              </div>
            </div>
            <div>
              <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">
                {el ? "Υπηρεσίες κατ' Απαίτηση" : "On-Demand Services"}
              </h3>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ON_DEMAND_KEYS.map((k) => card(k, false))}
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {el
                ? "Η ακριβής εργασία και η τελική τιμή για το ακίνητό σας συμφωνούνται πάντα γραπτώς μαζί σας πριν ξεκινήσουμε."
                : "The exact work and final price for your property are always agreed with you in writing before we start."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}