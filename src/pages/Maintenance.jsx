import React from "react";
import { Wrench } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const fields = [
  { name: "title", label: "Issue Title", type: "text", required: true, placeholder: "e.g. Leaking kitchen tap" },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"] },
  { name: "status", label: "Status", type: "select", options: ["Open", "Scheduled", "In Progress", "Completed", "Cancelled"] },
  { name: "contractor_id", label: "Assigned Contractor", type: "entity-select", entity: "Contractor" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "before_photos", label: "Before Photos", type: "images" },
  { name: "after_photos", label: "After Photos", type: "images" },
  { name: "completion_notes", label: "Completion Notes", type: "textarea" },
];

const columns = [
  { key: "title", label: "Issue", primary: true },
  { key: "property_id", label: "Property" },
  { key: "contractor_id", label: "Contractor" },
  { key: "priority", label: "Priority", badge: true },
  { key: "status", label: "Status", badge: true },
];

export default function Maintenance() {
  return (
    <AppLayout>
      <ResourceListPage
        entityName="MaintenanceIssue"
        title="Maintenance"
        subtitle="Track and resolve property issues"
        icon={Wrench}
        fields={fields}
        columns={columns}
        searchKeys={["title", "description", "completion_notes"]}
        addItemLabel="Log Issue"
        defaultValues={{ status: "Open", priority: "Medium" }}
      />
    </AppLayout>
  );
}