// Shared intake form schema — single source of truth for the public customer
// form (src/pages/IntakeForm.jsx) and the staff review/apply screen
// (src/pages/IntakeReview.jsx). A field may carry `map: { entity, field }`
// describing its canonical destination. Fields WITHOUT a map are kept in the
// intake payload as staff reference only and are NEVER auto-applied.

export const CLIENT_FIELDS = [
  "name", "email", "phone", "whatsapp", "country", "preferred_language",
  "preferred_communication_method", "billing_address", "tax_invoice_info",
  "emergency_contact_name", "emergency_contact_phone",
];

export const PROPERTY_FIELDS = [
  "name", "address", "property_type", "gps_coordinates", "special_notes",
  "key_location", "gate_code", "lockbox_code", "alarm_company",
  "alarm_instructions", "security_system", "security_camera",
  "electricity_provider", "electricity_account", "water_provider",
  "water_account", "internet_provider", "internet_account", "heating_fuel",
  "septic_details", "pool_details", "pool_equipment", "garden_details", "irrigation",
];

export const INTAKE_SECTIONS = [
  {
    id: "owner",
    title: "Owner Information",
    intro: "Tell us about yourself so we can reach you and prepare your invoice details.",
    fields: [
      { name: "full_name", label: "Full Name", type: "text", required: true, map: { entity: "Client", field: "name" } },
      { name: "email", label: "Email", type: "text", map: { entity: "Client", field: "email" } },
      { name: "phone", label: "Phone", type: "text", map: { entity: "Client", field: "phone" } },
      { name: "whatsapp", label: "WhatsApp Number", type: "text", map: { entity: "Client", field: "whatsapp" } },
      { name: "country", label: "Home Country", type: "text", map: { entity: "Client", field: "country" } },
      { name: "preferred_language", label: "Preferred Language", type: "select", options: ["English", "Greek"], map: { entity: "Client", field: "preferred_language" } },
      { name: "preferred_communication_method", label: "Preferred Communication", type: "select", options: ["WhatsApp", "Email", "Phone", "SMS"], map: { entity: "Client", field: "preferred_communication_method" } },
      { name: "billing_address", label: "Billing Address", type: "textarea", map: { entity: "Client", field: "billing_address" } },
      { name: "tax_invoice_info", label: "Tax / Invoice Information (if applicable)", type: "textarea", map: { entity: "Client", field: "tax_invoice_info" } },
    ],
  },
  {
    id: "property",
    title: "Property Information",
    intro: "Tell us about the property we will be caring for.",
    fields: [
      { name: "property_name", label: "Property Name", type: "text", required: true, map: { entity: "Property", field: "name" } },
      { name: "property_address", label: "Property Address", type: "textarea", map: { entity: "Property", field: "address" } },
      { name: "property_type", label: "Property Type", type: "select", options: ["Villa", "Apartment", "House", "Studio", "Cottage", "Commercial"], map: { entity: "Property", field: "property_type" } },
      { name: "gps_location", label: "GPS / Location (if useful)", type: "text", map: { entity: "Property", field: "gps_coordinates" } },
      { name: "property_description", label: "General Property Description", type: "textarea" },
      { name: "special_property_notes", label: "Special Property Notes", type: "textarea", map: { entity: "Property", field: "special_notes" } },
    ],
  },
  {
    id: "emergency",
    title: "Emergency Contact",
    fields: [
      { name: "emergency_contact_name", label: "Emergency Contact Name", type: "text", map: { entity: "Client", field: "emergency_contact_name" } },
      { name: "emergency_contact_phone", label: "Emergency Contact Phone", type: "text", map: { entity: "Client", field: "emergency_contact_phone" } },
      { name: "emergency_relationship_notes", label: "Relationship / Notes", type: "textarea" },
      { name: "emergency_communication_instructions", label: "Emergency Communication Instructions", type: "textarea" },
    ],
  },
  {
    id: "access",
    title: "Property Access",
    intro: "This sensitive access information is used only for property-care purposes and kept confidential.",
    fields: [
      { name: "key_location", label: "Key Location", type: "text", map: { entity: "Property", field: "key_location" } },
      { name: "gate_code", label: "Gate Code", type: "text", map: { entity: "Property", field: "gate_code" } },
      { name: "lockbox_code", label: "Lockbox Code", type: "text", map: { entity: "Property", field: "lockbox_code" } },
      { name: "alarm_company", label: "Alarm Company", type: "text", map: { entity: "Property", field: "alarm_company" } },
      { name: "alarm_instructions", label: "Alarm Instructions", type: "textarea", map: { entity: "Property", field: "alarm_instructions" } },
      { name: "security_system", label: "Security System Information", type: "text", map: { entity: "Property", field: "security_system" } },
      { name: "security_camera", label: "Security Camera Information", type: "text", map: { entity: "Property", field: "security_camera" } },
      { name: "other_access_instructions", label: "Other Access Instructions", type: "textarea" },
    ],
  },
  {
    id: "utilities",
    title: "Utilities",
    fields: [
      { name: "electricity_provider", label: "Electricity Provider", type: "text", map: { entity: "Property", field: "electricity_provider" } },
      { name: "electricity_account", label: "Electricity Account / Reference (optional)", type: "text", map: { entity: "Property", field: "electricity_account" } },
      { name: "water_provider", label: "Water Provider", type: "text", map: { entity: "Property", field: "water_provider" } },
      { name: "water_account", label: "Water Account / Reference", type: "text", map: { entity: "Property", field: "water_account" } },
      { name: "internet_provider", label: "Internet Provider", type: "text", map: { entity: "Property", field: "internet_provider" } },
      { name: "internet_account", label: "Internet Account / Reference", type: "text", map: { entity: "Property", field: "internet_account" } },
      { name: "heating_fuel", label: "Heating / Fuel Information", type: "text", map: { entity: "Property", field: "heating_fuel" } },
      { name: "septic_details", label: "Septic Information", type: "textarea", map: { entity: "Property", field: "septic_details" } },
      { name: "water_shutoff_location", label: "Water Shutoff Location", type: "text" },
      { name: "electrical_panel_location", label: "Electrical Panel / Main Shutoff Location", type: "text" },
    ],
  },
  {
    id: "pool_garden",
    title: "Pool, Garden & Exterior",
    fields: [
      { name: "pool_details", label: "Pool Details", type: "textarea", map: { entity: "Property", field: "pool_details" } },
      { name: "pool_equipment", label: "Pool Equipment Information", type: "textarea", map: { entity: "Property", field: "pool_equipment" } },
      { name: "garden_details", label: "Garden / Landscaping Details", type: "textarea", map: { entity: "Property", field: "garden_details" } },
      { name: "irrigation", label: "Irrigation Details", type: "textarea", map: { entity: "Property", field: "irrigation" } },
      { name: "exterior_concerns", label: "Exterior / Property Concerns", type: "textarea" },
    ],
  },
  {
    id: "contractors",
    title: "Preferred Contractors / Vendors",
    intro: "Optional. We review these and contact them only as needed. We will not add anyone to our records without your confirmation.",
    repeatable: "contractors",
    itemFields: [
      { name: "name", label: "Contractor / Vendor Name", type: "text" },
      { name: "service_type", label: "Service / Type", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    id: "service_needs",
    title: "Services You Are Interested In",
    intro: "Let us know which services you may be interested in. This is not a commitment — we will discuss and recommend the right plan.",
    special: "service-packages",
  },
  {
    id: "emergency_auth",
    title: "Emergency Authorization",
    fields: [
      { name: "emergency_repair_authorization", label: "Emergency Repair Authorization Preference", type: "textarea" },
      { name: "max_authorize_amount", label: "Maximum amount we may authorize without contacting you", type: "text" },
      { name: "unreachable_instructions", label: "Instructions if you cannot be reached", type: "textarea" },
    ],
  },
  {
    id: "arrival_prefs",
    title: "Owner Arrival Preferences",
    intro: "Optional. Help us prepare the property for your arrival.",
    fields: [
      { name: "arrival_cleaning", label: "Cleaning Preferences", type: "textarea" },
      { name: "arrival_pool", label: "Pool Preparation", type: "textarea" },
      { name: "arrival_garden", label: "Garden / Exterior Preparation", type: "textarea" },
      { name: "arrival_hvac", label: "Heating / AC Preference", type: "textarea" },
      { name: "arrival_grocery", label: "Refrigerator / Grocery Preparation Notes", type: "textarea" },
      { name: "arrival_other", label: "Other Arrival Instructions", type: "textarea" },
    ],
  },
  {
    id: "additional",
    title: "Additional Information",
    fields: [
      { name: "additional_notes", label: "Additional Notes", type: "textarea" },
      { name: "special_concerns", label: "Special Concerns About the Property", type: "textarea" },
      { name: "staff_should_know", label: "Anything we should know before the initial visit", type: "textarea" },
    ],
  },
];

// Flat list of all scalar field definitions (excludes repeatable + special sections).
export const SCALAR_FIELDS = INTAKE_SECTIONS.flatMap((s) => s.fields || []);

// Fields that map to a canonical entity (eligible for staff apply).
export const MAPPED_FIELDS = SCALAR_FIELDS.filter((f) => f.map);

// Build an empty payload object matching the full intake schema.
export function emptyPayload() {
  const p = {};
  SCALAR_FIELDS.forEach((f) => { p[f.name] = ""; });
  p.contractors = [];
  p.service_interest = [];
  return p;
}