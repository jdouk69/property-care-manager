import React from "react";
import ServiceDetailsDialog from "@/components/website/ServiceDetailsDialog";
import CarePlanDetails from "@/components/website/CarePlanDetails";
import { Check, Clock } from "lucide-react";
import { CardArches } from "@/components/website/ArchMotif";
import { formatPrice } from "@/lib/website/serviceTerms";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// One pricing card. The price headline, unit and every euro amount come from
// the LIVE feed service object; the wording around them is bilingual static copy.
export default function ServiceTermCard({ service, terms, unitLabel, highlight }) {
  const { lang } = useLanguage();
  return (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl border p-5 ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <CardArches className="pointer-events-none absolute inset-x-4 top-2 h-3 text-primary/50" />
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {terms.name}
          {service.service_key === "complete_care" && (
            <span className="ml-2 inline-block text-sm font-semibold text-red-700">
              ({lang === "el" ? "Προτεινόμενο" : "Recommended"})
            </span>
          )}
        </h3>
        <p className="mt-1 font-heading text-2xl font-bold text-primary">
          €{formatPrice(service.price)} <span className="text-sm font-medium text-muted-foreground">{unitLabel}</span>
        </p>
      </div>
      {terms.desc && <p className="text-sm leading-relaxed text-foreground/80">{terms.desc}</p>}
      <div className="mt-auto space-y-1.5">
        <p className="flex items-start gap-1.5 text-sm text-foreground/90">
          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          {terms.included}
        </p>
        {terms.extras && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            {terms.extras}
          </p>
        )}
      </div>
      {["quick_check", "property_care", "complete_care"].includes(service.service_key) && <ServiceDetailsDialog title={terms.name} lang={lang} trigger={<button type="button" className="inline-flex min-h-11 items-center text-left text-sm font-semibold text-primary underline underline-offset-4">{lang === "el" ? "Δείτε όλες τις παροχές" : "See everything included"}</button>}><CarePlanDetails services={[service]} lang={lang} single /></ServiceDetailsDialog>}
    </div>
  );
}
