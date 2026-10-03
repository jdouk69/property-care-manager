import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const VIA_OPTIONS = ["Email", "WhatsApp", "Phone", "In-person", "Signed document"];

/**
 * Owner-approval capture for Seasonal Opening / Seasonal Closing services.
 * Records how the owner approved THIS specific visit (steps, price, access /
 * key instructions, extra-time approval) before staff book it. Shared by the
 * booking paths; the createVisit backend function rejects any seasonal visit
 * created without a completed approval.
 */
export default function SeasonalApprovalFields({ approval, onChange, price, hourly, invalid }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3.5 space-y-3">
      <p className="text-[11px] uppercase tracking-wide text-amber-600">{t("Owner approval — required before the visit")}</p>
      <p className="text-xs text-muted-foreground">{t("Record how the owner approved this specific visit: the steps, the price, and access/key instructions.")}</p>
      <div>
        <Label className="text-xs mb-1.5 block">{t("Approved via")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {VIA_OPTIONS.map((v) => (
            <button key={v} onClick={() => onChange({ ...approval, via: v })}
              className={`px-3 py-2 rounded-xl border text-xs transition ${approval.via === v ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-card"}`}>
              {t(v)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">{t("Approval reference (e.g. email subject / message date)")}</Label>
        <Input value={approval.reference} onChange={(e) => onChange({ ...approval, reference: e.target.value })} className="rounded-xl" />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">{t("Approved steps for this visit")}</Label>
        <Textarea value={approval.tasks} onChange={(e) => onChange({ ...approval, tasks: e.target.value })} className="rounded-xl min-h-20" />
      </div>
      <div>
        <Label className="text-xs mb-1.5 block">{t("Access / key instructions (optional)")}</Label>
        <Textarea value={approval.keys} onChange={(e) => onChange({ ...approval, keys: e.target.value })} className="rounded-xl min-h-16" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={approval.extraTime} onCheckedChange={(c) => onChange({ ...approval, extraTime: !!c })} />
        {t(hourly != null ? "Owner pre-approved extra time at €{hourly}/hour" : "Owner pre-approved extra time", { hourly: hourly != null ? hourly.toFixed(0) : "" })}
      </label>
      {price != null && (
        <p className="text-xs text-muted-foreground">
          {t("Price to approve")}: <span className="font-semibold text-foreground">€{price.toFixed(0)}</span>
        </p>
      )}
      {invalid && (
        <p className="text-xs text-amber-600">{t("Select how the owner approved and enter the approved steps to continue.")}</p>
      )}
    </div>
  );
}