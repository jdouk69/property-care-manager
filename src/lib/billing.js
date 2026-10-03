// Simple billing ledger helpers.
// Stored statuses are ONLY: Due, Paid, Waived.
// "Overdue" is NEVER stored — it is derived at display time as:
//   status === "Due" AND due_date < today (Athens operational date).
import { athensToday } from "@/lib/timezone";

export const CHARGE_TYPES = ["Service", "Visit", "Reimbursement", "Other"];
export const PAYMENT_METHODS = ["Bank Transfer", "IRIS", "Cash", "Wise", "Revolut", "Other"];
export const BILLING_STATUSES = ["Due", "Paid", "Waived"];

// Display status: "Overdue" and "Partially Paid" are NEVER stored — derived at
// display time. Partial payments (payments audit-trail entries) drive
// "Partially Paid"; the stored status only flips to Paid when fully paid.
export function displayStatus(charge, todayStr = athensToday()) {
  const st = charge?.status;
  if (st === "Waived") return "Waived";
  const entries = (Array.isArray(charge?.payments) ? charge.payments : []).filter((e) => !e?.voided);
  if (entries.length > 0) {
    const base = Number(charge.amount || 0);
    const paid = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    if (base - paid <= 0.005) return "Paid";
    return "Partially Paid";
  }
  if (st === "Due" && charge.due_date && String(charge.due_date).slice(0, 10) < todayStr) {
    return "Overdue";
  }
  return st || "Due";
}

export const isOverdue = (charge, todayStr = athensToday()) =>
  displayStatus(charge, todayStr) === "Overdue";

export function eur(n) {
  return `€${Number(n || 0).toFixed(2)}`;
}

// Outstanding = the open BALANCE of all stored "Due" charges (includes those
// displayed as Overdue or Partially Paid) — partial payments reduce it.
export function outstandingTotal(charges) {
  return (charges || []).filter((c) => c.status === "Due" && !c.archived)
    .reduce((s, c) => {
      const entries = (Array.isArray(c.payments) ? c.payments : []).filter((e) => !e?.voided);
      const paid = entries.reduce((x, e) => x + (Number(e.amount) || 0), 0);
      return s + Math.max(0, (c.amount || 0) - paid);
    }, 0);
}

export function overdueTotal(charges, todayStr = athensToday()) {
  return (charges || []).filter((c) => isOverdue(c, todayStr) && !c.archived)
    .reduce((s, c) => s + (c.amount || 0), 0);
}

// Paid this month = Paid charges whose paid_date falls in the current Athens month.
export function paidThisMonthTotal(charges, todayStr = athensToday()) {
  const month = todayStr.slice(0, 7);
  return (charges || []).filter((c) => c.status === "Paid" && !c.archived && String(c.paid_date || "").slice(0, 7) === month)
    .reduce((s, c) => s + (c.amount || 0), 0);
}

const STATUS_BADGE_TONES = {
  Due: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  Overdue: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  "Partially Paid": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Waived: "bg-muted text-muted-foreground border-border",
};

export function statusBadgeClass(status) {
  return `text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE_TONES[status] || STATUS_BADGE_TONES.Due}`;
}

// --- Monthly ledger grouping helpers (display-only; never modify stored data) ---

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// Billing month key: billing_period when available, else YYYY-MM from billing_date.
export function chargeMonthKey(charge) {
  if (charge?.billing_period) return String(charge.billing_period).slice(0, 7);
  if (charge?.billing_date) return String(charge.billing_date).slice(0, 7);
  return "";
}

// "2026-10" -> "October 2026"
export function monthLabel(key) {
  const [y, m] = String(key || "").split("-");
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11) return "";
  return `${MONTH_NAMES[mi]} ${y}`;
}

// Drop a trailing "— <Month Year>" from a description when it exactly matches
// the displayed billing month. Display/snapshot purpose only.
export function stripMonthSuffix(desc, label) {
  const s = desc || "";
  if (!label) return s;
  const re = new RegExp(`\\s*[—–-]\\s*${label}\\s*$`, "i");
  return s.replace(re, "") || s;
}