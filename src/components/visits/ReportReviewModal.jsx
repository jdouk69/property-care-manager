import React from "react";
import { X, MapPin, Clock, Gauge, Wrench, ListChecks, CheckCircle2, AlertTriangle, ShieldCheck, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image as UIImage } from "@/components/ui/image";

/**
 * Renders the customer-facing report EXACTLY as the owner will receive it.
 * Internal notes and non-owner-visible item notes/photos are already excluded
 * by buildOwnerReportModel — this component never receives them.
 */
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
  const { business, property, client, visit, visitTypeLabel: vtl, groups, result, meterReadings, issues, tasks, nextVisit } = model;

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
            <h4 className="text-sm font-semibold mb-2">Property Visit Report</h4>
            <div className="text-sm space-y-0.5">
              <p><span className="text-muted-foreground">Property:</span> <span className="font-medium">{property.name || "—"}</span></p>
              {property.address && <p className="text-muted-foreground">{property.address}</p>}
              {client.name && <p><span className="text-muted-foreground">Owner:</span> <span className="font-medium">{client.name}</span></p>}
              <p><span className="text-muted-foreground">Visit type:</span> <span className="font-medium">{vtl}</span></p>
              <p className="text-muted-foreground">{new Date(visit.start_time || Date.now()).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </div>

          {/* Overall result */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall result</p>
            <p className="text-sm font-medium mt-0.5">{result}</p>
          </div>

          {/* Checklist groups */}
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${g.tone}`}>{g.label} ({g.items.length})</span>
                </div>
                <div className="space-y-2">
                  {g.items.map((it, i) => (
                    <div key={i} className="border-l-2 border-border pl-3">
                      <p className="text-sm font-medium">{it.name}</p>
                      {it.notes && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{it.notes}</p>}
                      {it.photos?.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {it.photos.map((url, pi) => (
                            <a key={pi} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden">
                              <UIImage src={url} className="w-full h-full" fittingType="fill" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {g.items.length === 0 && <p className="text-xs text-muted-foreground pl-3">None</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Meter readings */}
          {meterReadings.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> Meter Readings</p>
              <div className="text-sm space-y-0.5">
                {meterReadings.map((m, i) => <p key={i}>{m.label || "—"}: <span className="font-medium">{m.value || "—"}</span></p>)}
              </div>
            </div>
          )}

          {/* Issues */}
          {issues.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Maintenance Issues ({issues.length})</p>
              <div className="text-sm space-y-0.5">
                {issues.map((iss, i) => <p key={i}>• {iss.title}{iss.priority ? ` [${iss.priority}]` : ""}</p>)}
              </div>
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> Follow-up Tasks ({tasks.length})</p>
              <div className="text-sm space-y-0.5">
                {tasks.map((t, i) => <p key={i}>• {t.title}</p>)}
              </div>
            </div>
          )}

          {/* Next visit */}
          {nextVisit && nextVisit.start_time && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Next Scheduled Visit</p>
              <p className="text-sm">{new Date(nextVisit.start_time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          )}

          {/* Summary */}
          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold mb-1">Summary & Recommendations</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.summary || "No summary provided."}</p>
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            This report reflects visual observations only and does not constitute a professional home inspection, building inspection, engineering inspection, electrical inspection, plumbing inspection, code inspection, or certification.
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-500">Internal notes are excluded from this report. Only owner-visible findings and notes appear above.</p>
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