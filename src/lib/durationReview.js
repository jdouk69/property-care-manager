// Duration-review safeguard for visits left open across days.
//
// The customer report's duration is the raw gap between start_time and
// end_time. A visit left open (e.g. the device stayed on a property for
// days) produces an absurd duration. This module DETECTS such spans; it
// never modifies the original timestamps. Staff decide in the report review
// screen whether the recorded duration is accurate, correct it (verified
// minutes + reason), or omit it from the customer report entirely.
//
// Multi-day = the start and end fall on DIFFERENT Athens-local calendar
// dates. An overnight visit (23:50 → 00:10) is also flagged — confirming it
// is a one-click action, which is the intended safeguard.

import { athensDate } from "@/lib/timezone";

const VALID_STATES = ["confirmed", "corrected", "omitted"];

/** True when a stored decision is complete enough to be shown/used. */
export function isDurationDecisionValid(decision) {
  if (!decision || !VALID_STATES.includes(decision.state)) return false;
  if (decision.state === "corrected") {
    return Number(decision.verified_minutes) > 0 && String(decision.reason || "").trim().length > 0;
  }
  return true;
}

/**
 * Duration info for a visit.
 * - multiDay: start/end span different Athens calendar days.
 * - rawMinutes: recorded gap in minutes (null when timestamps are missing or
 *   end <= start).
 * - review: the stored staff decision (visit.duration_review), when any.
 * - reviewed: the stored decision is present and valid.
 * - effectiveMinutes: what the CUSTOMER report should show:
 *     confirmed → raw gap; corrected → verified minutes; omitted or
 *     not-yet-reviewed → null (no duration line until staff decides).
 */
export function durationReviewInfo(visit) {
  const s = visit?.start_time ? Date.parse(visit.start_time) : null;
  const e = visit?.end_time ? Date.parse(visit.end_time) : null;
  const hasBoth = s != null && e != null && !isNaN(s) && !isNaN(e);
  const rawMinutes = hasBoth && e > s ? Math.round((e - s) / 60000) : null;
  const multiDay = hasBoth && rawMinutes != null && athensDate(visit.start_time) !== athensDate(visit.end_time);
  const review = multiDay ? (visit?.duration_review || null) : null;
  const reviewed = multiDay && isDurationDecisionValid(review);
  let effectiveMinutes = rawMinutes;
  if (multiDay) {
    effectiveMinutes =
      review?.state === "confirmed"
        ? rawMinutes
        : review?.state === "corrected" && isDurationDecisionValid(review)
          ? Math.round(Number(review.verified_minutes))
          : null; // omitted, or not yet reviewed → nothing shown to the customer
  }
  return { hasDuration: hasBoth, rawMinutes, multiDay, review, reviewed, effectiveMinutes };
}