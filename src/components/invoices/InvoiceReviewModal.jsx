import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Download, Save } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";
import { eur, monthLabel } from "@/lib/billing";
import { computeVatTotals, resolveVatRate } from "@/lib/invoiceGeneration";
import { generateInvoicePdf } from "@/lib/invoicePdf";

// Review-before-finalize for a monthly ledger invoice (visit-report Review UX model).
// Save creates the Invoice as a Draft — nothing is emailed and nothing is
// marked Paid. The PDF is downloaded only when you choose.
export default function InvoiceReviewModal({ open, onOpenChange, draft, client, properties = [], onSaved }) {
  const { toast } = useToast();
  const [business, setBusiness] = useState({});
  const [number, setNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    base44.entities.BusinessSettings.list().then((l) => setBusiness((l || [])[0] || {})).catch(() => {});
  }, []);

  useEffect(() => {
    if (draft) {
      setNumber(draft.invoice_number);
      setInvoiceDate(draft.invoice_date);
      setDueDate(draft.due_date);
      setNotes(draft.notes || "");
      setSaved(null);
      setSaving(false);
      setDownloading(false);
    }
  }, [draft]);

  if (!draft) return null;

  const property = properties.find((p) => p.id === draft.property_id);
  const rate = resolveVatRate(business);
  const { vat, total } = computeVatTotals(draft.subtotal, rate);

  const save = async () => {
    if (!number.trim()) return;
    setSaving(true);
    try {
      const record = {
        invoice_number: number.trim(),
        client_id: draft.client_id,
        property_id: draft.property_id,
        billing_period: draft.billing_period,
        line_items: draft.line_items,
        charge_ids: draft.charge_ids,
        invoice_date: invoiceDate,
        due_date: dueDate,
        services: draft.line_items.map((it) => `${it.description} - ${eur(it.amount)}`).join("\n"),
        vat,
        total,
        amount_paid: 0,
        status: "Draft",
        notes: notes || "",
      };
      const created = await base44.entities.Invoice.create(record);
      setSaved(created);
      onSaved?.(created);
      toast({ title: `Invoice ${created.invoice_number} created`, description: "Saved as Draft — nothing was sent." });
    } catch (e) {
      toast({ title: "Could not create invoice", description: e?.message || String(e), variant: "destructive" });
    }
    setSaving(false);
  };

  const download = async () => {
    setDownloading(true);
    try {
      await generateInvoicePdf(saved, { business, client, property });
    } catch (e) {
      toast({ title: "Could not generate PDF", description: e?.message || String(e), variant: "destructive" });
    }
    setDownloading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Invoice — {monthLabel(draft.billing_period) || draft.billing_period}</DialogTitle>
          <DialogDescription>
            {draft.line_items.length} charge{draft.line_items.length === 1 ? "" : "s"} from the monthly ledger. Saving creates a Draft — nothing is sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Business */}
          <div className="flex items-center gap-2.5">
            {business.logo && (
              <Image src={business.logo} alt="Business logo" className="h-9 w-9 rounded-lg bg-white border border-border" fittingType="fit" />
            )}
            <div>
              <p className="text-sm font-semibold">{business.business_name || "Property Care"}</p>
              <p className="text-xs text-muted-foreground">{[business.phone, business.email].filter(Boolean).join(" · ")}</p>
            </div>
          </div>

          {/* Invoice facts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Invoice number</Label>
              <Input className="h-11" value={number} onChange={(e) => setNumber(e.target.value)} disabled={!!saved} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Invoice date</Label>
                <Input type="date" className="h-11" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} disabled={!!saved} />
              </div>
              <div>
                <Label className="text-xs">Due date</Label>
                <Input type="date" className="h-11" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!!saved} />
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Bill To</p>
            <p className="text-sm font-medium">{client?.name || "—"}</p>
            {client?.billing_address && <p className="text-xs text-muted-foreground">{client.billing_address}</p>}
            <p className="text-xs text-muted-foreground">Property: {property?.name || "—"}</p>
          </div>

          {/* Line items */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] px-3 py-2 bg-muted/50 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Description</span><span>Amount</span>
            </div>
            <div className="divide-y divide-border">
              {draft.line_items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2">
                  <span className="text-sm leading-snug break-words">{it.description}</span>
                  <span className="text-sm">{eur(it.amount)}</span>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 bg-muted/30 space-y-1 border-t border-border">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{eur(draft.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">VAT {rate}%</span><span>{eur(vat)}</span></div>
              <div className="flex justify-between text-base font-semibold pt-1 border-t border-border"><span>TOTAL DUE</span><span>{eur(total)}</span></div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea className="min-h-[64px] text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note for the invoice" disabled={!!saved} />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              {saved ? "Close" : "Cancel"}
            </Button>
            {saved ? (
              <Button className="h-11 px-6 gap-1.5" onClick={download} disabled={downloading}>
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
              </Button>
            ) : (
              <Button className="h-11 px-6 gap-1.5" onClick={save} disabled={saving || !number.trim() || !invoiceDate}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Invoice
              </Button>
            )}
          </div>
          {saved && (
            <p className="text-xs text-muted-foreground text-center">
              Saved as {saved.invoice_number} (Draft). You send it whenever you choose — nothing was emailed.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}