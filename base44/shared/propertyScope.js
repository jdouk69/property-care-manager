export const SHORT_TERM_RENTAL_VILLA = "Short-term rental villa";
export const OWNER_OCCUPIED_EXTERIOR_ONLY = "Owner-occupied home — exterior-only";
export const EXTERIOR_ONLY_VISIT_TYPE = "Exterior-Only Property Visit";
export const EXTERIOR_ONLY_FOLLOWUP_VISIT_TYPE = "Exterior-Only Follow-up Visit";
export const EXTERIOR_ONLY_VISIT_TYPES = [
  EXTERIOR_ONLY_VISIT_TYPE,
  EXTERIOR_ONLY_FOLLOWUP_VISIT_TYPE,
];

export function propertyScopeError(property, visitType = "", status = "") {
  if (status === "Cancelled") return "";
  const scope = property?.service_scope;
  if (scope === OWNER_OCCUPIED_EXTERIOR_ONLY) {
    return EXTERIOR_ONLY_VISIT_TYPES.includes(visitType)
      ? ""
      : "This property is exterior-only. Choose an exterior-only visit; interior visits and other service visits are not allowed.";
  }
  if (scope === SHORT_TERM_RENTAL_VILLA) {
    return property?.property_type === "Villa"
      ? ""
      : "Short-term rental villa service scope requires the property type to be Villa.";
  }
  return scope
    ? "Choose a valid Service Scope before creating a visit."
    : "Set the property's Service Scope before creating a visit.";
}

export function accessScopeText(property) {
  if (property?.service_scope === OWNER_OCCUPIED_EXTERIOR_ONLY) {
    return "This is an owner-occupied home and the service is exterior-only. We may visit and observe exterior areas only. We are not authorized to enter the residence or any interior area, and we do not accept keys or access codes for interior entry. If a concern appears to require interior access, stop, document only what is visible from outside, and contact the Owner. No interior service is permitted under this scope. This scope controls any broader general access wording elsewhere in this Agreement.";
  }
  return "This property is a short-term rental villa. Interior entry is permitted only for the areas and tasks specifically included in this Agreement or separately agreed with the Owner in advance. Do not enter any other area or perform any unlisted task. This scope controls any broader general access wording elsewhere in this Agreement.";
}