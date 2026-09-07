// Billing classification for package visits — pure helpers (no platform deps).
//
// The app decides the default AUTOMATICALLY from real entitlement data:
// - an INCLUDED package visit (within the current period's allowance) is
//   classified "Included in Package" and never charged separately;
// - an ADDITIONAL visit (outside the allowance) defaults to "Additional -
//   Billable" with a staff-visible Billable checkbox override — unchecking
//   it before completion reclassifies the visit as "Courtesy - No Charge"
//   (full visit record kept, no customer charge).
// Stored values are English enums; display strings are translated via t().
import { isRecurringAgreement, recommendedVisitType } from "@/lib/activeService";

export const BILLING_CLASSIFICATIONS = [
  "Included in Package",
  "Additional - Billable",
  "Courtesy - No Charge",
];

// The automatic default decision. Returns "" for visits that are not package
// visits (one-time services, Property Assistance, Grocery, no-agreement
// properties) — those keep their own existing billing flows unchanged.
export function billingClassificationFor({ additionalService, billable, agreement, pkg, visitType }) {
  if (additionalService) return billable === false ? "Courtesy - No Charge" : "Additional - Billable";
  if (agreement && isRecurringAgreement(agreement) && visitType === recommendedVisitType(pkg)) {
    return "Included in Package";
  }
  return "";
}

// Inverse mapping for resume: restore the wizard state behind an ESTABLISHED
// classification. Returns null when the value is not one of the three
// classifications ("" — non-package visits, or a legacy draft saved before the
// classification was persisted) — callers then use the legacy live-derivation
// fallback exactly once.
export function classificationState(cls) {
  if (cls === "Included in Package") return { additionalService: false, billable: false };
  if (cls === "Additional - Billable") return { additionalService: true, billable: true };
  if (cls === "Courtesy - No Charge") return { additionalService: true, billable: false };
  return null;
}

// Badge tones for the classification, keyed by the RAW stored values.
export const BILLING_CLASSIFICATION_TONES = {
  "Included in Package": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Additional - Billable": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Courtesy - No Charge": "bg-sky-500/10 text-sky-600 border-sky-500/20",
};

export const billingClassificationTone = (cls) =>
  BILLING_CLASSIFICATION_TONES[cls] || "bg-muted text-muted-foreground border-border";