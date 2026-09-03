import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ClipboardCheck, Loader2, Check, Trash2, Search, Camera, X, MapPin, Calendar, User, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Image as UIImage } from "@/components/ui/image";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import PageBackButton from "@/components/ui/PageBackButton";
import { badgeTone } from "@/components/resource/ResourceListPage";
import RecurrenceFields from "@/components/recurrence/RecurrenceFields";
import RecurrencePanel from "@/components/recurrence/RecurrencePanel";
import { generateNextOccurrence } from "@/lib/recurrence";

const DEFAULT_CHECKLIST = [
  "Gates", "Doors", "Windows", "Roof", "Pool", "Garden", "Irrigation", "Water leaks",
  "Electrical", "Air conditioning", "Internet", "Security system", "Humidity", "Appliances", "General condition"
];

const ITEM_STATUS = ["Pass", "Needs Attention", "Critical", "Not Checked"];

function blankChecklist() {
  return DEFAULT_CHECKLIST.map((name) => ({ name, status: "Not Checked", notes: "", photo: "" }));
}

export default function Inspections() {
  const [items, setItems] = useState([]);
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const debounceRef = useRef(null);
  const [searchParams] = useSearchParams();
  const openId = searchParams.get("open");
  const autoOpenDone = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const [insps, props] = await Promise.all([
        base44.entities.Inspection.list("-date", 200),
        base44.entities.Property.list("-created_date", 500),
      ]);
      setItems(insps || []);
      const map = {};
      (props || []).forEach((p) => (map[p.id] = p.name));
      setProperties(map);
    } catch (e) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((i) => (properties[i.property_id] || "").toLowerCase().includes(q) || (i.inspector || "").toLowerCase().includes(q));
  }, [items, query, properties]);

  // Phase 3: creating NEW standalone inspections is retired. This page is a
  // read-only historical view; field work happens through Property Visits.
  const openEdit = (it) => {
    setEditing(it);
    setValues({ ...it, checklist: it.checklist?.length ? it.checklist : blankChecklist() });
    setDirty(false); setSaved(false); setOpen(true);
  };

  // Deep-link from Dashboard TODAY: /inspections?open=<id> opens that exact record.
  useEffect(() => {
    if (!openId || autoOpenDone.current || loading || items.length === 0) return;
    const it = items.find((x) => x.id === openId);
    if (it) { autoOpenDone.current = true; openEdit(it); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, loading, items]);
  const setField = (k, v) => { setValues((s) => ({ ...s, [k]: v })); setDirty(true); setSaved(false); };

  const setItem = (idx, patch) => {
    setValues((s) => {
      const cl = [...(s.checklist || [])];
      cl[idx] = { ...cl[idx], ...patch };
      return { ...s, checklist: cl };
    });
    setDirty(true); setSaved(false);
  };

  useEffect(() => {
    if (!editing || !dirty) return;
    setSaving(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await base44.entities.Inspection.update(editing.id, values);
        setItems((arr) => arr.map((i) => (i.id === editing.id ? { ...i, ...values } : i)));
        setSaving(false); setSaved(true); setDirty(false);
        if (editing.status !== "Completed" && values.status === "Completed" && values.recurrence_id) {
          generateNextOccurrence(values.recurrence_id, values.occurrence_date || values.date).then(() => load());
        }
      } catch (e) { setSaving(false); }
    }, 1000);
    return () => clearTimeout(debounceRef.current);
  }, [values]);

  const remove = async () => {
    if (!editing || !confirm("Delete this inspection?")) return;
    await base44.entities.Inspection.delete(editing.id);
    setItems((arr) => arr.filter((i) => i.id !== editing.id));
    setOpen(false);
  };

  const uploadPhoto = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    } finally { setUploading(false); }
  };

  // Finish Inspection: the single, obvious completion action. Enforces that
  // every checklist item has been answered (none left "Not Checked"), then sets
  // the real Inspection status to Completed and stamps completed_date so TODAY
  // can move it into "Completed Today" without a separate dashboard status.
  const finishInspection = async () => {
    if (!editing) return;
    const unchecked = (values.checklist || []).filter((c) => (c.status || "Not Checked") === "Not Checked").length;
    if (unchecked > 0) {
      alert(`${unchecked} checklist item(s) are still "Not Checked". Complete every item before finishing the inspection.`);
      return;
    }
    if (!values.property_id) { alert("Select a property before finishing."); return; }
    const completed = { ...values, status: "Completed", completed_date: new Date().toISOString().slice(0, 10) };
    setSaving(true);
    try {
      await base44.entities.Inspection.update(editing.id, completed);
      setItems((arr) => arr.map((i) => (i.id === editing.id ? { ...i, ...completed } : i)));
      if (completed.recurrence_id) {
        generateNextOccurrence(completed.recurrence_id, completed.occurrence_date || completed.date).then(() => load()).catch(() => {});
      }
      setSaving(false); setSaved(true); setDirty(false);
      setOpen(false);
    } catch (e) { setSaving(false); alert("Could not complete inspection: " + (e?.message || e)); }
  };

  const issuesCount = (values.checklist || []).filter((c) => c.status === "Needs Attention" || c.status === "Critical").length;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback="/" className="mb-3" />
        <PageHeader
          title="Inspections"
          subtitle="Historical inspection records — read only. New field work starts from a Property Visit."
          icon={ClipboardCheck}
        >
          <div className="relative mt-4 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search inspections…" className="pl-9 rounded-full bg-muted/50 border-0 focus-visible:ring-1" />
          </div>
        </PageHeader>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No inspections recorded" description="New field work is done through Property Visits." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((insp) => {
              const issues = (insp.checklist || []).filter((c) => c.status === "Needs Attention" || c.status === "Critical").length;
              return (
                <button key={insp.id} onClick={() => openEdit(insp)} className="text-left rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.99]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-foreground truncate">{properties[insp.property_id] || "Property"}</div>
                    <Badge variant="outline" className={badgeTone(insp.status)}>{insp.status}</Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {insp.date}</div>
                    <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {insp.inspector || "—"}</div>
                  </div>
                  {issues > 0 && <div className="mt-3"><span className="text-xs px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">{issues} item(s) need attention</span></div>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Inspection" : "New Inspection"}</SheetTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {saving && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>}
              {saved && !saving && <><Check className="w-3.5 h-3.5 text-emerald-500" /> Saved</>}
            </div>
          </SheetHeader>

          <div className="flex-1 px-1 py-4 space-y-4 overflow-y-auto">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Property</Label>
              <PropertyPicker value={values.property_id} onChange={(v) => setField("property_id", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs mb-1.5 block">Date</Label><Input type="date" value={values.date || ""} onChange={(e) => setField("date", e.target.value)} /></div>
              <div><Label className="text-xs mb-1.5 block">Time</Label><Input type="time" value={values.time || ""} onChange={(e) => setField("time", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs mb-1.5 block">Inspector</Label><Input value={values.inspector || ""} onChange={(e) => setField("inspector", e.target.value)} placeholder="Name" /></div>
              <div>
                <Label className="text-xs mb-1.5 block">Status</Label>
                <Select value={values.status || "Draft"} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Draft", "Completed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Checklist</Label>
                {issuesCount > 0 && <span className="text-xs text-amber-600">{issuesCount} need attention</span>}
              </div>
              <div className="space-y-2.5">
                {(values.checklist || []).map((c, idx) => (
                  <div key={idx} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {ITEM_STATUS.map((s) => (
                        <button key={s} onClick={() => setItem(idx, { status: s })}
                          className={`text-xs px-2.5 py-1 rounded-full border transition ${c.status === s ? badgeTone(s) + " font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                    {c.status !== "Pass" && c.status !== "Not Checked" && (
                      <>
                        <Textarea className="mt-2 text-sm" rows={2} placeholder="Notes…" value={c.notes || ""} onChange={(e) => setItem(idx, { notes: e.target.value })} />
                        <div className="mt-2 flex items-center gap-2">
                          {c.photo && <UIImage src={c.photo} className="w-16 h-16 rounded-lg" fittingType="fill" />}
                          <label className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer">
                            <Camera className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : c.photo ? "Replace" : "Add photo"}
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setItem(idx, { photo: await uploadPhoto(f) }); }} />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Summary Notes</Label>
              <Textarea rows={3} value={values.summary_notes || ""} onChange={(e) => setField("summary_notes", e.target.value)} />
            </div>

            <RecurrenceFields values={values} setField={setField} />
            {editing?.recurrence_id && <RecurrencePanel entityType="Inspection" record={editing} reload={load} />}
          </div>

          <SheetFooter className="flex-row gap-2 sm:justify-between border-t pt-4">
            {editing ? <Button variant="ghost" className="text-destructive" onClick={remove}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button> : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
              {editing && values.status !== "Completed" && (
                <Button onClick={finishInspection} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Finish Inspection
                </Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function PropertyPicker({ value, onChange }) {
  const [list, setList] = useState([]);
  useEffect(() => { base44.entities.Property.list("-created_date", 500).then(setList).catch(() => {}); }, []);
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
      <SelectContent>{list.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}