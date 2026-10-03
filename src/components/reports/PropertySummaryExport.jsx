import React, { useMemo, useState } from "react";
import { FileDown, FileText, Loader2, AlertTriangle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createNotification } from "@/lib/notifications";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { buildActivityReportModel, saveActivityReportPdf } from "@/lib/propertyActivityReport";
import { reportGenerationError } from "@/lib/reportDelivery";

/**
 * Secondary tool on the Reports page: a one-off staff PROPERTY ACTIVITY report
 * (visits / maintenance / expenses) for one property or across all properties.
 * Filters: property, optional date range, and an explicit Include-test-records
 * option (QA/test properties are excluded by default). Kept distinct from the
 * customer report delivery queue above — this is never sent to owners and
 * applies no customer-report exclusions.
 */
export default function PropertySummaryExport() {
  const { t } = useLanguage();
  const [propId, setPropId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeTest, setIncludeTest] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const { data: properties = [] } = useQuery({ queryKey: ["rep-props"], queryFn: () => base44.entities.Property.list("-created_date", 500) });
  const { data: visits = [] } = useQuery({ queryKey: ["rep-visits"], queryFn: () => base44.entities.PropertyVisit.list("-created_date", 1000) });
  const { data: maintenance = [] } = useQuery({ queryKey: ["rep-maint"], queryFn: () => base44.entities.MaintenanceIssue.list("-created_date", 1000) });
  const { data: expenses = [] } = useQuery({ queryKey: ["rep-exp"], queryFn: () => base44.entities.Expense.list("-date", 1000) });
  const { data: business } = useQuery({ queryKey: ["rep-business"], queryFn: async () => (await base44.entities.BusinessSettings.list())[0] });

  const input = useMemo(() => ({
    propertyId: propId === "all" ? "" : propId,
    startDate,
    endDate,
    includeTest,
    properties,
    visits,
    issues: maintenance,
    expenses,
    business: business || {},
  }), [propId, startDate, endDate, includeTest, properties, visits, maintenance, expenses, business]);

  // Live preview of the report scope with the exact same model the PDF uses.
  const model = useMemo(() => {
    if (!business) return null;
    try { return buildActivityReportModel(input); } catch { return null; }
  }, [business, input]);

  const selectedProp = properties.find((p) => p.id === (propId === "all" ? "" : propId));
  const isQaSelection = !!selectedProp && /^QA TEST/i.test(selectedProp.name || "");

  const generatePDF = async () => {
    setGenerating(true);
    setError("");
    try {
      await saveActivityReportPdf(input);
      createNotification({
        title: "Report ready",
        message: `Property activity report — ${model?.scopeName || "All Properties"}`,
        type: "System", priority: "Low", related_path: "/reports",
        dedup_key: `report_ready:${propId || "all"}:${new Date().toISOString().slice(0, 10)}`,
      });
    } catch (e) {
      setError(reportGenerationError(e, t));
    }
    setGenerating(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><FileText className="w-4 h-4" /></div>
        <div>
          <h3 className="font-medium text-sm">{t("Property Activity Report")}</h3>
          <p className="text-xs text-muted-foreground">{t("One-off staff PDF of visits, maintenance and expenses — per property or all properties.")}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs mb-1.5 block">{t("Property")}</Label>
          <Select value={propId} onValueChange={setPropId}>
            <SelectTrigger><SelectValue placeholder={t("All properties")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All properties")}</SelectItem>
              {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">{t("Include test records")}</Label>
          <div className="flex items-center gap-2 h-10">
            <Switch checked={includeTest} onCheckedChange={setIncludeTest} id="include-test-records" />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5" />
              {t("Add QA/test properties to the report")}
            </span>
          </div>
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">{t("From date")}</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs mb-1.5 block">{t("To date")}</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {isQaSelection && !includeTest && (
        <div className="flex items-start gap-2 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-500">
            {t("This is a test property — turn on “Include test records” to include its records.")}
          </p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-500">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mt-5">
        <Stat label={t("Visits")} value={model ? model.overview.visitTotal : "…"} />
        <Stat label={t("Outstanding maintenance")} value={model ? model.overview.outstanding : "…"} />
        <Stat label={t("Expenses total")} value={model ? `€${model.overview.expensesTotal.toFixed(2)}` : "…"} />
      </div>

      <Button onClick={generatePDF} disabled={generating || !model} className="w-full rounded-xl gap-2 h-11 mt-5">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        {generating ? t("Generating…") : t("Download PDF Report")}
      </Button>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}