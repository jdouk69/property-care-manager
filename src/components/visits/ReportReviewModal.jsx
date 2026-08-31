import React from "react";
import {
  X, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, Wrench,
  ListChecks, MapPin, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image as UIImage } from "@/components/ui/image";

/**
 * Renders the customer-facing report EXACTLY as the owner will receive it (and
 * exactly as the PDF renders). Consumes the model produced by buildOwnerReportModel:
 *  - overallStatus, summaryText
 *  - findings[]  (owner-visible checklist findings + linked maintenance issues)
 *  - routineChecks[] (no owner-facing content -> secondary)
 *  - detailedRecord[] (clean-label transparency)
 *  - issues[], tasks[], nextVisit
 * Internal notes and non-owner-visible item notes/photos are never present in the
 * model, so they can never appear here.
 */
const SEV = {
  urgent: { tone: "bg-rose-500/10 text-rose-600 border-rose-500/20", dot: "bg-rose-500", Icon: AlertTriangle, label: "Urgent" },
  attention: { tone: "bg-amber-500/10 text-amber-600 border-amber-500/20", dot: "bg-amber-500", Icon: AlertCircle, label: "Attention Recommended" },
  monitor: { tone: "bg-slate-500/10 text-slate-600 border-slate-500/20", dot: "bg-slate-400", Icon: AlertCircle, label: "Monitor" },
};
const OVERALL = {
  ok: { tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2 },
  attention: { tone: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: AlertTriangle },
  urgent: { tone: "bg-rose-500/10 text-rose-600 border-rose-500/30", Icon: AlertTriangle },
};

export default function ReportReviewModal({ open, model, generating, sending, canSend, onClose, onSend, onBackToEdit }) {
  if (!open) return null;
  if (generating || !model) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border max-w-md w-full p-8 text-center shadow-xl">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Generating customer report…</p>
          <div className="flex justify-end mt-4"><Button variant="ghost" onClick={onClose}>Cancel</Button></div>
        </div>
      </div>
    );
  }

  const {
    business = {}, property = {}, client = {}, visit = {}, visitTypeLabel: vtl,
    overallStatus = { key: "ok", label: "No Concerns Noted" }, summaryText = "",
    findings = [], routineChecks = [], routineCount = 0, detailedRecord = [],
    issues = [], tasks = [], nextVisit,
  } = model;

  const ov = OVERALL[overallStatus.key] || OVERALL.ok;
  const nextSteps = [];
  if (issues.length) nextSteps.push(`${issues.length} maintenance item${issues.length === 1 ? "" : "s"} recorded — we will coordinate as agreed.`);
  if (tasks.length) nextSteps.push(`${tasks.length} follow-up task${tasks.length === 1 ? "" : "s"} scheduled.`);
  if (nextVisit && nextVisit.start_time) nextSteps.push(`Next scheduled visit: ${new Date(nextVisit.start_time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card rounded-2xl border border-border max-w-2xl w-full shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Report Review — as the owner will receive it</h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-4">
          {/* Header */}
          <div>
            <p className="text-base font-semibold">{business.business_name || "Property Care"}</p>
            <p className="text-xs text-muted-foreground">{[business.phone, business.email].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="border-t border-border pt-3">
            <h4 className="text-sm font-semibold mb-2">Property Care Visit Report</h4>
            <div className="text-sm space-y-0.5">
              <p><span className="text-muted-foreground">Property:</span> <span className="font-medium">{property.name || "—"}</span></p>
              {property.address && <p className="text-muted-foreground">{property.address}</p>}
              {client.name && <p><span className="text-muted-foreground">Owner:</span> <span className="font-medium">{client.name}</span></p>}
              <p><span className="text-muted-foreground">Service type:</span> <span className="font-medium">{vtl}</span></p>
              <p className="text-muted-foreground">{new Date(visit.start_time || Date.now()).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </div>

          {/* Overall status */}
          <div className={`flex items-center gap-2 rounded-xl border p-3 ${ov.tone}`}>
            <ov.Icon className="w-5 h-5 shrink-0" />
            <p className="text-sm font-semibold">{overallStatus.label}</p>
          </div>

          {/* Visit summary */}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Visit Summary</p>
            <p className="text-sm text-foreground/90">{summaryText}</p>
          </div>

          {/* Items requiring attention */}
          {findings.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Items Requiring Attention ({findings.length})</p>
              <div className="space-y-3">
                {findings.map((f, i) => {
                  const s = SEV[f.severityKey] || SEV.monitor;
                  return (
                    <div key={i} className="rounded-xl border border-border p-3">
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${s.tone}`}>{f.priorityLabel}</span>
                        <p className="text-sm font-semibold">{f.title}</p>
                      </div>
                      {f.area && <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {f.area}</p>}
                      {f.observed && (
                        <div className="mt-1.5">
                          <p className="text-xs font-medium text-muted-foreground">What we observed</p>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">{f.observed}</p>
                        </div>
                      )}
                      {f.recommendation && (
                        <div className="mt-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Recommended next step</p>
                          <p className="text-sm text-foreground/90 mt-0.5">{f.recommendation}</p>
                        </div>
                      )}
                      {f.photos?.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
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

          {/* Routine checks */}
          {routineCount > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-500 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Routine Checks — No Concerns Noted
              </p>
              <p className="text-xs text-muted-foreground mb-2">{routineCount} routine check{routineCount === 1 ? "" : "s"} completed with no concerns noted.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {routineChecks.map((rc, i) => (
                  <p key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> {rc.name}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Summary & next steps */}
          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold mb-1">Summary & Next Steps</p>
            {visit.summary ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.summary}</p>
            ) : findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No concerns were noted during this visit.</p>
            ) : null}
            {nextSteps.length > 0 && (
              <ul className="text-sm text-muted-foreground mt-2 space-y-0.5">
                {nextSteps.map((s, i) => <li key={i} className="flex items-start gap-1.5"><ListChecks className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {s}</li>)}
              </ul>
            )}
          </div>

          {/* Maintenance coordination / follow-ups (factual) */}
          {(issues.length > 0 || tasks.length > 0) && (
            <div className="space-y-2">
              {issues.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Maintenance Coordination ({issues.length})</p>
                  <div className="text-sm space-y-0.5">
                    {issues.map((iss, i) => <p key={i}>• {iss.title}{iss.priority ? ` [${iss.priority}]` : ""}{iss.status ? ` — ${iss.status}` : ""}</p>)}
                  </div>
                </div>
              )}
              {tasks.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> Follow-up Tasks ({tasks.length})</p>
                  <div className="text-sm space-y-0.5">
                    {tasks.map((t, i) => <p key={i}>• {t.title}</p>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detailed visit record */}
          {detailedRecord.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Detailed Visit Record</p>
              <div className="space-y-1">
                {detailedRecord.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground w-28 shrink-0">{d.label}</span>
                    <span className="text-foreground/80">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground italic">
            This Property Care Visit Report documents visual observations made during a routine property-care visit. It is not a professional home/building inspection, engineering evaluation, trade inspection, or certification.
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-500">Internal notes and private findings are excluded from this report. Only owner-visible findings and notes appear above.</p>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row gap-2 justify-end">
          <Button variant="outline" onClick={onBackToEdit} className="rounded-xl">Back to Edit</Button>
          <Button onClick={onSend} disabled={!canSend || sending} className="rounded-xl gap-1.5">
            {sending ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {sending ? "Sending…" : "Send to Owner"}
          </Button>
        </div>
      </div>
    </div>
  );
}