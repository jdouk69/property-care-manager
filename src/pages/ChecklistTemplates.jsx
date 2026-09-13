import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Archive, AlertTriangle, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { VISIT_TYPES } from "@/lib/checklistSeed";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import TemplateEditSheet from "@/components/checklists/TemplateEditSheet";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// The three recurring package checklists are pinned to the top of the page,
// identified ONLY by their stable visit_type — the exact routing key shared
// with the Quick Check / Property Care / Complete Care ServicePackages.
// Never by editable display name: renaming a template cannot move it out of
// the primary section. Order = package tier order (Basic → Standard → Premium).
const PRIMARY_PACKAGE_VISIT_TYPES = [
  "Home Watch Inspection",       // Quick Check
  "Property Care Inspection",    // Property Care
  "Complete Care Property Visit", // Complete Care
];

export default function ChecklistTemplates() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propFilter, setPropFilter] = useState("all");
  const [editing, setEditing] = useState(null); // template object
  const [archiveTarget, setArchiveTarget] = useState(null); // property-specific template
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVisitType, setNewVisitType] = useState(VISIT_TYPES[0]);
  const [newItems, setNewItems] = useState([]);
  const [createItem, setCreateItem] = useState("");
  const [createError, setCreateError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [tpls, p] = await Promise.all([
        base44.entities.ChecklistTemplate.list("-created_date", 500),
        base44.entities.Property.list("-created_date", 500),
      ]);
      setTemplates((tpls || []).filter((x) => !x.archived));
      setProperties((p || []).filter((x) => !x.archived));
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const propName = (id) => properties.find((p) => p.id === id)?.name || "";

  const handleSaved = (updated) => {
    setTemplates((arr) => arr.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    if (editing?.id === updated.id) setEditing({ ...editing, ...updated });
  };
  const handleCreated = (created) => setTemplates((arr) => [created, ...arr]);

  const confirmArchive = async () => {
    const tpl = archiveTarget;
    setArchiveTarget(null);
    if (!tpl) return;
    try {
      await base44.entities.ChecklistTemplate.update(tpl.id, { archived: true });
      setTemplates((arr) => arr.filter((x) => x.id !== tpl.id));
      if (editing?.id === tpl.id) setEditing(null);
    } catch (e) {
      toast({ title: t("Could not archive: {message}", { message: e?.message || e }) });
    }
  };

  const openCreate = () => {
    setNewName(""); setNewVisitType(VISIT_TYPES[0]); setNewItems([]); setCreateItem(""); setCreateError(""); setCreating(true);
  };
  const addCreateItem = () => { if (!createItem.trim()) return; setNewItems((a) => [...a, createItem.trim()]); setCreateItem(""); };
  const removeNewItem = (i) => setNewItems((a) => a.filter((_, idx) => idx !== i));
  const moveNewItem = (i, dir) => { const j = i + dir; if (j < 0 || j >= newItems.length) return; const n = [...newItems]; [n[i], n[j]] = [n[j], n[i]]; setNewItems(n); };
  const renameNewItem = (i, val) => setNewItems((a) => a.map((x, idx) => (idx === i ? val : x)));
  const createTemplate = async () => {
    if (!newName.trim()) { setCreateError(t("Enter a template name.")); return; }
    if (!newVisitType) { setCreateError(t("Choose a visit type.")); return; }
    const existing = templates.find((tpl) => tpl.visit_type === newVisitType && (tpl.is_master || !tpl.property_id) && !tpl.archived);
    if (existing) { setCreateError(t('An active master template for "{name}" already exists. Edit that template instead of creating a duplicate.', { name: t(visitTypeLabel(newVisitType)) })); return; }
    setBusy(true);
    try {
      const created = await base44.entities.ChecklistTemplate.create({
        name: newName.trim(), visit_type: newVisitType, items: [...newItems],
        is_master: true, property_id: null, archived: false,
      });
      setTemplates((arr) => [created, ...arr]);
      setCreating(false);
    } catch (e) { setCreateError(t("Could not create: {message}", { message: e?.message || e })); }
    setBusy(false);
  };

  const visible = templates.filter((tpl) => {
    if (tpl.is_master || !tpl.property_id) return true;
    if (propFilter === "all") return true;
    return tpl.property_id === propFilter;
  });
  const masters = visible.filter((tpl) => tpl.is_master || !tpl.property_id);
  const propSpecific = visible.filter((tpl) => !tpl.is_master && tpl.property_id);

  // Pinned primary package checklists (stable visit_type order), then every
  // other master template. Renaming only changes what the card displays.
  const primaryMasters = PRIMARY_PACKAGE_VISIT_TYPES
    .map((vt) => masters.find((tpl) => tpl.visit_type === vt))
    .filter(Boolean);
  const otherMasters = masters.filter((tpl) => !PRIMARY_PACKAGE_VISIT_TYPES.includes(tpl.visit_type));

  const renderMasterCard = (tpl) => (
    <button key={tpl.id} onClick={() => setEditing(tpl)} className="text-left rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm truncate">{tpl.name}</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 shrink-0">{t("Master")}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{t(visitTypeLabel(tpl.visit_type))} · {t("{count} items", { count: (tpl.items || []).length })}</p>
    </button>
  );

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
        <PageBackButton className="mb-3" />
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("Checklist Templates")}</h1>
            <p className="text-sm text-muted-foreground">{t("Manage master and property-specific checklists.")}</p>
          </div>
          <Button onClick={openCreate} className="rounded-full gap-1.5 h-9 px-4"><Plus className="w-4 h-4" /> {t("New Template")}</Button>
        </div>

        <div className="max-w-xs mb-4">
          <Select value={propFilter} onValueChange={setPropFilter}>
            <SelectTrigger><SelectValue placeholder={t("Filter by property")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All (masters + property-specific)")}</SelectItem>
              {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("Primary Package Checklists")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
              {primaryMasters.map(renderMasterCard)}
            </div>

            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("Other Master Templates")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
              {otherMasters.map(renderMasterCard)}
            </div>

            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("Property-Specific")}</h2>
            {propSpecific.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No property-specific templates. Open a master and use "Copy to property".')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {propSpecific.map((tpl) => (
                  <div key={tpl.id} className="rounded-2xl border border-border bg-card p-4 hover:shadow-md transition">
                    <button onClick={() => setEditing(tpl)} className="text-left w-full">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{tpl.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">{t("Property")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{propName(tpl.property_id)} · {t("{count} items", { count: (tpl.items || []).length })}</p>
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(tpl)} className="text-muted-foreground hover:text-destructive mt-2 h-7 px-2"><Archive className="w-3.5 h-3.5" /> {t("Archive")}</Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <TemplateEditSheet
        template={editing}
        properties={properties}
        propName={propName}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        onCreated={handleCreated}
      />

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Archive")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Archive this property-specific template? The master remains unaffected.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive}>{t("Archive")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>{t("New Checklist Template")}</SheetTitle>
            <SheetDescription className="sr-only">{t("Create a master template")}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 py-4 space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Template Name")}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("e.g. Emergency Visit (Master)")} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Visit Type")}</Label>
              <Select value={newVisitType} onValueChange={setNewVisitType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VISIT_TYPES.map((vt) => <SelectItem key={vt} value={vt}>{t(visitTypeLabel(vt))}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Checklist Items")}</Label>
              <div className="space-y-2">
                {newItems.map((it, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="flex flex-col">
                      <button onClick={() => moveNewItem(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                      <button onClick={() => moveNewItem(i, 1)} disabled={i === newItems.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                    <Input value={it} onChange={(e) => renameNewItem(i, e.target.value)} className="flex-1" />
                    <button onClick={() => removeNewItem(i)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {newItems.length === 0 && <p className="text-sm text-muted-foreground">{t("No items yet.")}</p>}
                <div className="flex gap-2 pt-1">
                  <Input value={createItem} onChange={(e) => setCreateItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCreateItem()} placeholder={t("Add checklist item")} />
                  <Button onClick={addCreateItem} disabled={!createItem.trim()}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
            {createError && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">{createError}</p>
              </div>
            )}
          </div>
          <SheetFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setCreating(false)} className="rounded-full">{t("Cancel")}</Button>
            <Button onClick={createTemplate} disabled={busy} className="rounded-full">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> {t("Create Master Template")}</>}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}