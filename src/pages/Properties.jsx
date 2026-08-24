import React from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Home, LayoutDashboard } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";
import PropertyLocationFields from "@/components/properties/PropertyLocationFields";

const fields = [
  { name: "name", label: "Property Name", type: "text", required: true, placeholder: "e.g. Villa Sunset" },
  { name: "owner_id", label: "Owner", type: "entity-select", entity: "Client" },
  { name: "property_type", label: "Property Type", type: "select", options: ["Villa", "Apartment", "House", "Studio", "Cottage", "Commercial"] },
  { name: "status", label: "Occupancy Status", type: "select", options: ["Vacant", "Owner Occupied", "Guest Occupied", "Rental Occupied", "Preparing for Arrival", "Preparing for Departure", "Under Maintenance", "Emergency", "Inactive"] },
  { name: "condition", label: "Current Condition", type: "select", options: ["Excellent", "Good", "Needs Attention", "Poor"] },
  { name: "location", type: "custom", render: (values, setField) => <PropertyLocationFields values={values} setField={setField} /> },
  { name: "primary_photo", label: "Primary Photo", type: "image" },
  { name: "photos", label: "Additional Photos", type: "images" },
  { name: "gate_code", label: "Gate Code", type: "text" },
  { name: "lockbox_code", label: "Lockbox Code", type: "text" },
  { name: "key_location", label: "Key Location", type: "text" },
  { name: "alarm_instructions", label: "Alarm Instructions", type: "textarea" },
  { name: "alarm_company", label: "Alarm Company", type: "text" },
  { name: "security_camera", label: "Security Camera Details", type: "textarea" },
  { name: "wifi_ssid", label: "Wi-Fi Name", type: "text" },
  { name: "wifi_password", label: "Wi-Fi Password", type: "text" },
  { name: "electricity_provider", label: "Electricity Provider", type: "text" },
  { name: "electricity_account", label: "Electricity Account No.", type: "text" },
  { name: "water_provider", label: "Water Provider", type: "text" },
  { name: "water_account", label: "Water Account No.", type: "text" },
  { name: "internet_provider", label: "Internet Provider", type: "text" },
  { name: "internet_account", label: "Internet Account No.", type: "text" },
  { name: "heating_fuel", label: "Heating Fuel Information", type: "textarea" },
  { name: "septic_details", label: "Septic / Sewer Details", type: "textarea" },
  { name: "utility_shutoff", label: "Utility Shutoff Locations", type: "textarea" },
  { name: "pool_details", label: "Pool Details", type: "textarea" },
  { name: "pool_equipment", label: "Pool Equipment", type: "textarea" },
  { name: "irrigation", label: "Irrigation", type: "textarea" },
  { name: "garden_details", label: "Garden Details", type: "textarea" },
  { name: "air_conditioning_units", label: "Air Conditioning Units", type: "textarea" },
  { name: "heating", label: "Heating", type: "textarea" },
  { name: "solar_water_heater", label: "Solar Water Heater", type: "textarea" },
  { name: "appliances", label: "Appliances", type: "textarea" },
  { name: "generator", label: "Generator", type: "textarea" },
  { name: "water_tanks", label: "Water Tanks", type: "textarea" },
  { name: "pumps", label: "Pumps", type: "textarea" },
  { name: "security_system", label: "Security System", type: "textarea" },
  { name: "service_package_id", label: "Service Package", type: "entity-select", entity: "ServicePackage" },
  { name: "monthly_fee", label: "Monthly Fee (€)", type: "number" },
  { name: "inspection_frequency", label: "Inspection Frequency", type: "text", placeholder: "e.g. Weekly" },
  { name: "included_services", label: "Included Services", type: "textarea" },
  { name: "additional_service_charges", label: "Additional Service Charges", type: "textarea" },
  { name: "start_date", label: "Service Start Date", type: "date" },
  { name: "renewal_date", label: "Renewal Date", type: "date" },
  { name: "special_notes", label: "Property Notes", type: "textarea" },
];

const columns = [
  { key: "name", label: "Property", primary: true },
  { key: "address", label: "Address" },
  { key: "owner_id", label: "Owner" },
  { key: "status", label: "Status", badge: true },
  { key: "condition", label: "Condition", badge: true },
];

export default function Properties() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ownerId = params.get("owner");
  const autoOpen = params.get("add") === "1";
  const defaultValues = { property_type: "Villa", status: "Vacant", condition: "Good", ...(ownerId ? { owner_id: ownerId } : {}) };
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
        archivable
        defaultValues={defaultValues}
        autoOpen={autoOpen}
        autoOpenEditId={params.get("edit") || undefined}
        saveLabel="Save Property"
        onCreated={(values) => {
          if (autoOpen && ownerId) navigate(`/clients/${ownerId}`);
        }}
        cardExtra={(item) => (
          <Link to={`/properties/${item.id}`} onClick={(e) => e.stopPropagation()}
            className="text-[11px] px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1">
            <LayoutDashboard className="w-3 h-3" /> Dashboard
          </Link>
        )}
      />
    </AppLayout>
  );
}