import { base44 } from "@/api/base44Client";

// Phase 6C.1 + Step 7 — Recurring checklist generation is controlled by the
// property's CURRENT ACTIVE service agreement. The signed/activated agreement
// authorizes the service scope; Property.service_package_id is NEVER used as a
// fallback here. A monitoring priority is only eligible for the recurring
// template when it is active, explicitly approved for recurring visits, has
// non-empty staff-confirmed wording, and its recorded recurring_visit_type
// matches the current package's default visit type (newly approved priorities
// have no stamp and are eligible on first update). A successful (non-blocked)
// Update also stamps the monitoring-plan confirmation fields so Step 7 can
// distinguish "staff reviewed and confirmed (including zero custom checks)"
// from "not reviewed yet". This module never modifies master templates,
// ServicePackages, agreements, or any PropertyVisit record.

const OWNER_PREFIX = "OWNER PRIORITY · ";

// Resolve the property's current active service agreement + package + visit type.
// Requires exactly one Active, non-archived PropertyServiceAgreement.
export async function resolveServiceStatus(propertyId) {
  let agreements = [];
  try {
    agreements = await base44.entities.PropertyServiceAgreement.list("-created_date", 200);
  } catch (e) {}
  const active = (agreements || []).filter(
    (a) => a.property_id === propertyId && a.status === "Active" && !a.archived
  );
  if (active.length === 0) {
    return {
      status: "no_agreement",
      visitType: "",
      message: "No active service agreement is available for this property. Activate the current agreement before updating its recurring visit checklist.",
    };
  }
  if (active.length > 1) {
    return {
      status: "conflict",
      visitType: "",
      message: "Multiple active service agreements exist for this property. Resolve the agreement conflict before updating the recurring visit checklist.",
    };
  }
  const agreement = active[0];
  let pkg = null;
  if (agreement.service_package_id) {
    try { pkg = await base44.entities.ServicePackage.get(agreement.service_package_id); } catch (e) {}
  }
  const visitType = pkg?.default_visit_type || "";
  if (!visitType) {
    return {
      status: "no_visit_type",
      visitType: "",
      message: "The active service agreement's package has no default visit type. Review the service package before updating the recurring checklist.",
    };
  }
  return { status: "ok", visitType, agreement, package: pkg };
}

// Eligible: active, approved for recurring, confirmed wording, and either
// newly approved (no stamp) or stamped to the current visit type.
export function isEligibleForVisitType(p, visitType) {
  if (!p || p.active === false) return false;
  if (p.include_in_recurring !== true) return false;
  const text = typeof p.recurring_check_text === "string" ? p.recurring_check_text.trim() : "";
  if (!text) return false;
  return !p.recurring_visit_type || p.recurring_visit_type === visitType;
}

export function buildOwnerPriorityItems(priorities, visitType) {
  return (priorities || [])
    .filter((p) => isEligibleForVisitType(p, visitType))
    .map((p) => OWNER_PREFIX + p.recurring_check_text.trim());
}

export async function loadMasterTemplate(visitType) {
  const all = await base44.entities.ChecklistTemplate.list("-created_date", 500);
  return (all || []).filter((t) => !t.archived).find((t) => t.visit_type === visitType && (!t.property_id || t.is_master)) || null;
}

// Create / update / archive the property-specific recurring template for the
// CURRENT confirmed visit type only, and stamp the monitoring-plan
// confirmation. Blocked (no valid single active agreement) → no mutation.
export async function updateRecurringChecklist(propertyId) {
  const status = await resolveServiceStatus(propertyId);
  if (status.status !== "ok") {
    return { action: "noop", reason: status.status, message: status.message, visitType: "", blocked: true };
  }
  const { visitType } = status;

  const master = await loadMasterTemplate(visitType);
  if (!master) {
    return { action: "noop", reason: "no_master", visitType, message: `No active master checklist template exists for "${visitType}".`, blocked: true };
  }

  const property = await base44.entities.Property.get(propertyId);
  const masterItems = Array.isArray(master.items) ? master.items.slice() : [];
  const ownerItems = buildOwnerPriorityItems(property.monitoring_priorities, visitType);

  const all = await base44.entities.ChecklistTemplate.list("-created_date", 500);
  const existing = (all || []).find(
    (t) => t.property_id === propertyId && t.visit_type === visitType && !t.is_master
  );

  let result;
  if (ownerItems.length === 0) {
    if (existing && !existing.archived) {
      await base44.entities.ChecklistTemplate.update(existing.id, { archived: true });
      result = {
        action: "archived",
        visitType,
        itemCount: 0,
        message: `No approved recurring priorities for ${visitType}. Property-specific template archived — future visits use the package master. Monitoring plan confirmed (no custom recurring checks).`,
        blocked: false,
      };
    } else {
      result = {
        action: "noop",
        reason: "no_custom",
        visitType,
        itemCount: 0,
        message: `No priorities are approved for the current recurring service (${visitType}). Future visits use the package master. Monitoring plan confirmed (no custom recurring checks).`,
        blocked: false,
      };
    }
  } else {
    const items = [...masterItems, ...ownerItems];
    const name = `${property.name || "Property"} — ${visitType} (Recurring)`;
    if (existing) {
      await base44.entities.ChecklistTemplate.update(existing.id, { items, name, archived: false });
    } else {
      await base44.entities.ChecklistTemplate.create({
        name,
        visit_type: visitType,
        items,
        is_master: false,
        property_id: propertyId,
        archived: false,
      });
    }
    result = {
      action: existing ? "updated" : "created",
      visitType,
      itemCount: items.length,
      standardCount: masterItems.length,
      customCount: ownerItems.length,
      message: `Recurring checklist ${existing ? "updated" : "created"} — ${visitType} (${masterItems.length} standard + ${ownerItems.length} owner-priority). Monitoring plan confirmed.`,
      blocked: false,
    };
  }

  // Stamp priority visit types (no-op for non-eligible) AND the monitoring-plan
  // confirmation for the current visit type — applies whether custom checks
  // were added or staff confirmed none. A later visit-type change invalidates
  // the confirmation until staff reconfirms.
  const stamped = (property.monitoring_priorities || []).map((p) =>
    isEligibleForVisitType(p, visitType) ? { ...p, recurring_visit_type: visitType } : p
  );
  let confirmedBy = "";
  try {
    const me = await base44.auth.me();
    confirmedBy = me?.full_name || me?.id || "";
  } catch (e) {}
  try {
    await base44.entities.Property.update(propertyId, {
      monitoring_priorities: stamped,
      monitoring_plan_confirmed_at: new Date().toISOString(),
      monitoring_plan_visit_type: visitType,
      monitoring_plan_confirmed_by: confirmedBy,
    });
  } catch (e) {}

  return result;
}

// Staff explicitly reconfirms a priority for the current service: clears its old
// visit-type stamp, saves, then rebuilds (which re-stamps + re-confirms).
export async function reconfirmPriorityForCurrentService(propertyId, index) {
  const property = await base44.entities.Property.get(propertyId);
  const priorities = (property.monitoring_priorities || []).slice();
  if (index < 0 || index >= priorities.length) {
    return { action: "noop", reason: "not_found", message: "Priority not found.", blocked: true };
  }
  priorities[index] = { ...priorities[index], recurring_visit_type: "" };
  await base44.entities.Property.update(propertyId, { monitoring_priorities: priorities });
  return updateRecurringChecklist(propertyId);
}