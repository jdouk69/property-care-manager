import React, { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { athensToday, athensMediumDate } from "@/lib/timezone";
import { eur, PAYMENT_METHODS } from "@/lib/billing";
import { paidTotalOf, balanceOf, submitPaymentAction, PAYMENT_EPS } from "@/lib/payments";
import PaymentHistoryList from "@/components/billing/PaymentHistoryList";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useToast } from "@/components/ui/use-toast";

// Unified payment recording for a ledger charge (BillingCharge) or an invoice
// (Invoice). This dialog IS the confirmation step: payments are recorded only
// when staff explicitly confirm here — never inferred from a QR scan, payment
// screenshot or invoice send. Partial payments are supported (the item stays
// open until the balance reaches zero); corrections void an entry with a
// required reason and the original stays visible (audit trail).
export default function RecordPaymentDialog({ open, onOpenChange, itemType = "BillingCharge", item, clientName = "", onSaved }) {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(athensToday());
  const [method, setMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [voidIndex, setVoidIndex] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidSaving, setVoidSaving] = useState(false);

  const isInvoice = itemType === "Invoice";
  const base = Number(item?.amount ?? item?.total ?? 0);
  const paid = paidTotalOf(item);
  const balance = balanceOf(item);
  const entries = (Array.isArray(item?.payments) ? item.payments : []).filter((e) => !e.voided);
  const blocked = isInvoice
    ? item?.status === "Cancelled"
    : item?.status === "Waived";
  const recordable = !blocked && !item?.archived && balance > PAYMENT_EPS;

  useEffect(() => {
    if (open && item) {
      setAmount(balanceOf(item).toFixed(2));
      setDate(athensToday());
      setMethod("Bank Transfer");
      setReference("");
      setError("");
      setVoidIndex(null);
      setVoidReason("");
      setSaving(false);
      setVoidSaving(false);
    }
  }, [open, item?.id]);

  if (!item) return null;

  const record = async () => {
    setError("");
    const amt = Number(amount);
    if (!(amt > 0)) { setError(t("Payment amount must be greater than zero")); return; }
    if (amt > balance + PAYMENT_EPS) { setError(t("The amount exceeds the remaining balance")); return; }
    setSaving(true);
    try {
      const res = await submitPaymentAction({
        entity: itemType, id: item.id, action: "record",
        payment: { amount: amt, date, method, reference },
      });
      toast({
        title: t("Payment recorded"),
        description: `${eur(res?.balance ?? balance)} ${t("remaining")}`,
      });
      onSaved?.(res?.record);
      onOpenChange(false);
    } catch (e) {
      setError(t(e?.message) || e?.message || t("Could not record the payment"));
      setSaving(false);
    }
  };

  const doVoid = async () => {
    setError("");
    if (!voidReason.trim()) { setError(t("A correction reason is required")); return; }
    setVoidSaving(true);
    try {
      await submitPaymentAction({
        entity: itemType, id: item.id, action: "void",
        voidIndex, voidReason: voidReason.trim(),
      });
      toast({ title: t("Payment corrected") });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      setError(t(e?.message) || e?.message || t("Could not record the payment"));
      setVoidSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Record Payment")}</DialogTitle>
          <DialogDescription>
            {clientName ? `${clientName} · ` : ""}
            {isInvoice ? item.invoice_number : (item.description || "")}
            {` · ${eur(base)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Balance recap */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border p-3">
            <div><p className="text-[11px] text-muted-foreground">{t("Amount")}</p><p className="text-sm font-semibold">{eur(base)}</p></div>
            <div><p className="text-[11px] text-muted-foreground">{t("Paid")}</p><p className="text-sm font-semibold text-emerald-600">{eur(paid)}</p></div>
            <div><p className="text-[11px] text-muted-foreground">{t("Balance")}</p><p className={`text-sm font-semibold ${balance > PAYMENT_EPS ? "text-amber-600" : ""}`}>{eur(balance)}</p></div>
          </div>

          {blocked ? (
            <p className="text-xs text-muted-foreground">
              {isInvoice ? t("Cancelled invoices cannot receive payments") : t("Waived charges cannot receive payments")}
            </p>
          ) : recordable ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("Amount received")}</Label>
                  <Input type="number" step="0.01" min="0" className="h-11" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{t("Paid date")}</Label>
                  <Input type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">{t("Payment method")}</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{t(m)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("Reference / note")}</Label>
                <Input className="h-11" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("e.g. bank transfer ref, IRIS payment ID")} />
              </div>
              {/* Explicit confirmation step */}
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Wallet className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {t("Confirm: record {amount} received on {date} via {method}?", {
                  amount: eur(Number(amount) || 0),
                  date: date ? athensMediumDate(date, lang) : "—",
                  method: t(method),
                })}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("Already fully paid")}</p>
          )}

          {/* Audit trail */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("Payment history")}</p>
            <PaymentHistoryList
              entries={entries}
              voidIndex={voidIndex}
              voidReason={voidReason}
              voidSaving={voidSaving}
              onVoidReasonChange={setVoidReason}
              onStartVoid={(i) => { setVoidIndex(i); setVoidReason(""); }}
              onCancelVoid={() => { setVoidIndex(null); setVoidReason(""); }}
              onVoidConfirm={doVoid}
            />
            {isInvoice && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {t("When this invoice is fully paid, its linked ledger charges are marked paid too.")}
              </p>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {!isInvoice && (
            <p className="text-[11px] text-muted-foreground">
              {t("Payments are recorded only after staff confirmation here — never from a QR scan, screenshot or invoice send.")}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={saving || voidSaving}>
            {t("Close")}
          </Button>
          {recordable && (
            <Button className="h-11 px-6" onClick={record} disabled={saving || voidSaving || !date || !(Number(amount) > 0)}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />} {t("Record Payment")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}