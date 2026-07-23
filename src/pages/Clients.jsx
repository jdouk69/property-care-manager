import React from "react";
import { Users } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const fields = [
  { name: "name", label: "Client Name", type: "text", required: true, placeholder: "e.g. John Smith" },
  { name: "phone", label: "Phone", type: "text", placeholder: "+30 …" },
  { name: "email", label: "Email", type: "text", placeholder: "client@email.com" },
  { name: "country", label: "Country", type: "text", placeholder: "e.g. United Kingdom" },
  { name: "preferred_language", label: "Preferred Language", type: "select", options: ["English", "Greek"] },
  { name: "emergency_contact_name", label: "Emergency Contact Name", type: "text" },
  { name: "emergency_contact_phone", label: "Emergency Contact Phone", type: "text" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const columns = [
  { key: "name", label: "Name", primary: true },
  { key: "phone", label: "Phone", icon: Users },
  { key: "email", label: "Email" },
  { key: "country", label: "Country" },
  { key: "preferred_language", label: "Language", badge: true },
];

export default function Clients() {
  return (
    <AppLayout>
      <ResourceListPage
        entityName="Client"
        title="Clients"
        subtitle="Property owners and contacts"
        icon={Users}
        fields={fields}
        columns={columns}
        searchKeys={["name", "email", "phone", "country"]}
        addItemLabel="Add Client"
      />
    </AppLayout>
  );
}