import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  REMINDER_CATEGORIES,
  REMINDER_OFFSET_CHOICES,
  hasCategoryTiming,
  resolveReminderOffsets,
} from "@/lib/reminderOffsets";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Categories whose reminders actually consume timing offsets today:
//  Visits — distinct multi-offset reminders (due/1h/1d/3d/7d): multi-select.
//  Tasks — a single "due soon" horizon (1d/3d/7d max): single-select.
// Every other category is event-driven (urgent issues, same-day
// appointments, overdue reimbursements, unreturned keys…) and gets an
// ON/OFF switch only — no timing controls shown. Stored timing values for
// event-driven categories are preserved, just not exposed.
const TIMED_CATEGORIES = {
  Visits: { multi: true, choices: REMINDER_OFFSET_CHOICES },
  Tasks: {
    multi: false,
    choices: REMINDER_OFFSET_CHOICES.filter((o) => ["1d", "3d", "7d"].includes(o.v)),
  },
};

// Notifications & Reminders card for the Settings page.
// Only one timing panel is expanded at a time (mobile-clean).
export default function NotificationsRemindersCard({ settings, setField }) {
  const { t } = useLanguage();
  const [openRow, setOpenRow] = useState(null); // "default" | category name | null

  const globalOffsets = settings.reminder_offsets || [];
  const byCategory = settings.reminder_offsets_by_category || {};
  const enabledCats = settings.notif_categories || [...REMINDER_CATEGORIES];

  const offsetLabel = (k) => t((REMINDER_OFFSET_CHOICES.find((o) => o.v === k) || { l: k }).l);
  const timingSummary = (arr) =>
    (arr || []).length ? arr.map(offsetLabel).join(" · ") : t("No timed reminders");

  const setGlobalTiming = (key) =>
    setField("reminder_offsets",
      globalOffsets.includes(key) ? globalOffsets.filter((x) => x !== key) : [...globalOffsets, key]);

  // First change seeds the category's own selection from its resolved
  // offsets (so a fallback user starts from what they already see active).
  const setCategoryTiming = (cat, key, timed) => {
    const current = resolveReminderOffsets(settings, cat);
    const next = current.includes(key)
      ? current.filter((x) => x !== key)
      : timed.multi
      ? [...current, key]
      : [key]; // single-select: one horizon only
    setField("reminder_offsets_by_category", { ...byCategory, [cat]: next });
  };

  const TimingChips = ({ active, choices, onToggle }) => (
    <div className="mt-2 pb-2">
      <Label className="text-xs font-medium text-muted-foreground mb-2 block">{t("Remind me")}</Label>
      <div className="flex flex-wrap gap-2">
        {choices.map((o) => {
          const on = active.includes(o.v);
          return (
            <button key={o.v} type="button" onClick={() => onToggle(o.v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${on ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {t(o.l)}
            </button>
          );
        })}
      </div>
    </div>
  );

  const RowTitle = ({ label, isOpen, onToggle }) => (
    <button type="button" onClick={onToggle} className="flex items-center gap-1 min-w-0 text-left">
      <span className="text-sm truncate">{label}</span>
      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-4">
      <h3 className="font-medium text-sm mb-1">{t("Notifications & Reminders")}</h3>
      <p className="text-xs text-muted-foreground mb-4">{t("Choose when and where you receive reminders. Email and push are coming soon.")}</p>

      {/* Default reminder timing — legacy global offsets, kept as the
          fallback for timed categories (Visits/Tasks) only. */}
      <div className="py-1.5 border-b border-border">
        <RowTitle label={t("Default reminder timing")} isOpen={openRow === "default"} onToggle={() => setOpenRow(openRow === "default" ? null : "default")} />
        <button type="button" onClick={() => setOpenRow(openRow === "default" ? null : "default")}
          className="text-xs text-muted-foreground text-left mt-0.5">
          {t("Used by timed reminder categories until a category-specific timing is set.")}
        </button>
        {openRow === "default" && <TimingChips active={globalOffsets} choices={REMINDER_OFFSET_CHOICES} onToggle={setGlobalTiming} />}
      </div>

      {REMINDER_CATEGORIES.map((cat) => {
        const on = enabledCats.includes(cat);
        const timed = TIMED_CATEGORIES[cat];
        const isOpen = openRow === cat;
        const toggleOpen = () => setOpenRow(isOpen ? null : cat);
        return (
          <div key={cat} className="py-1.5 border-b border-border last:border-0">
            <div className="flex items-center justify-between gap-2">
              {timed
                ? <RowTitle label={t(cat)} isOpen={isOpen} onToggle={toggleOpen} />
                : <span className="text-sm truncate">{t(cat)}</span>}
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${on ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{t("In-app")}</span>
                {/* ON/OFF only — turning a category OFF preserves its timing */}
                <Switch checked={on} onCheckedChange={(v) => setField("notif_categories", v ? [...enabledCats, cat] : enabledCats.filter((x) => x !== cat))} />
              </div>
            </div>
            {timed && (
              <>
                <button type="button" onClick={toggleOpen} className="text-xs text-muted-foreground text-left mt-0.5">
                  {hasCategoryTiming(settings, cat)
                    ? timingSummary(resolveReminderOffsets(settings, cat))
                    : `${t("Default")}: ${timingSummary(globalOffsets)}`}
                </button>
                {isOpen && (
                  <TimingChips
                    active={resolveReminderOffsets(settings, cat)}
                    choices={timed.choices}
                    onToggle={(k) => setCategoryTiming(cat, k, timed)}
                  />
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}