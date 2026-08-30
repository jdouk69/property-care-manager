import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Check, X, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

// Lightweight staff-only editor for Property.monitoring_priorities.
// Lives on the Property Detail overview. Lets staff add / edit / deactivate /
// remove individual monitoring priorities intentionally — never as a side effect
// of applying an intake. No security secrets are stored here.
export default function MonitoringPrioritiesEditor({ propertyId, initial, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const current = Array.isArray(initial) ? initial : [];

  const startEdit = () => {
    setItems(
      (current.length ? current : [{ area: "", detail: "", active: true }]).map((p) => ({
        area: p.area || "",
        detail: p.detail || "",
        active: p.active !== false,
      }))
    );
    setEditing(true);
  };
  const cancel = () => { setEditing(false); setItems([]); };

  const update = (i, patch) => setItems((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const add = () => setItems((arr) => [...arr, { area: "", detail: "", active: true }]);

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = items
        .map((p) => ({ area: (p.area || "").trim(), detail: (p.detail || "").trim(), active: p.active !== false }))
        .filter((p) => p.area);
      await base44.entities.Property.update(propertyId, { monitoring_priorities: cleaned });
      setEditing(false);
      if (onChanged) onChanged(cleaned);
    } catch (e) {
      alert("Could not save monitoring priorities: " + (e?.message || e));
    }
    setSaving(false);
  };

  if (!editing) {
    const active = current.filter((p) => p.active !== false);
    if (active.length === 0) {
      return (
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-2">No confirmed monitoring priorities yet.</p>
          <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5"><Plus className="w-4 h-4" /> Add Priority</Button>
        </div>
      );
    }
    return (
      <div>
        <div className="divide-y divide-border">
          {active.map((p, i) => (
            <div key={i} className="px-4 py-3">
              <p className="text-sm font-medium">{p.area}</p>
              {p.detail && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{p.detail}</p>}
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-border">
          <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit Priorities</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {items.map((p, i) => (
        <div key={i} className="rounded-xl border border-border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input value={p.area} onChange={(e) => update(i, { area: e.target.value })} placeholder="Area (e.g. Pool / spa)" className="bg-background h-11" />
            <button type="button" onClick={() => remove(i)} aria-label="Remove priority"
              className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition touch-manipulation">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <Textarea value={p.detail} onChange={(e) => update(i, { detail: e.target.value })} rows={2} placeholder="Specific instruction (optional)" className="bg-background" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active</span>
            <Switch checked={p.active !== false} onCheckedChange={(v) => update(i, { active: v })} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5"><Plus className="w-4 h-4" /> Add Priority</Button>
      <div className="flex items-center gap-2 pt-1">
        <Button type="button" size="sm" onClick={save} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save</Button>
        <Button type="button" size="sm" variant="outline" onClick={cancel} disabled={saving} className="gap-1.5"><X className="w-4 h-4" /> Cancel</Button>
      </div>
    </div>
  );
}