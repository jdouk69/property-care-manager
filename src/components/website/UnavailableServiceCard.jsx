import React from "react";
import { TriangleAlert } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Per-service unavailable state for the pricing grid. Rendered when the live
// feed lacks a required price component for this service (e.g. a missing
// hourly rate for copy that shows €/hour) — the service is treated as
// unavailable instead of crashing or showing invented or partial pricing.
export default function UnavailableServiceCard({ name }) {
  const { lang } = useLanguage();
  const el = lang === "el";
  return (
    <div className="flex flex-col justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-5 text-center">
      <TriangleAlert className="mx-auto w-5 h-5 text-amber-500" />
      <h3 className="font-heading text-lg font-semibold text-foreground">
        {name || (el ? "Υπηρεσία" : "Service")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {el
          ? "Η τιμή αυτής της υπηρεσίας είναι προσωρινά μη διαθέσιμη — επικοινωνήστε μαζί μας για προσφορά."
          : "Pricing for this service is temporarily unavailable — contact us for a quote."}
      </p>
    </div>
  );
}