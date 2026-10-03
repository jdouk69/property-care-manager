import React from "react";
import { Undo2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eur } from "@/lib/billing";
import { athensMediumDate } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Payment audit trail: one row per entry. Corrections VOID an entry — the
// original stays visible, struck through, with the reason and who/when.
export default function PaymentHistoryList({
  entries, voidIndex, voidReason, voidSaving,
  onVoidReasonChange, onStartVoid, onCancelVoid, onVoidConfirm,
}) {
  const { t, lang } = useLanguage();
  if (!entries.length) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
        <Ban className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">{t("No payments recorded yet")}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
      {entries.map((e, i) => (
        <div key={i} className={`px-3 py-2.5 ${e.voided ? "bg-muted/40" : ""}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-sm font-medium ${e.voided ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {eur(e.amount)} · {t(e.method)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                <span>{e.date ? athensMediumDate(e.date, lang) : "—"}</span>
                {e.reference && <span className="truncate">{e.reference}</span>}
                {e.recorded_by && <span>{t("by {name}", { name: e.recorded_by })}</span>}
              </p>
            </div>
            {!e.voided && onVoidReasonChange && (
              <Button
                variant="outline" size="sm" className="h-8 px-2.5 gap-1 shrink-0"
                onClick={() => onStartVoid(i)}
              >
                <Undo2 className="w-3.5 h-3.5" /> {t("Correct")}
              </Button>
            )}
          </div>
          {e.voided && (
            <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-500">
              {t("Voided")} — {e.void_reason}
              {e.voided_by ? ` · ${t("by {name}", { name: e.voided_by })}` : ""}
            </p>
          )}
          {!e.voided && voidIndex === i && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
              <p className="text-xs text-amber-700 dark:text-amber-500">
                {t("Voiding keeps the entry visible with your reason — the audit trail is never deleted.")}
              </p>
              <Input
                className="h-10 text-sm bg-card"
                value={voidReason}
                onChange={(e2) => onVoidReasonChange(e2.target.value)}
                placeholder={t("e.g. wrong amount, duplicated entry")}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-9" onClick={onCancelVoid}>{t("Cancel")}</Button>
                <Button
                  variant="destructive" size="sm" className="h-9"
                  onClick={onVoidConfirm} disabled={voidSaving}
                >
                  {voidSaving ? <Undo2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                  {t("Confirm correction")}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}