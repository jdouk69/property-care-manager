import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Check, X, Pencil, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  updateRecurringChecklist,
  resolveServiceStatus,
  reconfirmPriorityForCurrentService,
} from "@/lib/recurringChecklist";

// Phase 6C.1 staff-only editor for Property.monitoring_priorities, including
// the "Include in recurring visits" decision, the recurring_visit_type stamp
// (needs-review + reconfirm), and the "Update Recurring Visit Checklist"
// action — gated on a single current Active service agreement. No security
// secrets are stored or copied here; only staff-authored recurring_check_text
// is ever written into checklist templates.
export default function MonitoringPrioritiesEditor({ propertyId, initial, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [reconfirming, setReconfirming] = useState(null);
  const [status, setStatus] = useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);

  const current = Array.isArray(initial) ? initial : [];
  const visitType = serviceStatus?.status === "ok" ? serviceStatus.visitType : "";
  const canUpdate = !!serviceStatus && serviceStatus.status === "ok";

  const refreshService = async () => {
    try {
      setServiceStatus(await resolveServiceStatus(propertyId));
    } catch (e) {
      setServiceStatus({ status: "no_agreement", visitType: "", message: "Could not resolve service status." });
    }
  };

  useEffect(() => {
    refreshService();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const startEdit = () => {
    setItems(
      (current.length
        ? current
        : [{ area: "", detail: "", active: true, include_in_recurring: false, recurring_check_text: "", recurring_visit_type: "" }]
      ).map((p) => ({
        area: p.area || "",
        detail: p.detail || "",
        active: p.active !== false,
        include_in_recurring: p.include_in_recurring === true,
        recurring_check_text: p.recurring_check_text || "",
        recurring_visit_type: p.recurring_visit_type || "",
      }))
    );
    setStatus(null);
    setEditing(true);
  };
  const cancel = () => { setEditing(false); setItems([]); };

  const update = (i, patch) => setItems((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const add = () => setItems((arr) => [...arr, { area: "", detail: "", active: true, include_in_recurring: false, recurring_check_text: "", recurring_visit_type: "" }]);

  const save = async () => {
    setSaving(true);
    try {
      // Enforce: include_in_recurring requires recurring_check_text. Preserve
      // the recurring_visit_type stamp (system-managed, never cleared on save).
      const cleaned = items
        .map((p) => {
          const text = (p.recurring_check_text || "").trim();
          return {
            area: (p.area || "").trim(),
            detail: (p.detail || "").trim(),
            active: p.active !== false,
            include_in_recurring: p.include_in_recurring && text.length > 0,
            recurring_check_text: text,
            recurring_visit_type: p.recurring_visit_type || "",
          };
        })
        .filter((p) => p.area);
      await base44.entities.Property.update(propertyId, { monitoring_priorities: cleaned });
      setEditing(false);
      if (onChanged) onChanged(cleaned);
      refreshService();
    } catch (e) {
      alert("Could not save monitoring priorities: " + (e?.message || e));
    }
    setSaving(false);
  };

  const runUpdate = async () => {
    setUpdating(true);
    setStatus(null);
    try {
      const res = await updateRecurringChecklist(propertyId);
      setStatus({ kind: res.blocked ? "warn" : "ok", message: res.message });
      await refreshService();
      if (onChanged) onChanged();
    } catch (e) {
      setStatus({ kind: "warn", message: "Could not update recurring checklist: " + (e?.message || e) });
    }
    setUpdating(false);
  };

  const reconfirm = async (i) => {
    setReconfirming(i);
    setStatus(null);
    try {
      const res = await reconfirmPriorityForCurrentService(propertyId, i);
      setStatus({ kind: res.blocked ? "warn" : "ok", message: res.message });
      await refreshService();
      if (onChanged) onChanged();
    } catch (e) {
      setStatus({ kind: "warn", message: "Could not reconfirm: " + (e?.message || e) });
    }
    setReconfirming(null);
  };

  if (editing) {
    return (
      <div className="p-4 space-y-3">
        {items.map((p, i) => (
          <div key={i} className="rounded-xl border border-border p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <Input value={p.area} onChange={(e) => update(i, { area: e.target.value })} placeholder="Area (e.g. Pool / spa)" className="bg-background h-11" />
              <button type="button" onClick={() => remove(i)} aria-label="Remove priority"
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition touch-manipulation">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Textarea value={p.detail} onChange={(e) => update(i, { detail: e.target.value })} rows={2} placeholder="Owner / detail instruction (optional)" className="bg-background" />
            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="text-xs text-muted-foreground">Active monitoring priority</span>
              <Switch checked={p.active !== false} onCheckedChange={(v) => update(i, { active: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="text-xs text-muted-foreground">Include in recurring visits</span>
              <Switch checked={p.include_in_recurring} onCheckedChange={(v) => update(i, { include_in_recurring: v })} />
            </div>
            {p.include_in_recurring && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Recurring check wording (required)</p>
                <Textarea value={p.recurring_check_text} onChange={(e) => update(i, { recurring_check_text: e.target.value })} rows={2}
                  placeholder="e.g. Downstairs bedroom — look for obvious moisture/humidity changes." className="bg-background" />
                <p className="text-[11px] text-muted-foreground/70 mt-1">Describe a visual / property-care observation only — not a professional inspection. e.g. look for obvious moisture, visually check pool water level, confirm shutters remain closed.</p>
              </div>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5"><Plus className="w-4 h-4" /> Add Priority</Button>
        <div className="flex items-center gap-2 pt-1">
          <Button type="button" size="sm" onClick={save} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Priorities</Button>
          <Button type="button" size="sm" variant="outline" onClick={cancel} disabled={saving} className="gap-1.5"><X className="w-4 h-4" /> Cancel</Button>
        </div>
      </div>
    );
  }

  const activeRows = current.map((p, i) => ({ p, i })).filter(({ p }) => p.active !== false);

  return (
    <div>
      {activeRows.length === 0 ? (
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-2">No confirmed monitoring priorities yet.</p>
          <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5"><Plus className="w-4 h-4" /> Add Priority</Button>
        </div>
      ) : (
        <div>
          <div className="divide-y divide-border">
            {activeRows.map(({ p, i }) => {
              const recurring = p.include_in_recurring === true && (p.recurring_check_text || "").trim();
              const needsReview = recurring && visitType && p.recurring_visit_type && p.recurring_visit_type !== visitType;
              return (
                <div key={i} className="px-4 py-3">
                  <p className="text-sm font-medium">{p.area}</p>
                  {p.detail && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{p.detail}</p>}
                  {needsReview ? (
                    <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2 dark:bg-amber-500/10 dark:border-amber-500/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Needs review for current service</p>
                          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">Approved for "{p.recurring_visit_type}". Review and reconfirm for "{visitType}" if it belongs in this service.</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => reconfirm(i)} disabled={reconfirming === i} className="mt-2 gap-1.5">
                        {reconfirming === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Reconfirm for current service
                      </Button>
                    </div>
                  ) : recurring ? (
                    <div className="mt-1.5 rounded-lg bg-primary/5 border border-primary/15 px-2.5 py-1.5">
                      <p className="text-[10px] uppercase text-primary/80">Recurring check{p.recurring_visit_type ? ` · ${p.recurring_visit_type}` : ""}</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{p.recurring_check_text}</p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/60 mt-1">Not included in recurring visits</p>
                  )}
                </div>
              );
            })}
          </div>

          {serviceStatus && serviceStatus.status !== "ok" && (
            <div className="mx-4 mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serviceStatus.message}</span>
            </div>
          )}

          <div className="px-4 py-3 border-t border-border flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit Priorities</Button>
            <Button size="sm" onClick={runUpdate} disabled={updating || !canUpdate} className="gap-1.5">
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Update Recurring Visit Checklist
            </Button>
          </div>

          {status && (
            <div className={`px-4 py-2.5 border-t text-sm ${status.kind === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"}`}>
              {status.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}