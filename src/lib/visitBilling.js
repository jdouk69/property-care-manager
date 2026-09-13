// One-time visit billing (post-audit cleanup): when a tiered one-time
// property-care visit (Basic / Standard / Premium, created via the Service
// Setup flow) is COMPLETED, exactly ONE Due ledger charge is created at the
// locked agreed price. No payment collection, no recurring billing, no
// agreements — just an internal amount-owed entry in the existing ledger.
//
// Eligibility is deliberately narrow: ONLY visits whose pricing_snapshot was
// written by the governed Service Setup flow (purchase_type "One-time" + tier).
// Recurring-plan visits (billed by the recurring-charges workflow), Property
// Assistance, On-Demand, Arrival Preparation, Emergency, Grocery Stocking and
// Owner Representative visits are never auto-charged by this module.
import { base44 } from "@/api/base44Client";
import { athensToday, athensDateOffset } from "@/lib/timezone";
import { ON_DEMAND_ASSISTANCE_TYPE } from "@/lib/propertyAssistance";
import { SPECIAL_VISIT_TYPES } from "@/lib/specialServices";
import { visitTypeLabel } from "@/lib/visitTypeLabels";

const ONE_TIME_TIERS = ["Basic", "Standard", "Premium"];

// Customer-facing names per tier (internal Basic/Standard/Premium keys are
// preserved — only the ledger description text for NEW charges uses the
// package display names).
const TIER_SERVICE_NAMES = {
  Basic: "Quick Check One-Time Non-Subscriber Visit",
  Standard: "Property Care One-Time Non-Subscriber Visit",
  Premium: "Complete Care One-Time Non-Subscriber Visit",
};

// Matches the existing billing model: ledger amounts are the BASE price
// (excl. VAT); VAT is computed additively at invoice time (24%).
const NET_DUE_DAYS = 14;

export function isTieredOneTimeVisit(visit) {
  const snap = (visit && visit.pricing_snapshot) || {};
  return snap.purchase_type === "One-time" && ONE_TIME_TIERS.includes(snap.tier);
}

// Creates the single Due charge for a completed tiered one-time visit.
// DUPLICATE PROTECTION: if any charge already references this visit (visit_id),
// nothing is created — safe on re-completion or double-fired completion logic.
// Returns the created charge, or null when nothing was created.
export async function ensureOneTimeVisitCharge(visit, { clientId = "" } = {}) {
  if (!visit || visit.status !== "Completed" || !isTieredOneTimeVisit(visit)) return null;
  const amount = Number(visit.agreed_price);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const existing = await base44.entities.BillingCharge.filter({ visit_id: visit.id });
  if (existing && existing.length > 0) return null;

  const tier = visit.pricing_snapshot.tier;
  const charge = await base44.entities.BillingCharge.create({
    client_id: clientId || "",
    property_id: visit.property_id || "",
    visit_id: visit.id,
    description: `${TIER_SERVICE_NAMES[tier] || "One-Time Property Care Visit"} — one-time service`,
    amount,
    charge_type: "Visit",
    billing_date: athensToday(),
    due_date: athensDateOffset(NET_DUE_DAYS),
    status: "Due",
    source_key: `visit:${visit.id}`,
  });
  return charge;
}

// ADDITIONAL requested property-care visit: a recurring customer asks for
// another visit AFTER the package's included visits for the current service
// period are used (the visit is created with is_additional_service = true).
// NO approved price rule exists for additional visits, so nothing is ever
// auto-charged — staff must confirm the amount first (see
// AdditionalChargeCard). This function only executes after an explicit staff
// confirmation of the amount, creates exactly ONE Due ledger charge, and is
// duplicate-safe like the other charge builders (any existing charge for the
// visit blocks a second one).
export async function ensureAdditionalVisitCharge(visit, { clientId = "", amount } = {}) {
  // A COURTESY additional visit (billing_classification "Courtesy - No Charge")
  // is never charged — staff unchecked the Billable override before completing.
  if (!visit || visit.status !== "Completed" || !visit.is_additional_service || visit.billing_classification === "Courtesy - No Charge") return null;
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(amt) || amt <= 0) return null;

  const existing = await base44.entities.BillingCharge.filter({ visit_id: visit.id });
  if (existing && existing.length > 0) return null;

  return base44.entities.BillingCharge.create({
    client_id: clientId || "",
    property_id: visit.property_id || "",
    visit_id: visit.id,
    description: "Additional Same-Level Visit — additional service",
    amount: amt,
    charge_type: "Visit",
    billing_date: athensToday(),
    due_date: athensDateOffset(NET_DUE_DAYS),
    status: "Due",
    source_key: `visit:${visit.id}`,
  });
}

// Consolidated On-Demand Property Assistance (request-driven one-time
// service). On completion, exactly ONE Due ledger charge is created for the
// final approved service amount: base €70 + any approved additional-time
// charge (plus any staff-entered travel/materials that were part of the
// approved total in the charge review). Ledger amounts exclude VAT, matching
// the tiered one-time rule — VAT is added at invoice time.
// DUPLICATE PROTECTION: if any charge already references this visit, nothing
// is created — safe on re-completion or double-fired completion logic.
// Historical "Property Assistance" visits are never auto-charged here.
export async function ensureOnDemandAssistanceCharge(visit, { clientId = "" } = {}) {
  if (!visit || visit.status !== "Completed" || visit.visit_type !== ON_DEMAND_ASSISTANCE_TYPE) return null;
  const amount = Math.round((
    (Number(visit.agreed_price) || 0) +
    (Number(visit.additional_labor_charge) || 0) +
    (Number(visit.travel_charge) || 0) +
    (Number(visit.materials_charge) || 0)
  ) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const existing = await base44.entities.BillingCharge.filter({ visit_id: visit.id });
  if (existing && existing.length > 0) return null;

  return base44.entities.BillingCharge.create({
    client_id: clientId || "",
    property_id: visit.property_id || "",
    visit_id: visit.id,
    description: "On-Demand Property Assistance — one-time service",
    amount,
    charge_type: "Visit",
    billing_date: athensToday(),
    due_date: athensDateOffset(NET_DUE_DAYS),
    status: "Due",
    source_key: `visit:${visit.id}`,
  });
}

// SPECIAL-PURPOSE one-time / add-on service (Owner Arrival Preparation,
// Emergency Visit, Owner-Rep Site Visit, Grocery Stocking, Guest Arrival,
// Construction Visit, Departure, Seasonal). Executed ONLY after an explicit
// staff confirmation of the amount on the COMPLETED visit
// (SpecialServiceChargeCard) — scheduling and starting never charge, and no
// price is ever invented (the amount comes from the staff-confirmed input,
// normally prefilled from the price snapshotted on the visit at scheduling
// or the ServicePackage's configured standard_price).
// Grocery Stocking: this is the SERVICE fee only — the grocery purchase cost
// is captured separately on the visit and is never part of this charge.
// DUPLICATE PROTECTION: any existing charge for the visit blocks a second —
// safe on repeated taps and reopens.
export async function ensureSpecialServiceCharge(visit, { clientId = "", amount } = {}) {
  if (!visit || visit.status !== "Completed" || visit.is_additional_service) return null;
  if (!SPECIAL_VISIT_TYPES.includes(visit.visit_type)) return null;
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(amt) || amt <= 0) return null;

  const existing = await base44.entities.BillingCharge.filter({ visit_id: visit.id });
  if (existing && existing.length > 0) return null;

  return base44.entities.BillingCharge.create({
    client_id: clientId || "",
    property_id: visit.property_id || "",
    visit_id: visit.id,
    description: `${visitTypeLabel(visit.visit_type)} — one-time service`,
    amount: amt,
    charge_type: "Visit",
    billing_date: athensToday(),
    due_date: athensDateOffset(NET_DUE_DAYS),
    status: "Due",
    source_key: `visit:${visit.id}`,
  });
}