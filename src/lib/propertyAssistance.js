// Property Assistance — small one-time customer requests (no recurring setup).
// Reuses the PropertyVisit entity (visit_type "Property Assistance") rather than
// a parallel job system. No Service Agreement / intake / onboarding is required.

export const PROPERTY_ASSISTANCE_TYPE = "Property Assistance";
export const PROPERTY_ASSISTANCE_PACKAGE_NAME = "Property Assistance";
export const DEFAULT_ASSISTANCE_PRICE = 50;
export const DEFAULT_TRAVEL_CHARGE = 0;

// Pricing model (Correction #16):
//   Minimum service call €50 — includes the first 30 minutes.
//   Additional labor €40/hour, billed in 15-minute increments.
//   Travel + materials are optional staff-entered amounts.
export const MIN_BASE_SERVICE = 50;
export const ADDITIONAL_LABOR_RATE = 40; // € / hour
export const INCREMENT_MINUTES = 15;

// Additional-time select options (minutes), 15-min increments up to 4 hours.
export const ADDITIONAL_TIME_OPTIONS = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240];

// additional_labor_charge = minutes / 60 × €40, rounded to 2 decimals.
// 15 min → €10, 30 → €20, 45 → €30, 60 → €40.
export function computeAdditionalLabor(minutes) {
  const m = Number(minutes) || 0;
  return Math.round(((m / 60) * ADDITIONAL_LABOR_RATE) * 100) / 100;
}

// Staff-side default price comes from the Property Assistance ServicePackage.
// Staff can always override per job; this is only the starting value and is
// never forced onto historical jobs.
export async function fetchAssistanceDefaultPrice(base44) {
  try {
    const pkgs = await base44.entities.ServicePackage.list("-created_date", 200);
    const pkg = (pkgs || []).find((p) => p.name === PROPERTY_ASSISTANCE_PACKAGE_NAME && p.active);
    return pkg?.standard_price ?? DEFAULT_ASSISTANCE_PRICE;
  } catch (e) {
    return DEFAULT_ASSISTANCE_PRICE;
  }
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