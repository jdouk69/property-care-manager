import React from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { athensMediumDateTime } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Staff review card for a visit whose recorded duration spans multiple
 * calendar days (e.g. left open across days). Shown in the Report Review
 * screen BEFORE approval; the customer report shows a duration only after a
 * decision. The original start/end timestamps are never modified here.
 *
 * props: { flag (model.durationFlag), decision, onChange(decision) }
 */
export default function DurationReviewCard({ flag, decision, onChange }) {
  const { t } = useLanguage();
  if (!flag) return null;

  const state = decision?.state || "";
  const set = (patch) => onChange({ ...decision, ...patch });

  const Option = ({ value, title, sub }) => (
    <button
      type="button"
      disabled={false}
      onClick={() => set({ state: value })}
      className={`w-full text-left rounded-xl border p-2.5 transition-colors ${
        state === value ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/40"
      }`}
    >
      <span className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
            state === value ? "border-primary" : "border-muted-foreground/40"
          }`}
        >
          {state === value && <span className="w-2 h-2 rounded-full bg-primary" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">{title}</span>
          {sub && <span className="block text-xs text-muted-foreground mt-0.5">{sub}</span>}
        </span>
      </span>
    </button>
  );

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {t("Visit duration needs review")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("This visit spans multiple calendar days:")} {athensMediumDateTime(flag.startTime)} → {athensMediumDateTime(flag.endTime)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("Recorded gap: {minutes} minutes. The original timestamps are kept unchanged — decide what the customer report should show.", { minutes: (flag.rawMinutes ?? 0).toLocaleString() })}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Option
          value="confirmed"
          title={t("Confirm — the recorded duration is accurate")}
          sub={t("The report shows the recorded {minutes}-minute duration.", { minutes: (flag.rawMinutes ?? 0).toLocaleString() })}
        />
        <Option
          value="corrected"
          title={t("Enter the actual duration")}
          sub={t("The report shows the verified duration you enter, with a correction reason.")}
        />
        {state === "corrected" && (
          <div className="pl-6 space-y-2 pb-1">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder={t("Actual minutes")}
                value={decision?.verified_minutes ?? ""}
                onChange={(e) => set({ verified_minutes: e.target.value === "" ? "" : Number(e.target.value) })}
                className="h-9 w-36"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{t("minutes")}</span>
            </div>
            <Input
              type="text"
              placeholder={t("Correction reason (required)")}
              value={decision?.reason || ""}
              onChange={(e) => set({ reason: e.target.value })}
              className="h-9"
            />
          </div>
        )}
        <Option
          value="omitted"
          title={t("Omit duration from the report")}
          sub={t("The customer report shows no duration (use when the actual time is unknown).")}
        />
      </div>
    </div>
  );
}