import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

// Staff-only activation action with explicit confirmation. Calls the
// authenticated agreementActivate backend (activate or activateReplacement).
// The backend validates all eligibility server-side; the browser only identifies
// the agreement. onActivated is called on success so the parent can refresh.
export default function ActivateServiceButton({ agreementId, isReplacement = false, onActivated, label }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const action = isReplacement ? "activateReplacement" : "activate";
      const res = await base44.functions.invoke("agreementActivate", { action, agreement_id: agreementId });
      const d = res && res.data ? res.data : res;
      if (d && d.ok) {
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

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5 w-full sm:w-auto">
        <Zap className="w-4 h-4" /> {btnLabel}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="bg-card rounded-2xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="text-base font-semibold">{isReplacement ? "Activate replacement agreement?" : "Activate this signed service agreement?"}</h3>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>The customer has signed this agreement.</li>
              <li>Activation makes this the operational agreement.</li>
              <li>Signed terms remain immutable.</li>
              {isReplacement
                ? <li>The previous active version will be moved to Ended; its signed evidence is preserved.</li>
                : <li>Service workflows may use this agreement after activation.</li>}
            </ul>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={run} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm Activate
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}