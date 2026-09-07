import React from "react";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUSES } from "@/components/visits/VisitChecklistItem";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Guided Checklist review screen: a REVIEW of the checklist answers and a
// TRANSITION into the rest of the visit workflow — explicitly NOT a claim
// that the visit is complete (the visit's own Complete Visit action stays
// separate, in the wizard). Display-only: counts answers already saved on the
// SAME visit checklist; "Continue Visit" hands back to the wizard's EXISTING
// next-step logic (first blocking checklist item, else the next relevant
// section). No visit completion, report, PDF, issue, or ledger logic here.
export default function GuidedSummary({ checklist, onContinue, onBack }) {
  const { t } = useLanguage();
  const total = checklist.length;
  const count = (status) => checklist.filter((it) => it.status === status).length;
  const reviewed = STATUSES.reduce((n, s) => n + count(s.value), 0);
  const allReviewed = reviewed >= total;

  return (
    <div className="flex flex-col items-center text-center gap-4 py-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <ClipboardCheck className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{t("Checklist Review")}</h2>
      <p className="text-sm text-muted-foreground">{t("{count} of {total} reviewed", { count: reviewed, total })}</p>

      <div className="w-full rounded-2xl border border-border bg-card p-4 space-y-2.5 text-left">
        {STATUSES.map((s) => (
          <div key={s.value} className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full border ${s.cls}`}>
              <s.icon className="w-3.5 h-3.5" />
              {t(s.label)}
            </span>
            <span className="text-lg font-bold text-foreground">{count(s.value)}</span>
          </div>
        ))}
      </div>

      <p className="text-sm font-medium text-foreground">
        {allReviewed
          ? t("Checklist complete. Continue to finish the remaining visit details.")
          : t("Some checklist items are still unanswered — go back to review them.")}
      </p>

      <Button onClick={onContinue} className="w-full h-14 rounded-2xl text-base font-semibold">
        {t("Continue Visit")}
      </Button>
      <Button variant="outline" onClick={onBack} className="w-full h-12 rounded-2xl">
        {t("Back to Checklist")}
      </Button>
    </div>
  );
}