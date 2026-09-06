import { VISIT_TYPES } from "@/lib/checklistSeed";

// Shared helpers for linking a property's ACTIVE SERVICE (what the customer
// purchased — package/agreement) to TODAY'S VISIT (what staff is doing).
// The two concepts stay separate: these helpers only READ existing data —
// they never invent, duplicate or override packages, agreements or templates.

// Operational agreement = status Active AND signing_status Signed, not archived
// (same rule as Property Detail and VisitWizard).
export function findOperationalAgreements(agreements, propertyId) {
  return (agreements || []).filter(
    (a) => !a.archived && a.status === "Active" && a.signing_status === "Signed" && a.property_id === propertyId
  );
}

// purchase_type defaults to Recurring; only an explicit "One-time" is one-time.
export const isRecurringAgreement = (a) => (a?.purchase_type || "Recurring") !== "One-time";

// The visit type that represents the property's normal scheduled service.
// Only the package's own default_visit_type counts — never guessed.
export const recommendedVisitType = (pkg) =>
  pkg && VISIT_TYPES.includes(pkg.default_visit_type) ? pkg.default_visit_type : null;