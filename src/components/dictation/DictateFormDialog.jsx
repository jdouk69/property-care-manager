import React, { useState } from "react";
import { Mic, Square, Loader2, AlertTriangle, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import useDictationRecorder from "@/hooks/useDictationRecorder";
import { dictationFormProposalsFromAudio } from "@/lib/inspectionDictation";

// Reusable Dictate dialog for structured staff forms (Report Issue,
// Maintenance, Tasks, Owner-Rep Reports, …) — same shared recorder and
// dictation service as the checklist dialogs. The caller passes the currently
// open form's visible fields (with their allowed values), the current values,
// and the app context. Speech is interpreted ONLY against those fields; the
// worker reviews each proposal (field name, current value, editable proposed
// value) and only reviewed rows are applied — populated fields default to
// unselected, and dictation never saves/submits/sends/bills anything itself.
export default function DictateFormDialog({ open, onOpenChange, context, fields, values, title = "Dictate", onApply }) {
  const recorder = useDictationRecorder();
  const [result, setResult] = useState(null); // { transcript, proposals }
  const [selected, setSelected] = useState({});
  const [edited, setEdited] = useState({}); // key -> worker-edited proposed value

  // Context lock: everything comes from the app (the form the user already
  // opened), never from speech. No valid property context → dictation disabled.
  const validContext = !!(context?.propertyId && (context?.propertyName || context?.recordLabel));
  const contextLabel = [context?.propertyName, context?.recordLabel].filter(Boolean).join(" · ") || "Current form";

  const reset = () => {
    recorder.reset();
    setResult(null);
    setSelected({});
    setEdited({});
  };

  const interpret = async (blob) => {
    const r = await dictationFormProposalsFromAudio({ fields, values, contextLabel, audioBlob: blob });
    setResult(r);
    // Never silently overwrite: fields that already hold a value (and
    // needs-review proposals) default to UNSELECTED.
    const sel = {};
    (r.proposals || []).forEach((p) => {
      const cur = values?.[p.key];
      const populated = cur !== undefined && cur !== null && String(cur).trim() !== "";
      sel[p.key] = !p.needs_review && !populated;
    });
    setSelected(sel);
  };

  const startRecording = () => { if (!validContext) return; recorder.start(interpret); };

  const proposals = result?.proposals || [];
  const selectedCount = proposals.filter((p) => selected[p.key]).length;

  const apply = () => {
    const patch = {};
    proposals.forEach((p) => {
      if (!selected[p.key]) return;
      const f = fields.find((x) => x.key === p.key);
      const raw = edited[p.key] !== undefined ? edited[p.key] : p.value;
      patch[p.key] = f?.kind === "number" ? (parseFloat(raw) || 0) : raw;
    });
    if (Object.keys(patch).length) onApply(patch);
    reset();
    onOpenChange(false);
  };

  const showReview = recorder.phase === "idle" && result;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-left">
            An optional shortcut for this form — nothing changes until you review and apply.
          </DialogDescription>
        </DialogHeader>

        {/* Context lock — display-only. Shows WHERE the notes are being applied;
            all context comes from the app, never from voice. */}
        {validContext ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-primary/80 flex items-center gap-1"><MapPin className="w-3 h-3" /> Dictating for:</p>
            <p className="text-sm font-medium text-foreground truncate">{context.propertyName || context.recordLabel}</p>
            {context.propertyName && context.recordLabel && <p className="text-xs text-muted-foreground truncate">{context.recordLabel}</p>}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-500">Open or start an inspection for a property before using dictation.</p>
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
            <p className="text-sm text-muted-foreground">Recording… speak, then tap Stop.</p>
            <Button variant="destructive" onClick={recorder.stop} className="rounded-2xl h-12 px-6 gap-2 mx-auto">
              <Square className="w-4 h-4" /> Stop
            </Button>
          </div>
        )}

        {recorder.phase === "processing" && (
          <div className="space-y-3 text-center py-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Transcribing your observations…</p>
          </div>
        )}

        {!showReview && recorder.phase === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Speak naturally, e.g. <span className="italic">"The front gate isn't closing properly. Medium priority. It's rubbing at the bottom right."</span>
            </p>
            <Button onClick={startRecording} disabled={!validContext} className="w-full rounded-2xl h-14 text-base gap-2">
              <Mic className="w-5 h-5" /> Start Recording
            </Button>
          </div>
        )}

        {showReview && (
          <div className="space-y-3">
            {result.transcript && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">What we heard</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{result.transcript}</p>
              </div>
            )}
            {proposals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing matched this form's fields. You can dictate again or simply continue manually.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Review each proposal — edit the proposed value or uncheck to ignore. Only checked rows are applied.
                </p>
                <div className="space-y-2">
                  {proposals.map((p) => {
                    const f = fields.find((x) => x.key === p.key) || {};
                    const cur = values?.[p.key];
                    const populated = cur !== undefined && cur !== null && String(cur).trim() !== "";
                    const val = edited[p.key] !== undefined ? edited[p.key] : p.value;
                    return (
                      <div key={p.key} className="rounded-xl border border-border p-3 space-y-2">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <Checkbox
                            checked={!!selected[p.key]}
                            onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.key]: !!v }))}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">{f.label || p.key}</p>
                              {populated && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">
                                  Has value — review before replacing
                                </span>
                              )}
                              {p.needs_review && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">
                                  Needs review
                                </span>
                              )}
                            </div>
                            {populated && <p className="text-xs text-muted-foreground mt-1 truncate">Current: {String(cur)}</p>}
                          </div>
                        </label>
                        {f.kind === "enum" ? (
                          <Select value={val} onValueChange={(v) => setEdited((s) => ({ ...s, [p.key]: v }))}>
                            <SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger>
                            <SelectContent>{(f.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : f.kind === "textarea" ? (
                          <Textarea value={val} onChange={(e) => setEdited((s) => ({ ...s, [p.key]: e.target.value }))} rows={3} className="text-sm" />
                        ) : (
                          <Input value={val} onChange={(e) => setEdited((s) => ({ ...s, [p.key]: e.target.value }))} className="h-11 text-base" />
                        )}
                      </div>
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
          {showReview && proposals.length > 0 && (
            <Button onClick={apply} disabled={!selectedCount} className="flex-1 rounded-xl h-12">
              Apply Reviewed ({selectedCount})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}