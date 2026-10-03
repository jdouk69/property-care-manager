// Centralized customer/staff-facing display names for visit types.
// The stored enum value is NEVER changed — this only controls how a visit type
// is rendered on screens and in reports.

// One-time Property Assistance visit type (Correction #15). Shared constant so
// detection stays in one place.
export const PROPERTY_ASSISTANCE_TYPE = "Property Assistance";

export const VISIT_TYPE_LABELS = {
  "Initial Property Onboarding Inspection": "Initial Property Onboarding Visit",
  // Package visit types display with their package's customer-facing name:
  // Quick Check (Basic), Property Care (Standard), Complete Care (Premium).
  "Home Watch Inspection": "Quick Check Visit",
  "Property Care Inspection": "Property Care Visit",
  "Complete Care Property Visit": "Complete Care Visit",
  "Departure Inspection": "Departure Visit",
};

export function visitTypeLabel(vt) {
  if (!vt) return "";
  return VISIT_TYPE_LABELS[vt] || vt;
}

// Checklist finding status display names: "Important" is shown as "Attention",
// "Normal" is shown as "OK". The stored enum value is NEVER changed — this only
// controls on-screen wording.
export const CHECKLIST_STATUS_LABELS = { Important: "Attention", Normal: "OK" };

export function checklistStatusLabel(s) {
  return CHECKLIST_STATUS_LABELS[s] || s || "";
}

// Quick Check (stored visit type "Home Watch Inspection") does NOT include
// routine photos or a customer-facing visit report — reports are excluded for
// this visit type everywhere (model, PDF, delivery queues, reminders).
export const QUICK_CHECK_TYPE = "Home Watch Inspection";

export function isQuickCheckVisit(v) {
  return !!v && v.visit_type === QUICK_CHECK_TYPE;
}

// Customer-report (EN/EL) visit type names. Staff UI keeps English via
// visitTypeLabel(); the PDF and owner email localize via visitTypeLabelFor().
const VISIT_TYPE_EL = {
  "Monthly Property Watch": "Μηνιαία Επίβλεψη Ακινήτου",
  "Owner Arrival Preparation": "Προετοιμασία Άφιξης Ιδιοκτήτη",
  "Guest Arrival Preparation": "Προετοιμασία Άφιξης Επισκεπτών",
  "Departure Inspection": "Επίσκεψη Αναχώρησης",
  "Seasonal Opening": "Εποχιακή Έναρξη",
  "Seasonal Closing": "Εποχιακό Κλείσιμο",
  "Owner Representative Construction Visit": "Επίσκεψη Εκπροσώπου Ιδιοκτήτη — Κατασκευές",
  "Home Watch Inspection": "Επίσκεψη Quick Check",
  "Property Care Inspection": "Επίσκεψη Φροντίδας Ακινήτου",
  "Complete Care Property Visit": "Επίσκεψη Complete Care",
  "Emergency Visit": "Επείγουσα Επίσκεψη",
  "Owner Representative Site Visit": "Επίσκεψη Εκπροσώπου Ιδιοκτήτη σε Χώρο",
  "Initial Property Onboarding Inspection": "Αρχική Επίσκεψη Ένταξης Ακινήτου",
  "Property Assistance": "Υποστήριξη Ακινήτου",
  "On-Demand Property Assistance": "Υποστήριξη Ακινήτου κατ' Απαίτηση",
  "Grocery Stocking": "Προμήθεια Τροφίμων",
};

export function visitTypeLabelFor(vt, lang = "en") {
  if (!vt) return "";
  if (lang === "el") return VISIT_TYPE_EL[vt] || VISIT_TYPE_LABELS[vt] || vt;
  return VISIT_TYPE_LABELS[vt] || vt;
}