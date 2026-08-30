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
import { buildSentSnapshot } from "@/lib/agreementTerms";
import EmergencyAuthSection from "@/components/agreements/EmergencyAuthSection";
import IntakeReferenceCard from "@/components/agreements/IntakeReferenceCard";
import AgreementPreview from "@/components/agreements/AgreementPreview";

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

export default function ServiceAgreement() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
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
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError, setSendError] = useState("");
  const [copied, setCopied] = useState("");
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
  });

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  // Changing any emergency field resets the staff confirmation, forcing reconfirm.
  const setEmergency = (k, v) => setValues((s) => ({ ...s, [k]: v, emergency_authorization_confirmed: false }));

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
          });
          // Auto-open Additional Details if any of those fields already contain data.
          const hasExtra = !!(
            loaded.included_services_override || loaded.additional_terms ||
            loaded.notes || loaded.next_invoice_date
          );
          setAdditionalOpen(hasExtra);
        } else if (propertyParam) {
          set("property_id", propertyParam);
        } else if (clientProps.length === 1) {
          set("property_id", clientProps[0].id);
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
  const isFrozen = FROZEN_STATUSES.includes(values.signing_status);
  const sendDisabledReason = !isEdit
    ? null
    : values.signing_status !== "Draft"
      ? null
      : !values.emergency_authorization_confirmed
        ? "Confirm the emergency authorization before sending."
        : selectedTemplate && selectedTemplate.active !== true
          ? "No active legally-approved agreement terms template is available."
          : selectedTemplate && selectedTemplate.legal_approved !== true
            ? "The selected agreement terms have not been legally approved for customer use."
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
    ? `${window.location.origin}/agreement/${values.public_token}`
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
        const msg = (data && data.error) || "Send failed.";
        const detail = data && Array.isArray(data.details) ? " " + data.details.join(" ") : "";
        setSendError(msg + detail);
      }
    } catch (e) {
      const data = e && e.response && e.response.data ? e.response.data : null;
      const msg = (data && data.error) || (e && e.message) || "Send failed.";
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

  const formatSentAt = (iso) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(); } catch (e) { return iso; }
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
      return {
        ...s,
        service_package_id: pid,
        agreed_price: pkg.standard_price ?? s.agreed_price,
        billing_type: newBilling,
        inspection_frequency: pkg.inspection_frequency || s.inspection_frequency,
        created_from_package_price: pkg.standard_price ?? 0,
        next_invoice_date: nextInvoice,
      };
    });
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
        terms_template_id: selectedTemplate?.id || "",
        terms_version: selectedTemplate ? String(selectedTemplate.version) : "",
      };
      // Preserve signing_status for edit; set Draft for new.
      if (isEdit) {
        if (values.signing_status) payload.signing_status = values.signing_status;
        if (values.agreement_version) payload.agreement_version = values.agreement_version;
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
        <h1 className="text-xl font-semibold mb-4">{isEdit ? "Edit Service Agreement" : "New Service Agreement"}</h1>

        {/* Frozen banner */}
        {isFrozen && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">This agreement version has been sent and is frozen.</p>
              <p className="text-xs text-amber-600/90 mt-0.5">Create a replacement version to change customer-facing terms. (Replacement creation will be available in a later phase.)</p>
            </div>
          </div>
        )}

        {!client ? (
          <EmptyState icon={User} title="No client selected" description="Open this screen from a client's hub." />
        ) : properties.length === 0 ? (
          <EmptyState icon={Building2} title="No properties for this client" description="Add a property before creating a service agreement."
            action={<Link to={`/properties?add=1&owner=${client.id}`}><Button size="sm">Add Property</Button></Link>} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Client</p>
              <p className="font-medium">{client.name}</p>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Property</Label>
              {properties.length === 1 ? (
                <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">{properties[0].name}</div>
              ) : (
                <Select value={values.property_id} onValueChange={(v) => set("property_id", v)} disabled={isFrozen}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Service Package</Label>
              <Select value={values.service_package_id} onValueChange={onPackageChange} disabled={isFrozen}>
                <SelectTrigger><SelectValue placeholder="Select a package" /></SelectTrigger>
                <SelectContent>
                  {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedPackage && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Package defaults (reference)</p>
                </div>
                <p className="text-sm font-medium">{selectedPackage.name}</p>
                {selectedPackage.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{selectedPackage.description}</p>}
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Standard price: <span className="text-foreground">€{(selectedPackage.standard_price || 0).toFixed(2)}</span></div>
                  <div>Billing: <span className="text-foreground">{selectedPackage.billing_type}</span></div>
                  <div>Visit duration: <span className="text-foreground">{selectedPackage.visit_duration || "—"}</span></div>
                  <div>Frequency: <span className="text-foreground">{selectedPackage.inspection_frequency || "—"}</span></div>
                  <div className="col-span-2">VAT: <span className="text-foreground">{selectedPackage.vat_setting}</span></div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Agreement terms (customer-specific)</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Agreed Price (€)</Label>
                  <Input type="number" step="0.01" value={values.agreed_price ?? ""} onChange={(e) => set("agreed_price", e.target.value)} disabled={isFrozen} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Billing Type</Label>
                  <Select value={values.billing_type} onValueChange={onBillingTypeChange} disabled={isFrozen}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BILLING_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Inspection Frequency</Label>
                <Input value={values.inspection_frequency || ""} onChange={(e) => set("inspection_frequency", e.target.value)} placeholder="e.g. Weekly" list="freq-opts" disabled={isFrozen} />
                <datalist id="freq-opts">{FREQUENCY_OPTS.map((o) => <option key={o} value={o} />)}</datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start Date</Label>
                  <Input type="date" className="min-w-0" value={values.start_date || ""} onChange={(e) => onStartDateChange(e.target.value)} disabled={isFrozen} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Renewal Date</Label>
                  <Input type="date" className="min-w-0" value={values.renewal_date || ""} onChange={(e) => set("renewal_date", e.target.value)} disabled={isFrozen} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</Label>
                <Select value={values.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                {values.status === "Pending" && (
                  <p className="text-xs text-muted-foreground mt-1.5">Pending agreements are drafts awaiting activation. They do not count as active service.</p>
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
                Additional Details (optional)
                {hasExtra && !additionalOpen && (
                  <span className="text-xs font-normal text-primary">· has data</span>
                )}
              </span>
              {additionalOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>

            {additionalOpen && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4 -mt-1">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Custom Services / Changes</Label>
                  <Textarea value={values.included_services_override || ""} onChange={(e) => set("included_services_override", e.target.value)} rows={2} placeholder="Override or add to the package's included services" disabled={isFrozen} />
                  <p className="text-xs text-muted-foreground mt-1">Only use this if this customer's services differ from the selected package.</p>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Additional Terms</Label>
                  <Textarea value={values.additional_terms || ""} onChange={(e) => set("additional_terms", e.target.value)} rows={2} disabled={isFrozen} />
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes</Label>
                  <Textarea value={values.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Next Invoice Date</Label>
                  <Input type="date" className="min-w-0" value={values.next_invoice_date || ""} onChange={(e) => set("next_invoice_date", e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Auto-calculated from Start Date for recurring billing. You can adjust it manually.</p>
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
                Preview Customer Agreement
              </span>
              {showPreview ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-primary" />}
            </button>

            {showPreview && (
              <div className="-mt-1">
                {!selectedPackage || !selectedProperty ? (
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    Select a property and service package to preview the agreement.
                  </div>
                ) : !selectedTemplate ? (
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    No terms template available to preview.
                  </div>
                ) : (
                  <AgreementPreview
                    snapshot={snapshot}
                    template={selectedTemplate}
                    property={selectedProperty}
                    emergencyConfirmed={!!values.emergency_authorization_confirmed}
                  />
                )}
              </div>
            )}

            {/* Send for Signature (existing Draft agreements only) */}
            {isEdit && values.signing_status === "Draft" && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Send for Signature</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Freezes this agreement version, generates a secure customer signing link, and marks the agreement as Sent.
                  After sending, customer-facing terms cannot be changed without a replacement version (available in a later phase).
                </p>
                {selectedTemplate && (
                  <p className="text-xs text-muted-foreground">
                    Terms template: {selectedTemplate.name} · Version {selectedTemplate.version} · {selectedTemplate.active !== true ? "Draft / inactive" : selectedTemplate.legal_approved !== true ? "Active — legal approval pending" : "Active + legally approved"}
                  </p>
                )}
                {sendDisabledReason && (
                  <p className="text-xs text-amber-600">{sendDisabledReason}</p>
                )}
                {sendError && (
                  <p className="text-xs text-destructive">{sendError}</p>
                )}
                <Button onClick={handleSend} disabled={sending || !!sendDisabledReason} className="gap-1.5">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send for Signature
                </Button>
              </div>
            )}

            {/* Sent / Viewed panel */}
            {isEdit && (values.signing_status === "Sent" || values.signing_status === "Viewed") && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700">{values.signing_status === "Viewed" ? "Customer viewed the agreement" : "Sent for signature"}</p>
                </div>
                {values.sent_at && <p className="text-xs text-muted-foreground">Sent {formatSentAt(values.sent_at)}</p>}
                {publicLink && (
                  <div className="space-y-2">
                    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs break-all">{publicLink}</div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(publicLink, "link")} className="gap-1.5">
                        <Copy className="w-4 h-4" /> {copied === "link" ? "Copied" : "Copy Link"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={copyMessage} className="gap-1.5">
                        <MessageCircle className="w-4 h-4" /> {copied === "message" ? "Copied" : "Copy Message"}
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{values.signing_status === "Viewed" ? "Customer opened the agreement link — awaiting signature." : "Awaiting customer signature."}</p>
              </div>
            )}

            {/* Signed panel */}
            {isEdit && values.signing_status === "Signed" && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700">Agreement signed</p>
                </div>
                <p className="text-xs text-muted-foreground">Version {values.agreement_version} · Terms {values.terms_version || "—"}</p>
                {values.signer_name && <p className="text-xs text-muted-foreground">Signed by: {values.signer_name}</p>}
                {values.signer_email && <p className="text-xs text-muted-foreground">Email: {values.signer_email}</p>}
                {values.signed_at && <p className="text-xs text-muted-foreground">Signed {formatSentAt(values.signed_at)}</p>}
                {values.signed_pdf_url && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <a href={values.signed_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-8 rounded-md border border-input bg-transparent px-3 text-xs font-medium hover:bg-accent">
                      <FileText className="w-3.5 h-3.5" /> View Signed Agreement
                    </a>
                    <a href={values.signed_pdf_url} download className="inline-flex items-center gap-1.5 h-8 rounded-md border border-input bg-transparent px-3 text-xs font-medium hover:bg-accent">
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </a>
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-1">Activation pending — review and activate the service when ready.</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <Link to={backTo}><Button variant="outline">Cancel</Button></Link>
              <Button onClick={save} disabled={saving || !values.property_id || !values.service_package_id} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Agreement
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}