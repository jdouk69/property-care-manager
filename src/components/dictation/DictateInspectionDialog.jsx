import React, { useEffect, useRef, useState } from "react";
import { Mic, Loader2, AlertTriangle, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import useDictationRecorder from "@/hooks/useDictationRecorder";
import { dictationProposalsFromAudio } from "@/lib/inspectionDictation";
import { checklistStatusLabel } from "@/lib/visitTypeLabels";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { checklistItemDisplay } from "@/lib/i18n/checklistItemDisplay";
import InspectionReferenceGuide from "@/components/dictation/InspectionReferenceGuide";
import { referenceItemsFromChecklist } from "@/lib/inspectionReference";
import DictationRecordingBar from "@/components/dictation/DictationRecordingBar";
import DictationPhotoPanel from "@/components/dictation/DictationPhotoPanel";

const statusTone = {
  Normal: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Pass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Important: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Needs Attention": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Emergency: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  Critical: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  "Unable to Check": "bg-sky-500/10 text-sky-600 border-sky-500/20",
  "N/A": "bg-muted text-muted-foreground border-border",
  "Not Checked": "bg-muted text-muted-foreground border-border",
};
const toneFor = (s) => statusTone[s] || "bg-muted text-muted-foreground border-border";
const UNANSWERED = "Not Checked";

// Reusable Dictate Inspection dialog — an OPTIONAL voice shortcut for filling
// the EXISTING checklist of whichever inspection/checklist is currently open.
// Not a separate mode: the caller passes the active inspection's checklist,
// its own status vocabulary, and the inspection's context. The user records
// observations, reviews the PROPOSED updates, and only approved ones are
// applied — unmentioned items stay untouched, manual answers are never
// silently overwritten, and dictation can never complete/submit/send/bill
// the inspection.
// onUploadPhotos(idx, files) (optional) — the caller's existing checklist
// photo upload; when provided, a Photo button lets staff take a picture
// mid-dictation (recording auto-pauses) and attach it to a chosen item.
export default function DictateInspectionDialog({ open, onOpenChange, checklist, statuses, context, title = "Dictate Inspection", onApply, onUploadPhotos }) {
  const { t, lang } = useLanguage();
  const recorder = useDictationRecorder();
  const [result, setResult] = useState(null); // { transcript, proposals }
  const [selected, setSelected] = useState({});
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoNotice, setPhotoNotice] = useState(null); // { ok, text }
  const photoInputRef = useRef(null);
  // Elapsed recording timer — DISPLAY ONLY: it never drives the recorder,
  // the microphone capture or the transcription. It accumulates across
  // Pause/Resume and freezes while paused (e.g. "Recording 03:42").
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    if (recorder.phase === "idle") { elapsedBaseRef.current = 0; setElapsed(0); return; }
    if (recorder.phase !== "recording") return;
    const startedAt = Date.now();
    const secs = () => Math.floor((Date.now() - startedAt) / 1000);
    const tm = setInterval(() => setElapsed(elapsedBaseRef.current + secs()), 500);
    return () => { clearInterval(tm); elapsedBaseRef.current += secs(); };
  }, [recorder.phase]);

  // Photo: pause first (releases the mic for the camera), then open the camera
  // in the same tap so the browser allows it.
  const takePhoto = () => {
    if (recorder.phase === "recording") recorder.pause();
    photoInputRef.current?.click();
  };

  const attachPhoto = async (idx) => {
    const urls = await onUploadPhotos(idx, [pendingPhoto]);
    if (urls && urls.length) {
      setPhotoNotice({ ok: true, text: t("Photo added to: {item}", { item: checklistItemDisplay(checklist[idx]?.name, lang) }) });
      setPendingPhoto(null);
    } else {
      setPhotoNotice({ ok: false, text: t("Photo upload failed — please try again.") });
    }
  };

  // Context lock: dictation runs ONLY for the inspection the user already
  // opened in the app. The active inspection ID, property ID, property name,
  // owner, and checklist all come from this app context — never from the
  // transcript. If the context is incomplete, dictation is disabled with a
  // simple message instead of guessing.
  const validContext = !!(
    context?.propertyId &&
    (context?.propertyName || context?.inspectionLabel) &&
    Array.isArray(checklist) && checklist.length > 0
  );
  const contextLabel = [context?.propertyName, context?.inspectionLabel].filter(Boolean).join(" · ") || "Current inspection";

  const reset = () => {
    recorder.reset();
    setResult(null);
    setSelected({});
    setPendingPhoto(null);
    setPhotoNotice(null);
  };

  const interpret = async (blob) => {
    const r = await dictationProposalsFromAudio({ checklist, statuses, contextLabel, audioBlob: blob });
    setResult(r);
    // No silent overwrites and no guessed ambiguities: items the user
    // already answered manually AND items flagged "needs review" default to
    // UNSELECTED and must be explicitly approved.
    const sel = {};
    (r.proposals || []).forEach((p) => {
      const it = checklist[p.item_index];
      const manual = !!(it && ((it.status || UNANSWERED) !== UNANSWERED || (it.notes || "").trim()));
      sel[p.item_index] = !p.needs_review && !manual;
    });
    setSelected(sel);
  };

  const startRecording = () => { if (!validContext) return; recorder.start(interpret); };

  const proposals = result?.proposals || [];
  const selectedCount = proposals.filter((p) => selected[p.item_index]).length;

  const apply = () => {
    const chosen = proposals.filter((p) => selected[p.item_index]);
    if (chosen.length) onApply(chosen);
    reset();
    onOpenChange(false);
  };

  const showReview = recorder.phase === "idle" && result;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(title)}</DialogTitle>
          <DialogDescription className="text-left">
            {t("An optional shortcut for the checklist below — nothing changes until you review and apply.")}
          </DialogDescription>
        </DialogHeader>

        {/* Context lock — display-only. Shows WHERE the notes are being applied;
            all context comes from the inspection the user already opened, never from voice. */}
        {validContext ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-primary/80 flex items-center gap-1"><MapPin className="w-3 h-3" /> {t("Dictating for:")}</p>
            <p className="text-sm font-medium text-foreground truncate">{context.propertyName || context.inspectionLabel}</p>
            {context.propertyName && context.inspectionLabel && <p className="text-xs text-muted-foreground truncate">{context.inspectionLabel}</p>}
            {context.clientName && <p className="text-xs text-muted-foreground truncate">{t("Owner: {name}", { name: context.clientName })}</p>}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-500">{t("Open or start an inspection for a property before using dictation.")}</p>
          </div>
        )}

        {recorder.error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{recorder.error}</p>
          </div>
        )}

        {onUploadPhotos && (
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              e.target.value = "";
              if (f) { setPendingPhoto(f); setPhotoNotice(null); }
            }}
          />
        )}

        {photoNotice && (
          <p className={`text-xs ${photoNotice.ok ? "text-emerald-600" : "text-destructive"}`}>{photoNotice.text}</p>
        )}
        {pendingPhoto && (
          <DictationPhotoPanel
            file={pendingPhoto}
            checklist={checklist}
            onAttach={attachPhoto}
            onDiscard={() => setPendingPhoto(null)}
          />
        )}

        {(recorder.phase === "recording" || recorder.phase === "paused") && (
          <div className="space-y-3 py-1">
            {/* Recording status, timer and controls — sits ABOVE the scrolling
                reference guide, so it stays visible while the list is scrolled. */}
            <DictationRecordingBar
              paused={recorder.phase === "paused"}
              elapsed={elapsed}
              onPause={recorder.pause}
              onResume={recorder.resume}
              onPhoto={onUploadPhotos ? takePhoto : undefined}
              onStop={recorder.stop}
            />
            <p className="text-xs text-muted-foreground">{t("Use the reference below as a reminder while you dictate.")}</p>
            {/* Read-only Inspection Reference — built from the SAME checklist
                this dialog already operates on (the visit's/inspection's own
                assigned checklist). Scrolling happens inside the guide's own
                area, fully detached from the recorder. Finish Dictation calls
                the same recorder.stop as the Stop control above. */}
            <InspectionReferenceGuide items={referenceItemsFromChecklist(checklist, lang)} onFinish={recorder.stop} />
          </div>
        )}

        {recorder.phase === "processing" && (
          <div className="space-y-3 text-center py-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">{t("Transcribing your observations…")}</p>
          </div>
        )}

        {!showReview && recorder.phase === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("Speak your observations for this inspection, e.g.")} <span className="italic">"Front gate is broken, the pool pump is leaking, windows are all fine."</span>
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
            {proposals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("No checklist items matched your dictation. You can dictate again or simply continue manually.")}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("Review the proposed updates. Unselected items and items you didn't mention stay exactly as they are.")}
                </p>
                <div className="space-y-2">
                  {proposals.map((p) => {
                    const it = checklist[p.item_index] || {};
                    const manual = (it.status || UNANSWERED) !== UNANSWERED || !!(it.notes || "").trim();
                    return (
                      <label key={p.item_index} className="flex items-start gap-2.5 rounded-xl border border-border p-3 cursor-pointer">
                        <Checkbox
                          checked={!!selected[p.item_index]}
                          onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.item_index]: !!v }))}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{checklistItemDisplay(it.name, lang)}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${toneFor(p.status)}`}>{t(checklistStatusLabel(p.status))}</span>
                            {p.needs_review && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">
                                {t("Needs review — ambiguous, check before applying")}
                              </span>
                            )}
                            {manual && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">
                                {t("Answered manually — your status stays; only the note is added")}
                              </span>
                            )}
                          </div>
                          {p.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{p.notes}</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="flex-1 rounded-xl h-12">
            {t("Cancel")}
          </Button>
          {showReview && proposals.length > 0 && (
            <Button onClick={apply} disabled={!selectedCount} className="flex-1 rounded-xl h-12">
              {selectedCount === 1
                ? t("Apply {count} Update", { count: selectedCount })
                : t("Apply {count} Updates", { count: selectedCount })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}