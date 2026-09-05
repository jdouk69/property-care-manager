import React from "react";
import { Mic } from "lucide-react";

// Shared optional Dictate action used across staff forms — a consistent,
// clearly visible 48px+ touch target near the top of the form (not hidden in
// menus). Never a separate mode: the form stays the normal interface.
export default function DictateButton({ label = "Dictate", caption = "Optional — dictate, review, then apply to this form", onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-3.5 py-3 hover:bg-primary/10 transition min-h-[48px] text-left">
      <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Mic className="w-4 h-4" /></span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{caption}</span>
      </span>
    </button>
  );
}