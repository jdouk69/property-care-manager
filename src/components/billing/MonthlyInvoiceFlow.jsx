import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, FilePlus2, Receipt, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { chargeMonthKey, eur } from "@/lib/billing";
import {
  buildInvoiceDraft, computeVatTotals, resolveVatRate, round2,
  findInvoiceContainingCharge, findInvoiceForPeriod,
} from "@/lib/invoiceGeneration";
import { localizedMonthLabel, localizedShortDate } from "@/lib/i18n/billingDisplay";
import InvoiceReviewModal from "@/components/invoices/InvoiceReviewModal";

// End-of-month guided invoice flow (Billing → Create Monthly Invoice):
// Client → Property (or All Properties) → Month → review the period's eligible
// Due charges → Create Invoice (existing buildInvoiceDraft + InvoiceReviewModal).
// The BillingCharge ledger stays the single source of truth — this flow never
// creates or regenerates charges; the invoice is a snapshot of reviewed charges.
//
// ELIGIBILITY: status Due, not archived, selected client, selected property
// (when one is chosen), billing month matches, not already on an ACTIVE
// invoice (Draft / Sent / Partially Paid / Overdue / Paid block; Cancelled or
// archived invoices do not). Paid / Waived charges are never invoiced here.
export default function MonthlyInvoiceFlow({ open, onOpenChange }) {
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const [clients, setClients] = useState([]);
  const [properties, setProperties] = useState([]);
  const [charges, setCharges] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [business, setBusiness] = useState({});
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [propertySel, setPropertySel] = useState("all");
  const [month, setMonth] = useState("");
  const [creating, setCreating] = useState(false);
  // Draft for the existing InvoiceReviewModal; while set, the flow dialog is
  // hidden so the review modal is the sole focus (no stacked dialogs).
  const [review, setReview] = useState(null);

  const refresh = async () => {
    try {
      const [ch, inv] = await Promise.all([
        base44.entities.BillingCharge.list("-created_date", 500),
        base44.entities.Invoice.list("-created_date", 500),
      ]);
      setCharges(ch || []);
      setInvoices(inv || []);
    } catch (e) {}
  };

  useEffect(() => {
    if (!open) return;
    setClientId(""); setPropertySel("all"); setMonth(""); setReview(null);
    setLoading(true);
    Promise.all([
      base44.entities.Client.list("-created_date", 500),
      base44.entities.Property.list("-created_date", 500),
      base44.entities.BillingCharge.list("-created_date", 500),
      base44.entities.Invoice.list("-created_date", 500),
      base44.entities.BusinessSettings.list().then((l) => (l || [])[0] || {}),
    ]).then(([c, p, ch, inv, b]) => {
      setClients((c || []).filter((x) => !x.archived && x.status !== "Inactive"));
      setProperties((p || []).filter((x) => !x.archived));
      setCharges(ch || []);
      setInvoices(inv || []);
      setBusiness(b);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open]);

  const client = clients.find((c) => c.id === clientId) || null;
  const clientProps = useMemo(() => properties.filter((p) => p.owner_id === clientId), [properties, clientId]);

  // Selectable months: those with at least one Due charge for the client.
  const months = useMemo(() => {
    if (!clientId) return [];
    const set = new Set();
    for (const ch of charges) {
      if (ch.archived || ch.status !== "Due" || ch.client_id !== clientId) continue;
      const k = chargeMonthKey(ch);
      if (k) set.add(k);
    }
    return [...set].sort((a, b) => String(b).localeCompare(String(a)));
  }, [charges, clientId]);

  const eligible = useMemo(() => {
    if (!clientId || !month) return [];
    const seen = new Set();
    const out = [];
    for (const ch of charges) {
      if (!ch || ch.archived) continue;
      if (ch.status !== "Due") continue;
      if (ch.client_id !== clientId) continue;
      if (propertySel !== "all" && ch.property_id !== propertySel) continue;
      if (chargeMonthKey(ch) !== month) continue;
      if (findInvoiceContainingCharge(invoices, ch.id)) continue;
      if (seen.has(ch.id)) continue;
      seen.add(ch.id);
      out.push(ch);
    }
    return out;
  }, [charges, invoices, clientId, propertySel, month]);

  // Ledger amounts exclude VAT; VAT is computed additively here (display) and
  // again at save in InvoiceReviewModal — same existing functions/settings.
  const rate = resolveVatRate(business);
  const subtotal = round2(eligible.reduce((s, c) => s + (c.amount || 0), 0));
  const { vat, total } = computeVatTotals(subtotal, rate);

  const propName = (pid) => properties.find((p) => p.id === pid)?.name || t("Property");

  const createInvoice = async () => {
    if (eligible.length === 0) return;
    // A specific property already has an active invoice for this month.
    if (propertySel !== "all") {
      const existing = findInvoiceForPeriod(invoices, propertySel, month);
      if (existing) {
        toast({
          title: t("Invoice already exists for {month}", { month: localizedMonthLabel(month, lang) || month }),
          description: t("{number} · {amount} — open it from the Invoices section.", { number: existing.invoice_number, amount: eur(existing.total) }),
        });
        return;
      }
    }
    // Stale-review safeguard: refetch and re-verify every reviewed charge is
    // still an uninvoiced Due charge before creating anything.
    setCreating(true);
    try {
      const [freshCharges, freshInvoices] = await Promise.all([
        base44.entities.BillingCharge.list("-created_date", 500),
        base44.entities.Invoice.list("-created_date", 500),
      ]);
      const chargeMap = new Map((freshCharges || []).map((c) => [c.id, c]));
      const stillEligible = eligible.filter((ch) => {
        const fresh = chargeMap.get(ch.id);
        return !!fresh && !fresh.archived && fresh.status === "Due" &&
          !findInvoiceContainingCharge(freshInvoices, fresh.id);
      });
      if (stillEligible.length !== eligible.length) {
        setCharges(freshCharges || []);
        setInvoices(freshInvoices || []);
        toast({
          title: t("Charges changed — list refreshed"),
          description: t("One or more charges are no longer uninvoiced. Review the updated list and try again."),
          variant: "destructive",
        });
        return;
      }
      const propertyNames = Object.fromEntries(properties.map((p) => [p.id, p.name]));
      setReview(buildInvoiceDraft({
        charges: eligible,
        propertyId: propertySel === "all" ? "" : propertySel,
        allProperties: propertySel === "all",
        propertyNames,
        client,
        invoices: freshInvoices || [],
      }));
    } catch (e) {
      toast({ title: t("Could not prepare the invoice"), description: e?.message || String(e), variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <>
      <Dialog open={open && !review} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Create Monthly Invoice")}</DialogTitle>
            <DialogDescription>{t("Review one billing period's uninvoiced Due charges and create a single invoice. Nothing is sent automatically.")}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              {/* 1. Client */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("Client")}</p>
                <Select value={clientId || ""} onValueChange={(v) => { setClientId(v); setPropertySel("all"); setMonth(""); }}>
                  <SelectTrigger className="h-11"><SelectValue placeholder={t("Select client")} /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Property — specific or all of the client's properties */}
              {clientId && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("Property")}</p>
                  <Select value={propertySel || "all"} onValueChange={setPropertySel}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("All Properties")}</SelectItem>
                      {clientProps.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 3. Billing month — months that have Due charges for this client */}
              {clientId && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("Billing month")}</p>
                  <Select value={month || ""} onValueChange={setMonth}>
                    <SelectTrigger className="h-11"><SelectValue placeholder={t("Select month")} /></SelectTrigger>
                    <SelectContent>
                      {months.map((m) => <SelectItem key={m} value={m}>{localizedMonthLabel(m, lang) || m}</SelectItem>)}
                      {months.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">{t("No charges due for this client.")}</p>}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 4. Eligible charge review + totals */}
              {month && (
                eligible.length > 0 ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto] px-3 py-2 bg-muted/50 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>{t("Description")}</span><span>{t("Amount")}</span>
                      </div>
                      <div className="divide-y divide-border">
                        {eligible.map((ch) => (
                          <div key={ch.id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm leading-snug break-words">{ch.description || t("Charge")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                                {propertySel === "all" && <span>{propName(ch.property_id)}</span>}
                                {ch.due_date && <span>{t("Due {date}", { date: localizedShortDate(ch.due_date, lang) })}</span>}
                              </p>
                            </div>
                            <span className="text-sm font-medium shrink-0">{eur(ch.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="px-3 py-2.5 bg-muted/30 space-y-1 border-t border-border">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("Subtotal")}</span><span>{eur(subtotal)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("VAT {rate}%", { rate })}</span><span>{eur(vat)}</span></div>
                        <div className="flex justify-between text-base font-semibold pt-1 border-t border-border"><span>{t("Total Due")}</span><span>{eur(total)}</span></div>
                      </div>
                    </div>
                    <Button className="w-full h-11 gap-1.5" onClick={createInvoice} disabled={creating}>
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />} {t("Create Invoice")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-500">{t("No uninvoiced charges are due for this period.")}</p>
                  </div>
                )
              )}

              {!clientId && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> {t("Paid, Waived and already-invoiced charges are never included.")}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Existing review-before-finalize modal: save as Draft → Download PDF. */}
      <InvoiceReviewModal
        open={!!review}
        onOpenChange={(o) => { if (!o) { setReview(null); refresh(); } }}
        draft={review}
        client={client}
        properties={properties}
        onSaved={refresh}
      />
    </>
  );
}