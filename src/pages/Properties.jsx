import React from "react";
import { Link } from "react-router-dom";
import { Home, LayoutDashboard } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const fields = [
  { name: "name", label: "Property Name", type: "text", required: true, placeholder: "e.g. Villa Sunset" },
  { name: "address", label: "Address", type: "textarea" },
  { name: "maps_link", label: "Google Maps Link", type: "text", placeholder: "https://maps.app.goo.gl/…" },
  { name: "owner_id", label: "Owner", type: "entity-select", entity: "Client", placeholder: "Select client" },
  { name: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Seasonal", "Maintenance"] },
  { name: "gate_code", label: "Gate Code", type: "text" },
  { name: "alarm_instructions", label: "Alarm Instructions", type: "textarea" },
  { name: "wifi_ssid", label: "Wi-Fi Network", type: "text" },
  { name: "wifi_password", label: "Wi-Fi Password", type: "text" },
  { name: "utility_info", label: "Utility Information", type: "textarea" },
  { name: "pool_details", label: "Pool Details", type: "textarea" },
  { name: "garden_details", label: "Garden Details", type: "textarea" },
  { name: "special_notes", label: "Special Notes", type: "textarea" },
  { name: "photos", label: "Photos", type: "images" },
];

const columns = [
  { key: "name", label: "Property", primary: true },
  { key: "address", label: "Address" },
  { key: "owner_id", label: "Owner" },
  { key: "status", label: "Status", badge: true },
];

export default function Properties() {
  return (
    <AppLayout>
      <ResourceListPage
        entityName="Property"
        title="Properties"
        subtitle="Homes under your care"
        icon={Home}
        fields={fields}
        columns={columns}
        searchKeys={["name", "address"]}
        addItemLabel="Add Property"
        cardExtra={(item) => (
          <Link
            to={`/properties/${item.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1"
          >
            <LayoutDashboard className="w-3 h-3" /> Dashboard
          </Link>
        )}
      />
    </AppLayout>
  );
}