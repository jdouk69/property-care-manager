import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/ui/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import AssessmentForm from "@/components/assessment/AssessmentForm";
import PricingRecommendationCard from "@/components/assessment/PricingRecommendationCard";
import {
  buildRecommendation, formatPricePlusVat, PRICING_NOTE, CHARACTERISTICS,
} from "@/lib/servicePricing";
import {
  Loader2, ClipboardCheck, Repeat, CalendarClock, AlertTriangle, Pencil, Home as HomeIcon,
} from "lucide-react";

const TIERS = ["Basic", "Standard", "Premium"];
const PURCHASE_TYPES = [
  { value: "Recurring", label: "Recurring Property Care Plan", icon: Repeat, hint: "Monthly plan with scheduled visits" },
  { value: "One-time", label: "One-Time Property Care Visit", icon: CalendarClock, hint: "Single visit — no recurring agreement" },
];

const EMPTY_ASSESSMENT = {
  assessment_interior_size: "", assessment_additional_units: 0, assessment_complexity: "",
  assessment_pool_spa: false, assessment_multiple_floors: false, assessment_outbuilding: false,
  assessment_extensive_grounds: false, assessment_difficult_access: false,
  assessment_special_monitoring: false, assessment_visit_time: "", assessment_note: "",
  assessment_service_area: "Within normal service area",
};

const TIER_CARD_LABELS = {
  Basic: "Basic Home Watch",
  Standard: "Standard Property Care",
  Premium: "Premium Property Care",
};

export default function ServiceSetup() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [prop, setProp] = useState(null);
  const [client, setClient] = useState(null);
  const [packages, setPackages] = useState([]);
  const [existingAgreements, setExistingAgreements] = useState([]);

  const [assessment, setAssessment] = useState({ ...EMPTY_ASSESSMENT });
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [purchaseType, setPurchaseType] = useState("Recurring");
  const [tier, setTier] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPrice, setAdjustPrice] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const [visitDate, setVisitDate] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const p = await base44.entities.Property.get(id);
        setProp(p);
        setAssessment({
          ...EMPTY_ASSESSMENT,
          ...Object.fromEntries(Object.keys(EMPTY_ASSESSMENT).map((k) => [k, p[k] ?? EMPTY_ASSESSMENT[k]])),
        });
        setAssessmentDone(!!p.assessment_completed_at);
        if (p.owner_id) { try { setClient(await base44.entities.Client.get(p.owner_id)); } catch (e) {} }
        const pkgs = await base44.entities.ServicePackage.list("-created_date", 500);
        setPackages((pkgs || []).filter((x) => TIERS.includes(x.service_tier) && x.active !== false));
        const ags = await base44.entities.PropertyServiceAgreement.filter({ property_id: id });
        setExistingAgreements((ags || []).filter((a) => !a.archived && !["Ended", "Cancelled"].includes(a.status)));
      } catch (e) {
        setProp(null);
      }
      setLoading(false);
    })();
  }, [id]);

  const setField = (k, v) => setAssessment((s) => ({ ...s, [k]: v }));

  const saveAssessment = async () => {
    if (!assessment.assessment_interior_size || !assessment.assessment_complexity || !assessment.assessment_visit_time || !assessment.assessment_service_area) {
      setError("Complete size, complexity, estimated visit time and service area first.");
      return;
    }
    setSaving(true); setError("");
    let meName = "";
    try { const me = await base44.auth.me(); meName = me?.full_name || me?.email || ""; } catch (e) {}
    try {
      const updated = await base44.entities.Property.update(id, {
        ...assessment, assessment_completed_at: new Date().toISOString(), assessment_completed_by: meName,
      });
      setProp(updated); setAssessmentDone(true);
    } catch (e) { setError("Could not save assessment: " + (e?.message || e)); }
    setSaving(false);
  };

  const pkg = tier ? packages.find((p) => p.service_tier === tier) : null;
  const rec = useMemo(() => {
    if (!pkg || !tier) return null;
    return buildRecommendation({
      tier, purchaseType, basePrice: pkg.standard_price, oneTimePrice: pkg.one_time_price, assessment,
    });
  }, [pkg, tier, purchaseType, assessment]);

  const propertySummary = useMemo(() => {
    const parts = [];
    if (assessment.assessment_interior_size) parts.push(assessment.assessment_interior_size);
    const units = 1 + (Number(assessment.assessment_additional_units) || 0);
    parts.push(`${units} residence${units === 1 ? "" : "s"}`);
    if (assessment.assessment_multiple_floors) parts.push("Multiple floors");
    if (assessment.assessment_pool_spa) parts.push("Pool");
    if (assessment.assessment_complexity) parts.push(assessment.assessment_complexity);
    if (assessment.assessment_visit_time) parts.push(`Estimated visit: ${assessment.assessment_visit_time}`);
    return parts.join(" · ");
  }, [assessment]);

  const openAdjust = () => {
    setAdjustPrice(rec ? String(rec.recommendedPrice) : "");
    setAdjustReason("");
    setAdjustOpen(true);
  };

  const confirmAdjust = async () => {
    const final = parseFloat(adjustPrice);
    if (isNaN(final) || final <= 0) { setError("Enter a valid price."); return; }
    const changed = rec && final !== rec.recommendedPrice;
    if (changed && !adjustReason.trim()) { setError("An adjustment reason is required when the price differs from the recommendation."); return; }
    setAdjustOpen(false);
    await createService(final, adjustReason.trim(), rec.status === "custom_review" ? "Custom Review" : "Manual Override");
  };

  const acceptRecommendation = async () => {
    await createService(rec.recommendedPrice, "", rec.status === "custom_review" ? "Custom Review" : "Recommended");
  };

  // Creates the service. Recurring → Draft service agreement (staff then sends/
  // activates via the existing agreement workflow). One-time → a single
  // Scheduled visit; NO agreement and NO recurring schedule is ever created.
  // Existing agreements are never modified by this flow.
  const createService = async (finalPrice, reason, reviewStatus) => {
    if (!pkg || !rec) return;
    if (purchaseType === "One-time" && !visitDate) { setError("Select the date for the one-time visit."); return; }
    setSaving(true); setError("");
    let meName = "";
    try { const me = await base44.auth.me(); meName = me?.full_name || me?.email || ""; } catch (e) {}
    const now = new Date().toISOString();
    try {
      if (purchaseType === "Recurring") {
        const ag = await base44.entities.PropertyServiceAgreement.create({
          client_id: prop.owner_id || "", property_id: prop.id, service_package_id: pkg.id,
          agreed_price: finalPrice, billing_type: pkg.billing_type || "Monthly",
          inspection_frequency: pkg.inspection_frequency || "",
          start_date: now.slice(0, 10), status: "Pending", signing_status: "Draft", agreement_version: 1,
          created_from_package_price: rec.basePrice, recommended_price: rec.recommendedPrice,
          unit_adjustment_amount: rec.unitAdjustment, purchase_type: "Recurring",
          pricing_review_status: reviewStatus, price_override_reason: reason,
          price_approved_at: now, price_approved_by: meName,
        });
        navigate(`/agreements/${ag.id}`);
      } else {
        const snapshot = {
          purchase_type: "One-time", tier, base_price: rec.basePrice,
          recommended_price: rec.recommendedPrice, unit_adjustment_amount: rec.unitAdjustment,
          final_agreed_price: finalPrice, adjustment_reason: reason, pricing_review_status: reviewStatus,
          approved_at: now, approved_by: meName,
          assessment: Object.fromEntries([
            ["assessment_interior_size", assessment.assessment_interior_size],
            ["assessment_additional_units", assessment.assessment_additional_units],
            ["assessment_complexity", assessment.assessment_complexity],
            ...CHARACTERISTICS.map((c) => [c.label, !!assessment[c.key]]),
            ["assessment_visit_time", assessment.assessment_visit_time],
            ["assessment_service_area", assessment.assessment_service_area],
          ]),
        };
        const visit = await base44.entities.PropertyVisit.create({
          property_id: prop.id, visit_type: pkg.default_visit_type || "Property Care Inspection",
          status: "Scheduled", scheduled_time: new Date(`${visitDate}T09:00:00`).toISOString(),
          agreed_price: finalPrice, pricing_snapshot: snapshot,
        });
        navigate(`/visits/${visit.id}`);
      }
    } catch (e) {
      setError("Could not save: " + (e?.message || e));
    }
    setSaving(false);
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!prop) return (
    <AppLayout>
      <EmptyState icon={HomeIcon} title="Property not found" action={<Link to="/properties"><Button>Back to properties</Button></Link>} />
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback={`/properties/${id}`} className="mb-1" />
        <h1 className="text-xl sm:text-2xl font-semibold">Service &amp; Pricing Assessment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {prop.name}{client ? ` · ${client.name}` : ""} — assess the property, get a pricing recommendation, then approve the service.
        </p>

        {existingAgreements.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              This property already has a service agreement on file. Creating a service here adds a NEW agreement/visit — existing agreed prices are never changed automatically.
            </p>
          </div>
        )}

        {/* Step 1 — assessment */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" /> Property Assessment
              {assessmentDone && <span className="text-[11px] font-medium text-emerald-600">Saved</span>}
            </h2>
            {assessmentDone && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={() => setAssessmentDone(false)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </div>
          {assessmentDone ? (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{propertySummary}</p>
              {assessment.assessment_note && <p className="text-xs">Note: {assessment.assessment_note}</p>}
              <p className="text-xs">Service area: {assessment.assessment_service_area}</p>
            </div>
          ) : (
            <>
              <AssessmentForm values={assessment} setField={setField} />
              <div className="mt-4 flex items-center gap-3">
                <Button className="h-11 px-5" onClick={saveAssessment} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Assessment"}
                </Button>
              </div>
            </>
          )}
        </section>

        {/* Step 2 — purchase type & level */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold mb-3">How would you like this service?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PURCHASE_TYPES.map((pt) => (
              <button
                key={pt.value} onClick={() => setPurchaseType(pt.value)}
                className={`text-left rounded-2xl border p-3.5 min-h-[64px] transition-colors ${
                  purchaseType === pt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <pt.icon className="w-4 h-4 text-primary" /> {pt.label}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pt.hint}</p>
              </button>
            ))}
          </div>

          <h2 className="text-sm font-semibold mt-5 mb-3">Select service level</h2>
          <div className="grid grid-cols-1 gap-2">
            {TIERS.map((t) => {
              const p = packages.find((x) => x.service_tier === t);
              if (!p) return null;
              const price = purchaseType === "One-time" ? p.one_time_price : p.standard_price;
              return (
                <button
                  key={t} onClick={() => setTier(t)}
                  className={`text-left rounded-2xl border p-3.5 transition-colors ${
                    tier === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{TIER_CARD_LABELS[t]}</span>
                    <span className="text-sm font-semibold text-primary">
                      {price != null ? `From ${formatPricePlusVat(price, { perMonth: purchaseType === "Recurring" })}` : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {purchaseType === "One-time" ? "One visit" : p.inspection_frequency || "Monthly"} · {p.visit_duration || ""}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{PRICING_NOTE}</p>
        </section>

        {/* Step 3 — recommendation */}
        {rec && pkg && (
          <div className="mt-4">
            {purchaseType === "One-time" && (
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 mb-4">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">Visit date *</Label>
                <Input className="sm:h-12 max-w-xs" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1.5">The one-time visit is scheduled on this date. No recurring agreement or schedule is created.</p>
              </div>
            )}
            <PricingRecommendationCard
              rec={rec}
              tierName={TIER_CARD_LABELS[tier]}
              purchaseType={purchaseType}
              propertySummary={propertySummary}
              onAccept={acceptRecommendation}
              onAdjustPrice={openAdjust}
              onSetCustomPrice={openAdjust}
              onChooseDifferentPlan={() => { setTier(""); setVisitDate(""); }}
              disabled={saving}
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}

        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{rec && rec.status === "custom_review" ? "Set Custom Price" : "Adjust Price"}</DialogTitle>
              <DialogDescription>
                {rec && `Recommendation: ${formatPricePlusVat(rec.recommendedPrice, { perMonth: purchaseType === "Recurring" })}. The recommendation is preserved; your final price and reason are recorded with your approval.`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div>
                <Label className="mb-1.5 block">Final agreed service price (€, excl. VAT) *</Label>
                <Input className="h-12" type="number" min="0" step="0.01" value={adjustPrice} onChange={(e) => setAdjustPrice(e.target.value)} />
                {purchaseType === "Recurring" && <p className="text-xs text-muted-foreground mt-1">Monthly recurring price before VAT.</p>}
              </div>
              <div>
                <Label className="mb-1.5 block">Adjustment reason / note {rec && adjustPrice !== "" && Number(adjustPrice) !== rec.recommendedPrice ? "*" : ""}</Label>
                <Textarea rows={2} value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Why the price differs from the recommendation…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="h-11" onClick={() => setAdjustOpen(false)}>Cancel</Button>
              <Button className="h-11" onClick={confirmAdjust} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve & Continue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}