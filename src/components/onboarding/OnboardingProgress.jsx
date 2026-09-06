import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, CircleDot, ArrowRight, AlertTriangle, Sparkles, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import ActivateServiceButton from "@/components/agreements/ActivateServiceButton";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Step 7 — Staff onboarding progress workflow for Client Hub. Renders a compact,
// sequential, property-aware stage list with one primary next action. No
// business logic lives here; it only displays the derived stages. An
// `action.activate` signal renders the shared ActivateServiceButton (which
// opens an explicit confirmation and calls the secure agreementActivate
// backend) instead of routing to the Edit Agreement page.
export default function OnboardingProgress({ properties, selectedPropertyId, onSelectProperty, onboarding, onActivated }) {
  const { t } = useLanguage();
  const { stages, primaryAction, ready, serviceConflict } = onboarding || {};
  if (!stages) return null;
  const currentIdx = stages.findIndex((s) => !s.complete);
  const multi = (properties || []).length > 1;

  const renderAction = (action) => {
    if (!action) return null;
    if (action.activate) {
      return (
        <div className="mt-2">
          <ActivateServiceButton
            agreementId={action.activate}
            isReplacement={!!action.isReplacement}
            onActivated={onActivated || (() => window.location.reload())}
            label={action.label || "Activate Service"}
          />
        </div>
      );
    }
    if (action.to) {
      return (
        <Link to={action.to}>
          <Button size="sm" variant="outline" className="gap-1.5 mt-2 h-9">
            {t(action.label)} <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      );
    }
    if (action.scroll) {
      const scroll = () => {
        const el = document.getElementById(action.scroll);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      return (
        <Button size="sm" variant="outline" className="gap-1.5 mt-2 h-9" onClick={scroll}>
          {t(action.label)} <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Sparkles className="w-4 h-4 text-primary" /> {t("Onboarding Progress")}
        </div>
        {ready && (
          <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
            {t("Ready for Regular Service")}
          </span>
        )}
      </div>

      {multi && (
        <div className="mb-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 min-w-max">
            {properties.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProperty?.(p.id)}
                className={`px-3 h-9 rounded-full text-xs font-medium border whitespace-nowrap transition touch-manipulation inline-flex items-center gap-1 ${
                  p.id === selectedPropertyId ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                <Home className="w-3 h-3" /> {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {serviceConflict && (
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t("Agreement conflict — multiple active agreements. Resolve before continuing service-dependent stages.")}</span>
        </div>
      )}

      {primaryAction && !serviceConflict && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-primary">{t("Next action")}</p>
            <p className="font-medium text-sm truncate">{t(primaryAction.action.label)}</p>
          </div>
          <div className="shrink-0">{renderAction(primaryAction.action)}</div>
        </div>
      )}

      <ol className="space-y-0">
        {stages.map((s, i) => {
          const isComplete = s.complete;
          const isCurrent = i === currentIdx && !isComplete;
          const last = i === stages.length - 1;
          const connectorClass = isComplete ? "bg-emerald-200 dark:bg-emerald-500/20" : "bg-border";
          return (
            <li key={s.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isComplete
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="w-5 h-5" /> : isCurrent ? <CircleDot className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </span>
                {!last && <span className={`w-px flex-1 ${connectorClass}`} />}
              </div>
              <div className="flex-1 pb-4 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t(s.name)}</p>
                  <span className={`text-xs shrink-0 ${isComplete ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>{t(s.status)}</span>
                </div>
                {s.detail && <p className="text-xs text-muted-foreground mt-0.5">{t(s.detail)}</p>}
                {renderAction(s.action)}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}