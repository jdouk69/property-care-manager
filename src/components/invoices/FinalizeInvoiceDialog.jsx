import React, { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { finalizeInvoice } from "@/lib/invoiceSend";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Finalize confirmation — locks the invoice for issuance. Draft-only action.
// Marks nothing Paid and touches no linked BillingCharge.
export default function FinalizeInvoiceDialog({ invoice, onClose, onFinalized }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);

  if (!invoice) return null;

  const confirm = async () => {
    setSaving(true);
    try {
      const updated = await finalizeInvoice(invoice);
      toast({
        title: t("Invoice {number} finalized", { number: (updated || invoice).invoice_number }),
        description: t("Financial details and line items are now locked. Download PDF stays available."),
      });
      onFinalized?.(updated);
      onClose();
    } catch (e) {
      toast({ title: t("Could not finalize invoice"), description: e?.message || String(e), variant: "destructive" });
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Finalize Invoice?")}</DialogTitle>
          <DialogDescription>
            {t("Finalizing locks this invoice for issuance. Financial details and line items should no longer be changed after finalization.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" className="h-11" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
          <Button className="h-11 px-6 gap-1.5" onClick={confirm} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} {t("Finalize Invoice")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}