import React, { useState } from "react";
import { Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Finish-screen charge amount capture for an ADDITIONAL — BILLABLE visit.
 * Resolution is identical to AdditionalChargeCard: the package's configured
 * additional_visit_price prefills the field when set (editable); when it is
 * NOT configured there is no default and no fallback — staff enter the amount
 * (never invented). No ledger charge is created here: the confirmed amount is
 * stored on the visit at completion and the ledger entry is still created
 * explicitly (duplicate-safe) via AdditionalChargeCard afterwards.
 */
export default function AdditionalAmountSection({ pkg, value, onChange }) {
  const { t } = useLanguage();
  const configuredPrice =
    pkg?.additional_visit_price != null && Number(pkg.additional_visit_price) > 0
      ? Number(pkg.additional_visit_price)
      : null;
  // Local text keeps intermediate typing ("12.") usable; the parent only
  // receives a valid positive number (or null when empty/invalid).
  const [text, setText] = useState(
    value != null ? String(value) : configuredPrice != null ? String(configuredPrice) : ""
  );
  const handleChange = (v) => {
    setText(v);
    const amt = parseFloat(v);
    onChange(Number.isFinite(amt) && amt > 0 ? Math.round(amt * 100) / 100 : null);
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