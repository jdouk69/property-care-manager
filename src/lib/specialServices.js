// Special-purpose one-time / add-on services (Owner Arrival Preparation,
// Emergency Visit, Owner-Rep Site Visit, Grocery Stocking, Seasonal, etc.).
//
// Prices come ONLY from the existing ServicePackage configuration — never
// hardcoded. Resolution uses the stable default_visit_type relationship
// (Admin → Services), not display names. Tier packages (Quick Check /
// Property Care / Complete Care) are excluded — they keep their own
// recurring / one-time / additional-visit pricing flows.

// Selectable special services, priced services first. The unpriced types
// remain schedulable but clearly show "Price Not Configured" — no price is
// ever invented for them.
export const SPECIAL_VISIT_TYPES = [
  "Owner Arrival Preparation",
  "Emergency Visit",
  "Owner Representative Site Visit",
  "Grocery Stocking",
  "Guest Arrival Preparation",
  "Owner Representative Construction Visit",
  "Departure Inspection",
  "Seasonal Opening",
  "Seasonal Closing",
];

// The ServicePackage that prices a special service: active, non-tier, and
// linked to this visit type via default_visit_type.
export function findSpecialServicePackage(packages, visitType) {
  return (
    (packages || []).find(
      (p) => p && p.active !== false && !p.service_tier && p.default_visit_type === visitType
    ) || null
  );
}

// Configured price for a special service. Returns { pkg, price } — price is
// null when no package is linked or no positive standard_price is configured.
export function specialServicePrice(packages, visitType) {
  const pkg = findSpecialServicePackage(packages, visitType);
  if (!pkg) return { pkg: null, price: null };
  const price = Number(pkg.standard_price);
  return { pkg, price: Number.isFinite(price) && price > 0 ? price : null };
}

// Is this visit record a special-purpose service visit? (Used for the
// post-completion, staff-confirmed service charge — Additional billable
// package visits keep their own AdditionalChargeCard flow.)
export function isSpecialServiceVisit(visit) {
  return !!visit && SPECIAL_VISIT_TYPES.includes(visit.visit_type);
}