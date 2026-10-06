import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Loader2, Save, User, Building2, FileText,
  Lock, Send, CheckCircle2, Copy, MessageCircle, Download, ListChecks,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/ui/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import AgreementStepCustomerProperty from "@/components/agreements/wizard/AgreementStepCustomerProperty";
import AgreementStepServicePrice from "@/components/agreements/wizard/AgreementStepServicePrice";
import AgreementStepReviewSign from "@/components/agreements/wizard/AgreementStepReviewSign";
import AgreementHistory from "@/components/agreements/AgreementHistory";
import ActivateServiceButton from "@/components/agreements/ActivateServiceButton";
import CreateReplacementButton from "@/components/agreements/CreateReplacementButton";
import { buildSentSnapshot } from "@/lib/agreementTerms";
import { downloadSignedAgreementPdf } from "@/lib/agreementDownload";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { athensMediumDateTime } from "@/lib/timezone";
import { PUBLIC_SITE_URL } from "@/lib/siteUrl";

const FROZEN_STATUSES = ["Sent", "Viewed", "Signed"];

const fmt = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

// Returns the suggested next invoice date for a recurring agreement, or "" for One-time.
const addInterval = (dateStr, billingType) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "";
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  if (billingType === "Monthly") dt.setMonth(dt.getMonth() + 1);
  else if (billingType === "Quarterly") dt.setMonth(dt.getMonth() + 3);
  else if (billingType === "Annual") dt.setFullYear(dt.getFullYear() + 1);
  else return "";
  return fmt(dt);
};

const normFreq = (s) => (s || "").trim().toLowerCase();

// Resolve the appropriate Applied Customer Intake to prefill emergency fields
// from, for a NEW agreement draft. Never crosses clients or properties: if the
// client has multiple properties and the selected one does not match an Applied
// intake's property_id, returns null (no prefill) to avoid cross-property leakage.
function resolveAppliedIntakeForPrefill(intakes, selectedPropertyId, clientPropertyCount) {
  const applied = (intakes || []).filter((i) => !i.archived && i.status === "Applied");
  if (applied.length === 0) return null;
  const byNewest = (a, b) => (b.created_date || "").localeCompare(a.created_date || "");
  if (selectedPropertyId) {
    const matching = applied.filter((i) => i.property_id === selectedPropertyId);
    if (matching.length) return matching.sort(byNewest)[0];
    // Older Applied intakes may not have property_id linked yet; only safe to
    // use when the client has a single property (no ambiguity).
    if (clientPropertyCount === 1) return applied.sort(byNewest)[0];
    return null;
  }
  if (clientPropertyCount === 1) return applied.sort(byNewest)[0];
  return null;
}

const STEP_TITLES = ["Customer & Property", "Service & Price", "Review & Sign"];

export default function ServiceAgreement() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, tEnum, lang } = useLanguage();
  const clientId = params.get("client");
  const propertyParam = params.get("property");

  const [step, setStep] = useState(1);
  // A NEW draft created from this screen: the page stays mounted (review/sign
  // flow continues) while the URL switches to /agreements/:id. justCreatedRef
  // stops the load effect from refetching over in-flight state updates.
  const [createdId, setCreatedId] = useState("");
  const justCreatedRef = useRef(false);
  const activeId = id || createdId;
  const isEdit = !!activeId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [client, setClient] = useState(null);
  const [properties, setProperties] = useState([]);
  const [packages, setPackages] = useState([]);
  const [business, setBusiness] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [latestIntake, setLatestIntake] = useState(null);
  // Tracks which emergency fields were auto-populated from the customer's
  // Applied intake (for the "From customer intake — review required" indicator).
  const [intakePrefill, setIntakePrefill] = useState({ max_amount: false, unreachable: false });
  // Collapsible secondary sections — all collapsed by default.
  const [pkgRefOpen, setPkgRefOpen] = useState(false);
  const [intakeRefOpen, setIntakeRefOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [testingOpen, setTestingOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError, setSendError] = useState("");
  const [copied, setCopied] = useState("");
  const [downloadingSigned, setDownloadingSigned] = useState(false);
  // Deliberate price-change capture (price lock, post-audit cleanup).
  const [priceChangeOpen, setPriceChangeOpen] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [priceChangeReason, setPriceChangeReason] = useState("");
  const [priceChangeError, setPriceChangeError] = useState("");
  const [approving, setApproving] = useState(false);
  const [groupVersions, setGroupVersions] = useState([]);
  const [values, setValues] = useState({
    client_id: clientId || "",
    property_id: propertyParam || "",
    service_package_id: "",
    agreed_price: 0,
    billing_type: "Monthly",
    inspection_frequency: "",
    start_date: "",
    renewal_date: "",
    status: "Pending",
    signing_status: "Draft",
    agreement_version: 1,
    included_services_override: "",
    additional_terms: "",
    notes: "",
    next_invoice_date: "",
    created_from_package_price: 0,
    emergency_authorization: "",
    emergency_max_amount: "",
    emergency_unreachable_instructions: "",
    emergency_authorization_confirmed: false,
    terms_template_id: "",
    terms_version: "",
    public_token: "",
    sent_at: "",
    signer_name: "",
    signer_email: "",
    signed_at: "",
    activated_at: "",
    activated_by: "",
    is_test_agreement: false,
    sent_snapshot: null,
  });

  const handleDownloadSigned = async () => {
    if (!values.public_token) return;
    setDownloadingSigned(true);
    try { await downloadSignedAgreementPdf(values.public_token); } catch (e) {}
    setDownloadingSigned(false);
  };
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  // Changing any emergency field resets the staff confirmation, forcing reconfirm.
  const setEmergency = (k, v) => setValues((s) => ({ ...s, [k]: v, emergency_authorization_confirmed: false }));

  // Persist the test-agreement flag immediately (independent of Save) so the
  // backend send gate reads the authoritative value. TEST mode is a staff-only
  // QA toggle; it never marks the terms template active/legal_approved and never
  // affects production agreements (which stay false).
  const handleToggleTestMode = async (value) => {
    set("is_test_agreement", value);
    if (isEdit && activeId) {
      try { await base44.entities.PropertyServiceAgreement.update(activeId, { is_test_agreement: !!value }); } catch (e) {}
    }
  };

  useEffect(() => {
    if (justCreatedRef.current) { justCreatedRef.current = false; return; }
    (async () => {
      try {
        let cid = clientId;
        let loaded = null;
        if (id) {
          loaded = await base44.entities.PropertyServiceAgreement.get(id);
          cid = loaded.client_id || clientId;
        }
        const [cl, allProps, allPkgs, allBiz, allTemplates, allIntakes] = await Promise.all([
          cid ? base44.entities.Client.get(cid) : Promise.resolve(null),
          base44.entities.Property.list("-created_date", 500),
          base44.entities.ServicePackage.list("-created_date", 200),
          base44.entities.BusinessSettings.list("-created_date", 10),
          base44.entities.AgreementTermsTemplate.list("-version", 50),
          cid ? base44.entities.CustomerIntake.list("-created_date", 200) : Promise.resolve([]),
        ]);
        setClient(cl);
        const clientProps = (allProps || []).filter((p) => p.owner_id === cid && !p.archived);
        setProperties(clientProps);
        setPackages((allPkgs || []).filter((p) => p.active !== false));
        setBusiness((allBiz || [])[0] || null);
        setTemplates(allTemplates || []);
        const clientIntakes = (allIntakes || []).filter((i) => i.client_id === cid && !i.archived);
        const latest = clientIntakes.slice().sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0] || null;
        setLatestIntake(latest);

        if (id && loaded) {
          setValues({
            client_id: loaded.client_id || "",
            property_id: loaded.property_id || "",
            service_package_id: loaded.service_package_id || "",
            agreed_price: loaded.agreed_price ?? 0,
            billing_type: loaded.billing_type || "Monthly",
            inspection_frequency: loaded.inspection_frequency || "",
            start_date: loaded.start_date || "",
            renewal_date: loaded.renewal_date || "",
            status: loaded.status || "Active",
            signing_status: loaded.signing_status,
            agreement_version: loaded.agreement_version ?? 1,
            included_services_override: loaded.included_services_override || "",
            additional_terms: loaded.additional_terms || "",
            notes: loaded.notes || "",
            next_invoice_date: loaded.next_invoice_date || "",
            created_from_package_price: loaded.created_from_package_price ?? 0,
            previous_agreed_price: loaded.previous_agreed_price ?? null,
            recommended_price: loaded.recommended_price ?? null,
            price_override_reason: loaded.price_override_reason || "",
            price_approved_at: loaded.price_approved_at || "",
            price_approved_by: loaded.price_approved_by || "",
            pricing_review_status: loaded.pricing_review_status || "",
            emergency_authorization: loaded.emergency_authorization || "",
            emergency_max_amount: loaded.emergency_max_amount ?? "",
            emergency_unreachable_instructions: loaded.emergency_unreachable_instructions || "",
            emergency_authorization_confirmed: loaded.emergency_authorization_confirmed ?? false,
            terms_template_id: loaded.terms_template_id || "",
            terms_version: loaded.terms_version || "",
            public_token: loaded.public_token || "",
            sent_at: loaded.sent_at || "",
            signer_name: loaded.signer_name || "",
            signer_email: loaded.signer_email || "",
            signed_at: loaded.signed_at || "",
            activated_at: loaded.activated_at || "",
            activated_by: loaded.activated_by || "",
            is_test_agreement: loaded.is_test_agreement === true,
            sent_snapshot: loaded.sent_snapshot || null,
          });
          // Sent/signed agreements open directly on Review & Sign.
          setStep(FROZEN_STATUSES.includes(loaded.signing_status) || loaded.status === "Active" ? 3 : 1);
          // Load version history for the agreement group (legacy w/o group id: just this version).
          if (loaded.agreement_group_id) {
            try {
              const gv = await base44.entities.PropertyServiceAgreement.filter(
                { agreement_group_id: loaded.agreement_group_id }, "-agreement_version", 500,
              );
              setGroupVersions((gv || []).filter((a) => !a.archived));
            } catch (e) { setGroupVersions([loaded]); }
          } else {
            setGroupVersions([loaded]);
          }
        } else {
          // NEW draft — prefill emergency max amount + owner-unreachable
          // instructions from the appropriate Applied Customer Intake. This is a
          // staff CONVENIENCE copy only — it is NOT confirmation. The customer's
          // value takes precedence. Emergency Authorization is never invented
          // from intake notes; it is left blank for staff to complete.
          // Confirmation stays unchecked until staff explicitly review and confirm.
          const draftPropertyId = propertyParam || (clientProps.length === 1 ? clientProps[0].id : "");
          const prefillIntake = resolveAppliedIntakeForPrefill(clientIntakes, draftPropertyId, clientProps.length);
          const pf = (prefillIntake && prefillIntake.payload) || {};
          const intakeMax = pf.max_authorize_amount;
          const intakeMaxNum =
            intakeMax !== undefined && intakeMax !== null && intakeMax !== "" && !isNaN(Number(intakeMax))
              ? Number(intakeMax)
              : "";
          const intakeInstr = pf.unreachable_instructions ? String(pf.unreachable_instructions) : "";
          setValues((s) => ({
            ...s,
            property_id: draftPropertyId,
            emergency_max_amount: intakeMaxNum,
            emergency_unreachable_instructions: intakeInstr,
            emergency_authorization: "",
            emergency_authorization_confirmed: false,
          }));
          setIntakePrefill({
            max_amount: intakeMaxNum !== "",
            unreachable: !!intakeInstr,
          });
        }
      } catch (e) {}
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const selectedPackage = packages.find((p) => p.id === values.service_package_id);
  const selectedProperty = properties.find((p) => p.id === values.property_id) || null;
  // Use the most recent terms template for the preview.
  const selectedTemplate = templates[0] || null;
  const isFrozen = FROZEN_STATUSES.includes(values.signing_status) || values.status === "Active";
  const canActivate = isEdit && values.status === "Pending" && values.signing_status === "Signed";
  const isActive = isEdit && values.status === "Active" && values.signing_status === "Signed";
  const hasActiveSibling = (groupVersions || []).some((a) => a.id !== activeId && a.status === "Active");
  const canReplace = isEdit && (["Sent", "Viewed", "Signed", "Declined"].includes(values.signing_status) || values.status === "Active");
  const isDeclinedReplace = isEdit && values.signing_status === "Declined";
  // Emergency authorization is only "confirmed" when staff have actually filled
  // the material emergency fields. A checked box with blank fields must not
  // produce a false confirmation state.
  const emergencyFieldsComplete =
    !!(values.emergency_authorization || "").trim() &&
    values.emergency_max_amount !== "" &&
    values.emergency_max_amount !== null &&
    !isNaN(Number(values.emergency_max_amount)) &&
    !!(values.emergency_unreachable_instructions || "").trim();
  const emergencyConfirmedEffective = emergencyFieldsComplete && !!values.emergency_authorization_confirmed;

  // Frequency mismatch (informational warning on step 2; enforced at send).
  const freqMismatch = !!(
    selectedPackage &&
    selectedPackage.recurring !== "One-time" &&
    (selectedPackage.inspection_frequency || "").trim() &&
    (values.inspection_frequency || "").trim() &&
    normFreq(values.inspection_frequency) !== normFreq(selectedPackage.inspection_frequency)
  );

  // Production legal-approval gate: a non-test agreement still requires an
  // active + legally-approved terms template (UNCHANGED). A TEST agreement
  // bypasses ONLY the active/legal_approved checks — it still needs a template
  // to build the snapshot, and the emergency-confirmation gate still applies.
  const sendDisabledReason =
    values.signing_status !== "Draft"
      ? null
      : !emergencyConfirmedEffective
        ? t("Confirm the emergency authorization before sending.")
        : !selectedTemplate
          ? t("No agreement terms template is available.")
          : freqMismatch && !(values.included_services_override || "").trim()
            ? t("Visit frequency differs from the package frequency. Use the package frequency, or record the agreed customer-specific service changes first.")
            : !values.is_test_agreement && selectedTemplate.active !== true
              ? t("No active legally-approved agreement terms template is available.")
              : !values.is_test_agreement && selectedTemplate.legal_approved !== true
                ? t("The selected agreement terms have not been legally approved for customer use.")
                : null;
  const hasExtra = !!(
    values.included_services_override || values.additional_terms ||
    values.notes || values.next_invoice_date
  );

  // Live preview snapshot — recomputed from the current draft.
  const liveSnapshot = useMemo(() => {
    if (!selectedPackage || !selectedProperty || !selectedTemplate) return null;
    return buildSentSnapshot({
      business: business || {},
      client: client || {},
      property: selectedProperty,
      servicePackage: selectedPackage,
      agreement: values,
      template: selectedTemplate,
      vatRate: business?.vat_rate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, client, selectedProperty, selectedPackage, selectedTemplate, values.agreed_price, values.billing_type, values.inspection_frequency, values.start_date, values.renewal_date, values.included_services_override, values.additional_terms, values.next_invoice_date, values.emergency_authorization, values.emergency_max_amount, values.emergency_unreachable_instructions, values.is_test_agreement]);

  // For sent/signed (frozen) agreements, display the stored frozen snapshot —
  // never a rebuild from current settings.
  const previewSnapshot = isFrozen && values.sent_snapshot ? values.sent_snapshot : liveSnapshot;

  const publicLink = values.public_token
    ? `${PUBLIC_SITE_URL}/agreement/${values.public_token}`
    : (sendResult && sendResult.public_link) || "";

  // ---- Save (draft) ----
  // Persists the current edits and STAYS in the review/signing flow. Returns
  // the agreement id (creating the record first for a brand-new draft) so the
  // send flow can guarantee the reviewed values are saved before freezing.
  const persist = async () => {
    if (!values.property_id || !values.service_package_id) {
      setSaveError(t("Select a property and a service package first."));
      return null;
    }
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        client_id: values.client_id || client?.id || "",
        property_id: values.property_id,
        service_package_id: values.service_package_id,
        agreed_price: Number(values.agreed_price) || 0,
        billing_type: values.billing_type,
        inspection_frequency: values.inspection_frequency,
        start_date: values.start_date || null,
        renewal_date: values.renewal_date || null,
        status: values.status,
        included_services_override: values.included_services_override,
        additional_terms: values.additional_terms,
        notes: values.notes,
        next_invoice_date: values.next_invoice_date || null,
        created_from_package_price: Number(values.created_from_package_price) || 0,
        emergency_authorization: values.emergency_authorization || "",
        emergency_max_amount: values.emergency_max_amount === "" ? null : Number(values.emergency_max_amount),
        emergency_unreachable_instructions: values.emergency_unreachable_instructions || "",
        emergency_authorization_confirmed: !!values.emergency_authorization_confirmed,
        is_test_agreement: !!values.is_test_agreement,
        terms_template_id: selectedTemplate?.id || "",
        terms_version: selectedTemplate ? String(selectedTemplate.version) : "",
      };
      let savedId = activeId;
      if (isEdit) {
        if (values.signing_status) payload.signing_status = values.signing_status;
        if (values.agreement_version) payload.agreement_version = values.agreement_version;
        // Pricing-approval fields round-trip on edit; they only change when a
        // deliberate price change was recorded via the Change Price dialog.
        if (values.previous_agreed_price != null) payload.previous_agreed_price = Number(values.previous_agreed_price) || 0;
        if (values.price_override_reason) payload.price_override_reason = values.price_override_reason;
        if (values.price_approved_at) payload.price_approved_at = values.price_approved_at;
        if (values.price_approved_by) payload.price_approved_by = values.price_approved_by;
        if (values.pricing_review_status) payload.pricing_review_status = values.pricing_review_status;
        await base44.entities.PropertyServiceAgreement.update(activeId, payload);
      } else {
        payload.signing_status = "Draft";
        payload.agreement_version = 1;
        const created = await base44.entities.PropertyServiceAgreement.create(payload);
        savedId = created.id;
        justCreatedRef.current = true;
        setCreatedId(savedId);
        setValues((s) => ({ ...s, client_id: payload.client_id }));
        // Stay in the flow: switch the URL to the created draft without leaving.
        navigate(`/agreements/${savedId}`, { replace: true });
      }
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
      setSaving(false);
      return savedId;
    } catch (e) {
      setSaving(false);
      setSaveError(e && e.message ? e.message : t("Saving the draft failed. Please try again."));
      return null;
    }
  };

  const handleSend = async () => {
    setSendError("");
    setSendResult(null);
    setSending(true);
    // Guarantee the customer receives exactly what staff reviewed: the latest
    // edits are saved (server-side authoritative) BEFORE the signing link is
    // created. A failed save aborts the send with a clear error.
    const savedId = await persist();
    if (!savedId) {
      if (!saveError) setSaveError(t("Saving the draft failed — the signing link was not created. Please try again."));
      setSending(false);
      return;
    }
    try {
      const res = await base44.functions.invoke("agreementSend", { action: "send", agreement_id: savedId });
      const data = res && res.data ? res.data : res;
      if (data && data.ok) {
        const token = data.public_link ? String(data.public_link).split("/agreement/")[1] || "" : "";
        setValues((s) => ({
          ...s,
          signing_status: "Sent",
          public_token: token || s.public_token,
          sent_at: data.sent_at || "",
        }));
        setSendResult({ public_link: data.public_link, sent_at: data.sent_at });
      } else {
        const msg = (data && data.error) || t("Send failed.");
        const detail = data && Array.isArray(data.details) ? " " + data.details.join(" ") : "";
        setSendError(msg + detail);
      }
    } catch (e) {
      const data = e && e.response && e.response.data ? e.response.data : null;
      const msg = (data && data.error) || (e && e.message) || t("Send failed.");
      const detail = data && Array.isArray(data.details) ? " " + data.details.join(" ") : "";
      setSendError(msg + detail);
    }
    setSending(false);
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    } catch (e) {}
  };

  const copyMessage = () => {
    const msg = `Hello${client && client.name ? " " + client.name : ""}, your service agreement is ready for your signature: ${publicLink}`;
    copyToClipboard(msg, "message");
  };

  // Athens-local display formatting (language-aware); stored timestamps unchanged.
  const formatSentAt = (iso) => {
    if (!iso) return "";
    return athensMediumDateTime(iso, lang);
  };

  const onPackageChange = (pid) => {
    const pkg = packages.find((p) => p.id === pid);
    if (!pkg) { set("service_package_id", pid); return; }
    setValues((s) => {
      const newBilling = pkg.billing_type || s.billing_type;
      const billingChanged = newBilling !== s.billing_type;
      // Recompute next_invoice_date only when the billing type actually changes.
      const nextInvoice = billingChanged
        ? (s.start_date && newBilling !== "One-time" ? addInterval(s.start_date, newBilling) : (newBilling === "One-time" ? "" : s.next_invoice_date))
        : s.next_invoice_date;
      // PRICE LOCK: an EXISTING agreement's agreed price is never replaced by
      // the package's CURRENT price — selecting/changing the package keeps the
      // customer's locked price. Only the explicit "Change Price" action can
      // change it (with reason/approver/timestamp captured). New drafts still
      // prefill from the package as a starting point.
      return {
        ...s,
        service_package_id: pid,
        agreed_price: isEdit ? s.agreed_price : (pkg.standard_price ?? s.agreed_price),
        billing_type: newBilling,
        inspection_frequency: pkg.inspection_frequency || s.inspection_frequency,
        created_from_package_price: isEdit ? s.created_from_package_price : (pkg.standard_price ?? 0),
        next_invoice_date: nextInvoice,
      };
    });
  };

  // ---- Deliberate price change (explicit staff action) ----
  const openPriceChange = () => {
    setNewPrice(values.agreed_price != null ? String(values.agreed_price) : "");
    setPriceChangeReason("");
    setPriceChangeError("");
    setPriceChangeOpen(true);
  };

  const confirmPriceChange = async () => {
    const final = parseFloat(newPrice);
    if (!Number.isFinite(final) || final <= 0) { setPriceChangeError(t("Enter a valid price above €0.")); return; }
    if (!priceChangeReason.trim()) { setPriceChangeError(t("A reason is required for a price change.")); return; }
    setApproving(true);
    let meName = "";
    try { const me = await base44.auth.me(); meName = me?.full_name || me?.email || ""; } catch (e) {}
    setValues((s) => ({
      ...s,
      previous_agreed_price: Number(values.agreed_price) || 0,
      agreed_price: final,
      price_override_reason: priceChangeReason.trim(),
      price_approved_at: new Date().toISOString(),
      price_approved_by: meName,
      pricing_review_status: "Manual Override",
    }));
    setApproving(false);
    setPriceChangeOpen(false);
  };

  const onStartDateChange = (v) => {
    // Changing Start Date explicitly recomputes the suggested next invoice date.
    setValues((s) => ({
      ...s,
      start_date: v,
      next_invoice_date: v && s.billing_type !== "One-time" ? addInterval(v, s.billing_type) : "",
    }));
  };

  const onBillingTypeChange = (v) => {
    // Changing Billing Type explicitly recomputes the suggested next invoice date.
    setValues((s) => ({
      ...s,
      billing_type: v,
      next_invoice_date: v === "One-time" ? "" : (s.start_date ? addInterval(s.start_date, v) : s.next_invoice_date),
    }));
  };

  const canAdvance = step === 1 ? !!values.property_id : step === 2 ? !!values.service_package_id : false;

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;

  const backTo = client ? `/clients/${client.id}` : "/clients";

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-16 lg:pb-6">
        <PageBackButton fallback={backTo} className="mb-1" />
        <h1 className="text-xl font-semibold">{isEdit ? t("Edit Service Agreement") : t("New Service Agreement")}</h1>

        {/* Frozen banner */}
        {isFrozen && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mt-3 mb-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">{t("This agreement version has been sent and is frozen.")}</p>
              <p className="text-xs text-amber-600/90 mt-0.5">{t("Use “Create Replacement Version” below to draft a new version; this version's signed terms remain immutable.")}</p>
            </div>
          </div>
        )}

        {!client ? (
          <EmptyState icon={User} title={t("No client selected")} description={t("Open this screen from a client's hub.")} />
        ) : properties.length === 0 ? (
          <EmptyState icon={Building2} title={t("No properties for this client")} description={t("Add a property before creating a service agreement.")}
            action={<Link to={`/properties?add=1&owner=${client.id}`}><Button size="sm">{t("Add Property")}</Button></Link>} />
        ) : (
          <>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-3 mb-4">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { if (n < step || (n === step)) setStep(n); }}
                  className={`flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-medium border transition ${
                    step === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : n < step
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                        : "bg-background text-muted-foreground border-border"
                  }`}
                >
                  <span>{n}</span>
                  <span className="hidden sm:inline">{t(STEP_TITLES[n - 1])}</span>
                </button>
              ))}
            </div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              {t("Step {n} of 3 — {title}", { n: step, title: t(STEP_TITLES[step - 1]) })}
            </h2>

            {/* Step content — values live in page state, so they are retained
                when moving between screens. */}
            {step === 1 && (
              <AgreementStepCustomerProperty
                client={client}
                properties={properties}
                values={values}
                set={set}
                isFrozen={isFrozen}
              />
            )}

            {step === 2 && (
              <AgreementStepServicePrice
                values={values}
                set={set}
                setEmergency={setEmergency}
                packages={packages}
                selectedPackage={selectedPackage}
                onPackageChange={onPackageChange}
                onBillingTypeChange={onBillingTypeChange}
                onStartDateChange={onStartDateChange}
                isFrozen={isFrozen}
                isEdit={isEdit}
                freqMismatch={freqMismatch}
                latestIntake={latestIntake}
                intakePrefill={intakePrefill}
                emergencyFieldsComplete={emergencyFieldsComplete}
                emergencyConfirmedEffective={emergencyConfirmedEffective}
                pkgRefOpen={pkgRefOpen}
                intakeRefOpen={intakeRefOpen}
                advancedOpen={advancedOpen}
                additionalOpen={additionalOpen}
                hasExtra={hasExtra}
                togglePkgRef={() => setPkgRefOpen((o) => !o)}
                toggleIntakeRef={() => setIntakeRefOpen((o) => !o)}
                toggleAdvanced={() => setAdvancedOpen((o) => !o)}
                toggleAdditional={() => setAdditionalOpen((o) => !o)}
                openPriceChange={openPriceChange}
              />
            )}

            {step === 3 && (
              <AgreementStepReviewSign
                values={values}
                client={client}
                selectedProperty={selectedProperty}
                selectedPackage={selectedPackage}
                business={business}
                previewSnapshot={previewSnapshot}
                selectedTemplate={selectedTemplate}
                emergencyConfirmedEffective={emergencyConfirmedEffective}
                showPreview={showPreview}
                setShowPreview={setShowPreview}
                saving={saving}
                saveError={saveError}
                draftSaved={draftSaved}
                onSaveDraft={persist}
                sending={sending}
                sendError={sendError}
                handleSend={handleSend}
                sendDisabledReason={sendDisabledReason}
                testingOpen={testingOpen}
                setTestingOpen={setTestingOpen}
                handleToggleTestMode={handleToggleTestMode}
              />
            )}

            {/* Previous / Next navigation */}
            <div className="flex items-center justify-between gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="gap-1.5 min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" /> {t("Previous")}
              </Button>
              {step < 3 ? (
                <Button
                  onClick={() => setStep((s) => Math.min(3, s + 1))}
                  disabled={!canAdvance}
                  className="gap-1.5 min-h-[44px]"
                >
                  {t("Next")} <ArrowRight className="w-4 h-4" />
                </Button>
              ) : <span className="text-xs text-muted-foreground hidden sm:block">{t("Review & Sign")}</span>}
            </div>

            {/* Sent / Viewed panel */}
            {isEdit && (values.signing_status === "Sent" || values.signing_status === "Viewed") && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 mt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700">{values.signing_status === "Viewed" ? t("Customer viewed the agreement") : t("Sent for signature")}</p>
                </div>
                {values.sent_at && <p className="text-xs text-muted-foreground">{t("Sent {date}", { date: formatSentAt(values.sent_at) })}</p>}
                {publicLink && (
                  <div className="space-y-2">
                    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs break-all">{publicLink}</div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(publicLink, "link")} className="gap-1.5">
                        <Copy className="w-4 h-4" /> {copied === "link" ? t("Copied") : t("Copy Link")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={copyMessage} className="gap-1.5">
                        <MessageCircle className="w-4 h-4" /> {copied === "message" ? t("Copied") : t("Copy Message")}
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{values.signing_status === "Viewed" ? t("Customer opened the agreement link — awaiting signature.") : t("Awaiting customer signature.")}</p>
              </div>
            )}

            {/* Signed panel (Pending/Signed = activation pending; Active/Signed = active) */}
            {isEdit && values.signing_status === "Signed" && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-1.5 mt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700">{isActive ? t("Active Service Agreement") : t("Agreement signed")}</p>
                </div>
                <p className="text-xs text-muted-foreground">{t("Version {version} · Terms {terms}", { version: values.agreement_version, terms: values.terms_version || "—" })}</p>
                {values.signer_name && <p className="text-xs text-muted-foreground">{t("Signed by: {name}", { name: values.signer_name })}</p>}
                {values.signed_at && <p className="text-xs text-muted-foreground">{t("Signed {date}", { date: formatSentAt(values.signed_at) })}</p>}
                {isActive && values.activated_at && (
                  <p className="text-xs text-muted-foreground">
                    {values.activated_by
                      ? t("Activated {date} by {by}", { date: formatSentAt(values.activated_at), by: values.activated_by })
                      : t("Activated {date}", { date: formatSentAt(values.activated_at) })}
                  </p>
                )}
                {values.signed_pdf_url && values.public_token && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button type="button" onClick={handleDownloadSigned} disabled={downloadingSigned} className="inline-flex items-center gap-1.5 h-8 rounded-md border border-input bg-transparent px-3 text-xs font-medium hover:bg-accent disabled:opacity-50">
                      {downloadingSigned ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} {t("Download Signed PDF")}
                    </button>
                  </div>
                )}
                {canActivate && (
                  <div className="pt-2">
                    <ActivateServiceButton agreementId={activeId} isReplacement={hasActiveSibling} onActivated={() => navigate(0)} />
                  </div>
                )}
                {canActivate && (
                  <p className="text-xs text-muted-foreground pt-1">{t("Activation pending — review and activate the service when ready. Signing does not activate service automatically.")}</p>
                )}
                {isActive && (
                  <p className="text-xs text-muted-foreground pt-1">{t("This is the current operational service agreement. To change terms, create a replacement version below.")}</p>
                )}
                {isActive && (
                  <div className="pt-2">
                    <CreateReplacementButton agreementId={activeId} />
                  </div>
                )}
              </div>
            )}

            {/* Replacement / revised action for frozen non-active versions (Sent/Viewed/Signed-pending/Declined) */}
            {canReplace && !isActive && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2 mt-6">
                <p className="text-sm font-medium">{t("Change customer-facing terms")}</p>
                <p className="text-xs text-muted-foreground">{t("This version is frozen. Create a new editable draft version to change terms; this version is preserved as permanent history.")}</p>
                <CreateReplacementButton agreementId={activeId} label={isDeclinedReplace ? "Create Revised Agreement" : "Create Replacement Version"} />
              </div>
            )}

            {/* Version history */}
            {isEdit && groupVersions.length > 0 && (
              <div className="mt-6">
                <AgreementHistory versions={groupVersions} currentId={activeId} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Deliberate price-change capture (existing agreements only) */}
      {isEdit && (
        <Dialog open={priceChangeOpen} onOpenChange={setPriceChangeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("Change Agreed Price")}</DialogTitle>
              <DialogDescription>
                {t("This is a deliberate, approved price change for this customer. The previous price, new price, reason, approver and date/time are recorded on the agreement.")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {t("Current agreed price:")} <span className="font-medium">€{(Number(values.agreed_price) || 0).toFixed(2)} + VAT</span>
              </div>
              <div>
                <Label className="mb-1.5 block">{t("New agreed price (€, excl. VAT) *")}</Label>
                <Input className="h-11" type="number" min="0" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block">{t("Reason for the price change *")}</Label>
                <Textarea rows={2} value={priceChangeReason} onChange={(e) => setPriceChangeReason(e.target.value)} placeholder={t("e.g. Package change agreed with owner; annual price review…")} />
              </div>
              {priceChangeError && <p className="text-xs text-destructive">{priceChangeError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" className="h-11" onClick={() => setPriceChangeOpen(false)}>{t("Cancel")}</Button>
              <Button className="h-11" onClick={confirmPriceChange} disabled={approving}>
                {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Record Approved Change")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}