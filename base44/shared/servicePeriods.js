// Service-period (anniversary) calendar math — pure, no platform deps.
// Works in browser and Deno. All inputs/outputs are plain YYYY-MM-DD strings
// on the Athens calendar (the caller supplies Athens-local dates — see
// shared/timezone.js / src/lib/timezone.js).
//
// Monthly agreements bill on their service-start anniversary, not calendar
// months. Anchor days 29/30/31 clamp to the last day of shorter months and
// return to the original anchor day when it exists again (Jan 31 -> Feb 28 in
// a common year, Feb 29 in a leap year, Mar 31 ...).

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const pad2 = (n) => String(n).padStart(2, "0");

export function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// m: 1-12
export function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

// Pure calendar-day arithmetic on plain YYYY-MM-DD strings (no DST math).
export function addDays(dateStr, days) {
  if (!isDate(dateStr)) return "";
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export const dayBefore = (dateStr) => addDays(dateStr, -1);

// Whole months between two dates' months (day-of-month ignored).
export function monthsBetween(anchor, dateStr) {
  const [ay, am] = String(anchor).split("-").map(Number);
  const [by, bm] = String(dateStr).split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

// The k-th anniversary of the anchor day: same day-of-month, clamped to the
// last day of shorter months, returning to the original day when it exists.
export function anniversaryDate(anchor, k) {
  if (!isDate(anchor)) return "";
  const [y, m, d] = String(anchor).split("-").map(Number);
  const total = (m - 1) + k;
  const ny = y + Math.floor(total / 12);
  const nm = (((total % 12) + 12) % 12) + 1;
  const day = Math.min(d, daysInMonth(ny, nm));
  return `${ny}-${pad2(nm)}-${pad2(day)}`;
}

// Service period `k` (0-based) of `months` months each, starting at the
// anchor: [anniversaryDate(k * months), anniversaryDate((k + 1) * months) - 1
// day]. Contiguous by construction — a period ends the day before the next
// one starts. Period 0 starts exactly on the anchor (service start).
export function servicePeriod(anchor, k, months = 1) {
  const step = Math.max(1, Math.floor(Number(months)) || 1);
  const idx = Math.max(0, Math.floor(Number(k)) || 0);
  const start = idx === 0 ? String(anchor) : anniversaryDate(anchor, idx * step);
  return { index: idx, start, end: dayBefore(anniversaryDate(anchor, (idx + 1) * step)) };
}

// Index of the period containing dateStr (largest k whose period start is
// <= dateStr); -1 when dateStr is before the anchor.
export function periodIndexContaining(anchor, dateStr, months = 1) {
  if (!isDate(anchor) || !isDate(dateStr)) return -1;
  const step = Math.max(1, Math.floor(Number(months)) || 1);
  let k = Math.floor(monthsBetween(anchor, dateStr) / step);
  if (k < 0) k = 0;
  while (k > 0 && anniversaryDate(anchor, k * step) > dateStr) k--;
  while (anniversaryDate(anchor, (k + 1) * step) <= dateStr) k++;
  return anniversaryDate(anchor, k * step) <= dateStr ? k : -1;
}

// Short human label for a "YYYY-MM" month ("October 2026").
export function monthLabel(ym) {
  const [y, m] = String(ym || "").split("-").map(Number);
  if (!y || !(m >= 1 && m <= 12)) return "";
  return `${MONTH_NAMES[m - 1]} ${y}`;
}