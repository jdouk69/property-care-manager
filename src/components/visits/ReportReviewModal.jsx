import React from "react";
import {
  X, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, AlertOctagon,
  ListChecks, MapPin, Camera, Eye, EyeOff, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image as UIImage } from "@/components/ui/image";
import { athensMediumDateTime } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Renders the customer-facing report EXACTLY as the owner will receive it (and
 * exactly as the PDF renders). Consumes buildOwnerReportModel. Internal notes and
 * non-owner-visible item notes/photos are never present in the model.
 */
const SEV = {
  urgent: { tone: "bg-rose-500/10 text-rose-600 border-rose-500/20", dot: "bg-rose-500", Icon: AlertTriangle, label: "Urgent" },
  attention: { tone: "bg-amber-500/10 text-amber-600 border-amber-500/20", dot: "bg-amber-500", Icon: AlertCircle, label: "Attention Recommended" },
  monitor: { tone: "bg-slate-500/10 text-slate-600 border-slate-500/20", dot: "bg-slate-400", Icon: AlertCircle, label: "Monitor" },
};
const OVERALL = {
  ok: { tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2 },
  attention: { tone: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: AlertTriangle },
  urgent: { tone: "bg-rose-500/10 text-rose-600 border-rose-500/30", Icon: AlertOctagon },
  monitor: { tone: "bg-slate-500/10 text-slate-600 border-slate-500/30", Icon: Eye },
};

function PriorityBreakdown({ counts }) {
  const segs = [];
  if (counts.urgent) segs.push({ n: counts.urgent, label: "Urgent", cls: "text-rose-600" });
  if (counts.attention) segs.push({ n: counts.attention, label: "Attention Recommended", cls: "text-amber-600" });
  if (counts.monitor) segs.push({ n: counts.monitor, label: "Monitor", cls: "text-slate-500" });
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

export default function ReportReviewModal({ open, model, generating, sending, canSend, onClose, onSend, onBackToEdit }) {
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
    business = {}, property = {}, client = {}, visit = {}, visitTypeLabel: vtl,
    overallStatus = { key: "ok", label: "No Concerns Noted" }, counts = { urgent: 0, attention: 0, monitor: 0 },
    priorityBreakdown = "", routineLine = "", summaryText = "", concernSummary = "",
    findings = [], routineChecks = [], docPhotos = [],
    issues = [], tasks = [], nextVisit,
  } = model;

  const ov = OVERALL[overallStatus.key] || OVERALL.ok;
  const nextSteps = [];
  if (issues.length) nextSteps.push(`${issues.length} maintenance item${issues.length === 1 ? "" : "s"} recorded — we will coordinate as agreed.`);
  if (tasks.length) nextSteps.push(`${tasks.length} follow-up task${tasks.length === 1 ? "" : "s"} scheduled.`);
  if (nextVisit && nextVisit.start_time) nextSteps.push(`Next scheduled visit: ${athensMediumDateTime(nextVisit.start_time)}.`);

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
          {/* Business + compact property info (one small line) */}
          <div>
            <div className="flex items-center gap-2.5">
              {business.logo && (
                <UIImage src={business.logo} className="w-9 h-9 rounded-md shrink-0" fittingType="fit" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{business.business_name || "Property Care"}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{[business.phone, business.email].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug mt-1">
              {[property.name, client.name, athensMediumDateTime(visit.start_time), vtl].filter(Boolean).map((s, i) => (
                <React.Fragment key={i}>{i > 0 && <span className="text-muted-foreground/50"> · </span>}{s}</React.Fragment>
              ))}
            </p>
          </div>

          {/* Overall status (prominent, near top) */}
          <div className={`flex items-center gap-2 rounded-xl border p-2.5 ${ov.tone}`}>
            <ov.Icon className="w-5 h-5 shrink-0" />
            <p className="text-sm font-semibold">{overallStatus.label}</p>
          </div>

          {/* Priority breakdown + routine line */}
          {priorityBreakdown && <PriorityBreakdown counts={counts} />}
          {routineLine && <p className="text-xs text-muted-foreground">{routineLine}</p>}

          {/* Visit summary */}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Visit Summary</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{summaryText}</p>
          </div>

          {/* Visit Observations (findings) */}
          {findings.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Visit Observations ({findings.length})</p>
              <div className="space-y-3">
                {findings.map((f, i) => {
                  const s = SEV[f.severityKey] || SEV.monitor;
                  return (
                    <div key={i} className="rounded-xl border border-border p-3">
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${s.tone}`}>{f.priorityLabel}</span>
                        <p className="text-sm font-semibold leading-snug">{f.title}</p>
                      </div>
                      {f.area && <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {f.area}</p>}
                      {f.observed && (
                        <div className="mt-1.5">
                          <p className="text-xs font-medium text-muted-foreground">What we observed</p>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">{f.observed}</p>
                        </div>
                      )}
                      {f.actionTaken && (
                        <div className="mt-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Action taken</p>
                          <p className="text-sm text-foreground/90 mt-0.5">{f.actionTaken}</p>
                        </div>
                      )}
                      {f.recommendation && (
                        <div className="mt-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Recommended next step</p>
                          <p className="text-sm text-foreground/90 mt-0.5">{f.recommendation}</p>
                        </div>
                      )}
                      {f.photos?.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                          {f.photos.map((url, pi) => (
                            <a key={pi} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden">
                              <UIImage src={url} className="w-full h-full" fittingType="fill" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Routine Checks — status-by-status result of every checklist item.
              Green check = checked, no concern observed; abnormal items show
              their own checklist-specific note. Unable/N/A render gray. */}
          {routineChecks.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <ListChecks className="w-3.5 h-3.5" /> Routine Checks
              </p>
              <div className="space-y-1.5">
                {routineChecks.map((rc, i) => {
                  if (rc.status === "Normal") {
                    return (
                      <p key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> {rc.name}
                      </p>
                    );
                  }
                  if (rc.status === "Important" || rc.status === "Emergency") {
                    const urgent = rc.status === "Emergency";
                    return (
                      <div key={i} className={`rounded-lg border p-2 ${urgent ? "border-rose-500/25 bg-rose-500/5" : "border-amber-500/25 bg-amber-500/5"}`}>
                        <div className="flex items-start gap-1.5 flex-wrap">
                          {urgent
                            ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />}
                          <p className="text-xs font-semibold leading-snug">{rc.name}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border shrink-0 ${urgent ? "text-rose-600 border-rose-500/30 bg-rose-500/10" : "text-amber-600 border-amber-500/30 bg-amber-500/10"}`}>
                            {urgent ? "Urgent" : "Attention Recommended"}
                          </span>
                        </div>
                        {rc.note && (
                          <p className="text-[11px] text-foreground/80 mt-1 whitespace-pre-wrap">
                            <span className="font-medium text-muted-foreground">What we observed: </span>{rc.note}
                          </p>
                        )}
                      </div>
                    );
                  }
                  const label = rc.status === "Unable to Check" ? "Unable to check" : rc.status === "N/A" ? "N/A" : "Not checked";
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
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Routine Visit Photos</p>
              <p className="text-[11px] text-muted-foreground mb-2">Documentation photos showing general property conditions during this visit.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {docPhotos.map((dp, i) => (
                  <div key={i}>
                    <a href={dp.url} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden">
                      <UIImage src={dp.url} className="w-full h-full" fittingType="fill" />
                    </a>
                    <p className="text-[11px] text-muted-foreground mt-1">{dp.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary & next steps */}
          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold mb-1">Summary & Next Steps</p>
            {visit.summary && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.summary}</p>
            )}
            {concernSummary && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{concernSummary}</p>
            )}
            {/* "No concerns" wording is impossible while any Important/Emergency
                item exists — concernSummary always renders in that case. */}
            {!visit.summary && !concernSummary && findings.length === 0 && (
              <p className="text-sm text-muted-foreground">No concerns were noted during this visit.</p>
            )}
            {nextSteps.length > 0 && (
              <ul className="text-sm text-muted-foreground mt-2 space-y-0.5">
                {nextSteps.map((s, i) => <li key={i} className="flex items-start gap-1.5"><ListChecks className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {s}</li>)}
              </ul>
            )}
          </div>

          {(issues.length > 0 || tasks.length > 0) && (
            <div className="space-y-2">
              {issues.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Maintenance Coordination ({issues.length})</p>
                  <div className="text-sm space-y-0.5">
                    {issues.map((iss, i) => <p key={i}>• {iss.title}{iss.priority ? ` [${iss.priority}]` : ""}{iss.status ? ` — ${iss.status}` : ""}</p>)}
                  </div>
                </div>
              )}
              {tasks.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Follow-up Tasks ({tasks.length})</p>
                  <div className="text-sm space-y-0.5">
                    {tasks.map((t, i) => <p key={i}>• {t.title}</p>)}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
            This Property Care Visit Report documents visual observations made during {model?.visitTypeLabel ? `this ${model.visitTypeLabel}` : "a property-care visit"}. It is not a professional home/building inspection, engineering evaluation, trade inspection, or certification.
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-500">Internal notes and private findings are excluded from this report. Only owner-visible findings and notes appear above.</p>
          </div>
        </div>

        {/* Compact action footer (single row, safe-area aware) */}
        <div className="px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-border flex flex-row gap-2">
          <Button variant="outline" onClick={onBackToEdit} className="rounded-xl flex-1 sm:flex-none h-9">{t("Back to Edit")}</Button>
          <Button onClick={onSend} disabled={!canSend || sending} className="rounded-xl flex-1 sm:flex-none h-9 gap-1.5">
            {sending ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {sending ? t("Sending…") : t("Send to Owner")}
          </Button>
        </div>
      </div>
    </div>
  );
}