// Simple ledger → invoice generation.
// The BillingCharge ledger stays the source of truth for what a property owes.
// An Invoice is a document snapshot of one property's charges for one month.
// Nothing here sends emails, marks payments, or touches recurring automation.
import { chargeMonthKey, monthLabel, stripMonthSuffix } from "@/lib/billing";
import { athensToday } from "@/lib/timezone";

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const NET_14_DAYS = 14;

// Pure calendar-day add (no DST arithmetic) — matches the recurring-charge Net 14 policy.
export function addCalendarDays(isoDate, days) {
  const d = new Date(`${String(isoDate).slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const DEFAULT_VAT_RATE = 24;

// Use BusinessSettings.vat_rate when it is a usable number; otherwise 24.
export function resolveVatRate(business) {
  const r = Number(business?.vat_rate);
  return Number.isFinite(r) && r > 0 ? r : DEFAULT_VAT_RATE;
}

// Ledger amounts are BEFORE VAT: vat = subtotal × rate, total = subtotal + vat.
export function computeVatTotals(subtotal, rate) {
  const sub = round2(subtotal);
  const vat = round2(sub * (rate / 100));
  return { subtotal: sub, vat, total: round2(sub + vat) };
}

// INV-<year>-001, INV-<year>-002, … — next unused sequence for the year.
// Scans every known invoice (any status) so numbers are never reused.
export function nextInvoiceNumber(invoices = [], year) {
  const prefix = `INV-${year}-`;
  let max = 0;
  for (const inv of invoices || []) {
    const n = String(inv?.invoice_number || "");
    if (!n.startsWith(prefix)) continue;
    const seq = Number(n.slice(prefix.length));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

// An invoice that "counts" for duplicate protection: not Cancelled, not archived.
export const isActiveInvoice = (inv) => !!inv && inv.status !== "Cancelled" && !inv.archived;

// Primary duplicate rule: same property + same billing month already invoiced.
export function findInvoiceForPeriod(invoices, propertyId, billingPeriod) {
  return (invoices || []).find(
    (i) => isActiveInvoice(i) && i.property_id === propertyId && i.billing_period === billingPeriod
  ) || null;
}

// Secondary safeguard: a charge already included in another active invoice.
export function findInvoiceContainingCharge(invoices, chargeId) {
  return (invoices || []).find(
    (i) => isActiveInvoice(i) && Array.isArray(i.charge_ids) && i.charge_ids.includes(chargeId)
  ) || null;
}

// Build a reviewable draft Invoice from one month's ledger charges.
// Line items are a snapshot (descriptions cleaned for display only — stored
// BillingCharges are never modified).
export function buildInvoiceDraft({ charges, propertyId, client, invoices = [], todayStr = athensToday() }) {
  const items = charges || [];
  const period = chargeMonthKey(items[0] || {});
  const label = monthLabel(period);
  const lineItems = items.map((ch) => ({
    description: stripMonthSuffix(ch.description || "Charge", label),
    amount: round2(ch.amount),
  }));
  return {
    invoice_number: nextInvoiceNumber(invoices, Number(todayStr.slice(0, 4))),
    client_id: client?.id || items[0]?.client_id || "",
    property_id: propertyId || items[0]?.property_id || "",
    billing_period: period,
    line_items: lineItems,
    charge_ids: items.map((ch) => ch.id),
    invoice_date: todayStr,
    due_date: addCalendarDays(todayStr, NET_14_DAYS),
    subtotal: round2(lineItems.reduce((s, it) => s + (it.amount || 0), 0)),
    notes: "",
  };
}