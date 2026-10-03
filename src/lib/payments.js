// Payment audit-trail helpers (frontend).
// Backend twin: base44/shared/payments.js — the two copies MUST stay identical.
// Stored payment entries are NEVER deleted: a correction sets voided=true and
// keeps the original entry visible. A legacy record (status Paid, no stored
// entries) is treated as one legacy full payment so history is preserved.
import { base44 } from "@/api/base44Client";

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const PAYMENT_EPS = 0.005;

// Non-voided payment entries of a record.
export function paymentEntries(item) {
  return (Array.isArray(item?.payments) ? item.payments : []).filter((e) => !e.voided);
}

export function legacyPaymentEntry(item) {
  if (Array.isArray(item?.payments) && item.payments.length) return null;
  if (item?.status !== "Paid") return null;
  const amount = round2(Number(item?.amount ?? item?.total ?? 0));
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

// Effective paid total for a record (non-voided entries + legacy adoption).
export function paidTotalOf(item) {
  const legacy = legacyPaymentEntry(item);
  return round2([
    ...paymentEntries(item),
    ...(legacy ? [legacy] : []),
  ].reduce((s, e) => s + (Number(e.amount) || 0), 0));
}

export function baseAmountOf(item) {
  return round2(Number(item?.amount ?? item?.total ?? 0));
}

export function balanceOf(item) {
  return round2(baseAmountOf(item) - paidTotalOf(item));
}

// True when the record has any payment history to show (entries or a legacy
// full payment).
export function hasPaymentHistory(item) {
  return (Array.isArray(item?.payments) && item.payments.length > 0) || !!legacyPaymentEntry(item);
}

// The ONLY path that changes payment state: server-side recording with
// validation, partial-payment support and the audit-trail corrections.
export async function submitPaymentAction(payload) {
  try {
    const res = await base44.functions.invoke("recordPayment", payload);
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.error || e?.data?.error || e?.message || "Could not record the payment";
    throw new Error(msg);
  }
}