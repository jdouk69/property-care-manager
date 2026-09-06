import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { Button } from "@/components/ui/button";
import { Image as UIImage } from "@/components/ui/image";
import { Loader2, CheckCircle2 } from "lucide-react";
import { athensMediumDateTime } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { assistanceChargeBreakdown, assistanceServiceName } from "@/lib/propertyAssistance";
import AssistanceCreateForm from "@/components/property-assistance/AssistanceCreateForm";
import AssistancePerformer from "@/components/property-assistance/AssistancePerformer";

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function DoneView({ visit, property, client, business, onDone }) {
  const { t, lang } = useLanguage();
  const base = Number(visit.agreed_price) || 0;
  const minutes = Number(visit.additional_minutes) || 0;
  const additionalLabor = Number(visit.additional_labor_charge) || 0;
  const travel = Number(visit.travel_charge) || 0;
  const materials = Number(visit.materials_charge) || 0;
  const hasFrozen = visit.final_total != null;
  const breakdown = assistanceChargeBreakdown({ base, additionalLabor, travel, materials, vatRate: hasFrozen ? visit.vat_rate_snapshot : business?.vat_rate });
  const total = hasFrozen ? Number(visit.final_total) : breakdown.total;
  const vat = hasFrozen ? Number(visit.vat_amount) : breakdown.vat;
  const vatRate = hasFrozen ? Number(visit.vat_rate_snapshot) : business?.vat_rate || 0;
  const photos = visit.photos || [];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
        <h2 className="font-semibold text-lg">{t("{service} Complete", { service: t(assistanceServiceName(visit.visit_type)) })}</h2>
        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{visit.request_description}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-sm">
        <Row label={t("Completed")} value={athensMediumDateTime(visit.end_time, lang)} />
        <Row label={t("Property")} value={property?.name || "—"} />
        <Row label={t("Owner")} value={client?.name || "—"} />
        <Row label={t("Base service")} value={`€${base.toFixed(2)}`} />
        {minutes > 0 || additionalLabor > 0 ? (
          <Row label={t("Additional labor ({minutes} min)", { minutes })} value={`€${additionalLabor.toFixed(2)}`} />
        ) : null}
        <Row label={t("Travel charge")} value={`€${travel.toFixed(2)}`} />
        {materials > 0 ? <Row label={t("Materials")} value={`€${materials.toFixed(2)}`} /> : null}
        <Row label={t("Subtotal")} value={`€${breakdown.subtotal.toFixed(2)}`} />
        {vatRate ? <Row label={t("VAT ({rate}%)", { rate: vatRate })} value={`€${vat.toFixed(2)}`} /> : null}
        {vatRate ? <Row label={t("Total")} value={`€${total.toFixed(2)}`} bold /> : null}
        <Row label={t("Photos")} value={String(photos.length)} />
      </div>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden">
              <UIImage src={url} className="w-full h-full" fittingType="fill" />
            </a>
          ))}
        </div>
      )}
      <Button onClick={onDone} className="w-full h-12 rounded-2xl">{t("Done")}</Button>
      {property && (
        <Link to={`/properties/${property.id}`} className="block text-center text-sm text-primary hover:underline">
          {t("Open property")}
        </Link>
      )}
      <Link to="/visits" className="block text-center text-sm text-muted-foreground hover:underline">
        {t("View in Visits")}
      </Link>
    </div>
  );
}

export default function PropertyAssistance() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [visit, setVisit] = useState(null);
  const [property, setProperty] = useState(null);
  const [client, setClient] = useState(null);
  const [business, setBusiness] = useState({});
  const [step, setStep] = useState(id ? "perform" : "create");

  const loadContext = async (v) => {
    const [props, bss] = await Promise.all([
      base44.entities.Property.list("-created_date", 500),
      base44.entities.BusinessSettings.list("-created_date", 1),
    ]);
    const p = (props || []).find((x) => x.id === v.property_id);
    setProperty(p || null);
    setBusiness(bss?.[0] || {});
    if (p?.owner_id) {
      try {
        setClient(await base44.entities.Client.get(p.owner_id));
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (!id) {
      (async () => {
        try {
          const bss = await base44.entities.BusinessSettings.list("-created_date", 1);
          setBusiness(bss?.[0] || {});
        } catch (e) {}
      })();
      return;
    }
    (async () => {
      try {
        const v = await base44.entities.PropertyVisit.get(id);
        setVisit(v);
        await loadContext(v);
        if (v.status === "Completed") setStep("done");
      } catch (e) {}
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onCreated = (v, startedNow) => {
    if (startedNow) {
      setVisit(v);
      setStep("perform");
      loadContext(v);
    } else {
      navigate("/");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback="/" className="mb-3" />
        {step === "create" && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">{t("On-Demand Property Assistance")}</h1>
            <p className="text-sm text-muted-foreground mb-4">
              {t("One-time owner request — €70 + VAT, first 30 minutes included, additional time €45/hour + VAT.")}
            </p>
            <AssistanceCreateForm
              preClient={searchParams.get("client")}
              preProperty={searchParams.get("property")}
              onCreated={onCreated}
            />
          </>
        )}
        {step === "perform" && visit && (
          <>
            <h1 className="text-xl font-semibold tracking-tight mb-3">{t(assistanceServiceName(visit.visit_type))}</h1>
            <AssistancePerformer
              visit={visit}
              property={property}
              client={client}
              business={business}
              onVisitUpdated={setVisit}
              onCompleted={(v) => {
                setVisit(v);
                setStep("done");
              }}
            />
          </>
        )}
        {step === "done" && visit && (
          <>
            <h1 className="text-xl font-semibold tracking-tight mb-3">{t(assistanceServiceName(visit.visit_type))}</h1>
            <DoneView
              visit={visit}
              property={property}
              client={client}
              business={business}
              onDone={() => navigate(property ? `/clients/${client?.id || property.owner_id || ""}` : "/")}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}