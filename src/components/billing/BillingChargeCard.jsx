import React from "react";
import { CheckCircle2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayStatus, statusBadgeClass, eur } from "@/lib/billing";
import { athensMediumDate } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Mobile-first charge card: description, property/client, amount, due date and
// status are all immediately visible; Mark Paid / Waive are one tap away.
export default function BillingChargeCard({ charge, clientName, propertyName, onOpen, onMarkPaid, onWaive }) {
  const { t, tEnum, lang } = useLanguage();
  const st = displayStatus(charge);
  const open = st === "Due" || st === "Overdue";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-foreground truncate flex-1">{charge.description || t("Charge")}</p>
          <span className={statusBadgeClass(st)}>{tEnum(st, "charge")}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground truncate">
          {propertyName}{clientName ? ` · ${clientName}` : ""}
        </p>
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <p className="text-lg font-semibold text-foreground">{eur(charge.amount)}</p>
          <p className="text-xs text-muted-foreground">
            {charge.due_date ? t("Payment due {date}", { date: athensMediumDate(charge.due_date, lang) }) : (charge.billing_date ? athensMediumDate(charge.billing_date, lang) : "")}
            {charge.charge_type ? ` · ${t(charge.charge_type)}` : ""}
          </p>
        </div>
        {charge.status === "Paid" && (
          <p className="text-xs text-muted-foreground mt-1">
            {t("Paid")} {charge.paid_date ? athensMediumDate(charge.paid_date, lang) : ""}{charge.payment_method ? ` · ${t(charge.payment_method)}` : ""}{charge.payment_reference ? ` · ${charge.payment_reference}` : ""}
          </p>
        )}
        {charge.status === "Waived" && (
          <p className="text-xs text-muted-foreground mt-1">{t("Waived — kept in history")}</p>
        )}
      </button>
      {open && (
        <div className="mt-3 flex gap-2">
          <Button className="flex-1 h-11 gap-1.5" onClick={onMarkPaid}>
            <CheckCircle2 className="w-4 h-4" /> {t("Mark Paid")}
          </Button>
          <Button variant="outline" className="h-11 px-4 gap-1.5" onClick={onWaive}>
            <Ban className="w-4 h-4" /> {t("Waive")}
          </Button>
        </div>
      )}
    </div>
  );
}