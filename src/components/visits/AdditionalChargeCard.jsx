import React, { useState } from "react";
import { Receipt, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ensureAdditionalVisitCharge } from "@/lib/visitBilling";

/**
 * Charge confirmation for a completed ADDITIONAL billable visit (done step).
 * No approved price rule exists for additional visits beyond the package
 * allowance, so nothing is auto-charged: staff must confirm the amount
 * before a ledger entry is created. The package's one-time price is shown
 * as a REFERENCE only. Duplicate-safe: at most one charge per visit.
 */
export default function AdditionalChargeCard({ visit, pkg, clientId }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [amount, setAmount] = useState(pkg?.one_time_price != null ? String(pkg.one_time_price) : "");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const create = async () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setCreating(true);
    try {
      const charge = await ensureAdditionalVisitCharge(visit, { clientId, amount: amt });
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
        {t("No approved price is configured for additional visits. Confirm the amount to charge before a ledger entry is created.")}
      </p>
      {pkg?.one_time_price != null && (
        <p className="text-xs text-muted-foreground mb-2">
          {t("Package one-time price (reference): €{amount}", { amount: Number(pkg.one_time_price).toFixed(2) })}
        </p>
      )}
      {created ? (
        <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> {t("Ledger charge created: €{amount} (excl. VAT)", { amount: Number(parseFloat(amount) || 0).toFixed(2) })}
        </p>
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