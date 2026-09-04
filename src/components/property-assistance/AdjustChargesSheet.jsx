import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { assistanceChargeBreakdown, computeAdditionalLabor, ADDITIONAL_TIME_OPTIONS } from "@/lib/propertyAssistance";

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

// Compact bottom sheet to adjust all Property Assistance charges mid-job
// (works while Scheduled or In Progress). Selecting an additional-time option
// sets a suggested additional-labor charge, but staff can override the amount.
export default function AdjustChargesSheet({ open, onOpenChange, visit, vatRate, hourlyRate = 40, onSaved }) {
  const [base, setBase] = useState(Number(visit.agreed_price) || 0);
  const [minutes, setMinutes] = useState(Number(visit.additional_minutes) || 0);
  const [additionalLabor, setAdditionalLabor] = useState(Number(visit.additional_labor_charge) || 0);
  const [travel, setTravel] = useState(Number(visit.travel_charge) || 0);
  const [materials, setMaterials] = useState(Number(visit.materials_charge) || 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBase(Number(visit.agreed_price) || 0);
      setMinutes(Number(visit.additional_minutes) || 0);
      setAdditionalLabor(Number(visit.additional_labor_charge) || 0);
      setTravel(Number(visit.travel_charge) || 0);
      setMaterials(Number(visit.materials_charge) || 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onMinutesChange = (m) => {
    setMinutes(m);
    setAdditionalLabor(computeAdditionalLabor(m, hourlyRate));
  };

  const { subtotal, vat, total } = assistanceChargeBreakdown({ base, additionalLabor, travel, materials, vatRate });

  const save = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.PropertyVisit.update(visit.id, {
        agreed_price: Number(base) || 0,
        additional_minutes: Number(minutes) || 0,
        additional_labor_charge: Number(additionalLabor) || 0,
        travel_charge: Number(travel) || 0,
        materials_charge: Number(materials) || 0,
      });
      onSaved(updated);
      onOpenChange(false);
    } catch (e) {
      alert("Could not save charges: " + (e?.message || e));
    }
    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Adjust Charges</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-3">
          <div className="space-y-1.5">
            <Label>Base service (incl. first 30 min)</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label>Additional time</Label>
            <Select value={String(minutes)} onValueChange={(v) => onMinutesChange(Number(v))}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ADDITIONAL_TIME_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} min{m > 0 ? ` · €${computeAdditionalLabor(m, hourlyRate).toFixed(0)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">€{hourlyRate}/hour, 15-min increments.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Additional labor charge</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={additionalLabor} onChange={(e) => setAdditionalLabor(e.target.value)} className="h-11" />
            <p className="text-xs text-muted-foreground">Override if needed.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Travel charge</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={travel} onChange={(e) => setTravel(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label>Materials / expenses</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={materials} onChange={(e) => setMaterials(e.target.value)} className="h-11" />
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5 text-sm">
            <Row label="Subtotal" value={`€${subtotal.toFixed(2)}`} />
            {vatRate ? <Row label={`VAT (${vatRate}%)`} value={`€${vat.toFixed(2)}`} /> : null}
            {vatRate ? <Row label="Total" value={`€${total.toFixed(2)}`} bold /> : null}
          </div>
          <Button onClick={save} disabled={saving} className="w-full h-12 rounded-2xl gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save charges
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}