import { base44 } from "@/api/base44Client";
import { propertyScopeError } from "@/lib/propertyScope";

/**
 * Start a scheduled PropertyVisit now: move it to "In Progress", stamp the
 * start time, and navigate into the wizard in resume mode. Shared by the
 * Dashboard TODAY agenda and the VisitDetail page so the action is identical
 * and there is no duplicated Start/Continue logic.
 */
export async function startScheduledVisit(visitId, navigate, opts = {}) {
  if (!visitId) return;
  const { confirmMsg = "Start this visit now? It will move to In Progress and open the checklist." } = opts;
  try {
    const visit = await base44.entities.PropertyVisit.get(visitId);
    const property = await base44.entities.Property.get(visit.property_id);
    const scopeError = propertyScopeError(property, visit.visit_type, visit.status);
    if (scopeError) {
      window.alert(scopeError);
      return;
    }
    if (!window.confirm(confirmMsg)) return;
    await base44.entities.PropertyVisit.update(visitId, {
      status: "In Progress",
      start_time: new Date().toISOString(),
    });
    navigate(`/visits?resume=${visitId}`);
  } catch (e) {
    window.alert("Could not start visit: " + (e?.message || e));
  }
}