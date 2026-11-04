import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import EmptyState from "@/components/ui/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import AssessmentForm from "@/components/assessment/AssessmentForm";
import SeasonalApprovalFields from "@/components/visits/SeasonalApprovalFields";
import PricingRecommendationCard from "@/components/assessment/PricingRecommendationCard";
import {
  buildRecommendation, formatPricePlusVat, PRICING_NOTE, CHARACTERISTICS, isAssessmentComplete, SIZE_LABELS, vatPriceLabel,
} from "@/lib/servicePricing";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { recommendedVisitType } from "@/lib/activeService";
import { OWNER_OCCUPIED_EXTERIOR_ONLY, EXTERIOR_ONLY_VISIT_TYPE } from "../../server/shared/propertyScope.js";
import {
  Loader2, ClipboardCheck, Repeat, CalendarClock, AlertTriangle, Pencil, Home as HomeIcon,
} from "lucide-react";

const TIERS = ["Basic", "Standard", "Premium"];
const PURCHASE_TYPES = [
  { value: "Recurring", label: "Recurring Property Care Plan", icon: Repeat, hint: "Monthly plan with scheduled visits" },
  { value: "One-time", label: "One-Time Non-Subscriber Visit", icon: CalendarClock, hint: "Single visit — no recurring agreement" },
];

const EMPTY_ASSESSMENT = {
  assessment_interior_size: "", assessment_additional_units: 0, assessment_complexity: "",
  assessment_pool_spa: false, assessment_multiple_floors: false, assessment_outbuilding: false,
  assessment_extensive_grounds: false, assessment_difficult_access: false,
  assessment_special_monitoring: false, assessment_visit_time: "", assessment_note: "",
  assessment_service_area: "Within normal service area",
};

// Internal tier keys (Basic/Standard/Premium) are preserved; these are the
// customer-facing package display names.
const TIER_CARD_LABELS = {
  Basic: "Quick Check",
  Standard: "Property Care",
  Premium: "Complete Care",
};

export default function ServiceSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [prop, setProp] = useState(null);
  const [client, setClient] = useState(null);
  const [packages, setPackages] = useState([]);
  const [existingAgreements, setExistingAgreements] = useState([]);
  const [additionalService, setAdditionalService] = useState(false);
  const [termsReady, setTermsReady] = useState(null);

  const [assessment, setAssessment] = useState({ ...EMPTY_ASSESSMENT });
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [purchaseType, setPurchaseType] = useState("Recurring");
  const [tier, setTier] = useState("");
  const [exteriorOnly, setExteriorOnly] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPrice, setAdjustPrice] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const [visitDate, setVisitDate] = useState("");
  const [approval, setApproval] = useState({ via: "", reference: "", tasks: "", keys: "", extraTime: false });

  useEffect(() => {
    (async () => {
      try {
        const p = await base44.entities.Property.get(id);
        setProp(p);
        setExteriorOnly(p.service_scope === OWNER_OCCUPIED_EXTERIOR_ONLY);
        setAssessment({
          ...EMPTY_ASSESSMENT,
          ...Object.fromEntries(Object.keys(EMPTY_ASSESSMENT).map((k) => [k, p[k] ?? EMPTY_ASSESSMENT[k]])),
        });
        setAssessmentDone(!!p.assessment_completed_at && isAssessmentComplete(p));
        if (p.owner_id) { try { setClient(await base44.entities.Client.get(p.owner_id)); } catch (e) {} }
        const pkgs = await base44.entities.ServicePackage.list("-created_date", 500);
        setPackages((pkgs || []).filter((x) => TIERS.includes(x.service_tier) && x.active !== false));
        // One-Time Services entry point: preselect purchase type / tier from
        // the query string. Pricing governance (assessment, +€40 units,
        // custom-review rules, manual staff approval) is fully unchanged.
        if (params.get("purchase") === "One-time") setPurchaseType("One-time");
        const qTier = params.get("tier");
        if (TIERS.includes(qTier)) setTier(qTier);
        const ags = await base44.entities.PropertyServiceAgreement.filter({ property_id: id });
        const existing = (ags || []).filter((a) => !a.archived && !["Ended", "Cancelled"].includes(a.status));
        setExistingAgreements(existing);
        const draft = existing.find(a => a.signing_status === "Draft");
        const existingPkg = pkgs.find(p => p.id === draft?.service_package_id);
        if (existingPkg && !params.get("tier")) setTier(existingPkg.service_tier);
        try {
          const terms = await base44.entities.AgreementTermsTemplate.list();
          setTermsReady(terms.some(t => !t.archived && t.active === true && t.legal_approved === true));
        } catch (e) { setTermsReady(null); }
      } catch (e) {
        setProp(null);
      }
      setLoading(false);
    })();
  }, [id]);

  const setField = (k, v) => {
    setAssessmentDone(false);
    setAssessment((s) => ({ ...s, [k]: v }));
  };

  const saveAssessment = async () => {
    if (!isAssessmentComplete(assessment)) {
      setError(t("Complete size, complexity, estimated visit time and service area first."));
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
    } catch (e) { setError(t("Could not save assessment: {message}", { message: e?.message || e })); }
    setSaving(false);
  };

  const existingDraft = purchaseType === "Recurring" ? existingAgreements.find(a => a.signing_status === "Draft") : null;
  const continueDraft = existingDraft && !additionalService;
  const pkg = tier ? packages.find((p) => p.service_tier === tier) : null;
  // Seasonal Opening / Closing (if ever offered through this flow) require
  // the same per-visit owner approval as Add Service — createVisit also
  // rejects any seasonal visit created without one.
  const seasonalPkg = purchaseType === "One-time" && !!pkg && ["Seasonal Opening", "Seasonal Closing"].includes(pkg.default_visit_type);
  const approvalValid = !seasonalPkg || (!!approval.via && !!approval.tasks.trim());
  const rec = useMemo(() => {
    if (!pkg || !tier) return null;
    return buildRecommendation({
      tier, purchaseType, basePrice: pkg.standard_price, oneTimePrice: pkg.one_time_price, assessment,
    });
  }, [pkg, tier, purchaseType, assessment]);

  // Display-only summary: the parts are translated at render time; the stored
  // assessment values themselves are never modified.
  const propertySummary = useMemo(() => {
    const parts = [];
    if (assessment.assessment_interior_size) parts.push(t(SIZE_LABELS[assessment.assessment_interior_size] || assessment.assessment_interior_size));
    const units = 1 + (Number(assessment.assessment_additional_units) || 0);
    parts.push(units === 1
      ? t("1 residence")
      : t("{count} residences", { count: units }));
    if (assessment.assessment_multiple_floors) parts.push(t("Multiple floors"));
    if (assessment.assessment_pool_spa) parts.push(t("Pool"));
    if (assessment.assessment_complexity) parts.push(t(assessment.assessment_complexity));
    if (assessment.assessment_visit_time) parts.push(t("Estimated visit: {time}", { time: t(assessment.assessment_visit_time) }));
    return parts.join(" · ");
  }, [assessment, t]);

  const openAdjust = () => {
    setAdjustPrice(rec ? String(rec.recommendedPrice) : "");
    setAdjustReason("");
    setAdjustOpen(true);
  };

  const confirmAdjust = async () => {
    const final = parseFloat(adjustPrice);
    if (isNaN(final) || final <= 0) { setError(t("Enter a valid price.")); return; }
    const changed = rec && final !== rec.recommendedPrice;
    if (changed && !adjustReason.trim()) { setError(t("An adjustment reason is required when the price differs from the recommendation.")); return; }
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
    if (!pkg || !rec || saving) return;
    if (continueDraft) { navigate(`/agreements/${existingDraft.id}`); return; }
    if (!assessmentDone || !isAssessmentComplete(assessment)) {
      setError(t("Save a complete assessment before approving a price."));
      return;
    }
    if (purchaseType === "One-time" && !visitDate) { setError(t("Select the date for the one-time visit.")); return; }
    if (seasonalPkg && !approvalValid) { setError(t("Record the owner approval for this seasonal visit before scheduling.")); return; }
    setSaving(true); setError("");
    let meName = "";
    try { const me = await base44.auth.me(); meName = me?.full_name || me?.email || ""; } catch (e) {}
    const now = new Date().toISOString();
    try {
      if (purchaseType === "Recurring") {
        const ag = await base44.entities.PropertyServiceAgreement.create({
          client_id: prop.owner_id || "", property_id: prop.id, service_package_id: pkg.id,
          exterior_only: exteriorOnly || prop.service_scope === OWNER_OCCUPIED_EXTERIOR_ONLY,
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
          exterior_only: exteriorOnly || prop.service_scope === OWNER_OCCUPIED_EXTERIOR_ONLY,
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
        const visit = (await base44.functions.invoke("createVisit", {
          property_id: prop.id,
          visit_type: (exteriorOnly || prop.service_scope === OWNER_OCCUPIED_EXTERIOR_ONLY)
            ? EXTERIOR_ONLY_VISIT_TYPE
            : (recommendedVisitType(pkg, prop.service_scope) || "Property Care Inspection"),
          exterior_only: exteriorOnly || prop.service_scope === OWNER_OCCUPIED_EXTERIOR_ONLY,
          status: "Scheduled", scheduled_time: new Date(`${visitDate}T09:00:00`).toISOString(),
          agreed_price: finalPrice, pricing_snapshot: snapshot,
          ...(seasonalPkg ? {
            owner_approval: {
              approved_via: approval.via, approved_reference: approval.reference.trim(),
              approved_tasks: approval.tasks.trim(), key_instructions: approval.keys.trim(),
              extra_time_approved: approval.extraTime, approved_price: finalPrice,
              approved_at: now, recorded_by: meName,
            },
          } : {}),
        })).data.visit;
        navigate(`/visits/${visit.id}`);
      }
    } catch (e) {
      setError(t("Could not save: {message}", { message: e?.message || e }));
    }
    setSaving(false);
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!prop) return (
    <AppLayout>
      <EmptyState icon={HomeIcon} title={t("Property not found")} action={<Link to="/properties"><Button>{t("Back to properties")}</Button></Link>} />
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-6">
        <PageBackButton fallback={`/properties/${id}`} className="mb-1" />
        <h1 className="text-xl sm:text-2xl font-semibold">{t("Service & Pricing Assessment")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {prop.name}{client ? ` · ${client.name}` : ""} — {t("assess the property, get a pricing recommendation, then approve the service.")}
        </p>

        {termsReady === false && <div className="mt-4 rounded-xl border border-amber-500/30 p-3 text-sm">
          <p>{t("Agreement terms setup is incomplete. Assessment and draft preparation can continue, but customer signing requires active, approved terms.")}</p>
          <Link className="underline" to="/agreement-terms" target="_blank">{t("Open Agreement Terms setup")}</Link>
        </div>}
        {continueDraft && <div className="mt-4 rounded-xl border border-primary/30 p-4 space-y-2">
          <p className="font-medium">{t("This assessment already has a draft agreement.")}</p>
          <Link to={`/agreements/${existingDraft.id}`}><Button>{t("Continue existing agreement")}</Button></Link>
          <p className="text-xs text-muted-foreground">{t("Use the existing draft to review its approved price and signing requirements.")}</p>
        </div>}
        {existingAgreements.length > 0 && !continueDraft && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              {t("This property already has a service agreement on file. Creating a service here adds a NEW agreement/visit — existing agreed prices are never changed automatically.")}
            </p>
          </div>
        )}

        {/* Step 1 — assessment */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" /> {t("1. Complete and save the assessment")}
              {assessmentDone && <span className="text-[11px] font-medium text-emerald-600">{t("Saved")}</span>}
            </h2>
            {assessmentDone && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={() => setAssessmentDone(false)}>
                <Pencil className="w-3.5 h-3.5" /> {t("Edit")}
              </Button>
            )}
          </div>
          {assessmentDone ? (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{propertySummary}</p>
              {assessment.assessment_note && <p className="text-xs">{t("Note: {note}", { note: assessment.assessment_note })}</p>}
              <p className="text-xs">{t("Service area: {area}", { area: t(assessment.assessment_service_area) })}</p>
            </div>
          ) : (
            <>
              <fieldset disabled={saving}>
                <AssessmentForm values={assessment} setField={setField} />
              </fieldset>
              <div className="mt-4 flex items-center gap-3">
                <Button className="h-11 px-5" onClick={saveAssessment} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Save Assessment")}
                </Button>
              </div>
            </>
          )}
        </section>

        {/* Step 2 — purchase type & level */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold mb-3">{t("2. Select service and package")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PURCHASE_TYPES.map((pt) => (
              <button
                key={pt.value} onClick={() => setPurchaseType(pt.value)}
                className={`text-left rounded-2xl border p-3.5 min-h-[64px] transition-colors ${
                  purchaseType === pt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <pt.icon className="w-4 h-4 text-primary" /> {t(pt.label)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t(pt.hint)}</p>
              </button>
            ))}
          </div>

          <h2 className="text-sm font-semibold mt-5 mb-3">{t("Select service level")}</h2>
          <div className="grid grid-cols-1 gap-2">
            {TIERS.map((tierOpt) => {
              const p = packages.find((x) => x.service_tier === tierOpt);
              if (!p) return null;
              const price = purchaseType === "One-time" ? p.one_time_price : p.standard_price;
              return (
                <button
                  key={tierOpt} onClick={() => setTier(tierOpt)}
                  className={`text-left rounded-2xl border p-3.5 transition-colors ${
                    tier === tierOpt ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{t(TIER_CARD_LABELS[tierOpt])}</span>
                    <span className="text-sm font-semibold text-primary">
                      {price != null ? t("From {price}", { price: formatPricePlusVat(price, { perMonth: purchaseType === "Recurring", vatSetting: p.vat_setting }) }) : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {purchaseType === "One-time" ? t("One visit") : t(p.inspection_frequency || "Monthly")} · {p.visit_duration || ""}
                  </p>
                  {purchaseType === "One-time" && tierOpt === "Premium" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("Compared with Property Care one-time: adds limited agreed operational checks (faucets, toilets, lights, agreed appliances/AC, visual pool-equipment observation) and tracking of previously identified concerns.")}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{t(PRICING_NOTE)}</p>
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={exteriorOnly || prop.service_scope === OWNER_OCCUPIED_EXTERIOR_ONLY}
                disabled={prop.service_scope === OWNER_OCCUPIED_EXTERIOR_ONLY}
                onCheckedChange={(value) => setExteriorOnly(value === true)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">{t("Exterior-only service")}</span>
                <span className="block text-xs text-muted-foreground mt-1">{t("Keep this plan and its price, but use the exterior-only visit checklist. No interior questions or entry are included.")}</span>
                {prop.service_scope === OWNER_OCCUPIED_EXTERIOR_ONLY && <span className="block text-xs text-primary mt-1">{t("Required by this property's service scope.")}</span>}
              </span>
            </label>
          </div>
        </section>

        <p className="text-sm text-muted-foreground mt-4">{t("3. Review the price breakdown and approve your price. Recurring service continues to a draft agreement for review and signature.")}</p>
        {!tier && <p className="text-sm text-muted-foreground mt-2">{t("Select a service level above to see its price recommendation.")}</p>}
        {!assessmentDone && <p className="text-sm text-amber-700 mt-2" role="status">{t("Save a complete assessment before approving a price.")}</p>}
        {/* Step 3 — recommendation */}
        {rec && pkg && (
          <div className="mt-4">
            {purchaseType === "One-time" && (
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 mb-4">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">{t("Visit date *")}</Label>
                <Input className="sm:h-12 max-w-xs" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1.5">{t("The one-time visit is scheduled on this date. No recurring agreement or schedule is created.")}</p>
                {seasonalPkg && (
                  <div className="mt-3">
                    <SeasonalApprovalFields
                      approval={approval}
                      onChange={setApproval}
                      hourly={pkg && pkg.hourly_charge != null ? Number(pkg.hourly_charge) : null}
                      invalid={!approvalValid}
                    />
                  </div>
                )}
              </div>
            )}
            <PricingRecommendationCard
              rec={rec}
              vatSetting={pkg.vat_setting}
              existingAgreementTo={continueDraft ? `/agreements/${existingDraft.id}` : null}
              onStartAdditional={() => setAdditionalService(true)}
              tierName={TIER_CARD_LABELS[tier]}
              purchaseType={purchaseType}
              propertySummary={propertySummary}
              onAccept={acceptRecommendation}
              onAdjustPrice={openAdjust}
              onSetCustomPrice={openAdjust}
              onChooseDifferentPlan={() => { setTier(""); setVisitDate(""); }}
              disabled={saving || !assessmentDone || !isAssessmentComplete(assessment)}
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}

        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{rec && rec.status === "custom_review" ? t("Set Custom Price") : t("Adjust Price")}</DialogTitle>
              <DialogDescription>
                {rec && t("Recommendation: {price}. The recommendation is preserved; your final price and reason are recorded with your approval.", { price: formatPricePlusVat(rec.recommendedPrice, { perMonth: purchaseType === "Recurring", vatSetting: pkg?.vat_setting }) })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div>
                <Label className="mb-1.5 block">{t("Final agreed service price (€) *")}</Label>
                <Input className="h-12" type="number" min="0" step="0.01" value={adjustPrice} onChange={(e) => setAdjustPrice(e.target.value)} />
                {purchaseType === "Recurring" && <p className="text-xs text-muted-foreground mt-1">{t("Monthly recurring price.")} {t(vatPriceLabel(pkg?.vat_setting))}</p>}
              </div>
              <div>
                <Label className="mb-1.5 block">{t("Adjustment reason / note")} {rec && adjustPrice !== "" && Number(adjustPrice) !== rec.recommendedPrice ? "*" : ""}</Label>
                <Textarea rows={2} value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder={t("Why the price differs from the recommendation…")} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="h-11" onClick={() => setAdjustOpen(false)}>{t("Cancel")}</Button>
              <Button className="h-11" onClick={confirmAdjust} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Approve & Continue")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
