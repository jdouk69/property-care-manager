// Property Assistance — small one-time customer requests (no recurring setup).
// Reuses the PropertyVisit entity (visit_type "Property Assistance") rather than
// a parallel job system. No Service Agreement / intake / onboarding is required.

export const PROPERTY_ASSISTANCE_TYPE = "Property Assistance";
export const PROPERTY_ASSISTANCE_PACKAGE_NAME = "Property Assistance";
export const DEFAULT_ASSISTANCE_PRICE = 40;
export const DEFAULT_TRAVEL_CHARGE = 0;

// Staff-side default price comes from the Property Assistance ServicePackage
// (€40). Staff can always override per job; this is only the starting value and
// is never forced onto historical jobs.
export async function fetchAssistanceDefaultPrice(base44) {
  try {
    const pkgs = await base44.entities.ServicePackage.list("-created_date", 200);
    const pkg = (pkgs || []).find(
      (p) => p.name === PROPERTY_ASSISTANCE_PACKAGE_NAME && p.active
    );
    return pkg?.standard_price ?? DEFAULT_ASSISTANCE_PRICE;
  } catch (e) {
    return DEFAULT_ASSISTANCE_PRICE;
  }
}

export function assistanceTotalBeforeVat(price, travel) {
  return (Number(price) || 0) + (Number(travel) || 0);
}