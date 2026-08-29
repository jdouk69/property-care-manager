import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ScrollText, Plus, ChevronUp, ChevronDown, Trash2, RotateCcw, Copy, Loader2, Check, Archive, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import AppLayout from "@/components/layout/AppLayout";
import { SEED, VISIT_TYPES } from "@/lib/checklistSeed";

export default function ChecklistTemplates() {
  const [templates, setTemplates] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propFilter, setPropFilter] = useState("all");
  const [editing, setEditing] = useState(null); // template object
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copyTarget, setCopyTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVisitType, setNewVisitType] = useState(VISIT_TYPES[0]);
  const [newItems, setNewItems] = useState([]);
  const [createItem, setCreateItem] = useState("");
  const [createError, setCreateError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([
        base44.entities.ChecklistTemplate.list("-created_date", 500),
        base44.entities.Property.list("-created_date", 500),
      ]);
      setTemplates((t || []).filter((x) => !x.archived));
      setProperties((p || []).filter((x) => !x.archived));
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const propName = (id) => properties.find((p) => p.id === id)?.name || "";

  const openEdit = (t) => { setEditing(t); setItems([...(t.items || [])]); setNewItem(""); setSaved(false); };

  const persist = async (nextItems) => {
    if (!editing) return;
    setSaving(true);
    try {
      await base44.entities.ChecklistTemplate.update(editing.id, { items: nextItems });
      setTemplates((arr) => arr.map((x) => (x.id === editing.id ? { ...x, items: nextItems } : x)));
      setSaved(true); setTimeout(() => setSaved(false), 1500);
    } catch (e) {}
    setSaving(false);
  };

  const move = (i, dir) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next); persist(next);
  };
  const rename = (i, val) => { const next = items.map((x, idx) => idx === i ? val : x); setItems(next); };
  const commitRename = () => persist(items);
  const remove = (i) => { if (!confirm("Remove this checklist item?")) return; const next = items.filter((_, idx) => idx !== i); setItems(next); persist(next); };
  const add = () => { if (!newItem.trim()) return; const next = [...items, newItem.trim()]; setItems(next); setNewItem(""); persist(next); };

  const restoreMaster = () => {
    if (!confirm("Restore the original seeded master template? Your customizations to this master will be lost.")) return;
    const seed = SEED[editing.visit_type] || [];
    setItems([...seed]); persist([...seed]);
  };

  const copyToProperty = async () => {
    if (!copyTarget) { alert("Select a property first."); return; }
    setBusy(true);
    try {
      const created = await base44.entities.ChecklistTemplate.create({
        name: `${editing.visit_type} — ${propName(copyTarget)}`,
        visit_type: editing.visit_type,
        items: [...items],
        is_master: false,
        property_id: copyTarget,
      });
      setTemplates((arr) => [created, ...arr]);
      setCopyTarget("");
      alert("Property-specific template created. You can now customize it independently.");
    } catch (e) { alert("Could not copy: " + (e?.message || e)); }
    setBusy(false);
  };

  const archiveTemplate = async (t) => {
    if (!confirm("Archive this property-specific template? The master remains unaffected.")) return;
    try { await base44.entities.ChecklistTemplate.update(t.id, { archived: true }); setTemplates((arr) => arr.filter((x) => x.id !== t.id)); if (editing?.id === t.id) setEditing(null); } catch (e) {}
  };

  const openCreate = () => {
    setNewName(""); setNewVisitType(VISIT_TYPES[0]); setNewItems([]); setCreateItem(""); setCreateError(""); setCreating(true);
  };
  const addCreateItem = () => { if (!createItem.trim()) return; setNewItems((a) => [...a, createItem.trim()]); setCreateItem(""); };
  const removeNewItem = (i) => setNewItems((a) => a.filter((_, idx) => idx !== i));
  const moveNewItem = (i, dir) => { const j = i + dir; if (j < 0 || j >= newItems.length) return; const n = [...newItems]; [n[i], n[j]] = [n[j], n[i]]; setNewItems(n); };
  const renameNewItem = (i, val) => setNewItems((a) => a.map((x, idx) => (idx === i ? val : x)));
  const createTemplate = async () => {
    if (!newName.trim()) { setCreateError("Enter a template name."); return; }
    if (!newVisitType) { setCreateError("Choose a visit type."); return; }
    const existing = templates.find((t) => t.visit_type === newVisitType && (t.is_master || !t.property_id) && !t.archived);
    if (existing) { setCreateError(`An active master template for "${newVisitType}" already exists. Edit that template instead of creating a duplicate.`); return; }
    setBusy(true);
    try {
      const created = await base44.entities.ChecklistTemplate.create({
        name: newName.trim(), visit_type: newVisitType, items: [...newItems],
        is_master: true, property_id: null, archived: false,
      });
      setTemplates((arr) => [created, ...arr]);
      setCreating(false);
    } catch (e) { setCreateError("Could not create: " + (e?.message || e)); }
    setBusy(false);
  };

  const visible = templates.filter((t) => {
    if (t.is_master || !t.property_id) return true;
    if (propFilter === "all") return true;
    return t.property_id === propFilter;
  });
  const masters = visible.filter((t) => t.is_master || !t.property_id);
  const propSpecific = visible.filter((t) => !t.is_master && t.property_id);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Checklist Templates</h1>
            <p className="text-sm text-muted-foreground">Manage master and property-specific checklists.</p>
          </div>
          <Button onClick={openCreate} className="rounded-full gap-1.5 h-9 px-4"><Plus className="w-4 h-4" /> New Template</Button>
        </div>

        <div className="max-w-xs mb-4">
          <Select value={propFilter} onValueChange={setPropFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by property" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (masters + property-specific)</SelectItem>
              {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Master Templates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
              {masters.map((t) => (
                <button key={t.id} onClick={() => openEdit(t)} className="text-left rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{t.visit_type}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 shrink-0">Master</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{(t.items || []).length} items</p>
                </button>
              ))}
            </div>

            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Property-Specific</h2>
            {propSpecific.length === 0 ? (
              <p className="text-sm text-muted-foreground">No property-specific templates. Open a master and use "Copy to property".</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {propSpecific.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-border bg-card p-4 hover:shadow-md transition">
                    <button onClick={() => openEdit(t)} className="text-left w-full">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{t.visit_type}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">Property</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{propName(t.property_id)} · {(t.items || []).length} items</p>
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => archiveTemplate(t)} className="text-muted-foreground hover:text-destructive mt-2 h-7 px-2"><Archive className="w-3.5 h-3.5" /> Archive</Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>{editing?.visit_type}</SheetTitle>
            <SheetDescription className="sr-only">Edit checklist items</SheetDescription>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${editing?.is_master || !editing?.property_id ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                {editing?.is_master || !editing?.property_id ? "Master" : `Property: ${propName(editing?.property_id)}`}
              </span>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : null}
            </div>
          </SheetHeader>

          <div className="flex-1 py-4 space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0}><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === items.length - 1}><ChevronDown className="w-4 h-4" /></button>
                </div>
                <Input value={it} onChange={(e) => rename(i, e.target.value)} onBlur={commitRename} className="flex-1" />
                <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}

            <div className="flex gap-2 pt-2">
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add checklist item" />
              <Button onClick={add} disabled={!newItem.trim()}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          <SheetFooter className="flex-col gap-2 border-t pt-4">
            {(editing?.is_master || !editing?.property_id) && (
              <>
                <Button variant="outline" onClick={restoreMaster} className="rounded-full w-full justify-start"><RotateCcw className="w-4 h-4 mr-2" /> Restore original seeded master</Button>
                <div className="flex gap-2 w-full">
                  <Select value={copyTarget} onValueChange={setCopyTarget}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Copy to property…" /></SelectTrigger>
                    <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={copyToProperty} disabled={busy || !copyTarget} className="rounded-full"><Copy className="w-4 h-4 mr-1" /> Copy</Button>
                </div>
              </>
            )}
            <Button variant="ghost" onClick={() => setEditing(null)} className="w-full">Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>New Checklist Template</SheetTitle>
            <SheetDescription className="sr-only">Create a master template</SheetDescription>
          </SheetHeader>
          <div className="flex-1 py-4 space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Template Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Emergency Visit (Master)" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Visit Type</Label>
              <Select value={newVisitType} onValueChange={setNewVisitType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VISIT_TYPES.map((vt) => <SelectItem key={vt} value={vt}>{vt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Checklist Items</Label>
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
                {newItems.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
                <div className="flex gap-2 pt-1">
                  <Input value={createItem} onChange={(e) => setCreateItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCreateItem()} placeholder="Add checklist item" />
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
            <Button variant="outline" onClick={() => setCreating(false)} className="rounded-full">Cancel</Button>
            <Button onClick={createTemplate} disabled={busy} className="rounded-full">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Create Master Template</>}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}