import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPricePlusVat, PRICING_NOTE } from "@/lib/servicePricing";

// Internal pricing recommendation card. Recommends only — final price is
// always approved manually by staff (Accept / Adjust / Set Custom).
export default function PricingRecommendationCard({
  rec, tierName, purchaseType, propertySummary, finalPrice, overrideReason,
  onAccept, onAdjustPrice, onSetCustomPrice, onChooseDifferentPlan, disabled,
}) {
  const custom = rec.status === "custom_review";
  const recurring = purchaseType === "Recurring";
  const adjusted = finalPrice != null && finalPrice !== rec.recommendedPrice;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Recommended Service</p>
        <p className="text-lg font-semibold text-foreground">{tierName}</p>
        <p className="text-sm text-muted-foreground">{recurring ? "Recurring Monthly" : "One-Time Property Care Visit"}</p>
      </div>

      {propertySummary && (
        <div className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
          {propertySummary}
        </div>
      )}

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Base service price</span>
          <span className="font-medium">{formatPricePlusVat(rec.basePrice, { perMonth: recurring })}</span>
        </div>
        {rec.additionalUnits > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{rec.additionalUnits} additional separately checked {rec.additionalUnits === 1 ? "unit" : "units"}</span>
            <span className="font-medium">+{formatPricePlusVat(rec.unitAdjustment, { perMonth: recurring })}</span>
          </div>
        )}
        <div className="flex justify-between gap-3 pt-1.5 border-t border-border">
          <span className="text-muted-foreground font-medium">Recommended service price</span>
          <span className="font-semibold">{formatPricePlusVat(rec.recommendedPrice, { perMonth: recurring })}</span>
        </div>
        {adjusted && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Final agreed price (staff adjusted)</span>
            <span className="font-semibold text-primary">{formatPricePlusVat(finalPrice, { perMonth: recurring })}</span>
          </div>
        )}
      </div>

      {custom ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5">
          <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> CUSTOM PRICING REVIEW REQUIRED
          </p>
          <ul className="text-xs text-amber-700/90 list-disc pl-4 space-y-0.5">
            {rec.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <p className="text-xs text-amber-700/80">No price is set automatically — staff must set and approve a custom price.</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{PRICING_NOTE}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {custom ? (
          <>
            <Button onClick={onSetCustomPrice} disabled={disabled} className="h-11 px-5">Set Custom Price</Button>
            <Button variant="outline" onClick={onChooseDifferentPlan} className="h-11 px-5">Choose Different Plan</Button>
          </>
        ) : (
          <>
            <Button onClick={onAccept} disabled={disabled} className="h-11 px-5">Accept Recommendation</Button>
            <Button variant="outline" onClick={onAdjustPrice} disabled={disabled} className="h-11 px-5">Adjust Price</Button>
            <Button variant="ghost" onClick={onChooseDifferentPlan} disabled={disabled} className="h-11 px-5">Choose Different Plan</Button>
          </>
        )}
      </div>
    </div>
  );
}