import React from "react";
import { Package } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { VISIT_TYPES } from "@/lib/checklistSeed";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import ServicePackageCard from "@/components/services/ServicePackageCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const isRecurring = (v) => v.recurring === "Recurring";

const fields = [
  // ---- Service identity & billing configuration ----
  { name: "name", label: "Service Name", type: "text", required: true, placeholder: "e.g. Standard property care" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "service_tier", label: "Service Tier", type: "select", options: ["Basic", "Standard", "Premium"] },
  { name: "billing_type", label: "Billing Type", type: "select", options: ["One-time", "Monthly", "Quarterly", "Annual"] },
  { name: "recurring", label: "Frequency", type: "select", options: ["One-time", "Recurring"] },
  { name: "active", label: "Active", type: "boolean" },
  {
    name: "default_visit_type",
    label: "Default Visit Type",
    type: "custom",
    render: (values, setField, t) => (
      <div>
        <Select value={values.default_visit_type || "__none__"} onValueChange={(v) => setField("default_visit_type", v === "__none__" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder={t("None")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t("None")}</SelectItem>
            {VISIT_TYPES.map((vt) => <SelectItem key={vt} value={vt}>{t(visitTypeLabel(vt))}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1.5">{t("Used to choose the default checklist/visit workflow when this service package is scheduled.")}</p>
      </div>
    ),
  },
  // ---- Recurring package pricing (recurring services only) ----
  { name: "standard_price", label: "Standard Price (€)", type: "number" },
  { name: "included_visits_per_period", label: "Included Visits per Period", type: "number", showIf: isRecurring },
  { name: "additional_visit_price", label: "Additional Package Visit Price (€)", type: "number", showIf: isRecurring },
  { name: "visit_duration", label: "Included Visit Duration", type: "text", placeholder: "e.g. 60 min" },
  // ---- One-time service pricing ----
  { name: "one_time_price", label: "One-Time Inspection/Service Price (€)", type: "number" },
  // ---- Additional charges & tax ----
  { name: "hourly_charge", label: "Additional Hourly Charge (€)", type: "number" },
  { name: "emergency_surcharge", label: "Emergency Surcharge (€)", type: "number" },
  { name: "travel_charge", label: "Travel Charge (€)", type: "number" },
  { name: "vat_setting", label: "VAT Setting", type: "select", options: ["Included", "Exempt", "Standard 24%"] },
];

// Logical grouping so an admin can tell the pricing concepts apart:
// recurring price → included visits → included time → one-time price →
// additional package visit price → additional time rate.
const sections = [
  { title: "Service Details", fields: ["name", "description", "service_tier", "billing_type", "recurring", "active", "default_visit_type"] },
  { title: "Recurring Package Pricing", fields: ["standard_price", "included_visits_per_period", "additional_visit_price", "visit_duration"] },
  { title: "One-Time Service Pricing", fields: ["one_time_price"] },
  { title: "Additional Charges & Tax", fields: ["hourly_charge", "emergency_surcharge", "travel_charge", "vat_setting"] },
];

const columns = [
  { key: "name", label: "Service", primary: true },
  { key: "standard_price", label: "Price" },
  { key: "included_visits_per_period", label: "Included Visits" },
  { key: "one_time_price", label: "One-Time" },
  { key: "additional_visit_price", label: "Additional Visit" },
  { key: "hourly_charge", label: "Hourly" },
  { key: "billing_type", label: "Billing", badge: true },
  { key: "active", label: "Active", badge: true },
];

export default function ServicePackages() {
  const { t } = useLanguage();
  // Bind t() into the custom field render (display-only — stored package
  // values, prices and visit types are untouched).
  const fieldsWithT = fields.map((f) =>
    f.type === "custom" && f.render ? { ...f, render: (values, setField) => f.render(values, setField, t) } : f
  );
  return (
    <AppLayout>
      <ResourceListPage
        entityName="ServicePackage"
        title="Service Packages"
        subtitle="Define your services and pricing"
        icon={Package}
        fields={fieldsWithT}
        sections={sections}
        columns={columns}
        searchKeys={["name", "description"]}
        addItemLabel="Add Service"
        defaultValues={{ billing_type: "Monthly", recurring: "Recurring", vat_setting: "Standard 24%", active: true, standard_price: 0, included_visits_per_period: 1 }}
        renderCard={(item, _lookups, helpers) => <ServicePackageCard item={item} onOpen={helpers.open} />}
      />
    </AppLayout>
  );
}