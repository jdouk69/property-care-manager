import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import GuidedItemCard from "@/components/visits/guided/GuidedItemCard";
import GuidedSummary from "@/components/visits/guided/GuidedSummary";
import DictateItemDialog from "@/components/dictation/DictateItemDialog";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const ANSWERED = ["Normal", "Important", "Emergency", "Unable to Check", "N/A"];
// Normal / N/A save immediately and auto-advance (fast routine workflow).
// Important / Emergency / Unable to Check stay on the card for notes / photos.
const AUTO_ADVANCE = ["Normal", "N/A"];

// Full-screen, mobile-first Guided Checklist overlay over the EXISTING Visit
// Wizard checklist state: ONE item per screen, big touch targets, "X of Y"
// progress, Previous / Next, per-item dictation and photos. It renders the
// SAME checklist array through the wizard's existing update handlers — no
// duplicate records, no new statuses. Progress autosave/resume is inherited
// from the wizard's draft / visit-record persistence; reopening starts at the
// first unanswered item (initialIndex, computed by the wizard's focusIdx).
export default function GuidedChecklistOverlay({ open, onClose, checklist, initialIndex = 0, context, onChangeItem, onUploadPhotos, onRemovePhoto, uploading }) {
  const { t } = useLanguage();
  const [idx, setIdx] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [dictateOpen, setDictateOpen] = useState(false);

  // (Re)opening resumes at the first relevant item; the index is NOT persisted
  // — it is derived from checklist progress, so resuming after leaving works
  // without any new field.
  useEffect(() => {
    if (open) {
      setIdx(Math.max(0, Math.min(initialIndex, Math.max(0, checklist.length - 1))));
      setShowSummary(false);
      setDictateOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || checklist.length === 0) return null;

  const total = checklist.length;
  const isAnswered = (it) => ANSWERED.includes(it?.status);
  const item = checklist[idx];

  // Auto-advance to the next unanswered item after a Normal / N/A tap (or an
  // approved Normal / N/A dictation); when none remain ahead, show the summary.
  // Only the CURRENT item's status is changing here, so the current (possibly
  // one-render-stale) array is safe to scan for items after idx.
  const advanceAfter = (fromIdx, status) => {
    if (!AUTO_ADVANCE.includes(status)) return;
    const next = checklist.findIndex((it, i) => i > fromIdx && !isAnswered(it));
    if (next >= 0) setIdx(next);
    else setShowSummary(true);
  };

// Concern statuses: the first time an item becomes Important/Emergency it is
// automatically surfaced to the owner (same owner_visible field/semantics the
// accordion uses — no second visibility system). If the item was ALREADY a
// concern, the staff's existing owner-visible choice stands and is never
// silently overridden; a manual toggle-off stays off.
const CONCERN_STATUSES = ["Important", "Emergency"];
const concernVisibilityPatch = (item, status) =>
  CONCERN_STATUSES.includes(status) && !CONCERN_STATUSES.includes(item.status)
    ? { owner_visible: true }
    : {};

  const handleSetStatus = (status) => {
    onChangeItem(idx, { ...item, status, ...concernVisibilityPatch(item, status) });
    advanceAfter(idx, status);
  };

  // Approved item-level dictation applies to THIS item only: the proposed
  // status is set and the observation is APPENDED to existing notes (same
  // merge semantics as the whole-visit dictation — never a silent overwrite).
  const handleApplyDictation = (proposal) => {
    const mergedNotes = [item.notes || "", proposal.notes || ""].filter((s) => s.trim()).join("\n").trim();
    onChangeItem(idx, { ...item, status: proposal.status, notes: mergedNotes, ...concernVisibilityPatch(item, proposal.status) });
    advanceAfter(idx, proposal.status);
  };

  // Same owner_visible field the accordion toggles — flips through the same
  // wizard checklist update handler, so there is one source of truth.
  const handleToggleOwnerVisible = () => {
    onChangeItem(idx, { ...item, owner_visible: !item.owner_visible });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col">
      {/* Header — safe-area aware */}
      <div className="shrink-0 pt-[env(safe-area-inset-top)] border-b border-border bg-background">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{context.serviceLabel}</p>
            <p className="text-sm font-semibold text-foreground truncate">{context.propertyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground pb-2">
          {showSummary ? t("Summary") : t("{current} of {total}", { current: idx + 1, total })}
        </p>
      </div>

      {showSummary ? (
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <GuidedSummary checklist={checklist} onClose={onClose} onBack={() => setShowSummary(false)} />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <GuidedItemCard
              item={item}
              index={idx}
              uploading={uploading}
              onSetStatus={handleSetStatus}
              onDictate={() => setDictateOpen(true)}
              onNotes={(notes) => onChangeItem(idx, { ...item, notes })}
              onToggleOwnerVisible={handleToggleOwnerVisible}
              onUploadPhotos={onUploadPhotos}
              onRemovePhoto={onRemovePhoto}
            />
          </div>

          {/* Previous / Next — Previous always allows correcting an accidental status */}
          <div className="shrink-0 border-t border-border bg-background px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="h-14 rounded-2xl text-base font-semibold gap-1"
              >
                <ChevronLeft className="w-5 h-5" /> {t("Previous")}
              </Button>
              <Button
                onClick={() => (idx >= total - 1 ? setShowSummary(true) : setIdx(idx + 1))}
                className="h-14 rounded-2xl text-base font-semibold gap-1"
              >
                {idx >= total - 1 ? t("Summary") : (<>{t("Next")} <ChevronRight className="w-5 h-5" /></>)}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Item-level dictation — context-locked to the card currently shown */}
      <DictateItemDialog
        open={dictateOpen}
        onOpenChange={setDictateOpen}
        item={item}
        statuses={ANSWERED}
        contextLabel={[context.propertyName, context.serviceLabel].filter(Boolean).join(" · ")}
        onApply={handleApplyDictation}
      />
    </div>
  );
}