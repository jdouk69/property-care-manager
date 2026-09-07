import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send, MailX } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { eur } from "@/lib/billing";
import { athensLongDate } from "@/lib/timezone";
import { finalizeInvoice, sendInvoiceEmail } from "@/lib/invoiceSend";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Recipient review before any email goes out. Nothing is sent automatically —
// the customer email and total due must be visible before confirming.
// Sending a Draft auto-finalizes it first (stated in the dialog). If
// finalization succeeds but the email fails, the invoice stays finalized and
// is NOT marked Sent — the error says so explicitly and retry stays possible.
export default function SendInvoiceDialog({ data, client, business, onClose, onSent }) {
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const invoice = data?.invoice;
  const property = { name: data?.propertyName || "" };
  if (!invoice) return null;

  const isResend = invoice.status === "Sent";
  const needsFinalize = invoice.status === "Draft" && !invoice.finalized_at;
  const email = String(client?.email || "").trim();

  const confirmSend = async () => {
    setError("");
    setSending(true);
    try {
      // 1. Auto-finalize Drafts first (explicitly shown in the dialog).
      const issuing = needsFinalize ? await finalizeInvoice(invoice) : invoice;
      // 2. Generate from the exact finalized snapshot and email the PDF link.
      const res = await sendInvoiceEmail({ invoice: issuing, client, business, property });
      if (!res.ok) {
        setError(needsFinalize
          ? t("Email delivery failed: {error}. The invoice was finalized but not marked Sent — you can retry.", { error: res.error })
          : t("Email delivery failed: {error}. The invoice was not marked Sent — you can retry.", { error: res.error }));
        setSending(false);
        return; // never mark Sent on failure
      }
      // 3. Success: mark Sent + record delivery. A resend keeps the original
      //    sent_at (no duplicate invoice, no history rewrite).
      if (!isResend) {
        const { base44 } = await import("@/api/base44Client");
        await base44.entities.Invoice.update(invoice.id, {
          status: "Sent",
          sent_at: new Date().toISOString(),
          sent_to: res.to,
        });
      }
      toast({ title: t("Invoice sent to {email}.", { email: res.to }) });
      onSent?.();
      onClose();
    } catch (e) {
      setError(t("Email delivery failed: {error}. The invoice was not marked Sent — you can retry.", { error: e?.message || String(e) }));
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isResend ? t("Resend Invoice?") : t("Send Invoice?")}</DialogTitle>
          <DialogDescription>
            {needsFinalize
              ? t("Sending will finalize this invoice first.")
              : isResend
                ? t("This invoice was already sent. Resending emails the same invoice again — no new invoice is created.")
                : t("Review the recipient before sending.")}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border p-3 space-y-2">
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground shrink-0">{t("Invoice")}</span>
            <span className="font-medium">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground shrink-0">{t("Recipient")}</span>
            <span className="font-medium break-all text-right">{email || "—"}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground shrink-0">{t("Total Due")}</span>
            <span className="font-semibold">{eur(invoice.total ?? 0)}</span>
          </div>
          {invoice.due_date && (
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground shrink-0">{t("Due Date")}</span>
              <span>{athensLongDate(invoice.due_date, lang)}</span>
            </div>
          )}
        </div>

        {!email ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <MailX className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-500">
                {t("No customer email address is available for this invoice.")}
              </p>
            </div>
            {invoice.client_id && (
              <Button asChild variant="outline" className="w-full h-11">
                <Link to={`/clients/${invoice.client_id}`} onClick={onClose}>{t("Update client record")}</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                <p className="text-xs text-rose-600 break-words">{error}</p>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="outline" className="h-11" onClick={onClose} disabled={sending}>{t("Cancel")}</Button>
              <Button className="h-11 px-6 gap-1.5" onClick={confirmSend} disabled={sending}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isResend ? t("Resend Invoice") : t("Send Invoice")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}