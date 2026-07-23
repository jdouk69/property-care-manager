import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { exportCsv } from "@/lib/exportCsv";
import {
  Plus, Search, Pencil, Trash2, Loader2, Check, X, ImagePlus, Download, Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Image as UIImage } from "@/components/ui/image";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

const ENTITY_LABEL = { Client: "name", Property: "name", Contractor: "company" };

const TONE = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  danger: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  muted: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
};

const STATUS_TONES = {
  Pending: "muted", "In Progress": "info", Completed: "success", Cancelled: "muted",
  Open: "warning", Scheduled: "info",
  Low: "muted", Medium: "info", High: "warning", Urgent: "danger",
  Active: "success", Inactive: "muted", Seasonal: "info", Maintenance: "warning",
  Draft: "muted",
  reimbursed: "success", pending: "warning",
  Pass: "success", "Needs Attention": "warning", Critical: "danger", "Not Checked": "muted",
  Inspection: "info", "Contractor Meeting": "primary", Delivery: "success",
  Shopping: "warning", "Owner Request": "danger", Maintenance: "warning", Custom: "muted",
  Electrician: "info", Plumber: "info", Pool: "primary", Gardener: "success",
  Cleaner: "muted", Painter: "warning", Builder: "primary", Locksmith: "info", HVAC: "info", Other: "muted",
  English: "muted", Greek: "primary",
  Routine: "muted", Emergency: "danger",
  Reported: "info", "Awaiting Owner Approval": "warning", Approved: "success", "Contractor Contacted": "info", "Waiting for Parts": "warning", "Waiting for Payment": "warning",
  Sent: "info", "Partially Paid": "warning", Paid: "success", Overdue: "danger",
  "Vacant": "muted", "Owner Occupied": "info", "Guest Occupied": "success", "Rental Occupied": "success", "Preparing for Arrival": "warning", "Preparing for Departure": "warning", "Under Maintenance": "warning",
  "Recorded": "muted", "Awaiting Receipt": "warning", "Awaiting Reimbursement": "warning", "Partially Reimbursed": "info", "Reimbursed": "success", "Disputed": "danger",
  Pending: "muted",
};

function badgeTone(value) {
  return TONE[STATUS_TONES[value] || "muted"] || TONE.muted;
}

export default function ResourceListPage({
  entityName, title, subtitle, icon: Icon, fields, columns, searchKeys = [],
  addItemLabel = "Add", renderSummary, defaultValues = {}, cardExtra,
  onCreated, onUpdated, extraDrawerContent, archivable = false,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lookups, setLookups] = useState({});
  const debounceRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities[entityName].list("-created_date", 200);
      setItems(data || []);
    } catch (e) { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [entityName]);

  useEffect(() => {
    const rels = fields.filter((f) => f.type === "entity-select").map((f) => f.entity);
    const uniq = [...new Set(rels)];
    if (!uniq.length) return;
    Promise.all(
      uniq.map(async (e) => {
        const list = await base44.entities[e].list("-created_date", 500);
        const map = {};
        (list || []).forEach((r) => { map[r.id] = r[ENTITY_LABEL[e] || "name"] || r.title || r.company || "—"; });
        return [e, map];
      })
    ).then((pairs) => {
      const obj = {};
      pairs.forEach(([k, v]) => (obj[k] = v));
      setLookups(obj);
    }).catch(() => {});
  }, [entityName]);

  const filtered = useMemo(() => {
    const visible = items.filter((it) => !it.archived);
    if (!query.trim()) return visible;
    const q = query.toLowerCase();
    return visible.filter((it) =>
      searchKeys.some((k) => (it[k] || "").toString().toLowerCase().includes(q))
    );
  }, [items, query]);

  const openNew = () => { setEditing(null); setValues({ ...defaultValues }); setDirty(false); setSaved(false); setDrawerOpen(true); };
  const openEdit = (it) => { setEditing(it); setValues({ ...it }); setDirty(false); setSaved(false); setDrawerOpen(true); };
  const setField = (k, v) => { setValues((s) => ({ ...s, [k]: v })); setDirty(true); setSaved(false); };

  useEffect(() => {
    if (!editing || !dirty) return;
    setSaving(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await base44.entities[entityName].update(editing.id, values);
        setItems((arr) => arr.map((it) => (it.id === editing.id ? { ...it, ...values } : it)));
        setSaving(false); setSaved(true); setDirty(false);
        if (onUpdated) onUpdated(editing, values);
      } catch (e) { setSaving(false); }
    }, 1000);
    return () => clearTimeout(debounceRef.current);
  }, [values]);

  const saveNew = async () => {
    setSaving(true);
    try {
      const created = await base44.entities[entityName].create(values);
      let next = created;
      if (onCreated) {
        const patch = await onCreated(values, created);
        if (patch) next = { ...created, ...patch };
      }
      setItems((arr) => [next, ...arr]);
      setEditing(next);
      setSaving(false); setSaved(true); setDirty(false);
    } catch (e) { setSaving(false); }
  };

  const remove = async (it) => {
    if (!confirm("Delete this record? This cannot be undone. Consider archiving instead.")) return;
    try {
      await base44.entities[entityName].delete(it.id);
      setItems((arr) => arr.filter((x) => x.id !== it.id));
      setDrawerOpen(false);
    } catch (e) {}
  };

  const archive = async (it) => {
    try {
      await base44.entities[entityName].update(it.id, { archived: true });
      setItems((arr) => arr.filter((x) => x.id !== it.id));
      setDrawerOpen(false);
    } catch (e) {}
  };

  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    } finally { setUploading(false); }
  };

  const renderField = (f) => {
    const val = values[f.name];
    switch (f.type) {
      case "textarea":
        return <Textarea value={val || ""} onChange={(e) => setField(f.name, e.target.value)} placeholder={f.placeholder} rows={3} />;
      case "select":
        return (
          <Select value={val || ""} onValueChange={(v) => setField(f.name, v)}>
            <SelectTrigger><SelectValue placeholder={f.placeholder || "Select…"} /></SelectTrigger>
            <SelectContent>
              {(f.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case "entity-select":
        return (
          <Select value={val || ""} onValueChange={(v) => setField(f.name, v)}>
            <SelectTrigger><SelectValue placeholder={f.placeholder || "Select…"} /></SelectTrigger>
            <SelectContent>
              {Object.entries(lookups[f.entity] || {}).map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "date":
        return <Input type="date" value={val || ""} onChange={(e) => setField(f.name, e.target.value)} />;
      case "time":
        return <Input type="time" value={val || ""} onChange={(e) => setField(f.name, e.target.value)} />;
      case "number":
        return <Input type="number" step="0.01" value={val ?? ""} onChange={(e) => setField(f.name, parseFloat(e.target.value) || 0)} />;
      case "boolean":
        return (
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={!!val} onCheckedChange={(v) => setField(f.name, v)} />
            <span className="text-sm text-muted-foreground">{val ? "Yes" : "No"}</span>
          </div>
        );
      case "image":
        return (
          <div className="space-y-2">
            {val && <UIImage src={val} className="w-full h-40 rounded-lg" fittingType="fill" />}
            <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer">
              <ImagePlus className="w-4 h-4" />
              <span>{uploading ? "Uploading…" : val ? "Replace photo" : "Upload photo"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setField(f.name, await uploadImage(file)); }} />
            </label>
          </div>
        );
      case "images":
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {(val || []).map((url, i) => (
                <div key={i} className="relative group aspect-square">
                  <UIImage src={url} className="w-full h-full rounded-lg" fittingType="fill" />
                  <button type="button" onClick={() => setField(f.name, (val || []).filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Plus className="w-5 h-5 text-muted-foreground" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  const urls = [];
                  for (const file of files) urls.push(await uploadImage(file));
                  setField(f.name, [...(val || []), ...urls]);
                }} />
              </label>
            </div>
          </div>
        );
      case "multiselect":
        return (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(f.options || []).map((o) => {
              const arr = val || [];
              const on = arr.includes(o);
              return (
                <button key={o} type="button" onClick={() => setField(f.name, on ? arr.filter((x) => x !== o) : [...arr, o])}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${on ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  {o}
                </button>
              );
            })}
          </div>
        );
      case "custom":
        return f.render ? f.render(values, setField) : null;
      default:
        return <Input value={val || ""} onChange={(e) => setField(f.name, e.target.value)} placeholder={f.placeholder} />;
    }
  };

  const renderCellValue = (col, item) => {
    if (col.render) return col.render(item, lookups);
    const v = item[col.key];
    const fieldDef = fields.find((f) => f.name === col.key);
    if (fieldDef?.type === "entity-select") {
      return fieldDef.entity ? (lookups[fieldDef.entity]?.[v] || "—") : (v || "—");
    }
    if (col.type === "boolean") return v ? "Yes" : "No";
    return v || "—";
  };

  const singular = title.replace(/s$/, "");

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        icon={Icon}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => exportCsv(filtered, columns, `${title.toLowerCase()}.csv`)} variant="outline" size="sm" className="rounded-full gap-1.5 h-9 px-3" title="Export CSV">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
            </Button>
            <Button onClick={openNew} size="sm" className="rounded-full gap-1.5 h-9 px-4">
              <Plus className="w-4 h-4" /> {addItemLabel}
            </Button>
          </div>
        }
      >
        <div className="relative mt-4 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="pl-9 rounded-full bg-muted/50 border-0 focus-visible:ring-1" />
        </div>
      </PageHeader>

      {renderSummary && renderSummary(items)}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Icon} title={`No ${title.toLowerCase()} yet`} description={subtitle} action={<Button onClick={openNew} className="rounded-full gap-1.5"><Plus className="w-4 h-4" /> {addItemLabel}</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => openEdit(item)}
              className="text-left rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.99] group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-foreground truncate flex-1">
                  {columns.find((c) => c.primary) ? renderCellValue(columns.find((c) => c.primary), item) : item.name || "Untitled"}
                </div>
                <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0" />
              </div>
              <div className="mt-2 space-y-1">
                {columns.filter((c) => !c.primary && !c.badge).slice(0, 3).map((c) => (
                  <div key={c.key} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {c.icon && <c.icon className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{renderCellValue(c, item)}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {columns.filter((c) => c.badge).map((c) => {
                  const v = renderCellValue(c, item);
                  if (!v || v === "—") return null;
                  return <span key={c.key} className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(v)}`}>{v}</span>;
                })}
                {cardExtra && cardExtra(item, lookups)}
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>{editing ? `Edit ${singular}` : `New ${singular}`}</SheetTitle>
            <SheetDescription className="sr-only">Form</SheetDescription>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {saving && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>}
              {saved && !saving && <><Check className="w-3.5 h-3.5 text-emerald-500" /> Saved</>}
            </div>
          </SheetHeader>

          <div className="flex-1 px-1 py-4 space-y-4">
            {fields.map((f) => {
              if (f.showIf && !f.showIf(values)) return null;
              return (
                <div key={f.name}>
                  {f.label && <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</Label>}
                  {renderField(f)}
                </div>
              );
            })}
            {extraDrawerContent && editing && extraDrawerContent(editing, { reload: load, setValues })}
          </div>

          <SheetFooter className="flex-row gap-2 sm:justify-between border-t pt-4">
            {editing ? (
              <div className="flex gap-1">
                {archivable && (
                  <Button variant="ghost" onClick={() => archive(editing)}><Archive className="w-4 h-4 mr-1" /> Archive</Button>
                )}
                <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(editing)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>Close</Button>
              {!editing && <Button onClick={saveNew} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export { badgeTone, TONE, STATUS_TONES };