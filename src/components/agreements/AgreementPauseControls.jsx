import React, { useState } from "react";
import { Pause, Play, Loader2, AlertTriangle, CalendarClock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Explicit staff action for an active signed agreement. Pausing preserves the
// signed terms and existing ledger entries; the billing job ignores it until
// manually resumed or the selected resume date arrives.
export default function AgreementPauseControls({ agreementId, status, pauseUntil = "", onChanged, compact = false, emphasize = false }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [resumeDate, setResumeDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const paused = status === "Paused";

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await base44.functions.invoke("agreementPause", {
        action: paused ? "resume" : "pause",
        agreement_id: agreementId,
        ...(!paused && resumeDate ? { pause_until: resumeDate } : {}),
      });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || t("Could not update this agreement."));
      setOpen(false);
      setResumeDate("");
      onChanged?.(data);
    } catch (e) {
      const data = e?.response?.data;
      setError(data?.error || e?.message || t("Could not update this agreement."));
    }
    setBusy(false);
  };

  return (
    <>
      {paused && !compact && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
            <CalendarClock className="w-4 h-4" /> {t("Service and recurring billing are paused")}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {pauseUntil
              ? t("Scheduled to resume on {date}.", { date: pauseUntil })
              : t("This agreement will stay paused until you resume it.")}
          </p>
        </div>
      )}
      <Button
        variant={paused ? "default" : "outline"}
        onClick={() => { setError(""); setOpen(true); }}
        className={emphasize
          ? `h-11 gap-2 px-4 text-sm font-bold shadow-sm ${paused ? "" : "border-2 border-primary text-primary hover:bg-primary/10"}`
          : "gap-1.5"}
      >
        {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        {paused ? t("Resume Service") : t("Pause Service")}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="bg-card rounded-2xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${paused ? "text-primary" : "text-amber-600"}`} />
              <div>
                <h3 className="text-base font-semibold">{paused ? t("Resume this service?") : t("Pause this service?")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {paused
                    ? t("Billing will restart from the resume date. The system will not bill the paused months later.")
                    : t("No new recurring charges will be generated while paused. Charges or invoices already created will remain unchanged.")}
                </p>
              </div>
            </div>

            {!paused && (
              <div className="space-y-1.5">
                <Label htmlFor="agreement-pause-until">{t("Resume automatically on (optional)")}</Label>
                <Input id="agreement-pause-until" type="date" value={resumeDate} onChange={(e) => setResumeDate(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("Leave blank to keep it paused until you resume it manually.")}</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>{t("Cancel")}</Button>
              <Button className="flex-1 gap-1.5" onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {paused ? t("Resume Service") : t("Pause Service")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
