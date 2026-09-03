import React from "react";
import { Link } from "react-router-dom";
import { Euro, ArrowRight } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { displayStatus, statusBadgeClass, outstandingTotal, eur } from "@/lib/billing";

// Priority for the summary lines: Overdue first, then Due, then recent Paid.
function linePriority(ch) {
  const st = displayStatus(ch);
  if (st === "Overdue") return 0;
  if (st === "Due") return 1;
  if (st === "Paid") return 2;
  return 3;
}

// Client Hub billing card — same card pattern as the hub's ActivitySections:
// compact outstanding summary, then up to 5 prioritized charge lines.
export default function ClientBillingCard({ charges, propName }) {
  const list = (charges || []).filter((c) => !c.archived);
  const openCount = list.filter((c) => c.status === "Due").length;
  const outstanding = outstandingTotal(list);
  const lines = [...list].sort((a, b) => {
    const p = linePriority(a) - linePriority(b);
    if (p) return p;
    if (linePriority(a) === 2) return String(b.paid_date || "").localeCompare(String(a.paid_date || ""));
    return String(a.due_date || "").localeCompare(String(b.due_date || ""));
  }).slice(0, 5);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Euro className="w-4 h-4 text-muted-foreground" /> Billing
          {list.length > 0 && <span className="text-xs text-muted-foreground">({openCount} open)</span>}
        </div>
        <Link to="/billing" className="text-xs text-primary flex items-center gap-1 hover:underline">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">Outstanding</p>
        <p className={`text-xl font-semibold ${outstanding > 0 ? "" : "text-muted-foreground"}`}>
          {outstanding > 0 ? eur(outstanding) : "—"}
        </p>
      </div>
      <div className="divide-y divide-border">
        {list.length === 0 ? (
          <EmptyState icon={Euro} title="No billing charges yet" />
        ) : lines.map((ch) => (
          <Link key={ch.id} to="/billing" className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/50 transition">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{ch.description || "Charge"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {propName ? propName(ch.property_id) : "Property"}
                {ch.due_date ? ` · due ${ch.due_date}` : ch.paid_date ? ` · paid ${ch.paid_date}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-medium">{eur(ch.amount)}</span>
              <span className={statusBadgeClass(displayStatus(ch))}>{displayStatus(ch)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}