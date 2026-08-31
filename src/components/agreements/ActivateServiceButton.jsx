import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Loader2, AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

// Staff-only activation action with an explicit confirmation dialog. Calls the
// authenticated agreementActivate backend (activate or activateReplacement).
// The backend validates all eligibility server-side; the browser only identifies
// the agreement. onActivated is called on success so the parent can refresh.
//
// The confirmation fetches the agreement + client + property + package to show a
// clear summary (customer, property, service, start date, visit frequency,
// billing) and a prominent TEST notice for test agreements. This is the SINGLE
// shared activation surface used by the Client Hub agreement card, the Client
// Hub onboarding progress, and the Service Agreement page so behavior cannot
// drift between them.
export default function ActivateServiceButton({ agreementId, isReplacement = false, onActivated, label }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const navigate = useNavigate();

  const openDialog = async () => {
    setOpen(true);
    setErr("");
    // Fetch summary details for the confirmation. Failures here do not block
    // activation; the backend is the source of truth for eligibility.
    setLoadingDetails(true);
    try {
      const ag = await base44.entities.PropertyServiceAgreement.get(agreementId);
      const [client, property, pkg] = await Promise.all([
        ag.client_id ? base44.entities.Client.get(ag.client_id).catch(() => null) : Promise.resolve(null),
        ag.property_id ? base44.entities.Property.get(ag.property_id).catch(() => null) : Promise.resolve(null),
        ag.service_package_id ? base44.entities.ServicePackage.get(ag.service_package_id).catch(() => null) : Promise.resolve(null),
      ]);
      setDetails({ agreement: ag, client, property, pkg });
    } catch (e) {
      setDetails(null);
    }
    setLoadingDetails(false);
  };

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const action = isReplacement ? "activateReplacement" : "activate";
      const res = await base44.functions.invoke("agreementActivate", { action, agreement_id: agreementId });
      const d = res && res.data ? res.data : res;
      if (d && (d.ok || d.status === "Active")) {
        setOpen(false);
        if (onActivated) onActivated(d);
        else navigate(0);
      } else {
        setErr((d && (d.message || d.error)) || "Activation failed.");
      }
    } catch (e) {
      const d = e && e.response && e.response.data ? e.response.data : null;
      setErr((d && (d.message || d.error)) || (e && e.message) || "Activation failed.");
    }
    setBusy(false);
  };

  const btnLabel = label || (isReplacement ? "Activate Replacement" : "Activate Service");
  const isTest = !!(details && details.agreement && details.agreement.is_test_agreement === true);
  const ag = details && details.agreement;
  const pkgName = details && details.pkg ? details.pkg.name : ag ? "Service package" : "";
  const priceLabel = ag && ag.agreed_price != null ? `€${Number(ag.agreed_price).toFixed(0)}` : "";

  return (
    <>
      <Button onClick={openDialog} className="gap-1.5 w-full sm:w-auto">
        <Zap className="w-4 h-4" /> {btnLabel}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="bg-card rounded-2xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="text-base font-semibold">{isReplacement ? "Activate replacement agreement?" : "Activate Service?"}</h3>
            </div>

            {isTest && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/30 px-3 py-2">
                <FlaskConical className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">TEST AGREEMENT — activation is for workflow testing only.</p>
              </div>
            )}

            {loadingDetails ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : ag ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
                {details.client && <Row label="Customer" value={details.client.name} />}
                {details.property && <Row label="Property" value={details.property.name} />}
                {pkgName && <Row label="Service" value={pkgName} />}
                {ag.start_date && <Row label="Start date" value={ag.start_date} />}
                {ag.inspection_frequency && <Row label="Visit frequency" value={ag.inspection_frequency} />}
                {priceLabel && <Row label="Billing" value={`${priceLabel} ${ag.billing_type || ""}`.trim()} />}
              </div>
            ) : null}

            <p className="text-sm text-muted-foreground">
              {isReplacement
                ? "This will activate the signed replacement and move the previous active version to Ended; its signed evidence is preserved."
                : "This will activate the signed service agreement and allow onboarding/service visits to begin."}
            </p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-5">
              <li>Signed terms remain immutable.</li>
              <li>No new agreement version is created.</li>
            </ul>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={run} disabled={busy || loadingDetails}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {btnLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}