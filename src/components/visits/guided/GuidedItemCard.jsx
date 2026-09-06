import React from "react";
import { Mic, Camera, Loader2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Image as UIImage } from "@/components/ui/image";
import { STATUSES } from "@/components/visits/VisitChecklistItem";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { checklistItemDisplay } from "@/lib/i18n/checklistItemDisplay";

// Statuses that open the notes / photos area on the card (same semantics as
// the accordion: concerns need documenting, Unable to Check needs a reason).
const DETAIL_STATUSES = ["Important", "Emergency", "Unable to Check"];

// ONE Guided Checklist card: the current item in very large bold text, a large
// Dictate This Item button, and the five EXISTING statuses with the same
// visual semantics as VisitChecklistItem (same STATUSES definitions). It
// renders and mutates the SAME checklist item object the wizard owns, through
// the wizard's existing update handlers — no parallel state or records.
export default function GuidedItemCard({ item, index, uploading, onSetStatus, onDictate, onNotes, onToggleOwnerVisible, onUploadPhotos, onRemovePhoto }) {
  const { t, lang } = useLanguage();
  const showDetails =
    DETAIL_STATUSES.includes(item.status) ||
    !!(item.notes || "").trim() ||
    (item.photos || []).length > 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-2xl md:text-3xl font-bold leading-tight text-foreground break-words">
        {checklistItemDisplay(item.name, lang)}
      </p>

      <Button onClick={onDictate} className="w-full h-16 rounded-2xl text-base font-semibold gap-2 shrink-0">
        <Mic className="w-5 h-5" /> {t("Dictate This Item")}
      </Button>

      {/* Big field-work status targets — Row 1: Normal | Important | Emergency,
          Row 2: Unable to Check | N/A. Same statuses, same colors/semantics. */}
      <div className="grid grid-cols-3 gap-2">
        {STATUSES.slice(0, 3).map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onSetStatus(s.value)}
            className={`min-h-[64px] flex items-center justify-center gap-1.5 px-1.5 py-3 text-sm md:text-base font-semibold leading-tight rounded-2xl border transition ${
              item.status === s.value ? s.cls + " font-bold ring-2 ring-inset ring-primary" : s.idleCls
            }`}
          >
            <s.icon className="w-4 h-4 shrink-0" />
            {t(s.label)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {STATUSES.slice(3).map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onSetStatus(s.value)}
            className={`min-h-[64px] flex items-center justify-center gap-1.5 px-2 py-3 text-sm md:text-base font-semibold leading-tight rounded-2xl border transition ${
              item.status === s.value ? s.cls + " font-bold ring-2 ring-inset ring-primary" : s.idleCls
            }`}
          >
            <s.icon className="w-4 h-4 shrink-0" />
            {t(s.label)}
          </button>
        ))}
      </div>

      {showDetails && (
        <div className="space-y-2">
          {(item.status === "Important" || item.status === "Emergency") && (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-500 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {t("Required: describe what was observed. This explanation appears in the owner report.")}
            </p>
          )}
          <Textarea
            value={item.notes || ""}
            onChange={(e) => onNotes(e.target.value)}
            placeholder={t(
              item.status === "Unable to Check"
                ? "Reason unable to check (e.g. equipment room locked, area inaccessible, water off)…"
                : item.status === "Important" || item.status === "Emergency"
                  ? "Describe what was observed (required)…"
                  : "Notes…"
            )}
            rows={item.status === "Unable to Check" ? 4 : 3}
            className="resize-none min-h-[96px] text-base leading-relaxed py-3"
          />
          <div className="grid grid-cols-4 gap-2">
            {(item.photos || []).map((url, i) => (
              <div key={i} className="relative group aspect-square">
                <UIImage src={url} className="w-full h-full rounded-lg" fittingType="fill" />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(index, i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUploadPhotos(index, Array.from(e.target.files || []))} />
            </label>
          </div>
          {/* Same owner_visible field the accordion toggles — secondary to the
              notes/photos fields, shown only when the item has details. */}
          <div
            role="button"
            tabIndex={0}
            onClick={onToggleOwnerVisible}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleOwnerVisible(); } }}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-left cursor-pointer transition hover:bg-muted"
          >
            <span className="text-sm font-medium text-foreground">{t("Show this observation to owner")}</span>
            <Checkbox checked={!!item.owner_visible} className="pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}