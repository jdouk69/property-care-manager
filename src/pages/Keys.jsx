import React from "react";
import { KeyRound } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const fields = [
  { name: "key_number", label: "Key Number", type: "text", required: true, placeholder: "e.g. K-014" },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "current_holder", label: "Current Holder", type: "text" },
  { name: "date_issued", label: "Date Issued", type: "date" },
  { name: "date_returned", label: "Date Returned", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const columns = [
  { key: "key_number", label: "Key", primary: true },
  { key: "property_id", label: "Property" },
  { key: "current_holder", label: "Holder" },
  { key: "date_issued", label: "Issued" },
];

export default function Keys() {
  return (
    <AppLayout>
      <ResourceListPage
        entityName="Key"
        title="Keys"
        subtitle="Track key holders and returns"
        icon={KeyRound}
        fields={fields}
        columns={columns}
        searchKeys={["key_number", "current_holder"]}
        addItemLabel="Add Key"
      />
    </AppLayout>
  );
}