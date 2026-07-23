import React from "react";
import { Receipt, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

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
  { name: "status", label: "Status", type: "select", options: STATUSES },
  { name: "payment_date", label: "Payment Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const columns = [
  { key: "invoice_number", label: "Invoice", primary: true },
  { key: "client_id", label: "Client" },
  { key: "property_id", label: "Property" },
  { key: "invoice_date", label: "Date" },
  { key: "total", label: "Total", render: (it) => `€${(it.total || 0).toFixed(2)}` },
  { key: "status", label: "Status", badge: true },
];

function downloadInvoicePdf(item, lookups) {
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(18); doc.setFont(undefined, "bold");
  doc.text("Invoice", 14, y); y += 8;
  doc.setFontSize(11); doc.setFont(undefined, "normal");
  doc.text(`Invoice #: ${item.invoice_number || "—"}`, 14, y); y += 6;
  doc.text(`Client: ${lookups?.Client?.[item.client_id] || "—"}`, 14, y); y += 6;
  doc.text(`Property: ${lookups?.Property?.[item.property_id] || "—"}`, 14, y); y += 6;
  doc.text(`Date: ${item.invoice_date || "—"}   Due: ${item.due_date || "—"}`, 14, y); y += 10;
  doc.text("Services:", 14, y); y += 6;
  const services = (item.services || "—").split("\n");
  services.forEach((s) => { doc.text(`  ${s}`, 14, y); y += 5; });
  y += 4;
  doc.text(`Expenses: €${(item.expenses_total || 0).toFixed(2)}`, 14, y); y += 5;
  doc.text(`Reimbursements: €${(item.reimbursements_total || 0).toFixed(2)}`, 14, y); y += 5;
  doc.text(`VAT: €${(item.vat || 0).toFixed(2)}`, 14, y); y += 5;
  doc.setFont(undefined, "bold");
  doc.text(`Total: €${(item.total || 0).toFixed(2)}`, 14, y); y += 6;
  doc.setFont(undefined, "normal");
  doc.text(`Amount Paid: €${(item.amount_paid || 0).toFixed(2)}`, 14, y); y += 6;
  doc.text(`Outstanding: €${((item.total || 0) - (item.amount_paid || 0)).toFixed(2)}`, 14, y); y += 6;
  doc.text(`Status: ${item.status || "—"}`, 14, y);
  doc.save(`${item.invoice_number || "invoice"}.pdf`);
}

export default function Invoices() {
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
        defaultValues={{ status: "Draft", total: 0, amount_paid: 0, vat: 0, expenses_total: 0, reimbursements_total: 0 }}
        renderSummary={(items) => {
          const outstanding = items
            .filter((i) => !["Paid", "Cancelled"].includes(i.status))
            .reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);
          const paid = items.reduce((s, i) => s + (i.amount_paid || 0), 0);
          return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Outstanding balance</p><p className="text-xl font-semibold mt-1 text-amber-600">€{outstanding.toFixed(2)}</p></div>
              <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Total received</p><p className="text-xl font-semibold mt-1 text-emerald-600">€{paid.toFixed(2)}</p></div>
              <div className="rounded-2xl border border-border bg-card p-4 col-span-2 lg:col-span-1"><p className="text-xs text-muted-foreground">Invoices</p><p className="text-xl font-semibold mt-1">{items.length}</p></div>
            </div>
          );
        }}
        cardExtra={(item, lookups) => (
          <button onClick={(e) => { e.stopPropagation(); downloadInvoicePdf(item, lookups); }}
            className="text-[11px] px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1">
            <FileDown className="w-3 h-3" /> PDF
          </button>
        )}
      />
    </AppLayout>
  );
}