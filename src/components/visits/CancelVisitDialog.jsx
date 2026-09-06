import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function CancelVisitDialog({ open, onClose, onConfirm, busy }) {
  const { t } = useLanguage();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border max-w-sm w-full p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold">{t("Cancel this visit?")}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {t("This visit will no longer appear as an active visit. Any work already recorded will be preserved in the visit history.")}
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy} className="rounded-2xl h-11">{t("Keep Visit")}</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy} className="rounded-2xl h-11">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Cancel Visit")}
          </Button>
        </div>
      </div>
    </div>
  );
}