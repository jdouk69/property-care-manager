import React, { useRef, useState } from "react";
import { Mic, Square, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { dictationProposalsFromAudio } from "@/lib/visitDictation";

const statusTone = {
  Normal: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Important: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Emergency: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  "Unable to Check": "bg-muted text-muted-foreground border-border",
  "N/A": "bg-muted text-muted-foreground border-border",
};

// Dictate Visit — OPTIONAL voice shortcut for filling the EXISTING checklist.
// Not a separate mode: the user records observations, reviews the proposed
// updates, and only approved proposals are applied. Unmentioned items stay
// untouched (Not Checked), the user returns to the same Visit Wizard, and
// every item remains manually editable. Can be used again later in the visit.
export default function DictateVisitDialog({ open, onOpenChange, checklist, onApply }) {
  const [phase, setPhase] = useState("idle"); // idle | recording | processing | review
  const [transcript, setTranscript] = useState("");
  const [proposals, setProposals] = useState([]);
  const [selected, setSelected] = useState({});
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const cleanup = () => {
    try { recRef.current?.state === "recording" && recRef.current.stop(); } catch (e) {}
    recRef.current = null;
    if (mediaRef.current) { mediaRef.current.getTracks().forEach((t) => t.stop()); mediaRef.current = null; }
    chunksRef.current = [];
  };

  const reset = () => {
    cleanup();
    setPhase("idle"); setTranscript(""); setProposals([]); setSelected({}); setError("");
  };

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.onstop = processAudio;
      recRef.current = rec;
      rec.start();
      setPhase("recording");
    } catch (e) {
      setError("Microphone unavailable — check permissions, or simply fill the checklist manually.");
    }
  };

  const stopRecording = () => { try { recRef.current?.stop(); } catch (e) {} };

  const processAudio = async () => {
    const chunks = [...chunksRef.current];
    cleanup();
    if (!chunks.length) { setError("No audio captured — try again or continue manually."); setPhase("idle"); return; }
    setPhase("processing");
    try {
      const { transcript: text, proposals: props } = await dictationProposalsFromAudio(
        checklist,
        new Blob(chunks, { type: chunks[0]?.type || "audio/webm" })
      );
      setTranscript(text);
      setProposals(props);
      // No silent overwrites: items the user already answered manually default
      // to UNSELECTED and must be explicitly re-approved.
      const sel = {};
      props.forEach((p) => {
        const it = checklist[p.item_index];
        sel[p.item_index] = it && it.status === "Not Checked" && !(it.notes || "").trim();
      });
      setSelected(sel);
      setPhase("review");
    } catch (e) {
      setError("Could not process the dictation — try again or continue manually. (" + (e?.message || e) + ")");
      setPhase("idle");
    }
  };

  const answeredManually = (idx) => {
    const it = checklist[idx];
    return !!(it && (it.status !== "Not Checked" || (it.notes || "").trim()));
  };
  const selectedCount = proposals.filter((p) => selected[p.item_index]).length;

  const apply = () => {
    const chosen = proposals.filter((p) => selected[p.item_index]);
    if (chosen.length) onApply(chosen);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dictate Visit</DialogTitle>
          <DialogDescription className="text-left">
            An optional shortcut for the checklist below — nothing changes until you review and apply.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {phase === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Speak your observations for this property, e.g. <span className="italic">"Front gate is broken, the pool pump is leaking, windows are all fine."</span>
            </p>
            <Button onClick={startRecording} className="w-full rounded-2xl h-14 text-base gap-2">
              <Mic className="w-5 h-5" /> Start Recording
            </Button>
          </div>
        )}

        {phase === "recording" && (
          <div className="space-y-3 text-center py-2">
            <span className="inline-flex w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 items-center justify-center animate-pulse">
              <Mic className="w-7 h-7" />
            </span>
            <p className="text-sm text-muted-foreground">Recording… speak your observations, then tap Stop.</p>
            <Button variant="destructive" onClick={stopRecording} className="rounded-2xl h-12 px-6 gap-2 mx-auto">
              <Square className="w-4 h-4" /> Stop
            </Button>
          </div>
        )}

        {phase === "processing" && (
          <div className="space-y-3 text-center py-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Transcribing your observations…</p>
          </div>
        )}

        {phase === "review" && (
          <div className="space-y-3">
            {transcript && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">What we heard</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{transcript}</p>
              </div>
            )}
            {proposals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No checklist items matched your dictation. You can dictate again or simply continue manually.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Review the proposed updates. Unselected items and items you didn't mention stay exactly as they are.
                </p>
                <div className="space-y-2">
                  {proposals.map((p) => {
                    const it = checklist[p.item_index] || {};
                    const manual = answeredManually(p.item_index);
                    return (
                      <label key={p.item_index} className="flex items-start gap-2.5 rounded-xl border border-border p-3 cursor-pointer">
                        <Checkbox
                          checked={!!selected[p.item_index]}
                          onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.item_index]: !!v }))}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{it.name}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusTone[p.status]}`}>{p.status}</span>
                            {manual && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">
                                Already filled manually — review before applying
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
            Cancel
          </Button>
          {phase === "review" && proposals.length > 0 && (
            <Button onClick={apply} disabled={!selectedCount} className="flex-1 rounded-xl h-12">
              Apply {selectedCount} Update{selectedCount === 1 ? "" : "s"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}