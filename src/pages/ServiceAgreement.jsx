import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Package, Loader2, Save, User, Building2, FileText,
  ChevronDown, ChevronRight, Eye, Lock, AlertTriangle, Send,
  CheckCircle2, Copy, MessageCircle, Download,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import EmptyState from "@/components/ui/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { buildSentSnapshot } from "@/lib/agreementTerms";
import EmergencyAuthSection from "@/components/agreements/EmergencyAuthSection";
import IntakeReferenceCard from "@/components/agreements/IntakeReferenceCard";
import AgreementPreview from "@/components/agreements/AgreementPreview";
import { downloadSignedAgreementPdf } from "@/lib/agreementDownload";
import ActivateServiceButton from "@/components/agreements/ActivateServiceButton";
import CreateReplacementButton from "@/components/agreements/CreateReplacementButton";
import TestAgreementControl from "@/components/agreements/TestAgreementControl";
import AgreementHistory from "@/components/agreements/AgreementHistory";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { athensMediumDateTime } from "@/lib/timezone";
import { PUBLIC_SITE_URL } from "@/lib/siteUrl";

const BILLING_TYPES = ["One-time", "Monthly", "Quarterly", "Annual"];
// Pending is the default for NEW agreements. Legacy agreements keep their stored status.
const STATUSES = ["Pending", "Active", "Paused", "Ended", "Cancelled"];
const FROZEN_STATUSES = ["Sent", "Viewed", "Signed"];
const FREQUENCY_OPTS = ["Weekly", "Twice Weekly", "Monthly", "As Needed"];

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

export default function ServiceAgreement() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, tEnum, lang } = useLanguage();
  const clientId = params.get("client");
  const propertyParam = params.get("property");
  const isEdit = !!id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState(null);
  const [properties, setProperties] = useState([]);
  const [packages, setPackages] = useState([]);
  const [business, setBusiness] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [latestIntake, setLatestIntake] = useState(null);
  // Tracks which emergency fields were auto-populated from the customer's
  // Applied intake (for the "From customer intake — review required" indicator).
  const [intakePrefill, setIntakePrefill] = useState({ max_amount: false, unreachable: false });
  const [additionalOpen, setAdditionalOpen] = useState(false);
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
    if (isEdit && id) {
      try { await base44.entities.PropertyServiceAgreement.update(id, { is_test_agreement: !!value }); } catch (e) {}
    }
  };

  useEffect(() => {
    (async () => {
      try {
        let cid = clientId;
        let loaded = null;
        if (isEdit) {
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

        if (isEdit && loaded) {
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
          });
          // Auto-open Additional Details if any of those fields already contain data.
          const hasExtra = !!(
            loaded.included_services_override || loaded.additional_terms ||
            loaded.notes || loaded.next_invoice_date
          );
          setAdditionalOpen(hasExtra);
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
          // staff CONVENIENCE copy only — it is NOT confirmation. The €300
          // company suggestion remains available but the customer's value takes
          // precedence. Emergency Authorization is never invented from intake
          // notes; it is left blank for staff to complete. Confirmation stays
          // unchecked until staff explicitly review and confirm.
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
  // Use the most recent terms template for the preview (V1 currently DRAFT).
  const selectedTemplate = templates[0] || null;
  const isFrozen = FROZEN_STATUSES.includes(values.signing_status) || values.status === "Active";
  const canActivate = isEdit && values.status === "Pending" && values.signing_status === "Signed";
  const isActive = isEdit && values.status === "Active" && values.signing_status === "Signed";
  const hasActiveSibling = (groupVersions || []).some((a) => a.id !== id && a.status === "Active");
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

  // Production legal-approval gate: a non-test agreement still requires an
  // active + legally-approved terms template (UNCHANGED). A TEST agreement
  // bypasses ONLY the active/legal_approved checks — it still needs a template
  // to build the snapshot, and the emergency-confirmation gate (#3) still applies.
  const sendDisabledReason = !isEdit
    ? null
    : values.signing_status !== "Draft"
      ? null
      : !emergencyConfirmedEffective
        ? t("Confirm the emergency authorization before sending.")
        : !selectedTemplate
          ? t("No agreement terms template is available.")
          : !values.is_test_agreement && selectedTemplate.active !== true
            ? t("No active legally-approved agreement terms template is available.")
            : !values.is_test_agreement && selectedTemplate.legal_approved !== true
              ? t("The selected agreement terms have not been legally approved for customer use.")
              : null;
  const hasExtra = !!(
    values.included_services_override || values.additional_terms ||
    values.notes || values.next_invoice_date
  );

  // Live preview snapshot — never frozen, always recomputed from current draft.
  const snapshot = useMemo(() => {
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
  }, [business, client, selectedProperty, selectedPackage, values, selectedTemplate]);

  const publicLink = values.public_token
    ? `${PUBLIC_SITE_URL}/agreement/${values.public_token}`
    : (sendResult && sendResult.public_link) || "";

  const handleSend = async () => {
    if (!isEdit || !id) return;
    setSending(true);
    setSendError("");
    try {
      const res = await base44.functions.invoke("agreementSend", { action: "send", agreement_id: id });
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
  // The only way an existing agreement's locked price changes. Records the
  // previous price, new price, reason, approver and date/time using the
  // agreement's existing pricing-approval fields — no second approval system.
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

  const save = async () => {
    if (!values.property_id || !values.service_package_id) return;
    setSaving(true);
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
      // Preserve signing_status for edit; set Draft for new.
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
      } else {
        payload.signing_status = "Draft";
        payload.agreement_version = 1;
      }
      if (isEdit) {
        await base44.entities.PropertyServiceAgreement.update(id, payload);
      } else {
        await base44.entities.PropertyServiceAgreement.create(payload);
      }
      const targetClient = payload.client_id || client?.id;
      navigate(`/clients/${targetClient}`);
    } catch (e) { setSaving(false); }
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;

  const backTo = client ? `/clients/${client.id}` : "/clients";

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-28 lg:pb-6">
        <PageBackButton fallback={backTo} className="mb-1" />
        <h1 className="text-xl font-semibold mb-4">{isEdit ? t("Edit Service Agreement") : t("New Service Agreement")}</h1>

        {/* Frozen banner */}
        {isFrozen && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4 flex items-start gap-3">
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
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">{t("Client")}</p>
              <p className="font-medium">{client.name}</p>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Property")}</Label>
              {properties.length === 1 ? (
                <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">{properties[0].name}</div>
              ) : (
                <Select value={values.property_id} onValueChange={(v) => set("property_id", v)} disabled={isFrozen}>
                  <SelectTrigger><SelectValue placeholder={t("Select property")} /></SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Service Package")}</Label>
              <Select value={values.service_package_id} onValueChange={onPackageChange} disabled={isFrozen}>
                <SelectTrigger><SelectValue placeholder={t("Select a package")} /></SelectTrigger>
                <SelectContent>
                  {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedPackage && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Package defaults (reference)")}</p>
                </div>
                <p className="text-sm font-medium">{selectedPackage.name}</p>
                {selectedPackage.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{selectedPackage.description}</p>}
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>{t("Standard price:")} <span className="text-foreground">€{(selectedPackage.standard_price || 0).toFixed(2)} + VAT</span></div>
                  <div>{t("Billing:")} <span className="text-foreground">{tEnum(selectedPackage.billing_type)}</span></div>
                  <div>{t("Visit duration:")} <span className="text-foreground">{selectedPackage.visit_duration || "—"}</span></div>
                  <div>{t("Frequency:")} <span className="text-foreground">{selectedPackage.inspection_frequency ? t(selectedPackage.inspection_frequency) : "—"}</span></div>
                  <div className="col-span-2">{t("VAT:")} <span className="text-foreground">{tEnum(selectedPackage.vat_setting)}</span></div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Agreement terms (customer-specific)")}</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Agreed Price (€)")}</Label>
                  {isEdit ? (
                    <>
                      <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm flex items-center justify-between gap-2 min-h-[44px]">
                        <span className="font-medium truncate">€{(Number(values.agreed_price) || 0).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">+ VAT</span></span>
                        {!isFrozen && (
                          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={openPriceChange}>{t("Change Price")}</Button>
                        )}
                      </div>
                      {values.previous_agreed_price != null && Number(values.previous_agreed_price) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{t("Previous agreed price: €{amount}", { amount: Number(values.previous_agreed_price).toFixed(2) })}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{t("Locked at approval — changing the package never changes this price.")}</p>
                        </>
                        ) : (
                        <>
                        <Input type="number" step="0.01" value={values.agreed_price ?? ""} onChange={(e) => set("agreed_price", e.target.value)} disabled={isFrozen} />
                        <p className="text-xs text-muted-foreground mt-1">{t("Base price before VAT. Prefer the Service & Pricing Assessment flow for governed pricing.")}</p>
                    </>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Billing Type")}</Label>
                  <Select value={values.billing_type} onValueChange={onBillingTypeChange} disabled={isFrozen}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BILLING_TYPES.map((o) => <SelectItem key={o} value={o}>{tEnum(o)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Visit Frequency")}</Label>
                <Input value={values.inspection_frequency || ""} onChange={(e) => set("inspection_frequency", e.target.value)} placeholder={t("e.g. Weekly")} list="freq-opts" disabled={isFrozen} />
                <datalist id="freq-opts">{FREQUENCY_OPTS.map((o) => <option key={o} value={o} />)}</datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Start Date")}</Label>
                  <Input type="date" className="min-w-0" value={values.start_date || ""} onChange={(e) => onStartDateChange(e.target.value)} disabled={isFrozen} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Renewal Date")}</Label>
                  <Input type="date" className="min-w-0" value={values.renewal_date || ""} onChange={(e) => set("renewal_date", e.target.value)} disabled={isFrozen} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Status")}</Label>
                <Select value={values.status} onValueChange={(v) => set("status", v)} disabled={isFrozen}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.filter((o) => o !== "Active" || values.status === "Active").map((o) => <SelectItem key={o} value={o}>{tEnum(o, "agreement")}</SelectItem>)}</SelectContent>
                </Select>
                {values.status === "Pending" && (
                  <p className="text-xs text-muted-foreground mt-1.5">{t("Pending agreements are drafts awaiting activation. They do not count as active service.")}</p>
                )}
              </div>
            </div>

            {/* Emergency Repair Authorization + intake reference */}
            <IntakeReferenceCard intake={latestIntake} />
            <EmergencyAuthSection
              values={values}
              set={setEmergency}
              frozen={isFrozen}
              confirmed={!!values.emergency_authorization_confirmed}
              canConfirm={emergencyFieldsComplete}
              prefilled={intakePrefill}
              setConfirmed={(v) => set("emergency_authorization_confirmed", v)}
            />

            {/* Additional Details (optional, collapsible) */}
            <button
              type="button"
              onClick={() => setAdditionalOpen((o) => !o)}
              className="w-full flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/40 transition min-h-[44px]"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-muted-foreground" />
                {t("Additional Details (optional)")}
                {hasExtra && !additionalOpen && (
                  <span className="text-xs font-normal text-primary">· {t("has data")}</span>
                )}
              </span>
              {additionalOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>

            {additionalOpen && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4 -mt-1">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Custom Services / Changes")}</Label>
                  <Textarea value={values.included_services_override || ""} onChange={(e) => set("included_services_override", e.target.value)} rows={2} placeholder={t("Override or add to the package's included services")} disabled={isFrozen} />
                  <p className="text-xs text-muted-foreground mt-1">{t("Only use this if this customer's services differ from the selected package.")}</p>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Additional Terms")}</Label>
                  <Textarea value={values.additional_terms || ""} onChange={(e) => set("additional_terms", e.target.value)} rows={2} disabled={isFrozen} />
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Notes")}</Label>
                  <Textarea value={values.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Next Invoice Date")}</Label>
                  <Input type="date" className="min-w-0" value={values.next_invoice_date || ""} onChange={(e) => set("next_invoice_date", e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">{t("Auto-calculated from Start Date for recurring billing. You can adjust it manually.")}</p>
                </div>
              </div>
            )}

            {/* Customer Agreement Preview */}
            <button
              type="button"
              onClick={() => setShowPreview((o) => !o)}
              className="w-full flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-left hover:bg-primary/10 transition min-h-[44px]"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Eye className="w-4 h-4 text-primary" />
                {t("Preview Customer Agreement")}
              </span>
              {showPreview ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-primary" />}
            </button>

            {showPreview && (
              <div className="-mt-1">
                {!selectedPackage || !selectedProperty ? (
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    {t("Select a property and service package to preview the agreement.")}
                  </div>
                ) : !selectedTemplate ? (
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    {t("No terms template available to preview.")}
                  </div>
                ) : (
                  <AgreementPreview
                    snapshot={snapshot}
                    template={selectedTemplate}
                    property={selectedProperty}
                    emergencyConfirmed={emergencyConfirmedEffective}
                  />
                )}
              </div>
            )}

            {/* TEST AGREEMENT control (staff-only QA toggle) — Draft only */}
            {isEdit && values.signing_status === "Draft" && (
              <TestAgreementControl
                value={!!values.is_test_agreement}
                onToggle={handleToggleTestMode}
              />
            )}

            {/* Send for Signature (existing Draft agreements only) */}
            {isEdit && values.signing_status === "Draft" && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">{t("Send for Signature")}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("Freezes this agreement version, generates a secure customer signing link, and marks the agreement as Sent. After sending, customer-facing terms cannot be changed without a replacement version (available in a later phase).")}
                </p>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground">
                    {t("Terms template: {name} · Version {version} · {state}", {
                      name: selectedTemplate.name,
                      version: selectedTemplate.version,
                      state: selectedTemplate.active !== true
                        ? t("Draft / inactive")
                        : selectedTemplate.legal_approved !== true
                          ? t("Active — legal approval pending")
                          : t("Active + legally approved"),
                    })}
                  </p>
                )}
                {values.is_test_agreement && (
                  <p className="text-xs text-amber-600 font-medium">{t("TEST mode active — legal-approval gate bypassed for this test draft only. Customer-facing surfaces and PDF are watermarked.")}</p>
                )}
                {sendDisabledReason && (
                  <p className="text-xs text-amber-600">{sendDisabledReason}</p>
                )}
                {sendError && (
                  <p className="text-xs text-destructive">{sendError}</p>
                )}
                <Button onClick={handleSend} disabled={sending || !!sendDisabledReason} className="gap-1.5">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("Send for Signature")}
                </Button>
              </div>
            )}

            {/* Sent / Viewed panel */}
            {isEdit && (values.signing_status === "Sent" || values.signing_status === "Viewed") && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
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
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-1.5">
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
                    <ActivateServiceButton agreementId={id} isReplacement={hasActiveSibling} onActivated={() => navigate(0)} />
                  </div>
                )}
                {canActivate && (
                  <p className="text-xs text-muted-foreground pt-1">{t("Activation pending — review and activate the service when ready.")}</p>
                )}
                {isActive && (
                  <p className="text-xs text-muted-foreground pt-1">{t("This is the current operational service agreement. To change terms, create a replacement version below.")}</p>
                )}
                {isActive && (
                  <div className="pt-2">
                    <CreateReplacementButton agreementId={id} />
                  </div>
                )}
              </div>
            )}

            {/* Replacement / revised action for frozen non-active versions (Sent/Viewed/Signed-pending/Declined) */}
            {canReplace && !isActive && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <p className="text-sm font-medium">{t("Change customer-facing terms")}</p>
                <p className="text-xs text-muted-foreground">{t("This version is frozen. Create a new editable draft version to change terms; this version is preserved as permanent history.")}</p>
                <CreateReplacementButton agreementId={id} label={isDeclinedReplace ? "Create Revised Agreement" : "Create Replacement Version"} />
              </div>
            )}

            {/* Version history */}
            {isEdit && groupVersions.length > 0 && (
              <AgreementHistory versions={groupVersions} currentId={id} />
            )}

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

            <div className="flex items-center justify-between gap-2 pt-1">
              <Link to={backTo}><Button variant="outline">{t("Cancel")}</Button></Link>
              <Button onClick={save} disabled={saving || !values.property_id || !values.service_package_id} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("Save Agreement")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}