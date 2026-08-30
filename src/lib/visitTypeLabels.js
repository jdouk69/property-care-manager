// Centralized customer/staff-facing display names for visit types.
// The stored enum value is NEVER changed — this only controls how a visit type
// is rendered on screens and in reports.
export const VISIT_TYPE_LABELS = {
  "Initial Property Onboarding Inspection": "Initial Property Onboarding Visit",
};

export function visitTypeLabel(vt) {
  if (!vt) return "";
  return VISIT_TYPE_LABELS[vt] || vt;
}