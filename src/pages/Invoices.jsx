import React, { useEffect, useState } from "react";
import { Receipt, FileDown, Loader2, CheckCircle2, Lock, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";
import RecordPaymentDialog from "@/components/billing/RecordPaymentDialog";
import FinalizeInvoiceDialog from "@/components/invoices/FinalizeInvoiceDialog";
import SendInvoiceDialog from "@/components/invoices/SendInvoiceDialog";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { presentInvoiceLineItems } from "@/lib/invoicePresentation";
import { athensMediumDate } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"];

const fields = [
  { name: "invoice_number", label: "Invoice Number", type: "text", required: true, placeholder: "INV-2026-001" },
  { name: "client_id", label: "Client", type: "entity-select", entity: "Client" },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "invoice_date", label: "Invoice Date", type: "date" },
  { name: "due_date", label: "Due Date", type: "date" },
  { name: "services", label: "Services", type: "textarea" },
  { name: "expenses_total", label: "Expenses Total (€)", type: "number" },
  { name: "reimbursements_total", label: "Reimbursements Total (€)", type: "number" },
  { name: "vat", label: "VAT (€)", type: "number" },
  { name: "total", label: "Total (€)", type: "number" },
  { name: "amount_paid", label: "Amount Paid (€)", type: "number" },
  { name: "status", label: "Status", type: "select", options: STATUSES, enumContext: "invoice" },
  { name: "payment_date", label: "Payment Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function Invoices() {
  const { t, lang } = useLanguage();
  const [business, setBusiness] = useState({});
  const [clients, setClients] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [paidDialog, setPaidDialog] = useState(null);
  const [finalizeDialog, setFinalizeDialog] = useState(null);
  const [sendDialog, setSendDialog] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    base44.entities.BusinessSettings.list().then((l) => setBusiness((l || [])[0] || {})).catch(() => {});
    // Full client records (billing address, country) so re-downloaded PDFs get
    // the same structured Bill To formatting as freshly created invoices.
    base44.entities.Client.list("-created_date", 500).then((l) => setClients(l || [])).catch(() => {});
  }, []);

  const downloadInvoicePdf = async (item, lookups) => {
    setDownloadingId(item.id);
    try {
      let invoice = item;
      // Draft-only presentation cleanup: old Drafts snapshot the
      // pre-enhancement recurring text; issued snapshots are never rewritten.
      if (item.status === "Draft" && Array.isArray(item.charge_ids) && item.charge_ids.length) {
        const [charges, agreements, packages] = await Promise.all([
          base44.entities.BillingCharge.list("-created_date", 500),
          base44.entities.PropertyServiceAgreement.list("-created_date", 500),
          base44.entities.ServicePackage.list("-created_date", 500),
        ]);
        invoice = { ...item, line_items: presentInvoiceLineItems(item, { charges, agreements, packages }) };
      }
      await generateInvoicePdf(invoice, {
        business,
        client: clients.find((c) => c.id === item.client_id) || { name: lookups?.Client?.[item.client_id] || "" },
        property: { name: lookups?.Property?.[item.property_id] || "" },
      });
    } catch (e) {
      // Actionable retry (app font rule): only surface the actionable font
      // failure — other PDF errors keep the existing silent behavior.
      if (String(e?.message || e).includes("font_load_failed")) {
        alert(t("The PDF fonts could not be downloaded. Please try again."));
      }
    }
    setDownloadingId(null);
  };

  // Display-only renders: invoice date localized at render time; column LABELS
  // stay English (CSV headers). exportValue keeps the CSV export raw/stable —
  // identical regardless of the interface language. Stored values are never touched.
  const columns = [
    { key: "invoice_number", label: "Invoice", primary: true },
    { key: "client_id", label: "Client" },
    { key: "property_id", label: "Property" },
    { key: "invoice_date", label: "Date", render: (it) => (it.invoice_date ? athensMediumDate(it.invoice_date, lang) : "—"), exportValue: (it) => it.invoice_date || "—" },
    { key: "total", label: "Total", render: (it) => `€${(it.total || 0).toFixed(2)}` },
    { key: "status", label: "Status", badge: true, enumContext: "invoice" },
  ];

  return (
    <AppLayout>
      <ResourceListPage
        entityName="Invoice"
        title="Invoices"
        subtitle="Internal invoicing and revenue tracking"
        icon={Receipt}
        fields={fields}
        columns={columns}
        searchKeys={["invoice_number", "services", "notes"]}
        addItemLabel="Add Invoice"
        archivable
        reloadSignal={reloadTick}
        canEditItem={(it) => it.status === "Draft" && !it.finalized_at}
        defaultValues={{ status: "Draft", total: 0, amount_paid: 0, vat: 0, expenses_total: 0, reimbursements_total: 0 }}
        renderSummary={(items) => {
          const outstanding = items
            .filter((i) => !["Paid", "Cancelled"].includes(i.status))
            .reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);
          const paid = items.reduce((s, i) => s + (i.amount_paid || 0), 0);
          return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("Outstanding balance")}</p><p className="text-xl font-semibold mt-1 text-amber-600">€{outstanding.toFixed(2)}</p></div>
              <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("Total received")}</p><p className="text-xl font-semibold mt-1 text-emerald-600">€{paid.toFixed(2)}</p></div>
              <div className="rounded-2xl border border-border bg-card p-4 col-span-2 lg:col-span-1"><p className="text-xs text-muted-foreground">{t("Invoices")}</p><p className="text-xl font-semibold mt-1">{items.length}</p></div>
            </div>
          );
        }}
        cardExtra={(item, lookups) => {
          const finalized = !!item.finalized_at;
          const sendable = !["Paid", "Cancelled"].includes(item.status);
          return (
            <div className="flex gap-1.5">
              {item.status === "Draft" && !finalized && (
                <button onClick={(e) => { e.stopPropagation(); setFinalizeDialog(item); }}
                  className="text-[11px] px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 inline-flex items-center gap-1 min-h-[32px]">
                  <Lock className="w-3 h-3" /> {t("Finalize")}
                </button>
              )}
              {sendable && (
                <button onClick={(e) => { e.stopPropagation(); setSendDialog({ invoice: item, propertyName: lookups?.Property?.[item.property_id] || "" }); }}
                  className="text-[11px] px-2.5 py-1 rounded-full border bg-sky-500/10 text-sky-600 border-sky-500/20 inline-flex items-center gap-1 min-h-[32px]">
                  <Send className="w-3 h-3" /> {item.status === "Sent" ? t("Resend") : t("Send")}
                </button>
              )}
              {!["Paid", "Cancelled"].includes(item.status) && (
                <button onClick={(e) => { e.stopPropagation(); setPaidDialog(item); }}
                  className="text-[11px] px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 inline-flex items-center gap-1 min-h-[32px]">
                  <CheckCircle2 className="w-3 h-3" /> {t("Mark Paid")}
                </button>
              )}
              {item.status === "Draft" && finalized && (
                <span className="text-xs px-2.5 py-1 rounded-full border bg-muted text-muted-foreground border-border inline-flex items-center min-h-[32px]">
                  {t("Finalized")}
                </span>
              )}
              <button onClick={(e) => { e.stopPropagation(); downloadInvoicePdf(item, lookups); }} disabled={downloadingId === item.id}
                className="text-[11px] px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1 min-h-[32px] disabled:opacity-50">
                {downloadingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />} PDF
              </button>
            </div>
          );
        }}
      />
      <RecordPaymentDialog
        itemType="Invoice"
        item={paidDialog}
        clientName={paidDialog ? (clients.find((c) => c.id === paidDialog.client_id)?.name || "") : ""}
        open={!!paidDialog}
        onOpenChange={(o) => { if (!o) setPaidDialog(null); }}
        onSaved={() => { setPaidDialog(null); setReloadTick((x) => x + 1); }}
      />
      <FinalizeInvoiceDialog
        invoice={finalizeDialog}
        onClose={() => setFinalizeDialog(null)}
        onFinalized={() => setReloadTick((x) => x + 1)}
      />
      <SendInvoiceDialog
        data={sendDialog}
        client={sendDialog ? clients.find((c) => c.id === sendDialog.invoice.client_id) || null : null}
        business={business}
        onClose={() => setSendDialog(null)}
        onSent={() => setReloadTick((x) => x + 1)}
      />
    </AppLayout>
  );
}