import React from "react";
import { Link } from "react-router-dom";
import { FileWarning, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { visitTypeLabel } from "@/lib/visitTypeLabels";

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "";

/**
 * Compact operational reminder on the Dashboard when completed visit reports
 * are waiting to be sent. Distinct from property work / overdue visits — only
 * completed visits whose owner report has not been delivered (Ready to Send,
 * Draft, or Delivery Failed). Unsent reports from previous days keep
 * appearing until delivered or resolved. Hidden entirely when there are none.
 */
export default function ReportsToSendReminder({ visits = [], properties = [], clients = [] }) {
  const propName = (id) => properties.find((p) => p.id === id)?.name || "Property";
  const clientFor = (propId) => {
    const p = properties.find((x) => x.id === propId);
    return clients.find((c) => c.id === p?.owner_id)?.name || "";
  };
  const statusOf = (v) => v.report_status || (v.report_sent ? "Sent" : "Draft");
  const waiting = (visits || [])
    .filter((v) => v.status === "Completed" && !v.archived && statusOf(v) !== "Sent")
    .sort((a, b) => (b.start_time || "").localeCompare(a.start_time || ""));
  if (waiting.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden mb-5">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/10">
        <FileWarning className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-500">REPORTS TO SEND — {waiting.length}</p>
        <Link to="/reports" className="text-xs text-amber-700 dark:text-amber-500 ml-auto flex items-center gap-1 hover:underline">Open Reports <ArrowRight className="w-3 h-3" /></Link>
      </div>
      <div className="divide-y divide-border">
        {waiting.slice(0, 4).map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {propName(v.property_id)}{clientFor(v.property_id) ? ` · ${clientFor(v.property_id)}` : ""}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {visitTypeLabel(v.visit_type)} · Visit completed {fmtDate(v.start_time)}
              </p>
            </div>
            <Button asChild size="sm" className="rounded-xl gap-1.5 h-9 px-3 shrink-0">
              <Link to={`/reports?open=${v.id}`}>Review &amp; Send <ArrowRight className="w-3.5 h-3.5" /></Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}