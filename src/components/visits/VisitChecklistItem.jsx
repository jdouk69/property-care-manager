import React from "react";
import { ImagePlus, X, Loader2, AlertTriangle, Wrench, Camera } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Image as UIImage } from "@/components/ui/image";

const STATUSES = [
  { value: "Normal", label: "Normal", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { value: "Important", label: "Important", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { value: "Emergency", label: "Emergency", cls: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  { value: "Not Checked", label: "Skip", cls: "bg-muted text-muted-foreground border-border" },
];

export default function VisitChecklistItem({ item, index, onChange, onUploadPhoto, onRemovePhoto, uploading, onFlagIssue, flagged }) {
  const setStatus = (status) => onChange({ ...item, status });
  const setNotes = (notes) => onChange({ ...item, notes });

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground flex-1 leading-snug">{index + 1}. {item.name}</p>
        {(item.status === "Important" || item.status === "Emergency") && (
          <AlertTriangle className={`w-4 h-4 shrink-0 ${item.status === "Emergency" ? "text-rose-500" : "text-amber-500"}`} />
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {STATUSES.map((s) => (
          <button key={s.value} type="button" onClick={() => setStatus(s.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${item.status === s.value ? s.cls + " font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {item.status !== "Not Checked" && (
        <div className="mt-2 space-y-2">
          <Textarea value={item.notes || ""} onChange={(e) => setNotes(e.target.value)} placeholder="Notes…" rows={2} className="resize-none text-sm" />
          <div className="grid grid-cols-4 gap-2">
            {(item.photos || []).map((url, i) => (
              <div key={i} className="relative group aspect-square">
                <UIImage src={url} className="w-full h-full rounded-lg" fittingType="fill" />
                <button type="button" onClick={() => onRemovePhoto(index, i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
              <input type="file" accept="image/*" multiple capture="environment" className="hidden"
                onChange={(e) => onUploadPhoto(index, Array.from(e.target.files || []))} />
            </label>
          </div>
          {(item.status === "Important" || item.status === "Emergency") && (
            <button type="button" onClick={() => onFlagIssue(index)}
              disabled={flagged}
              className={`text-xs px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 transition ${flagged ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "border-primary/30 text-primary hover:bg-primary/10"}`}>
              <Wrench className="w-3.5 h-3.5" /> {flagged ? "Issue created" : "Create maintenance issue"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}