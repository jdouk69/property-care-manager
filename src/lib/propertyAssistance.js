// One-time request-driven assistance (no recurring setup). Reuses the
// PropertyVisit entity rather than a parallel job system. No Service
// Agreement / intake / onboarding is required.
//
// CONSOLIDATION: the old "Property Assistance" (€50 + €40/h) and
// "On-Demand Property Care Visit" (€70) services are now ONE customer-facing
// service — "On-Demand Property Assistance" (€70 + VAT, first 30 minutes
// included, additional time €45/hour + VAT). Historical "Property Assistance"
// records are preserved untouched and keep their original pricing.

export const PROPERTY_ASSISTANCE_TYPE = "Property Assistance";          // historical records only
export const PROPERTY_ASSISTANCE_PACKAGE_NAME = "Property Assistance"; // retired package (inactive)
export const DEFAULT_ASSISTANCE_PRICE = 50;
export const DEFAULT_TRAVEL_CHARGE = 0;

// Legacy pricing model — applies only to historical "Property Assistance"
// records. Never used for new work.
export const MIN_BASE_SERVICE = 50;
export const ADDITIONAL_LABOR_RATE = 40; // € / hour
export const INCREMENT_MINUTES = 15;

// Consolidated service (all NEW work).
export const ON_DEMAND_ASSISTANCE_TYPE = "On-Demand Property Assistance";
export const ON_DEMAND_ASSISTANCE_PACKAGE_NAME = "On-Demand Property Assistance";
export const DEFAULT_ON_DEMAND_PRICE = 70;  // includes first 30 minutes
export const ON_DEMAND_HOURLY_RATE = 45;    // € / hour

// Additional-time select options (minutes), 15-min increments up to 4 hours.
export const ADDITIONAL_TIME_OPTIONS = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240];

// additional_labor_charge = minutes / 60 × rate, rounded to 2 decimals.
// The rate defaults to the legacy €40/h so historical record edits keep their
// original pricing; the consolidated On-Demand flow passes €45 explicitly.
export function computeAdditionalLabor(minutes, rate = ADDITIONAL_LABOR_RATE) {
  const m = Number(minutes) || 0;
  const r = Number(rate) || ADDITIONAL_LABOR_RATE;
  return Math.round(((m / 60) * r) * 100) / 100;
}

// Staff-side default price for NEW requests comes from the consolidated
// On-Demand Property Assistance ServicePackage (€70). Historical jobs are
// never re-priced — their agreed price is stored on the visit record.
export async function fetchAssistanceDefaultPrice(base44) {
  try {
    const pkgs = await base44.entities.ServicePackage.list("-created_date", 200);
    const pkg = (pkgs || []).find((p) => p.name === ON_DEMAND_ASSISTANCE_PACKAGE_NAME && p.active);
    return pkg?.standard_price ?? DEFAULT_ON_DEMAND_PRICE;
  } catch (e) {
    return DEFAULT_ON_DEMAND_PRICE;
  }
}

// Additional-time suggestion rate for the Adjust Charges sheet: €45/hour for
// the consolidated On-Demand service, legacy €40/hour for historical records.
export function assistanceHourlyRate(visitType) {
  return visitType === ON_DEMAND_ASSISTANCE_TYPE ? ON_DEMAND_HOURLY_RATE : ADDITIONAL_LABOR_RATE;
}

// Customer-facing service name for a record (consolidated vs historical).
export function assistanceServiceName(visitType) {
  return visitType === ON_DEMAND_ASSISTANCE_TYPE ? ON_DEMAND_ASSISTANCE_PACKAGE_NAME : PROPERTY_ASSISTANCE_PACKAGE_NAME;
}

// Charge breakdown from explicit stored charge values. VAT uses the passed
// BusinessSettings.vat_rate (live, pre-completion) — the frozen VAT amount and
// final total are stored on completion and read back from the record afterward.
export function assistanceChargeBreakdown({ base, additionalLabor, travel, materials, vatRate }) {
  const b = Number(base) || 0;
  const al = Number(additionalLabor) || 0;
  const t = Number(travel) || 0;
  const m = Number(materials) || 0;
  const subtotal = Math.round((b + al + t + m) * 100) / 100;
  const rate = Number(vatRate) || 0;
  const vat = rate ? Math.round(subtotal * rate) / 100 : 0;
  const total = Math.round((subtotal + vat) * 100) / 100;
  return { subtotal, vat, total };
}

// Legacy helper kept for any older callers (base + travel only).
export function assistanceTotalBeforeVat(price, travel) {
  return (Number(price) || 0) + (Number(travel) || 0);
}