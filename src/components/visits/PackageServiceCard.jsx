import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, RotateCw, CheckCircle2, Info, Package, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { athensToday } from "@/lib/timezone";
import { entitlementStatus } from "@/lib/packageEntitlement";
import { isRecurringAgreement, serviceFrequency } from "@/lib/activeService";
import RestartVisitDialog from "@/components/visits/RestartVisitDialog";

/**
 * Package Service Card (Choose Visit Type step): the property's ACTIVE
 * recurring service with its real entitlement status for the current
 * service period, computed from actual agreement/package configuration —
 * never hardcoded visit counts.
 *
 * Three distinct situations, kept distinct:
 *  1. INCLUDED package visit (allowance remaining) — start button.
 *  2. RESUME / RESTART of an unfinished included visit — never a second
 *     entitlement, never a second charge.
 *  3. ADDITIONAL requested visit (allowance consumed) — clearly labeled
 *     "Additional — billable"; never counted as another included visit.
 */
export default function PackageServiceCard({
  agreement, pkg, recType, recPreview, activeServiceName, visits, propertyId, draft,
  onStartIncluded, onStartFollowUp, onStartAdditional, onResumeDraft, onRestartDraft, onRestartRecord,
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [restartFor, setRestartFor] = useState(null); // { mode: "draft" } | { mode: "record", record }

  const ent = entitlementStatus({ visits: visits || [], agreement, pkg, recType, todayStr: athensToday() }) || { allowance: 1, used: 0, completed: 0, remaining: 1, unfinished: null, followUp: null };
  // Frequency from the REAL recurring configuration — never the free-text
  // inspection_frequency fields (stale onboarding defaults live there).
  const freq = serviceFrequency(agreement, pkg);
  const freqLine = [
    freq ? t("{count} included visit(s) per {period}", { count: freq.visits, period: t(freq.periodWord) }) : null,
    isRecurringAgreement(agreement) ? null : t("One-time service"),
  ].filter(Boolean).join(" · ");
  const checklistLine = recPreview && recPreview.found
    ? t("Checklist: {template} · {count} items", {
        template: recPreview.templateName || (recPreview.source === "Default" ? t("Built-in default checklist") : "—"),
        count: recPreview.count,
      })
    : t("Included scheduled visit for this service");
  // Unfinished local draft for THIS property (device-local, no record yet).
  const draftHere = draft && draft.propertyId === propertyId ? draft : null;
  const unfinished = ent.unfinished;

  const confirmRestart = () => {
    const r = restartFor;
    setRestartFor(null);
    if (!r) return;
    if (r.mode === "draft") onRestartDraft();
    else onRestartRecord(r.record);
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4">
      {/* Header — actual package/agreement data */}
      <div className="flex items-center gap-2 mb-1">
        <Package className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[11px] uppercase tracking-wide text-primary">{t("Active Service")}</p>
      </div>
      <p className="text-sm font-semibold text-foreground">{activeServiceName}</p>
      {freqLine && <p className="text-xs text-muted-foreground mt-0.5">{freqLine}</p>}
      <p className="text-xs text-muted-foreground mt-2">
        {t("Normal scheduled visit: {type}", { type: t(visitTypeLabel(recType)) })}
      </p>

      {/* Entitlement status + actions for the current service period */}
      {unfinished ? (
        <div className="mt-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
          <p className="text-xs text-sky-700 dark:text-sky-500 font-medium mb-0.5">
            {unfinished.status === "In Progress" ? t("Included visit in progress") : t("Included visit scheduled")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Resuming continues the same visit — no second included visit or charge is created.")}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button onClick={() => navigate(`/visits?resume=${unfinished.id}`)} className="rounded-2xl h-11 flex-1 min-w-[180px]">
              <Play className="w-4 h-4" /> {t("Resume {package} Visit", { package: activeServiceName })}
            </Button>
            <Button variant="outline" onClick={() => setRestartFor({ mode: "record", record: unfinished })} className="rounded-2xl h-11">
              <RotateCw className="w-4 h-4" /> {t("Restart")}
            </Button>
          </div>
        </div>
      ) : ent.remaining > 0 ? (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">
            {ent.used > 0
              ? t("{used} of {allowance} included visits completed", { used: ent.completed, allowance: ent.allowance })
              : t("Included visit not started")}
            {" · "}
            {t("{count} included visit(s) remaining", { count: ent.remaining })}
          </p>
          <button type="button" onClick={onStartIncluded}
            className="w-full text-left rounded-2xl border border-primary bg-primary text-primary-foreground px-3.5 py-3.5 hover:bg-primary/90 transition min-h-[56px]">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0"><Play className="w-4 h-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{t("Start {package} Visit", { package: activeServiceName })}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-primary-foreground/30 bg-primary-foreground/15 shrink-0">{t("Included in package")}</span>
                </div>
                <p className="text-xs opacity-80 truncate">{checklistLine}</p>
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t("Included visits complete")} — {t("{used} of {allowance} included visits completed", { used: ent.completed, allowance: ent.allowance })}
          </p>
          <button type="button" onClick={onStartAdditional}
            className="w-full text-left rounded-2xl border border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-500 px-3.5 py-3.5 hover:bg-amber-500/20 transition min-h-[56px]">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0"><Play className="w-4 h-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{t("Start Additional {package} Visit", { package: activeServiceName })}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">{t("Additional — billable")}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{checklistLine}</p>
              </div>
            </div>
          </button>
          <div className="flex items-start gap-1.5 mt-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">{t("An additional visit is billed as a separate service — it does not use another included visit.")}</p>
          </div>
        </div>
      )}

      {/* FOLLOW-UP companion slot (currently Complete Care): one brief check
          per period with a dated photo update — its own included slot, judged
          independently of the full visit's allowance. */}
      {ent.followUp && (
        <div className="mt-3 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 mb-0.5">
            <Camera className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-xs font-medium text-foreground">{t("Monthly follow-up check")}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {ent.followUp.used > 0
              ? ent.followUp.remaining > 0 || ent.followUp.unfinished
                ? t("Follow-up scheduled or in progress")
                : t("Follow-up completed")
              : t("Follow-up not started")}
          </p>
          {ent.followUp.unfinished ? (
            <div className="flex flex-wrap gap-2 mt-2">
              <Button onClick={() => navigate(`/visits?resume=${ent.followUp.unfinished.id}`)} className="rounded-2xl h-11 flex-1 min-w-[180px]">
                <Play className="w-4 h-4" /> {t("Resume {package} Visit", { package: t("Complete Care Follow-up Visit") })}
              </Button>
              <Button variant="outline" onClick={() => setRestartFor({ mode: "record", record: ent.followUp.unfinished })} className="rounded-2xl h-11">
                <RotateCw className="w-4 h-4" /> {t("Restart")}
              </Button>
            </div>
          ) : ent.followUp.remaining > 0 ? (
            <button type="button" onClick={onStartFollowUp}
              className="w-full text-left rounded-2xl border border-primary/40 bg-primary/10 text-foreground px-3.5 py-3.5 hover:bg-primary/15 transition min-h-[56px] mt-2">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><Camera className="w-4 h-4 text-primary" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{t("Start Follow-up Visit")}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shrink-0">{t("Included in package")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t("Short follow-up checklist · up to 15 minutes")}</p>
                </div>
              </div>
            </button>
          ) : null}
        </div>
      )}

      {/* Unfinished device-local draft for this property: resume or restart */}
      {draftHere && !unfinished && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-500">{t("Unfinished visit on this device")}</p>
          <p className="text-xs text-muted-foreground truncate">{t(visitTypeLabel(draftHere.visitType))}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button size="sm" onClick={onResumeDraft} className="rounded-full">{t("Resume")}</Button>
            <Button size="sm" variant="outline" onClick={() => setRestartFor({ mode: "draft" })} className="rounded-full">{t("Restart")}</Button>
          </div>
        </div>
      )}

      <RestartVisitDialog
        open={!!restartFor}
        mode={restartFor?.mode || "record"}
        scheduled={restartFor?.record?.status === "Scheduled"}
        onClose={() => setRestartFor(null)}
        onConfirm={confirmRestart}
      />
    </div>
  );
}