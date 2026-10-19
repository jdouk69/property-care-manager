import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

// Editor for the public wording of the service cards (English + Greek).
// Prices, hourly rates, time allowances and visit counts are NOT here — they
// come live from the Service Package records via the secure pricing feed.
// {price} and {hourly} placeholders in the wording are filled with the live
// amounts at display time.

const SERVICE_GROUPS = [
  {
    key: "recurring",
    title: "Recurring Care Plans",
    badge: "Monthly subscription",
    description: "Scheduled visits each month.",
    panelClass: "border-amber-300/80 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20",
    headerClass: "border-amber-300/80 bg-amber-100/70 dark:border-amber-800 dark:bg-amber-950/40",
    badgeClass: "bg-amber-200/80 text-amber-950 dark:bg-amber-900 dark:text-amber-100",
    cards: [
      { key: "quick_check", label: "Quick Check" },
      { key: "property_care", label: "Property Care" },
      { key: "complete_care", label: "Complete Care" },
    ],
  },
  {
    key: "on_demand",
    title: "On-Demand Services",
    badge: "One-time visit",
    description: "Single visits with no monthly subscription.",
    panelClass: "border-sky-300/80 bg-sky-50/60 dark:border-sky-800 dark:bg-sky-950/20",
    headerClass: "border-sky-300/80 bg-sky-100/70 dark:border-sky-800 dark:bg-sky-950/40",
    badgeClass: "bg-sky-200/80 text-sky-950 dark:bg-sky-900 dark:text-sky-100",
    cards: [
      { key: "quick_check_one_time", label: "On-Demand Quick Check" },
      { key: "on_demand_property_assistance", label: "On-Demand Property Assistance" },
      { key: "owner_arrival_preparation", label: "Owner Arrival Preparation" },
      { key: "seasonal_opening", label: "Seasonal Opening" },
      { key: "seasonal_closing", label: "Seasonal Closing" },
      { key: "owner_representative_site_visit", label: "Contractor & Delivery Visit" },
      { key: "grocery_stocking", label: "Grocery Stocking" },
      { key: "emergency_visit", label: "Emergency Visit" },
    ],
  },
];

const CARD_FIELDS = [
  { key: "name", label: "Card title", type: "text" },
  { key: "desc", label: "Short description", type: "textarea", rows: 3 },
  { key: "included", label: "What's included", type: "textarea", rows: 3 },
  { key: "extras", label: "Extra-time / limits note", type: "textarea", rows: 2 },
];

const LANG_LABELS = { en: "English", el: "Ελληνικά" };

export default function ServiceCardsField({ content, onChange }) {
  const cardOf = (lng, key) => (content[lng] || {}).cards?.[key] || {};
  const setField = (lng, key, field, value) =>
    onChange({
      ...content,
      [lng]: {
        ...(content[lng] || {}),
        cards: {
          ...((content[lng] || {}).cards || {}),
          [key]: { ...cardOf(lng, key), [field]: value },
        },
      },
    });

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Service card wording</Label>
      <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-foreground/90">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <span>
          The title, description, inclusions and extra-time note shown on each public service card, in both languages.
          Amounts, time allowances and visit counts come live from your Service Package records — use the placeholders{" "}
          <code className="rounded bg-muted px-1">{"{price}"}</code> and <code className="rounded bg-muted px-1">{"{hourly}"}</code>{" "}
          in the wording where an amount belongs; they are filled with the live figures when the page is viewed.
        </span>
      </p>
      <div className="space-y-7">
        {SERVICE_GROUPS.map((group) => (
          <section key={group.key} aria-labelledby={`service-group-${group.key}`}>
            <div className={`mb-4 rounded-xl border border-l-4 p-4 sm:px-5 ${group.headerClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 id={`service-group-${group.key}`} className="font-heading text-lg font-bold text-foreground">
                    {group.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${group.badgeClass}`}>
                  {group.badge} · {group.cards.length}
                </span>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {group.cards.map((s) => (
                <article key={s.key} className={`rounded-2xl border border-l-4 p-4 sm:p-5 ${group.panelClass}`}>
                  <h4 className="mb-4 border-b border-current/10 pb-3 text-base font-bold text-foreground">
                    {s.label}
                  </h4>
                  <div className="space-y-4">
                    {CARD_FIELDS.map((f) => {
                      const Comp = f.type === "textarea" ? Textarea : Input;
                      return (
                        <div key={f.key} className="space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {["en", "el"].map((lng) => (
                              <div key={lng} className="space-y-1">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  {LANG_LABELS[lng]}
                                </span>
                                <Comp
                                  value={cardOf(lng, s.key)[f.key] || ""}
                                  rows={f.rows || 3}
                                  onChange={(e) => setField(lng, s.key, f.key, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
