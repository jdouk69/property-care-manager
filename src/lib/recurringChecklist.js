import { base44 } from "@/api/base44Client";

// Phase 6C — Build / rebuild a property-specific recurring checklist template.
//
// The recurring checklist is ALWAYS: package-standard master items + ONLY the
// monitoring priorities a staff member has explicitly approved for recurring
// visits (active + include_in_recurring + non-empty recurring_check_text).
//
// This module never modifies master templates, ServicePackages, agreements,
// or any PropertyVisit record (historical or otherwise). It only creates /
// updates / archives a single property-specific ChecklistTemplate.

const OWNER_PREFIX = "OWNER PRIORITY · ";

// Resolve the property's current active service agreement + package + the
// package's default recurring visit type. Prefer an Active agreement's
// package; fall back to the property's assigned service_package_id.
export async function resolveRecurringContext(propertyId) {
  const property = await base44.entities.Property.get(propertyId);

  let agreement = null;
  try {
    const ags = await base44.entities.PropertyServiceAgreement.list("-created_date", 200);
    agreement = (ags || []).find(
      (a) => a.property_id === propertyId && a.status === "Active" && !a.archived
    ) || null;
  } catch (e) {}

  let pkg = null;
  const pkgId = agreement?.service_package_id || property.service_package_id;
  if (pkgId) {
    try { pkg = await base44.entities.ServicePackage.get(pkgId); } catch (e) {}
  }
  const visitType = pkg?.default_visit_type || "";

  return { property, agreement, package: pkg, visitType };
}

// Load the active MASTER ChecklistTemplate for a visit type (property-specific
// templates are deliberately excluded).
export async function loadMasterTemplate(visitType) {
  const all = await base44.entities.ChecklistTemplate.list("-created_date", 500);
  const live = (all || []).filter((t) => !t.archived);
  return live.find((t) => t.visit_type === visitType && (!t.property_id || t.is_master)) || null;
}

// Build the approved OWNER PRIORITY row strings from monitoring priorities.
// Only active priorities explicitly enabled for recurring visits with a
// non-empty staff-confirmed recurring_check_text are included. The owner's raw
// intake paragraph is NEVER inserted — only the staff wording is used.
export function buildOwnerPriorityItems(priorities) {
  return (priorities || [])
    .filter(
      (p) =>
        p &&
        p.active !== false &&
        p.include_in_recurring === true &&
        typeof p.recurring_check_text === "string" &&
        p.recurring_check_text.trim()
    )
    .map((p) => OWNER_PREFIX + p.recurring_check_text.trim());
}

// Create / update / archive the property-specific recurring template.
// Returns a status object describing what happened.
export async function updateRecurringChecklist(propertyId) {
  const ctx = await resolveRecurringContext(propertyId);
  const { property, package: pkg, visitType } = ctx;

  if (!visitType) {
    return {
      action: "noop",
      reason: "no_visit_type",
      message: "No active service package found. Assign an active service agreement with a package before building the recurring checklist.",
      visitType: "",
    };
  }

  const master = await loadMasterTemplate(visitType);
  if (!master) {
    return {
      action: "noop",
      reason: "no_master",
      message: `No active master checklist template exists for "${visitType}".`,
      visitType,
    };
  }

  const masterItems = Array.isArray(master.items) ? master.items.slice() : [];
  const ownerItems = buildOwnerPriorityItems(property.monitoring_priorities);

  // Find the existing property-specific (non-master) template for this visit type
  // (archived or not — so we can revive it if it was previously archived).
  const all = await base44.entities.ChecklistTemplate.list("-created_date", 500);
  const existing = (all || []).find(
    (t) => t.property_id === propertyId && t.visit_type === visitType && !t.is_master
  );

  // No approved custom priorities: do not keep a property-specific template.
  // Archive an existing one so future visits resolve back to the master. Never
  // delete — preserve historical evidence.
  if (ownerItems.length === 0) {
    if (existing && !existing.archived) {
      await base44.entities.ChecklistTemplate.update(existing.id, { archived: true });
      return {
        action: "archived",
        visitType,
        itemCount: 0,
        message: `No approved recurring priorities. Property-specific "${visitType}" template archived — future visits will use the package master.`,
      };
    }
    return {
      action: "noop",
      reason: "no_custom",
      visitType,
      itemCount: 0,
      message: "No priorities are approved for recurring visits. Future visits use the package master checklist.",
    };
  }

  const items = [...masterItems, ...ownerItems];
  const name = `${property.name || "Property"} — ${visitType} (Recurring)`;

  if (existing) {
    await base44.entities.ChecklistTemplate.update(existing.id, { items, name, archived: false });
    return {
      action: "updated",
      visitType,
      itemCount: items.length,
      standardCount: masterItems.length,
      customCount: ownerItems.length,
      message: `Recurring checklist updated — ${visitType} (${masterItems.length} standard + ${ownerItems.length} owner-priority).`,
    };
  }

  const created = await base44.entities.ChecklistTemplate.create({
    name,
    visit_type: visitType,
    items,
    is_master: false,
    property_id: propertyId,
    archived: false,
  });
  return {
    action: "created",
    visitType,
    itemCount: items.length,
    standardCount: masterItems.length,
    customCount: ownerItems.length,
    id: created.id,
    message: `Recurring checklist created — ${visitType} (${masterItems.length} standard + ${ownerItems.length} owner-priority).`,
  };
}