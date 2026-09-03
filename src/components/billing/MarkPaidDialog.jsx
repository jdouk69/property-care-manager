import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { athensToday } from "@/lib/timezone";
import { PAYMENT_METHODS, eur } from "@/lib/billing";

// One charge → one payment. No separate Payment entity, no partial payments:
// saving sets status = Paid and records paid date, method and reference.
export default function MarkPaidDialog({ charge, open, onOpenChange, onSaved }) {
  const [paidDate, setPaidDate] = useState(athensToday());
  const [method, setMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (charge) {
      setPaidDate(charge.paid_date || athensToday());
      setMethod(charge.payment_method || "Bank Transfer");
      setReference(charge.payment_reference || "");
      setSaving(false);
    }
  }, [charge?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.BillingCharge.update(charge.id, {
        status: "Paid",
        paid_date: paidDate,
        payment_method: method,
        payment_reference: reference,
      });
      onSaved?.();
    } catch (e) {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Paid</DialogTitle>
          <DialogDescription>
            {charge?.description} — {eur(charge?.amount)}{charge?.due_date ? ` · due ${charge.due_date}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm">Paid date</Label>
            <Input type="date" className="h-12 sm:text-base" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-12 sm:text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Reference / note</Label>
            <Input className="h-12 sm:text-base" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Wise transfer ref, bank note" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button className="h-11 px-6" onClick={save} disabled={saving || !paidDate}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark Paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}