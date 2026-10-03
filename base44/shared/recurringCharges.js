// Anniversary recurring-charge builder — pure, no platform deps. Consumed by
// the generateRecurringCharges backend function (scheduled workflow) and by
// agreementActivate (first-period billing at activation).
//
// Policies (approved 2026-10, replacing the calendar-month model):
// - Monthly agreements bill on their SERVICE-START ANNIVERSARY: the anchor is
//   the recorded agreed start_date (fallback: the Athens date of activation).
//   Periods are contiguous [anchor, next anniversary - 1 day], stored
//   explicitly as period_start / period_end (Athens calendar). No proration.
// - The first full monthly charge (and linked Draft invoice) is created when
//   service starts; one new charge on each monthly anniversary thereafter,
//   at the agreement's locked agreed_price (never the package's current price).
// - Unsigned or inactive agreements are never billed.
// - Catch-up without duplicates: any recurring service charge already covering
//   the agreement's property blocks re-billing of the period it covers.
//   Legacy calendar charges cover through the END of their billing month, so
//   existing agreements transition without an overlapping first anniversary
//   bill and without retroactive re-billing. At most ONE new charge per
//   agreement per run (the latest started, uncovered period) — repeated or
//   retried daily runs catch up without duplicates.
// - Agreements without a reliable service-start date are FLAGGED for staff
//   review, never guessed.
// - Quarterly/Annual billing is not part of the anniversary model yet — such
//   agreements are flagged for staff review rather than silently skipped.
// - Test agreements (is_test_agreement) never produce real ledger entries,
//   unless explicitly scoped by id (verification runs only).

import { athensDate } from './timezone.js';
import {
  anniversaryDate,
  servicePeriod,
  periodIndexContaining,
  addDays,
  monthLabel,
  daysInMonth,
} from './servicePeriods.js';

// Unique per agreement + service period — the server-side duplicate key.
export function recurringSourceKey(agreementId, periodStart) {
  return `agreement:${agreementId}:${periodStart}`;
}

// Reliable service-start billing anchor (Athens calendar YYYY-MM-DD), or "".
export function serviceAnchor(agreement) {
  const sd = String((agreement && agreement.start_date) || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(sd)) return sd;
  const act = String((agreement && agreement.activated_at) || '');
  if (act) {
    const d = athensDate(act);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  return '';
}

// Coverage end (YYYY-MM-DD, inclusive) contributed by existing charges for a
// property: anniversary charges by their explicit period_end; legacy calendar
// charges through the LAST DAY of their billing month (billing_period, else
// billing_date). Only recurring service charges count — additional visits,
// reimbursements and one-off charges never extend coverage. Any status counts
// (Due / Paid / Waived, archived included): a waived period was still billed.
export function coveredThrough(propertyId, charges) {
  let max = '';
  for (const c of charges || []) {
    if (!c || c.property_id !== propertyId) continue;
    if (c.charge_type && c.charge_type !== 'Service') continue;
    const pe = String(c.period_end || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(pe)) {
      if (pe > max) max = pe;
      continue;
    }
    const m = String(c.billing_period || c.billing_date || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(m)) {
      const [y, mo] = m.split('-').map(Number);
      const last = `${m}-${String(daysInMonth(y, mo)).padStart(2, '0')}`;
      if (last > max) max = last;
    }
  }
  return max;
}

/**
 * Build the anniversary billing work for one run.
 *
 * @param {Object} opts
 * @param {Array} opts.agreements  PropertyServiceAgreement records (raw)
 * @param {Object} opts.packages   map of servicePackageId -> raw ServicePackage record
 * @param {Array} opts.existingCharges  ALL existing BillingCharge records — any
 *   status, archived included (they define coverage / duplicate protection)
 * @param {string} opts.todayStr   Athens today (YYYY-MM-DD)
 * @param {boolean} opts.allowTest  true only for explicitly-scoped verification runs
 * @returns {{ charges: Array<{agreement, pkg, period, charge}>, flags: Array }}
 */
export function buildAnniversaryCharges({ agreements, packages, existingCharges, todayStr, allowTest = false }) {
  const today = String(todayStr || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return { charges: [], flags: [] };
  const out = [];
  const flags = [];

  for (const a of agreements || []) {
    if (!a || a.archived) continue;
    if (a.status !== 'Active' || a.signing_status !== 'Signed') continue; // never bill unsigned/inactive
    if (a.is_test_agreement && !allowTest) continue; // test agreements never produce real ledger entries

    const billingType = a.billing_type || 'Monthly';
    if (billingType !== 'Monthly') {
      flags.push({
        agreement_id: a.id,
        property_id: a.property_id || '',
        reason: `${billingType} billing is not supported by anniversary billing yet — needs staff review`,
      });
      continue;
    }
    if (a.agreed_price == null) continue; // nothing locked to bill (price-lock policy)

    const anchor = serviceAnchor(a);
    if (!anchor) {
      flags.push({
        agreement_id: a.id,
        property_id: a.property_id || '',
        reason: 'No reliable service-start date (no start_date and no activated_at) — needs staff review',
      });
      continue;
    }

    // First period that starts strictly after everything already covered.
    const covered = coveredThrough(a.property_id, existingCharges);
    let k = covered ? (periodIndexContaining(anchor, covered) + 1) : 0;
    if (covered && /^\d{4}-\d{2}-\d{2}$/.test(anchor) && anchor > covered) k = 0;

    // Catch-up: advance to the LATEST period that has already started and is
    // still uncovered — one new charge per agreement per run, so repeated or
    // retried daily runs catch up without duplicates and never over-bill.
    let target = -1;
    for (;;) {
      const start = anniversaryDate(anchor, k);
      if (!start || start > today) break;
      target = k;
      k++;
    }
    if (target < 0) continue; // next anniversary is in the future

    const period = servicePeriod(anchor, target);
    const pkg = (packages || {})[a.service_package_id] || {};
    const periodStartMonth = period.start.slice(0, 7);

    out.push({
      agreement: a,
      pkg,
      period,
      charge: {
        client_id: a.client_id || '',
        property_id: a.property_id || '',
        property_service_agreement_id: a.id,
        description: `${pkg.name || 'Service'} — ${monthLabel(periodStartMonth)}`,
        amount: a.agreed_price,
        charge_type: 'Service',
        billing_date: period.start,
        due_date: addDays(period.start, 14), // Net 14 — matches the agreement terms
        status: 'Due',
        source_key: recurringSourceKey(a.id, period.start),
        billing_period: periodStartMonth,
        period_start: period.start,
        period_end: period.end,
      },
    });
  }

  return { charges: out, flags };
}