import React from "react";
import { useSearchParams } from "react-router-dom";
import { Wrench } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const CATEGORIES = ["Plumbing", "Electrical", "Pool", "Irrigation", "Garden", "Air conditioning", "Heating", "Appliance", "Internet", "Security", "Locksmith", "Cleaning", "Painting", "Building repair", "Pest control", "Storm damage", "Other"];
const PRIORITIES = ["Routine", "Medium", "High", "Emergency"];
const STATUSES = ["Reported", "Awaiting Owner Approval", "Approved", "Contractor Contacted", "Scheduled", "In Progress", "Waiting for Parts", "Waiting for Payment", "Completed", "Cancelled"];

const fields = [
  { name: "title", label: "Issue Title", type: "text", required: true, placeholder: "e.g. Leaking kitchen tap" },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "category", label: "Category", type: "select", options: CATEGORIES },
  { name: "priority", label: "Priority", type: "select", options: PRIORITIES },
  { name: "status", label: "Status", type: "select", options: STATUSES },
  { name: "description", label: "Description", type: "textarea" },
  { name: "reported_by", label: "Reported By", type: "text" },
  { name: "contractor_id", label: "Assigned Contractor", type: "entity-select", entity: "Contractor" },
  { name: "contractor_quotation", label: "Contractor Quotation (€)", type: "number" },
  { name: "owner_approval_status", label: "Owner Approval", type: "select", options: ["Pending", "Approved", "Rejected"] },
  { name: "scheduled_appointment", label: "Scheduled Appointment", type: "date" },
  { name: "cost_estimate", label: "Cost Estimate (€)", type: "number" },
  { name: "final_cost", label: "Final Cost (€)", type: "number" },
  { name: "payment_status", label: "Payment Status", type: "select", options: ["Unpaid", "Partially Paid", "Paid"] },
  { name: "before_photos", label: "Before Photos", type: "images" },
  { name: "during_photos", label: "During Photos", type: "images" },
  { name: "after_photos", label: "After Photos", type: "images" },
  { name: "completion_notes", label: "Completion Notes", type: "textarea" },
  { name: "warranty_info", label: "Warranty Information", type: "textarea" },
  { name: "follow_up_date", label: "Follow-up Inspection Date", type: "date" },
];

const columns = [
  { key: "title", label: "Issue", primary: true },
  { key: "property_id", label: "Property" },
  { key: "category", label: "Category", badge: true },
  { key: "priority", label: "Priority", badge: true },
  { key: "status", label: "Status", badge: true },
];

export default function Maintenance() {
  const [searchParams] = useSearchParams();
  const openId = searchParams.get("open") || undefined;
  // Phase 1: /maintenance?add=1 (Home "Log Issue") opens the form immediately.
  const autoOpen = searchParams.get("add") === "1";
  // /maintenance?property=<id> (Dashboard "View Issues") filters the list to
  // that property's open/unresolved issues.
  const propertyFilter = searchParams.get("property");
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
        autoOpen={autoOpen}
        autoOpenEditId={openId}
        archivable
        filterFn={propertyFilter ? (it) => it.property_id === propertyFilter && it.status !== "Completed" && it.status !== "Cancelled" : undefined}
        defaultValues={{ status: "Reported", priority: "Medium", category: "Other", reported_by: "Jim", owner_approval_status: "Pending", payment_status: "Unpaid" }}
      />
    </AppLayout>
  );
}