// Centralized customer/staff-facing display names for visit types.
// The stored enum value is NEVER changed — this only controls how a visit type
// is rendered on screens and in reports.

// One-time Property Assistance visit type (Correction #15). Shared constant so
// detection stays in one place.
export const PROPERTY_ASSISTANCE_TYPE = "Property Assistance";

export const VISIT_TYPE_LABELS = {
  "Initial Property Onboarding Inspection": "Initial Property Onboarding Visit",
  "Home Watch Inspection": "Home Watch Visit",
  "Property Care Inspection": "Property Care Visit",
  "Departure Inspection": "Departure Visit",
};

export function visitTypeLabel(vt) {
  if (!vt) return "";
  return VISIT_TYPE_LABELS[vt] || vt;
}

// Checklist finding status display names: "Important" is shown as "Attention".
// The stored enum value is NEVER changed — this only controls on-screen wording.
export const CHECKLIST_STATUS_LABELS = { Important: "Attention" };

export function checklistStatusLabel(s) {
  return CHECKLIST_STATUS_LABELS[s] || s || "";
}