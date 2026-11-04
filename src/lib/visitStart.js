import { base44 } from "@/api/base44Client";
import { propertyScopeError, SHORT_TERM_RENTAL_VILLA } from "../../server/shared/propertyScope.js";

/**
 * Start a scheduled PropertyVisit now: move it to "In Progress", stamp the
 * start time, and navigate into the wizard in resume mode. Shared by the
 * Dashboard TODAY agenda and the VisitDetail page so the action is identical
 * and there is no duplicated Start/Continue logic.
 */
export async function startScheduledVisit(visitId, navigate, opts = {}) {
  if (!visitId) return;
  const { confirmMsg = "Start this visit now? It will move to In Progress and open the checklist." } = opts;
  if (!window.confirm(confirmMsg)) return;
  try {
    const visit = await base44.entities.PropertyVisit.get(visitId);
    const property = await base44.entities.Property.get(visit.property_id);
    const scopeError = propertyScopeError(property, visit.visit_type, "In Progress", visit.exterior_only === true);
    if (scopeError) { window.alert(scopeError); return; }
    if (property.service_scope === SHORT_TERM_RENTAL_VILLA && !window.confirm("Before entering, confirm that no owner, guest, tenant, or other person is staying at the property now. If anyone is there or occupancy is uncertain, do not enter.")) return;
    const now = new Date().toISOString();
    const me = property.service_scope === SHORT_TERM_RENTAL_VILLA ? await base44.auth.me().catch(() => null) : null;
    await base44.entities.PropertyVisit.update(visitId, {
      status: "In Progress",
      start_time: now,
      ...(property.service_scope === SHORT_TERM_RENTAL_VILLA ? {
        occupancy_confirmed_vacant: true,
        occupancy_confirmed_at: now,
        occupancy_confirmed_by: me?.full_name || me?.email || "",
      } : {}),
    });
    navigate(`/visits?resume=${visitId}`);
  } catch (e) {
    window.alert("Could not start visit: " + (e?.message || e));
  }
}
