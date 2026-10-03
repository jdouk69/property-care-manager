import React from "react";
import { Link } from "react-router-dom";
import { Receipt, ArrowRight } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { eur } from "@/lib/billing";
import { badgeTone } from "@/components/resource/ResourceListPage";
import { paidTotalOf, balanceOf, PAYMENT_EPS } from "@/lib/payments";
import { athensMediumDate } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Responsive invoices ledger for the Billing page: a real table on iPad /
// desktop (Customer · Payment reference · Date · Amount · Balance · Status),
// stacked cards on phones. Every row opens the payment dialog.
export default function InvoiceLedgerSection({ invoices, clients = [], onOpen }) {
  const { t, tEnum, lang } = useLanguage();
  const live = (invoices || []).filter((i) => !i.archived);
  const clientName = (id) => clients.find((c) => c.id === id)?.name || "—";
  const balanceOfInvoice = (inv) => Math.max(0, Number(inv.total || 0) - paidTotalOf(inv));

  return (
    <div className="mb-5 rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Receipt className="w-4 h-4 text-muted-foreground" /> {t("Invoices")}
          {live.length > 0 && <span className="text-xs text-muted-foreground">({live.length})</span>}
        </div>
        <Link to="/invoices" className="text-xs text-primary flex items-center gap-1 hover:underline">
          {t("All invoices")} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {live.length === 0 ? (
        <EmptyState icon={Receipt} title={t("No invoices yet")} />
      ) : (
        <>
          {/* iPad / desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left font-semibold px-4 py-2">{t("Customer")}</th>
                  <th className="text-left font-semibold px-3 py-2">{t("Payment reference")}</th>
                  <th className="text-left font-semibold px-3 py-2">{t("Date")}</th>
                  <th className="text-right font-semibold px-3 py-2">{t("Amount")}</th>
                  <th className="text-right font-semibold px-3 py-2">{t("Balance")}</th>
                  <th className="text-right font-semibold px-4 py-2">{t("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {live.map((inv) => {
                  const bal = balanceOfInvoice(inv);
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onOpen?.(inv)}
                      className="cursor-pointer hover:bg-muted/40 transition"
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">{clientName(inv.client_id)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{inv.invoice_number || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {inv.invoice_date ? athensMediumDate(inv.invoice_date, lang) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">{eur(inv.total)}</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${bal > PAYMENT_EPS ? "text-amber-600" : "text-muted-foreground"}`}>
                        {eur(bal)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(inv.status)}`}>{tEnum(inv.status, "invoice")}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <div className="md:hidden divide-y divide-border">
            {live.map((inv) => {
              const bal = balanceOfInvoice(inv);
              return (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => onOpen?.(inv)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{clientName(inv.client_id)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{inv.invoice_number || "—"}</span>
                        {inv.invoice_date ? ` · ${athensMediumDate(inv.invoice_date, lang)}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(inv.status)}`}>{tEnum(inv.status, "invoice")}</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-3">
                    <span className="text-sm font-semibold">{eur(inv.total)}</span>
                    {bal > PAYMENT_EPS && (
                      <span className="text-xs text-amber-600">{t("Balance")}: {eur(bal)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}