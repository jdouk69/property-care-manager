import React from "react";
import { ShieldAlert, CheckCircle2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const SUGGESTED_AMOUNT = 300;

export default function EmergencyAuthSection({ values, set, frozen, confirmed, setConfirmed, canConfirm = true }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-600" />
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Emergency Repair Authorization</p>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Emergency Authorization</Label>
        <Textarea
          value={values.emergency_authorization || ""}
          onChange={(e) => set("emergency_authorization", e.target.value)}
          rows={2}
          disabled={frozen}
          placeholder="Describe the emergency action the company is authorized to take to protect the property."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Max Amount Without Contacting Owner (€)</Label>
          <span className="text-[11px] text-amber-600 font-medium">Suggested: €{SUGGESTED_AMOUNT}</span>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.01"
            value={values.emergency_max_amount ?? ""}
            onChange={(e) => set("emergency_max_amount", e.target.value === "" ? "" : Number(e.target.value))}
            disabled={frozen}
            placeholder="300"
            className="min-w-0"
          />
          {!frozen && values.emergency_max_amount !== SUGGESTED_AMOUNT && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => set("emergency_max_amount", SUGGESTED_AMOUNT)}
            >
              Use €{SUGGESTED_AMOUNT}
            </Button>
          )}
        </div>
        <p className="text-xs text-amber-600/90 mt-1.5 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          €{SUGGESTED_AMOUNT} is only a staff-side suggestion. Review and confirm this amount before sending the agreement to the customer — it is not customer-approved until the customer signs.
        </p>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">If Owner Cannot Be Reached</Label>
        <Textarea
          value={values.emergency_unreachable_instructions || ""}
          onChange={(e) => set("emergency_unreachable_instructions", e.target.value)}
          rows={2}
          disabled={frozen}
          placeholder="Instructions for what to do if you cannot reach the owner in an emergency."
        />
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
            I have reviewed and confirmed the emergency authorization above. I understand this must be confirmed before the agreement can be sent to the customer.
          </span>
        </label>
      )}
      {!frozen && !canConfirm && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> Complete all three emergency fields above before confirming.
        </p>
      )}
      {!frozen && canConfirm && !confirmed && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> Emergency authorization not yet confirmed.
        </p>
      )}
      {confirmed && !frozen && canConfirm && (
        <p className="text-xs text-emerald-600 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Emergency authorization confirmed for this draft.
        </p>
      )}
      {confirmed && !frozen && !canConfirm && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> Confirmation invalid — emergency fields are incomplete. Complete them and reconfirm.
        </p>
      )}
    </div>
  );
}