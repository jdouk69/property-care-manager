import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Shown when starting a visit while an unfinished visit draft exists. Shared by
// every start-now entry point (First Visit step, package launch, Choose Visit
// Type) so no start button can ever silently discard an in-progress visit.
export default function DraftConflictDialog({ onResume, onDiscardAndStart, onCancel }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border max-w-sm md:max-w-md 2xl:max-w-sm w-full p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold">{t("You already have a visit in progress.")}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t("Starting a new visit will discard the unfinished one. Choose how to proceed.")}</p>
        <div className="flex flex-col gap-2">
          <Button onClick={onResume} className="rounded-2xl h-11">{t("Continue Existing Visit")}</Button>
          <Button variant="outline" onClick={onCancel} className="rounded-2xl h-11">{t("Cancel")}</Button>
          <Button variant="destructive" onClick={onDiscardAndStart} className="rounded-2xl h-11">{t("Start New Visit")}</Button>
        </div>
      </div>
    </div>
  );
}