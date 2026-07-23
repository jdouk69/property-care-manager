import React from "react";
import { ListChecks } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const fields = [
  { name: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Weekly pool check" },
  { name: "type", label: "Type", type: "select", options: ["Inspection", "Contractor Meeting", "Delivery", "Shopping", "Owner Request", "Maintenance", "Custom"] },
  { name: "date", label: "Date", type: "date" },
  { name: "time", label: "Time", type: "time" },
  { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"] },
  { name: "assigned_to", label: "Assigned To", type: "text" },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "status", label: "Status", type: "select", options: ["Pending", "In Progress", "Completed", "Cancelled"] },
  { name: "recurring", label: "Recurring Schedule", type: "text", placeholder: "e.g. Every Monday" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const columns = [
  { key: "title", label: "Task", primary: true },
  { key: "date", label: "Date" },
  { key: "type", label: "Type", badge: true },
  { key: "priority", label: "Priority", badge: true },
  { key: "status", label: "Status", badge: true },
];

export default function Tasks() {
  return (
    <AppLayout>
      <ResourceListPage
        entityName="Task"
        title="Tasks"
        subtitle="Daily operations and to-dos"
        icon={ListChecks}
        fields={fields}
        columns={columns}
        searchKeys={["title", "assigned_to", "notes"]}
        addItemLabel="Add Task"
        defaultValues={{ status: "Pending", priority: "Medium", type: "Custom" }}
      />
    </AppLayout>
  );
}