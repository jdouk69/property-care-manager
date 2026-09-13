import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronUp, ChevronDown, Trash2, Plus, Pencil, Loader2, RotateCcw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { SEED } from "@/lib/checklistSeed";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * View/Edit sheet for a single ChecklistTemplate (admin).
 *
 * View mode: read-only name/description/items + a clearly visible
 * "Edit Template" action. Edit mode drafts ALL changes locally and commits
 * them in ONE update on Save; Cancel discards (with a confirm when dirty).
 *
 * Historical safety: only the ChecklistTemplate record is ever written.
 * Visits snapshot their checklist items when they start (VisitWizard), so
 * editing or renaming a master template never rewrites existing visits.
 * Package routing matches templates by visit_type (never by display name),
 * so renaming cannot break the package/template association.
 */
export default function TemplateEditSheet({ template, properties = [], propName = () => "", onClose, onSaved, onCreated }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [mode, setMode] = useState("view");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [copyTarget, setCopyTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isMaster = !!template && (template.is_master || !template.property_id);

  useEffect(() => {
    if (template) {
      setMode("view");
      setName(template.name || "");
      setDescription(template.description || "");
      setItems([...(template.items || [])]);
      setNewItem("");
      setCopyTarget("");
    }
  }, [template]);

  const resetDraft = () => {
    if (!template) return;
    setName(template.name || "");
    setDescription(template.description || "");
    setItems([...(template.items || [])]);
    setNewItem("");
  };

  const isDirty = !!template && (
    name !== (template.name || "") ||
    description !== (template.description || "") ||
    JSON.stringify(items) !== JSON.stringify(template.items || [])
  );

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: t("Enter a template name.") });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.ChecklistTemplate.update(template.id, {
        name: trimmed,
        description: description.trim(),
        items: [...items],
      });
      onSaved?.({ ...template, name: trimmed, description: description.trim(), items: [...items] });
      setMode("view");
      toast({ title: t("Template saved") });
    } catch (e) {
      toast({ title: t("Could not save: {message}", { message: e?.message || e }) });
    }
    setSaving(false);
  };

  const cancelEdit = () => {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    setMode("view");
    resetDraft();
  };

  const discardConfirmed = () => {
    setConfirmDiscard(false);
    setMode("view");
    resetDraft();
  };

  const move = (i, dir) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  const renameItem = (i, val) => setItems((arr) => arr.map((x, idx) => (idx === i ? val : x)));
  const removeItem = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const addItem = () => {
    if (!newItem.trim()) return;
    setItems((arr) => [...arr, newItem.trim()]);
    setNewItem("");
  };

  const restoreMaster = async () => {
    setConfirmRestore(false);
    const seed = SEED[template.visit_type] || [];
    setSaving(true);
    try {
      await base44.entities.ChecklistTemplate.update(template.id, { items: [...seed] });
      onSaved?.({ ...template, items: [...seed] });
      setItems([...seed]);
      toast({ title: t("Restored original master checklist.") });
    } catch (e) {
      toast({ title: t("Could not restore: {message}", { message: e?.message || e }) });
    }
    setSaving(false);
  };

  const copyToProperty = async () => {
    if (!copyTarget) {
      toast({ title: t("Select a property first.") });
      return;
    }
    setBusy(true);
    try {
      const created = await base44.entities.ChecklistTemplate.create({
        name: `${template.visit_type} — ${propName(copyTarget)}`,
        visit_type: template.visit_type,
        items: [...(template.items || [])],
        is_master: false,
        property_id: copyTarget,
      });
      onCreated?.(created);
      setCopyTarget("");
      toast({ title: t("Property-specific template created. You can now customize it independently.") });
    } catch (e) {
      toast({ title: t("Could not copy: {message}", { message: e?.message || e }) });
    }
    setBusy(false);
  };

  return (
    <>
      <Sheet open={!!template} onOpenChange={(o) => { if (!o) { setMode("view"); onClose?.(); } }}>
        {/* Layout contract: the SHEET never scrolls as a whole. The sheet is
            overflow-hidden; the header (shrink-0) and footer (shrink-0) stay
            visible, and ONLY the checklist content area scrolls vertically.
            Width is constrained by the container itself (w-full on mobile,
            sm:max-w-lg on desktop) — children can never push it wider. */}
        <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle className="pr-9 break-words">{template ? t(visitTypeLabel(template.visit_type)) : ""}</SheetTitle>
            <SheetDescription className="sr-only">{t("Edit checklist items")}</SheetDescription>
            {template && (
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border max-w-full min-w-0 truncate ${isMaster ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                  {isMaster ? t("Master") : t("Property: {name}", { name: propName(template.property_id) })}
                </span>
                {/* Edit Template is ALSO available right in the header — it no
                    longer requires scrolling below a long checklist to find. */}
                {mode === "view" && (
                  <Button variant="outline" size="sm" onClick={() => setMode("edit")} className="rounded-full h-8 gap-1.5 ml-auto shrink-0">
                    <Pencil className="w-3.5 h-3.5" /> {t("Edit Template")}
                  </Button>
                )}
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </div>
            )}
          </SheetHeader>

          {!template ? null : mode === "view" ? (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
                <div>
                  <p className="text-base font-semibold leading-tight break-words">{template.name}</p>
                  {template.description ? <p className="text-sm text-muted-foreground mt-1">{template.description}</p> : null}
                </div>
                <div className="space-y-1.5">
                  {(template.items || []).map((it, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
                      <span className="text-[10px] text-muted-foreground w-5 shrink-0 text-right pt-0.5">{i + 1}</span>
                      <p className="text-sm break-words">{it}</p>
                    </div>
                  ))}
                  {!(template.items || []).length && <p className="text-sm text-muted-foreground">{t("No items yet.")}</p>}
                </div>
              </div>
              {/* Plain flex column (NOT the shared SheetFooter): SheetFooter's
                  built-in sm:flex-row silently turned these stacked full-width
                  actions into ONE horizontal row on desktop — ~4× the sheet
                  width, overflowing off the sheet/viewport (e.g. the Restore
                  button clipped outside). A plain column keeps every action
                  inside the sheet at every width. */}
              <div className="flex flex-col gap-2 border-t pt-4 shrink-0">
                <Button onClick={() => setMode("edit")} className="rounded-full w-full gap-1.5"><Pencil className="w-4 h-4" /> {t("Edit Template")}</Button>
                {isMaster && (
                  <>
                    <Button variant="outline" onClick={() => setConfirmRestore(true)} className="rounded-full w-full justify-start"><RotateCcw className="w-4 h-4 mr-2" /> {t("Restore original seeded master")}</Button>
                    <div className="flex gap-2 w-full min-w-0">
                      <Select value={copyTarget} onValueChange={setCopyTarget}>
                        <SelectTrigger className="flex-1 min-w-0"><SelectValue placeholder={t("Copy to property…")} /></SelectTrigger>
                        <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button onClick={copyToProperty} disabled={busy || !copyTarget} className="rounded-full"><Copy className="w-4 h-4 mr-1" /> {t("Copy")}</Button>
                    </div>
                  </>
                )}
                <Button variant="ghost" onClick={() => { setMode("view"); onClose?.(); }} className="w-full">{t("Close")}</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Template Name")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Description")}</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t("Optional")} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Checklist Items")}</Label>
                  <div className="space-y-2">
                    {items.map((it, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="flex flex-col">
                          <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0} aria-label={t("Move up")}><ChevronUp className="w-4 h-4" /></button>
                          <button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === items.length - 1} aria-label={t("Move down")}><ChevronDown className="w-4 h-4" /></button>
                        </div>
                        <Input value={it} onChange={(e) => renameItem(i, e.target.value)} className="flex-1 min-w-0" />
                        <button onClick={() => removeItem(i)} aria-label={t("Remove Item")} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {!items.length && <p className="text-sm text-muted-foreground">{t("No items yet.")}</p>}
                    <div className="flex gap-2 pt-1 min-w-0">
                      <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder={t("Add checklist item")} className="min-w-0" />
                      <Button onClick={addItem} disabled={!newItem.trim()}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t pt-4 shrink-0">
                <div className="flex flex-wrap gap-2 w-full">
                  <Button variant="outline" onClick={cancelEdit} className="flex-1 min-w-[120px] rounded-full">{t("Cancel")}</Button>
                  <Button onClick={save} disabled={saving} className="flex-1 min-w-[120px] rounded-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Save")}</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Discard your changes?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Your unsaved changes will be lost.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={discardConfirmed} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("Discard")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Restore original seeded master")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Restore the original seeded master template? Your customizations to this master will be lost.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={restoreMaster}>{t("Restore original seeded master")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}