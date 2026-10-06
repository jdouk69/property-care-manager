import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, Circle, ArrowRight, AlertTriangle, Sparkles,
  User, FileSignature, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ActivateServiceButton from "@/components/agreements/ActivateServiceButton";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Compact onboarding summary for the Client Hub.
// Interface simplification ONLY: three staff-facing steps (Customer & Property,
// Service & Price, Review & Sign) mapped from the EXISTING deriveOnboarding
// stages — no stage is removed and no completion requirement is changed. One
// clear next action (derived from existing records by deriveOnboarding), and
// every original stage stays reachable in an expandable details section, which
// renders the full stage list unchanged.
export default function OnboardingSummary({ properties, selectedPropertyId, onSelectProperty, onboarding, onActivated }) {
  const { t } = useLanguage();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { stages, primaryAction, ready, serviceConflict } = onboarding || {};
  if (!stages) return null;
  const byKey = {};
  (stages || []).forEach((s) => { byKey[s.key] = s; });
  const agreementStage = byKey.agreement || {};
  const agreementStarted = !!(agreementStage.status && agreementStage.status !== "No agreement");

  const rows = [
    {
      key: "customer",
      label: "Customer & Property",
      icon: User,
      complete: !!(byKey.intake?.complete && byKey.property?.complete),
      status: byKey.intake?.complete && byKey.property?.complete ? "Complete" : "In progress",
    },
    {
      key: "service",
      label: "Service & Price",
      icon: FileSignature,
      complete: !!(byKey.assessment?.complete && agreementStarted),
      status: byKey.assessment?.complete && agreementStarted
        ? "Complete"
        : agreementStarted
          ? agreementStage.status
          : "Not started",
    },
    {
      key: "sign",
      label: "Review & Sign",
      icon: CheckCircle2,
      complete: !!agreementStage.complete,
      status: agreementStage.complete ? "Signed" : agreementStarted ? agreementStage.status : "Not started",
    },
  ];

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
          <Sparkles className="w-4 h-4 text-primary" /> {t("Onboarding")}
        </div>
        {ready && (
          <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
            {t("Ready for Regular Service")}
          </span>
        )}
      </div>

      {serviceConflict && (
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t("Agreement conflict — multiple active agreements. Resolve before continuing service-dependent stages.")}</span>
        </div>
      )}

      {/* Compact summary — three steps */}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              r.complete
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {r.complete ? <CheckCircle2 className="w-4.5 h-4.5 w-5 h-5" /> : <Circle className="w-4 h-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{t(r.label)}</p>
            </div>
            <span className={`text-xs shrink-0 ${r.complete ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {t(r.status)}
            </span>
          </div>
        ))}
      </div>

      {/* One clear next action (from existing records) */}
      {ready ? null : primaryAction && !serviceConflict && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-primary">{t("Next action")}</p>
            <p className="font-medium text-sm truncate">{t(primaryAction.action.label)}</p>
          </div>
          <div className="shrink-0">{renderAction(primaryAction.action)}</div>
        </div>
      )}

      {/* Expandable details — every original stage stays accessible */}
      <button
        type="button"
        onClick={() => setDetailsOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-xl px-1 py-2.5 mt-2 text-sm text-muted-foreground hover:text-foreground transition min-h-[44px]"
      >
        <span className="flex items-center gap-2">
          <Circle className="w-3.5 h-3.5" /> {t("All onboarding stages")}
        </span>
        {detailsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {detailsOpen && (
        <div className="mt-1">
          <OnboardingProgress
            properties={properties}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={onSelectProperty}
            onboarding={onboarding}
            onActivated={onActivated}
            showPrimaryAction={false}
          />
        </div>
      )}
    </div>
  );
}