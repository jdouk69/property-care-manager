import React from "react";
import { Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Read-only display of the customer's latest submitted intake emergency
// authorization data. REFERENCE ONLY — never auto-applied to the agreement.
export default function IntakeReferenceCard({ intake }) {
  const { t } = useLanguage();
  if (!intake || !intake.payload) return null;
  const p = intake.payload || {};
  const ref = {
    "Repair authorization preference": p.emergency_repair_authorization,
    "Max amount without contacting owner": p.max_authorize_amount,
    "Instructions if you cannot be reached": p.unreachable_instructions,
    "Emergency contact name": p.emergency_contact_name,
    "Emergency contact phone": p.emergency_contact_phone,
  };
  const hasAny = Object.values(ref).some((v) => v !== undefined && v !== null && v !== "");
  if (!hasAny) return null;

  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Customer Intake — reference only")}</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {t("These values were provided by the customer in their intake form. They are shown for reference only and are not applied to the agreement automatically. Decide what goes into the agreement fields below.")}
      </p>
      <div className="space-y-2">
        {Object.entries(ref).map(([label, value]) => {
          if (value === undefined || value === null || value === "") return null;
          return (
            <div key={label} className="text-sm">
              <p className="text-xs text-muted-foreground">{t(label)}</p>
              <p className="text-foreground whitespace-pre-wrap">{String(value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}