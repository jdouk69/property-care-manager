// Pure recurring-charge builder. No platform deps — consumed by the
// generateRecurringCharges backend function (scheduled workflow).
//
// Policies (approved 2026-09):
// - Net 14: due_date = billing_date + 14 calendar days (matches the signed
//   agreement terms: "Payment is due within 14 days of the invoice date").
// - Duplicate protection: at most ONE charge per agreement per billing month,
//   regardless of how the existing charge was created (manual or automatic) or
//   its state (Due / Paid / Waived / archived). Callers pass ALL existing
//   BillingCharge records; the builder skips any agreement+month that already
//   has one, so repeated/daily runs are idempotent.
// - Mid-month starts: a start date after the 1st is never auto-billed for its
//   start month. The first automatic charge is the next cadence month
//   (Monthly: next month; Quarterly: start month + 3; Annual: start month + 12).
//   No prorating.

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthsBetween(startPeriod, period) {
  const [sy, sm] = startPeriod.split("-").map(Number);
  const [y, m] = period.split("-").map(Number);
  return (y - sy) * 12 + (m - sm);
}

export function recurringSourceKey(agreementId, period) {
  return `agreement:${agreementId}:${period}`;
}

// A charge's billing month: billing_period when present, else derived from
// billing_date. Manual charges usually have no billing_period — their
// billing_date (required on the Add Charge form, defaulted to today) provides
// the month for duplicate detection.
export function chargeBillingMonth(charge) {
  const bp = String((charge && charge.billing_period) || "").slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(bp)) return bp;
  const bd = String((charge && charge.billing_date) || "").slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(bd)) return bd;
  return "";
}

// Calendar-day arithmetic on a plain YYYY-MM-DD string (pure date, no timezone).
export function addDays(dateStr, days) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

// Net 14 due date — matches the signed agreement terms:
// "Payment is due within 14 days of the invoice date."
export const NET_14_DAYS = 14;

// Is `period` (YYYY-MM) a billing month for this agreement?
// - Monthly: every month since start
// - Quarterly / Annual: every 3rd / 12th month since the agreement's start month
// - Mid-month start (start day > 1): the start month is NEVER auto-billed
//   (partial first month is not prorated). The first automatic charge is the
//   next cadence month — Monthly: start + 1, Quarterly: start + 3, Annual: start + 12.
//   Staff can create a manual charge for an initial partial period if desired.
// - One-time or unknown billing type: never
export function isChargeMonth(agreement, period) {
  const start = String(agreement.start_date || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(start)) return true; // no start date recorded — treat as billable now
  const n = monthsBetween(start, period);
  if (n < 0) return false; // agreement starts in a future month
  const startDay = parseInt(String(agreement.start_date || "").slice(8, 10), 10) || 1;
  if (startDay > 1 && n === 0) return false; // partial first month — never auto-billed
  if (agreement.billing_type === "Monthly") return true;
  if (agreement.billing_type === "Quarterly") return n % 3 === 0;
  if (agreement.billing_type === "Annual") return n % 12 === 0;
  return false;
}

/**
 * Build the recurring charges for the current billing period.
 *
 * @param {Object} opts
 * @param {Array} opts.agreements  raw PropertyServiceAgreement records
 * @param {Object} opts.packages    map of servicePackageId -> raw ServicePackage record
 * @param {Array} opts.existingCharges  ALL existing BillingCharge records — any status,
 *   archived included. Duplicate protection matches agreement + billing month
 *   (billing_period, else billing_date) regardless of how the charge was created.
 * @param {string} opts.todayStr   Athens today (YYYY-MM-DD); the period is its YYYY-MM
 * @returns {Array} desired BillingCharge field objects (caller creates them)
 */
export function buildRecurringCharges({ agreements, packages, existingCharges, todayStr }) {
  const period = String(todayStr).slice(0, 7);
  const monthLabel = `${MONTH_NAMES[parseInt(period.slice(5, 7), 10) - 1]} ${period.slice(0, 4)}`;
  const firstOfMonth = `${period}-01`;
  const dueDate = addDays(firstOfMonth, NET_14_DAYS);
  // agreementId:month keys that already have ANY charge (manual or automatic,
  // any status, archived included) — every one of them blocks regeneration.
  const billedMonths = new Set();
  for (const c of existingCharges || []) {
    if (!c.property_service_agreement_id) continue;
    const m = chargeBillingMonth(c);
    if (m) billedMonths.add(`${c.property_service_agreement_id}:${m}`);
  }
  const out = [];

  for (const a of agreements || []) {
    // Operational agreement — same rule as the rest of the app.
    if (a.status !== "Active" || a.signing_status !== "Signed" || a.archived) continue;
    if (a.is_test_agreement) continue; // test agreements never produce real ledger entries
    if (!isChargeMonth(a, period)) continue;

    if (billedMonths.has(`${a.id}:${period}`)) continue; // already billed this month — manual or automatic

    // PRICE LOCK (post-audit cleanup): recurring agreements are billed ONLY at
    // their LOCKED agreed_price. The old fallback to the package's CURRENT
    // standard_price was removed — it could silently reprice an existing
    // customer when a master package price changed. An agreement without an
    // agreed_price is skipped instead (verified 2026-09: zero agreements lack
    // an agreed_price, so nothing legitimate is affected).
    if (a.agreed_price == null) continue; // nothing locked to bill
    const amount = a.agreed_price;
    const pkg = packages[a.service_package_id] || {};

    out.push({
      client_id: a.client_id || "",
      property_id: a.property_id || "",
      property_service_agreement_id: a.id,
      description: `${pkg.name || "Service"} — ${monthLabel}`,
      amount,
      charge_type: "Service",
      billing_date: firstOfMonth,
      due_date: dueDate,
      status: "Due",
      source_key: recurringSourceKey(a.id, period),
      billing_period: period,
    });
  }

  return out;
}