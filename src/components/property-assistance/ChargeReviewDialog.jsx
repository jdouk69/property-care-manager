import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { assistanceChargeBreakdown } from "@/lib/propertyAssistance";

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

// Final charge review shown when staff taps "Complete Job". Does NOT complete
// the job — only onConfirm() finalizes it. "Go Back / Adjust" reopens the
// Adjust Charges sheet without completing.
export default function ChargeReviewDialog({ open, onOpenChange, visit, serviceLabel = "Property Assistance", vatRate, onConfirm, onAdjust, saving }) {
  const base = Number(visit.agreed_price) || 0;
  const minutes = Number(visit.additional_minutes) || 0;
  const additionalLabor = Number(visit.additional_labor_charge) || 0;
  const travel = Number(visit.travel_charge) || 0;
  const materials = Number(visit.materials_charge) || 0;
  const { subtotal, vat, total } = assistanceChargeBreakdown({ base, additionalLabor, travel, materials, vatRate });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Complete {serviceLabel}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap">{visit.request_description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <Row label="Base service" value={`€${base.toFixed(2)}`} />
          {minutes > 0 || additionalLabor > 0 ? (
            <Row label={`Additional labor (${minutes} min)`} value={`€${additionalLabor.toFixed(2)}`} />
          ) : null}
          <Row label="Travel" value={`€${travel.toFixed(2)}`} />
          <Row label="Materials" value={`€${materials.toFixed(2)}`} />
          <div className="border-t border-border pt-2 space-y-2">
            <Row label="Subtotal" value={`€${subtotal.toFixed(2)}`} />
            {vatRate ? <Row label={`VAT (${vatRate}%)`} value={`€${vat.toFixed(2)}`} /> : null}
            {vatRate ? <Row label="Total" value={`€${total.toFixed(2)}`} bold /> : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button variant="outline" onClick={onAdjust} disabled={saving} className="h-12 rounded-2xl">
            Go Back / Adjust
          </Button>
          <Button onClick={onConfirm} disabled={saving} className="h-12 rounded-2xl gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Confirm & Complete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}