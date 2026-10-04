// Server-side validation for invoice creation — rejects invalid billing dates
// and non-finite / invalid monetary amounts BEFORE any invoice record is
// written. Used by both invoice-creation paths: the shared anniversary billing
// module (automation) and the createInvoice backend function (staff flow).
//
// A rejected creation throws / returns 400 — nothing partial is stored. In the
// automation path the throw routes the charge to the repair pass's failure log
// so staff can see and resolve the underlying bad data.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// A real calendar date on the proleptic Gregorian calendar: rejects empty
// strings, malformed values ('2026-10', 'not-a-date') and impossible dates
// ('2026-02-31').
export function isValidBillingDate(dateStr) {
  const s = String(dateStr || '');
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Money must be a finite, non-negative number — rejects NaN, ±Infinity and
// non-numeric strings (Number(...) yields NaN for those).
export function isValidAmount(n) {
  return Number.isFinite(n) && n >= 0;
}

/**
 * Validate the fields an invoice record needs before creation.
 * @returns {string|null} a human-readable error, or null when valid.
 */
export function validateInvoiceDraft(record = {}) {
  if (!isValidBillingDate(record.invoice_date)) {
    return 'Refusing to create invoice: a valid billing date (YYYY-MM-DD) is required';
  }
  if (!Array.isArray(record.line_items) || record.line_items.length === 0) {
    return 'Refusing to create invoice: at least one line item is required';
  }
  for (const it of record.line_items) {
    if (it.amount != null && !isValidAmount(Number(it.amount))) {
      return 'Refusing to create invoice: line-item amounts must be finite, non-negative numbers';
    }
  }
  if (!isValidAmount(Number(record.vat))) {
    return 'Refusing to create invoice: VAT must be a finite, non-negative number';
  }
  if (!isValidAmount(Number(record.total))) {
    return 'Refusing to create invoice: total must be a finite, non-negative number';
  }
  // Consistency: total must equal line items + VAT (± a rounding cent) —
  // rejects absurd totals that are finite but unrelated to the items.
  const sum = (record.line_items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
  if (Math.abs(Math.round((sum + Number(record.vat)) * 100) / 100 - Number(record.total)) > 0.011) {
    return 'Refusing to create invoice: total does not equal line items + VAT';
  }
  return null;
}