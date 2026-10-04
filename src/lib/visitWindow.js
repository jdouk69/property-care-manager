// Conditional "visit window" for customer-facing reports (PDF + email).
//
// The report headline date stays the visit START date (see report discussion).
// This helper adds a small supplementary line ONLY when it adds information:
// - Same Athens day, both timestamps present: "10:15 – 11:40".
// - Multi-day spans: "Oct 3, 18:00 → Oct 4, 09:30" — shown ONLY after staff
//   have made their duration-review decision and did NOT choose to omit it
//   (state "omitted" means the owner is shown nothing about the gap).
// - Otherwise (missing/invalid timestamps): nothing — the line never appears.
//
// Pure display: timestamps are never modified.

import { TZ, athensTime } from "@/lib/timezone";

function shortAthensDate(iso, lang) {
  try {
    return new Intl.DateTimeFormat(lang === "el" ? "el-GR" : "en-US", {
      timeZone: TZ, month: "short", day: "numeric",
    }).format(new Date(iso));
  } catch (e) { return ""; }
}

export function visitWindowFor(visit, lang = "en", durInfo = null) {
  const s = visit?.start_time;
  const e = visit?.end_time;
  if (!s || !e) return "";
  const sMs = Date.parse(s);
  const eMs = Date.parse(e);
  if (isNaN(sMs) || isNaN(eMs) || eMs <= sMs) return "";
  if (durInfo?.multiDay) {
    // Staff decision governs: hidden until reviewed, and never shown when the
    // decision was to omit the duration from the customer report.
    if (!durInfo.reviewed || durInfo.review?.state === "omitted") return "";
    const sd = shortAthensDate(s, lang);
    const ed = shortAthensDate(e, lang);
    if (!sd || !ed) return "";
    return `${sd} ${athensTime(s)} → ${ed} ${athensTime(e)}`;
  }
  return `${athensTime(s)} – ${athensTime(e)}`;
}