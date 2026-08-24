import React from "react";
import { Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const fields = [
  { name: "name", label: "Full Name", type: "text", required: true, placeholder: "e.g. James Whitfield" },
  { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
  { name: "phone", label: "Phone", type: "text" },
  { name: "whatsapp", label: "WhatsApp Number", type: "text" },
  { name: "email", label: "Email", type: "text" },
  { name: "country", label: "Home Country", type: "text" },
  { name: "preferred_language", label: "Preferred Language", type: "select", options: ["English", "Greek"] },
  { name: "preferred_communication_method", label: "Preferred Communication", type: "select", options: ["WhatsApp", "Email", "Phone", "SMS"] },
  { name: "emergency_contact_name", label: "Emergency Contact Name", type: "text" },
  { name: "emergency_contact_phone", label: "Emergency Contact Phone", type: "text" },
  { name: "billing_address", label: "Billing Address", type: "textarea" },
  { name: "tax_invoice_info", label: "Tax / Invoice Information", type: "textarea" },
  { name: "special_instructions", label: "Special Instructions", type: "textarea" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const columns = [
  { key: "name", label: "Client", primary: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "country", label: "Country" },
  { key: "preferred_communication_method", label: "Contact", badge: true },
  { key: "status", label: "Status", badge: true },
];

export default function Clients() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  return (
    <AppLayout>
      <ResourceListPage
        entityName="Client"
        title="Clients"
        subtitle="Property owners and contacts"
        icon={Users}
        fields={fields}
        columns={columns}
        searchKeys={["name", "email", "phone", "country", "whatsapp"]}
        addItemLabel="Add Client"
        archivable
        defaultValues={{ status: "Active", preferred_language: "English", preferred_communication_method: "WhatsApp" }}
        onOpenItem={(item) => navigate(`/clients/${item.id}`)}
        autoOpenEditId={editId || undefined}
      />
    </AppLayout>
  );
}