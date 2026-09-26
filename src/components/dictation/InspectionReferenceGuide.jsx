import React from "react";
import { BookOpen, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

// Read-only Inspection Reference guide shown on the dictation recording
// screen. PURE PRESENTATION: it renders the checklist items the caller
// already loaded (same source as the normal inspection workflow) with short
// guidance text — no checkboxes, no status changes, no completion tracking,
// no per-item actions. It scrolls in its own area, so scrolling never touches
// the microphone capture, the recorder state or the timer.
export default function InspectionReferenceGuide({ items, onFinish, finishLabel = "Finish Dictation" }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border bg-muted/40">
        <BookOpen className="w-4 h-4 text-primary shrink-0" />
        <p className="text-sm font-semibold text-foreground">Inspection Reference</p>
        <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{items.length} items · read-only</span>
      </div>

      {/* Vertically scrollable list — scrolls independently of the recording.
          overscroll-contain keeps iOS momentum scrolling inside this area. */}
      <div className="max-h-[48vh] min-h-[180px] overflow-y-auto overscroll-contain">
        <div className="divide-y divide-border">
          {items.map((it, i) => (
            <div key={i} className="px-3.5 py-3">
              <p className="text-sm font-medium text-foreground leading-snug break-words">
                {i + 1}. {it.title}
              </p>
              {it.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">{it.description}</p>
              )}
            </div>
          ))}
        </div>

        {/* Finish Dictation — after the final reference item. Calls the SAME
            stop/finish-recording handler the dialog already uses (no second
            completion workflow). 56px tall, full width, safe-area padded. */}
        {onFinish && (
          <div className="p-3.5 pt-4 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            <Button onClick={onFinish} className="w-full h-14 rounded-2xl text-base font-semibold gap-2">
              <Square className="w-5 h-5" /> {finishLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}