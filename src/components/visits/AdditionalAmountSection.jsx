import React, { useState, useEffect } from "react";
import { Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Finish-screen charge amount for an ADDITIONAL — BILLABLE visit.
 * FULLY CONTROLLED by the wizard's canonical additionalAmount value: the
 * wizard establishes the default once (the package's configured
 * additional_visit_price, once the package context is available), the draft
 * autosave persists it, and this section only displays/edits that value — it
 * never derives its own amount, so mount timing (package not yet loaded) can
 * no longer lock in a wrong figure.
 * Value semantics: null = not established (or deliberately cleared); 0 =
 * deliberately set to zero (kept as numeric 0, never treated as missing); a
 * positive number = established amount. No ledger charge is created here: the
 * amount is stored on the visit at completion and the ledger entry is still
 * created explicitly (duplicate-safe) via AdditionalChargeCard afterwards.
 */
export default function AdditionalAmountSection({ pkg, value, onChange }) {
  const { t } = useLanguage();
  const configuredPrice =
    pkg?.additional_visit_price != null && Number(pkg.additional_visit_price) > 0
      ? Number(pkg.additional_visit_price)
      : null;
  // Local text only keeps intermediate typing ("12.") usable; it re-syncs to
  // the canonical value whenever the wizard changes it (default established,
  // resume, restart). While the local text still parses to the canonical
  // value it is left untouched so typing is not interrupted.
  const [text, setText] = useState(value != null ? String(value) : "");
  useEffect(() => {
    setText((prev) => {
      const parsed = parseFloat(prev);
      if (value != null && Number.isFinite(parsed) && parsed === value) return prev;
      return value != null ? String(value) : "";
    });
  }, [value]);
  const handleChange = (v) => {
    setText(v);
    const s = (v || "").trim();
    if (s === "") { onChange(null); return; }
    const amt = parseFloat(s);
    // 0 is a DELIBERATE amount (kept numeric); only empty/invalid input maps
    // to null (missing). Never `amt > 0 ? amt : null`.
    onChange(Number.isFinite(amt) && amt >= 0 ? Math.round(amt * 100) / 100 : null);
  };
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 mt-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Receipt className="w-3.5 h-3.5 text-amber-600" />
        <Label className="text-xs">{t("Charge amount (€)")}</Label>
      </div>
      {configuredPrice != null ? (
        <p className="text-xs text-muted-foreground mb-2">
          {t("The amount defaults to the package's configured additional-visit price. Review and confirm it before a ledger entry is created.")}
        </p>
      ) : (
        <p className="text-xs text-amber-700 dark:text-amber-500 mb-2">
          {t("No additional-visit price is configured for this package (Admin → Services). Enter the amount to charge before a ledger entry is created.")}
        </p>
      )}
      <Input
        type="number"
        step="0.01"
        min="0"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="0.00"
        className="rounded-xl"
      />
      <p className="text-[11px] text-muted-foreground mt-2">
        {t("No ledger charge is created until you confirm the amount.")}
      </p>
    </div>
  );
}