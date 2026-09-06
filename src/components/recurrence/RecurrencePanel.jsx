import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Repeat, SkipForward, Pause, Play, Square, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildRepeatLabel, skipOccurrence, pauseSeries, resumeSeries, endSeries, updateSeriesTemplate,
} from "@/lib/recurrence";

const STATUS_TONE = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  ended: "bg-muted text-muted-foreground border-border",
};

export default function RecurrencePanel({ entityType, record, reload }) {
  const { t, lang } = useLanguage();
  const [rule, setRule] = useState(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (record?.recurrence_id) {
      base44.entities.RecurrenceRule.get(record.recurrence_id).then(setRule).catch(() => {});
    }
  }, [record?.recurrence_id]);

  if (!record?.recurrence_id || !rule) return null;

  const refresh = async () => {
    try {
      const r = await base44.entities.RecurrenceRule.get(rule.id);
      setRule(r);
    } catch (e) {}
  };

  const act = async (fn, label) => {
    setBusy(label);
    try {
      await fn();
      await refresh();
      if (reload) reload();
    } finally {
      setBusy("");
    }
  };

  // Next-date display: English keeps the raw date; Greek formats the same stored
  // value with the Greek locale (UTC-noon anchor — formatting only).
  const nextDateLabel = rule.next_date
    ? (lang === "el"
        ? new Date(rule.next_date + "T12:00:00Z").toLocaleDateString("el-GR", { day: "numeric", month: "short", timeZone: "UTC" })
        : rule.next_date)
    : "—";

  const template =
    entityType === "Task"
      ? { title: record.title, task_type: record.type, priority: record.priority, assigned_to: record.assigned_to, property_id: record.property_id, notes: record.notes }
      : { title: "Inspection", inspector: record.inspector, property_id: record.property_id, priority: "High", notes: record.summary_notes };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Repeat className="w-4 h-4 text-primary" /> {t("Recurring series")}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_TONE[rule.status]}`}>{t(rule.status)}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {t("Repeats:")} <span className="font-medium text-foreground">{t(buildRepeatLabel(rule))}</span> · {t("Next:")} <span className="font-medium text-foreground">{nextDateLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" disabled={!!busy} onClick={() => act(() => skipOccurrence(entityType, record.id), "skip")}>
          {busy === "skip" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <SkipForward className="w-3.5 h-3.5 mr-1" />} {t("Skip")}
        </Button>
        {rule.status === "active" ? (
          <Button variant="outline" size="sm" disabled={!!busy} onClick={() => act(() => pauseSeries(rule.id), "pause")}>
            {busy === "pause" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Pause className="w-3.5 h-3.5 mr-1" />} {t("Pause")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={rule.status === "ended" || !!busy} onClick={() => act(() => resumeSeries(rule.id), "resume")}>
            {busy === "resume" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />} {t("Resume")}
          </Button>
        )}
        <Button variant="outline" size="sm" disabled={!!busy} onClick={() => { if (confirm(t("End this recurring series? No further occurrences will be created."))) act(() => endSeries(rule.id), "end"); }}>
          {busy === "end" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Square className="w-3.5 h-3.5 mr-1" />} {t("End")}
        </Button>
        <Button variant="outline" size="sm" disabled={!!busy} onClick={() => act(() => updateSeriesTemplate(rule.id, template), "update")}>
          {busy === "update" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />} {t("Update future")}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t("Editing fields above only changes")} <span className="font-medium">{t("this occurrence")}</span>. {t("Use \"Update future\" to apply this occurrence's details to upcoming ones.")}
      </p>
    </div>
  );
}