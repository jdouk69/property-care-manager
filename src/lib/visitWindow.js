// Conditional customer-facing visit timing line for the report (PDF, email,
// review preview). DISPLAY-ONLY: original timestamps are never modified.
//
// The report headline date stays the visit START date ("Visit date" rule is
// untouched). This helper adds ONE supplementary line ONLY when appropriate:
//
// - Same Athens calendar day, both timestamps valid:
//     { kind: "time", text: "10:15–11:40" }        -> label "Visit time"
// - Multi-day span (different Athens calendar days):
//     { kind: "window", text: "Oct 3, 18:00 → Oct 4, 09:30" }
//                                                  -> label "Visit window"
//   Shown ONLY when the staff duration-review decision is "confirmed".
//   - "corrected": the corrected duration line already carries the
//     customer-facing timing; showing the raw span beside it would expose
//     contradictory timing information, so no window is shown.
//   - "omitted" or not yet reviewed: NOTHING is shown. If staff chose Omit
//     because timing must not appear in the owner-facing report, that
//     information is never recreated here from raw timestamps.
// - No meaningful end time (missing / invalid / end <= start): null — the
//   line simply does not render. No placeholders ("N/A", "Pending", "—").
//
// All formatting uses Europe/Athens (never browser-local), matching the
// timezone logic used by duration review and the rest of the report.

import { TZ, athensTime, athensDate } from "@/lib/timezone";

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
  if (!s || !e) return null;
  const sMs = Date.parse(s);
  const eMs = Date.parse(e);
  if (isNaN(sMs) || isNaN(eMs) || eMs <= sMs) return null;

  if (athensDate(s) !== athensDate(e)) {
    // Multi-day: only a "confirmed" duration-review decision lets the span
    // appear at all (see rules above).
    if (durInfo?.review?.state !== "confirmed") return null;
    const sd = shortAthensDate(s, lang);
    const ed = shortAthensDate(e, lang);
    if (!sd || !ed) return null;
    return { kind: "window", text: `${sd} ${athensTime(s)} → ${ed} ${athensTime(e)}` };
  }

  return { kind: "time", text: `${athensTime(s)}–${athensTime(e)}` };
}

// The label for a given visit-window result, from the report label set
// (EN/EL) so the PDF, email and review preview can never disagree.
export function visitWindowLabel(win, labels) {
  if (!win) return "";
  return win.kind === "window" ? labels.visitWindow : labels.visitTime;
}