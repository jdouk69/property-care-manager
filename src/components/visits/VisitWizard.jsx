import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, ChevronLeft, Plus, Check, Loader2, Gauge, CheckCircle2, Download, Navigation, Receipt, MessageSquare, Send, ClipboardCheck, Wrench, Wallet, ListChecks, AlertTriangle, Info, Package, User, Building2, CalendarClock, Search, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import VisitChecklistItem from "@/components/visits/VisitChecklistItem";
import GuidedChecklistOverlay from "@/components/visits/guided/GuidedChecklistOverlay";
import ReportDeliveryCard from "@/components/visits/ReportDeliveryCard";
import { saveDraft, loadDraft, clearDraft } from "@/lib/visitDraft";
import { uploadPrivatePhoto } from "@/lib/photoStorage";
import { SEED } from "@/lib/checklistSeed";
import { recommendedVisitType, isRecurringAgreement, serviceFrequency } from "@/lib/activeService";
import { entitlementStatus, followUpTypeFor } from "@/lib/packageEntitlement";
import { visitTypeLabel, checklistStatusLabel } from "@/lib/visitTypeLabels";
import { ensureOneTimeVisitCharge } from "@/lib/visitBilling";
import CancelVisitMenu from "@/components/visits/CancelVisitMenu";
import DraftConflictDialog from "@/components/visits/DraftConflictDialog";
import PackageServiceCard from "@/components/visits/PackageServiceCard";
import AdditionalChargeCard from "@/components/visits/AdditionalChargeCard";
import AdditionalAmountSection from "@/components/visits/AdditionalAmountSection";
import SpecialServiceChargeCard from "@/components/visits/SpecialServiceChargeCard";
import { isSpecialServiceVisit } from "@/lib/specialServices";
import { Checkbox } from "@/components/ui/checkbox";
import { billingClassificationFor, billingClassificationTone, classificationState } from "@/lib/visitBillingClassification";
import { useSidebar } from "@/components/layout/SidebarContext";
import DictateInspectionDialog from "@/components/dictation/DictateInspectionDialog";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { athensLocalToIso, athensVisitWhen, athensToday } from "@/lib/timezone";
import { createNotification } from "@/lib/notifications";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { checklistItemDisplay } from "@/lib/i18n/checklistItemDisplay";

// Seasonal Opening / Closing are NOT listed here: they are booked through
// Add Service, which records the required per-visit owner approval. The
// createVisit function rejects any seasonal visit created without one, so
// the wizard can neither schedule nor fresh-start them.
const VISIT_TYPES = [
  "Monthly Property Watch", "Owner Arrival Preparation", "Guest Arrival Preparation",
  "Departure Inspection", "Owner Representative Construction Visit",
  "Home Watch Inspection", "Property Care Inspection", "Complete Care Property Visit", "Complete Care Follow-up Visit", "Emergency Visit", "Owner Representative Site Visit",
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
  if (it.status) parts.push(`Observed condition: ${checklistStatusLabel(it.status)}`);
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
  const { t, tEnum, lang } = useLanguage();

  // Greek display formatting for the same Athens instants (display-only; the
  // English helpers stay the source of truth for stored text, reports and
  // notifications).
  const whenLabel = (iso) => {
    if (lang === "el" && iso) {
      try {
        return new Intl.DateTimeFormat("el-GR", { timeZone: "Europe/Athens", weekday: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
      } catch (e) {}
    }
    return athensVisitWhen(iso);
  };
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
  // Live preview (Choose Visit Type screen) of the checklist the currently
  // selected visit type will load. Resolution is identical to the real start:
  // property-specific override > master template > built-in default.
  const [typePreview, setTypePreview] = useState(null);
  // Checklist preview for the RECOMMENDED package visit, independent of which
  // type is currently selected (used by the package launch button).
  const [recPreview, setRecPreview] = useState(null);
  // Live visits (package entitlement counting on the Choose Visit Type screen)
  // and the additional-service flag: a requested visit BEYOND the package's
  // included allowance — billable, never counted as another included visit.
  const [visits, setVisits] = useState([]);
  const [additionalService, setAdditionalService] = useState(false);
  // Billable override for ADDITIONAL visits: defaults to checked (billable);
  // staff can uncheck before completing → COURTESY / NO CHARGE. Included
  // package visits never show a checkbox — nothing to charge accidentally.
  const [billable, setBillable] = useState(true);
  // Staff-confirmed charge amount for an ADDITIONAL — BILLABLE visit, captured
  // on the Finish screen before completion (null = not entered/confirmed).
  const [additionalAmount, setAdditionalAmount] = useState(null);
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
  // Guided Checklist overlay (mobile field mode): entry index is derived at
  // open time from checklist progress — no persisted current-card field.
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [guidedStart, setGuidedStart] = useState(0);
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

  // On entering/resuming an active visit: keep answered routine items collapsed
  // and auto-expand the first item needing attention. The page itself opens at
  // the TOP (see the active-entry scroll effect above) — this only sets
  // expansion; the expanded item stays reachable by normal scrolling.
  useEffect(() => {
    if (step !== "active") { guidedInitDone.current = false; return; }
    if (guidedInitDone.current || checklist.length === 0) return;
    guidedInitDone.current = true;
    const idx = focusIdx(checklist, answered);
    if (idx >= 0) {
      setOpenItems({ [idx]: true });
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
    base44.entities.PropertyVisit.list("-start_time", 500).then((v) => setVisits((v || []).filter((x) => !x.archived))).catch(() => {});
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
          // Additional-service flag persists on the record (the resumed autosave
          // below keeps it current while the visit is active).
          setAdditionalService(!!v.is_additional_service);
          // Preserve the visit's existing billing classification across
          // resume/restart — a courtesy visit stays courtesy.
          setBillable(v.billing_classification !== "Courtesy - No Charge");
          // A charge amount confirmed on a previous session of this same
          // record resumes with the visit (re-editable on the Finish screen).
          if (v.is_additional_service && Number(v.agreed_price) > 0) setAdditionalAmount(Number(v.agreed_price));
          // QA F1/F2 fix: restore the fields the resumed-visit persistence
          // already writes on this SAME record — meter readings, summary,
          // internal notes, GPS — plus the existing issue/task linkage, so a
          // resumed visit shows the previous session's data and completing it
          // can no longer overwrite those values with blanks.
          setGps(v.gps_location || "");
          setMeters(v.meter_readings?.length ? v.meter_readings : [{ label: "Electricity meter", value: "", photo: "" }, { label: "Water meter", value: "", photo: "" }]);
          setSummary(v.summary || "");
          setInternalNotes(v.internal_notes || "");
          const priorIssueIds = v.maintenance_issue_ids || [];
          const priorTaskIds = v.follow_up_task_ids || [];
          setIssueIds(priorIssueIds);
          setTaskIds(priorTaskIds);
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
          // Items already carrying an existing linked issue keep their flagged
          // state, so staff cannot accidentally create a duplicate issue for
          // the same checklist item after resuming (same heuristic as the
          // existing draft-resume path).
          (v.checklist || []).forEach((it, i) => {
            if (it.status === "Important" || it.status === "Emergency") setFlagged((f) => ({ ...f, [i]: priorIssueIds.length > 0 }));
          });
          setStep("active");
        } catch (e) { setStep("property"); }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoResume && resumable) resume();
  }, [autoResume, resumable]);

  // Visit Complete screen always opens at the TOP: completion ends a long,
  // deeply scrolled active-visit page; without this the screen opens partway
  // down at the billing area. One-time jump per entry — scrolling afterward
  // is untouched.
  useEffect(() => { if (step === "done") window.scrollTo(0, 0); }, [step]);

  // Entering/resuming an active visit always opens at the TOP of the page, one
  // time per entry (the visit header, billing-classification badge and Guided
  // Checklist controls are immediately visible). Scrolling while working is
  // untouched — this only fires when the step value changes.
  useEffect(() => { if (step === "active") window.scrollTo(0, 0); }, [step]);

  // First Visit screen: the Client row always shows the client linked to the
  // SELECTED PROPERTY (owner_id) — the same property→client relationship
  // Property Detail uses as the source of truth. Covers entry paths where no
  // client context was carried (property-only launches); explicit client
  // context already resolved earlier (ctxClient / agreement client) wins.
  // Display-only — no client data is created or duplicated.
  useEffect(() => {
    if (step !== "first-visit" || clientObj || !propertyId) return;
    const owner = properties.find((p) => p.id === propertyId)?.owner_id;
    if (!owner) return;
    let cancelled = false;
    base44.entities.Client.get(owner).then((c) => { if (!cancelled && c) setClientObj(c); }).catch(() => {});
    return () => { cancelled = true; };
  }, [step, clientObj, propertyId, properties]);

  // persist draft while a visit is active
  useEffect(() => {
    if (step === "active" && propertyId && !resumeVisitId) {
      saveDraft({ propertyId, visitType, startTime, gps, checklist, meters, summary, internalNotes, issueIds, taskIds, createdIssues, createdTasks, expensesCreated, commSent, answered, skipped, agreementId, additionalService, billable, additionalAmount,
        // CANONICAL classification of this started visit — established once at
        // start (or via the legacy fallback), restored verbatim on resume and
        // never re-derived afterward.
        billingClassification: billingClassificationFor({ additionalService, billable, agreement, pkg, visitType }) });
    }
  }, [step, propertyId, visitType, startTime, gps, checklist, meters, summary, issueIds, taskIds, createdIssues, createdTasks, expensesCreated, commSent, answered, skipped, agreementId, additionalService, billable, additionalAmount, agreement, pkg]);

  // ---- CANONICAL CHARGE AMOUNT (establish once) ----
  // For an ADDITIONAL — BILLABLE visit the charge amount defaults ONCE to the
  // package's configured additional-visit price, the moment the package context
  // is available. Semantics: null = not established yet (derive the default);
  // 0 = deliberately set to zero (never re-derived); a positive number =
  // established amount (default or staff-entered — never overwritten). The
  // autosave above persists it the instant it exists, resume() restores it
  // verbatim, and restartDraftVisit carries it through startVisit — so this
  // effect only ever fills a TRULY missing (null) amount.
  useEffect(() => {
    if (step !== "active" || !additionalService || !billable) return;
    if (additionalAmount != null) return;
    const price = pkg?.additional_visit_price;
    if (price == null || !Number.isFinite(Number(price)) || Number(price) < 0) return;
    setAdditionalAmount(Number(price));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, additionalService, billable, additionalAmount, pkg]);

  // Scheduled/resumed visits (resumeVisitId) previously had NO autosave — the
  // PropertyVisit record was written only at completion, so leaving mid-visit
  // lost in-progress checklist progress. This debounced save persists progress
  // on the SAME record (no new entity, no duplicate visit); completion still
  // writes the final full record exactly as before, and the resume flow below
  // already loads v.checklist — so reopening restores statuses, notes and
  // photos, and the Guided Checklist resumes at the first unanswered item.
  const resumedSaveRef = useRef(null);
  useEffect(() => {
    if (step !== "active" || !resumeVisitId || !propertyId) return;
    const payload = {
      checklist,
      meter_readings: meters.filter((m) => m.label || m.value),
      summary,
      internal_notes: internalNotes,
      gps_location: gps,
      // QA F2 fix: persist the existing issue/task linkage on the same record,
      // so links created mid-visit survive leaving and resuming.
      maintenance_issue_ids: issueIds,
      follow_up_task_ids: taskIds,
      is_additional_service: additionalService,
      billing_classification: billingClassificationFor({ additionalService, billable, agreement, pkg, visitType }),
      // Staff-confirmed additional charge amount persists across mid-visit
      // resume of the same record; absent when not confirmed (field untouched).
      ...(additionalService && billable && additionalAmount > 0 ? { agreed_price: additionalAmount } : {}),
    };
    resumedSaveRef.current = { id: resumeVisitId, payload };
    const tm = setTimeout(() => {
      base44.entities.PropertyVisit.update(resumeVisitId, payload).catch(() => {});
    }, 1500);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, resumeVisitId, checklist, meters, summary, internalNotes, gps, issueIds, taskIds, billable, additionalAmount]);

  // Final flush when the wizard unmounts mid-visit (navigate away / close).
  // After completion this writes the same values the completion already saved,
  // so it is idempotent and never overwrites the completed record's status.
  useEffect(() => () => {
    const s = resumedSaveRef.current;
    if (s) base44.entities.PropertyVisit.update(s.id, s.payload).catch(() => {});
  }, []);

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

  // Choose Visit Type screen: preview which checklist the selected type will
  // actually load (real template data — property-specific first, then master).
  useEffect(() => {
    if (step !== "type" || !propertyId || !visitType) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await loadChecklistItems(propertyId, visitType);
        if (cancelled) return;
        setTypePreview(p);
        const rec = recommendedVisitType(pkg);
        if (rec && rec !== visitType) {
          const rp = await loadChecklistItems(propertyId, rec);
          if (!cancelled) setRecPreview(rp);
        } else {
          setRecPreview(p);
        }
      } catch (e) {
        if (!cancelled) { setTypePreview(null); setRecPreview(null); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, propertyId, visitType, pkg]);

  const propertyName = properties.find((p) => p.id === propertyId)?.name || "";

  // Active-service frequency — the real recurring configuration (agreement
  // billing period + package included-visit allowance), never the free-text
  // inspection_frequency fields, which can hold stale onboarding defaults.
  const freqText = (ag, pk) => {
    const f = serviceFrequency(ag, pk);
    return f ? t("{count} included visit(s) per {period}", { count: f.visits, period: t(f.periodWord) }) : null;
  };

  // Display label for the CURRENT service (billing) period, derived from the
  // SAME entitlement resolver used for visit classification — single month
  // for Monthly, a month range for Quarterly/Annual. Display-only.
  const periodLabel = (period) => {
    try {
      const locale = lang === "el" ? "el-GR" : "en-US";
      const [sy, sm] = period.startMonth.split("-").map(Number);
      const start = new Date(Date.UTC(sy, sm - 1, 1));
      if (period.months === 1) return new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(start);
      const [ey, em] = period.endMonthExclusive.split("-").map(Number);
      const end = new Date(Date.UTC(ey, em - 2, 1));
      const f = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" });
      return `${f.format(start)} – ${f.format(end)}`;
    } catch (e) { return period.startMonth; }
  };

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
    // ---- CANONICAL BILLING CLASSIFICATION (resume) ----
    // Once a visit has started, its billing classification is established and
    // stored in the draft (autosave below). It is restored EXACTLY as stored
    // and NEVER re-derived on resume: a visit legitimately Included when
    // started stays Included even if other visits complete later, and an
    // Additional visit stays Additional. Only drafts with no stored
    // classification (legacy, saved before the field existed) are classified
    // once from the live entitlement source.
    const clsState = classificationState(resumable.billingClassification);
    if (clsState) {
      setAdditionalService(clsState.additionalService);
      setBillable(clsState.billable);
      // The staff-confirmed charge amount only applies to a billable
      // additional visit; a restored Courtesy has none. Re-editable on the
      // Finish screen before completion.
      setAdditionalAmount(clsState.additionalService && clsState.billable
        ? (resumable.additionalAmount != null ? resumable.additionalAmount : null)
        : null);
    } else if (resumable.billable === false) {
      // Legacy courtesy draft (predates the stored classification field): the
      // staff's explicit Courtesy choice persists — never re-derived.
      setAdditionalService(true);
      setBillable(false);
      setAdditionalAmount(null);
    }
    // Agreement/package context for the wizard UI (Finish panel, charge
    // amount, report) — loaded without touching the classification above.
    const loadResumeContext = async () => {
      let ag = agreement, pk = pkg;
      try { if (!ag && resumable.agreementId) ag = await base44.entities.PropertyServiceAgreement.get(resumable.agreementId); } catch (e) {}
      if (ag) { setAgreement(ag); setAgreementId(ag.id); }
      if (ag?.service_package_id && !pk) { try { pk = await base44.entities.ServicePackage.get(ag.service_package_id); setPkg(pk); } catch (e) {} }
      return { ag, pk };
    };
    if (!clsState && resumable.billable !== false) {
      // Legacy/unclassified draft: classify ONCE from explicitly fetched
      // context — agreement + package + a live visit list — never racing
      // component state. The autosave below immediately persists the derived
      // classification into the draft, making it canonical from now on.
      (async () => {
        const { ag, pk } = await loadResumeContext();
        let visList = visits;
        if (!visList || visList.length === 0) {
          try { visList = (await base44.entities.PropertyVisit.list("-start_time", 500)).filter((x) => !x.archived); setVisits(visList); } catch (e) {}
        }
        setAdditionalService(resolveAdditional(vtype, { agreement: ag, pkg: pk, visits: visList }));
        setBillable(true);
      })();
    } else {
      loadResumeContext();
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
      return { items, source: propSpecific ? "Property-Specific" : "Master", found: true, templateName: tmpl.name || "", count: items.length };
    }
    // Defensive fallback: built-in defaults only when no template record exists and the seed is non-empty.
    const seed = SEED[vtype] || [];
    if (seed.length > 0) {
      const items = seed.map((name) => ({ name, status: "Not Checked", notes: "", photos: [], owner_visible: false }));
      return { items, source: "Default", found: true, templateName: "", count: seed.length };
    }
    return { items: [], source: "None", found: false, templateName: "", count: 0 };
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
    // Client context for the First Visit screen: explicit id first, else the
    // agreement's own client. Display-only.
    if (cid) { try { setClientObj(await base44.entities.Client.get(cid)); } catch (e) {} }
    else if (ag.client_id) { try { setClientObj(await base44.entities.Client.get(ag.client_id)); } catch (e) {} }
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

  // Is this visit type the package's included scheduled visit with its
  // allowance already consumed? Performing it again is then an ADDITIONAL
  // billable service — never a second included entitlement — regardless of
  // which entry point staff used (package card or generic type picker).
  // Single source of truth for the Included vs Additional decision. Accepts an
  // optional explicit context (agreement/pkg/visits) so callers that resolve
  // context asynchronously (draft resume) can re-derive with the values they
  // just fetched instead of stale component state; all other callers use the
  // loaded state exactly as before.
  const resolveAdditional = (vt, ctx = {}) => {
    const ag = ctx.agreement !== undefined ? ctx.agreement : agreement;
    const pk = ctx.pkg !== undefined ? ctx.pkg : pkg;
    const vis = ctx.visits !== undefined ? ctx.visits : visits;
    if (!ag || !isRecurringAgreement(ag)) return false;
    const rec = recommendedVisitType(pk);
    if (!rec) return false;
    const fu = followUpTypeFor(rec);
    // Package slot of the requested type: the full visit OR (for packages
    // with a companion, currently Complete Care) its brief follow-up. Each
    // slot is judged independently — one full + one follow-up, never two of
    // either kind.
    const slot = vt === rec ? "full" : fu && vt === fu ? "followUp" : null;
    if (!slot) return false;
    const ent = entitlementStatus({ visits: vis, agreement: ag, pkg: pk, recType: rec, todayStr: athensToday() });
    if (!ent || !ent[slot]) return false;
    return ent[slot].remaining === 0 && !ent[slot].unfinished;
  };

  const handleStartNow = (overrideType, opts = {}) => {
    const d = loadDraft();
    if (d && d.propertyId && d.checklist && d.checklist.length > 0) { setDraftConflict(true); return; }
    const vt = overrideType || visitType || VISIT_TYPES[0];
    if (!visitType) setVisitType(vt);
    startVisit(vt, opts);
  };

  const startNowDiscardDraft = () => {
    clearDraft(); setResumable(null); setDraftConflict(false); startVisit();
  };

  // RESTART an unfinished device-local draft (confirmed first via
  // RestartVisitDialog). Reuses the same entitlement — a draft is not a
  // record, so nothing was consumed and no charge is involved. The
  // classification is RE-DERIVED from the live entitlement resolver (the
  // draft's snapshot may be stale if the allowance was consumed after the
  // draft was started); an explicit staff Courtesy choice persists.
  const restartDraftVisit = () => {
    const vt = resumable?.visitType || visitType;
    // Restart resets PROGRESS, never classification: a draft with an
    // established classification keeps it (same canonical model as resume);
    // legacy drafts without one derive once from live entitlement as before.
    const clsState = classificationState(resumable?.billingClassification);
    const opts = clsState
      ? { additional: clsState.additionalService, billable: clsState.billable,
          // Established charge amount restarts with the visit (default or
          // staff-entered, including a deliberate 0); only a truly missing
          // (null) amount is derived once by the establish-once effect.
          additionalAmount: resumable?.additionalAmount != null ? resumable.additionalAmount : null }
      : {
          additional: resumable?.billable === false ? true : resolveAdditional(vt),
          billable: resumable?.billable !== false,
        };
    clearDraft(); setResumable(null);
    startVisit(vt, opts);
  };

  // RESTART an unfinished scheduled/in-progress visit RECORD (confirmed first
  // via RestartVisitDialog). Resets progress on the SAME record — no new
  // record, no second included visit, no charge; never offered for completed
  // visits. Already-created issues/tasks and the agreement link are kept, and
  // the existing billing classification + Billable checkbox state are
  // preserved (only progress fields are reset).
  const restartExistingVisit = async (record) => {
    try {
      const { items } = await loadChecklistItems(record.property_id, record.visit_type);
      await base44.entities.PropertyVisit.update(record.id, {
        checklist: items,
        meter_readings: [],
        summary: "",
        internal_notes: "",
        gps_location: "",
        start_time: new Date().toISOString(),
        status: "In Progress",
      });
      navigate(`/visits?resume=${record.id}`);
    } catch (e) { alert(t("Could not restart visit: {message}", { message: e?.message || e })); }
  };

  const saveScheduled = async () => {
    if (!scheduleDate || !scheduleTime || !propertyId) return;
    setSaving(true);
    try {
      // Interpret the entered date/time as Athens wall-clock → store a tz-correct UTC instant.
      const iso = athensLocalToIso(scheduleDate, scheduleTime);
      const created = (await base44.functions.invoke("createVisit", {
        property_id: propertyId,
        property_service_agreement_id: agreementId || "",
        visit_type: visitType,
        status: "Scheduled",
        start_time: iso,
        scheduled_time: iso,
      })).data.visit;
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
        const pname = properties.find((p) => p.id === propertyId)?.name || t("Property");
        toast({ title: t("Visit scheduled"), description: `${clientObj?.name || ""} · ${pname} · ${whenLabel(iso)}` });
        navigate("/");
      } else {
        navigate(`/clients/${ctxClient || agreement?.client_id || ""}`);
      }
    } catch (e) { setSaving(false); alert(t("Could not schedule visit: {message}", { message: e?.message || e })); }
  };

  const startVisit = async (overrideType, opts = {}) => {
    const vt = overrideType || visitType;
    // Additional billable service: explicit launch ({ additional: true }) or
    // the package's own visit type with the included allowance consumed.
    const additional = opts && typeof opts.additional === "boolean" ? opts.additional : resolveAdditional(vt);
    setAdditionalService(additional);
    // Billable default: checked (billable) for additional visits — the app
    // decides the default automatically; staff can override before completing.
    setBillable(opts && opts.billable === false ? false : true);
    // Charge amount: a restart may carry the already-established amount
    // through opts (canonical, like the classification); fresh starts begin
    // unestablished (null) and the establish-once effect derives the default.
    setAdditionalAmount(opts && opts.additionalAmount != null ? opts.additionalAmount : null);
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
    // First-time Important/Emergency: surface the note to the owner
    // automatically (same rule the Guided Checklist applies, centralized here
    // so every UI path behaves identically). An item that was ALREADY a
    // concern keeps the staff's existing owner-visible choice — a manual
    // toggle-off stays off.
    const wasConcern = prev?.status === "Important" || prev?.status === "Emergency";
    const isConcern = updated.status === "Important" || updated.status === "Emergency";
    let applied = isConcern && !wasConcern ? { ...updated, owner_visible: true } : updated;
    // ONE canonical owner-visible observation: the note entered under the
    // "Required: describe what was observed … appears in the owner report"
    // message IS the owner-facing observation. Typing/editing that note on an
    // Attention/Emergency item marks it owner-visible, so the visible note and
    // the completion validator can never disagree again. A DELIBERATE private
    // toggle (an update that does not change the note text) is preserved.
    const noteChanged = (updated.notes || "") !== (prev?.notes || "");
    if (isConcern && noteChanged && (updated.notes || "").trim()) applied = { ...applied, owner_visible: true };
    setChecklist((arr) => arr.map((it, i) => (i === idx ? applied : it)));
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
        // Staff-selected status is authoritative: once an item has a
        // deliberate status (anything but "Not Checked"), dictation can only
        // document the observation — it never changes the status.
        const keepStatus = (prev.status || "Not Checked") !== "Not Checked";
        const status = keepStatus ? prev.status : u.status;
        const mergedNotes = [prev.notes || "", u.notes || ""].filter((s) => s.trim()).join("\n").trim();
        const isConcern = status === "Important" || status === "Emergency";
        const wasConcern = prev.status === "Important" || prev.status === "Emergency";
        // SAME canonical owner-visible observation rule as updateItem: a
        // dictated/merged observation on an Attention/Emergency item is
        // owner-visible (the whole reason this path could previously store a
        // fully documented concern as private), and a first-time concern
        // defaults to owner-visible like every other entry path.
        const ownerVisible = isConcern
          ? (mergedNotes ? true : (wasConcern ? !!prev.owner_visible : true))
          : prev.owner_visible;
        next = next.map((it, i) => (i === u.item_index ? { ...it, status, notes: mergedNotes, owner_visible: ownerVisible } : it));
      });
      return next;
    });
    setAnswered((a) => {
      const n = { ...a };
      updates.forEach((u) => { n[u.item_index] = true; });
      return n;
    });
  };

  // Photos upload to PRIVATE storage — only the private file reference is
  // stored on the record; screens/PDF builds generate short-lived signed URLs
  // on demand (see src/lib/photoStorage.js).
  const uploadPhotos = async (idx, files) => {
    setUploading(true);
    const urls = [];
    for (const f of files) {
      try { urls.push(await uploadPrivatePhoto(f)); } catch (e) {}
    }
    setUploading(false);
    setChecklist((arr) => arr.map((it, i) => (i === idx ? { ...it, photos: [...(it.photos || []), ...urls] } : it)));
    return urls;
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
    } catch (e) { alert(t("Could not create issue: {message}", { message: e?.message || e })); }
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
    } catch (e) { alert(t("Could not create task: {message}", { message: e?.message || e })); }
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
    } catch (e) { alert(t("Could not create expense: {message}", { message: e?.message || e })); }
  };

  const uploadReceipt = async (file) => {
    if (!file) return;
    setUploading(true);
    try { setExpReceipt(await uploadPrivatePhoto(file)); } catch (e) {}
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
    } catch (e) { alert(t("Could not send owner update: {message}", { message: e?.message || e })); }
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
      // A freshly completed visit's report is ALWAYS "Draft" — staff must
      // review, approve and send it explicitly (Quick Check visits excluded).
      owner_report: "", report_sent: false, report_status: "Draft",
      // Fresh report lifecycle: a (re)completed visit's report starts unsent.
      // Clears delivery history + stored PDF from any PREVIOUS report cycle of
      // this same visit record (e.g. sent, then restarted and re-completed) so
      // the new report can never display or deliver a prior cycle's metadata.
      report_sent_at: "", report_sent_to: "", report_sent_by: "",
      report_delivery_method: "", report_pdf_url: "",
      property_service_agreement_id: agreementId || "",
      is_additional_service: !!additionalService,
      billing_classification: billingClassificationFor({ additionalService, billable, agreement, pkg, visitType }),
      // Staff-confirmed additional charge amount (Finish screen) is stored on
      // the completed record — AdditionalChargeCard prefills from it. Never
      // invented: absent when no amount was entered (staff confirm there).
      ...(additionalService && billable && additionalAmount > 0 ? { agreed_price: additionalAmount } : {}),
      ...(visitType === "Grocery Stocking" ? { shopping_list: groceryList.trim(), grocery_cost: parseFloat(groceryCost) || 0 } : {}),
    };
    try {
      let visit;
      if (resumeVisitId) {
        visit = await base44.entities.PropertyVisit.update(resumeVisitId, shared);
      } else {
        visit = (await base44.functions.invoke("createVisit", shared)).data.visit;
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
        if (charge) toast({ description: t("Ledger charge created: €{amount} (excl. VAT)", { amount: Number(charge.amount).toFixed(2) }) });
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
    } catch (e) { alert(t("Could not save visit: {message}", { message: e?.message || e })); }
    setSaving(false);
  };

  const backFromActive = () => {
    if (!confirm(t("Leave the active visit? Your progress is saved and you can resume it from the visits list."))) return;
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
          <h2 className="font-semibold text-lg">{t("Schedule Visit")}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3 px-1">{t("Select the client.")}</p>
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={scheduleClientSearch} onChange={(e) => setScheduleClientSearch(e.target.value)} placeholder={t("Search clients…")} className="pl-9 rounded-full bg-muted/50 border-0 focus-visible:ring-1" />
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
          {list.length === 0 && <p className="text-sm text-muted-foreground">{t("No clients found.")}</p>}
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
          <h2 className="font-semibold text-lg">{t("Select Service")}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3 px-1">{t("This property has multiple active service agreements. Which is this visit for?")}</p>
        <div className="space-y-2">
          {(propertyAgreements || []).map((a) => (
            <button key={a.id} onClick={async () => { const hasType = await loadAgreementContext(a, ctxClient || selectedClient); goNextAfterProperty(hasType); }}
              className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition">
              <p className="font-medium text-foreground">{agreementPackages[a.id]?.name || t("Service agreement")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  freqText(a, agreementPackages[a.id]),
                  agreementPackages[a.id]?.visit_duration,
                  a.agreed_price != null ? `€${a.agreed_price.toFixed(2)} ${t("+ VAT")}` : (agreementPackages[a.id]?.standard_price != null ? `€${agreementPackages[a.id].standard_price.toFixed(2)} ${t("+ VAT")}` : ""),
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
    // Current-period allowance from the EXISTING entitlement resolver — the
    // exact same source of truth that decides whether Start Visit Now is
    // Included in Package vs Additional - Billable (resolveAdditional /
    // PackageServiceCard). Informational display only.
    const recType0 = recommendedVisitType(pkg);
    const ent = agreement && isRecurringAgreement(agreement) && recType0
      ? entitlementStatus({ visits, agreement, pkg, recType: recType0, todayStr: athensToday() })
      : null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={onDone}><ChevronLeft className="w-5 h-5" /></Button>
          <h2 className="font-semibold text-lg">{t("First Visit")}</h2>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4">
          <p className="text-[11px] uppercase tracking-wide text-primary mb-2">{t("Agreement context")}</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Client:")}</span> <span className="font-medium truncate">{clientObj?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Property:")}</span> <span className="font-medium truncate">{properties.find((p) => p.id === propertyId)?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Service:")}</span> <span className="font-medium truncate">{pkg?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Frequency:")}</span> <span className="font-medium">{freqText(agreement, pkg) || "—"}</span></div>
            {ent && (
              <div className={`rounded-xl border p-2.5 ${ent.remaining > 0 ? "border-border bg-muted/40" : ent.unfinished ? "border-amber-500/30 bg-amber-500/5" : "border-amber-500/50 bg-amber-500/10"}`}>
                <p className="text-sm font-medium text-foreground">{t("{period} allowance: {used} of {allowance} visits used", { period: periodLabel(ent.period), used: ent.used, allowance: ent.allowance })}</p>
                {ent.remaining > 0 ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">{t("{count} included visit(s) remaining", { count: ent.remaining })}</p>
                ) : ent.unfinished ? (
                  <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">{t("All included visits are used — resume the unfinished included visit instead of starting a duplicate.")}</p>
                ) : (
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {t("Next visit will be ADDITIONAL — BILLABLE")}</p>
                )}
              </div>
            )}
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Expected visit time:")}</span> <span className="font-medium">{pkg?.visit_duration || "—"}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button onClick={() => setStep("schedule")} className="rounded-2xl h-14 text-base gap-2"><CalendarClock className="w-5 h-5" /> {t("Schedule Visit")}</Button>
          <Button variant="outline" onClick={handleStartNow} className="rounded-2xl h-14 text-base gap-2"><Navigation className="w-5 h-5" /> {t("Start Visit Now")}</Button>
        </div>

        {draftConflict && (
          <DraftConflictDialog
            onResume={() => { setDraftConflict(false); resume(); }}
            onCancel={() => setDraftConflict(false)}
            onDiscardAndStart={startNowDiscardDraft}
          />
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
          <h2 className="font-semibold text-lg">{t("Schedule Visit")}</h2>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Client:")}</span> <span className="font-medium truncate">{clientObj?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Property:")}</span> <span className="font-medium truncate">{properties.find((p) => p.id === propertyId)?.name || "—"}</span></div>
            {agreement ? (
              <>
                <div className="flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Service:")}</span> <span className="font-medium truncate">{pkg?.name || "—"}</span></div>
                <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Frequency:")}</span> <span className="font-medium">{freqText(agreement, pkg) || "—"}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Expected visit time:")}</span> <span className="font-medium">{pkg?.visit_duration || "—"}</span></div>
              </>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-500 pt-1">{t("No active service agreement for this property. Choose a visit type below.")}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Visit Type")}</Label>
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger className={FIELD}><SelectValue placeholder={t("Select visit type")} /></SelectTrigger>
              <SelectContent>{VISIT_TYPES.map((vt) => <SelectItem key={vt} value={vt}>{t(visitTypeLabel(vt))}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Visit Date")}</Label>
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className={FIELD} />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Visit Time")}</Label>
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className={FIELD} />
            </div>
          </div>
          <Button onClick={saveScheduled} disabled={saving || !scheduleDate || !scheduleTime || !visitType} className="w-full h-12 rounded-2xl text-base gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarClock className="w-5 h-5" />} {t("Save Scheduled Visit")}
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
            <h2 className="font-semibold text-lg">{scheduleMode ? t("Schedule Visit") : t("Start a Property Visit")}</h2>
            <p className="text-xs text-muted-foreground">{t("Select the property you're visiting.")}</p>
          </div>
        </div>

        {resumable && !scheduleMode && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-500">{t("Unfinished visit in progress")}</p>
                <p className="text-xs text-muted-foreground truncate">{properties.find((p) => p.id === resumable.propertyId)?.name || t("Property")} · {t(visitTypeLabel(resumable.visitType))}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={resume} className="rounded-full">{t("Resume")}</Button>
                <Button size="sm" variant="outline" onClick={discardDraft} className="rounded-full">{t("Discard")}</Button>
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
          {scoped.length === 0 && <p className="text-sm text-muted-foreground">{t("No properties for this client.")}</p>}
        </div>
      </div>
    );
  }

  // ---- STEP: select visit type ----
  // Shows the property's ACTIVE SERVICE (what the customer purchased) first,
  // then marks the package's normal scheduled visit as RECOMMENDED — while all
  // visit types remain selectable for special/add-on situations.
  if (step === "type") {
    const recType = recommendedVisitType(pkg);
    const activeServiceName = pkg?.name || agreement?.included_services_override || t("Service agreement");
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("property")}><ChevronLeft className="w-5 h-5" /></Button>
          <div>
            <h2 className="font-semibold text-lg">{propertyName}</h2>
            <p className="text-xs text-muted-foreground">{t("Choose visit type")}</p>
          </div>
        </div>

        {/* Package Service Card — the property's ACTIVE recurring service with
            its real entitlement status for the current service period, from
            actual agreement/package configuration: INCLUDED start, RESUME /
            RESTART of an unfinished visit, or ADDITIONAL — billable once the
            included allowance is consumed. */}
        {agreement && isRecurringAgreement(agreement) && recType ? (
          <PackageServiceCard
            agreement={agreement}
            pkg={pkg}
            recType={recType}
            recPreview={recPreview}
            activeServiceName={activeServiceName}
            visits={visits}
            propertyId={propertyId}
            draft={resumable}
            // Package launch buttons ADVANCE to the existing First Visit /
            // Agreement Context screen (with the allowance display) — the
            // actual visit only starts via its Start Visit Now action. This
            // also keeps the duplicate-visit safeguard visible: a leftover
            // device draft surfaces as the DraftConflictDialog there instead
            // of silently blocking this screen (the regression). Included vs
            // Additional classification is unchanged — Start Visit Now derives
            // it from the same entitlement resolver (resolveAdditional).
            onStartIncluded={() => { setVisitType(recType); setStep("first-visit"); }}
            onStartFollowUp={() => { setVisitType(followUpTypeFor(recType)); setStep("first-visit"); }}
            onStartAdditional={() => { setVisitType(recType); setStep("first-visit"); }}
            onResumeDraft={resume}
            onRestartDraft={restartDraftVisit}
            onRestartRecord={restartExistingVisit}
          />
        ) : agreement ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4">
            <p className="text-[11px] uppercase tracking-wide text-primary mb-1">{t("Active Service")}</p>
            <p className="text-sm font-semibold text-foreground">{activeServiceName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {[
                freqText(agreement, pkg),
                isRecurringAgreement(agreement) ? null : t("One-time service"),
              ].filter(Boolean).join(" · ")}
            </p>
            {recType ? (
              <p className="text-xs text-muted-foreground mt-2">
                {t("Normal scheduled visit: {type}", { type: t(visitTypeLabel(recType)) })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">{t("This service has no linked visit type — choose below.")}</p>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 mb-4">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-500">{t("No active service agreement for this property. Choose the visit type for today's service.")}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VISIT_TYPES.map((vt) => {
            const isRec = vt === recType;
            return (
              <button key={vt} onClick={() => setVisitType(vt)}
                className={`text-left rounded-2xl border p-4 transition ${visitType === vt ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm text-foreground">{t(visitTypeLabel(vt))}</p>
                  {isRec && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shrink-0">{t("Recommended")}</span>
                  )}
                </div>
                {isRec && <p className="text-xs text-muted-foreground mt-1">{t("Recommended for {package}", { package: activeServiceName })}</p>}
              </button>
            );
          })}
        </div>

        {/* Live preview: the checklist this visit type will actually load */}
        {typePreview && typePreview.found && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            {t("Checklist: {template} · {count} items", {
              template: typePreview.templateName || (typePreview.source === "Default" ? t("Built-in default checklist") : "—"),
              count: typePreview.count,
            })}
          </p>
        )}
        {typePreview && !typePreview.found && (
          <p className="text-xs text-destructive mt-3 text-center">{t("No checklist is configured for this visit type.")}</p>
        )}

        <Button onClick={() => startVisit(visitType)} className="w-full mt-5 h-12 rounded-2xl text-base">
          <Navigation className="w-5 h-5 mr-2" /> {t("Start Visit & Record Arrival")}
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
  // Important/Emergency items REQUIRE their own observation before completion
  // (hard gate — every abnormal item in the owner report must be explainable).
  // Normal / N/A / Unable to Check / Not Checked behavior is unchanged.
  // Owner-visible observation REQUIRED: a private (owner_visible=false) note
  // cannot substitute — the customer report must be able to explain every
  // abnormal item from that exact item's own owner-facing note.
  const missingConcernNotes = checklist.filter((i) => (i.status === "Important" || i.status === "Emergency") && !(i.owner_visible && (i.notes || "").trim()));
    const inspectionDone = checklist.length > 0 && checklist.every((it, idx) => isAnswered(it, idx));
    const issuesDone = inspectionDone && (flaggedCount === 0 || issueIds.length > 0);
    const tasksDone = inspectionDone && issuesDone && (taskIds.length > 0 || !!skipped.tasks);
    const expensesDone = inspectionDone && issuesDone && (expensesCreated.length > 0 || !!skipped.expenses);
    const ownerDone = inspectionDone && issuesDone && (commSent.length > 0 || !!skipped.owner);
    const canComplete = inspectionDone;
    // Grocery Stocking only: Tasks/Contractor and Expenses/Receipts sections
    // (and their step chips) don't apply to this visit type.
    const isGroceryStocking = visitType === "Grocery Stocking";
    const STEPS = [
      { key: "inspection", label: "Checklist", icon: ClipboardCheck, target: "step-inspection", done: inspectionDone },
      { key: "issues", label: "Issues", icon: Wrench, target: "step-issues", done: issuesDone },
      ...(isGroceryStocking ? [] : [
        { key: "tasks", label: "Tasks", icon: ListChecks, target: "step-tasks", done: tasksDone },
        { key: "expenses", label: "Expenses", icon: Wallet, target: "step-expenses", done: expensesDone },
      ]),
      { key: "owner", label: "Owner", icon: MessageSquare, target: "step-owner", done: ownerDone },
      { key: "finish", label: "Finish", icon: CheckCircle2, target: "step-finish", done: false },
    ];
    // Guidance reflects what the worker still needs to do — not a forced walk
    // through every optional section: Checklist while items remain, Issues only
    // when flagged items exist without a logged issue, then Finish. No
    // scroll-position tracking; Go keeps using the existing section anchors.
    const needsIssues = inspectionDone && flaggedCount > 0 && issueIds.length === 0;
    const nextStep = checklist.length > 0 && !inspectionDone
      ? { key: "inspection", label: "Checklist", icon: ClipboardCheck, target: "step-inspection", hint: t("{count} of {total} remaining", { count: checklist.filter((it, idx) => !isAnswered(it, idx)).length, total: checklist.length }) }
      : needsIssues
        ? STEPS.find((s) => s.key === "issues")
        : STEPS.find((s) => s.key === "finish");
    const goToStep = (target) => { const el = document.getElementById(target); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
    // Jump straight to a specific checklist item: expand it and bring it into view.
    const jumpToItem = (idx) => {
      setOpenItems((m) => ({ ...m, [idx]: true }));
      setTimeout(() => itemRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    };
    // The first item blocking completion, in the same priority order as the
    // completion gate's warnings (missing owner-visible concern note > missing
    // Unable-to-Check reason > first unanswered item).
    const firstBlockerIdx = missingConcernNotes.length > 0
      ? checklist.findIndex((i) => (i.status === "Important" || i.status === "Emergency") && !(i.owner_visible && (i.notes || "").trim()))
      : missingReasons.length > 0
        ? checklist.findIndex((i) => i.status === "Unable to Check" && !(i.notes || "").trim())
        : checklist.findIndex((it, idx) => !isAnswered(it, idx));
    const issueOptions = issueIds.map((id, i) => [id, createdIssues[i]?.title || "Issue"]);
    // Active-visit billing classification (UI-only display): a resumed record
    // shows its persisted classification; a fresh local draft derives it from
    // the same wizard state the completion flow already stores.
    const activeClassification = resumeVisit?.billing_classification ||
      billingClassificationFor({ additionalService, billable, agreement, pkg, visitType });

    return (
      <div className="pb-40">
        <div className="sticky top-14 lg:top-0 z-10 bg-background/90 backdrop-blur border-b border-border -mx-4 px-4 py-3 mb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{propertyName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap"><Clock className="w-3 h-3" /> {t("Started")} {(startTime || "").slice(11, 16)} · {t(visitTypeLabel(visitType))}</p>
              {activeClassification && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border mt-1 ${billingClassificationTone(activeClassification)}`}>
                  <Receipt className="w-3 h-3" /> {t(activeClassification)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link to="/checklist-templates" className="text-[10px] px-2 py-0.5 md:text-xs md:px-2.5 md:py-1 2xl:text-[10px] 2xl:px-2 2xl:py-0.5 rounded-full border bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground transition">{templateSource === "None" ? t("No template — manage") : templateSource === "Default" ? t("Default checklist") : t(`${templateSource} template`)}</Link>
              {resumeVisitId ? (
                <button type="button" onClick={async () => { if (!confirm(t("Cancel this visit?"))) return; try { await base44.entities.PropertyVisit.update(resumeVisitId, { status: "Cancelled", end_time: new Date().toISOString() }); } catch (e) {} onDone(); }} className="text-[10px] px-2 py-0.5 md:text-xs md:px-2.5 md:py-1 2xl:text-[10px] 2xl:px-2 2xl:py-0.5 rounded-full border bg-muted text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive transition">{t("Cancel visit")}</button>
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
                {t(s.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Inspection */}
        <div id="step-inspection" className="scroll-mt-28">
          {/* Guided Checklist — full-screen, one item at a time (iPhone field mode) */}
          {checklist.length > 0 && propertyId && (
            <button type="button" onClick={() => { setGuidedStart(Math.max(0, focusIdx(checklist, answered))); setGuidedOpen(true); }} className="w-full flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-3.5 mb-2 hover:bg-primary/15 transition min-h-[56px] text-left">
              <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0"><ListChecks className="w-4 h-4" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{t("Guided Checklist")}</span>
                <span className="block text-xs text-muted-foreground">{t("One item at a time — tap a status to continue")}</span>
              </span>
            </button>
          )}
          {/* Dictate Visit — optional voice shortcut for filling the SAME checklist */}
          {checklist.length > 0 && propertyId && (
            <button type="button" onClick={() => setDictateOpen(true)} className="w-full flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-3.5 py-3 mb-3 hover:bg-primary/10 transition min-h-[48px] text-left">
              <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Mic className="w-4 h-4" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{t("Dictate Visit")}</span>
                <span className="block text-xs text-muted-foreground">{t("Optional — dictate observations, review them, then apply to the checklist")}</span>
              </span>
            </button>
          )}
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">{t("Checklist")}</p>
          {templateSource === "Default" && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 mb-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{t("Default checklist in use — no configured template was found.")}</p>
            </div>
          )}
          {templateSource === "None" && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">{t("No checklist is configured for this visit type.")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("Create or assign a checklist template before using this visit type.")}</p>
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
                  <p className="text-sm text-destructive">{t(checklistLoadError)}</p>
                </div>
              ) : templateSource === "None" ? null : (
                <p className="text-sm text-muted-foreground">{t("No checklist items for this visit type. Add items in Checklist Templates.")}</p>
              )
            )}
          </div>

          {/* Anchor for the first post-checklist operational area — the
              Checklist Review "Continue Visit" lands HERE (top of Meter
              Readings), not at Finish. Purely a scroll target: nothing about
              Meter Readings is required and section order is unchanged. */}
          {!isGroceryStocking && (
          <div id="step-meters" className="scroll-mt-28 rounded-2xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3"><Gauge className="w-4 h-4 text-muted-foreground" /><h3 className="font-medium text-sm">{t("Meter Readings")}</h3></div>
            <div className="space-y-2">
              {meters.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={m.label} onChange={(e) => setMeters((arr) => arr.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder={t("Label")} className={`flex-1 ${FIELD}`} />
                  <Input value={m.value} onChange={(e) => setMeters((arr) => arr.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} placeholder={t("Reading")} className={`flex-1 ${FIELD}`} />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setMeters((arr) => [...arr, { label: "", value: "", photo: "" }])} className={`rounded-full ${BTN_SM}`}><Plus className="w-4 h-4" /> {t("Add reading")}</Button>
            </div>
          </div>
          )}
        </div>

        {/* Issues */}
        <div id="step-issues" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1.5"><Wrench className="w-3 h-3" /> {t("Issues")}</p>
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            {flaggedCount === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No items flagged. Mark a checklist item as Important or Emergency to create an issue.")}</p>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">{t('{count} checklist item(s) flagged. Tap "Create maintenance issue" on a flagged item to log it.', { count: flaggedCount })}</p>
            )}
            {createdIssues.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {createdIssues.map((iss, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-medium truncate">{iss.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">{tEnum(iss.priority, "priority")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tasks / Contractor — hidden for Grocery Stocking visits */}
        {!isGroceryStocking && (
        <div id="step-tasks" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">{t("Tasks / Contractor")}</p>
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3"><Check className="w-4 h-4 text-muted-foreground" /><h3 className="font-medium text-sm">{t("Follow-up Task")}</h3></div>
            <div className="flex gap-2">
              <Input value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} placeholder={t("e.g. Order replacement pool filter")} className={FIELD} />
              <Button variant="outline" onClick={addFollowUpTask} disabled={!followUpText.trim()} className={BTN}>{t("Add")}</Button>
            </div>
            {taskIds.length > 0 && <p className="text-xs text-emerald-600 mt-2">{t("{count} follow-up task(s) created.", { count: taskIds.length })}</p>}
            <p className="text-xs text-muted-foreground mt-2">{t("For a contractor visit, use the Contractors module from the More menu.")}</p>
            <div className="mt-1">
              {skipped.tasks ? (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, tasks: false }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-primary hover:underline">{t("Skipped — tap to undo")}</button>
              ) : (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, tasks: true }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-muted-foreground hover:underline">{t("Skip if nothing to add")}</button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Expenses / Receipts — hidden for Grocery Stocking visits */}
        {!isGroceryStocking && (
        <div id="step-expenses" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1.5"><Wallet className="w-3 h-3" /> {t("Expenses / Receipts")}</p>
          <div className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-2.5">
            <Input value={expVendor} onChange={(e) => setExpVendor(e.target.value)} placeholder={t("Vendor / description")} className={FIELD} />
            <div className="flex gap-2">
              <Input value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder={t("Amount €")} type="number" className={`flex-1 ${FIELD}`} />
              <Input value={expPaidBy} onChange={(e) => setExpPaidBy(e.target.value)} placeholder={t("Paid by")} className={`flex-1 ${FIELD}`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={expIssueId} onValueChange={setExpIssueId}>
                <SelectTrigger className={FIELD}><SelectValue placeholder={t("Link issue (opt)")} /></SelectTrigger>
                <SelectContent>
                  {issueOptions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={expContractorId} onValueChange={setExpContractorId}>
                <SelectTrigger className={FIELD}><SelectValue placeholder={t("Link contractor (opt)")} /></SelectTrigger>
                <SelectContent>
                  {contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                <span>{expReceipt ? t("Receipt attached") : t("Attach receipt")}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadReceipt(e.target.files?.[0])} />
              </label>
              <Button size="sm" onClick={addExpenseInline} disabled={!expVendor.trim()} className={`ml-auto rounded-full ${BTN_SM}`}>{t("Add expense")}</Button>
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
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, expenses: false }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-primary hover:underline">{t("Skipped — tap to undo")}</button>
              ) : (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, expenses: true }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-muted-foreground hover:underline">{t("Skip if nothing to add")}</button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Owner Update */}
        <div id="step-owner" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> {t("Owner Update")}</p>
          <div className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-2.5">
            <Input value={commSubject} onChange={(e) => setCommSubject(e.target.value)} placeholder={t("Subject e.g. Monthly visit summary")} className={FIELD} />
            <Textarea value={commMessage} onChange={(e) => setCommMessage(e.target.value)} rows={2} placeholder={t("Message to the owner…")} className={AREA} />
            <Button size="sm" onClick={addOwnerUpdateInline} disabled={!commSubject.trim()} className={`rounded-full ${BTN_SM}`}><Send className="w-3.5 h-3.5 mr-1.5" /> {t("Log owner update")}</Button>
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
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, owner: false }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-primary hover:underline">{t("Skipped — tap to undo")}</button>
              ) : (
                <button type="button" onClick={() => setSkipped((s) => ({ ...s, owner: true }))} className="text-xs md:text-sm md:py-1 2xl:text-xs 2xl:py-0 text-muted-foreground hover:underline">{t("Skip if nothing to add")}</button>
              )}
            </div>
          </div>
        </div>

        {/* Finish */}
        <div id="step-finish" className="scroll-mt-28">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">{t("Finish")}</p>
          {visitType === "Grocery Stocking" && (
            <div className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium">{t("Grocery details")}</p>
              <div>
                <Label className="text-xs mb-1.5 block">{t("Owner shopping list / request")}</Label>
                <Textarea value={groceryList} onChange={(e) => setGroceryList(e.target.value)} rows={2} placeholder={t("Items requested by the owner…")} className={AREA} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">{t("Grocery / receipt cost (€)")}</Label>
                <Input type="number" step="0.01" min="0" value={groceryCost} onChange={(e) => setGroceryCost(e.target.value)} placeholder={t("Actual cost of groceries — separate from the €45 service fee")} className={FIELD} />
              </div>
              <p className="text-xs text-muted-foreground">{t("Groceries are paid separately by the owner — keep this cost separate from the €45 + VAT service fee. Attach the receipt photo on the checklist item below.")}</p>
            </div>
          )}
          <div className="mb-4">
            <Label className="text-xs mb-1.5 block">{t("Visit Summary & Recommendations")} <span className="text-emerald-600 font-normal">{t("(shown to owner)")}</span></Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder={t("Overall findings and recommended next steps for the owner…")} className={AREA} />
          </div>
          <div className="mb-4">
            <Label className="text-xs mb-1.5 block">{t("Internal Notes")} <span className="text-rose-600 font-normal">{t("(staff only — never shown to owner)")}</span></Label>
            <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} placeholder={t("Private staff notes. These are NOT included in the owner report.")} className={AREA} />
          </div>

          {/* Billing classification — decided AUTOMATICALLY from entitlement
              data. Included package visits show a read-only badge (no Billable
              checkbox, so nothing can be charged accidentally). ADDITIONAL
              visits show the Billable override, defaulting to checked — staff
              can uncheck before completing for a courtesy visit. */}
          {agreement && isRecurringAgreement(agreement) && (additionalService ? (
            <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={billable} onCheckedChange={(v) => { setBillable(v === true); if (!v) setAdditionalAmount(null); }} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{t("Billable visit")}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {billable
                      ? t("Additional visit outside the package allowance — a charge will be created after you confirm the amount.")
                      : t("Courtesy / No Charge — no customer charge will be created. The visit record, checklist, photos and report are kept.")}
                  </span>
                </span>
              </label>
              <p className="text-[10px] uppercase tracking-wide text-amber-600 mt-2">
                {billable ? t("Additional - Billable") : t("Courtesy - No Charge")}
              </p>
              {/* Charge amount visible/confirmable BEFORE completing — the
                  ledger entry itself is still created only after completion
                  via AdditionalChargeCard (duplicate guard unchanged). */}
              {billable && (
                <AdditionalAmountSection pkg={pkg} value={additionalAmount} onChange={setAdditionalAmount} />
              )}
            </div>
          ) : visitType === recommendedVisitType(pkg) ? (
            <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-500">
                {t("Included in Package")} — {t("Included in the customer's package — no separate charge.")}
              </p>
            </div>
          ) : null)}
        </div>

        {/* Next action card + bottom bar */}
        <div className={`fixed bottom-16 lg:bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 ${sidebarCollapsed ? "lg:left-0" : "lg:left-64"}`}>
          <div className={`space-y-2 ${sidebarCollapsed || activeWide ? "w-full 2xl:mx-auto 2xl:max-w-5xl" : "max-w-2xl mx-auto"}`}>
            <button onClick={() => goToStep(nextStep.target)} className="w-full flex items-center justify-between gap-2 rounded-2xl bg-primary/10 border border-primary/20 px-3 py-2.5 text-left hover:bg-primary/15 transition">
              <div className="flex items-center gap-2 min-w-0">
                <nextStep.icon className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-primary/80">{t("Next step")}</p>
                  <p className="text-sm font-medium text-foreground truncate">{t(nextStep.label)}{nextStep.key === "finish" ? t(" — complete the visit") : ""}</p>
                  {nextStep.hint && <p className="text-[11px] text-muted-foreground">{nextStep.hint}</p>}
                </div>
              </div>
              <span className="text-xs text-primary shrink-0">{t("Go →")}</span>
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={backFromActive} className={`rounded-2xl ${BTN}`}>{t("Back")}</Button>
              <Button
                variant={canComplete ? "default" : "outline"}
                onClick={() => ((canComplete && missingReasons.length === 0 && missingConcernNotes.length === 0) ? completeVisit() : setShowIncomplete(true))}
                disabled={saving}
                className="flex-1 h-12 rounded-2xl text-base">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> {t("Complete Visit")}</>}
              </Button>
            </div>
          </div>
        </div>

        {showIncomplete && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border max-w-sm md:max-w-md 2xl:max-w-sm w-full p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold">{t("Visit incomplete")}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {missingConcernNotes.length > 0
                  ? t("{count} Attention/Emergency item(s) still need an owner-visible observation describing what was found. A private staff note cannot substitute. The visit cannot be completed until each one has one.", { count: missingConcernNotes.length })
                  : inspectionDone
                    ? t("{count} Unable to Check item(s) have no reason noted. The owner report will show the check could not be completed, but not why.", { count: missingReasons.length })
                    : t("There are still unanswered checklist items.")}
              </p>
              {firstBlockerIdx >= 0 && (
                <>
                  <p className="text-sm font-medium text-foreground mb-1 -mt-1">
                    {t("First incomplete: #{number} · {name}", { number: firstBlockerIdx + 1, name: checklistItemDisplay(checklist[firstBlockerIdx].name, lang) })}
                  </p>
                  {missingConcernNotes.length > 0 && (checklist[firstBlockerIdx].notes || "").trim() && !checklist[firstBlockerIdx].owner_visible && (
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("This item has an observation, but it is marked Private (staff only). Open the item and make the observation Owner-visible.")}
                    </p>
                  )}
                </>
              )}
              <div className="flex flex-col gap-2">
                <Button onClick={() => { setShowIncomplete(false); if (firstBlockerIdx >= 0) jumpToItem(firstBlockerIdx); else goToStep("step-inspection"); }} className="rounded-2xl h-11">
                  {firstBlockerIdx >= 0 ? t("Go to item {number}", { number: firstBlockerIdx + 1 }) : t("Continue Checklist")}
                </Button>
                {missingConcernNotes.length === 0 && (
                  <Button variant="outline" onClick={() => { setShowIncomplete(false); completeVisit(); }} className="rounded-2xl h-11">{t("Complete Anyway")}</Button>
                )}
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
            onUploadPhotos={uploadPhotos}
          />
        )}

        {/* Guided Checklist — full-screen presentation over the SAME checklist
            state and update handlers; closing it returns to this active step,
            which keeps the existing review/completion/report flow. */}
        <GuidedChecklistOverlay
          open={guidedOpen}
          onClose={() => setGuidedOpen(false)}
          // Checklist Review → Continue Visit: the Guided Checklist only
          // completes the CHECKLIST portion. Unanswered items → jump to the
          // first item blocking completion (same priority as the completion
          // gate); a completed checklist → the FIRST post-checklist
          // operational section (Meter Readings anchor), so staff continue
          // through the remaining visit fields in normal order before
          // Finish / Complete Visit. Reuses the existing jumpToItem /
          // goToStep navigation — no second workflow, no new requirements.
          onContinue={() => {
            setGuidedOpen(false);
            setTimeout(() => {
              if (firstBlockerIdx >= 0) jumpToItem(firstBlockerIdx);
              else goToStep(isGroceryStocking ? "step-issues" : "step-meters");
            }, 60);
          }}
          checklist={checklist}
          initialIndex={guidedStart}
          context={{ serviceLabel: t(visitTypeLabel(visitType)), propertyName, clientName: clientObj?.name || "" }}
          onChangeItem={updateItem}
          onUploadPhotos={uploadPhotos}
          onRemovePhoto={removePhoto}
          uploading={uploading}
        />
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
          <h2 className="text-xl font-semibold mb-1">{t("Visit Complete ✓")}</h2>
          <p className="text-sm text-muted-foreground">{propertyName} · {visitTypeLabel(visitType)}</p>
          <div className="rounded-2xl border border-border bg-card p-3 text-left text-xs text-muted-foreground space-y-0.5 mt-4 mb-5 inline-block text-left">
            <p>{t("Duration: {start} – {end}", { start: (startTime || "").slice(11, 16), end: (endTime || "").slice(11, 16) })}</p>
            <p>{t("Checklist items: {items} · Findings: {findings} · Issues created: {issues} · Follow-ups: {followUps}", { items: checklist.length, findings: checklist.filter((it) => it.status === "Important" || it.status === "Emergency").length, issues: issueIds.length, followUps: taskIds.length })}</p>
          </div>
        </div>
        {/* Final billing classification — always visible on the completed visit. */}
        {completed?.billing_classification && (
          <div className="mb-4 flex justify-center">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border ${completed.billing_classification === "Included in Package" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : completed.billing_classification === "Additional - Billable" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-sky-500/10 text-sky-600 border-sky-500/20"}`}>
              <Receipt className="w-3.5 h-3.5" /> {t(completed.billing_classification)}
            </span>
          </div>
        )}
        {completed?.billing_classification === "Courtesy - No Charge" && (
          <p className="text-xs text-muted-foreground text-center mb-4">{t("Courtesy visit — no customer charge. The full visit record, checklist, notes, photos and report are kept.")}</p>
        )}
        {/* Additional billable visit: staff must CONFIRM the charge amount —
            no approved price rule exists, so nothing is auto-charged. */}
        {completed?.is_additional_service && completed?.billing_classification !== "Courtesy - No Charge" && (
          <div className="mb-4">
            <AdditionalChargeCard
              visit={completed}
              pkg={pkg}
              clientId={reportClient?.id || properties.find((p) => p.id === propertyId)?.owner_id || ""}
            />
          </div>
        )}
        {/* Special-purpose service (Owner Arrival Preparation, Emergency,
            Owner-Rep Site Visit, Grocery Stocking, Seasonal…): the service
            charge is staff-confirmed AFTER completion — nothing was charged at
            scheduling or start. Same duplicate-safe shared charge logic. */}
        {!completed?.is_additional_service && isSpecialServiceVisit(completed) && (
          <div className="mb-4">
            <SpecialServiceChargeCard
              visit={completed}
              clientId={reportClient?.id || properties.find((p) => p.id === propertyId)?.owner_id || ""}
            />
          </div>
        )}
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
            <Link to={`/visits/${completed.id}`}><MapPin className="w-4 h-4" /> {t("View Completed Visit")}</Link>
          </Button>
          {propertyId && (
            <Button asChild variant="outline" className="rounded-xl gap-1.5 h-10">
              <Link to={`/properties/${propertyId}`}>{t("Back to Property")}</Link>
            </Button>
          )}
          {reportClient?.id && (
            <Button asChild variant="outline" className="rounded-xl gap-1.5 h-10">
              <Link to={`/clients/${reportClient.id}`}>{t("Back to Client")}</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}