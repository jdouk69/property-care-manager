import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Euro, ArrowRight, FilePlus2 } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import InvoiceReviewModal from "@/components/invoices/InvoiceReviewModal";
import {
  displayStatus, statusBadgeClass, outstandingTotal, eur,
  chargeMonthKey, monthLabel, stripMonthSuffix,
} from "@/lib/billing";
import {
  buildInvoiceDraft, findInvoiceForPeriod, findInvoiceContainingCharge,
} from "@/lib/invoiceGeneration";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { localizedMonthLabel, localizedShortDate } from "@/lib/i18n/billingDisplay";

// Compact summary limits — "View all" handles the complete history.
const MAX_MONTHS = 2;
const MAX_ROWS_PER_MONTH = 5;

// Client Hub billing card: monthly ledger (Property → Month → Charges → Total)
// with a compact Generate Invoice action per month. Nothing here sends or
// marks anything paid.
export default function ClientBillingCard({ charges, invoices = [], client = null, properties = [], onInvoiceSaved }) {
  const { toast } = useToast();
  const { t, tEnum, lang } = useLanguage();
  const [review, setReview] = useState(null);

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
        const openTotal = items.filter((c) => c.status === "Due").reduce((s, c) => s + (c.amount || 0), 0);
        return { key, label: monthLabel(key), items, openTotal };
      });
  }, [charges]);

  const shownGroups = groups.slice(0, MAX_MONTHS);
  const hiddenGroups = groups.length - shownGroups.length;

  const onGenerate = (group) => {
    const propertyId = group.items[0]?.property_id;
    const existing = findInvoiceForPeriod(invoices, propertyId, group.key);
    if (existing) {
      toast({
        title: t("Invoice already exists for {month}", { month: localizedMonthLabel(group.key, lang) || t("this month") }),
        description: t("{number} · {amount} — open it from the Invoices section below.", { number: existing.invoice_number, amount: eur(existing.total) }),
      });
      return;
    }
    const conflict = group.items.map((c) => findInvoiceContainingCharge(invoices, c.id)).find(Boolean);
    if (conflict) {
      toast({
        title: t("These charges are already invoiced"),
        description: t("{number} already includes one or more charges from {month}.", { number: conflict.invoice_number, month: localizedMonthLabel(group.key, lang) || t("this month") }),
      });
      return;
    }
    setReview({ draft: buildInvoiceDraft({ charges: group.items, propertyId, client, invoices }) });
  };

  const rowSecondary = (ch) => {
    const st = displayStatus(ch);
    const dateStr = st === "Paid" ? ch.paid_date : ch.due_date;
    const sd = localizedShortDate(dateStr, lang);
    return { st, dateText: sd ? `${st === "Paid" ? t("Paid") : t("Due")} ${sd}` : "" };
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Euro className="w-4 h-4 text-muted-foreground" /> {t("Billing")}
          {list.length > 0 && <span className="text-xs text-muted-foreground">({t("{count} open", { count: openCount })})</span>}
        </div>
        <Link to="/billing" className="text-xs text-primary flex items-center gap-1 hover:underline">
          {t("View all")} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">{t("Outstanding")}</p>
        <p className={`text-xl font-semibold ${outstanding > 0 ? "" : "text-muted-foreground"}`}>
          {outstanding > 0 ? eur(outstanding) : "—"}
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Euro} title={t("No billing charges yet")} />
      ) : (
        <div>
          {shownGroups.map((group) => {
            const shown = group.items.slice(0, MAX_ROWS_PER_MONTH);
            const hidden = group.items.length - shown.length;
            return (
              <div key={group.key || "undated"} className="border-b border-border last:border-b-0">
                <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {localizedMonthLabel(group.key, lang) || t("Other charges")}
                  </p>
                  {group.key && (
                    <button
                      type="button"
                      onClick={() => onGenerate(group)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline min-h-[40px] -my-2 px-1"
                    >
                      <FilePlus2 className="w-3.5 h-3.5 shrink-0" /> {t("Generate Invoice")}
                    </button>
                  )}
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
                            {stripMonthSuffix(ch.description || t("Charge"), group.label)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {dateText && <span>{dateText}</span>}
                            <span className={statusBadgeClass(st)}>{tEnum(st, "charge")}</span>
                          </p>
                        </div>
                        <span className="text-sm font-medium shrink-0 pt-0.5">{eur(ch.amount)}</span>
                      </Link>
                    );
                  })}
                  {hidden > 0 && (
                    <Link to="/billing" className="block px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
                      +{hidden} {t("more in {group} · View all", { group: localizedMonthLabel(group.key, lang) || t("this group") })}
                      </Link>
                      )}
                      </div>
                      {group.openTotal > 0 && (
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                      <p className="text-xs text-muted-foreground">{t("{month} total", { month: localizedMonthLabel(group.key, lang) })}</p>
                    <p className="text-sm font-medium">{eur(group.openTotal)}</p>
                  </div>
                )}
              </div>
            );
          })}
          {hiddenGroups > 0 && (
            <Link to="/billing" className="block px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground border-t border-border">
              +{hiddenGroups} {t(hiddenGroups === 1 ? "more month · View all" : "more months · View all")}
            </Link>
          )}
        </div>
      )}

      <InvoiceReviewModal
        open={!!review}
        onOpenChange={(o) => !o && setReview(null)}
        draft={review?.draft}
        client={client}
        properties={properties}
        onSaved={onInvoiceSaved}
      />
    </div>
  );
}