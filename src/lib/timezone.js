// Europe/Athens timezone helpers (frontend copy). Pure, no platform deps.
// The backend function uses base44/shared/timezone.js with identical logic.
// All stored timestamps remain UTC ISO; these helpers convert for DISPLAY, day-grouping,
// and "today/tomorrow" comparisons in Greece/Crete local time.

export const TZ = "Europe/Athens";

function parts(iso, options, locale = "en-GB") {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat(locale, { timeZone: TZ, hourCycle: "h23", ...options }).formatToParts(d);
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

// Athens weekday long, e.g. "Friday" / Greek "Παρασκευή".
// The optional lang parameter is DISPLAY-ONLY: it never affects the timezone
// (always Europe/Athens), stored timestamps, or day-grouping logic.
export function athensWeekdayLong(iso, lang = "en") {
  return getPart(parts(iso, { weekday: "long" }, lang === "el" ? "el-GR" : "en-GB"), "weekday");
}

// Athens day label, e.g. "MON AUG 24" / Greek "ΔΕΥ ΑΥΓ 24".
export function athensDayLabel(iso, lang = "en") {
  const p = parts(iso, { weekday: "short", day: "numeric", month: "short" }, lang === "el" ? "el-GR" : "en-GB");
  return `${getPart(p, "weekday").toUpperCase()} ${getPart(p, "month").toUpperCase()} ${getPart(p, "day")}`;
}

// Athens-formatted visit time, e.g. "Friday 10:00" / Greek "Παρασκευή 10:00".
export function athensVisitWhen(iso, lang = "en") {
  const p = parts(iso, { weekday: "long", hour: "2-digit", minute: "2-digit" }, lang === "el" ? "el-GR" : "en-GB");
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

// Athens-local 12-hour time, e.g. "2:00 PM".
export function athensTime12h(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  } catch (e) { return ""; }
}

// Athens-local "medium" date+time, e.g. "Aug 30, 2026 at 2:00 PM" (English)
// or "30 Αυγ 2026, 14:00" (Greek). The optional lang parameter is DISPLAY-ONLY:
// English call sites without a lang argument keep the exact current format, so
// owner-facing surfaces (report PDF, owner email) stay unchanged. Stored
// timestamps remain UTC ISO and the timezone is always Europe/Athens.
export function athensMediumDateTime(iso, lang = "en") {
  if (!iso) return "—";
  const d = athensMediumDate(iso, lang);
  const t = lang === "el" ? athensTime(iso) : athensTime12h(iso);
  return t ? (lang === "el" ? `${d}, ${t}` : `${d} at ${t}`) : d;
}

export function athensMediumDate(iso, lang = "en") {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(lang === "el" ? "el-GR" : "en-US", { timeZone: TZ, dateStyle: "medium" }).format(new Date(iso));
  } catch (e) { return String(iso); }
}

// Athens-local "long" date, e.g. "August 30, 2026". Used in owner-facing email
// subject/body so the visit date reflects property/local time, not the sender's
// browser timezone.
export function athensLongDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: TZ, dateStyle: "long" }).format(new Date(iso));
  } catch (e) { return String(iso); }
}