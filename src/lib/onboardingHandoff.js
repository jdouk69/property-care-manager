import { base44 } from "@/api/base44Client";
import { serviceFrequency } from "@/lib/activeService";
import { deriveOnboarding, resolvePropertyService } from "@/lib/onboarding";
import { createNotification } from "@/lib/notifications";

// Correction #14 — Onboarding-to-regular-service handoff. Pure detection of a
// recurring customer that has reached "Ready for Regular Service" but has not
// yet had its first regular (recurring visit-type) visit scheduled or
// completed, plus an idempotent internal notification emitter. One-time
// service customers are never flagged. No visit is ever auto-created.

export const ONBOARDING_READY_DEDUP_PREFIX = "onboarding_ready:";

const ONBOARDING_VISIT_TYPE = "Initial Property Onboarding Inspection";
const ACTIVE_VISIT_STATES = ["Scheduled", "In Progress", "Completed"];

// Single property handoff descriptor, or null when not applicable / already
// scheduled. `servicePackages` must be a map keyed by package id.
export function getReadyHandoff({ client, property, intakes, agreements, visits, servicePackages }) {
  if (!client || !property) return null;
  const svc = resolvePropertyService(property, agreements, servicePackages);
  if (svc.status !== "ok" || svc.isOneTime || !svc.agreement) return null;
  const onboarding = deriveOnboarding({
    client,
    properties: [property],
    selectedProperty: property,
    intakes: intakes || [],
    agreements,
    visits,
    servicePackages,
  });
  if (!onboarding.ready || onboarding.isOneTime) return null;
  const recurringVisitType = svc.visitType;
  const hasFirstRegularVisit = (visits || []).some(
    (v) =>
      v.property_id === property.id &&
      !v.archived &&
      v.visit_type === recurringVisitType &&
      v.visit_type !== ONBOARDING_VISIT_TYPE &&
      ACTIVE_VISIT_STATES.includes(v.status)
  );
  if (hasFirstRegularVisit) return null;
  // Real recurring cadence/allowance from the agreement/package configuration
  // — never the stale free-text inspection_frequency fields. Stored as a
  // translation pattern + numbers so consumers can localize it via t().
  const freq = serviceFrequency(svc.agreement, svc.package);
  return {
    clientId: client.id,
    clientName: client.name,
    propertyId: property.id,
    propertyName: property.name,
    agreementId: svc.agreement.id,
    packageName: svc.package?.name || "Service",
    visitType: recurringVisitType,
    frequency: freq ? "{count} included visit(s) per {period}" : "",
    frequencyCount: freq ? freq.visits : 0,
    frequencyPeriod: freq ? freq.periodWord : "",
    dedupKey: `${ONBOARDING_READY_DEDUP_PREFIX}${property.id}:${svc.agreement.id}`,
  };
}

// Across all clients/properties — for Home actionable counts. `servicePackages`
// must be a map keyed by package id.
export function getReadyHandoffs({ clients, properties, intakes, agreements, visits, servicePackages }) {
  const out = [];
  for (const client of clients || []) {
    const props = (properties || []).filter((p) => p.owner_id === client.id && !p.archived);
    const clientIntakes = (intakes || []).filter((i) => i.client_id === client.id && !i.archived);
    for (const property of props) {
      const h = getReadyHandoff({ client, property, intakes: clientIntakes, agreements, visits, servicePackages });
      if (h) out.push(h);
    }
  }
  return out;
}

// Single source of truth for actionable Home counts. Only "clients" is wired
// (ready recurring customer with no first regular visit). Other categories
// (properties, tasks, calendar, arrivalPrep) are intentionally 0 — see
// correction #14 §24: do not invent questionable badge logic.
export function getActionableCounts({ clients, properties, intakes, agreements, visits, servicePackages }) {
  const handoffs = getReadyHandoffs({ clients, properties, intakes, agreements, visits, servicePackages });
  const clientIds = new Set(handoffs.map((h) => h.clientId));
  return { clients: clientIds.size, handoffs };
}

// Visit-wizard URL to schedule the first regular visit. The recurring visit
// type is passed explicitly so the package default cannot override it (mirrors
// the onboarding stage-5 routing pattern).
export function buildScheduleFirstVisitPath(handoff) {
  if (!handoff) return "";
  const vt = encodeURIComponent(handoff.visitType || "");
  return `/visits?start=1&property=${handoff.propertyId}&agreement=${handoff.agreementId}&client=${handoff.clientId}&visit_type=${vt}`;
}

// Idempotently create the internal "Ready for Regular Service" staff
// notification. Deduped server-side by dedup_key (property+agreement), so
// repeated Client Hub loads, app refreshes, logins and device changes never
// duplicate it. Returns the existing or newly created notification record
// (or null on failure) so callers can gate one-time UI on its read state.
export async function ensureOnboardingReadyNotification(handoff) {
  if (!handoff || !handoff.dedupKey) return null;
  const payload = {
    title: "Ready for Regular Service",
    message: `${handoff.propertyName} for ${handoff.clientName} has completed onboarding and is ready for regular service.`,
    type: "System",
    priority: "High",
    related_entity: "Client",
    related_record_id: handoff.clientId,
    related_property_id: handoff.propertyId,
    related_path: `/clients/${handoff.clientId}`,
    dedup_key: handoff.dedupKey,
  };
  const created = await createNotification(payload);
  if (created) return created;
  // Already existed (dedup) or transient error — fetch the existing record.
  try {
    const existing = await base44.entities.Notification.filter({ dedup_key: handoff.dedupKey }, "-created_date", 1);
    if (existing && existing.length) return existing[0];
  } catch (e) {}
  return null;
}