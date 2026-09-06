import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Euro } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import ResourceListPage from "@/components/resource/ResourceListPage";
import BillingChargeCard from "@/components/billing/BillingChargeCard";
import BillingFilterBar from "@/components/billing/BillingFilterBar";
import MarkPaidDialog from "@/components/billing/MarkPaidDialog";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { athensToday, athensMediumDate } from "@/lib/timezone";
import { CHARGE_TYPES, displayStatus } from "@/lib/billing";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Billing() {
  const { t, lang } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [markPaidCharge, setMarkPaidCharge] = useState(null);
  const [reloadSignal, setReloadSignal] = useState(0);

  useEffect(() => {
    base44.entities.Property.list("-created_date", 500).then((l) => setProperties(l || [])).catch(() => {});
    base44.entities.Client.list("-created_date", 500).then((l) => setClients(l || [])).catch(() => {});
  }, []);

  const propName = (pid) => properties.find((p) => p.id === pid)?.name || "Property";

  const filterFn = (it) =>
    (statusFilter === "All" || displayStatus(it) === statusFilter) &&
    (clientFilter === "all" || it.client_id === clientFilter) &&
    (propertyFilter === "all" || it.property_id === propertyFilter);

  const waive = async (charge) => {
    if (!confirm(t("Mark this charge as Waived? It stays in history and no payment is expected."))) return;
    try {
      await base44.entities.BillingCharge.update(charge.id, { status: "Waived" });
      setReloadSignal((x) => x + 1);
    } catch (e) {}
  };

  const fields = useMemo(() => [
    { name: "client_id", label: "Client", type: "entity-select", entity: "Client", placeholder: "Select client" },
    {
      name: "property_id",
      label: "Property",
      type: "custom",
      render: (values, setField) => {
        // Property choices respect the selected Client where possible.
        const opts = values.client_id
          ? properties.filter((p) => p.owner_id === values.client_id)
          : properties;
        const list = values.property_id && !opts.some((p) => p.id === values.property_id)
          ? [...opts, properties.find((p) => p.id === values.property_id)].filter(Boolean)
          : opts;
        return (
          <Select value={values.property_id || ""} onValueChange={(v) => setField("property_id", v)}>
            <SelectTrigger className="sm:h-12 sm:text-base"><SelectValue placeholder="Select property" /></SelectTrigger>
            <SelectContent>
              {list.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    { name: "description", label: "Description", required: true, placeholder: "e.g. Standard Property Care — September" },
    { name: "charge_type", label: "Charge type", type: "select", options: CHARGE_TYPES, placeholder: "Select type" },
    { name: "amount", label: "Amount (€)", type: "number", required: true },
    { name: "billing_date", label: "Billing date", type: "date", required: true },
    { name: "due_date", label: "Due date", type: "date" },
    {
      name: "property_service_agreement_id", label: "Service agreement (optional)", type: "entity-select",
      entity: "PropertyServiceAgreement", placeholder: "Optional",
      optionLabel: (a) => `${t(a.billing_type || "Billing")} · €${(a.agreed_price || 0).toFixed(0)} · ${t(a.status)}`,
    },
    {
      name: "visit_id", label: "Linked visit (optional)", type: "entity-select",
      entity: "PropertyVisit", placeholder: "Optional",
      optionLabel: (v) => `${t(visitTypeLabel(v.visit_type))} · ${v.start_time ? athensMediumDate(v.start_time, lang) : ""}`,
    },
    {
      name: "expense_id", label: "Linked expense (optional)", type: "entity-select",
      entity: "Expense", placeholder: "Optional",
      optionLabel: (e) => `${e.vendor} · €${(e.amount || 0).toFixed(2)} · ${e.date || ""}`,
    },
    { name: "notes", label: "Notes", type: "textarea" },
  ], [properties, t, lang]);

  // Display-only renders: enums and dates localized at render time; stored
  // values are never touched. exportValue keeps the CSV export raw/stable —
  // identical regardless of the interface language (raw stored charge types,
  // payment methods, and YYYY-MM-DD dates).
  const columns = [
    { key: "description", primary: true },
    { key: "client_id" },
    { key: "property_id" },
    { key: "charge_type", render: (it) => (it.charge_type ? t(it.charge_type) : "—"), exportValue: (it) => it.charge_type || "—" },
    { key: "amount" },
    { key: "billing_date", render: (it) => (it.billing_date ? athensMediumDate(it.billing_date, lang) : "—"), exportValue: (it) => it.billing_date || "—" },
    { key: "due_date", render: (it) => (it.due_date ? athensMediumDate(it.due_date, lang) : "—"), exportValue: (it) => it.due_date || "—" },
    { key: "status", badge: true, enumContext: "charge" },
    { key: "paid_date", render: (it) => (it.paid_date ? athensMediumDate(it.paid_date, lang) : "—"), exportValue: (it) => it.paid_date || "—" },
    { key: "payment_method", render: (it) => (it.payment_method ? t(it.payment_method) : "—"), exportValue: (it) => it.payment_method || "—" },
  ];

  return (
    <>
      <ResourceListPage
        entityName="BillingCharge"
        title="Billing"
        subtitle="Track what clients owe — charges, dues, and payments"
        icon={Euro}
        addItemLabel="Add Charge"
        fields={fields}
        columns={columns}
        searchKeys={["description", "notes"]}
        archivable
        filterFn={filterFn}
        reloadSignal={reloadSignal}
        defaultValues={{ status: "Due", charge_type: "Service", billing_date: athensToday() }}
        sections={[
          { title: "Charge", fields: ["client_id", "property_id", "description", "charge_type", "amount"] },
          { title: "Dates", fields: ["billing_date", "due_date"] },
          { title: "Source Links (optional)", fields: ["property_service_agreement_id", "visit_id", "expense_id"] },
          { title: "Notes", fields: ["notes"] },
        ]}
        renderSummary={(items) => (
          <BillingFilterBar
            items={items}
            statusFilter={statusFilter} onStatusFilter={setStatusFilter}
            clientFilter={clientFilter} onClientFilter={setClientFilter} clientOptions={clients}
            propertyFilter={propertyFilter} onPropertyFilter={setPropertyFilter} propertyOptions={properties}
          />
        )}
        renderCard={(charge, lookups, { open }) => (
          <BillingChargeCard
            charge={charge}
            clientName={lookups.Client?.[charge.client_id]}
            propertyName={propName(charge.property_id)}
            onOpen={open}
            onMarkPaid={() => setMarkPaidCharge(charge)}
            onWaive={() => waive(charge)}
          />
        )}
      />
      <MarkPaidDialog
        charge={markPaidCharge}
        open={!!markPaidCharge}
        onOpenChange={(o) => { if (!o) setMarkPaidCharge(null); }}
        onSaved={() => {
          setMarkPaidCharge(null);
          setReloadSignal((x) => x + 1);
        }}
      />
    </>
  );
}