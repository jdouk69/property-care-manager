import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Receipt, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ensureAdditionalVisitCharge } from "@/lib/visitBilling";

/**
 * Charge confirmation for a completed ADDITIONAL billable visit (done step and
 * reopened completed-visit detail). Price resolution:
 *   1. package.additional_visit_price — the explicit master price configured
 *      in Admin → Services for an additional recurring-package visit.
 *   2. Not configured → NO default and NO fallback to one_time_price: staff
 *      enter and confirm the amount manually.
 * The amount stays editable until confirmed. Duplicate-safe: at most one
 * charge per visit (shared ensureAdditionalVisitCharge guard); passing
 * existingCharge switches the card to the created status.
 */
export default function AdditionalChargeCard({ visit, pkg, clientId, existingCharge }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const configuredPrice =
    pkg?.additional_visit_price != null && Number(pkg.additional_visit_price) > 0
      ? Number(pkg.additional_visit_price)
      : null;
  const [amount, setAmount] = useState(existingCharge ? String(existingCharge.amount) : configuredPrice != null ? String(configuredPrice) : "");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(!!existingCharge);
  const [createdAmt, setCreatedAmt] = useState(existingCharge ? Number(existingCharge.amount) : null);

  const create = async () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setCreating(true);
    try {
      const charge = await ensureAdditionalVisitCharge(visit, { clientId, amount: amt });
      setCreatedAmt(amt);
      setCreated(true);
      toast({ description: t("Ledger charge created: €{amount} (excl. VAT)", { amount: Number(charge ? charge.amount : amt).toFixed(2) }) });
    } catch (e) {
      toast({ variant: "destructive", description: t("Could not create charge: {message}", { message: e?.message || e }) });
    }
    setCreating(false);
  };

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 mb-4 text-left">
      <div className="flex items-center gap-2 mb-1">
        <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-[11px] uppercase tracking-wide text-amber-600">{t("Additional service — billable")}</p>
      </div>
      <p className="text-sm font-semibold mb-1">{t("Additional Property Care Visit")}</p>
      <p className="text-xs text-muted-foreground mb-2">
        {configuredPrice != null
          ? t("The amount defaults to the package's configured additional-visit price. Review and confirm it before a ledger entry is created.")
          : t("No additional-visit price is configured for this package (Admin → Services). Enter the amount to charge before a ledger entry is created.")}
      </p>
      {configuredPrice != null && (
        <p className="text-xs text-muted-foreground mb-2">
          {t("Additional visit price (package): €{amount}", { amount: configuredPrice.toFixed(2) })}
        </p>
      )}
      {created ? (
        <div className="space-y-1.5">
          <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> {t("Ledger charge created: €{amount} (excl. VAT)", { amount: Number(createdAmt != null ? createdAmt : parseFloat(amount) || 0).toFixed(2) })}
          </p>
          <Link to="/billing" className="text-xs text-primary hover:underline">{t("View in Billing")}</Link>
        </div>
      ) : (
        <>
          <div className="mb-2">
            <Label className="text-xs mb-1.5 block">{t("Charge amount (€)")}</Label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-xl" />
          </div>
          <Button onClick={create} disabled={creating || !(parseFloat(amount) > 0)} className="rounded-2xl h-11 w-full">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />} {t("Create Ledger Charge")}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2">{t("No ledger charge is created until you confirm the amount.")}</p>
        </>
      )}
    </div>
  );
}