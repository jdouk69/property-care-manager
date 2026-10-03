import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CalendarPlus, CalendarClock, Loader2, Home as HomeIcon, Navigation } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { createNotification } from "@/lib/notifications";
import { athensLocalToIso, athensVisitWhen } from "@/lib/timezone";
import { SPECIAL_VISIT_TYPES, specialServicePrice } from "@/lib/specialServices";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import SeasonalApprovalFields from "@/components/visits/SeasonalApprovalFields";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * Add Service — schedule a special-purpose one-time / add-on service for an
 * EXISTING client & property (Client Hub → Add Service, Property → Add
 * Service). Reuses the existing architecture end-to-end:
 *
 *   - creates the EXISTING PropertyVisit entity (status "Scheduled"),
 *   - client is resolved from the property's owner (never re-selected),
 *   - the price is resolved from the EXISTING ServicePackage configuration
 *     via the stable default_visit_type relationship and SNAPSHOTTED on the
 *     visit (agreed_price) — a later package price change never rewrites a
 *     scheduled visit's price,
 *   - unpriced services show "Price Not Configured" and are schedulable —
 *     no price is invented, nothing is silently charged €0,
 *   - the checklist keeps its existing start-time resolution
 *     (property-specific → master → built-in seed) — nothing is copied at
 *     scheduling,
 *   - the same on-schedule notification as the wizard's Schedule Visit flow,
 *   - NO charge is created at scheduling or start — the service charge is
 *     staff-confirmed after completion (SpecialServiceChargeCard).
 */
export default function AddServiceSheet({ open, onOpenChange, clientId, propertyId }) {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [packages, setPackages] = useState([]);
  const [pid, setPid] = useState(propertyId || "");
  const [serviceType, setServiceType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Two ways to proceed once a service is selected: start it NOW (create the
  // visit already in the started state and jump straight into the wizard) or
  // schedule it for later (the existing scheduling flow).
  const [scheduleLater, setScheduleLater] = useState(false);
  const [starting, setStarting] = useState(false);
  // Owner approval — required for Seasonal Opening / Closing BEFORE the work
  // is performed: records the specific approved tasks, the approved price,
  // access/key instructions and any extra-time approval (the per-visit
  // approval record; the general property agreement alone is not enough).
  const [approval, setApproval] = useState({ via: "", reference: "", tasks: "", keys: "", extraTime: false });
  const [recordedBy, setRecordedBy] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setServiceType(""); setDate(""); setTime(""); setError("");
    setScheduleLater(false); setStarting(false);
    setApproval({ via: "", reference: "", tasks: "", keys: "", extraTime: false });
    setRecordedBy("");
    setPid(propertyId || "");
    (async () => {
      setLoading(true);
      try {
        const [allProps, pkgs, me] = await Promise.all([
          base44.entities.Property.list("-created_date", 500),
          base44.entities.ServicePackage.list("-created_date", 500),
          base44.auth.me().catch(() => null),
        ]);
        setRecordedBy(me?.full_name || me?.email || "");
        const clientProps = (allProps || []).filter((p) => !p.archived && (!clientId || p.owner_id === clientId));
        setProperties(clientProps);
        setPackages((pkgs || []).filter((p) => p.active !== false));
        // Single property → preselected; never force a re-selection.
        if (!propertyId && clientProps.length === 1) setPid(clientProps[0].id);
      } catch (e) {}
      setLoading(false);
    })();
  }, [open, propertyId, clientId]);

  const chosen = serviceType ? specialServicePrice(packages, serviceType) : null;
  const prop = properties.find((p) => p.id === pid);

  // Seasonal services require the per-visit owner approval before work.
  const isSeasonal = serviceType === "Seasonal Opening" || serviceType === "Seasonal Closing";
  const approvalValid = !isSeasonal || (!!approval.via && !!approval.tasks.trim());
  const hourly = chosen?.pkg?.hourly_charge != null ? Number(chosen.pkg.hourly_charge) : null;
  const buildOwnerApproval = () => ({
    approved_via: approval.via,
    approved_reference: approval.reference.trim(),
    approved_tasks: approval.tasks.trim(),
    key_instructions: approval.keys.trim(),
    extra_time_approved: approval.extraTime,
    approved_price: chosen?.price != null ? chosen.price : null,
    approved_at: new Date().toISOString(),
    recorded_by: recordedBy,
  });

  const save = async () => {
    if (!pid || !serviceType || !date || !time || !approvalValid) return;
    setSaving(true);
    setError("");
    try {
      // Interpret the entered date/time as Athens wall-clock → tz-correct instant.
      const iso = athensLocalToIso(date, time);
      const { pkg, price } = chosen || {};
      const created = (await base44.functions.invoke("createVisit", {
        property_id: pid,
        visit_type: serviceType,
        status: "Scheduled",
        start_time: iso,
        scheduled_time: iso,
        // Price snapshot at scheduling (price safety): only stored when a
        // price is actually configured — unpriced services stay unpriced.
        ...(price != null ? { agreed_price: price } : {}),
        ...(pkg ? {
          pricing_snapshot: {
            purchase_type: "Special Service",
            service_package_id: pkg.id,
            package_name: pkg.name,
            standard_price: price,
            scheduled_at: new Date().toISOString(),
          },
        } : {}),
        ...(isSeasonal ? { owner_approval: buildOwnerApproval() } : {}),
      })).data.visit;
      // Same on-schedule confirmation notification as the wizard's flow
      // (respects the Visits category setting).
      try {
        const sList = await base44.entities.BusinessSettings.list("-created_date", 1);
        const cats = (sList && sList[0] && sList[0].notif_categories) || [];
        if (cats.includes("Visits")) {
          await createNotification({
            title: "Visit scheduled",
            message: `${prop?.name || "Property"} · ${visitTypeLabel(serviceType)} · ${athensVisitWhen(iso)}`,
            type: "Visit",
            priority: "Medium",
            related_entity: "PropertyVisit",
            related_record_id: created.id,
            related_property_id: pid,
            related_path: `/visits/${created.id}`,
            dedup_key: `visit_scheduled:${created.id}`,
          });
        }
      } catch (e) {}
      const whenLabel = lang === "el" && iso
        ? (() => { try { return new Intl.DateTimeFormat("el-GR", { timeZone: "Europe/Athens", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)); } catch (er) { return athensVisitWhen(iso); } })()
        : athensVisitWhen(iso);
      toast({ title: t("Service scheduled"), description: `${prop?.name || ""} · ${t(visitTypeLabel(serviceType))} · ${whenLabel}` });
      onOpenChange(false);
    } catch (e) {
      setError(t("Could not schedule service: {message}", { message: e?.message || e }));
    }
    setSaving(false);
  };

  // Start Now — create the service visit in the SAME started state the
  // existing Start Visit action produces (status "In Progress" + start_time
  // now, same price snapshot as scheduling) as ONE record, then open the
  // Visit Wizard through the same /visits?resume=<id> route. The wizard's
  // resume mode loads the checklist template and applies the visit-type
  // workflow (e.g. Grocery Stocking sections) — no duplicate record is made
  // and nothing is charged at start (charges stay staff-confirmed after
  // completion, exactly as with a scheduled visit that is started).
  const startNow = async () => {
    if (!pid || !serviceType || !approvalValid) return;
    setStarting(true);
    setError("");
    try {
      const { pkg, price } = chosen || {};
      const nowIso = new Date().toISOString();
      const created = (await base44.functions.invoke("createVisit", {
        property_id: pid,
        visit_type: serviceType,
        status: "In Progress",
        start_time: nowIso,
        // Same price snapshot as the scheduling flow (price safety): only
        // stored when a price is actually configured.
        ...(price != null ? { agreed_price: price } : {}),
        ...(pkg ? {
          pricing_snapshot: {
            purchase_type: "Special Service",
            service_package_id: pkg.id,
            package_name: pkg.name,
            standard_price: price,
            started_at: nowIso,
          },
        } : {}),
        ...(isSeasonal ? { owner_approval: buildOwnerApproval() } : {}),
      })).data.visit;
      onOpenChange(false);
      navigate(`/visits?resume=${created.id}`);
    } catch (e) {
      setError(t("Could not start service: {message}", { message: e?.message || e }));
    }
    setStarting(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setError(""); onOpenChange(o); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("Add Service")}</SheetTitle>
          <SheetDescription className="sr-only">{t("Choose Service")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No properties for this client.")}</p>
          ) : !pid ? (
            <>
              <p className="text-sm text-muted-foreground">{t("Select property")}</p>
              <div className="space-y-2">
                {properties.map((p) => (
                  <button key={p.id} onClick={() => setPid(p.id)}
                    className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><HomeIcon className="w-4 h-4" /></span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.address || "—"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Property context — resolved from the owner; never re-selected */}
              <div className="rounded-2xl border border-border bg-card p-3 text-sm">
                <p className="text-muted-foreground">{t("Property:")}</p>
                <p className="font-medium truncate">{prop?.name || t("Property")}</p>
                {prop?.address && <p className="text-xs text-muted-foreground truncate">{prop.address}</p>}
              </div>

              {/* Service selection */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Choose Service")}</Label>
                <div className="space-y-2">
                  {SPECIAL_VISIT_TYPES.map((vt) => {
                    const { price } = specialServicePrice(packages, vt);
                    const active = serviceType === vt;
                    return (
                      <button key={vt} onClick={() => setServiceType(vt)}
                        className={`w-full text-left rounded-2xl border p-3.5 transition ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">{t(visitTypeLabel(vt))}</span>
                          {price != null ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 shrink-0">€{price.toFixed(0)}</span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">{t("Price Not Configured")}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Owner approval — per-visit record, required for seasonal services */}
              {serviceType && isSeasonal && (
                <SeasonalApprovalFields
                  approval={approval}
                  onChange={setApproval}
                  price={chosen?.price != null ? chosen.price : null}
                  hourly={hourly}
                  invalid={!approvalValid}
                />
              )}

              {/* Start Now / Schedule for Later — the two ways to proceed */}
              {serviceType && !scheduleLater && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button onClick={startNow} disabled={starting || !approvalValid} className="h-14 rounded-2xl text-base gap-2">
                    {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />} {t("Start Now")}
                  </Button>
                  <Button variant="outline" onClick={() => setScheduleLater(true)} disabled={starting || !approvalValid} className="h-14 rounded-2xl text-base gap-2">
                    <CalendarClock className="w-5 h-5" /> {t("Schedule for Later")}
                  </Button>
                </div>
              )}

              {/* Date / time — only for the Schedule for Later choice */}
              {serviceType && scheduleLater && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Visit Date")}</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:h-11" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Visit Time")}</Label>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="sm:h-11" />
                  </div>
                </div>
              )}

              {/* Price summary before scheduling */}
              {serviceType && (
                <div className="rounded-2xl border border-border bg-muted/40 p-3 text-sm">
                  <p className="text-muted-foreground">{t("Service:")} <span className="font-medium text-foreground">{t(visitTypeLabel(serviceType))}</span></p>
                  <p className="text-muted-foreground mt-0.5">
                    {t("Service Price")}:{" "}
                    {chosen?.price != null ? (
                      <span className="font-semibold text-foreground">€{chosen.price.toFixed(2)}</span>
                    ) : (
                      <span className="font-medium text-amber-600">{t("Price Not Configured")}</span>
                    )}
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">{t("Cancel")}</Button>
          {scheduleLater && (
            <Button onClick={save} disabled={saving || !pid || !serviceType || !date || !time || !approvalValid} className="rounded-full gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />} {t("Schedule Service")}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}