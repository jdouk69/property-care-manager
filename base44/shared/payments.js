// Payment audit-trail math — backend twin of the same helpers in
// src/lib/payments.js. The two copies MUST stay identical.
// Stored payment entries are NEVER deleted: a correction sets voided=true and
// keeps the original entry visible with voided_at/voided_by/void_reason.

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const PAYMENT_EPS = 0.005;

// Non-voided payment entries of a record.
export function paymentEntries(item) {
  return (Array.isArray(item?.payments) ? item.payments : []).filter((e) => !e.voided);
}

// A legacy record (status "Paid", no stored payment entries) is treated as one
// legacy full payment so the audit trail starts from the real history.
// amountField: "amount" (BillingCharge) or "total" (Invoice).
export function legacyPaymentEntry(item, amountField) {
  if (Array.isArray(item?.payments) && item.payments.length) return null;
  if (item?.status !== "Paid") return null;
  const amount = round2(Number(item?.[amountField] ?? 0));
  if (!(amount > 0)) return null;
  return {
    amount,
    date: String(item.paid_date || item.payment_date || "").slice(0, 10),
    method: item.payment_method || "Other",
    reference: item.payment_reference || "",
    recorded_by: "Legacy entry (before the payment audit trail)",
    recorded_at: item.updated_date || "",
    legacy: true,
  };
}

// Sum of raw payment entries (already non-voided).
export function paidTotal(payments) {
  return round2((payments || []).reduce((s, e) => s + (Number(e.amount) || 0), 0));
}

// Outstanding balance for a record: base amount minus effective paid total
// (non-voided entries + legacy adoption).
export function balanceOf(item, amountField) {
  const base = round2(Number(item?.[amountField] ?? 0));
  const legacy = legacyPaymentEntry(item, amountField);
  const paid = paidTotal([...paymentEntries(item), ...(legacy ? [legacy] : [])]);
  return round2(base - paid);
}