import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

// Editor for the public wording of the seven service cards (English + Greek).
// Prices, hourly rates, time allowances and visit counts are NOT here — they
// come live from the Service Package records via the secure pricing feed.
// {price} and {hourly} placeholders in the wording are filled with the live
// amounts at display time.

const SERVICE_CARDS = [
  { key: "quick_check", label: "Quick Check" },
  { key: "property_care", label: "Property Care" },
  { key: "complete_care", label: "Complete Care" },
  { key: "owner_arrival_preparation", label: "Owner Arrival Preparation" },
  { key: "owner_representative_site_visit", label: "Owner Representative Site Visit" },
  { key: "grocery_stocking", label: "Grocery Stocking" },
  { key: "emergency_visit", label: "Emergency Visit" },
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
      <div className="space-y-4">
        {SERVICE_CARDS.map((s) => (
          <div key={s.key} className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{s.label}</p>
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
          </div>
        ))}
      </div>
    </div>
  );
}