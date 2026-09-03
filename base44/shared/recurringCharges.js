// Pure recurring-charge builder. No platform deps — consumed by the
// generateRecurringCharges backend function (scheduled workflow).
// Duplicate protection: one charge per agreement per billing period, keyed by
// source_key = `agreement:<agreementId>:<YYYY-MM>`; callers skip already-existing keys,
// so repeated/daily runs are idempotent.

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthsBetween(startPeriod, period) {
  const [sy, sm] = startPeriod.split("-").map(Number);
  const [y, m] = period.split("-").map(Number);
  return (y - sy) * 12 + (m - sm);
}

export function recurringSourceKey(agreementId, period) {
  return `agreement:${agreementId}:${period}`;
}

// Is `period` (YYYY-MM) a billing month for this agreement?
// - Monthly: every month since start
// - Quarterly / Annual: every 3rd / 12th month since the agreement's start month
// - One-time or unknown billing type: never
export function isChargeMonth(agreement, period) {
  const start = String(agreement.start_date || "").slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(start)) return true; // no start date recorded — treat as billable now
  const n = monthsBetween(start, period);
  if (n < 0) return false; // agreement starts in a future month
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
 * @param {Set} opts.existingSourceKeys  source_key values already billed (duplicate protection)
 * @param {string} opts.todayStr   Athens today (YYYY-MM-DD); the period is its YYYY-MM
 * @returns {Array} desired BillingCharge field objects (caller creates them)
 */
export function buildRecurringCharges({ agreements, packages, existingSourceKeys, todayStr }) {
  const period = String(todayStr).slice(0, 7);
  const monthLabel = `${MONTH_NAMES[parseInt(period.slice(5, 7), 10) - 1]} ${period.slice(0, 4)}`;
  const firstOfMonth = `${period}-01`;
  const out = [];

  for (const a of agreements || []) {
    // Operational agreement — same rule as the rest of the app.
    if (a.status !== "Active" || a.signing_status !== "Signed" || a.archived) continue;
    if (a.is_test_agreement) continue; // test agreements never produce real ledger entries
    if (!isChargeMonth(a, period)) continue;

    const key = recurringSourceKey(a.id, period);
    if (existingSourceKeys.has(key)) continue;

    const pkg = packages[a.service_package_id] || {};
    const amount = a.agreed_price != null ? a.agreed_price : pkg.standard_price;
    if (amount == null) continue; // nothing to bill

    out.push({
      client_id: a.client_id || "",
      property_id: a.property_id || "",
      property_service_agreement_id: a.id,
      description: `${pkg.name || "Service"} — ${monthLabel}`,
      amount,
      charge_type: "Service",
      billing_date: firstOfMonth,
      due_date: firstOfMonth,
      status: "Due",
      source_key: key,
      billing_period: period,
    });
  }

  return out;
}