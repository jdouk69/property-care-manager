import React, { useState } from "react";
import { X, Loader2, AlertTriangle, Wrench, Camera, Eye, EyeOff, ChevronDown, Check, CircleSlash, Minus, Circle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Image as UIImage } from "@/components/ui/image";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { checklistItemDisplay } from "@/lib/i18n/checklistItemDisplay";

// "Not Checked" stays the stored default (item not yet answered) but is no
// longer a deliberate field choice — workers pick Unable to Check or N/A instead.
export const STATUSES = [
  { value: "Normal", label: "Normal", icon: Check, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", idleCls: "bg-emerald-500/5 border-emerald-500/25 text-emerald-700 dark:text-emerald-400" },
  { value: "Important", label: "Attention", icon: AlertTriangle, cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", idleCls: "bg-amber-500/5 border-amber-500/25 text-amber-700 dark:text-amber-500" },
  { value: "Emergency", label: "Emergency", icon: AlertTriangle, cls: "bg-rose-500/10 text-rose-600 border-rose-500/30", idleCls: "bg-rose-500/5 border-rose-500/25 text-rose-700 dark:text-rose-400" },
  { value: "Unable to Check", label: "Unable to Check", icon: CircleSlash, cls: "bg-sky-500/10 text-sky-600 border-sky-500/30", idleCls: "bg-muted/60 border-border text-muted-foreground" },
  { value: "N/A", label: "N/A", icon: Minus, cls: "bg-muted text-muted-foreground border-border", idleCls: "bg-muted/60 border-border text-muted-foreground" },
];
// Statuses that open the detail area automatically (concerns need documenting,
// Unable to Check needs a reason). Normal and N/A stay collapsed for fast
// tap-through; they can always be expanded manually via the toggle.
const AUTO_OPEN = ["Important", "Emergency", "Unable to Check"];

// Compact step-by-step checklist item: the row is collapsed by default showing
// the number, description, an answer indicator and a chevron. Expanding reveals
// the existing status buttons and detail controls — no status values or save
// behavior changed.
export default function VisitChecklistItem({ item, index, onChange, onUploadPhoto, onRemovePhoto, uploading, onFlagIssue, flagged, expanded = false, onToggle }) {
  const { t, lang } = useLanguage();
  const [detailOpen, setDetailOpen] = useState(AUTO_OPEN.includes(item.status));
  const setStatus = (status) => {
    onChange({ ...item, status });
    setDetailOpen(AUTO_OPEN.includes(status));
  };
  const setNotes = (notes) => onChange({ ...item, notes });
  const ownerVisible = !!item.owner_visible;
  const toggleOwnerVisible = () => onChange({ ...item, owner_visible: !ownerVisible });
  const statusDef = STATUSES.find((s) => s.value === item.status);
  const answered = item.status !== "Not Checked";

  return (
    <div className={`rounded-2xl border bg-card transition-shadow ${expanded ? "border-primary/40 shadow-md" : "border-border"}`}>
      <button type="button" onClick={() => onToggle && onToggle()} aria-expanded={expanded}
        className="w-full flex items-center gap-3.5 p-4 min-h-[92px] md:min-h-24 2xl:min-h-0 2xl:gap-2.5 2xl:p-3 text-left touch-manipulation">
        <span className={`w-11 h-11 md:w-12 md:h-12 2xl:w-8 2xl:h-8 rounded-xl flex items-center justify-center shrink-0 text-lg 2xl:text-sm font-semibold ${expanded ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          {index + 1}
        </span>
        <p className={`flex-1 text-foreground leading-snug ${expanded ? "text-base md:text-lg 2xl:text-sm font-semibold" : "text-base md:text-lg 2xl:text-sm font-medium"}`}>
          {checklistItemDisplay(item.name, lang)}
        </p>
        <span className="flex flex-col items-end justify-center gap-1.5 shrink-0">
          {answered && statusDef ? (
            <span className={`inline-flex items-center gap-1.5 text-xs md:text-sm px-2.5 py-1 rounded-full border font-medium whitespace-nowrap ${statusDef.cls}`}>
              <statusDef.icon className="w-3.5 h-3.5 2xl:w-3 2xl:h-3 shrink-0" />
              {t(statusDef.label)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs md:text-sm px-2.5 py-1 rounded-full border border-dashed border-border bg-muted/40 text-muted-foreground whitespace-nowrap">
              <Circle className="w-3.5 h-3.5 2xl:w-3 2xl:h-3" />
              {t("Not answered")}
            </span>
          )}
          <ChevronDown className={`w-5 h-5 2xl:w-4 2xl:h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Big field-work status targets — Row 1: Normal | Important | Emergency,
              Row 2: Unable to Check | N/A. Same statuses, same logic. */}
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.slice(0, 3).map((s) => (
              <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                className={`min-h-[56px] flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm md:text-base font-semibold leading-tight rounded-xl border transition md:min-h-14 2xl:min-h-9 2xl:gap-1 2xl:px-3 2xl:py-1 2xl:text-xs 2xl:rounded-full ${item.status === s.value ? s.cls + " font-bold ring-1 ring-inset ring-current/10" : s.idleCls}`}>
                <s.icon className="w-4 h-4 2xl:w-3.5 2xl:h-3.5 shrink-0" />
                {t(s.label)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.slice(3).map((s) => (
              <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                className={`min-h-[56px] flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm md:text-base font-semibold leading-tight rounded-xl border transition md:min-h-14 2xl:min-h-9 2xl:gap-1 2xl:px-3 2xl:py-1 2xl:text-xs 2xl:rounded-full ${item.status === s.value ? s.cls + " font-bold ring-1 ring-inset ring-current/10" : s.idleCls}`}>
                <s.icon className="w-4 h-4 2xl:w-3.5 2xl:h-3.5 shrink-0" />
                {t(s.label)}
              </button>
            ))}
          </div>

          {item.status !== "Not Checked" && (
            <button
              type="button"
              onClick={() => setDetailOpen(!detailOpen)}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-muted transition 2xl:min-h-9 2xl:px-3 2xl:py-1.5 2xl:text-xs"
            >
              {detailOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {detailOpen ? t("Hide notes / photos") : t("Add note / photo")}
            </button>
          )}

          {/* Create maintenance issue — always visible on Attention/Emergency
              items, so staff don't have to guess it lives under the notes
              area. Creation stays optional and staff-controlled. */}
          {(item.status === "Important" || item.status === "Emergency") && (
            <button type="button" onClick={() => onFlagIssue(index)}
              disabled={flagged}
              className={`min-h-[44px] text-sm px-4 py-2 md:px-4 md:py-2.5 2xl:min-h-9 2xl:text-xs 2xl:px-3 2xl:py-1.5 rounded-full border inline-flex items-center gap-1.5 transition ${flagged ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "border-primary/30 text-primary hover:bg-primary/10"}`}>
              <Wrench className="w-3.5 h-3.5" /> {flagged ? t("Issue created") : t("Create maintenance issue")}
            </button>
          )}

          {detailOpen && (
            <div className="space-y-2">
              {(item.status === "Important" || item.status === "Emergency") && (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-500 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {t("Required: describe what was observed. This explanation appears in the owner report.")}
                </p>
              )}
              <Textarea value={item.notes || ""} onChange={(e) => setNotes(e.target.value)} placeholder={t(item.status === "Unable to Check" ? "Reason unable to check (e.g. equipment room locked, area inaccessible, water off)…" : (item.status === "Important" || item.status === "Emergency") ? "Describe what was observed (required)…" : "Notes…")} rows={item.status === "Unable to Check" ? 4 : 3} className="resize-none min-h-[96px] text-base leading-relaxed py-3 2xl:text-sm 2xl:min-h-60 2xl:py-2" />
              <button
                type="button"
                onClick={toggleOwnerVisible}
                className={`inline-flex items-center gap-1.5 min-h-[44px] text-sm px-4 py-2 md:px-4 md:py-2.5 2xl:min-h-9 2xl:text-xs 2xl:px-3 2xl:py-1.5 rounded-full border transition ${ownerVisible ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {ownerVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {ownerVisible ? t("Owner-visible") : t("Private (staff only)")}
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

            </div>
          )}
        </div>
      )}
    </div>
  );
}