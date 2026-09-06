import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUSES } from "@/components/visits/VisitChecklistItem";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Guided Checklist completion summary. Display-only: counts the answers
// already saved on the SAME visit checklist and hands back to the EXISTING
// Visit Wizard review / completion / report flow — no visit completion,
// report, PDF, issue, or ledger logic is duplicated here.
export default function GuidedSummary({ checklist, onClose, onBack }) {
  const { t } = useLanguage();
  const total = checklist.length;
  const count = (status) => checklist.filter((it) => it.status === status).length;
  const reviewed = STATUSES.reduce((n, s) => n + count(s.value), 0);

  return (
    <div className="flex flex-col items-center text-center gap-4 py-4">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{t("Visit Checklist Complete")}</h2>
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

      <Button onClick={onClose} className="w-full h-14 rounded-2xl text-base font-semibold">
        {t("Return to Visit")}
      </Button>
      <Button variant="outline" onClick={onBack} className="w-full h-12 rounded-2xl">
        {t("Back to Checklist")}
      </Button>
    </div>
  );
}