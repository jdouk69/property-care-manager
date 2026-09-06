import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Loader2, CheckCircle2, AlertTriangle, ShieldAlert, User, Building2,
  Package, CalendarClock, FileText,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { resolveServiceStatus, updateRecurringChecklist } from "@/lib/recurringChecklist";
import { resolveAppliedIntakeForPrefill } from "@/lib/intakeResolution";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Visual / property-care scope guardrail (no AI). Staff-authored recurring check
// wording is screened against professional-inspection verbs/terms. A match shows
// an "outside Property Care scope" warning and forces the item to be excluded
// from recurring visits — staff must reword to a visual check or leave it out.
const OUT_OF_SCOPE = [
  /\btest\b/i, /\binspect\b/i, /\bperform\b/i, /\bassess(ment)?\b/i, /\bverify\b/i,
  /\bsupervise\b/i, /\bcertif/i, /\bcode compliance\b/i, /\bstructural\b/i,
  /\bmechanically\b/i, /\bplumbing system\b/i, /\belectrical system\b/i,
  /\broof structure\b/i, /\bmold assessment\b/i,
];
function isOutOfScope(text) {
  return OUT_OF_SCOPE.some((re) => re.test(text || ""));
}

function buildRows(existingPriorities, intakeAreas) {
  const rows = [];
  const existing = (Array.isArray(existingPriorities) ? existingPriorities : []).filter(
    (p) => p && p.active !== false
  );
  const existingLower = new Set(existing.map((p) => (p.area || "").trim().toLowerCase()));
  existing.forEach((p, i) => {
    rows.push({
      _id: "ex_" + i,
      _existing: true,
      area: p.area || "",
      detail: p.detail || "",
      active: true,
      include_in_recurring: p.include_in_recurring === true,
      recurring_check_text: p.recurring_check_text || "",
      recurring_visit_type: p.recurring_visit_type || "",
    });
  });
  (intakeAreas || []).forEach((a) => {
    if (!a) return;
    if (existingLower.has(String(a).trim().toLowerCase())) return;
    rows.push({
      _id: "in_" + a,
      _existing: false,
      area: a,
      detail: "",
      active: true,
      include_in_recurring: false,
      recurring_check_text: "",
      recurring_visit_type: "",
    });
  });
  return rows;
}

export default function MonitoringPlanReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [client, setClient] = useState(null);
  const [clientPropertyCount, setClientPropertyCount] = useState(0);
  const [intake, setIntake] = useState(null);
  const [intakeAmbiguous, setIntakeAmbiguous] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [prop, allProps, allIntakes] = await Promise.all([
          base44.entities.Property.get(id),
          base44.entities.Property.list("-created_date", 500),
          base44.entities.CustomerIntake.list("-created_date", 200),
        ]);
        setProperty(prop);
        const cid = prop.owner_id || "";
        const clientProps = (allProps || []).filter((p) => p.owner_id === cid && !p.archived);
        setClientPropertyCount(clientProps.length);
        if (cid) { try { setClient(await base44.entities.Client.get(cid)); } catch (e) {} }
        const clientIntakes = (allIntakes || []).filter((i) => i.client_id === cid && !i.archived);
        const matched = resolveAppliedIntakeForPrefill(clientIntakes, id, clientProps.length);
        setIntake(matched);
        // Ambiguous = client has multiple properties AND no Applied intake is linked to THIS property.
        setIntakeAmbiguous(
          clientProps.length > 1 && !matched
        );
        const svc = await resolveServiceStatus(id);
        setServiceStatus(svc);
        const areas = (matched && matched.payload && matched.payload.monitoring_areas) || [];
        setRows(buildRows(prop.monitoring_priorities, areas));
      } catch (e) {}
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const visitType = serviceStatus?.status === "ok" ? serviceStatus.visitType : "";
  const pkg = serviceStatus?.package || null;
  const canConfirm = !!serviceStatus && serviceStatus.status === "ok" && !saving;

  // Local-only state updates. The Include switch is always tappable so staff can
  // turn it ON first, reveal the wording field, then enter/edit the wording. Scope
  // and blank-wording validation is enforced at Confirm time (never on the switch).
  const updateRow = (rowId, patch) => setRows((arr) => arr.map((r) => {
    if (r._id !== rowId) return r;
    return { ...r, ...patch };
  }));

  const toggleInclude = (rowId, on) => {
    updateRow(rowId, { include_in_recurring: on });
  };

  const onConfirm = async () => {
    if (!canConfirm) return;
    // Block confirmation while any included item has blank or out-of-scope wording.
    const invalidIncluded = rows.filter((r) => r.include_in_recurring && (!(r.recurring_check_text || "").trim() || isOutOfScope(r.recurring_check_text)));
    if (invalidIncluded.length) {
      setResult({ blocked: true, message: t("One or more included items have blank or out-of-scope wording. Edit each to a safe visual check (watch / check / confirm / look for) or turn Include OFF, then confirm.") });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      // Preserve inactive existing priorities unchanged.
      const inactiveExisting = (property.monitoring_priorities || []).filter(
        (p) => p && p.active === false
      );
      const final = [...inactiveExisting];
      rows.forEach((r) => {
        if (!r.area) return;
        const text = (r.recurring_check_text || "").trim();
        const safe = !isOutOfScope(text);
        if (r._existing) {
          // Preserve existing priority (active); include may be toggled by staff.
          final.push({
            area: r.area,
            detail: r.detail || "",
            active: true,
            include_in_recurring: !!r.include_in_recurring && !!text && safe,
            recurring_check_text: text,
            recurring_visit_type: r.recurring_visit_type || "",
          });
        } else if (r.include_in_recurring && text && safe) {
          // New approved request → becomes an active recurring priority.
          final.push({
            area: r.area,
            detail: "",
            active: true,
            include_in_recurring: true,
            recurring_check_text: text,
            recurring_visit_type: "",
          });
        }
        // Declined new requests are NOT saved as priorities.
      });
      await base44.entities.Property.update(id, { monitoring_priorities: final });
      const res = await updateRecurringChecklist(id);
      setResult(res);
      if (!res.blocked) {
        // Recompute onboarding on the Client Hub by remounting it.
        navigate(`/clients/${client?.id || property.owner_id || ""}`);
      }
    } catch (e) {
      setResult({ blocked: true, message: t("Could not confirm monitoring plan: {message}", { message: e?.message || e }) });
    }
    setSaving(false);
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!property) return <AppLayout><div className="p-6 text-sm text-muted-foreground">{t("Property not found.")}</div></AppLayout>;

  const payload = (intake && intake.payload) || {};
  const intakeAreas = payload.monitoring_areas || [];
  const intakeNotes = (payload.monitoring_notes || "").trim();

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-28 lg:pb-6">
        <PageBackButton fallback={`/properties/${id}`} className="mb-3" />
        <h1 className="text-xl font-semibold mb-3">{t("Monitoring Plan Review")}</h1>

        {/* Context */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Customer:")}</span> <span className="font-medium truncate">{client?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Property:")}</span> <span className="font-medium truncate">{property.name}</span></div>
            <div className="flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Active Service:")}</span> <span className="font-medium truncate">{pkg?.name || "—"}</span></div>
            <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" /> <span className="text-muted-foreground">{t("Recurring visit type:")}</span> <span className="font-medium">{visitType ? t(visitTypeLabel(visitType)) : "—"}</span></div>
          </div>
        </div>

        {/* Service gate */}
        {serviceStatus && serviceStatus.status !== "ok" && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">{t("Cannot confirm the monitoring plan yet")}</p>
              <p className="text-xs text-amber-700/80 mt-0.5">{serviceStatus.message}</p>
            </div>
          </div>
        )}

        {/* Customer requests (reference only) */}
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t("Customer Requested Monitoring")}</h2>
          </div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mb-3">{t("From customer intake — review required")}</p>

          {intakeAmbiguous ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("The client has multiple properties and the submitted intake could not be safely matched to this property. No intake-derived monitoring requests are shown. Add priorities manually below if needed.")}</span>
            </div>
          ) : !intake ? (
            <p className="text-sm text-muted-foreground">{t("No applied customer intake on file for this property.")}</p>
          ) : (
            <div className="space-y-3">
              {intakeAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No monitoring areas selected by the customer.")}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {intakeAreas.map((a) => (
                    <span key={a} className="inline-flex items-center text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40">{a}</span>
                  ))}
                </div>
              )}
              {intakeNotes && (
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <p className="text-[10px] uppercase text-muted-foreground mb-0.5">{t("Specific instructions")}</p>
                  <p className="whitespace-pre-wrap">{intakeNotes}</p>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground/70">{t("These are reference inputs for your review — they are NOT automatically recurring checks. Approve each item below to include it.")}</p>
            </div>
          )}
        </div>

        {/* Review rows */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-border font-medium text-sm flex items-center justify-between">
            <span>{t("Review & Approve")}</span>
            <span className="text-xs text-muted-foreground">{t("{count} item(s)", { count: rows.length })}</span>
          </div>
          <div className="divide-y divide-border">
            {rows.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">{t("No monitoring items to review. You can still confirm the plan to use the standard master checklist.")}</div>
            )}
            {rows.map((r) => {
              const text = (r.recurring_check_text || "").trim();
              const oos = isOutOfScope(text);
              const matchedExisting = r._existing && intakeAreas.some((a) => a.trim().toLowerCase() === (r.area || "").trim().toLowerCase());
              return (
                <div key={r._id} className="px-4 py-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{r.area}</p>
                      {r._existing && r.detail && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{r.detail}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {r._existing ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">{t("Existing priority")}</span>
                        ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">{t("From intake")}</span>
                        )}
                        {matchedExisting && <span className="text-[10px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400">{t("Matches intake")}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{t("Include in recurring visits")}</span>
                    <Switch checked={!!r.include_in_recurring} onCheckedChange={(v) => toggleInclude(r._id, v)} />
                  </div>

                  {r.include_in_recurring && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("Recurring check wording")}</p>
                      <Textarea
                        value={r.recurring_check_text}
                        onChange={(e) => updateRow(r._id, { recurring_check_text: e.target.value })}
                        rows={2}
                        placeholder={t("e.g. Watch the downstairs bedroom for visible humidity or moisture concerns.")}
                        className="bg-background"
                      />
                      <p className="text-[11px] text-muted-foreground/70 mt-1">{t("Describe a visual / property-care observation only — not a professional inspection.")}</p>
                    </div>
                  )}

                  {r.include_in_recurring && oos && (
                    <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/30 px-3 py-2">
                      <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">{t("Outside Property Care scope — reword to a visual check (watch / check / confirm / look for), or turn Include OFF. This item cannot be confirmed as written.")}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {result && (
          <div className={`rounded-2xl border p-4 mb-4 text-sm ${result.blocked ? "border-amber-500/30 bg-amber-500/5 text-amber-700" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"}`}>
            {result.message}
          </div>
        )}

        {/* Confirm bar */}
        <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border p-3 lg:left-64">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)} className="rounded-2xl">{t("Back")}</Button>
            <Button onClick={onConfirm} disabled={!canConfirm} className="flex-1 h-auto min-h-12 py-2.5 rounded-2xl text-base gap-2 whitespace-normal leading-snug">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} {t("Confirm Monitoring Plan")}
            </Button>
          </div>
          {!canConfirm && serviceStatus && serviceStatus.status !== "ok" && (
            <p className="text-[11px] text-muted-foreground text-center mt-1.5">{t("Confirmation requires a single active service agreement.")}</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}