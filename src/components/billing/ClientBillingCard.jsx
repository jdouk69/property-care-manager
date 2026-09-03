import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Euro, ArrowRight } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { displayStatus, statusBadgeClass, outstandingTotal, eur } from "@/lib/billing";

// Display-only helpers — nothing here touches stored records.

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Billing month key: billing_period when available, else YYYY-MM from billing_date.
export function chargeMonthKey(charge) {
  if (charge.billing_period) return String(charge.billing_period).slice(0, 7);
  if (charge.billing_date) return String(charge.billing_date).slice(0, 7);
  return "";
}

// "2026-10" -> "October 2026"
export function monthLabel(key) {
  const [y, m] = key.split("-");
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11) return "";
  return `${MONTH_NAMES[mi]} ${y}`;
}

// "2026-10-15" -> "Oct 15"
function shortDate(dateStr) {
  const [y, m, d] = String(dateStr || "").slice(0, 10).split("-");
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11) return "";
  return `${MONTH_SHORT[mi]} ${Number(d)}`;
}

// Display description: drop a trailing "— <Month Year>" only when it exactly
// matches this group's month label. Stored data is never modified.
function displayDescription(charge, groupLabel) {
  const desc = charge.description || "Charge";
  if (!groupLabel) return desc;
  const re = new RegExp(`\\s*[—–-]\\s*${groupLabel}\\s*$`, "i");
  return desc.replace(re, "") || desc;
}

// Compact summary limits — "View all" handles the complete history.
const MAX_MONTHS = 2;
const MAX_ROWS_PER_MONTH = 5;

export default function ClientBillingCard({ charges }) {
  const list = (charges || []).filter((c) => !c.archived);
  const openCount = list.filter((c) => c.status === "Due").length;
  const outstanding = outstandingTotal(list);

  // Group by billing month, most recent first; charges within a month by billing_date.
  const groups = useMemo(() => {
    const byMonth = new Map();
    for (const ch of list) {
      const key = chargeMonthKey(ch);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push(ch);
    }
    return [...byMonth.entries()]
      .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
      .map(([key, items]) => {
        items.sort((a, b) =>
          String(a.billing_date || "").localeCompare(String(b.billing_date || "")) ||
          String(a.description || "").localeCompare(String(b.description || ""))
        );
        // Month total = that month's open (Due) charges.
        const openTotal = items.filter((c) => c.status === "Due").reduce((s, c) => s + (c.amount || 0), 0);
        return { key, label: monthLabel(key), items, openTotal };
      });
  }, [charges]);

  const shownGroups = groups.slice(0, MAX_MONTHS);
  const hiddenGroups = groups.length - shownGroups.length;

  const rowSecondary = (ch) => {
    const st = displayStatus(ch);
    const dateStr = st === "Paid" ? ch.paid_date : ch.due_date;
    const sd = shortDate(dateStr);
    return { st, dateText: sd ? `${st === "Waived" ? "Waived" : st === "Paid" ? "Paid" : "Due"} ${sd}` : "" };
  };

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

      {list.length === 0 ? (
        <EmptyState icon={Euro} title="No billing charges yet" />
      ) : (
        <div>
          {shownGroups.map((group) => {
            const shown = group.items.slice(0, MAX_ROWS_PER_MONTH);
            const hidden = group.items.length - shown.length;
            return (
              <div key={group.key || "undated"} className="border-b border-border last:border-b-0">
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label || "Other charges"}
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {shown.map((ch) => {
                    const { st, dateText } = rowSecondary(ch);
                    return (
                      <Link
                        key={ch.id}
                        to="/billing"
                        className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-muted/50 transition"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug break-words">
                            {displayDescription(ch, group.label)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {dateText && <span>{dateText}</span>}
                            <span className={statusBadgeClass(st)}>{st}</span>
                          </p>
                        </div>
                        <span className="text-sm font-medium shrink-0 pt-0.5">{eur(ch.amount)}</span>
                      </Link>
                    );
                  })}
                  {hidden > 0 && (
                    <Link to="/billing" className="block px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
                      +{hidden} more in {group.label || "this group"} · View all
                    </Link>
                  )}
                </div>
                {group.openTotal > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                    <p className="text-xs text-muted-foreground">{group.label} total</p>
                    <p className="text-sm font-medium">{eur(group.openTotal)}</p>
                  </div>
                )}
              </div>
            );
          })}
          {hiddenGroups > 0 && (
            <Link to="/billing" className="block px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground border-t border-border">
              +{hiddenGroups} more {hiddenGroups === 1 ? "month" : "months"} · View all
            </Link>
          )}
        </div>
      )}
    </div>
  );
}