// Recurring visit COVERAGE alerts — pure builder, no platform deps.
// Runs ONLY inside the existing hourly Visit Reminders backend function.
//
// It warns staff when an operationally active recurring package is
// under-serviced because the expected included visit for the current service
// period was never scheduled. It is WARNING-ONLY: it never creates, modifies
// or cancels visits, agreements, charges or notifications states — the caller
// creates the Notification records, deduplicated by dedup_key.
//
// Coverage counts the agreement's included visits in the current period that
// are Completed, In Progress or Scheduled (the shared entitlement rule
// already excludes Cancelled, archived, additional billable services, other
// agreements, other periods and other visit types).
//
// Service periods are ANNIVERSARY windows (approved 2026-10 — see
// shared/packageEntitlement.js): each agreement's current period runs from
// its service-start anniversary to the day before the next one. Checkpoints
// are day-WITHIN-PERIOD (the 10th/22nd day of the current period, not the
// calendar month):
//   day-in-period >= 10, coverage 0        -> High   "first" warning
//   allowance >= 2, day-in-period >= 22    -> Urgent "second" warning
// The late "second" warning covers the whole shortfall when it fires, so an
// agreement never gets both checkpoints in the same run.
//
// Dedup keys carry agreement id + period + checkpoint:
//   recurring-coverage:{agreementId}:{periodStart}:{first|second}
// A new service period produces new keys (evaluated independently); hourly
// re-runs are deduplicated by the caller's existing-key check.

import {
  billingPeriodFor,
  includedVisitsPerPeriod,
  includedVisitsInPeriod,
  followUpTypeFor,
} from './packageEntitlement.js';

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// "2026-10-04" -> "Oct 4"
const shortMD = (d) => {
  const [, m, day] = String(d || '').split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MONTH_NAMES[m - 1].slice(0, 3)} ${day}` : '';
};

// Days elapsed from the period start (1 = the start day itself).
const daysInto = (start, today) => {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86400000) + 1 : 0;
};

// Operational recurring agreement — the SAME criteria as the app's
// active-service rule (findOperationalAgreements + isRecurringAgreement in
// src/lib/activeService.js): Active + Signed + not archived + recurring.
// Coverage checkpoints are day-in-period, so only Monthly billing periods are
// checked — Quarterly/Annual windows have no equivalent
// "10th/22nd of period" day, and no behavior is invented for them.
function coverageQualifies(a) {
  if (!a || a.archived) return false;
  if (a.status !== 'Active' || a.signing_status !== 'Signed') return false;
  if ((a.purchase_type || 'Recurring') === 'One-time') return false;
  if ((a.billing_type || 'Monthly') !== 'Monthly') return false;
  return true;
}

/**
 * Build the list of desired recurring-coverage warning notifications.
 *
 * @param {Object} opts
 * @param {Array} opts.agreements  PropertyServiceAgreement records (raw)
 * @param {Array} opts.visits      PropertyVisit records (raw — all statuses)
 * @param {Array} opts.packages    ServicePackage records
 * @param {Array} opts.properties  Property records (name + owner linkage)
 * @param {Array} opts.clients     Client records (owner names, when available)
 * @param {string} opts.todayStr   Athens-local today (YYYY-MM-DD)
 * @returns {Array} desired notification objects (dedup via dedup_key by caller)
 */
export function buildCoverageAlerts({ agreements, visits, packages, properties, clients, todayStr }) {
  const today = String(todayStr || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return [];
  const out = [];

  for (const a of agreements || []) {
    if (!coverageQualifies(a)) continue;

    const pkg = (packages || []).find((p) => p && p.id === a.service_package_id);
    const recType = pkg && pkg.default_visit_type;
    const property = (properties || []).find((p) => p && p.id === a.property_id);
    if (!pkg || !recType || !property) continue; // invalid service linkage — never guessed
    const client = (clients || []).find((c) => c && c.id === property.owner_id);

    const allowance = includedVisitsPerPeriod(pkg);
    // Coverage spans BOTH package slots for packages with a follow-up
    // companion (currently Complete Care: one full visit + one follow-up).
    let coverage = includedVisitsInPeriod(visits, a, recType, today).length;
    const fuType = followUpTypeFor(recType);
    if (fuType) coverage += includedVisitsInPeriod(visits, a, fuType, today).length;
    const period = billingPeriodFor(a, today);
    if (!period.start || !period.end) continue; // no usable period — never guessed
    const periodLabel = `${shortMD(period.start)} – ${shortMD(period.end)}`;

    const alert = (checkpoint, priority, title, action) => out.push({
      type: 'Visit',
      title,
      message: `${property.name || 'Property'}${client && client.name ? ` (${client.name})` : ''} has ${coverage} of ${allowance} ${pkg.name || 'service'} visits scheduled or completed for ${periodLabel}. ${action}`,
      priority,
      related_entity: 'PropertyServiceAgreement',
      related_record_id: a.id,
      related_property_id: a.property_id || '',
      related_path: `/properties/${a.property_id}`,
      dedup_key: `recurring-coverage:${a.id}:${period.start}:${checkpoint}`,
    });

    const dayInPeriod = daysInto(period.start, today);
    const firstDue = dayInPeriod >= 10 && coverage < 1;
    const secondDue = allowance >= 2 && dayInPeriod >= 22 && coverage < allowance;

    if (secondDue) {
      // Late-period warning: the full allowance is not yet planned/completed.
      alert(
        'second',
        'Urgent',
        allowance === 2 ? 'Second visit needs scheduling' : 'Remaining visits need scheduling',
        'Please schedule the remaining visit(s).'
      );
    } else if (firstDue) {
      // Mid-period warning: nothing at all planned or completed yet.
      alert(
        'first',
        'High',
        'Recurring visit needs scheduling',
        'Please schedule this period\u2019s visit.'
      );
    }
  }

  return out;
}