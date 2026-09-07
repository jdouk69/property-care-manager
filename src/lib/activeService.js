import { VISIT_TYPES } from "@/lib/checklistSeed";
import { includedVisitsPerPeriod } from "@/lib/packageEntitlement";

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

// The ACTIVE SERVICE's real recurring frequency, derived from the same
// configuration the entitlement/billing logic uses — the agreement's billing
// period plus the package's included_visits_per_period allowance. The
// free-text inspection_frequency fields are NOT used here: they can hold
// stale onboarding defaults (e.g. "Weekly") that contradict the actual
// configuration. Returns { visits, periodWord } for a recurring service, or
// null for one-time services (callers show "One-time service" instead).
const PERIOD_WORD = { Monthly: "month", Quarterly: "quarter", Annual: "year" };

export function serviceFrequency(agreement, pkg) {
  if (!isRecurringAgreement(agreement)) return null;
  const billing = agreement?.billing_type || pkg?.billing_type || "Monthly";
  if (billing === "One-time") return null;
  return { visits: includedVisitsPerPeriod(pkg), periodWord: PERIOD_WORD[billing] || billing };
}

// Localized one-line display label for the same derived frequency — used by
// every staff-facing agreement display (Completed Visit detail, Client Hub
// agreement cards, activation review, onboarding handoff). Returns "" for
// one-time services.
export function serviceFrequencyText(agreement, pkg, t) {
  const f = serviceFrequency(agreement, pkg);
  return f ? t("{count} included visit(s) per {period}", { count: f.visits, period: t(f.periodWord) }) : "";
}