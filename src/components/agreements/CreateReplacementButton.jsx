import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Staff-only "create replacement / revised version" action. Calls the
// authenticated agreementReplace backend, which creates a new Pending/Draft
// version in the same agreement group (version = max + 1, evidence reset) and
// navigates staff to the new editable draft. The original frozen version is
// preserved unchanged.
export default function CreateReplacementButton({ agreementId, label = "Create Replacement Version" }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await base44.functions.invoke("agreementReplace", { action: "create", agreement_id: agreementId });
      const d = res && res.data ? res.data : res;
      if (d && d.ok) {
        navigate(`/agreements/${d.agreement_id}`);
      } else {
        setErr((d && d.error) || t("Could not create replacement."));
      }
    } catch (e) {
      const d = e && e.response && e.response.data ? e.response.data : null;
      setErr((d && d.error) || (e && e.message) || t("Could not create replacement."));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={run} disabled={busy} className="gap-1.5 w-full">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />} {t(label)}
      </Button>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}