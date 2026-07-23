import React from "react";
import { HardHat } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const fields = [
  { name: "company", label: "Company", type: "text", required: true, placeholder: "e.g. Acme Electric" },
  { name: "contact_person", label: "Contact Person", type: "text" },
  { name: "phone", label: "Phone", type: "text" },
  { name: "email", label: "Email", type: "text" },
  { name: "trade", label: "Trade", type: "select", options: ["Electrician", "Plumber", "Pool", "Gardener", "Cleaner", "Painter", "Builder", "Locksmith", "HVAC", "Other"] },
  { name: "availability", label: "Availability", type: "text", placeholder: "e.g. Mon–Fri, 9–17" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const columns = [
  { key: "company", label: "Company", primary: true },
  { key: "contact_person", label: "Contact" },
  { key: "phone", label: "Phone" },
  { key: "trade", label: "Trade", badge: true },
];

export default function Contractors() {
  return (
    <AppLayout>
      <ResourceListPage
        entityName="Contractor"
        title="Contractors"
        subtitle="Trusted trades and service providers"
        icon={HardHat}
        fields={fields}
        columns={columns}
        searchKeys={["company", "contact_person", "trade", "phone"]}
        addItemLabel="Add Contractor"
        defaultValues={{ trade: "Other" }}
      />
    </AppLayout>
  );
}