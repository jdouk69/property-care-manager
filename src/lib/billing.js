// Simple billing ledger helpers.
// Stored statuses are ONLY: Due, Paid, Waived.
// "Overdue" is NEVER stored — it is derived at display time as:
//   status === "Due" AND due_date < today (Athens operational date).
import { athensToday } from "@/lib/timezone";

export const CHARGE_TYPES = ["Service", "Visit", "Reimbursement", "Other"];
export const PAYMENT_METHODS = ["Bank Transfer", "Cash", "Wise", "Revolut", "Other"];
export const BILLING_STATUSES = ["Due", "Paid", "Waived"];

// Deriving "Overdue" never changes the stored status.
export function displayStatus(charge, todayStr = athensToday()) {
  if (charge?.status === "Due" && charge.due_date && String(charge.due_date).slice(0, 10) < todayStr) {
    return "Overdue";
  }
  return charge?.status || "Due";
}

export const isOverdue = (charge, todayStr = athensToday()) =>
  charge?.status === "Due" && !!charge.due_date && String(charge.due_date).slice(0, 10) < todayStr;

export function eur(n) {
  return `€${Number(n || 0).toFixed(2)}`;
}

// Outstanding = all stored "Due" charges (includes those displayed as Overdue).
export function outstandingTotal(charges) {
  return (charges || []).filter((c) => c.status === "Due" && !c.archived)
    .reduce((s, c) => s + (c.amount || 0), 0);
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