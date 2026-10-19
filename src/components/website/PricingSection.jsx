import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Info, Loader2, TriangleAlert } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useSectionContent } from "@/components/website/WebsiteContentContext";
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
// (the access key stays server-side). If the feed is down, or an approved
// service is missing its live record, the section fails closed. Optional
// inactive services stay hidden while active prices remain live.
export default function PricingSection() {
  const { lang } = useLanguage();
  const el = lang === "el";
  const sc = useSectionContent("services");
  const ac = useSectionContent("add_on_services");
  const [plansTitle, ...plansSubtitle] = (sc.groupHeading || "").split("—");
  const [services, setServices] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let timer;
    const retry = (attempt) => {
      // One automatic retry before failing closed — a transient feed hiccup
      // must not get baked into a crawler snapshot as "prices unavailable".
      if (attempt < 1) timer = window.setTimeout(() => attemptLoad(attempt + 1), 1500);
      else if (active) setError(true);
    };
    const attemptLoad = (attempt) => {
      if (!active) return;
      base44.functions
        .invoke("websitePrices", {})
        .then((res) => {
          if (!active) return;
          const list = res?.data?.services;
          // Fail-closed: every approved service must be present; inactive
          // services are intentionally returned without prices so they can
          // be hidden without making the rest of the section unavailable.
          const ok = Array.isArray(list) && REQUIRED_KEYS.every((key) =>
            list.some((s) => s?.service_key === key && (s.active === false || s.price != null))
          );
          if (ok) setServices(list);
          else retry(attempt);
        })
        .catch(() => retry(attempt));
    };
    attemptLoad(0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const byKey = {};
  (services || []).forEach((s) => {
    if (s && s.service_key) byKey[s.service_key] = s;
  });
  const onDemandServices = (services || []).filter((s) =>
    ON_DEMAND_KEYS.includes(s.service_key) &&
    s.active !== false &&
    s.price != null &&
    serviceTerms(s, lang, sc.cards)
  );
  const card = (key, highlight) => {
    const s = byKey[key];
    // Fail-closed per card: if the live feed is missing this service or any
    // required price component for its copy (e.g. hourly rate), the service is
    // shown as unavailable — never a crash, never invented or partial pricing.
    const terms = s ? serviceTerms(s, lang, sc.cards) : null;
    if (s?.active === false) return null;
    if (!s || !terms) return <UnavailableServiceCard key={key} name={s ? s.name : null} />;
    return <ServiceTermCard key={key} service={s} terms={terms} unitLabel={billingUnitLabel(s.billing_unit, lang)} highlight={highlight} />;
  };

  return (
    <section id="services" className="scroll-mt-20 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {sc.kicker}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {sc.heading}
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">{sc.intro}</p>
        </div>

        <div className="mt-6 max-w-3xl rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 sm:px-6">
          <p className="font-semibold text-foreground">
            {el
              ? "Οι εσωτερικές επισκέψεις σε βίλες βραχυχρόνιας μίσθωσης συμφωνούνται εκ των προτέρων και γίνονται μόνο όταν έχει επιβεβαιωθεί ότι το ακίνητο είναι κενό και δεν διαμένει κανείς εκεί. Σε ιδιωτικές κατοικίες όπου παραμένουν τα προσωπικά αντικείμενα του ιδιοκτήτη, προσφέρουμε μόνο εξωτερικές επισκέψεις."
              : "Interior visits at short-term rentals are agreed in advance and take place only when the property is confirmed vacant and no one is staying there. Private homes where the owner's personal belongings remain are exterior-only; we do not enter."}
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
            {MONTHLY_KEYS.some((k) => byKey[k]?.active !== false) && <div>
              <div className="mb-5 rounded-2xl border border-primary/30 border-l-4 border-l-primary bg-primary/10 px-5 py-5 sm:px-6 sm:py-6">
                <h3 className="font-heading text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  {plansTitle.trim()}
                </h3>
                {plansSubtitle.length > 0 && (
                  <p className="mt-2 text-base font-semibold leading-relaxed text-foreground sm:text-lg">
                    {plansSubtitle.join("—").trim()}
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {MONTHLY_KEYS.map((k) => card(k, k === "complete_care"))}
              </div>
              <div className="mt-4 text-center"><Link to="/care-plan-details" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">{el ? "Συγκρίνετε και τα τρία πακέτα" : "Compare all three plans"}</Link></div>
            </div>}
            {ON_DEMAND_KEYS.some((k) => byKey[k]?.active !== false) && <div>
              <div className="mb-5 rounded-2xl border border-primary/30 border-l-4 border-l-primary bg-primary/10 px-5 py-5 sm:px-6 sm:py-6">
                <h3 className="font-heading text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  {ac.heading}
                </h3>
                <p className="mt-2 text-base font-semibold leading-relaxed text-foreground sm:text-lg">
                  {ac.subtitle}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{ac.intro}</p>
              {onDemandServices.length > 0 && (
                <>
                  <div className="mt-5 text-center">
                    <Link
                      to="/service-details"
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-semibold text-primary underline-offset-4 hover:bg-primary/10 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {ac.cta}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </>
              )}
            </div>}
            {/* VAT treatment note — all displayed prices include VAT. */}
            <p className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-center text-sm font-medium text-accent-foreground">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              {el
                ? "Όλες οι αναγραφόμενες τιμές υπηρεσιών περιλαμβάνουν ΦΠΑ."
                : "All listed service prices include VAT."}
            </p>
            {sc.note && <p className="text-center text-xs text-muted-foreground">{sc.note}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
