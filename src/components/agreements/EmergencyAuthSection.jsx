import React, { useState } from "react";
import { EMERGENCY_EXAMPLES, emergencyExamplePatch } from "@/lib/emergencyExamples";
import { ShieldAlert, CheckCircle2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function EmergencyAuthSection({ values, set, frozen, confirmed, setConfirmed, canConfirm = true, prefilled = {}, emergencyContact }) {
  const { t } = useLanguage();
  const [choice, setChoice] = useState("");
  const applyExample = () => {
    const patch = emergencyExamplePatch(choice, values.emergency_max_amount, t, frozen);
    if (!patch) return;
    Object.entries(patch).forEach(([field, value]) => set(field, value));
    setConfirmed(false);
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-600" />
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Emergency Repair Authorization")}</p>
      </div>

      {!frozen && (
        <div className="rounded-xl bg-muted/30 border border-border p-3 space-y-3">
          <p className="text-sm">{t("Ask the client what emergency work they authorize, their spending limit, and who to contact if they are unavailable. Enter their instructions here for review with the agreement.")}</p>
          <Label htmlFor="emergency-choice" className="block text-sm">{t("Choose a starting point")}</Label>
          <select id="emergency-choice" className="w-full min-h-[44px] rounded-md border border-input bg-background px-3 text-sm" value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">{t("Select an option…")}</option>
            {Object.entries(EMERGENCY_EXAMPLES).map(([key, example]) => <option key={key} value={key}>{t(example.label)}</option>)}
            <option value="custom">{t("Enter custom instructions")}</option>
          </select>
          {EMERGENCY_EXAMPLES[choice] && <>
            <p className="text-xs text-muted-foreground">{t("Applying an example replaces the two instruction fields below. You can edit the wording afterward.")}</p>
            {choice === "contact" && <p className="text-xs text-muted-foreground">{t("This option sets the spending limit to €0: owner approval is required before paid work.")}</p>}
            <Button type="button" variant="outline" onClick={applyExample}>{t("Fill fields with selected example")}</Button>
          </>}
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">{t("Read examples without changing fields")}</summary>
            <div className="mt-3 space-y-4">{Object.entries(EMERGENCY_EXAMPLES).map(([key, example]) => <div key={key} className="space-y-2">
              <p className="font-medium">{t(example.label)}</p>
              <p>{t(example.authorization)}</p>
              <p className="text-muted-foreground">{t("If Owner Cannot Be Reached")}: {t(example.unreachable)}</p>
            </div>)}</div>
          </details>
          <p className="text-xs text-muted-foreground">{t("These are suggested words, not customer approval. Confirm the instructions and limit with the client and have them review the final agreement before signing.")}</p>
        </div>
      )}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Emergency Authorization")}</Label>
        <Textarea
          value={values.emergency_authorization || ""}
          onChange={(e) => set("emergency_authorization", e.target.value)}
          rows={2}
          disabled={frozen}
          placeholder={t("Describe the emergency action the company is authorized to take to protect the property.")}
        />
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Max Amount Without Contacting Owner (€)")}</Label>
        <Input type="number" min="0" step="0.01" value={values.emergency_max_amount ?? ""}
          onChange={(e) => set("emergency_max_amount", e.target.value === "" ? "" : Number(e.target.value))}
          disabled={frozen} placeholder={t("Enter the limit discussed with the client")} className="min-w-0" />
        {!frozen && <div className="flex flex-wrap items-center gap-2 mt-2">
          <Button type="button" size="sm" variant="outline" onClick={() => set("emergency_max_amount", 300)}>{t("Use €{amount}", { amount: 300 })}</Button>
          <span className="text-xs text-muted-foreground">{t("Optional suggested limit. Confirm the amount with the client.")}</span>
        </div>}
        {!frozen && <p className="text-xs text-muted-foreground mt-1.5">{t("Enter the total per incident, including VAT and call-out fees. Enter 0 if paid work always requires owner approval. No amount is selected by default.")}</p>}
        {prefilled.max_amount && (
          <p className="text-[11px] text-blue-600 flex items-center gap-1.5 mt-1.5">
            <Info className="w-3 h-3 shrink-0" /> {t("From customer intake — review required")}
          </p>
        )}
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("If Owner Cannot Be Reached")}</Label>
        <Textarea
          value={values.emergency_unreachable_instructions || ""}
          onChange={(e) => set("emergency_unreachable_instructions", e.target.value)}
          rows={2}
          disabled={frozen}
          placeholder={t("Instructions for what to do if you cannot reach the owner in an emergency.")}
        />
        {!frozen && <p className="text-xs text-muted-foreground mt-1.5">
          {t("Emergency contact on file")}: {emergencyContact?.emergency_contact_name || t("Not provided")}{emergencyContact?.emergency_contact_phone ? ` · ${emergencyContact.emergency_contact_phone}` : ""}
          {(!emergencyContact?.emergency_contact_name || !emergencyContact?.emergency_contact_phone) && ` — ${t("Add or update the backup contact in the Client Hub.")}`}
        </p>}
        {prefilled.unreachable && (
          <p className="text-[11px] text-blue-600 flex items-center gap-1.5 mt-1.5">
            <Info className="w-3 h-3 shrink-0" /> {t("From customer intake — review required")}
          </p>
        )}
      </div>

      {!frozen && (
        <label className={`flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3 min-h-[44px] ${canConfirm ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
          <input
            type="checkbox"
            checked={!!confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={!canConfirm}
            className="mt-0.5 w-4 h-4 shrink-0 accent-primary"
          />
          <span className="text-xs text-foreground">
            {t("I have reviewed and confirmed the emergency authorization above. I understand this must be confirmed before the agreement can be sent to the customer.")}
          </span>
        </label>
      )}
      {!frozen && !canConfirm && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> {t("Complete all three emergency fields above before confirming.")}
        </p>
      )}
      {!frozen && canConfirm && !confirmed && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> {t("Emergency authorization not yet confirmed.")}
        </p>
      )}
      {confirmed && !frozen && canConfirm && (
        <p className="text-xs text-emerald-600 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> {t("Emergency authorization confirmed for this draft.")}
        </p>
      )}
      {confirmed && !frozen && !canConfirm && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> {t("Confirmation invalid — emergency fields are incomplete. Complete them and reconfirm.")}
        </p>
      )}
    </div>
  );
}