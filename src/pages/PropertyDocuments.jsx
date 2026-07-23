import React from "react";
import { FolderOpen } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const CATEGORIES = ["Quotes", "Invoices", "Contracts", "Warranties", "Manuals", "Insurance Documents", "Utility Documents", "Floor Plans", "Photos", "Miscellaneous Files"];

const fields = [
  { name: "name", label: "Document Title", type: "text", required: true, placeholder: "e.g. Pool pump warranty" },
  { name: "category", label: "Category", type: "select", options: CATEGORIES },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "client_id", label: "Client", type: "entity-select", entity: "Client" },
  { name: "maintenance_issue_id", label: "Maintenance Issue", type: "entity-select", entity: "MaintenanceIssue" },
  { name: "visit_id", label: "Visit", type: "entity-select", entity: "PropertyVisit" },
  { name: "invoice_id", label: "Invoice", type: "entity-select", entity: "Invoice" },
  { name: "file_url", label: "File / Photo", type: "image" },
  { name: "caption", label: "Caption", type: "text" },
  { name: "date_taken", label: "Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const columns = [
  { key: "name", label: "Document", primary: true },
  { key: "category", label: "Category", badge: true },
  { key: "property_id", label: "Property" },
  { key: "date_taken", label: "Date" },
];

export default function PropertyDocuments() {
  return (
    <AppLayout>
      <ResourceListPage
        entityName="PropertyDocument"
        title="Documents"
        subtitle="Organized by property, client, job and visit"
        icon={FolderOpen}
        fields={fields}
        columns={columns}
        searchKeys={["name", "caption", "notes"]}
        addItemLabel="Add Document"
        archivable
        defaultValues={{ category: "Miscellaneous Files", date_taken: new Date().toISOString().slice(0, 10) }}
      />
    </AppLayout>
  );
}