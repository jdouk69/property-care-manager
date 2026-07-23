import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, ChevronLeft, Plus, Check, Loader2, Gauge, CheckCircle2, Download, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import VisitChecklistItem from "@/components/visits/VisitChecklistItem";
import { generateVisitReportPdf } from "@/lib/visitReport";
import { saveDraft, loadDraft, clearDraft } from "@/lib/visitDraft";

const VISIT_TYPES = [
  "Monthly Property Watch", "Owner Arrival Preparation", "Guest Arrival Preparation",
  "Departure Inspection", "Seasonal Opening", "Seasonal Closing", "Owner Representative Construction Visit",
];

export default function VisitWizard({ onDone }) {
  const [step, setStep] = useState("property");
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState(null);
  const [visitType, setVisitType] = useState(VISIT_TYPES[0]);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [gps, setGps] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [meters, setMeters] = useState([{ label: "Electricity meter", value: "", photo: "" }, { label: "Water meter", value: "", photo: "" }]);
  const [summary, setSummary] = useState("");
  const [followUpText, setFollowUpText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [flagged, setFlagged] = useState({});
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(null);
  const [issueIds, setIssueIds] = useState([]);
  const [taskIds, setTaskIds] = useState([]);
  const [createdIssues, setCreatedIssues] = useState([]);
  const [createdTasks, setCreatedTasks] = useState([]);
  const [templateSource, setTemplateSource] = useState("");
  const [resumable, setResumable] = useState(null);

  useEffect(() => {
    base44.entities.Property.list("-created_date", 500).then((p) => setProperties((p || []).filter((x) => !x.archived))).catch(() => {});
    const d = loadDraft();
    if (d && d.propertyId && d.checklist) setResumable(d);
  }, []);

  // persist draft while a visit is active
  useEffect(() => {
    if (step === "active" && propertyId) {
      saveDraft({ propertyId, visitType, startTime, gps, checklist, meters, summary, issueIds, taskIds, createdIssues, createdTasks });
    }
  }, [step, propertyId, visitType, startTime, gps, checklist, meters, summary, issueIds, taskIds, createdIssues, createdTasks]);

  const propertyName = properties.find((p) => p.id === propertyId)?.name || "";

  const resume = () => {
    if (!resumable) return;
    setPropertyId(resumable.propertyId);
    setVisitType(resumable.visitType || VISIT_TYPES[0]);
    setStartTime(resumable.startTime);
    setGps(resumable.gps || "");
    setChecklist(resumable.checklist || []);
    setMeters(resumable.meters?.length ? resumable.meters : [{ label: "Electricity meter", value: "", photo: "" }, { label: "Water meter", value: "", photo: "" }]);
    setSummary(resumable.summary || "");
    setIssueIds(resumable.issueIds || []);
    setTaskIds(resumable.taskIds || []);
    setCreatedIssues(resumable.createdIssues || []);
    setCreatedTasks(resumable.createdTasks || []);
    setFlagged({});
    (resumable.checklist || []).forEach((it, i) => { if (it.status === "Important" || it.status === "Emergency") setFlagged((f) => ({ ...f, [i]: (resumable.issueIds || []).length > 0 })); });
    setTemplateSource("Resumed");
    setResumable(null);
    setStep("active");
  };

  const discardDraft = () => { clearDraft(); setResumable(null); };

  const startVisit = async () => {
    const now = new Date();
    setStartTime(now.toISOString());
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`),
        () => {},
        { timeout: 5000 }
      );
    }
    try {
      const all = await base44.entities.ChecklistTemplate.list("-created_date", 500);
      const live = (all || []).filter((t) => !t.archived);
      const propSpecific = live.find((t) => t.visit_type === visitType && t.property_id === propertyId);
      const master = live.find((t) => t.visit_type === visitType && (!t.property_id || t.is_master));
      const tmpl = propSpecific || master;
      const items = (tmpl?.items || []).map((name) => ({ name, status: "Not Checked", notes: "", photos: [] }));
      setChecklist(items);
      setTemplateSource(propSpecific ? "Property-Specific" : master ? "Master" : "None");
    } catch (e) {
      setChecklist([]);
      setTemplateSource("None");
    }
    setStep("active");
  };

  const updateItem = (idx, updated) => setChecklist((arr) => arr.map((it, i) => (i === idx ? updated : it)));

  const uploadPhotos = async (idx, files) => {
    setUploading(true);
    const urls = [];
    for (const f of files) {
      try { const { file_url } = await base44.integrations.Core.UploadFile({ file: f }); urls.push(file_url); } catch (e) {}
    }
    setUploading(false);
    setChecklist((arr) => arr.map((it, i) => (i === idx ? { ...it, photos: [...(it.photos || []), ...urls] } : it)));
  };
  const removePhoto = (idx, photoIdx) => setChecklist((arr) => arr.map((it, i) => (i === idx ? { ...it, photos: it.photos.filter((_, p) => p !== photoIdx) } : it)));

  const flagIssue = async (idx) => {
    const it = checklist[idx];
    const priority = it.status === "Emergency" ? "Emergency" : "High";
    try {
      const created = await base44.entities.MaintenanceIssue.create({
        title: it.name, property_id: propertyId, category: "Other", priority, status: "Reported",
        description: it.notes || "", reported_by: "Jim", before_photos: it.photos || [],
        owner_approval_status: "Pending", payment_status: "Unpaid",
      });
      setIssueIds((arr) => [...arr, created.id]);
      setCreatedIssues((arr) => [...arr, { title: it.name, priority }]);
      setFlagged((f) => ({ ...f, [idx]: true }));
    } catch (e) { alert("Could not create issue: " + (e?.message || e)); }
  };

  const addFollowUpTask = async () => {
    if (!followUpText.trim()) return;
    try {
      const t = await base44.entities.Task.create({
        title: followUpText.trim(), type: "Maintenance follow-up", property_id: propertyId,
        assigned_to: "Jim", priority: "Medium", status: "Pending",
        date: new Date().toISOString().slice(0, 10), notes: `Follow-up from ${visitType} visit — ${propertyName}`,
      });
      setTaskIds((arr) => [...arr, t.id]);
      setCreatedTasks((arr) => [...arr, { title: t.title }]);
      setFollowUpText("");
    } catch (e) { alert("Could not create task: " + (e?.message || e)); }
  };

  const generateReport = async (visitObj) => {
    setSaving(true);
    try {
      const bs = await base44.entities.BusinessSettings.list("-created_date", 1);
      const business = (bs && bs[0]) || {};
      const property = properties.find((p) => p.id === propertyId) || {};
      let client = {};
      if (property.owner_id) { try { client = await base44.entities.Client.get(property.owner_id); } catch (e) {} }
      await generateVisitReportPdf(visitObj, { business, property, client, issues: createdIssues, tasks: createdTasks });
    } catch (e) { alert("Could not generate report: " + (e?.message || e)); }
    setSaving(false);
  };

  const completeVisit = async () => {
    setSaving(true);
    const end = new Date().toISOString();
    setEndTime(end);
    try {
      const visit = await base44.entities.PropertyVisit.create({
        property_id: propertyId, visit_type: visitType, start_time: startTime, end_time: end,
        status: "Completed", gps_location: gps, checklist,
        meter_readings: meters.filter((m) => m.label || m.value),
        summary, follow_up_task_ids: taskIds, maintenance_issue_ids: issueIds,
        owner_report: "", report_sent: false,
      });
      setCompleted(visit);
      clearDraft();
      setStep("done");
    } catch (e) { alert("Could not save visit: " + (e?.message || e)); }
    setSaving(false);
  };

  const backFromActive = () => {
    if (!confirm("Leave the active visit? Your progress is saved and you can resume it from the visits list.")) return;
    setStep("type");
  };

  // ---- STEP: select property ----
  if (step === "property") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={onDone}><ChevronLeft className="w-5 h-5" /></Button>
          <h2 className="font-semibold text-lg">Start a Property Visit</h2>
        </div>

        {resumable && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-500">Unfinished visit in progress</p>
                <p className="text-xs text-muted-foreground truncate">{properties.find((p) => p.id === resumable.propertyId)?.name || "Property"} · {resumable.visitType}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={resume} className="rounded-full">Resume</Button>
                <Button size="sm" variant="outline" onClick={discardDraft} className="rounded-full">Discard</Button>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-4 px-1">Select the property you're visiting.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {properties.map((p) => (
            <button key={p.id} onClick={() => { setPropertyId(p.id); setStep("type"); }}
              className="text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></span>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.address || p.status}</p>
              </div>
            </button>
          ))}
          {properties.length === 0 && <p className="text-sm text-muted-foreground">No properties yet.</p>}
        </div>
      </div>
    );
  }

  // ---- STEP: select visit type ----
  if (step === "type") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("property")}><ChevronLeft className="w-5 h-5" /></Button>
          <div>
            <h2 className="font-semibold text-lg">{propertyName}</h2>
            <p className="text-xs text-muted-foreground">Choose visit type</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VISIT_TYPES.map((vt) => (
            <button key={vt} onClick={() => setVisitType(vt)}
              className={`text-left rounded-2xl border p-4 transition ${visitType === vt ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
              <p className="font-medium text-sm text-foreground">{vt}</p>
            </button>
          ))}
        </div>
        <Button onClick={startVisit} className="w-full mt-5 h-12 rounded-2xl text-base">
          <Navigation className="w-5 h-5 mr-2" /> Start Visit & Record Arrival
        </Button>
      </div>
    );
  }

  // ---- STEP: active visit ----
  if (step === "active") {
    const flaggedCount = checklist.filter((i) => i.status === "Important" || i.status === "Emergency").length;
    return (
      <div className="pb-36">
        <div className="sticky top-14 lg:top-0 z-10 bg-background/90 backdrop-blur border-b border-border -mx-4 px-4 py-3 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{propertyName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap"><Clock className="w-3 h-3" /> Started {(startTime || "").slice(11, 16)} · {visitType}</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border shrink-0">{templateSource} template</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">{flaggedCount} flagged</span>
          </div>
        </div>

        <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">Checklist</p>
        <div className="space-y-2 mb-6">
          {checklist.map((it, i) => (
            <VisitChecklistItem key={i} item={it} index={i} onChange={(u) => updateItem(i, u)}
              onUploadPhoto={uploadPhotos} onRemovePhoto={removePhoto} uploading={uploading}
              onFlagIssue={flagIssue} flagged={!!flagged[i]} />
          ))}
          {checklist.length === 0 && <p className="text-sm text-muted-foreground">No checklist items for this visit type. Add items in Checklist Templates.</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3"><Gauge className="w-4 h-4 text-muted-foreground" /><h3 className="font-medium text-sm">Meter Readings</h3></div>
          <div className="space-y-2">
            {meters.map((m, i) => (
              <div key={i} className="flex gap-2">
                <Input value={m.label} onChange={(e) => setMeters((arr) => arr.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder="Label" className="flex-1" />
                <Input value={m.value} onChange={(e) => setMeters((arr) => arr.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} placeholder="Reading" className="flex-1" />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setMeters((arr) => [...arr, { label: "", value: "", photo: "" }])} className="rounded-full"><Plus className="w-4 h-4" /> Add reading</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3"><Check className="w-4 h-4 text-muted-foreground" /><h3 className="font-medium text-sm">Follow-up Task</h3></div>
          <div className="flex gap-2">
            <Input value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} placeholder="e.g. Order replacement pool filter" />
            <Button variant="outline" onClick={addFollowUpTask} disabled={!followUpText.trim()}>Add</Button>
          </div>
          {taskIds.length > 0 && <p className="text-xs text-emerald-600 mt-2">{taskIds.length} follow-up task(s) created.</p>}
        </div>

        <div className="mb-4">
          <Label className="text-xs mb-1.5 block">Visit Summary & Recommendations</Label>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Overall findings and recommended next steps for the owner…" />
        </div>

        <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 lg:left-64">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Button variant="outline" onClick={backFromActive} className="rounded-2xl">Back</Button>
            <Button onClick={completeVisit} disabled={saving} className="flex-1 h-12 rounded-2xl text-base">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Complete Visit</>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- STEP: done ----
  if (step === "done" && completed) {
    return (
      <div className="max-w-xl mx-auto text-center py-10">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold mb-1">Visit Complete</h2>
        <p className="text-sm text-muted-foreground mb-6">{propertyName} · {visitType}</p>
        <div className="rounded-2xl border border-border bg-card p-4 text-left text-sm space-y-1 mb-6">
          <p>Duration: {(startTime || "").slice(11, 16)} – {(endTime || "").slice(11, 16)}</p>
          <p>Checklist items: {checklist.length}</p>
          <p>Issues created: {issueIds.length}</p>
          <p>Follow-up tasks: {taskIds.length}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => generateReport(completed)} disabled={saving} className="rounded-2xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-2" /> Download Owner Report (PDF)</>}
          </Button>
          <Button variant="outline" onClick={onDone} className="rounded-2xl">Back to Visits</Button>
        </div>
      </div>
    );
  }

  return null;
}