import React, { useState } from "react";
import { Mic, Square, Loader2, AlertTriangle, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import useDictationRecorder from "@/hooks/useDictationRecorder";
import { dictationItemProposalFromAudio } from "@/lib/inspectionDictation";
import { checklistStatusLabel } from "@/lib/visitTypeLabels";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const statusTone = {
  Normal: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Important: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Emergency: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  "Unable to Check": "bg-sky-500/10 text-sky-600 border-sky-500/20",
  "N/A": "bg-muted text-muted-foreground border-border",
};
const toneFor = (s) => statusTone[s] || "bg-muted text-muted-foreground border-border";

// Item-level dictation for the Guided Checklist. The checklist item is
// ALREADY known from the card staff is looking at — passed in as a prop, never
// inferred from the transcript. The AI may propose only one of the existing
// statuses plus an observation note; staff reviews and approves before
// anything is applied. Approved notes are APPENDED to existing notes by the
// caller (never silently overwritten). Uses the SAME shared recorder and
// dictation service as every other dictation surface — no parallel pipeline.
export default function DictateItemDialog({ open, onOpenChange, item, statuses, contextLabel, onApply }) {
  const { t } = useLanguage();
  const recorder = useDictationRecorder();
  const [result, setResult] = useState(null); // { transcript, proposal }
  const [approved, setApproved] = useState(false);

  const validContext = !!(item?.name && Array.isArray(statuses) && statuses.length > 0 && contextLabel);
  const manual = !!((item?.status && item.status !== "Not Checked") || (item?.notes || "").trim());

  const reset = () => {
    recorder.reset();
    setResult(null);
    setApproved(false);
  };

  const interpret = async (blob) => {
    const r = await dictationItemProposalFromAudio({ itemName: item.name, statuses, contextLabel, audioBlob: blob });
    setResult(r);
    // No silent overwrites and no guessed ambiguities: ambiguous proposals and
    // items already answered manually default to UNSELECTED for approval.
    setApproved(!!(r.proposal && !r.proposal.needs_review && !manual));
  };

  const startRecording = () => { if (!validContext) return; recorder.start(interpret); };
  const showReview = recorder.phase === "idle" && result;
  const proposal = result?.proposal || null;

  const apply = () => {
    if (proposal && approved) onApply(proposal);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Dictate This Item")}</DialogTitle>
          <DialogDescription className="text-left">
            {t("An optional shortcut for this checklist item — nothing changes until you review and approve.")}
          </DialogDescription>
        </DialogHeader>

        {/* Context lock — display-only. The item comes from the card staff is
            looking at; all context comes from app state, never from voice. */}
        {validContext ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-primary/80 flex items-center gap-1"><MapPin className="w-3 h-3" /> {t("Current item:")}</p>
            <p className="text-sm font-medium text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground truncate">{contextLabel}</p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-500">{t("Open a checklist item before using dictation.")}</p>
          </div>
        )}

        {recorder.error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{recorder.error}</p>
          </div>
        )}

        {recorder.phase === "recording" && (
          <div className="space-y-3 text-center py-2">
            <span className="inline-flex w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 items-center justify-center animate-pulse">
              <Mic className="w-7 h-7" />
            </span>
            <p className="text-sm text-muted-foreground">{t("Recording… speak your observation, then tap Stop.")}</p>
            <Button variant="destructive" onClick={recorder.stop} className="rounded-2xl h-12 px-6 gap-2 mx-auto">
              <Square className="w-4 h-4" /> {t("Stop")}
            </Button>
          </div>
        )}

        {recorder.phase === "processing" && (
          <div className="space-y-3 text-center py-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">{t("Transcribing your observation…")}</p>
          </div>
        )}

        {!showReview && recorder.phase === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("Speak your observation for this item, e.g.")} <span className="italic">“Small amount of water underneath the kitchen sink near the cold-water connection.”</span>
            </p>
            <Button onClick={startRecording} disabled={!validContext} className="w-full rounded-2xl h-14 text-base gap-2">
              <Mic className="w-5 h-5" /> {t("Start Recording")}
            </Button>
          </div>
        )}

        {showReview && (
          <div className="space-y-3">
            {result.transcript && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{t("What we heard")}</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{result.transcript}</p>
              </div>
            )}
            {proposal ? (
              <>
                <label className="flex items-start gap-2.5 rounded-xl border border-border p-3 cursor-pointer">
                  <Checkbox
                    checked={approved}
                    onCheckedChange={(v) => setApproved(!!v)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${toneFor(proposal.status)}`}>{t(checklistStatusLabel(proposal.status))}</span>
                      {proposal.needs_review && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">
                          {t("Needs review — check before applying")}
                        </span>
                      )}
                      {manual && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">
                          {t("Already answered — review before applying")}
                        </span>
                      )}
                    </div>
                    {proposal.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{proposal.notes}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1.5">{t("Notes will be added to the item's existing notes.")}</p>
                  </div>
                </label>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("No usable speech was recognized. You can try again or continue manually.")}</p>
            )}
          </div>
        )}

        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="flex-1 rounded-xl h-12">
            {t("Cancel")}
          </Button>
          {showReview && proposal && (
            <Button onClick={apply} disabled={!approved} className="flex-1 rounded-xl h-12">
              {t("Apply")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}