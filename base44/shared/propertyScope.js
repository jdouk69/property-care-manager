export const SHORT_TERM_RENTAL_VILLA = "Short-term rental villa";
export const OWNER_OCCUPIED_EXTERIOR_ONLY = "Owner-occupied home — exterior-only";
export const EXTERIOR_ONLY_VISIT_TYPE = "Exterior-Only Property Visit";
export const EXTERIOR_ONLY_FOLLOWUP_VISIT_TYPE = "Exterior-Only Follow-up Visit";
export const EXTERIOR_ONLY_VISIT_TYPES = [EXTERIOR_ONLY_VISIT_TYPE, EXTERIOR_ONLY_FOLLOWUP_VISIT_TYPE];

export const EXTERIOR_ONLY_CHECKLIST = [
  "Exterior walls, visible damage or vandalism",
  "Grounds, paths and visible drainage",
  "Gates, fences and exterior access points",
  "Exterior doors and shutters — visible condition",
  "Windows — visible condition from outside only",
  "Visible signs of water leaks or storm damage outside",
  "Garden, balcony or pool areas visible from outside",
  "Photographs of exterior observations only",
  "Confirm no entry into the home or interior areas",
];

export function propertyScopeError(property, visitType, status = "", exteriorOnly = false) {
  if (status === "Cancelled") return null;
  if (!property?.service_scope) {
    return "Set the property's Service Scope before creating a visit.";
  }
  if ((exteriorOnly || property.service_scope === OWNER_OCCUPIED_EXTERIOR_ONLY) && !EXTERIOR_ONLY_VISIT_TYPES.includes(visitType)) {
    return "This property is exterior-only. Choose an exterior-only visit; interior visits and other service visits are not allowed.";
  }
  if (property.service_scope === SHORT_TERM_RENTAL_VILLA && property.property_type !== "Villa") {
    return "Short-term rental villa service scope requires the property type to be Villa.";
  }
  if (![SHORT_TERM_RENTAL_VILLA, OWNER_OCCUPIED_EXTERIOR_ONLY].includes(property.service_scope)) {
    return "Choose a valid Service Scope before creating a visit.";
  }
  return null;
}

export function accessScopeText(scope) {
  if (scope === SHORT_TERM_RENTAL_VILLA) {
    return "This property is a short-term rental villa. Interior entry is permitted only when no owner, guest, tenant, or other person is staying at the property at the time of the visit, and only for areas and tasks specifically included in this Agreement or separately agreed with the Owner in advance. If anyone is staying at the property, or occupancy is uncertain, do not enter; contact the Owner to reschedule or agree an exterior-only alternative. Do not enter any other area or perform any unlisted task. This scope controls any broader general access wording elsewhere in this Agreement.";
  }
  if (scope === OWNER_OCCUPIED_EXTERIOR_ONLY) {
    return "This is a private home where the Owner's personal belongings remain, and the service is exterior-only. We may visit and observe exterior areas only. We are not authorized to enter the residence or any interior area, and we do not accept keys or access codes for interior entry. If a concern appears to require interior access, stop, document only what is visible from outside, and contact the Owner. No interior service is permitted under this scope. This scope controls any broader general access wording elsewhere in this Agreement.";
  }
  return "Service scope is not selected. This Agreement cannot be sent until the property scope is recorded.";
}

export function agreementAccessScopeText(scope, exteriorOnly = false) {
  if (exteriorOnly) {
    return "This agreement is limited to exterior-only service. We may visit and observe exterior areas only. We are not authorized to enter the residence or any interior area, and no interior checks or services are included. If a concern appears to require interior access, stop, document only what is visible from outside, and contact the Owner. This agreement-specific exterior-only scope takes precedence over any broader property or package wording.";
  }
  return accessScopeText(scope);
}
