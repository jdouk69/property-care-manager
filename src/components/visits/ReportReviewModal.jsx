import React from "react";
import {
  X, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, AlertOctagon,
  ListChecks, MapPin, Camera, Eye, Minus, Languages, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image as UIImage } from "@/components/ui/image";
import { athensMediumDateTime } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { reportLabelsFor } from "@/lib/reportLabels";

/**
 * Renders the customer-facing report EXACTLY as the owner will receive it (and
 * exactly as the PDF renders). Consumes buildOwnerReportModel. Internal notes and
 * non-owner-visible item notes/photos are never present in the model.
 *
 * Visual direction matches the PDF: navy, muted gold and cream; serif display
 * headings; observation table; captioned photo grid.
 */
const SEV = {
  urgent: { tone: "bg-rose-500/10 text-rose-600 border-rose-500/20", Icon: AlertTriangle, label: "Urgent" },
  attention: { tone: "bg-amber-500/10 text-amber-600 border-amber-500/20", Icon: AlertCircle, label: "Attention Recommended" },
  monitor: { tone: "bg-slate-500/10 text-slate-600 border-slate-500/20", Icon: AlertCircle, label: "Monitor" },
};
const OVERALL = {
  ok: { tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2 },
  attention: { tone: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: AlertTriangle },
  urgent: { tone: "bg-rose-500/10 text-rose-600 border-rose-500/30", Icon: AlertOctagon },
  monitor: { tone: "bg-slate-500/10 text-slate-600 border-slate-500/30", Icon: Eye },
};

function PriorityBreakdown({ counts, L }) {
  const segs = [];
  if (counts.urgent) segs.push({ n: counts.urgent, label: L.priorityLabels.urgent, cls: "text-rose-600" });
  if (counts.attention) segs.push({ n: counts.attention, label: L.priorityLabels.attention, cls: "text-amber-600" });
  if (counts.monitor) segs.push({ n: counts.monitor, label: L.priorityLabels.monitor, cls: "text-slate-500" });
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      {segs.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <span className="text-muted-foreground/60">·</span>}
          <span className={`font-semibold ${s.cls}`}>{s.n} {s.label}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <div className="flex items-center gap-2">
      <p className="font-serif text-sm font-bold tracking-wide text-report-navy">{children}</p>
      <span className="h-px flex-1 bg-report-gold/60" />
    </div>
  );
}

export default function ReportReviewModal({ open, model, generating, sending, approving, reviewState, error, photoWarn, onClose, onSend, onApprove, onBackToEdit }) {
  const { t } = useLanguage();
  if (!open) return null;
  if (generating || !model) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border max-w-md w-full p-8 text-center shadow-xl">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("Generating customer report…")}</p>
          <div className="flex justify-end mt-4"><Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button></div>
        </div>
      </div>
    );
  }

  const {
    business = {}, property = {}, client = {}, visit = {}, visitTypeLabel: vtl, labels: L = reportLabelsFor("en"),
    overallStatus = { key: "ok", label: L.statusLabels.ok }, counts = { urgent: 0, attention: 0, monitor: 0 },
    priorityBreakdown = "", routineLine = "", summaryText = "", concernSummary = "",
    findings = [], findingPhotos = [], routineChecks = [], docPhotos = [],
    monitoringPriorities = [], durationMinutes = null,
    issues = [], tasks = [], nextVisit,
  } = model;

  const ov = OVERALL[overallStatus.key] || OVERALL.ok;
  const nextSteps = [];
  if (issues.length) nextSteps.push(L.maintenance(issues.length));
  if (tasks.length) nextSteps.push(L.followUps(tasks.length));
  if (nextVisit && nextVisit.start_time) nextSteps.push(L.nextScheduled(athensMediumDateTime(nextVisit.start_time)));

  // Sending requires an approved PDF whose fingerprint still matches the
  // current data (reportDelivery.js reviewStateFor).
  const canSend = !!reviewState?.approved && !!reviewState?.hashMatches;
  // Staff-authored notes written in the other script are shown exactly as
  // recorded — flagged here so a translation can be added before sending.
  const languageMismatchList = [
    ...(findings || []).filter((f) => f.langMismatch),
    ...(routineChecks || []).filter((r) => r.langMismatch),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-card rounded-2xl border border-border max-w-2xl w-full shadow-xl max-h-[94vh] flex flex-col">
        {/* Compact header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-semibold text-sm truncate">{t("Report Review")}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 -mr-1 shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto px-3 py-3 space-y-3">
          {/* Approval state — sending is gated on an approved, still-current PDF */}
          {reviewState && (
            reviewState.approved && reviewState.hashMatches ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-500">
                  {t("Approved for sending")}
                  {reviewState.reviewedBy ? ` · ${t("by {name}", { name: reviewState.reviewedBy })}` : ""}
                  {reviewState.reviewedAt ? ` · ${athensMediumDateTime(reviewState.reviewedAt)}` : ""}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  {reviewState.approved
                    ? t("Data changed since approval — approve again before sending.")
                    : t("Not yet approved — approve to generate the PDF and enable sending.")}
                </p>
              </div>
            )
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-500">{error}</p>
            </div>
          )}

          {/* Masthead — navy band like the PDF */}
          <div className="rounded-xl bg-report-navy text-report-cream px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-serif text-base font-bold">{business.business_name || "Property Care"}</p>
              {business.logo && <UIImage src={business.logo} className="w-8 h-8 rounded bg-white/90 shrink-0" fittingType="fit" />}
            </div>
            {business.phone && <p className="mt-0.5 text-[11px] text-report-cream/80">{business.phone}</p>}
            <div className="mt-2 border-t border-report-gold/70 pt-1.5">
              <p className="font-serif text-xs font-bold tracking-widest">{L.reportTitle}</p>
            </div>
          </div>

          {/* Info panel — cream, matches the PDF */}
          <div className="rounded-xl bg-report-cream px-3 py-2.5 text-xs text-report-navy space-y-1">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <p><span className="font-semibold">{L.property}:</span> {property.name || "—"}</p>
              <p><span className="font-semibold">{L.owner}:</span> {client.name || "—"}</p>
              <p><span className="font-semibold">{L.visitDate}:</span> {athensMediumDateTime(visit.start_time) || "—"}</p>
              <p><span className="font-semibold">{L.serviceType}:</span> {vtl || "—"}</p>
              {durationMinutes != null && (
                <p><span className="font-semibold">{L.duration}:</span> {L.minutes(durationMinutes)}</p>
              )}
            </div>
            {monitoringPriorities.length > 0 && (
              <p className="border-t border-report-gold/40 pt-1.5">
                <span className="font-semibold">{L.prioritiesHeading}:</span> {monitoringPriorities.join(" · ")}
              </p>
            )}
          </div>

          {/* Overall status (prominent, near top) */}
          <div className={`flex items-center gap-2 rounded-xl border p-2.5 ${ov.tone}`}>
            <ov.Icon className="w-5 h-5 shrink-0" />
            <p className="text-sm font-semibold">{overallStatus.label}</p>
          </div>

          {/* Priority breakdown + routine line */}
          {priorityBreakdown && <PriorityBreakdown counts={counts} L={L} />}
          {routineLine && <p className="text-xs text-muted-foreground">{routineLine}</p>}

          {/* Visit summary */}
          <div>
            <SectionHeading>{L.visitSummary}</SectionHeading>
            <p className="text-sm text-foreground/90 leading-relaxed mt-1.5">{summaryText}</p>
          </div>

          {/* Visit Observations — simple table */}
          {findings.length > 0 && (
            <div>
              <SectionHeading>{L.observationsHeading}</SectionHeading>
              <div className="mt-2 overflow-hidden rounded-xl border border-report-gold/50">
                <div className="hidden sm:grid grid-cols-[110px_1fr_160px] bg-report-navy text-report-cream text-[11px] font-semibold">
                  <div className="px-3 py-2">{L.colPriority}</div>
                  <div className="px-3 py-2">{L.colObservation}</div>
                  <div className="px-3 py-2">{L.colFollowUp}</div>
                </div>
                {findings.map((f, i) => {
                  const s = SEV[f.severityKey] || SEV.monitor;
                  const followUp = (f.recommendation || "").trim() || (f.actionTaken || "").trim() || L.noActionNoted;
                  return (
                    <div key={i} className={`sm:grid sm:grid-cols-[110px_1fr_160px] border-t border-report-gold/30 ${i % 2 === 1 ? "bg-report-cream/50" : ""}`}>
                      <div className="px-3 pt-2 sm:py-2.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${s.tone}`}>{f.priorityLabel}</span>
                      </div>
                      <div className="px-3 py-1 sm:py-2.5">
                        <p className="text-sm font-semibold leading-snug">{f.title}</p>
                        {f.area && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {f.area}</p>}
                        {f.observed && <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">{f.observed}</p>}
                      </div>
                      <div className="px-3 pb-2 sm:py-2.5 text-xs text-muted-foreground">{followUp}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Captioned photo grid for observations */}
          {findingPhotos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {findingPhotos.map((dp, i) => (
                <div key={i}>
                  <a href={dp.url} target="_blank" rel="noreferrer" className="block aspect-[4/3] rounded-lg overflow-hidden">
                    <UIImage src={dp.url} className="w-full h-full" fittingType="fill" />
                  </a>
                  <p className="text-[11px] text-muted-foreground mt-1">{dp.caption}</p>
                </div>
              ))}
            </div>
          )}

          {/* Summary & next steps */}
          <div className="border-t border-report-gold/40 pt-3">
            <SectionHeading>{L.summaryNextSteps}</SectionHeading>
            {visit.summary && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1.5">{visit.summary}</p>
            )}
            {concernSummary && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{concernSummary}</p>
            )}
            {/* "No concerns" wording is impossible while any Important/Emergency
                item exists — concernSummary always renders in that case. */}
            {!visit.summary && !concernSummary && findings.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1.5">{L.noNextSteps}</p>
            )}
            {nextSteps.length > 0 && (
              <ul className="text-sm text-muted-foreground mt-2 space-y-0.5">
                {nextSteps.map((s, i) => <li key={i} className="flex items-start gap-1.5"><ListChecks className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {s}</li>)}
              </ul>
            )}
          </div>

          {/* Staff warnings — language mismatches / photos missing from the PDF.
              Mirrors the PDF: the document itself carries the counts and the
              localized follow-up wording, never internal title lists. */}
          {(languageMismatchList.length > 0 || (photoWarn || 0) > 0) && (
            <div className="space-y-2">
              {languageMismatchList.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
                  <Languages className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-500">{t("Some recorded notes are written in the other language. They appear exactly as recorded — consider adding a translation before sending.")}</p>
                </div>
              )}
              {(photoWarn || 0) > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
                  <Camera className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-500">{t("{count} photo(s) could not be included in the PDF.", { count: photoWarn })}</p>
                </div>
              )}
            </div>
          )}

          {/* Routine Checks — ONLY items completed without a concern (plus
              informational Unable/N-A/Not-checked rows in gray). Attention/
              Emergency findings are documented once, in the table above. */}
          {routineChecks.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <ListChecks className="w-3.5 h-3.5" /> {L.routineChecksHeading}
              </p>
              <div className="space-y-1.5">
                {routineChecks.map((rc, i) => {
                  if (rc.status === "Normal") {
                    return (
                      <p key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-report-gold shrink-0 mt-0.5" /> {rc.name}
                      </p>
                    );
                  }
                  const label = rc.status === "Unable to Check" ? L.unableDisplay : rc.status === "N/A" ? L.naDisplay : L.notCheckedDisplay;
                  return (
                    <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Minus className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        {rc.name} <span className="uppercase tracking-wide text-[10px] font-semibold">{label}</span>
                        {rc.note && <span className="text-foreground/70"> — {rc.note}</span>}
                      </span>
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {/* Routine Visit Photos */}
          {docPhotos.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> {L.routinePhotos}</p>
              <p className="text-[11px] text-muted-foreground mb-2">{L.routinePhotosSub}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {docPhotos.map((dp, i) => (
                  <div key={i}>
                    <a href={dp.url} target="_blank" rel="noreferrer" className="block aspect-[4/3] rounded-lg overflow-hidden">
                      <UIImage src={dp.url} className="w-full h-full" fittingType="fill" />
                    </a>
                    <p className="text-[11px] text-muted-foreground mt-1">{dp.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground italic leading-relaxed">{L.scopeStatement}</p>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-500">Internal notes and private findings are excluded from this report. Only owner-visible findings and notes appear above.</p>
          </div>
        </div>

        {/* Compact action footer (single row, safe-area aware) */}
        <div className="px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-border flex flex-row flex-wrap gap-2">
          <Button variant="outline" onClick={onBackToEdit} className="rounded-xl flex-1 sm:flex-none h-9">{t("Back to Edit")}</Button>
          {(!reviewState || !reviewState.approved || !reviewState.hashMatches) && (
            <Button onClick={onApprove} disabled={approving} className="rounded-xl flex-1 sm:flex-none h-9 gap-1.5">
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {approving ? t("Approving…") : t("Approve & Save PDF")}
            </Button>
          )}
          <Button onClick={onSend} disabled={!canSend || sending} className="rounded-xl flex-1 sm:flex-none h-9 gap-1.5">
            {sending ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {sending ? t("Sending…") : t("Send to Owner")}
          </Button>
        </div>
      </div>
    </div>
  );
}