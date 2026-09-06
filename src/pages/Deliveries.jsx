import React from "react";
import { Truck } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const PURPOSES = ["Furniture", "Appliance", "Parcel", "Building materials", "Contractor access", "Utility technician", "Internet technician", "Cleaning"];

const fields = [
  { name: "company", label: "Company / Sender", type: "text", required: true, placeholder: "e.g. IKEA Delivery" },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "date", label: "Date", type: "date" },
  { name: "time_window", label: "Time Window", type: "text", placeholder: "e.g. 10:00–14:00" },
  { name: "contact_person", label: "Contact Person", type: "text" },
  { name: "purpose", label: "Purpose", type: "select", options: PURPOSES },
  { name: "access_instructions", label: "Access Instructions", type: "textarea" },
  { name: "key_used", label: "Key Used", type: "text" },
  { name: "items_received", label: "Items Received", type: "textarea" },
  { name: "damage_noted", label: "Damage Noted", type: "textarea" },
  { name: "completion_status", label: "Completion Status", type: "select", options: ["Pending", "Completed", "Issue"] },
  { name: "notes", label: "Notes", type: "textarea" },
  { name: "photos", label: "Photos", type: "images" },
];

const columns = [
  { key: "company", label: "Delivery", primary: true },
  { key: "property_id", label: "Property" },
  { key: "date", label: "Date" },
  { key: "purpose", label: "Purpose", badge: true },
  { key: "completion_status", label: "Status", badge: true },
];

export default function Deliveries() {
  return (
    <AppLayout>
      <ResourceListPage
        entityName="Delivery"
        title="Deliveries & Access"
        subtitle="Deliveries, contractor access and technician visits"
        emptyTitle="No deliveries & access yet"
        icon={Truck}
        fields={fields}
        columns={columns}
        searchKeys={["company", "contact_person", "items_received", "notes"]}
        addItemLabel="Add Delivery"
        defaultValues={{ purpose: "Parcel", completion_status: "Pending", date: new Date().toISOString().slice(0, 10) }}
      />
    </AppLayout>
  );
}