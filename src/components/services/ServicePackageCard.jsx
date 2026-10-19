import React, { useState } from "react";
import { Loader2, Pencil, Power } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { badgeTone } from "@/components/resource/ResourceListPage";

// Pricing summary card for Admin → Services. Makes the master pricing values
// identifiable at a glance: recurring price, included visits, one-time price,
// additional-visit price (explicit "Not configured" — never visually substituted
// by the one-time price), and additional-time rates.
const PERIOD_WORD = { Monthly: "month", Quarterly: "quarter", Annual: "year" };

export default function ServicePackageCard({ item, onOpen, onToggle }) {
  const { t, tEnum, lang } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const p = item || {};
  const recurring = p.recurring === "Recurring";
  const isActive = p.active !== false;
  const period = t(PERIOD_WORD[p.billing_type] || "month");
  const eur = (n) => (n != null && Number(n) > 0 ? `€${Number(n).toFixed(0)}` : null);

  const rows = [
    [t(recurring ? "Recurring Price" : "Service Price"), `${eur(p.standard_price) || "—"}${recurring ? ` / ${period}` : ""}`],
  ];
  if (recurring) {
    rows.push([t("Included Visits"), `${Number(p.included_visits_per_period) || 1} / ${period}`]);
    rows.push([t("Additional Same-Level Visit Price"), eur(p.additional_visit_price) || t("Not configured")]);
  }
  rows.push([t("One-Time Non-Subscriber Price"), eur(p.one_time_price) || "—"]);
  if (p.hourly_charge) rows.push([t("Additional Time Rate"), `${eur(p.hourly_charge)} / ${t("hour")}`]);
  if (p.emergency_surcharge) rows.push([t("Emergency Increment (30 min)"), eur(p.emergency_surcharge)]);

  const toggle = async (event) => {
    event.stopPropagation();
    if (!onToggle || saving) return;
    setSaving(true);
    setError("");
    try {
      await onToggle(p, !isActive);
    } catch (e) {
      setError(e?.message || (lang === "el" ? "Δεν ήταν δυνατή η αλλαγή κατάστασης." : "Could not update package status."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={onOpen}
        className="text-left w-full hover:opacity-90 transition group"
      >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-foreground truncate flex-1">{p.name}</div>
        <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0" />
      </div>
      <div className="mt-2 space-y-1">
        {rows.map(([label, value], i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground truncate">{label}</span>
            <span className="text-foreground font-medium shrink-0">{value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {[p.billing_type, isActive ? "Active" : "Inactive"].filter(Boolean).map((v) => (
          <span key={v} className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(v)}`}>{tEnum(v)}</span>
        ))}
      </button>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
          isActive
            ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
        }`}
        aria-label={lang === "el" ? (isActive ? "Απενεργοποίηση υπηρεσίας" : "Ενεργοποίηση υπηρεσίας") : (isActive ? "Deactivate package" : "Activate package")}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
        {lang === "el" ? (isActive ? "Απενεργοποίηση" : "Ενεργοποίηση") : (isActive ? "Deactivate package" : "Activate package")}
      </button>
      {error && <p className="mt-2 text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}