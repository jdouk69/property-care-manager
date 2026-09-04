import React from "react";
import { Package } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { VISIT_TYPES } from "@/lib/checklistSeed";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { formatPricePlusVat } from "@/lib/servicePricing";

const fields = [
  { name: "name", label: "Service Name", type: "text", required: true, placeholder: "e.g. Standard property care" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "standard_price", label: "Standard Price (€)", type: "number" },
  { name: "billing_type", label: "Billing Type", type: "select", options: ["One-time", "Monthly", "Quarterly", "Annual"] },
  { name: "recurring", label: "Frequency", type: "select", options: ["One-time", "Recurring"] },
  { name: "visit_duration", label: "Included Visit Duration", type: "text", placeholder: "e.g. 60 min" },
  { name: "hourly_charge", label: "Additional Hourly Charge (€)", type: "number" },
  { name: "travel_charge", label: "Travel Charge (€)", type: "number" },
  { name: "emergency_surcharge", label: "Emergency Surcharge (€)", type: "number" },
  { name: "vat_setting", label: "VAT Setting", type: "select", options: ["Included", "Exempt", "Standard 24%"] },
  { name: "active", label: "Active", type: "boolean" },
  {
    name: "default_visit_type",
    label: "Default Visit Type",
    type: "custom",
    render: (values, setField) => (
      <div>
        <Select value={values.default_visit_type || "__none__"} onValueChange={(v) => setField("default_visit_type", v === "__none__" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {VISIT_TYPES.map((vt) => <SelectItem key={vt} value={vt}>{visitTypeLabel(vt)}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1.5">Used to choose the default checklist/visit workflow when this service package is scheduled.</p>
      </div>
    ),
  },
];

const columns = [
  { key: "name", label: "Service", primary: true },
  {
    key: "standard_price",
    label: "Price",
    render: (it) =>
      it.vat_setting === "Standard 24%"
        ? formatPricePlusVat(it.standard_price, { perMonth: it.billing_type !== "One-time" })
        : `€${(it.standard_price || 0).toFixed(2)}`,
  },
  { key: "one_time_price", label: "One-Time", render: (it) => (it.one_time_price != null ? formatPricePlusVat(it.one_time_price) : "—") },
  { key: "billing_type", label: "Billing", badge: true },
  { key: "active", label: "Active", badge: true, render: (it) => (it.active ? "Yes" : "No") },
];

export default function ServicePackages() {
  return (
    <AppLayout>
      <ResourceListPage
        entityName="ServicePackage"
        title="Service Packages"
        subtitle="Define your services and pricing"
        icon={Package}
        fields={fields}
        columns={columns}
        searchKeys={["name", "description"]}
        addItemLabel="Add Service"
        defaultValues={{ billing_type: "Monthly", recurring: "Recurring", vat_setting: "Standard 24%", active: true, standard_price: 0 }}
      />
    </AppLayout>
  );
}