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

const ONE_TIME_TIERS = ["Basic", "Standard", "Premium"];

const TIER_SERVICE_NAMES = {
  Basic: "Basic One-Time Property Check",
  Standard: "Standard One-Time Property Care Visit",
  Premium: "Premium One-Time Property Care Visit",
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