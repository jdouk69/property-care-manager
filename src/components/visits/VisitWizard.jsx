import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, ChevronLeft, Plus, Check, Loader2, Gauge, CheckCircle2, Download, Navigation, Receipt, MessageSquare, Send, ClipboardCheck, Wrench, Wallet, ListChecks, AlertTriangle, Info, Package, User, Building2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import VisitChecklistItem from "@/components/visits/VisitChecklistItem";
import { generateVisitReportPdf } from "@/lib/visitReport";
import { saveDraft, loadDraft, clearDraft } from "@/lib/visitDraft";
import { SEED } from "@/lib/checklistSeed";
import CancelVisitMenu from "@/components/visits/CancelVisitMenu";
import { Link, useNavigate } from "react-router-dom";

const VISIT_TYPES = [
  "Monthly Property Watch", "Owner Arrival Preparation", "Guest Arrival Preparation",
  "Departure Inspection", "Seasonal Opening", "Seasonal Closing", "Owner Representative Construction Visit",
];

export default function VisitWizard({ onDone, autoResume, ctxProperty, ctxAgreement, ctxClient, resumeVisitId }) {
  const navigate = useNavigate();
  const initialStep = ctxAgreement ? "first-visit" : resumeVisitId ? "active" : "property";
  const [step, setStep] = useState(initialStep);
  const [agreement, setAgreement] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [clientObj, setClientObj] = useState(null);
  const [agreementId, setAgreementId] = useState(ctxAgreement || "");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [draftConflict, setDraftConflict] = useState(false);
  const [resumeVisit, setResumeVisit] = useState(null);
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
  const [contractors, setContractors] = useState([]);
  const [expensesCreated, setExpensesCreated] = useState([]);
  const [commSent, setCommSent] = useState([]);
  // inline expense form
  const [expVendor, setExpVendor] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPaidBy, setExpPaidBy] = useState("");
  const [expIssueId, setExpIssueId] = useState("");
  const [expContractorId, setExpContractorId] = useState("");
  const [expReceipt, setExpReceipt] = useState("");
  // inline owner update form
  const [commSubject, setCommSubject] = useState("");
  const [commMessage, setCommMessage] = useState("");
  const [answered, setAnswered] = useState({});
  const [skipped, setSkipped] = useState({});
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [checklistLoadError, setChecklistLoadError] = useState("");

  useEffect(() => {
    base44.entities.Property.list("-created_date", 500).then((p) => setProperties((p || []).filter((x) => !x.archived))).catch(() => {});
    base44.entities.Contractor.list("-created_date", 500).then((c) => setContractors((c || []).filter((x) => !x.archived))).catch(() => {});
    const d = loadDraft();
    if (d && d.propertyId && d.checklist) setResumable(d);

    // Guided "first visit" flow: load agreement + package + client context.
    if (ctxAgreement) {
      (async () => {
        try {
          const a = await base44.entities.PropertyServiceAgreement.get(ctxAgreement);
          setAgreement(a);
          setAgreementId(a.id);
          if (ctxProperty) setPropertyId(ctxProperty);
          else if (a.property_id) setPropertyId(a.property_id);
          if (a.service_package_id) {
            try {
              const p = await base44.entities.ServicePackage.get(a.service_package_id);
              setPkg(p);
              if (p && p.recurring === "Recurring") setVisitType("Monthly Property Watch");
            } catch (e) {}
          }
          if (ctxClient) { try { setClientObj(await base44.entities.Client.get(ctxClient)); } catch (e) {} }
        } catch (e) {}
      })();
    } else if (resumeVisitId) {
      // Resume / start an existing (scheduled) visit record.
      (async () => {
        try {
          const v = await base44.entities.PropertyVisit.get(resumeVisitId);
          setResumeVisit(v);
          setPropertyId(v.property_id);
          setVisitType(v.visit_type || VISIT_TYPES[0]);
          setStartTime(v.start_time || null);
          setAgreementId(v.property_service_agreement_id || "");
          if (v.property_service_agreement_id) {
            try {
              const a = await base44.entities.PropertyServiceAgreement.get(v.property_service_agreement_id);
              setAgreement(a);
              if (a.service_package_id) { try { setPkg(await base44.entities.ServicePackage.get(a.service_package_id)); } catch (e) {} }
            } catch (e) {}
          }
          if (v.checklist && v.checklist.length > 0) {
            setChecklist(v.checklist);
            setTemplateSource("Resumed");
          } else {
            try {
              const { items, source } = await loadChecklistItems(v.property_id, v.visit_type || VISIT_TYPES[0]);
              setChecklist(items);
              setTemplateSource(source);
            } catch (e) { setChecklist([]); setTemplateSource("None"); }
          }
          setStep("active");
        } catch (e) { setStep("property"); }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoResume && resumable) resume();
  }, [autoResume, resumable]);

  // persist draft while a visit is active
  useEffect(() => {
    if (step === "active" && propertyId && !resumeVisitId) {
      saveDraft({ propertyId, visitType, startTime, gps, checklist, meters, summary, issueIds, taskIds, createdIssues, createdTasks, expensesCreated, commSent, answered, skipped });
    }
  }, [step, propertyId, visitType, startTime, gps, checklist, meters, summary, issueIds, taskIds, createdIssues, createdTasks, expensesCreated, commSent, answered, skipped]);

  const propertyName = properties.find((p) => p.id === propertyId)?.name || "";

  const resume = async () => {
    if (!resumable) return;
    const pid = resumable.propertyId;
    const vtype = resumable.visitType || VISIT_TYPES[0];
    setPropertyId(pid);
    setVisitType(vtype);
    setStartTime(resumable.startTime);
    setGps(resumable.gps || "");
    setMeters(resumable.meters?.length ? resumable.meters : [{ label: "Electricity meter", value: "", photo: "" }, { label: "Water meter", value: "", photo: "" }]);
    setSummary(resumable.summary || "");
    setIssueIds(resumable.issueIds || []);
    setTaskIds(resumable.taskIds || []);
    setCreatedIssues(resumable.createdIssues || []);
    setCreatedTasks(resumable.createdTasks || []);
    setExpensesCreated(resumable.expensesCreated || []);
    setCommSent(resumable.commSent || []);
    setAnswered(resumable.answered || {});
    setSkipped(resumable.skipped || {});
    setFlagged({});
    (resumable.checklist || []).forEach((it, i) => { if (it.status === "Important" || it.status === "Emergency") setFlagged((f) => ({ ...f, [i]: (resumable.issueIds || []).length > 0 })); });
    setChecklistLoadError("");
    if (resumable.checklist && resumable.checklist.length > 0) {
      setChecklist(resumable.checklist);
      setTemplateSource("Resumed");
    } else {
      try {
        const { items, source, found } = await loadChecklistItems(pid, vtype);
        if (!found || items.length === 0) {
          setChecklist([]);
          setTemplateSource("None");
          setChecklistLoadError("Could not load a checklist template for this visit type. Add items in Checklist Templates, then resume again.");
        } else {
          setChecklist(items);
          setTemplateSource(source);
        }
      } catch (e) {
        setChecklist([]);
        setTemplateSource("None");
        setChecklistLoadError("Could not load a checklist template for this visit type. Add items in Checklist Templates, then resume again.");
      }
    }
    setResumable(null);
    setStep("active");
  };

  const discardDraft = () => { clearDraft(); setResumable(null); };

  const loadChecklistItems = async (pid, vtype) => {
    const all = await base44.entities.ChecklistTemplate.list("-created_date", 500);
    const live = (all || []).filter((t) => !t.archived);
    const propSpecific = live.find((t) => t.visit_type === vtype && t.property_id === pid);
    const master = live.find((t) => t.visit_type === vtype && (!t.property_id || t.is_master));
    const tmpl = propSpecific || master;
    if (tmpl) {
      const items = (tmpl.items || []).map((name) => ({ name, status: "Not Checked", notes: "", photos: [] }));
      return { items, source: propSpecific ? "Property-Specific" : "Master", found: true };
    }
    // Fallback to built-in defaults so a visit is never left without a checklist when template records are missing.
    const seed = SEED[vtype] || [];
    const items = seed.map((name) => ({ name, status: "Not Checked", notes: "", photos: [] }));
    return { items, source: "Default", found: items.length > 0 };
  };

  const handleSelectProperty = async (pid) => {
    setPropertyId(pid);
    if (!ctxClient) { setStep("type"); return; }
    try {
      const all = await base44.entities.PropertyServiceAgreement.list("-created_date", 500);
      const ag = (all || []).find((a) => !a.archived && a.status === "Active" && a.property_id === pid && a.client_id === ctxClient);
      if (ag) {
        setAgreement(ag); setAgreementId(ag.id);
        if (ag.service_package_id) { try { const p = await base44.entities.ServicePackage.get(ag.service_package_id); setPkg(p); if (p && p.recurring === "Recurring") setVisitType("Monthly Property Watch"); } catch (e) {} }
        try { setClientObj(await base44.entities.Client.get(ctxClient)); } catch (e) {}
        setStep("first-visit");
      } else { setStep("type"); }
    } catch (e) { setStep("type"); }
  };

  const handleStartNow = () => {
    const d = loadDraft();
    if (d && d.propertyId && d.checklist && d.checklist.length > 0) { setDraftConflict(true); return; }
    startVisit();
  };

  const startNowDiscardDraft = () => {
    clearDraft(); setResumable(null); setDraftConflict(false); startVisit();
  };

  const saveScheduled = async () => {
    if (!scheduleDate || !scheduleTime || !propertyId) return;
    setSaving(true);
    try {
      const iso = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      await base44.entities.PropertyVisit.create({
        property_id: propertyId,
        property_service_agreement_id: agreementId || "",
        visit_type: visitType,
        status: "Scheduled",
        start_time: iso,
        scheduled_time: iso,
      });
      setSaving(false);
      navigate(`/clients/${ctxClient || agreement?.client_id || ""}`);
    } catch (e) { setSaving(false); alert("Could not schedule visit: " + (e?.message || e)); }
  };

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
      const { items, source } = await loadChecklistItems(propertyId, visitType);
      setChecklist(items);
      setTemplateSource(source);
      setChecklistLoadError("");
    } catch (e) {
      setChecklist([]);
      setTemplateSource("None");
    }
    setAnswered({});
    setSkipped({});
    setShowIncomplete(false);
    setStep("active");
  };

  const updateItem = (idx, updated) => {
    setChecklist((arr) => arr.map((it, i) => (i === idx ? updated : it)));
    setAnswered((a) => ({ ...a, [idx]: true }));
  };

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

  const addExpenseInline = async () => {
    if (!expVendor.trim()) return;
    try {
      const created = await base44.entities.Expense.create({
        vendor: expVendor.trim(), property_id: propertyId,
        date: new Date().toISOString().slice(0, 10),
        amount: parseFloat(expAmount) || 0,
        paid_by: expPaidBy.trim() || "Jim",
        receipt_photo: expReceipt || "",
        maintenance_issue_id: expIssueId || "",
        contractor_id: expContractorId || "",
        awaiting_reimbursement: true, reimbursed: false,
        notes: `Recorded during ${visitType} visit — ${propertyName}`,
      });
      setExpensesCreated((arr) => [...arr, { id: created.id, vendor: created.vendor, amount: created.amount }]);
      setExpVendor(""); setExpAmount(""); setExpPaidBy(""); setExpIssueId(""); setExpContractorId(""); setExpReceipt("");
    } catch (e) { alert("Could not create expense: " + (e?.message || e)); }
  };

  const uploadReceipt = async (file) => {
    if (!file) return;
    setUploading(true);
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file: file }); setExpReceipt(file_url); } catch (e) {}
    setUploading(false);
  };

  const addOwnerUpdateInline = async () => {
    if (!commSubject.trim()) return;
    const prop = properties.find((p) => p.id === propertyId) || {};
    try {
      const created = await base44.entities.OwnerCommunication.create({
        client_id: prop.owner_id || "", property_id: propertyId,
        date: new Date().toISOString().slice(0, 10),
        communication_type: "WhatsApp", subject: commSubject.trim(),
        message: commMessage.trim(), follow_up_required: false,
      });
      setCommSent((arr) => [...arr, { id: created.id, subject: created.subject }]);
      setCommSubject(""); setCommMessage("");
    } catch (e) { alert("Could not send owner update: " + (e?.message || e)); }
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
    const shared = {
      property_id: propertyId, visit_type: visitType, start_time: startTime, end_time: end,
      status: "Completed", gps_location: gps, checklist,
      meter_readings: meters.filter((m) => m.label || m.value),
      summary, follow_up_task_ids: taskIds, maintenance_issue_ids: issueIds,
      owner_report: "", report_sent: false,
      property_service_agreement_id: agreementId || "",
    };
    try {
      let visit;
      if (resumeVisitId) {
        visit = await base44.entities.PropertyVisit.update(resumeVisitId, shared);
      } else {
        visit = await base44.entities.PropertyVisit.create(shared);
      }
      setCompleted(visit);
      clearDraft();
      setStep("done");
    } catch (e) { alert("Could not save visit: " + (e?.message || e)); }
    setSaving(false);
  };

  const backFromActive = () => {
    if (!confirm("Leave the active visit? Your progress is saved and you can resume it from the visits list.")) return;
    if (resumeVisitId) { onDone(); return; }
    setStep(ctxAgreement ? "first-visit" : "type");
  };

  // ---- STEP: first visit (agreement context) ----
  if (step === "first-visit") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={onDone}><ChevronLeft className="w-5 h-5" /></Button>
          <h2 className="font-semibold text-lg">First Visit</h2>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4">
          <p className="text-[11px] uppercase tracking-wide text-primary mb-2">Agreement context</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">Client:</span> <span className="font-medium truncate">{clientObj?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">Property:</span> <span className="font-medium truncate">{properties.find((p) => p.id === propertyId)?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">Service:</span> <span className="font-medium truncate">{pkg?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">Frequency:</span> <span className="font-medium">{agreement?.inspection_frequency || pkg?.inspection_frequency || "—"}</span></div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">Expected visit time:</span> <span className="font-medium">{pkg?.visit_duration || "—"}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button onClick={() => setStep("schedule")} className="rounded-2xl h-14 text-base gap-2"><CalendarClock className="w-5 h-5" /> Schedule Visit</Button>
          <Button variant="outline" onClick={handleStartNow} className="rounded-2xl h-14 text-base gap-2"><Navigation className="w-5 h-5" /> Start Visit Now</Button>
        </div>

        {draftConflict && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border max-w-sm w-full p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold">You already have a visit in progress.</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Starting a new visit will discard the unfinished one. Choose how to proceed.</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => { setDraftConflict(false); resume(); }} className="rounded-2xl h-11">Continue Existing Visit</Button>
                <Button variant="outline" onClick={() => setDraftConflict(false)} className="rounded-2xl h-11">Cancel</Button>
                <Button variant="destructive" onClick={startNowDiscardDraft} className="rounded-2xl h-11">Start New Visit</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- STEP: schedule visit ----
  if (step === "schedule") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("first-visit")}><ChevronLeft className="w-5 h-5" /></Button>
          <h2 className="font-semibold text-lg">Schedule Visit</h2>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 mb-4 text-sm">
          <p><span className="text-muted-foreground">Property:</span> <span className="font-medium">{properties.find((p) => p.id === propertyId)?.name || "—"}</span></p>
          <p><span className="text-muted-foreground">Service:</span> <span className="font-medium">{pkg?.name || "—"}</span></p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Visit Type</Label>
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VISIT_TYPES.map((vt) => <SelectItem key={vt} value={vt}>{vt}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Visit Date</Label>
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Visit Time</Label>
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveScheduled} disabled={saving || !scheduleDate || !scheduleTime} className="w-full h-12 rounded-2xl text-base gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarClock className="w-5 h-5" />} Save Scheduled Visit
          </Button>
        </div>
      </div>
    );
  }

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
          {(ctxClient ? properties.filter((p) => p.owner_id === ctxClient) : properties).map((p) => (
            <button key={p.id} onClick={() => handleSelectProperty(p.id)}
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
    const isAnswered = (it, idx) => it.status === "Normal" || it.status === "Important" || it.status === "Emergency" || !!answered[idx];
    const inspectionDone = checklist.length > 0 && checklist.every((it, idx) => isAnswered(it, idx));
    const issuesDone = inspectionDone && (flaggedCount === 0 || issueIds.length > 0);
    const tasksDone = inspectionDone && issuesDone && (taskIds.length > 0 || !!skipped.tasks);
    const expensesDone = inspectionDone && issuesDone && (expensesCreated.length > 0 || !!skipped.expenses);
    const ownerDone = inspectionDone && issuesDone && (commSent.length > 0 || !!skipped.owner);
    const canComplete = inspectionDone;
    const STEPS = [
      { key: "inspection", label: "Inspection", icon: ClipboardCheck, target: "step-inspection", done: inspectionDone },
      { key: "issues", label: "Issues", icon: Wrench, target: "step-issues", done: issuesDone },
      { key: "tasks", label: "Tasks", icon: ListChecks, target: "step-tasks", done: tasksDone },
      { key: "expenses", label: "Expenses", icon: Wallet, target: "step-expenses", done: expensesDone },
      { key: "owner", label: "Owner", icon: MessageSquare, target: "step-owner", done: ownerDone },
      { key: "finish", label: "Finish", icon: CheckCircle2, target: "step-finish", done: false },
    ];
    const nextStep = STEPS.find((s) => !s.done) || STEPS[STEPS.length - 1];
    const goToStep = (target) => { const el = document.getElementById(target); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
    const issueOptions = issueIds.map((id, i) => [id, createdIssues[i]?.title || "Issue"]);

    return (
      <div className="pb-40">
        <div className="sticky top-14 lg:top-0 z-10 bg-background/90 backdrop-blur border-b border-border -mx-4 px-4 py-3 mb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{propertyName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap"><Clock className="w-3 h-3" /> Started {(startTime || "").slice(11, 16)} · {visitType}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link to="/checklist-templates" className="text-[10px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground transition">{templateSource === "None" ? "No template — manage" : templateSource === "Default" ? "Default checklist" : `${templateSource} template`}</Link>
              {resumeVisitId ? (
                <button type="button" onClick={async () => { if (!confirm("Cancel this visit?")) return; try { await base44.entities.PropertyVisit.update(resumeVisitId, { status: "Cancelled", end_time: new Date().toISOString() }); } catch (e) {} onDone(); }} className="text-[10px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive transition">Cancel visit</button>
              ) : (
                <CancelVisitMenu
                  draft={{ propertyId, visitType, startTime, gps, checklist, meters, summary, issueIds, taskIds }}
                  onDone={() => navigate(`/properties/${propertyId}`)}
                />
              )}
            </div>
          </div>
          {/* Step bar */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar">
            {STEPS.map((s) => (
              <button key={s.key} onClick={() => goToStep(s.target)}
                className={`flex items-center gap-1.5 shrink-0 text-[11px] px-2.5 py-1.5 rounded-full border transition ${s.done ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/60 text-muted-foreground border-border"}`}>
                {s.done ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inspection */}
        <div id="step-inspection" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">Checklist</p>
          {templateSource === "Default" && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 mb-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">Default checklist in use — no configured template was found.</p>
            </div>
          )}
          <div className="space-y-2 mb-6">
            {checklist.map((it, i) => (
              <VisitChecklistItem key={i} item={it} index={i} onChange={(u) => updateItem(i, u)}
                onUploadPhoto={uploadPhotos} onRemovePhoto={removePhoto} uploading={uploading}
                onFlagIssue={flagIssue} flagged={!!flagged[i]} />
            ))}
            {checklist.length === 0 && (
              checklistLoadError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{checklistLoadError}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No checklist items for this visit type. Add items in Checklist Templates.</p>
              )
            )}
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
        </div>

        {/* Issues */}
        <div id="step-issues" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1.5"><Wrench className="w-3 h-3" /> Issues</p>
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            {flaggedCount === 0 ? (
              <p className="text-sm text-muted-foreground">No items flagged. Mark a checklist item as Important or Emergency to create an issue.</p>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">{flaggedCount} checklist item(s) flagged. Tap "Create Issue" on a flagged item to log it.</p>
            )}
            {createdIssues.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {createdIssues.map((iss, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-medium truncate">{iss.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">{iss.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tasks / Contractor */}
        <div id="step-tasks" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">Tasks / Contractor</p>
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3"><Check className="w-4 h-4 text-muted-foreground" /><h3 className="font-medium text-sm">Follow-up Task</h3></div>
            <div className="flex gap-2">
              <Input value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} placeholder="e.g. Order replacement pool filter" />
              <Button variant="outline" onClick={addFollowUpTask} disabled={!followUpText.trim()}>Add</Button>
            </div>
            {taskIds.length > 0 && <p className="text-xs text-emerald-600 mt-2">{taskIds.length} follow-up task(s) created.</p>}
            <p className="text-xs text-muted-foreground mt-2">For a contractor visit, use the Contractors module from the More menu.</p>
            <div className="mt-1">
              {skipped.tasks ? (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, tasks: false }))} className="text-xs text-primary hover:underline">Skipped — tap to undo</button>
              ) : (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, tasks: true }))} className="text-xs text-muted-foreground hover:underline">Skip if nothing to add</button>
              )}
            </div>
          </div>
        </div>

        {/* Expenses / Receipts */}
        <div id="step-expenses" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Expenses / Receipts</p>
          <div className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-2.5">
            <Input value={expVendor} onChange={(e) => setExpVendor(e.target.value)} placeholder="Vendor / description" />
            <div className="flex gap-2">
              <Input value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="Amount €" type="number" className="flex-1" />
              <Input value={expPaidBy} onChange={(e) => setExpPaidBy(e.target.value)} placeholder="Paid by" className="flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={expIssueId} onValueChange={setExpIssueId}>
                <SelectTrigger><SelectValue placeholder="Link issue (opt)" /></SelectTrigger>
                <SelectContent>
                  {issueOptions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={expContractorId} onValueChange={setExpContractorId}>
                <SelectTrigger><SelectValue placeholder="Link contractor (opt)" /></SelectTrigger>
                <SelectContent>
                  {contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                <span>{expReceipt ? "Receipt attached" : "Attach receipt"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadReceipt(e.target.files?.[0])} />
              </label>
              <Button size="sm" onClick={addExpenseInline} disabled={!expVendor.trim()} className="ml-auto rounded-full">Add expense</Button>
            </div>
            {expensesCreated.length > 0 && (
              <div className="space-y-1 pt-1">
                {expensesCreated.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-medium truncate">{ex.vendor}</span>
                    <span className="text-xs text-muted-foreground shrink-0">€{(ex.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-1">
              {skipped.expenses ? (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, expenses: false }))} className="text-xs text-primary hover:underline">Skipped — tap to undo</button>
              ) : (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, expenses: true }))} className="text-xs text-muted-foreground hover:underline">Skip if nothing to add</button>
              )}
            </div>
          </div>
        </div>

        {/* Owner Update */}
        <div id="step-owner" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Owner Update</p>
          <div className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-2.5">
            <Input value={commSubject} onChange={(e) => setCommSubject(e.target.value)} placeholder="Subject e.g. Monthly visit summary" />
            <Textarea value={commMessage} onChange={(e) => setCommMessage(e.target.value)} rows={2} placeholder="Message to the owner…" />
            <Button size="sm" onClick={addOwnerUpdateInline} disabled={!commSubject.trim()} className="rounded-full"><Send className="w-3.5 h-3.5 mr-1.5" /> Log owner update</Button>
            {commSent.length > 0 && (
              <div className="space-y-1 pt-1">
                {commSent.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-medium truncate">{c.subject}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-1">
              {skipped.owner ? (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, owner: false }))} className="text-xs text-primary hover:underline">Skipped — tap to undo</button>
              ) : (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, owner: true }))} className="text-xs text-muted-foreground hover:underline">Skip if nothing to add</button>
              )}
            </div>
          </div>
        </div>

        {/* Finish */}
        <div id="step-finish" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">Finish</p>
          <div className="mb-4">
            <Label className="text-xs mb-1.5 block">Visit Summary & Recommendations</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Overall findings and recommended next steps for the owner…" />
          </div>
        </div>

        {/* Next action card + bottom bar */}
        <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 lg:left-64">
          <div className="max-w-2xl mx-auto space-y-2">
            <button onClick={() => goToStep(nextStep.target)} className="w-full flex items-center justify-between gap-2 rounded-2xl bg-primary/10 border border-primary/20 px-3 py-2.5 text-left hover:bg-primary/15 transition">
              <div className="flex items-center gap-2 min-w-0">
                <nextStep.icon className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-primary/80">Next step</p>
                  <p className="text-sm font-medium text-foreground truncate">{nextStep.label}{nextStep.key === "finish" ? " — complete the visit" : ""}</p>
                </div>
              </div>
              <span className="text-xs text-primary shrink-0">Go →</span>
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={backFromActive} className="rounded-2xl">Back</Button>
              <Button
                variant={canComplete ? "default" : "outline"}
                onClick={() => (canComplete ? completeVisit() : setShowIncomplete(true))}
                disabled={saving}
                className="flex-1 h-12 rounded-2xl text-base">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Complete Visit</>}
              </Button>
            </div>
          </div>
        </div>

        {showIncomplete && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border max-w-sm w-full p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold">Visit incomplete</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">There are still unanswered inspection items.</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => { setShowIncomplete(false); goToStep("step-inspection"); }} className="rounded-2xl h-11">Continue Inspection</Button>
                <Button variant="outline" onClick={() => { setShowIncomplete(false); completeVisit(); }} className="rounded-2xl h-11">Complete Anyway</Button>
              </div>
            </div>
          </div>
        )}
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