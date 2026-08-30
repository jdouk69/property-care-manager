import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import SignaturePad from "@/components/agreements/SignaturePad";
import {
  Loader2, CheckCircle2, XCircle, ShieldCheck, PenLine, FileText, Home, User,
} from "lucide-react";

// Exact consent wording — must match the backend re-resolution exactly.
const consentText = (snapshot) => {
  const av = snapshot && snapshot.agreement_version != null ? String(snapshot.agreement_version) : "";
  const tv = snapshot && snapshot.terms_version != null ? String(snapshot.terms_version) : "";
  return `I confirm that I have read and understood this Service Agreement, Version ${av} (Terms Version ${tv}), and I agree to its terms. I consent to completing and signing this Agreement electronically, and I intend my electronic signature to indicate my acceptance of and agreement to be bound by these terms.`;
};

async function call(action, payload) {
  try {
    const res = await base44.functions.invoke("agreementPublic", { action, ...payload });
    return res && res.data ? res.data : res;
  } catch (e) {
    return e && e.response && e.response.data ? e.response.data : { error: (e && e.message) || "Something went wrong." };
  }
}

function fmt(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(); } catch (e) { return iso; }
}

function SummaryCard({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="text-sm text-foreground space-y-0.5">{children}</div>
    </div>
  );
}

export default function AgreementPublic() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [signature, setSignature] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(null); // "signed" | "declined" | { signer_name, signed_at, version }

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    (async () => {
      const d = await call("get", { token });
      if (d && d.error) { setError(d.error); setLoading(false); return; }
      setData(d);
      if (d && d.sent_snapshot && d.sent_snapshot.customer && d.sent_snapshot.customer.email) {
        setSignerEmail(d.sent_snapshot.customer.email || "");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const snap = data && data.sent_snapshot;

  const handleSign = async () => {
    setFormError("");
    if (!signerName || signerName.trim().length < 2) { setFormError("Please enter your full legal name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((signerEmail || "").trim())) { setFormError("Please enter a valid email address."); return; }
    if (!consent) { setFormError("Please tick the consent box to confirm you agree."); return; }
    if (!signature) { setFormError("Please draw your signature."); return; }
    setSubmitting(true);
    const d = await call("sign", {
      token,
      signer_name: signerName.trim(),
      signer_email: signerEmail.trim(),
      consent_accepted: true,
      consent_text: consentText(snap),
      signature,
    });
    setSubmitting(false);
    if (d && d.ok) {
      setDone({ type: "signed", signer_name: d.signer_name, signed_at: d.signed_at, version: d.agreement_version });
    } else {
      setFormError((d && d.error) || "Signing failed. Please try again.");
    }
  };

  const handleDecline = async () => {
    setFormError("");
    setSubmitting(true);
    const d = await call("decline", { token, confirm: true, decline_reason: declineReason });
    setSubmitting(false);
    if (d && d.ok) {
      setDone({ type: "declined" });
    } else {
      setFormError((d && d.error) || "Decline failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md text-center">
          <XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Agreement unavailable</h1>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <p className="text-sm text-slate-500">This agreement is not available.</p>
      </div>
    );
  }

  const biz = snap.business_identity || {};
  const customer = snap.customer || {};
  const property = snap.property || {};
  const service = snap.service || {};
  const fees = snap.fees || {};
  const schedule = snap.schedule || {};
  const emergency = snap.emergency_authorization || {};
  const sections = snap.sections || [];

  // Terminal states
  if (done && done.type === "signed") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-slate-900">Agreement signed successfully</h1>
            <p className="text-sm text-slate-600 mt-2">Signed by {done.signer_name} on {fmt(done.signed_at)}</p>
            <p className="text-xs text-slate-500 mt-1">Version {done.version}</p>
            <p className="text-sm text-slate-600 mt-5">A signed copy will be available from the service provider.</p>
          </div>
        </div>
      </div>
    );
  }
  if (done && done.type === "declined") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 text-center">
            <XCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h1 className="text-lg font-semibold text-slate-900">Decline recorded</h1>
            <p className="text-sm text-slate-600 mt-2">The service provider has been notified. They will contact you to discuss any requested changes.</p>
          </div>
        </div>
      </div>
    );
  }

  // Already signed before this visit
  if (data.signing_status === "Signed") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h1 className="text-lg font-semibold text-slate-900">This agreement has already been signed</h1>
            {data.signed_at && <p className="text-sm text-slate-600 mt-2">Signed on {fmt(data.signed_at)}</p>}
          </div>
        </div>
      </div>
    );
  }
  if (data.signing_status === "Declined") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 text-center">
            <XCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h1 className="text-lg font-semibold text-slate-900">This agreement has been declined</h1>
            <p className="text-sm text-slate-600 mt-2">The service provider will contact you to discuss any requested changes.</p>
          </div>
        </div>
      </div>
    );
  }

  const consentTextValue = consentText(snap);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Service Agreement</p>
              <h1 className="text-lg font-semibold text-slate-900 leading-tight">{biz.name || "Service Provider"}</h1>
              {biz.owner_name && <p className="text-xs text-slate-500">{biz.owner_name}</p>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {biz.address && <span>{biz.address}</span>}
            {biz.phone && <span>· {biz.phone}</span>}
            {biz.email && <span>· {biz.email}</span>}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Version {snap.agreement_version} · Terms Version {snap.terms_version} · {snap.language || "English"}
            {data.sent_at && <span> · Sent {fmt(data.sent_at)}</span>}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <SummaryCard icon={User} label="Customer">
            <p className="font-medium">{customer.full_name || "—"}</p>
            {customer.email && <p className="text-xs text-slate-500">{customer.email}</p>}
          </SummaryCard>
          <SummaryCard icon={Home} label="Property">
            <p className="font-medium">{property.name || "—"}</p>
            {property.address && <p className="text-xs text-slate-500">{property.address}</p>}
          </SummaryCard>
          <SummaryCard icon={FileText} label="Service">
            <p className="font-medium">{service.package_name || "—"}</p>
            {service.inspection_frequency && <p className="text-xs text-slate-500">Inspection: {service.inspection_frequency}</p>}
          </SummaryCard>
          <SummaryCard icon={PenLine} label="Fees">
            <p className="font-medium">{fees.agreed_price ? `€${fees.agreed_price}` : "—"}{fees.billing_frequency ? ` · ${fees.billing_frequency}` : ""}</p>
            {fees.vat_wording && <p className="text-xs text-slate-500">{fees.vat_wording}</p>}
          </SummaryCard>
        </div>

        {schedule.start_date && (
          <div className="text-xs text-slate-500 mb-4">
            Start: {schedule.start_date}{schedule.renewal_date ? ` · Renewal: ${schedule.renewal_date}` : ""}
          </div>
        )}

        {/* Frozen sections */}
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 mb-4 space-y-5">
          {sections.map((s, i) => (
            <section key={s.id || i}>
              <h2 className="text-sm font-semibold text-slate-900 mb-1.5">{i + 1}. {s.heading}</h2>
              {(s.paragraphs || []).map((p, j) => (
                <p key={j} className="text-sm text-slate-700 leading-relaxed mb-1.5 whitespace-pre-line">{p}</p>
              ))}
            </section>
          ))}
          {snap.additional_terms && (
            <section>
              <h2 className="text-sm font-semibold text-slate-900 mb-1.5">Additional Terms</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{snap.additional_terms}</p>
            </section>
          )}
          {emergency.text && (
            <section>
              <h2 className="text-sm font-semibold text-slate-900 mb-1.5">Emergency Authorization</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{emergency.text}</p>
              <p className="text-sm text-slate-700 mt-1">Pre-approved limit: {emergency.max_amount}</p>
              {emergency.unreachable_instructions && (
                <p className="text-sm text-slate-700 mt-1">If unreachable: {emergency.unreachable_instructions}</p>
              )}
            </section>
          )}
        </div>

        {/* Signable form */}
        {data.signable ? (
          <div className="rounded-2xl border border-slate-300 bg-white p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Sign this agreement</h2>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">Full legal name</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Your full legal name" />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Email address</Label>
              <Input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="you@example.com" />
            </div>

            <div className="rounded-lg border border-border bg-slate-50 p-3">
              <p className="text-sm text-slate-700 leading-relaxed">{consentTextValue}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <Label htmlFor="consent" className="text-sm text-slate-700 cursor-pointer">I agree</Label>
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">Signature</Label>
              <SignaturePad onChange={setSignature} disabled={submitting} />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <Button onClick={handleSign} disabled={submitting} className="w-full h-11 text-base gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />} Sign Agreement
            </Button>

            <button
              type="button"
              onClick={() => setDeclineOpen(true)}
              className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
            >
              Decline / Request Changes
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white p-5 text-center">
            <p className="text-sm text-slate-600">This agreement cannot currently be signed. Please contact the service provider.</p>
          </div>
        )}

        {declineOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => !submitting && setDeclineOpen(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-slate-900">Decline this agreement?</h3>
              <p className="text-sm text-slate-600">This will notify the service provider that you are not accepting the agreement. You can add a note about what you'd like changed.</p>
              <Label className="text-xs font-medium block">Reason / requested changes (optional)</Label>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[80px]"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Optional note for the service provider"
              />
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setDeclineOpen(false)} disabled={submitting}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDecline} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Confirm Decline
                </Button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">Your electronic signature is legally binding. This page is provided securely by {biz.name || "the service provider"}.</p>
      </div>
    </div>
  );
}