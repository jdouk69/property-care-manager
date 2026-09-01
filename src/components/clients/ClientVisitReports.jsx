import React from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, FileText, Send, RotateCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { athensMediumDate } from "@/lib/timezone";

const STATUS_TONE = {
  Draft: "bg-muted text-muted-foreground border-border",
  "Ready to Send": "bg-sky-500/10 text-sky-600 border-sky-500/20",
  Sent: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Delivery Failed": "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const fmt = (iso) => (iso ? athensMediumDate(iso) : "—");

/**
 * Permanent history of completed visits and their owner-report delivery status
 * for a client. Surface report status + View Report + Send/Resend. The actual
 * send happens on the Visit Detail page (single delivery path).
 */
export default function ClientVisitReports({ visits, propName, to = "/visits" }) {
  const completed = (visits || []).filter((v) => v.status === "Completed" && !v.archived);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-medium text-sm">
          <ClipboardCheck className="w-4 h-4 text-muted-foreground" /> Visit Reports
          <span className="text-xs text-muted-foreground">({completed.length})</span>
        </div>
        <Link to={to} className="text-xs text-primary flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></Link>
      </div>
      {completed.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No visit reports yet" />
      ) : (
        <div className="divide-y divide-border">
          {completed.map((v) => {
            const isAssistance = v.visit_type === "Property Assistance";
            const linkTo = isAssistance ? `/property-assistance/${v.id}` : `/visits/${v.id}`;
            const status = isAssistance ? "Completed" : (v.report_status || (v.report_sent ? "Sent" : "Draft"));
            const sent = status === "Sent";
            return (
              <div key={v.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{propName(v.property_id)} — {visitTypeLabel(v.visit_type)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {fmt(v.start_time)}
                      {isAssistance && v.agreed_price != null ? ` · €${Number(v.agreed_price || 0).toFixed(0)}` : ""}
                      {!isAssistance && v.report_sent_at ? ` · Sent ${athensMediumDate(v.report_sent_at)}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${isAssistance ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : STATUS_TONE[status] || STATUS_TONE.Draft}`}>{status}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 px-3">
                    <Link to={linkTo}><FileText className="w-3.5 h-3.5" /> {isAssistance ? "View Job" : "View Report"}</Link>
                  </Button>
                  {!isAssistance && (
                    <Button asChild size="sm" className="rounded-xl gap-1.5 h-8 px-3">
                      <Link to={linkTo}>{sent ? <><RotateCw className="w-3.5 h-3.5" /> Resend Report</> : <><Send className="w-3.5 h-3.5" /> Send Report</>}</Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}