import { base44 } from "@/api/base44Client";
import { clearDraft } from "@/lib/visitDraft";

// Persists the in-progress visit (held in the local draft) as a PropertyVisit
// record with status "Cancelled", then clears the active draft.
//
// This preserves the work already recorded (checklist answers, notes, photos,
// meter readings, summary, and links to issues/tasks/expenses/owner updates
// that were created inline) so the cancelled visit remains in the property's
// visit history without counting as a completed visit.
export async function cancelVisitFromDraft(draft) {
  if (!draft || !draft.propertyId) {
    throw new Error("No active visit to cancel.");
  }
  const now = new Date().toISOString();
  const visit = await base44.entities.PropertyVisit.create({
    property_id: draft.propertyId,
    visit_type: draft.visitType || "Monthly Property Watch",
    start_time: draft.startTime || now,
    end_time: now,
    status: "Cancelled",
    gps_location: draft.gps || "",
    checklist: draft.checklist || [],
    meter_readings: (draft.meters || []).filter((m) => m.label || m.value),
    summary: draft.summary || "",
    follow_up_task_ids: draft.taskIds || [],
    maintenance_issue_ids: draft.issueIds || [],
    owner_report: "",
    report_sent: false,
  });
  clearDraft();
  return visit;
}