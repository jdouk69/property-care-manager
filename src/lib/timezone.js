// Europe/Athens timezone helpers (frontend copy). Pure, no platform deps.
// The backend function uses base44/shared/timezone.js with identical logic.
// All stored timestamps remain UTC ISO; these helpers convert for DISPLAY, day-grouping,
// and "today/tomorrow" comparisons in Greece/Crete local time.

export const TZ = "Europe/Athens";

function parts(iso, options) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hourCycle: "h23", ...options }).formatToParts(d);
}

function getPart(partsArr, type) {
  return (partsArr.find((p) => p.type === type) || {}).value || "";
}

// Athens-local YYYY-MM-DD
export function athensDate(iso) {
  const p = parts(iso, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${getPart(p, "year")}-${getPart(p, "month")}-${getPart(p, "day")}`;
}

// Athens-local HH:MM (24h, 00-23)
export function athensTime(iso) {
  const p = parts(iso, { hour: "2-digit", minute: "2-digit" });
  return `${getPart(p, "hour")}:${getPart(p, "minute")}`;
}

// Athens weekday long, e.g. "Friday"
export function athensWeekdayLong(iso) {
  return getPart(parts(iso, { weekday: "long" }), "weekday");
}

// Athens day label, e.g. "MON AUG 24"
export function athensDayLabel(iso) {
  const p = parts(iso, { weekday: "short", day: "numeric", month: "short" });
  return `${getPart(p, "weekday").toUpperCase()} ${getPart(p, "month").toUpperCase()} ${getPart(p, "day")}`;
}

// Athens-formatted visit time, e.g. "Friday 10:00"
export function athensVisitWhen(iso) {
  const p = parts(iso, { weekday: "long", hour: "2-digit", minute: "2-digit" });
  return `${getPart(p, "weekday")} ${getPart(p, "hour")}:${getPart(p, "minute")}`;
}

// Athens today (YYYY-MM-DD)
export function athensToday() {
  return athensDate(new Date());
}

// Athens calendar date N days from now (YYYY-MM-DD)
export function athensDateOffset(daysFromNow) {
  return athensDate(new Date(Date.now() + daysFromNow * 86400000));
}

// Athens UTC offset (minutes, signed, DST-aware) at a given epoch ms
function athensOffsetMin(ms) {
  const tz = getPart(
    parts(ms, { timeZoneName: "shortOffset" }),
    "timeZoneName"
  );
  const m = tz.match(/([+-])(\d{1,2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  const h = parseInt(m[2], 10) || 0;
  const min = parseInt(m[3], 10) || 0;
  return sign * (h * 60 + min);
}

// Interpret a naive YYYY-MM-DD + HH:MM as Athens wall-clock and return the UTC ISO instant.
// Use this when saving a user-entered local time so storage is tz-correct regardless of the
// browser's own timezone.
export function athensLocalToIso(dateStr, timeStr) {
  const utcGuess = new Date(`${dateStr}T${timeStr || "00:00"}:00Z`).getTime();
  const offsetMin = athensOffsetMin(utcGuess);
  return new Date(utcGuess - offsetMin * 60000).toISOString();
}