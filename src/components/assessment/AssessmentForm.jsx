import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  SIZE_OPTIONS, COMPLEXITY_OPTIONS, VISIT_TIME_OPTIONS, SERVICE_AREA_OPTIONS, CHARACTERISTICS,
} from "@/lib/servicePricing";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Compact on-site service & pricing assessment form. Indicator fields only —
// they inform the recommendation; none of them is an automatic charge.
// All option values stay raw English (stored on the Property); the Greek
// labels below are display-only.
export default function AssessmentForm({ values, setField }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">{t("Approximate interior size *")}</Label>
        <Select value={values.assessment_interior_size || ""} onValueChange={(v) => setField("assessment_interior_size", v)}>
          <SelectTrigger className="sm:h-12"><SelectValue placeholder={t("Select size…")} /></SelectTrigger>
          <SelectContent>
            {SIZE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{t(o)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">{t("Additional separately checked residences/units *")}</Label>
        <Input
          className="sm:h-12" type="number" min="0" step="1"
          value={values.assessment_additional_units ?? 0}
          onChange={(e) => setField("assessment_additional_units", Math.max(0, parseInt(e.target.value) || 0))}
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          {t("Main residence is included. Count only separate habitable residences or substantial buildings that need their own check — not sheds, storage areas, cabinets or utility closets.")}
        </p>
      </div>

      <div>
        <Label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">{t("Property complexity *")}</Label>
        <Select value={values.assessment_complexity || ""} onValueChange={(v) => setField("assessment_complexity", v)}>
          <SelectTrigger className="sm:h-12"><SelectValue placeholder={t("Select complexity…")} /></SelectTrigger>
          <SelectContent>
            {COMPLEXITY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{t(o)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs sm:text-sm text-muted-foreground mb-2 block">{t("Property characteristics (indicators only — no automatic charges)")}</Label>
        <div className="space-y-2.5">
          {CHARACTERISTICS.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 min-h-[48px]">
              <span className="text-sm">{t(c.label)}</span>
              <Switch checked={!!values[c.key]} onCheckedChange={(v) => setField(c.key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">{t("Estimated normal visit time *")}</Label>
        <Select value={values.assessment_visit_time || ""} onValueChange={(v) => setField("assessment_visit_time", v)}>
          <SelectTrigger className="sm:h-12"><SelectValue placeholder={t("Select estimated time…")} /></SelectTrigger>
          <SelectContent>
            {VISIT_TIME_OPTIONS.map((o) => <SelectItem key={o} value={o}>{t(o)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">{t("Internal assessment note")}</Label>
        <Textarea
          rows={3} value={values.assessment_note || ""}
          onChange={(e) => setField("assessment_note", e.target.value)}
          placeholder={t("Optional internal note about the property or pricing…")}
        />
      </div>

      <div>
        <Label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">{t("Service area *")}</Label>
        <Select value={values.assessment_service_area || "Within normal service area"} onValueChange={(v) => setField("assessment_service_area", v)}>
          <SelectTrigger className="sm:h-12"><SelectValue placeholder={t("Select…")} /></SelectTrigger>
          <SelectContent>
            {SERVICE_AREA_OPTIONS.map((o) => <SelectItem key={o} value={o}>{t(o)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}