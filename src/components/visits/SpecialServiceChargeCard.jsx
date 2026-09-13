import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Receipt, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ensureSpecialServiceCharge } from "@/lib/visitBilling";
import { specialServicePrice } from "@/lib/specialServices";
import { visitTypeLabel } from "@/lib/visitTypeLabels";

/**
 * Staff-confirmed service charge for a COMPLETED special-purpose service
 * visit (Owner Arrival Preparation, Emergency, Owner-Rep Site, Grocery
 * Stocking, Seasonal, etc.). Shown on the wizard completion screen and the
 * reopened Visit Detail.
 *
 * Charge timing: scheduling and starting never create a charge — the ledger
 * entry is created ONLY here, after the visit is completed AND staff confirm
 * the amount (same philosophy as AdditionalChargeCard).
 *
 * Price resolution:
 *   1. visit.agreed_price — the price snapshotted when the service was
 *      scheduled (a later package price change never rewrites it);
 *   2. the ServicePackage's configured standard_price (default_visit_type
 *      relationship);
 *   3. neither configured → NO default, NO fallback: staff enter the amount
 *      manually (no price is invented).
 *
 * Duplicate-safe: ensureSpecialServiceCharge creates at most ONE charge per
 * visit (visit_id guard); an existing charge switches the card to the
 * created state — repeated taps and reopens cannot charge twice.
 *
 * Grocery Stocking: the €45 service fee is SEPARATE from the grocery
 * purchase cost captured on the visit — the note below keeps the two
 * amounts visibly distinct and the fee never includes the groceries.
 */
export default function SpecialServiceChargeCard({ visit, clientId, existingCharge }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [configuredPrice, setConfiguredPrice] = useState(null);
  const [amount, setAmount] = useState(existingCharge ? String(existingCharge.amount) : "");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(!!existingCharge);
  const [createdAmt, setCreatedAmt] = useState(existingCharge ? Number(existingCharge.amount) : null);

  // Resolve the package's configured price (live lookup by default_visit_type).
  useEffect(() => {
    if (!visit) return;
    let cancelled = false;
    (async () => {
      try {
        const pkgs = await base44.entities.ServicePackage.list("-created_date", 500);
        const { price } = specialServicePrice((pkgs || []).filter((p) => p.active !== false), visit.visit_type);
        if (!cancelled) setConfiguredPrice(price);
      } catch (e) {
        if (!cancelled) setConfiguredPrice(null);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit?.id, visit?.visit_type]);

  // Prefill the charge amount once the configured price resolves (never
  // overwrite an existing/edited amount or an existing charge).
  const scheduledPrice = Number(visit?.agreed_price) > 0 ? Number(visit.agreed_price) : null;
  useEffect(() => {
    if (!visit || existingCharge) return;
    if (scheduledPrice != null) {
      if (amount === "") setAmount(String(scheduledPrice));
      return;
    }
    if (configuredPrice != null && amount === "") setAmount(String(configuredPrice));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuredPrice]);

  const create = async () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setCreating(true);
    try {
      await ensureSpecialServiceCharge(visit, { clientId, amount: amt });
      setCreatedAmt(amt);
      setCreated(true);
      toast({ description: t("Ledger charge created: €{amount} (excl. VAT)", { amount: amt.toFixed(2) }) });
    } catch (e) {
      toast({ variant: "destructive", description: t("Could not create charge: {message}", { message: e?.message || e }) });
    }
    setCreating(false);
  };

  if (!visit) return null;
  const isGrocery = visit.visit_type === "Grocery Stocking";

  return (
    <div className="rounded-2xl border border-sky-500/40 bg-sky-500/5 p-4 mb-4 text-left">
      <div className="flex items-center gap-2 mb-1">
        <Receipt className="w-4 h-4 text-sky-600 shrink-0" />
        <p className="text-[11px] uppercase tracking-wide text-sky-600">{t("Special service — staff-confirmed charge")}</p>
      </div>
      <p className="text-sm font-semibold mb-1">{t("Service charge")}: {t(visitTypeLabel(visit.visit_type))}</p>
      {created ? (
        <div className="space-y-1.5">
          <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> {t("Ledger charge created: €{amount} (excl. VAT)", { amount: Number(createdAmt != null ? createdAmt : parseFloat(amount) || 0).toFixed(2) })}
          </p>
          <Link to="/billing" className="text-xs text-primary hover:underline">{t("View in Billing")}</Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-2">
            {scheduledPrice != null
              ? t("The amount is prefilled from the price scheduled with this service. Review and confirm before a ledger entry is created.")
              : configuredPrice != null
                ? t("The amount is prefilled from the service's configured package price. Review and confirm before a ledger entry is created.")
                : t("No service price is configured for this visit type (Admin → Services). Enter the amount to charge before a ledger entry is created.")}
          </p>
          {scheduledPrice != null ? (
            <p className="text-xs text-muted-foreground mb-2">{t("Scheduled service price: €{amount}", { amount: scheduledPrice.toFixed(2) })}</p>
          ) : configuredPrice != null ? (
            <p className="text-xs text-muted-foreground mb-2">{t("Configured service price: €{amount}", { amount: configuredPrice.toFixed(2) })}</p>
          ) : null}
          {isGrocery && (
            <p className="text-xs text-muted-foreground mb-2">
              {t("Grocery purchase cost (€{amount}) is recorded separately on the visit — it is never part of this service fee.", { amount: Number(visit.grocery_cost || 0).toFixed(2) })}
            </p>
          )}
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