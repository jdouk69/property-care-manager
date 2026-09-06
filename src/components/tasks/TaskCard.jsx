import React from "react";
import { Circle, CheckCircle2, Repeat, AlertTriangle, MapPin, Calendar } from "lucide-react";
import { athensToday, athensDateOffset } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Task.date is a naive YYYY-MM-DD (Athens wall-clock convention); Task.time is HH:MM.
// Relative labels compare against Athens today/tomorrow; the date/time formatting is
// direct (TZ-independent) since the values are naive, not ISO timestamps.
// Greek mode formats the same naive values with the Greek locale (UTC-noon
// anchor — pure formatting, no timezone conversion). English output is unchanged.
function formatDue(dateStr, timeStr, t, lang) {
  if (!dateStr) return "";
  const today = athensToday();
  const tomorrow = athensDateOffset(1);
  let dayLabel;
  if (dateStr === today) dayLabel = t("Due today");
  else if (dateStr === tomorrow) dayLabel = t("Due tomorrow");
  else {
    const [y, m, d] = (dateStr || "").split("-").map(Number);
    if (lang === "el") {
      const datePart = new Date(Date.UTC(y || 2000, (m || 1) - 1, d || 1))
        .toLocaleDateString("el-GR", { day: "numeric", month: "short", timeZone: "UTC" });
      dayLabel = t("Due {date}", { date: datePart });
    } else {
      dayLabel = `Due ${MONTHS[(m || 1) - 1]} ${d || ""}`.trim();
    }
  }
  if (timeStr) {
    const [h, mm] = timeStr.split(":").map(Number);
    if (lang === "el") {
      return `${dayLabel} ${t("at {time}", { time: `${h}:${String(mm || 0).padStart(2, "0")}` })}`;
    }
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${dayLabel} at ${h12}:${String(mm || 0).padStart(2, "0")} ${ampm}`;
  }
  return dayLabel;
}

/**
 * Compact task card: WHAT (task text) · WHERE (property name) · WHEN (due date/time),
 * with a quick completion control that reuses the existing status update path.
 * Internal/default badges (Custom / Medium / Pending) are not shown.
 */
export default function TaskCard({ item, lookups, helpers }) {
  const { open, updateStatus } = helpers || {};
  const { t, lang } = useLanguage();
  const completed = item.status === "Completed";
  const propName = item.property_id ? (lookups?.Property?.[item.property_id] || "") : "";
  const due = formatDue(item.date, item.time, t, lang);
  const assigned = (item.assigned_to || "").trim();
  const recurring = !!item.is_recurring;
  const priorityHigh = item.priority === "High" || item.priority === "Urgent";

  const toggleComplete = (e) => {
    e.stopPropagation();
    if (updateStatus) updateStatus(item, completed ? "Pending" : "Completed");
  };

  return (
    <div className={`text-left rounded-2xl border border-border bg-card p-3 sm:p-3.5 hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.99] ${completed ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={toggleComplete}
          aria-label={completed ? t("Mark not done") : t("Mark done")}
          aria-pressed={completed}
          className="shrink-0 -ml-0.5 mt-0.5 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {completed
            ? <CheckCircle2 className="w-6 h-6 text-primary" />
            : <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition" />}
        </button>

        <button type="button" onClick={open} className="flex-1 min-w-0 text-left">
          <p className={`text-[15px] sm:text-base font-medium leading-snug ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {item.title || t("Untitled")}
          </p>

          {(propName || due || assigned) && (
            <div className="mt-1 flex flex-col gap-0.5">
              {propName && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0" /> {propName}
                </span>
              )}
              {due && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 shrink-0" /> {due}
                </span>
              )}
              {assigned && (
                <span className="text-xs text-muted-foreground">{t("Assigned to {name}", { name: assigned })}</span>
              )}
            </div>
          )}

          {(recurring || priorityHigh) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {recurring && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                  <Repeat className="w-3 h-3" /> {item.repeat_label || t("Recurring")}
                </span>
              )}
              {priorityHigh && (
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${item.priority === "Urgent" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                  <AlertTriangle className="w-3 h-3" /> {t(item.priority)}
                </span>
              )}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}