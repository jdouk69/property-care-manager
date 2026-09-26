import React from "react";
import { Check, Clock } from "lucide-react";

// One pricing card. The price headline, unit and every euro amount come from
// the LIVE feed service object; the wording around them is bilingual static copy.
export default function ServiceTermCard({ service, terms, unitLabel, highlight }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground">{terms.name}</h3>
        <p className="mt-1 font-heading text-2xl font-bold text-primary">
          €{service.price} <span className="text-sm font-medium text-muted-foreground">{unitLabel}</span>
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
    </div>
  );
}