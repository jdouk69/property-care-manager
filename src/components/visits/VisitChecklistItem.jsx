import React, { useState } from "react";
import { X, Loader2, AlertTriangle, Wrench, Camera, Eye, EyeOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Image as UIImage } from "@/components/ui/image";

// "Not Checked" stays the stored default (item not yet answered) but is no
// longer a deliberate field choice — workers pick Unable to Check or N/A instead.
const STATUSES = [
  { value: "Normal", label: "Normal", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { value: "Important", label: "Important", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { value: "Emergency", label: "Emergency", cls: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  { value: "Unable to Check", label: "Unable to Check", cls: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
  { value: "N/A", label: "N/A", cls: "bg-muted text-muted-foreground border-border" },
];
// Statuses that open the detail area automatically (concerns need documenting,
// Unable to Check needs a reason). Normal and N/A stay collapsed for fast
// tap-through; they can always be expanded manually via the toggle.
const AUTO_OPEN = ["Important", "Emergency", "Unable to Check"];

export default function VisitChecklistItem({ item, index, onChange, onUploadPhoto, onRemovePhoto, uploading, onFlagIssue, flagged }) {
  const [expanded, setExpanded] = useState(AUTO_OPEN.includes(item.status));
  const setStatus = (status) => {
    onChange({ ...item, status });
    setExpanded(AUTO_OPEN.includes(status));
  };
  const setNotes = (notes) => onChange({ ...item, notes });
  const ownerVisible = !!item.owner_visible;
  const toggleOwnerVisible = () => onChange({ ...item, owner_visible: !ownerVisible });

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm md:text-base 2xl:text-sm font-medium text-foreground flex-1 leading-snug">{index + 1}. {item.name}</p>
        {(item.status === "Important" || item.status === "Emergency") && (
          <AlertTriangle className={`w-4 h-4 shrink-0 ${item.status === "Emergency" ? "text-rose-500" : "text-amber-500"}`} />
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {STATUSES.map((s) => (
          <button key={s.value} type="button" onClick={() => setStatus(s.value)}
            className={`min-h-[44px] flex items-center justify-center px-4 py-2 text-[13px] leading-none rounded-full border transition md:px-5 md:py-2.5 md:text-sm 2xl:min-h-9 2xl:px-2.5 2xl:py-1 2xl:text-xs ${item.status === s.value ? s.cls + " font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {item.status !== "Not Checked" && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
        >
          {expanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {expanded ? "Hide" : "Add note / photo"}
        </button>
      )}

      {expanded && (
        <div className="mt-2 space-y-2">
          <Textarea value={item.notes || ""} onChange={(e) => setNotes(e.target.value)} placeholder={item.status === "Unable to Check" ? "Reason unable to check (e.g. equipment room locked, area inaccessible, water off)…" : "Notes…"} rows={2} className="resize-none text-sm md:text-base 2xl:text-sm" />
          <button
            type="button"
            onClick={toggleOwnerVisible}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 md:text-sm md:px-4 md:py-2.5 2xl:text-xs 2xl:px-3 2xl:py-1.5 rounded-full border transition ${ownerVisible ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {ownerVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {ownerVisible ? "Owner-visible" : "Private (staff only)"}
          </button>
          <div className="grid grid-cols-4 gap-2">
            {(item.photos || []).map((url, i) => (
              <div key={i} className="relative group aspect-square">
                <UIImage src={url} className="w-full h-full rounded-lg" fittingType="fill" />
                <button type="button" onClick={() => onRemovePhoto(index, i)}
                  className="absolute top-1 right-1 w-5 h-5 md:w-7 md:h-7 2xl:w-5 2xl:h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 md:opacity-100 2xl:opacity-0 transition">
                  <X className="w-3 h-3 md:w-4 md:h-4 2xl:w-3 2xl:h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => onUploadPhoto(index, Array.from(e.target.files || []))} />
            </label>
          </div>
          {(item.status === "Important" || item.status === "Emergency") && (
            <button type="button" onClick={() => onFlagIssue(index)}
              disabled={flagged}
              className={`text-xs px-3 py-1.5 md:text-sm md:px-4 md:py-2.5 2xl:text-xs 2xl:px-3 2xl:py-1.5 rounded-full border inline-flex items-center gap-1.5 transition ${flagged ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "border-primary/30 text-primary hover:bg-primary/10"}`}>
              <Wrench className="w-3.5 h-3.5" /> {flagged ? "Issue created" : "Create maintenance issue"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}