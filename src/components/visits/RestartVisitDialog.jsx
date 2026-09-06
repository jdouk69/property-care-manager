import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Confirmation required before restarting an UNFINISHED package visit
 * (never offered for completed/finalized visits). Explains exactly what is
 * cleared. The restart reuses the SAME visit — no new charge, no second
 * included entitlement.
 */
export default function RestartVisitDialog({ open, mode = "record", scheduled = false, onClose, onConfirm }) {
  const { t } = useLanguage();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border max-w-sm md:max-w-md 2xl:max-w-sm w-full p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold">{t("Restart this visit?")}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          {t("Restarting will clear the recorded checklist progress for this visit: statuses, observations, photos, notes, meter readings, GPS and summary.")}
        </p>
        <p className="text-sm text-muted-foreground mb-1">
          {t("Already-created issues and follow-up tasks are kept. No new charge is created and no extra included visit is used.")}
        </p>
        {scheduled && (
          <p className="text-xs text-muted-foreground mb-3">{t("A scheduled visit is moved to In Progress when restarted.")}</p>
        )}
        {!scheduled && <div className="mb-3" />}
        <div className="flex flex-col gap-2">
          <Button onClick={onConfirm} className="rounded-2xl h-11">
            <RotateCw className="w-4 h-4" /> {t("Restart Visit")}
          </Button>
          <Button variant="outline" onClick={onClose} className="rounded-2xl h-11">{t("Cancel")}</Button>
        </div>
        {mode === "draft" && (
          <p className="text-[11px] text-muted-foreground mt-2 text-center">{t("The unfinished visit had not been saved as a record yet.")}</p>
        )}
      </div>
    </div>
  );
}