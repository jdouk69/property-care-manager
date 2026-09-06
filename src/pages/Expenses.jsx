import React from "react";
import { Wallet, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { base44 } from "@/api/base44Client";

const fields = [
  { name: "vendor", label: "Vendor", type: "text", required: true, placeholder: "e.g. Sklavenitis" },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "date", label: "Date", type: "date" },
  { name: "amount", label: "Amount (€)", type: "number" },
  { name: "paid_by", label: "Paid By", type: "text" },
  { name: "awaiting_reimbursement", label: "Awaiting Reimbursement", type: "boolean" },
  { name: "reimbursed", label: "Reimbursed", type: "boolean" },
  { name: "receipt_photo", label: "Receipt Photo", type: "image" },
  { name: "visit_id", label: "Linked Visit", type: "entity-select", entity: "PropertyVisit",
    optionLabel: (r) => `Visit — ${(r.start_time || "").slice(0, 10)} · ${r.visit_type || ""}` },
  { name: "maintenance_issue_id", label: "Linked Issue", type: "entity-select", entity: "MaintenanceIssue" },
  { name: "contractor_id", label: "Linked Contractor", type: "entity-select", entity: "Contractor" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const columns = [
  { key: "vendor", label: "Vendor", primary: true },
  { key: "property_id", label: "Property" },
  { key: "date", label: "Date" },
  { key: "amount", label: "Amount", render: (it) => `€${(it.amount || 0).toFixed(2)}` },
  { key: "reimbursed", label: "Status", badge: true, render: (it) => (it.reimbursed ? "reimbursed" : "pending") },
];

function TotalsSummary({ items }) {
  const { t } = useLanguage();
  const [props, setProps] = React.useState(null);
  React.useEffect(() => {
    base44.entities.Property.list("-created_date", 500).then((p) => setProps(p)).catch(() => setProps([]));
  }, []);
  if (!props) return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;
  const byProp = {};
  items.forEach((e) => { byProp[e.property_id] = (byProp[e.property_id] || 0) + (e.amount || 0); });
  const total = items.reduce((s, e) => s + (e.amount || 0), 0);
  const awaiting = items.filter((e) => e.awaiting_reimbursement && !e.reimbursed).reduce((s, e) => s + (e.amount || 0), 0);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">{t("Total expenses")}</p>
        <p className="text-xl font-semibold mt-1">€{total.toFixed(2)}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">{t("Awaiting reimbursement")}</p>
        <p className="text-xl font-semibold mt-1 text-amber-600">€{awaiting.toFixed(2)}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 col-span-2">
        <p className="text-xs text-muted-foreground mb-2">{t("By property")}</p>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {props.map((p) => byProp[p.id] ? (
            <div key={p.id} className="flex justify-between text-sm">
              <span className="truncate text-muted-foreground">{p.name}</span>
              <span className="font-medium">€{byProp[p.id].toFixed(2)}</span>
            </div>
          ) : null)}
          {!Object.keys(byProp).length && <p className="text-sm text-muted-foreground">{t("No expenses yet.")}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  // Phase 1: /expenses?add=1 (Home "Add Expense" / "Add Receipt") opens the form immediately.
  const [params] = useSearchParams();
  const autoOpen = params.get("add") === "1";
  return (
    <AppLayout>
      <ResourceListPage
        entityName="Expense"
        title="Expenses"
        subtitle="Owner expenses paid on their behalf"
        icon={Wallet}
        fields={fields}
        columns={columns}
        searchKeys={["vendor", "paid_by", "notes"]}
        autoOpen={autoOpen}
        addItemLabel="Add Expense"
        renderSummary={(items) => <TotalsSummary items={items} />}
        defaultValues={{ awaiting_reimbursement: false, reimbursed: false, amount: 0 }}
      />
    </AppLayout>
  );
}