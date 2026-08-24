// Pure scheduled-visit reminder builder. No platform deps — shared by the client-side
// fallback (src/lib/visitReminders.js) and the server-side backend function.
// Both paths MUST use identical dedup keys so runs are idempotent.

import { athensVisitWhen, athensTime } from "./timezone.js";

const OFFSET_MS = {
  "7d": 7 * 86400000,
  "3d": 3 * 86400000,
  "1d": 1 * 86400000,
  "1h": 1 * 3600000,
};
const OFFSET_LABEL = { "1h": "1 hour", "1d": "1 day", "3d": "3 days", "7d": "7 days" };
// A visit is "missed" once this much time has passed beyond its scheduled time.
const MISSED_GRACE_MS = 60 * 60 * 1000;

/**
 * Build the list of desired visit notifications for the current run.
 *
 * @param {Object} opts
 * @param {Array} opts.visits  enriched visits: { id, propertyId, status, archived, visitType, scheduledTime, scheduledMs, propertyName, clientName }
 * @param {Array} opts.offsets  enabled reminder offsets (e.g. ["due","1h","1d","3d","7d"])
 * @param {number} [opts.nowMs]  current epoch ms (defaults to Date.now())
 * @returns {Array} desired notification objects (dedup via dedup_key by caller)
 */
export function buildVisitReminders({ visits, offsets, nowMs }) {
  const now = nowMs || Date.now();
  const enabled = (k) => Array.isArray(offsets) && offsets.includes(k);
  const out = [];

  const base = (v) => ({
    type: "Visit",
    related_entity: "PropertyVisit",
    related_record_id: v.id,
    related_property_id: v.propertyId || "",
    related_path: `/visits/${v.id}`,
  });
  const label = (v) =>
    `${v.clientName || "Client"} · ${v.propertyName || "Property"} · ${v.visitType || "Visit"}`;

  for (const v of visits) {
    if (v.status !== "Scheduled" || v.archived) continue;
    const S = v.scheduledMs;
    if (!S) continue;
    const when = athensVisitWhen(v.scheduledTime);

    // Pre-visit reminders for each enabled offset
    for (const key of Object.keys(OFFSET_MS)) {
      if (!enabled(key)) continue;
      const ms = OFFSET_MS[key];
      if (now >= S - ms && now < S) {
        out.push({
          ...base(v),
          title: `Visit in ${OFFSET_LABEL[key]}`,
          message: `${label(v)} · ${when}`,
          priority: "Medium",
          dedup_key: `visit_reminder_${key}:${v.id}`,
        });
      }
    }

    // "Due" reminder at the scheduled time
    if (enabled("due") && now >= S && now < S + MISSED_GRACE_MS) {
      out.push({
        ...base(v),
        title: "Visit starting now",
        message: `${label(v)} · ${when}`,
        priority: "High",
        dedup_key: `visit_reminder_due:${v.id}`,
      });
    }

    // Missed-visit alert (after grace, still Scheduled)
    if (now >= S + MISSED_GRACE_MS) {
      out.push({
        ...base(v),
        title: "Scheduled visit missed",
        message: `${v.propertyName || "Property"} · ${v.visitType || "Visit"} was scheduled for ${athensTime(v.scheduledTime)}.`,
        priority: "Urgent",
        dedup_key: `visit_missed:${v.id}`,
      });
    }
  }

  return out;
}