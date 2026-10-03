// Package visit entitlements — pure helpers (no platform deps).
//
// A recurring package includes a defined number of scheduled visits per
// SERVICE PERIOD. Periods are ANNIVERSARY windows (approved 2026-10): each
// agreement's billing anchor is its recorded service-start date (start_date,
// fallback: the Athens date of activation). A Monthly period runs from the
// anchor-day anniversary to the day before the next clamped anniversary —
// anchor Oct 4 → Oct 4–Nov 3; anchor days 29–31 clamp to the last day of
// shorter months and return to the original day. Agreements without a
// reliable anchor fall back to the legacy calendar-month window. Quick Check
// and Property Care include one visit per period; Complete Care's follow-up
// companion shares the SAME single period — neither may create a second
// monthly charge (charges are per agreement + period, never per visit).
//
// Frontend twin of base44/shared/packageEntitlement.js (the platform forbids
// frontend imports from base44/). The two copies MUST stay identical —
// same convention as visitReminders.js / shared/visitReminders.js.

import { servicePeriod, periodIndexContaining, anniversaryDate } from '@/lib/servicePeriods';
import { athensDate } from '@/lib/timezone';

const MONTHS_IN_PERIOD = { Monthly: 1, Quarterly: 3, Annual: 12 };

// Reliable service-start billing anchor (Athens calendar YYYY-MM-DD), or "".
export function agreementAnchor(agreement) {
  const sd = String((agreement && agreement.start_date) || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(sd)) return sd;
  const act = String((agreement && agreement.activated_at) || '');
  if (act) {
    const d = athensDate(act);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  return '';
}

// The service period containing todayStr. Legacy-compat fields are kept for
// display: startMonth (month of the period start) and endMonthExclusive (the
// month AFTER the period end).
export function billingPeriodFor(agreement, todayStr) {
  const today = String(todayStr || '');
  const months = MONTHS_IN_PERIOD[(agreement && agreement.billing_type) || 'Monthly'] || 1;
  const anchor = agreementAnchor(agreement);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    // Legacy fallback: the current calendar-month window (unchanged legacy behavior).
    const current = today.slice(0, 7);
    const startMonth = /^\d{4}-\d{2}$/.test(current) ? current : '';
    if (!startMonth) {
      return { anchor: '', anchored: false, months, index: 0, start: '', end: '', startMonth: '', endMonthExclusive: '' };
    }
    const p = servicePeriod(`${startMonth}-01`, 0, months);
    return {
      anchor: '', anchored: false, months, index: 0,
      start: p.start, end: p.end, startMonth,
      endMonthExclusive: anniversaryDate(`${startMonth}-01`, months).slice(0, 7),
    };
  }
  const idx = periodIndexContaining(anchor, today, months);
  const p = servicePeriod(anchor, idx < 0 ? 0 : idx, months);
  const nextStart = anniversaryDate(anchor, (p.index + 1) * months);
  return {
    anchor, anchored: true, months, index: p.index,
    start: p.start, end: p.end,
    startMonth: p.start.slice(0, 7),
    endMonthExclusive: nextStart.slice(0, 7),
  };
}

// Included scheduled visits per service period. Explicit package config
// (included_visits_per_period, default 1) — never guessed from free-text
// frequency labels.
export function includedVisitsPerPeriod(pkg) {
  const n = Number(pkg?.included_visits_per_period);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

// A visit's service date, from whichever timestamp exists (Athens-comparable
// YYYY-MM-DD; stored timestamps are UTC and the ±few-hours skew vs Athens is
// the same convention the rest of the app accepts for day grouping).
const visitDate = (v) => String((v && (v.start_time || v.scheduled_time || v.created_date)) || '').slice(0, 10);

// The visits that consume this agreement's included allowance in the current
// period: linked to the agreement, of the package's own visit type, not
// cancelled/archived, NOT an additional billable service.
export function includedVisitsInPeriod(visits, agreement, recType, todayStr) {
  if (!agreement || !recType) return [];
  const period = billingPeriodFor(agreement, todayStr);
  if (!period.start || !period.end) return [];
  return (visits || []).filter((v) =>
    v.property_service_agreement_id === agreement.id &&
    v.visit_type === recType &&
    v.status !== 'Cancelled' &&
    !v.archived &&
    !v.is_additional_service &&
    visitDate(v) >= period.start &&
    visitDate(v) <= period.end
  );
}

// The follow-up companion visit type for packages whose monthly allowance is
// ONE FULL visit plus ONE brief follow-up — currently Complete Care. Only the
// exact mapping counts — never guessed from names.
export const PACKAGE_FOLLOW_UP_TYPES = {
  "Complete Care Property Visit": "Complete Care Follow-up Visit",
};

export function followUpTypeFor(recType) {
  return (recType && PACKAGE_FOLLOW_UP_TYPES[recType]) || null;
}

// Full entitlement picture for the Package Service Card.
// - used counts Completed, In Progress AND Scheduled included visits
//   (a scheduled visit reserves its allowance slot).
// - unfinished is the first In Progress / Scheduled included visit record
//   (resume/restart target), or null.
// - remaining is capped at 0.
// For packages with a follow-up companion (currently Complete Care) the
// allowance splits: one FULL visit + one FOLLOW-UP — never two of either.
// `full` and `followUp` carry the per-slot counts; the aggregate keys
// (allowance/used/completed/remaining/unfinished) span BOTH slots.
// MUST stay identical to the backend twin (base44/shared/packageEntitlement.js).
export function entitlementStatus({ visits, agreement, pkg, recType, todayStr }) {
  if (!agreement) return null;
  const period = billingPeriodFor(agreement, todayStr);
  const fuType = followUpTypeFor(recType);
  const totalAllowance = includedVisitsPerPeriod(pkg);
  const fuAllowance = fuType ? Math.max(0, totalAllowance - 1) : 0;
  const fullAllowance = Math.max(1, totalAllowance - fuAllowance);
  const fullVisits = includedVisitsInPeriod(visits, agreement, recType, todayStr);
  const fuVisits = fuType && fuAllowance > 0 ? includedVisitsInPeriod(visits, agreement, fuType, todayStr) : [];
  const included = [...fullVisits, ...fuVisits];
  const slot = (list, allow, type) => {
    const unfinished = list.find((v) => v.status === 'In Progress' || v.status === 'Scheduled') || null;
    return {
      type,
      used: list.length,
      completed: list.filter((v) => v.status === 'Completed').length,
      remaining: Math.max(0, allow - list.length),
      unfinished,
    };
  };
  const full = slot(fullVisits, fullAllowance, recType);
  const followUp = fuType && fuAllowance > 0 ? slot(fuVisits, fuAllowance, fuType) : null;
  return {
    period,
    allowance: fullAllowance + fuAllowance,
    used: included.length,
    completed: included.filter((v) => v.status === 'Completed').length,
    remaining: Math.max(0, fullAllowance + fuAllowance - included.length),
    unfinished: full.unfinished || (followUp && followUp.unfinished) || null,
    full,
    followUp,
  };
}