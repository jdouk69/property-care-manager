import React from "react";
import { Package } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

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
];

const columns = [
  { key: "name", label: "Service", primary: true },
  { key: "standard_price", label: "Price", render: (it) => `€${(it.standard_price || 0).toFixed(2)}` },
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