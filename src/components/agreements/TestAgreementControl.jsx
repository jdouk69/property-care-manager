import React, { useState } from "react";
import { FlaskConical, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Staff-only control for marking a Draft agreement as a TEST agreement.
//
// TEST mode bypasses the production legal-approval gate for ONE explicitly
// marked agreement only, so staff can exercise the full send → sign → activate
// workflow during QA. It NEVER marks the terms template active/legal_approved,
// and it NEVER affects production agreements (which default to false). Enabling
// requires explicit confirmation. Customer-facing surfaces and the signed PDF
// are watermarked. Emergency confirmation (#3) and intake prefilling (#7) are
// unaffected.
export default function TestAgreementControl({ value, onToggle, disabled }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { t } = useLanguage();

  const handleCheck = (checked) => {
    if (checked === true) {
      setConfirmOpen(true); // require explicit confirmation to ENABLE
    } else {
      onToggle(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-400/70 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-amber-600" />
        <p className="text-xs uppercase tracking-wide font-semibold text-amber-700">{t("TEST AGREEMENT")}</p>
      </div>

      <label className={`flex items-start gap-2.5 min-h-[44px] ${disabled ? "opacity-60" : "cursor-pointer"}`}>
        <Checkbox
          id="is_test_agreement"
          checked={!!value}
          onCheckedChange={handleCheck}
          disabled={disabled}
          className="mt-0.5"
        />
        <span className="text-sm text-foreground">{t("This is a test agreement")}</span>
      </label>

      <div className="flex items-start gap-1.5 text-xs text-amber-700/90">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>{t("Test agreements are for internal workflow testing only. They are not valid production customer agreements. The terms template is not legally approved and will be clearly watermarked on every customer-facing surface and PDF.")}</p>
      </div>

      {value && (
        <p className="text-xs text-amber-700 font-medium">{t("TEST mode is enabled — Send for Signature is unlocked for this draft only.")}</p>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="bg-card rounded-2xl w-full max-w-md p-5 space-y-3 border-2 border-amber-400/70" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-semibold">{t("Enable TEST mode?")}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{t("This marks this draft as a test agreement. The production legal-approval gate will be bypassed for this draft only, so it can be sent and signed to exercise the workflow. The terms template stays inactive and not legally approved. Test agreements are clearly watermarked and are not valid production customer agreements.")}</p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>{t("Cancel")}</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setConfirmOpen(false); onToggle(true); }}>{t("Enable TEST mode")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}