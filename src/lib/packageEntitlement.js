// Package visit entitlements — pure helpers (no platform deps).
//
// A recurring package includes a defined number of scheduled visits per
// service period (the agreement's billing period). These helpers answer:
// which period are we in, how many included visits does the package allow,
// and how many are already used. They only READ existing records — nothing
// is invented, repriced or duplicated.

// Calendar math on YYYY-MM strings (pure, timezone-free like recurringCharges).
const MONTHS_IN_PERIOD = { Monthly: 1, Quarterly: 3, Annual: 12 };

function monthsBetween(startYm, ym) {
  const [sy, sm] = startYm.split("-").map(Number);
  const [y, m] = ym.split("-").map(Number);
  return (y - sy) * 12 + (m - sm);
}

function addMonths(ym, k) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + k, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// The billing/service period containing `todayStr` (YYYY-MM-DD), anchored on
// the agreement's start month — the SAME anchor the recurring-charges workflow
// uses (see base44/shared/recurringCharges.js isChargeMonth). Monthly = the
// calendar month; Quarterly/Annual = the 3/12-month window from the start
// month's cadence. An agreement without a start date falls back to the
// current calendar month (mirroring the recurring-charges "treat as billable
// now" rule).
export function billingPeriodFor(agreement, todayStr) {
  const current = String(todayStr || "").slice(0, 7);
  const months = MONTHS_IN_PERIOD[agreement?.billing_type] || 1;
  const start = String(agreement?.start_date || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(current)) {
    return { startMonth: current, endMonthExclusive: addMonths(current, months), months, anchored: false };
  }
  const n = monthsBetween(start, current);
  const idx = n < 0 ? 0 : Math.floor(n / months);
  const startP = addMonths(start, idx * months);
  return { startMonth: startP, endMonthExclusive: addMonths(startP, months), months, anchored: true };
}

// Included scheduled visits per service period. Explicit package config
// (included_visits_per_period, default 1) — never guessed from free-text
// frequency labels.
export function includedVisitsPerPeriod(pkg) {
  const n = Number(pkg?.included_visits_per_period);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

// A visit's service month, from whichever timestamp exists.
const visitMonth = (v) => String(v?.start_time || v?.scheduled_time || v?.created_date || "").slice(0, 7);

// The visits that consume this agreement's included allowance in the current
// period: linked to the agreement, of the package's own visit type, not
// cancelled/archived, NOT an additional billable service.
export function includedVisitsInPeriod(visits, agreement, recType, todayStr) {
  if (!agreement || !recType) return [];
  const period = billingPeriodFor(agreement, todayStr);
  return (visits || []).filter((v) =>
    v.property_service_agreement_id === agreement.id &&
    v.visit_type === recType &&
    v.status !== "Cancelled" &&
    !v.archived &&
    !v.is_additional_service &&
    visitMonth(v) >= period.startMonth &&
    visitMonth(v) < period.endMonthExclusive
  );
}

// Full entitlement picture for the Package Service Card.
// - used counts Completed, In Progress AND Scheduled included visits
//   (a scheduled visit reserves its allowance slot).
// - unfinished is the single In Progress / Scheduled included visit record
//   (resume/restart target), or null.
// - remaining is capped at 0.
export function entitlementStatus({ visits, agreement, pkg, recType, todayStr }) {
  if (!agreement) return null;
  const period = billingPeriodFor(agreement, todayStr);
  const included = includedVisitsInPeriod(visits, agreement, recType, todayStr);
  const allowance = includedVisitsPerPeriod(pkg);
  const unfinished = included.find((v) => v.status === "In Progress" || v.status === "Scheduled") || null;
  return {
    period,
    allowance,
    used: included.length,
    completed: included.filter((v) => v.status === "Completed").length,
    remaining: Math.max(0, allowance - included.length),
    unfinished,
  };
}