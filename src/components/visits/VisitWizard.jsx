import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, ChevronLeft, Plus, Check, Loader2, Gauge, CheckCircle2, Download, Navigation, Receipt, MessageSquare, Send, ClipboardCheck, Wrench, Wallet, ListChecks, AlertTriangle, Info, Package, User, Building2, CalendarClock, Search, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import VisitChecklistItem from "@/components/visits/VisitChecklistItem";
import ReportDeliveryCard from "@/components/visits/ReportDeliveryCard";
import { saveDraft, loadDraft, clearDraft } from "@/lib/visitDraft";
import { SEED } from "@/lib/checklistSeed";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { ensureOneTimeVisitCharge } from "@/lib/visitBilling";
import CancelVisitMenu from "@/components/visits/CancelVisitMenu";
import { useSidebar } from "@/components/layout/SidebarContext";
import DictateInspectionDialog from "@/components/dictation/DictateInspectionDialog";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { athensLocalToIso, athensVisitWhen } from "@/lib/timezone";
import { createNotification } from "@/lib/notifications";

const VISIT_TYPES = [
  "Monthly Property Watch", "Owner Arrival Preparation", "Guest Arrival Preparation",
  "Departure Inspection", "Seasonal Opening", "Seasonal Closing", "Owner Representative Construction Visit",
  "Home Watch Inspection", "Property Care Inspection", "Emergency Visit", "Owner Representative Site Visit",
  "Initial Property Onboarding Inspection", "Grocery Stocking",
];

// iPad touch-sizing helpers. Tablet range md–xl (768–1535) gets larger touch targets;
// large desktop (≥2xl / 1536) resets to original so desktop behavior is preserved.
const FIELD = "md:h-11 md:text-base 2xl:h-9 2xl:text-sm";
const AREA = "md:text-base 2xl:text-sm";
const BTN = "md:h-11 2xl:h-9";
const BTN_SM = "md:h-10 md:px-4 md:text-sm 2xl:h-8 2xl:px-3 2xl:text-xs";

// ---- Compact step-by-step checklist (presentation only) ----
// Same answered rule as the active-step completion validation, shared with the
// guided expand/collapse focus logic.
const itemAnswered = (it, idx, answeredMap) =>
  it.status === "Normal" || it.status === "Important" || it.status === "Emergency" ||
  it.status === "Unable to Check" || it.status === "N/A" || !!answeredMap[idx];

// Build the maintenance Description from the actual visit finding: the
// observed condition plus any notes / recommendation / action taken recorded
// on the checklist item. Only real text is carried forward — nothing invented.
const issueDescriptionFromFinding = (it) => {
  const parts = [];
  if (it.status) parts.push(`Observed condition: ${it.status}`);
  if ((it.notes || "").trim()) parts.push(`Notes: ${it.notes.trim()}`);
  if ((it.recommendation || "").trim()) parts.push(`Recommendation: ${it.recommendation.trim()}`);
  if ((it.action_taken || "").trim()) parts.push(`Action taken: ${it.action_taken.trim()}`);
  return parts.join("\n\n");
};

// First item the field user should land on: an "Unable to Check" item still
// missing its reason (the existing completion warning) takes priority, else the
// first unanswered item.
const focusIdx = (list, answeredMap) => {
  const unfinished = list.findIndex((it) => it.status === "Unable to Check" && !(it.notes || "").trim());
  return unfinished >= 0 ? unfinished : list.findIndex((it, idx) => !itemAnswered(it, idx, answeredMap));
};

export default function VisitWizard({ onDone, autoResume, ctxProperty, ctxAgreement, ctxClient, ctxVisitType, resumeVisitId, scheduleMode, onActiveVisitStart }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { collapsed: sidebarCollapsed } = useSidebar();
  const initialStep = scheduleMode ? "select-client" : ctxAgreement ? "first-visit" : resumeVisitId ? "active" : "property";
  const [step, setStep] = useState(initialStep);
  const [agreement, setAgreement] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [clientObj, setClientObj] = useState(null);
  const [agreementId, setAgreementId] = useState(ctxAgreement || "");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [draftConflict, setDraftConflict] = useState(false);
  const [resumeVisit, setResumeVisit] = useState(null);
  const [clients, setClients] = useState([]);
  const [scheduleClientSearch, setScheduleClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [propertyAgreements, setPropertyAgreements] = useState([]);
  const [agreementPackages, setAgreementPackages] = useState({});
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState(null);
  // Phase 1: preselect a visit type passed via /visits?visit_type=... (Prep Arrival, One-Time services).
  const [visitType, setVisitType] = useState(VISIT_TYPES.includes(ctxVisitType) ? ctxVisitType : VISIT_TYPES[0]);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [gps, setGps] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [meters, setMeters] = useState([{ label: "Electricity meter", value: "", photo: "" }, { label: "Water meter", value: "", photo: "" }]);
  const [summary, setSummary] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [followUpText, setFollowUpText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [flagged, setFlagged] = useState({});
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(null);
  // Grocery Stocking (one-time service) — captured at completion, stored on the visit.
  const [groceryList, setGroceryList] = useState("");
  const [groceryCost, setGroceryCost] = useState("");
  const [reportBusiness, setReportBusiness] = useState({});
  const [reportClient, setReportClient] = useState({});
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
  // Which checklist rows are expanded (compact step-by-step interaction).
  const [openItems, setOpenItems] = useState({});
  const [dictateOpen, setDictateOpen] = useState(false);
  const itemRefs = useRef({});
  const guidedInitDone = useRef(false);

  // Collapse the just-answered routine item and auto-open the next unanswered
  // one, bringing it into a comfortable visible position (not under the sticky bars).
  const advanceFrom = (idx, list, answeredMap) => {
    const next = list.findIndex((it, i) => i > idx && !itemAnswered(it, i, answeredMap));
    setOpenItems((m) => {
      const nm = { ...m, [idx]: false };
      if (next >= 0) nm[next] = true;
      return nm;
    });
    if (next >= 0) setTimeout(() => itemRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  // On entering/resuming an active visit: keep answered routine items collapsed,
  // auto-expand only the first item needing attention, and bring it into view.
  useEffect(() => {
    if (step !== "active") { guidedInitDone.current = false; return; }
    if (guidedInitDone.current || checklist.length === 0) return;
    guidedInitDone.current = true;
    const idx = focusIdx(checklist, answered);
    if (idx >= 0) {
      setOpenItems({ [idx]: true });
      setTimeout(() => itemRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, checklist]);

  // Active-visit layout mode (UI-only): report to the page shell when the
  // on-site visit begins, and track whether this is a tablet-width screen
  // (near-full width; large desktop keeps a sensible cap). Re-checked on
  // resize so rotating the iPad mid-visit keeps the width correct.
  const [activeWide, setActiveWide] = useState(false);
  useEffect(() => {
    if (step !== "active") { setActiveWide(false); return; }
    const report = () => {
      setActiveWide(window.innerWidth >= 768 && window.innerWidth < 1536);
      if (onActiveVisitStart) onActiveVisitStart();
    };
    report();
    window.addEventListener("resize", report);
    return () => window.removeEventListener("resize", report);
  }, [step]);

  useEffect(() => {
    base44.entities.Property.list("-created_date", 500).then((p) => setProperties((p || []).filter((x) => !x.archived))).catch(() => {});
    base44.entities.Contractor.list("-created_date", 500).then((c) => setContractors((c || []).filter((x) => !x.archived))).catch(() => {});
    if (scheduleMode) base44.entities.Client.list("-created_date", 500).then((c) => setClients((c || []).filter((x) => !x.archived))).catch(() => {});
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
          // The onboarding flow passes the intended visit type explicitly
          // (ctxVisitType). The package still provides context (name,
          // frequency, duration) but must NOT override the onboarding visit
          // type with its default_visit_type.
          let resolvedType = ctxVisitType || "";
          if (a.service_package_id) {
            try {
              const p = await base44.entities.ServicePackage.get(a.service_package_id);
              setPkg(p);
              resolvedType = ctxVisitType || p?.default_visit_type || "";
            } catch (e) {}
          }
          setVisitType(resolvedType);
          // Agreement/package provides no visit type: keep the existing Choose
          // Visit Type screen (agreement context stays loaded so the visit is
          // still linked). If an unfinished visit draft exists, stay on the
          // guarded first-visit screen instead.
          if (!resolvedType && !(d && d.propertyId && d.checklist && d.checklist.length > 0)) setStep("type");
          if (ctxClient) { try { setClientObj(await base44.entities.Client.get(ctxClient)); } catch (e) {} }
        } catch (e) {}
      })();
    } else if (ctxProperty && !scheduleMode) {
      // Launched from Property Detail ("Start Visit") with the property already
      // chosen: reuse the standard selection path so the user never picks the
      // property twice. If an unfinished visit draft exists, keep the property
      // step so the existing Resume / Continue-Visit safeguard is presented
      // instead of silently starting a duplicate visit.
      if (!(d && d.propertyId && d.checklist && d.checklist.length > 0)) {
        handleSelectProperty(ctxProperty);
      }
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
      saveDraft({ propertyId, visitType, startTime, gps, checklist, meters, summary, internalNotes, issueIds, taskIds, createdIssues, createdTasks, expensesCreated, commSent, answered, skipped, agreementId });
    }
  }, [step, propertyId, visitType, startTime, gps, checklist, meters, summary, issueIds, taskIds, createdIssues, createdTasks, expensesCreated, commSent, answered, skipped, agreementId]);

  // Safety net: if a visit is active but the checklist failed to load (a transient list failure, or a
  // stale draft left over from before a Master template existed), re-attempt the lookup once so a
  // matching Master template is still applied automatically. Lookup priority is unchanged.
  const noneRetryDone = useRef(false);
  useEffect(() => {
    if (step !== "active") { noneRetryDone.current = false; return; }
    if (noneRetryDone.current) return;
    if (checklist.length > 0 || templateSource !== "None" || !visitType) return;
    noneRetryDone.current = true;
    (async () => {
      try {
        const { items, source, found } = await loadChecklistItems(propertyId, visitType);
        if (found && items.length > 0) { setChecklist(items); setTemplateSource(source); setChecklistLoadError(""); }
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, checklist.length, templateSource, visitType, propertyId]);

  const propertyName = properties.find((p) => p.id === propertyId)?.name || "";

  const resume = async () => {
    if (!resumable) return;
    const pid = resumable.propertyId;
    const vtype = resumable.visitType || VISIT_TYPES[0];
    setPropertyId(pid);
    setVisitType(vtype);
    // Restore the agreement context the visit was started under, so completing a
    // resumed draft still records the same service agreement (old drafts without
    // an agreementId simply resolve to none, exactly as before).
    setAgreementId(resumable.agreementId || "");
    if (resumable.agreementId) {
      base44.entities.PropertyServiceAgreement.get(resumable.agreementId).then((a) => {
        setAgreement(a);
        if (a?.service_package_id) base44.entities.ServicePackage.get(a.service_package_id).then(setPkg).catch(() => {});
      }).catch(() => {});
    }
    setStartTime(resumable.startTime);
    setGps(resumable.gps || "");
    setMeters(resumable.meters?.length ? resumable.meters : [{ label: "Electricity meter", value: "", photo: "" }, { label: "Water meter", value: "", photo: "" }]);
    setSummary(resumable.summary || "");
    setInternalNotes(resumable.internalNotes || "");
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
      const items = (tmpl.items || []).map((name) => ({ name, status: "Not Checked", notes: "", photos: [], owner_visible: false }));
      return { items, source: propSpecific ? "Property-Specific" : "Master", found: true };
    }
    // Defensive fallback: built-in defaults only when no template record exists and the seed is non-empty.
    const seed = SEED[vtype] || [];
    if (seed.length > 0) {
      const items = seed.map((name) => ({ name, status: "Not Checked", notes: "", photos: [], owner_visible: false }));
      return { items, source: "Default", found: true };
    }
    return { items: [], source: "None", found: false };
  };

  // Loads agreement + package context. Returns true when a visit type was
  // resolved (explicit ctxVisitType or the package's valid default_visit_type).
  // Callers use the flag to route to the EXISTING Choose Visit Type screen
  // instead of silently defaulting to "Monthly Property Watch".
  const loadAgreementContext = async (ag, cid) => {
    setAgreement(ag); setAgreementId(ag.id);
    let resolvedType = VISIT_TYPES.includes(ctxVisitType) ? ctxVisitType : "";
    if (ag.service_package_id) {
      try {
        const p = await base44.entities.ServicePackage.get(ag.service_package_id);
        setPkg(p);
        resolvedType = VISIT_TYPES.includes(ctxVisitType) ? ctxVisitType : (VISIT_TYPES.includes(p?.default_visit_type) ? p.default_visit_type : "");
      } catch (e) {}
    }
    setVisitType(resolvedType);
    if (cid) { try { setClientObj(await base44.entities.Client.get(cid)); } catch (e) {} }
    return !!resolvedType;
  };

  const goNextAfterProperty = (hasType = true) => {
    if (scheduleMode) { setStep("schedule"); return; } // the schedule screen includes its own Visit Type picker
    if (!hasType) { setStep("type"); return; }         // no default visit type → existing Choose Visit Type screen
    if (ctxClient) setStep("first-visit");
    else setStep("type");
  };

  const handleSelectProperty = async (pid, cidOverride) => {
    setPropertyId(pid);
    const cid = cidOverride || ctxClient || selectedClient;
    if (!cid) { setStep("type"); return; }
    try {
      const all = await base44.entities.PropertyServiceAgreement.list("-created_date", 500);
      // Operational agreement = status Active AND signing_status Signed — same rule as Property Detail.
      const propAgs = (all || []).filter((a) => !a.archived && a.status === "Active" && a.signing_status === "Signed" && a.property_id === pid);
      if (propAgs.length === 1) {
        const hasType = await loadAgreementContext(propAgs[0], cid);
        goNextAfterProperty(hasType);
      } else if (propAgs.length > 1) {
        const pkgs = await Promise.all(propAgs.map(async (a) => { try { return a.service_package_id ? await base44.entities.ServicePackage.get(a.service_package_id) : null; } catch (e) { return null; } }));
        const map = {}; propAgs.forEach((a, i) => { map[a.id] = pkgs[i]; });
        setAgreementPackages(map);
        setPropertyAgreements(propAgs);
        if (cid && !clientObj) { try { setClientObj(await base44.entities.Client.get(cid)); } catch (e) {} }
        setStep("select-agreement");
      } else {
        setAgreement(null); setPkg(null); setAgreementId("");
        const vt0 = VISIT_TYPES.includes(ctxVisitType) ? ctxVisitType : "";
        setVisitType(vt0);
        if (cid && !clientObj) { try { setClientObj(await base44.entities.Client.get(cid)); } catch (e) {} }
        goNextAfterProperty(!!vt0);
      }
    } catch (e) { setStep("type"); }
  };

  const handleStartNow = () => {
    const d = loadDraft();
    if (d && d.propertyId && d.checklist && d.checklist.length > 0) { setDraftConflict(true); return; }
    const vt = visitType || VISIT_TYPES[0];
    if (!visitType) setVisitType(vt);
    startVisit(vt);
  };

  const startNowDiscardDraft = () => {
    clearDraft(); setResumable(null); setDraftConflict(false); startVisit();
  };

  const saveScheduled = async () => {
    if (!scheduleDate || !scheduleTime || !propertyId) return;
    setSaving(true);
    try {
      // Interpret the entered date/time as Athens wall-clock → store a tz-correct UTC instant.
      const iso = athensLocalToIso(scheduleDate, scheduleTime);
      const created = await base44.entities.PropertyVisit.create({
        property_id: propertyId,
        property_service_agreement_id: agreementId || "",
        visit_type: visitType,
        status: "Scheduled",
        start_time: iso,
        scheduled_time: iso,
      });
      // On-schedule confirmation notification (respects the Visits category setting).
      try {
        const sList = await base44.entities.BusinessSettings.list("-created_date", 1);
        const cats = (sList && sList[0] && sList[0].notif_categories) || [];
        if (cats.includes("Visits")) {
          const prop = properties.find((p) => p.id === propertyId);
          await createNotification({
            title: "Visit scheduled",
            message: `${clientObj?.name || "Client"} · ${prop?.name || "Property"} · ${visitTypeLabel(visitType)} · ${athensVisitWhen(iso)}`,
            type: "Visit",
            priority: "Medium",
            related_entity: "PropertyVisit",
            related_record_id: created.id,
            related_property_id: propertyId,
            related_path: `/visits/${created.id}`,
            dedup_key: `visit_scheduled:${created.id}`,
          });
        }
      } catch (e) {}
      setSaving(false);
      if (scheduleMode) {
        const pname = properties.find((p) => p.id === propertyId)?.name || "Property";
        toast({ title: "Visit scheduled", description: `${clientObj?.name || ""} · ${pname} · ${athensVisitWhen(iso)}` });
        navigate("/");
      } else {
        navigate(`/clients/${ctxClient || agreement?.client_id || ""}`);
      }
    } catch (e) { setSaving(false); alert("Could not schedule visit: " + (e?.message || e)); }
  };

  const startVisit = async (overrideType) => {
    const vt = overrideType || visitType;
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
      const { items, source } = await loadChecklistItems(propertyId, vt);
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
    const prev = checklist[idx];
    setChecklist((arr) => arr.map((it, i) => (i === idx ? updated : it)));
    setAnswered((a) => ({ ...a, [idx]: true }));
    // Normal / N/A: collapse and auto-advance to the next unanswered item.
    // Important / Emergency / Unable to Check stay open for their existing
    // documentation workflows. Notes-only edits (status unchanged) never collapse.
    if (updated.status !== prev.status && (updated.status === "Normal" || updated.status === "N/A")) {
      advanceFrom(idx, checklist.map((it, i) => (i === idx ? updated : it)), answered);
    }
  };

  // Apply APPROVED Dictate Visit proposals to the SAME checklist — voice is
  // only a shortcut, never a separate mode. Unmentioned items are untouched;
  // existing notes are preserved (appended, never overwritten); every item
  // stays manually editable and the completion rules are unchanged.
  const applyDictation = (updates) => {
    setChecklist((arr) => {
      let next = arr;
      updates.forEach((u) => {
        const prev = next[u.item_index] || {};
        const mergedNotes = [prev.notes || "", u.notes || ""].filter((s) => s.trim()).join("\n").trim();
        next = next.map((it, i) => (i === u.item_index ? { ...it, status: u.status, notes: mergedNotes } : it));
      });
      return next;
    });
    setAnswered((a) => {
      const n = { ...a };
      updates.forEach((u) => { n[u.item_index] = true; });
      return n;
    });
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
        description: issueDescriptionFromFinding(it), reported_by: "Jim", before_photos: it.photos || [],
        owner_approval_status: "Pending", payment_status: "Unpaid",
        source_visit_id: resumeVisitId || "",
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
        date: new Date().toISOString().slice(0, 10),         notes: `Follow-up from ${visitTypeLabel(visitType)} visit — ${propertyName}`,
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
        notes: `Recorded during ${visitTypeLabel(visitType)} visit — ${propertyName}`,
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

  const completeVisit = async () => {
    setSaving(true);
    const end = new Date().toISOString();
    setEndTime(end);
    const shared = {
      property_id: propertyId, visit_type: visitType, start_time: startTime, end_time: end,
      status: "Completed", gps_location: gps, checklist,
      meter_readings: meters.filter((m) => m.label || m.value),
      summary, internal_notes: internalNotes, follow_up_task_ids: taskIds, maintenance_issue_ids: issueIds,
      owner_report: "", report_sent: false, report_status: "Ready to Send",
      property_service_agreement_id: agreementId || "",
      ...(visitType === "Grocery Stocking" ? { shopping_list: groceryList.trim(), grocery_cost: parseFloat(groceryCost) || 0 } : {}),
    };
    try {
      let visit;
      if (resumeVisitId) {
        visit = await base44.entities.PropertyVisit.update(resumeVisitId, shared);
      } else {
        visit = await base44.entities.PropertyVisit.create(shared);
      }
      setCompleted(visit);
      // Link the issues created during this visit back to their source visit
      // (a fresh draft visit only gets its id now; a resumed visit already has
      // it, and this re-stamp is idempotent).
      if (issueIds.length > 0) {
        try { await base44.entities.MaintenanceIssue.bulkUpdate(issueIds.map((iid) => ({ id: iid, source_visit_id: visit.id }))); } catch (e) {}
      }
      // Completed tiered one-time property-care visit → create the single Due
      // ledger charge at the locked agreed price (duplicate-safe). Other visit
      // types (recurring plans, Property Assistance, On-Demand, Grocery, etc.)
      // are never auto-charged — see visitBilling.js.
      try {
        const prop0 = properties.find((p) => p.id === propertyId) || {};
        const charge = await ensureOneTimeVisitCharge(visit, { clientId: (clientObj?.id) || prop0.owner_id || "" });
        if (charge) toast({ description: `Ledger charge created: €${Number(charge.amount).toFixed(2)} (excl. VAT)` });
      } catch (e) {}
      // Load business + client context for the report delivery card.
      try {
        const bs = await base44.entities.BusinessSettings.list("-created_date", 1);
        setReportBusiness((bs && bs[0]) || {});
      } catch (e) {}
      const prop = properties.find((p) => p.id === propertyId) || {};
      if (clientObj) setReportClient(clientObj);
      else if (prop.owner_id) { try { setReportClient(await base44.entities.Client.get(prop.owner_id)); } catch (e) {} }
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

  // ---- STEP: select client (Home schedule flow) ----
  if (step === "select-client") {
    const activeClients = clients.filter((c) => c.status !== "Inactive");
    const q = scheduleClientSearch.trim().toLowerCase();
    const list = q ? activeClients.filter((c) => (c.name || "").toLowerCase().includes(q)) : activeClients;
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ChevronLeft className="w-5 h-5" /></Button>
          <h2 className="font-semibold text-lg">Schedule Visit</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3 px-1">Select the client.</p>
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={scheduleClientSearch} onChange={(e) => setScheduleClientSearch(e.target.value)} placeholder="Search clients…" className="pl-9 rounded-full bg-muted/50 border-0 focus-visible:ring-1" />
        </div>
        <div className="space-y-2">
          {list.map((c) => (
            <button key={c.id} onClick={() => {
              setSelectedClient(c.id); setClientObj(c);
              if (ctxProperty) { handleSelectProperty(ctxProperty, c.id); return; }
              const clientProps = properties.filter((p) => p.owner_id === c.id && !p.archived);
              if (clientProps.length === 1) handleSelectProperty(clientProps[0].id, c.id);
              else setStep("select-property");
            }} className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><User className="w-5 h-5" /></span>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.phone || c.email || ""}</p>
              </div>
            </button>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground">No clients found.</p>}
        </div>
      </div>
    );
  }

  // ---- STEP: select agreement (multiple active agreements) ----
  if (step === "select-agreement") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setStep(scheduleMode ? "select-property" : "property")}><ChevronLeft className="w-5 h-5" /></Button>
          <h2 className="font-semibold text-lg">Select Service</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3 px-1">This property has multiple active service agreements. Which is this visit for?</p>
        <div className="space-y-2">
          {(propertyAgreements || []).map((a) => (
            <button key={a.id} onClick={async () => { const hasType = await loadAgreementContext(a, ctxClient || selectedClient); goNextAfterProperty(hasType); }}
              className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition">
              <p className="font-medium text-foreground">{agreementPackages[a.id]?.name || "Service agreement"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  a.inspection_frequency || agreementPackages[a.id]?.inspection_frequency,
                  agreementPackages[a.id]?.visit_duration,
                  a.agreed_price != null ? `€${a.agreed_price.toFixed(2)} + VAT` : (agreementPackages[a.id]?.standard_price != null ? `€${agreementPackages[a.id].standard_price.toFixed(2)} + VAT` : ""),
                  a.billing_type,
                ].filter(Boolean).join(" · ")}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

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
            <div className="bg-card rounded-2xl border border-border max-w-sm md:max-w-md 2xl:max-w-sm w-full p-5 shadow-xl">
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
          <Button variant="ghost" size="icon" onClick={() => setStep(scheduleMode ? "select-property" : "first-visit")}><ChevronLeft className="w-5 h-5" /></Button>
          <h2 className="font-semibold text-lg">Schedule Visit</h2>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">Client:</span> <span className="font-medium truncate">{clientObj?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">Property:</span> <span className="font-medium truncate">{properties.find((p) => p.id === propertyId)?.name || "—"}</span></div>
            {agreement ? (
              <>
                <div className="flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">Service:</span> <span className="font-medium truncate">{pkg?.name || "—"}</span></div>
                <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">Frequency:</span> <span className="font-medium">{agreement.inspection_frequency || pkg?.inspection_frequency || "—"}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">Expected visit time:</span> <span className="font-medium">{pkg?.visit_duration || "—"}</span></div>
              </>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-500 pt-1">No active service agreement for this property. Choose a visit type below.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Visit Type</Label>
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger className={FIELD}><SelectValue placeholder="Select visit type" /></SelectTrigger>
              <SelectContent>{VISIT_TYPES.map((vt) => <SelectItem key={vt} value={vt}>{visitTypeLabel(vt)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Visit Date</Label>
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className={FIELD} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Visit Time</Label>
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className={FIELD} />
            </div>
          </div>
          <Button onClick={saveScheduled} disabled={saving || !scheduleDate || !scheduleTime || !visitType} className="w-full h-12 rounded-2xl text-base gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarClock className="w-5 h-5" />} Save Scheduled Visit
          </Button>
        </div>
      </div>
    );
  }

  // ---- STEP: select property ----
  if (step === "property" || step === "select-property") {
    const scoped = scheduleMode ? properties.filter((p) => p.owner_id === selectedClient && !p.archived)
      : ctxClient ? properties.filter((p) => p.owner_id === ctxClient)
      : properties;
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={scheduleMode ? () => setStep("select-client") : onDone}><ChevronLeft className="w-5 h-5" /></Button>
          <div>
            <h2 className="font-semibold text-lg">{scheduleMode ? "Schedule Visit" : "Start a Property Visit"}</h2>
            <p className="text-xs text-muted-foreground">Select the property you're visiting.</p>
          </div>
        </div>

        {resumable && !scheduleMode && (
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {scoped.map((p) => (
            <button key={p.id} onClick={() => handleSelectProperty(p.id)}
              className="text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></span>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.address || p.status}</p>
              </div>
            </button>
          ))}
          {scoped.length === 0 && <p className="text-sm text-muted-foreground">No properties for this client.</p>}
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
              <p className="font-medium text-sm text-foreground">{visitTypeLabel(vt)}</p>
            </button>
          ))}
        </div>
        <Button onClick={() => startVisit(visitType)} className="w-full mt-5 h-12 rounded-2xl text-base">
          <Navigation className="w-5 h-5 mr-2" /> Start Visit & Record Arrival
        </Button>
      </div>
    );
  }

  // ---- STEP: active visit ----
  if (step === "active") {
    const flaggedCount = checklist.filter((i) => i.status === "Important" || i.status === "Emergency").length;
    // Both new statuses are deliberate answers; only "Not Checked" (untouched) is unanswered.
    const isAnswered = (it, idx) => itemAnswered(it, idx, answered);
    const missingReasons = checklist.filter((i) => i.status === "Unable to Check" && !(i.notes || "").trim());
    const inspectionDone = checklist.length > 0 && checklist.every((it, idx) => isAnswered(it, idx));
    const issuesDone = inspectionDone && (flaggedCount === 0 || issueIds.length > 0);
    const tasksDone = inspectionDone && issuesDone && (taskIds.length > 0 || !!skipped.tasks);
    const expensesDone = inspectionDone && issuesDone && (expensesCreated.length > 0 || !!skipped.expenses);
    const ownerDone = inspectionDone && issuesDone && (commSent.length > 0 || !!skipped.owner);
    const canComplete = inspectionDone;
    const STEPS = [
      { key: "inspection", label: "Checklist", icon: ClipboardCheck, target: "step-inspection", done: inspectionDone },
      { key: "issues", label: "Issues", icon: Wrench, target: "step-issues", done: issuesDone },
      { key: "tasks", label: "Tasks", icon: ListChecks, target: "step-tasks", done: tasksDone },
      { key: "expenses", label: "Expenses", icon: Wallet, target: "step-expenses", done: expensesDone },
      { key: "owner", label: "Owner", icon: MessageSquare, target: "step-owner", done: ownerDone },
      { key: "finish", label: "Finish", icon: CheckCircle2, target: "step-finish", done: false },
    ];
    // Guidance reflects what the worker still needs to do — not a forced walk
    // through every optional section: Checklist while items remain, Issues only
    // when flagged items exist without a logged issue, then Finish. No
    // scroll-position tracking; Go keeps using the existing section anchors.
    const needsIssues = inspectionDone && flaggedCount > 0 && issueIds.length === 0;
    const nextStep = checklist.length > 0 && !inspectionDone
      ? { key: "inspection", label: "Checklist", icon: ClipboardCheck, target: "step-inspection", hint: `${checklist.filter((it, idx) => !isAnswered(it, idx)).length} of ${checklist.length} remaining` }
      : needsIssues
        ? STEPS.find((s) => s.key === "issues")
        : STEPS.find((s) => s.key === "finish");
    const goToStep = (target) => { const el = document.getElementById(target); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
    const issueOptions = issueIds.map((id, i) => [id, createdIssues[i]?.title || "Issue"]);

    return (
      <div className="pb-40">
        <div className="sticky top-14 lg:top-0 z-10 bg-background/90 backdrop-blur border-b border-border -mx-4 px-4 py-3 mb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{propertyName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap"><Clock className="w-3 h-3" /> Started {(startTime || "").slice(11, 16)} · {visitTypeLabel(visitType)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link to="/checklist-templates" className="text-[10px] px-2 py-0.5 md:text-xs md:px-2.5 md:py-1 2xl:text-[10px] 2xl:px-2 2xl:py-0.5 rounded-full border bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground transition">{templateSource === "None" ? "No template — manage" : templateSource === "Default" ? "Default checklist" : `${templateSource} template`}</Link>
              {resumeVisitId ? (
                <button type="button" onClick={async () => { if (!confirm("Cancel this visit?")) return; try { await base44.entities.PropertyVisit.update(resumeVisitId, { status: "Cancelled", end_time: new Date().toISOString() }); } catch (e) {} onDone(); }} className="text-[10px] px-2 py-0.5 md:text-xs md:px-2.5 md:py-1 2xl:text-[10px] 2xl:px-2 2xl:py-0.5 rounded-full border bg-muted text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive transition">Cancel visit</button>
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
                className={`flex items-center gap-1.5 shrink-0 text-[11px] px-2.5 py-1.5 md:text-sm md:px-4 md:py-2 2xl:text-[11px] 2xl:px-2.5 2xl:py-1.5 rounded-full border transition ${s.done ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/60 text-muted-foreground border-border"}`}>
                {s.done ? <Check className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inspection */}
        <div id="step-inspection" className="scroll-mt-28">
          {/* Dictate Visit — optional voice shortcut for filling the SAME checklist */}
          {checklist.length > 0 && propertyId && (
            <button type="button" onClick={() => setDictateOpen(true)} className="w-full flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-3.5 py-3 mb-3 hover:bg-primary/10 transition min-h-[48px] text-left">
              <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Mic className="w-4 h-4" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">Dictate Visit</span>
                <span className="block text-xs text-muted-foreground">Optional — dictate observations, review them, then apply to the checklist</span>
              </span>
            </button>
          )}
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">Checklist</p>
          {templateSource === "Default" && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 mb-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">Default checklist in use — no configured template was found.</p>
            </div>
          )}
          {templateSource === "None" && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">No checklist is configured for this visit type.</p>
                <p className="text-xs text-muted-foreground mt-0.5">Create or assign a checklist template before using this visit type.</p>
              </div>
            </div>
          )}
          <div className="space-y-2 mb-6">
            {checklist.map((it, i) => (
              <div key={i} ref={(el) => { itemRefs.current[i] = el; }} className="scroll-mt-28">
                <VisitChecklistItem item={it} index={i} onChange={(u) => updateItem(i, u)}
                  onUploadPhoto={uploadPhotos} onRemovePhoto={removePhoto} uploading={uploading}
                  onFlagIssue={flagIssue} flagged={!!flagged[i]}
                  expanded={!!openItems[i]} onToggle={() => setOpenItems((m) => ({ ...m, [i]: !m[i]}))} />
              </div>
            ))}
            {checklist.length === 0 && (
              checklistLoadError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{checklistLoadError}</p>
                </div>
              ) : templateSource === "None" ? null : (
                <p className="text-sm text-muted-foreground">No checklist items for this visit type. Add items in Checklist Templates.</p>
              )
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3"><Gauge className="w-4 h-4 text-muted-foreground" /><h3 className="font-medium text-sm">Meter Readings</h3></div>
            <div className="space-y-2">
              {meters.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={m.label} onChange={(e) => setMeters((arr) => arr.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder="Label" className={`flex-1 ${FIELD}`} />
                  <Input value={m.value} onChange={(e) => setMeters((arr) => arr.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} placeholder="Reading" className={`flex-1 ${FIELD}`} />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setMeters((arr) => [...arr, { label: "", value: "", photo: "" }])} className={`rounded-full ${BTN_SM}`}><Plus className="w-4 h-4" /> Add reading</Button>
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
              <Input value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} placeholder="e.g. Order replacement pool filter" className={FIELD} />
              <Button variant="outline" onClick={addFollowUpTask} disabled={!followUpText.trim()} className={BTN}>Add</Button>
            </div>
            {taskIds.length > 0 && <p className="text-xs text-emerald-600 mt-2">{taskIds.length} follow-up task(s) created.</p>}
            <p className="text-xs text-muted-foreground mt-2">For a contractor visit, use the Contractors module from the More menu.</p>
            <div className="mt-1">
              {skipped.tasks ? (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, tasks: false }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-primary hover:underline">Skipped — tap to undo</button>
              ) : (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, tasks: true }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-muted-foreground hover:underline">Skip if nothing to add</button>
              )}
            </div>
          </div>
        </div>

        {/* Expenses / Receipts */}
        <div id="step-expenses" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Expenses / Receipts</p>
          <div className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-2.5">
            <Input value={expVendor} onChange={(e) => setExpVendor(e.target.value)} placeholder="Vendor / description" className={FIELD} />
            <div className="flex gap-2">
              <Input value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="Amount €" type="number" className={`flex-1 ${FIELD}`} />
              <Input value={expPaidBy} onChange={(e) => setExpPaidBy(e.target.value)} placeholder="Paid by" className={`flex-1 ${FIELD}`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={expIssueId} onValueChange={setExpIssueId}>
                <SelectTrigger className={FIELD}><SelectValue placeholder="Link issue (opt)" /></SelectTrigger>
                <SelectContent>
                  {issueOptions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={expContractorId} onValueChange={setExpContractorId}>
                <SelectTrigger className={FIELD}><SelectValue placeholder="Link contractor (opt)" /></SelectTrigger>
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
              <Button size="sm" onClick={addExpenseInline} disabled={!expVendor.trim()} className={`ml-auto rounded-full ${BTN_SM}`}>Add expense</Button>
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
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, expenses: false }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-primary hover:underline">Skipped — tap to undo</button>
              ) : (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, expenses: true }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-muted-foreground hover:underline">Skip if nothing to add</button>
              )}
            </div>
          </div>
        </div>

        {/* Owner Update */}
        <div id="step-owner" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Owner Update</p>
          <div className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-2.5">
            <Input value={commSubject} onChange={(e) => setCommSubject(e.target.value)} placeholder="Subject e.g. Monthly visit summary" className={FIELD} />
            <Textarea value={commMessage} onChange={(e) => setCommMessage(e.target.value)} rows={2} placeholder="Message to the owner…" className={AREA} />
            <Button size="sm" onClick={addOwnerUpdateInline} disabled={!commSubject.trim()} className={`rounded-full ${BTN_SM}`}><Send className="w-3.5 h-3.5 mr-1.5" /> Log owner update</Button>
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
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, owner: false }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-primary hover:underline">Skipped — tap to undo</button>
              ) : (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, owner: true }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-muted-foreground hover:underline">Skip if nothing to add</button>
              )}
            </div>
          </div>
        </div>

        {/* Finish */}
        <div id="step-finish" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">Finish</p>
          {visitType === "Grocery Stocking" && (
            <div className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium">Grocery details</p>
              <div>
                <Label className="text-xs mb-1.5 block">Owner shopping list / request</Label>
                <Textarea value={groceryList} onChange={(e) => setGroceryList(e.target.value)} rows={2} placeholder="Items requested by the owner…" className={AREA} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Grocery / receipt cost (€)</Label>
                <Input type="number" step="0.01" min="0" value={groceryCost} onChange={(e) => setGroceryCost(e.target.value)} placeholder="Actual cost of groceries — separate from the €45 service fee" className={FIELD} />
              </div>
              <p className="text-xs text-muted-foreground">Groceries are paid separately by the owner — keep this cost separate from the €45 + VAT service fee. Attach the receipt photo on the checklist item below.</p>
            </div>
          )}
          <div className="mb-4">
            <Label className="text-xs mb-1.5 block">Visit Summary & Recommendations <span className="text-emerald-600 font-normal">(shown to owner)</span></Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Overall findings and recommended next steps for the owner…" className={AREA} />
          </div>
          <div className="mb-4">
            <Label className="text-xs mb-1.5 block">Internal Notes <span className="text-rose-600 font-normal">(staff only — never shown to owner)</span></Label>
            <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} placeholder="Private staff notes. These are NOT included in the owner report." className={AREA} />
          </div>
        </div>

        {/* Next action card + bottom bar */}
        <div className={`fixed bottom-16 lg:bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 ${sidebarCollapsed ? "lg:left-0" : "lg:left-64"}`}>
          <div className={`space-y-2 ${sidebarCollapsed || activeWide ? "w-full 2xl:mx-auto 2xl:max-w-5xl" : "max-w-2xl mx-auto"}`}>
            <button onClick={() => goToStep(nextStep.target)} className="w-full flex items-center justify-between gap-2 rounded-2xl bg-primary/10 border border-primary/20 px-3 py-2.5 text-left hover:bg-primary/15 transition">
              <div className="flex items-center gap-2 min-w-0">
                <nextStep.icon className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-primary/80">Next step</p>
                  <p className="text-sm font-medium text-foreground truncate">{nextStep.label}{nextStep.key === "finish" ? " — complete the visit" : ""}</p>
                  {nextStep.hint && <p className="text-[11px] text-muted-foreground">{nextStep.hint}</p>}
                </div>
              </div>
              <span className="text-xs text-primary shrink-0">Go →</span>
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={backFromActive} className={`rounded-2xl ${BTN}`}>Back</Button>
              <Button
                variant={canComplete ? "default" : "outline"}
                onClick={() => ((canComplete && missingReasons.length === 0) ? completeVisit() : setShowIncomplete(true))}
                disabled={saving}
                className="flex-1 h-12 rounded-2xl text-base">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Complete Visit</>}
              </Button>
            </div>
          </div>
        </div>

        {showIncomplete && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border max-w-sm md:max-w-md 2xl:max-w-sm w-full p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold">Visit incomplete</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {inspectionDone
                  ? `${missingReasons.length} Unable to Check item${missingReasons.length === 1 ? "" : "s"} have no reason noted. The owner report will show the check could not be completed, but not why.`
                  : "There are still unanswered checklist items."}
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => { setShowIncomplete(false); goToStep("step-inspection"); }} className="rounded-2xl h-11">Continue Checklist</Button>
                <Button variant="outline" onClick={() => { setShowIncomplete(false); completeVisit(); }} className="rounded-2xl h-11">Complete Anyway</Button>
              </div>
            </div>
          </div>
        )}

        {/* Dictate Visit — optional voice entry; returns the user to this same checklist */}
        {propertyId && checklist.length > 0 && (
          <DictateInspectionDialog
            open={dictateOpen}
            onOpenChange={setDictateOpen}
            checklist={checklist}
            statuses={["Normal", "Important", "Emergency", "Unable to Check", "N/A"]}
            context={{
              inspectionId: resumeVisitId || "",
              propertyId,
              propertyName,
              clientName: clientObj?.name || "",
              inspectionLabel: visitTypeLabel(visitType),
            }}
            title="Dictate Visit"
            onApply={applyDictation}
          />
        )}
      </div>
    );
  }

  // ---- STEP: done ----
  if (step === "done" && completed) {
    return (
      <div className="max-w-xl mx-auto py-6">
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold mb-1">Visit Complete ✓</h2>
          <p className="text-sm text-muted-foreground">{propertyName} · {visitTypeLabel(visitType)}</p>
          <div className="rounded-2xl border border-border bg-card p-3 text-left text-xs text-muted-foreground space-y-0.5 mt-4 mb-5 inline-block text-left">
            <p>Duration: {(startTime || "").slice(11, 16)} – {(endTime || "").slice(11, 16)}</p>
            <p>Checklist items: {checklist.length} · Issues: {issueIds.length} · Follow-ups: {taskIds.length}</p>
          </div>
        </div>
        <ReportDeliveryCard
          visit={completed}
          property={properties.find((p) => p.id === propertyId) || {}}
          client={reportClient}
          business={reportBusiness}
          issues={createdIssues}
          tasks={createdTasks}
          onUpdate={setCompleted}
          onBackToEdit={() => setStep("active")}
          variant="done"
          onDone={onDone}
        />
        <div className="flex flex-wrap gap-2 justify-center mt-5">
          <Button asChild variant="outline" className="rounded-xl gap-1.5 h-10">
            <Link to={`/visits/${completed.id}`}><MapPin className="w-4 h-4" /> View Completed Visit</Link>
          </Button>
          {propertyId && (
            <Button asChild variant="outline" className="rounded-xl gap-1.5 h-10">
              <Link to={`/properties/${propertyId}`}>Back to Property</Link>
            </Button>
          )}
          {reportClient?.id && (
            <Button asChild variant="outline" className="rounded-xl gap-1.5 h-10">
              <Link to={`/clients/${reportClient.id}`}>Back to Client</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}