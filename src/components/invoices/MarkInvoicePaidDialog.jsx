import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { athensToday } from "@/lib/timezone";
import { eur } from "@/lib/billing";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Mark Invoice Paid — one-way sync: Invoice Paid -> linked BillingCharges (charge_ids) Paid.
// No partial payments, no reverse sync, no guessing for legacy invoices without charge_ids.
export default function MarkInvoicePaidDialog({ invoice, onClose, onPaid }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [paidDate, setPaidDate] = useState(athensToday());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invoice) { setPaidDate(athensToday()); setSaving(false); }
  }, [invoice?.id]);

  if (!invoice) return null;
  const chargeIds = Array.isArray(invoice.charge_ids) ? invoice.charge_ids : [];
  const chargeCount = chargeIds.length;

  const confirm = async () => {
    setSaving(true);
    try {
      await base44.entities.Invoice.update(invoice.id, {
        status: "Paid",
        amount_paid: invoice.total ?? 0,
        payment_date: paidDate,
      });
      // Only the charges explicitly listed in charge_ids — never property/month-wide.
      if (chargeCount > 0) {
        await base44.entities.BillingCharge.bulkUpdate(
          chargeIds.map((id) => ({ id, status: "Paid", paid_date: paidDate }))
        );
      }
      toast({
        title: t("{number} marked Paid", { number: invoice.invoice_number }),
        description: chargeCount
          ? t(chargeCount === 1 ? "{count} linked billing charge marked paid." : "{count} linked billing charges marked paid.", { count: chargeCount })
          : undefined,
      });
      onPaid?.();
      onClose();
    } catch (e) {
      toast({ title: t("Could not mark invoice paid"), description: e?.message || String(e), variant: "destructive" });
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Mark {number} as paid?", { number: invoice.invoice_number })}</DialogTitle>
          <DialogDescription>
            {chargeCount > 0
              ? t(chargeCount === 1 ? "This will also mark the {count} linked billing charge as paid." : "This will also mark the {count} linked billing charges as paid.", { count: chargeCount })
              : t("No linked billing charges — only the invoice will be marked paid.")}
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label className="text-xs">{t("Paid date")}</Label>
          <Input type="date" className="h-11" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">{t("Amount paid: {amount}", { amount: eur(invoice.total ?? 0) })}</p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" className="h-11" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
          <Button className="h-11 px-6 gap-1.5" onClick={confirm} disabled={saving || !paidDate}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {t("Mark Paid")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}