import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { exportCsv } from "@/lib/exportCsv";
import {
  Plus, Search, Pencil, Trash2, Loader2, Check, X, ImagePlus, Download, Archive, FileText, Upload, ArrowLeft
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function formatBytes(b) {
  if (!b && b !== 0) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
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
import PageBackButton from "@/components/ui/PageBackButton";
import { useIsMobile } from "@/hooks/use-mobile";
import EmptyState from "@/components/ui/EmptyState";
import DictateButton from "@/components/dictation/DictateButton";
import DictateFormDialog from "@/components/dictation/DictateFormDialog";

const ENTITY_LABEL = { Client: "name", Property: "name", Contractor: "company", MaintenanceIssue: "title" };

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
  Cancelled: "muted",
};

function badgeTone(value) {
  return TONE[STATUS_TONES[value] || "muted"] || TONE.muted;
}

export default function ResourceListPage({
  entityName, title, subtitle, icon: Icon, fields, columns, searchKeys = [],
  addItemLabel = "Add", renderSummary, defaultValues = {}, cardExtra,
  onCreated, onUpdated, extraDrawerContent, archivable = false,
  onOpenItem, autoOpen = false, autoOpenEditId, saveLabel = "Save",
  showBack = true, sections = [],
  onAdd, reloadSignal,
  renderCard, filterFn, dictation, emptyTitle,
}) {
  const { user } = useAuth();
  const { t, tEnum } = useLanguage();
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lookups, setLookups] = useState({});
  const [lookupsRaw, setLookupsRaw] = useState({});
  const debounceRef = useRef(null);
  const inFlightRef = useRef(null);
  // Refs mirror the latest edit state so an unmount/route-leave flush can read the
  // current record + values without relying on a stale render closure.
  const editingRef = useRef(null);
  const valuesRef = useRef({});
  const dirtyRef = useRef(false);
  const destructiveRef = useRef(false);
  const inFlightValuesRef = useRef(null);
  // Lifecycle + StrictMode guards for the route-leave flush.
  const mountedRef = useRef(true);
  const leaveGuardActiveRef = useRef(false);
  const leaveFlushTimerRef = useRef(null);
  editingRef.current = editing;
  valuesRef.current = values;
  dirtyRef.current = dirty;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities[entityName].list("-created_date", 200);
      setItems(data || []);
    } catch (e) { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [entityName]);

  // Optional external reload trigger (used by custom Add forms living outside the engine).
  useEffect(() => { if (reloadSignal) load(); }, [reloadSignal]);

  useEffect(() => {
    const rels = fields.filter((f) => f.type === "entity-select").map((f) => f.entity);
    const uniq = [...new Set(rels)];
    if (!uniq.length) return;
    Promise.all(
      uniq.map(async (e) => {
        const list = await base44.entities[e].list("-created_date", 500);
        const map = {};
        (list || []).forEach((r) => { map[r.id] = r[ENTITY_LABEL[e] || "name"] || r.title || r.company || "—"; });
        return [e, { map, list: list || [] }];
      })
    ).then((pairs) => {
      const obj = {};
      const raw = {};
      pairs.forEach(([k, v]) => { obj[k] = v.map; raw[k] = v.list; });
      setLookups(obj);
      setLookupsRaw(raw);
    }).catch(() => {});
  }, [entityName]);

  const filtered = useMemo(() => {
    const visible = items.filter((it) => !it.archived && (!filterFn || filterFn(it)));
    if (!query.trim()) return visible;
    const q = query.toLowerCase();
    return visible.filter((it) =>
      searchKeys.some((k) => (it[k] || "").toString().toLowerCase().includes(q))
    );
  }, [items, query, filterFn]);

  const openNew = () => { flushPendingEdit(); destructiveRef.current = false; setEditing(null); setValues({ ...defaultValues }); setDirty(false); setSaved(false); setFormError(""); setDrawerOpen(true); };
  const openEdit = (it) => { flushPendingEdit(); destructiveRef.current = false; setEditing(it); setValues({ ...it }); setDirty(false); setSaved(false); setFormError(""); setDrawerOpen(true); };
  const setField = (k, v) => { setValues((s) => ({ ...s, [k]: v })); setDirty(true); setSaved(false); };

  const autoOpenDone = useRef(false);
  useEffect(() => {
    if (autoOpen && !autoOpenDone.current) { autoOpenDone.current = true; openNew(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoEditDone = useRef(false);
  useEffect(() => {
    if (autoOpenEditId && !autoEditDone.current && items.length) {
      const it = items.find((x) => x.id === autoOpenEditId);
      if (it) { autoEditDone.current = true; openEdit(it); }
    }
  }, [items, autoOpenEditId]);

  useEffect(() => {
    if (!editing || !dirty) return;
    setSaving(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await runUpdate(editing, values);
        if (mountedRef.current) { setSaving(false); setSaved(true); setDirty(false); }
      } catch (e) { if (mountedRef.current) setSaving(false); }
    }, 1000);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const saveNew = async () => {
    // Required-field enforcement: fields marked required must have a value
    // (0 counts as filled) before a new record can be created.
    const missing = fields.filter((f) => f.required && values[f.name] !== 0 && !values[f.name]);
    if (missing.length) { setFormError(t("Please fill in: {fields}", { fields: missing.map((f) => f.label || f.name).join(", ") })); return; }
    setFormError("");
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
    if (!confirm(t("Delete this record? This cannot be undone. Consider archiving instead."))) return;
    destructiveRef.current = true;
    clearTimeout(debounceRef.current);
    setDirty(false);
    if (inFlightRef.current) { try { await inFlightRef.current; } catch {} }
    try {
      await base44.entities[entityName].delete(it.id);
      setItems((arr) => arr.filter((x) => x.id !== it.id));
      setDrawerOpen(false);
    } catch (e) {}
  };

  const archive = async (it) => {
    destructiveRef.current = true;
    clearTimeout(debounceRef.current);
    setDirty(false);
    if (inFlightRef.current) { try { await inFlightRef.current; } catch {} }
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
        return <Textarea className="sm:text-base" value={val || ""} onChange={(e) => setField(f.name, e.target.value)} placeholder={f.placeholder && t(f.placeholder)} rows={3} />;
      case "select":
        return (
          <Select value={val || ""} onValueChange={(v) => setField(f.name, v)}>
            <SelectTrigger className="sm:h-12 sm:text-base"><SelectValue placeholder={f.placeholder || t("Select…")} /></SelectTrigger>
            <SelectContent>
              {(f.options || []).map((o) => <SelectItem key={o} value={o}>{tEnum(o, f.enumContext)}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case "entity-select": {
        const opts = f.optionLabel
          ? (lookupsRaw[f.entity] || []).map((r) => [r.id, f.optionLabel(r)])
          : Object.entries(lookups[f.entity] || {});
        return (
          <Select value={val || ""} onValueChange={(v) => setField(f.name, v)}>
            <SelectTrigger className="sm:h-12 sm:text-base"><SelectValue placeholder={f.placeholder || t("Select…")} /></SelectTrigger>
            <SelectContent>
              {opts.map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case "date":
        return <Input className="w-full min-w-0 max-w-full sm:h-12 sm:text-base" type="date" value={val || ""} onChange={(e) => setField(f.name, e.target.value)} />;
      case "time":
        return <Input className="sm:h-12 sm:text-base" type="time" value={val || ""} onChange={(e) => setField(f.name, e.target.value)} />;
      case "number":
        return <Input className="sm:h-12 sm:text-base" type="number" step="0.01" value={val ?? ""} onChange={(e) => setField(f.name, parseFloat(e.target.value) || 0)} />;
      case "boolean":
        return (
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={!!val} onCheckedChange={(v) => setField(f.name, v)} />
            <span className="text-sm text-muted-foreground">{val ? t("Yes") : t("No")}</span>
          </div>
        );
      case "image":
        return (
          <div className="space-y-2">
            {val && <UIImage src={val} className="w-full h-40 rounded-lg" fittingType="fill" />}
            <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer">
              <ImagePlus className="w-4 h-4" />
              <span>{uploading ? t("Uploading…") : val ? t("Replace photo") : t("Upload photo")}</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setField(f.name, await uploadImage(file)); }} />
            </label>
          </div>
        );
      case "file": {
        const isImg = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(val || "");
        const meta = f.metaFields;
        const fileName = meta ? values[meta[0]] : "";
        const fileSize = meta ? values[meta[1]] : "";
        const fileType = meta ? values[meta[2]] : "";
        return (
          <div className="space-y-2">
            {val && isImg && <UIImage src={val} className="w-full h-40 rounded-lg" fittingType="fill" />}
            {val && !isImg && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <FileText className="w-8 h-8 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{fileName || t("File")}</p>
                  <p className="text-xs text-muted-foreground">{[fileType, formatBytes(fileSize)].filter(Boolean).join(" · ")}</p>
                </div>
                <a href={val} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline shrink-0">{t("Open")}</a>
              </div>
            )}
            <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{uploading ? t("Uploading…") : val ? t("Replace file") : t("Upload file")}</span>
              <input type="file" accept={f.accept || "*"} className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await uploadImage(file);
                setField(f.name, url);
                if (meta) {
                  setField(meta[0], file.name);
                  setField(meta[1], file.size);
                  setField(meta[2], file.type || (file.name.split(".").pop() || "").toUpperCase());
                }
              }} />
            </label>
          </div>
        );
      }
      case "images":
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {(val || []).map((url, i) => (
                <div key={i} className="relative group aspect-square">
                  <UIImage src={url} className="w-full h-full rounded-lg" fittingType="fill" />
                  <button type="button" onClick={() => setField(f.name, (val || []).filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-6 h-6 md:w-8 md:h-8 2xl:w-6 2xl:h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 md:opacity-100 2xl:opacity-0 transition">
                    <X className="w-3.5 h-3.5 md:w-4 md:h-4 2xl:w-3.5 2xl:h-3.5" />
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
                  {tEnum(o, f.enumContext)}
                </button>
              );
            })}
          </div>
        );
      case "custom":
        return f.render ? f.render(values, setField) : null;
      default:
        return <Input className="sm:h-12 sm:text-base" value={val || ""} onChange={(e) => setField(f.name, e.target.value)} placeholder={f.placeholder && t(f.placeholder)} />;
    }
  };

  const renderCellValue = (col, item) => {
    if (col.render) return col.render(item, lookups);
    const v = item[col.key];
    const fieldDef = fields.find((f) => f.name === col.key);
    if (fieldDef?.type === "entity-select") {
      if (fieldDef.optionLabel && v) {
        const rec = (lookupsRaw[fieldDef.entity] || []).find((r) => r.id === v);
        return rec ? fieldDef.optionLabel(rec) : "—";
      }
      return fieldDef.entity ? (lookups[fieldDef.entity]?.[v] || "—") : (v || "—");
    }
    if (col.type === "boolean") return v ? t("Yes") : t("No");
    return v || "—";
  };

  // Proper English singular (also fixes the old "Propertie" derivation), then
  // localized for the Add/Edit/New headers. Falls back to English untouched.
  const singular = t(title.replace(/ies$/, "y").replace(/s$/, ""));
  // Form headings prefer a per-page dictionary entry ("Add Clients") so Greek
  // grammar is natural; otherwise fall back to the generic "{verb} {item}" pattern.
  const formHeading = (verb) => {
    const key = `${verb} ${title}`;
    const direct = t(key);
    return direct === key ? t(`${verb} {item}`, { item: singular }) : direct;
  };
  const isMobile = useIsMobile();

  // Optional shared Dictation capability (opt-in per page). Fields the engine
  // may propose values for are listed by name; kinds and allowed values are
  // derived from the form's own field definitions, and the property context
  // comes from the form's selected property — never from speech.
  const [dictateOpen, setDictateOpen] = useState(false);
  const DICTATE_KIND = { text: "text", textarea: "textarea", select: "enum", number: "number", date: "date" };
  const dictateFields = dictation
    ? dictation.fields
        .map((name) => {
          const f = fields.find((x) => x.name === name);
          const kind = f && DICTATE_KIND[f.type];
          if (!kind) return null;
          return { key: f.name, label: f.label || f.name, kind, ...(kind === "enum" ? { options: f.options || [] } : {}) };
        })
        .filter(Boolean)
    : [];
  const dictateContext = dictation
    ? {
        propertyId: values.property_id || "",
        propertyName: lookups.Property?.[values.property_id] || "",
        recordLabel: `${editing ? "Edit" : "New"} ${singular}`,
        recordId: editing?.id || "",
      }
    : null;
  const applyDictation = (patch) => { setValues((s) => ({ ...s, ...patch })); setDirty(true); setSaved(false); };

  // Single shared persistence primitive. `updateUI` controls whether React state
  // (setItems/onUpdated) is touched — true for live edits while mounted, false for
  // the unmount/route-leave flush so we never update state after the component is gone.
  const persistRecord = async (record, vals, { updateUI = true } = {}) => {
    const p = base44.entities[entityName].update(record.id, vals);
    inFlightRef.current = p;
    inFlightValuesRef.current = vals;
    try {
      await p;
      // The DB update always completes; UI callbacks run only while mounted so an
      // in-flight save that resolves after unmount touches no React state.
      if (updateUI && mountedRef.current) {
        setItems((arr) => arr.map((it) => (it.id === record.id ? { ...it, ...vals } : it)));
        if (onUpdated) onUpdated(record, vals);
      }
    } finally {
      if (inFlightRef.current === p) { inFlightRef.current = null; inFlightValuesRef.current = null; }
    }
  };

  const runUpdate = (record, vals) => persistRecord(record, vals, { updateUI: true });

  // Exposed to a custom renderCard so a card can change status (e.g. quick complete)
  // through the same persistence path that fires onUpdated (recurrence generation, etc.).
  const updateStatus = (record, status) => persistRecord(record, { status }, { updateUI: true });

  // Route-leave / unmount autosave guard. The flush is deferred by one tick and gated
  // on leaveGuardActiveRef so React 18 StrictMode's synthetic cleanup→remount cycle
  // cancels it (setup clears the flag + timer), while a real unmount lets it fire.
  useEffect(() => {
    leaveGuardActiveRef.current = false;
    if (leaveFlushTimerRef.current) { clearTimeout(leaveFlushTimerRef.current); leaveFlushTimerRef.current = null; }
    return () => {
      leaveGuardActiveRef.current = true;
      const rec = editingRef.current;
      const vals = valuesRef.current;
      if (!rec || !dirtyRef.current || destructiveRef.current) return;
      clearTimeout(debounceRef.current);
      // If an update is already in flight with these exact values, let it finish.
      const inflight = inFlightRef.current;
      const inflightHasLatest = inflight && inFlightValuesRef.current &&
        JSON.stringify(inFlightValuesRef.current) === JSON.stringify(vals);
      if (inflightHasLatest) return;
      const write = () => {
        if (!leaveGuardActiveRef.current) return; // cancelled by StrictMode remount
        persistRecord(rec, vals, { updateUI: false }).catch((e) => {
          if (typeof console !== "undefined") {
            console.error("[ResourceListPage] route-leave autosave failed", e);
          }
        });
      };
      // If a stale in-flight save is running, chain the latest values after it so the
      // newest values land last; otherwise schedule a deferred immediate write.
      if (inflight) {
        inflight.then(write, write);
      } else {
        leaveFlushTimerRef.current = setTimeout(() => { leaveFlushTimerRef.current = null; write(); }, 0);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flush the CURRENT dirty edit (current editing.id + current values) before the
  // form is left, closed, or switched. No-op when not editing or not dirty.
  const flushPendingEdit = async () => {
    if (!editing || !dirty) return;
    clearTimeout(debounceRef.current);
    try {
      await runUpdate(editing, values);
      if (mountedRef.current) setDirty(false);
    } catch (e) { /* leave dirty; next change retriggers autosave */ }
  };

  const closeForm = () => { flushPendingEdit(); setDrawerOpen(false); };

  const flushSave = async () => {
    setSaving(true);
    try { await flushPendingEdit(); } finally { if (mountedRef.current) setSaving(false); }
    if (mountedRef.current) setDrawerOpen(false);
  };

  const renderFieldRow = (f) => {
    if (f.showIf && !f.showIf(values)) return null;
    return (
      <div key={f.name}>
        {f.label && <Label className="text-xs sm:text-base font-medium text-muted-foreground mb-1.5 sm:mb-2 block">{t(f.label)}{f.required && <span className="text-destructive ml-0.5">*</span>}</Label>}
        {renderField(f)}
      </div>
    );
  };

  const assignedNames = new Set();
  (sections || []).forEach((s) => (s.fields || []).forEach((n) => assignedNames.add(n)));
  const renderFormFields = (
    <>
      {dictation && <DictateButton label={dictation.label || "Dictate"} onClick={() => setDictateOpen(true)} />}
      {(sections || []).map((sec) => (
        <section key={sec.title} className="space-y-4">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-2">{t(sec.title)}</h2>
          {fields.filter((f) => (sec.fields || []).includes(f.name)).map(renderFieldRow)}
        </section>
      ))}
      <div className="space-y-4">
        {fields.filter((f) => !assignedNames.has(f.name)).map(renderFieldRow)}
      </div>
      {extraDrawerContent && editing && extraDrawerContent(editing, { reload: load, setValues })}
    </>
  );

  const savingIndicator = (
    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
      {saving && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("Saving…")}</>}
      {saved && !saving && <><Check className="w-3.5 h-3.5 text-emerald-500" /> {t("Saved")}</>}
    </div>
  );

  const actionButtons = (
    <>
      {formError && <p className="w-full text-xs text-destructive">{formError}</p>}
      {editing ? (
        <div className="flex gap-1">
          {archivable && (
            <Button variant="ghost" className="sm:h-11" onClick={() => archive(editing)}><Archive className="w-4 h-4 mr-1" /> {t("Archive")}</Button>
          )}
          {isAdmin && (
            <Button variant="ghost" className="text-destructive hover:text-destructive sm:h-11" onClick={() => remove(editing)}>
              <Trash2 className="w-4 h-4 mr-1" /> {t("Delete")}
            </Button>
          )}
        </div>
      ) : <div />}
      <div className="flex gap-2">
        <Button variant="outline" className="sm:h-11 sm:px-5" onClick={closeForm}>{t("Cancel")}</Button>
        {editing ? (
          <Button className="sm:h-11 sm:px-5" onClick={flushSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Save Changes")}</Button>
        ) : (
          <Button className="sm:h-11 sm:px-5" onClick={saveNew} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t(saveLabel)}</Button>
        )}
      </div>
    </>
  );

  // Tablet / desktop: open as a true full page (no modal/sheet/backdrop).
  // Tablet (md–xl): large centered workspace with a dimmed backdrop — the form is
  // the primary working surface. Desktop (≥2xl): reverts to the inline full-page
  // form (no backdrop). Phone uses the Sheet rendered below.
  if (!isMobile && drawerOpen) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex justify-center items-start p-4 pb-10 2xl:static 2xl:z-0 2xl:bg-transparent 2xl:overflow-visible 2xl:p-0 2xl:block">
        <div className="w-full min-w-0 max-w-[92%] md:max-w-[880px] xl:max-w-[1020px] my-4 rounded-2xl bg-card shadow-xl border border-border p-6 pb-10 overflow-x-hidden 2xl:max-w-5xl 2xl:mx-auto 2xl:my-0 2xl:shadow-none 2xl:bg-transparent 2xl:border-0 2xl:rounded-none 2xl:pb-32">
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg px-2.5 py-1.5 transition-colors min-h-[36px] touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" /> {t("Back")}
            </button>
            <button
              type="button"
              onClick={closeForm}
              aria-label={t("Close")}
              className="h-9 w-9 md:h-11 md:w-11 2xl:hidden rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            {Icon && <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-primary" /></div>}
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">{editing ? formHeading("Edit") : formHeading("Add")}</h1>
          </div>

          <div className="mt-6 space-y-6">{renderFormFields}</div>

          {dictation && (
            <DictateFormDialog
              open={dictateOpen}
              onOpenChange={setDictateOpen}
              context={dictateContext}
              fields={dictateFields}
              values={values}
              title={dictation.label || "Dictate"}
              onApply={applyDictation}
            />
          )}

          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-6">
            <div className="mr-auto">{savingIndicator}</div>
            {actionButtons}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
      {showBack && <PageBackButton className="mb-3" />}

      <PageHeader
        title={t(title)}
        subtitle={t(subtitle)}
        icon={Icon}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => exportCsv(filtered, columns, `${title.toLowerCase()}.csv`)} variant="outline" size="sm" className="rounded-full gap-1.5 h-9 px-3" title={t("Export CSV")}>
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">{t("Export")}</span>
            </Button>
            <Button onClick={onAdd || openNew} size="sm" className="rounded-full gap-1.5 h-9 px-4">
              <Plus className="w-4 h-4" /> {t(addItemLabel)}
            </Button>
          </div>
        }
      >
        <div className="relative mt-4 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search {list}…", { list: t(title).toLowerCase() })} className="pl-9 rounded-full bg-muted/50 border-0 focus-visible:ring-1" />
        </div>
      </PageHeader>

      {renderSummary && renderSummary(items)}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Icon} title={emptyTitle ? t(emptyTitle) : t("No {list} yet", { list: t(title).toLowerCase() })} description={t(subtitle)} action={<Button onClick={onAdd || openNew} className="rounded-full gap-1.5"><Plus className="w-4 h-4" /> {t(addItemLabel)}</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <React.Fragment key={item.id}>
              {renderCard
                ? renderCard(item, lookups, {
                    open: onOpenItem ? () => onOpenItem(item) : () => openEdit(item),
                    updateStatus,
                  })
                : (
                  <button
                    onClick={onOpenItem ? () => onOpenItem(item) : () => openEdit(item)}
                    className="text-left rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.99] group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-foreground truncate flex-1">
                        {columns.find((c) => c.primary) ? renderCellValue(columns.find((c) => c.primary), item) : item.name || t("Untitled")}
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
                        const fieldDef = fields.find((f) => f.name === c.key);
                        return <span key={c.key} className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(v)}`}>{tEnum(v, fieldDef?.enumContext)}</span>;
                      })}
                      {cardExtra && cardExtra(item, lookups)}
                    </div>
                  </button>
                )}
            </React.Fragment>
          ))}
        </div>
      )}

      {isMobile && (
        <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
          <SheetContent className="w-full h-full flex flex-col overflow-hidden">
            <SheetHeader>
              <SheetTitle>{editing ? formHeading("Edit") : formHeading("New")}</SheetTitle>
              <SheetDescription className="sr-only">Form</SheetDescription>
              {savingIndicator}
            </SheetHeader>

            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-1 py-4 space-y-4">
              {renderFormFields}
            </div>

            <SheetFooter className="flex-row flex-wrap gap-2 justify-between border-t pt-4">
              {actionButtons}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {dictation && (
        <DictateFormDialog
          open={dictateOpen}
          onOpenChange={setDictateOpen}
          context={dictateContext}
          fields={dictateFields}
          values={values}
          title={dictation.label || "Dictate"}
          onApply={applyDictation}
        />
      )}
    </div>
  );
}

export { badgeTone, TONE, STATUS_TONES };