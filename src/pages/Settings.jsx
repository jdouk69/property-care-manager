import React, { useState, useEffect, useRef } from "react";
import { Settings as SettingsIcon, Loader2, Check, Plus, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { exportEntityCsv } from "@/lib/exportCsv";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import PageBackButton from "@/components/ui/PageBackButton";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const FUTURE_FEATURES = [
  "Client Portal", "Client Mobile App", "Online Payments", "Invoicing", "AI Inspection Assistant",
  "Voice Notes", "OCR Receipt Scanning", "GPS Visit Verification", "Route Optimization",
  "Employee Scheduling", "Inventory Management", "Automated Weather Alerts", "Smart Reminders", "Digital Signatures"
];

export default function Settings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newItem, setNewItem] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.BusinessSettings.list("-created_date", 10);
        if (list && list.length) setSettings(list[0]);
        else {
          const created = await base44.entities.BusinessSettings.create({ business_name: "Property Care Manager", default_checklist: [], language: "English" });
          setSettings(created);
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const setField = (k, v) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setSaved(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await base44.entities.BusinessSettings.update(settings.id, { [k]: v });
        setSaving(false); setSaved(true);
      } catch (e) { setSaving(false); }
    }, 900);
  };

  const addChecklistItem = () => {
    if (!newItem.trim()) return;
    setField("default_checklist", [...(settings.default_checklist || []), newItem.trim()]);
    setNewItem("");
  };
  const removeChecklistItem = (idx) => {
    setField("default_checklist", (settings.default_checklist || []).filter((_, i) => i !== idx));
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!settings) return <AppLayout><div className="p-6">{t("Failed to load settings.")}</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
        <PageBackButton className="mb-3" />
        <PageHeader title={t("Settings")} subtitle={t("Operational and system preferences")} icon={SettingsIcon} />
        <div className="flex items-center justify-end gap-1.5 h-5 text-xs text-muted-foreground">
          {saving && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("Saving…")}</>}
          {saved && !saving && <><Check className="w-3.5 h-3.5 text-emerald-500" /> {t("Saved")}</>}
        </div>

        {/* Language preference */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-4">
          <h3 className="font-medium text-sm mb-4">{t("Language")}</h3>
          <div className="max-w-xs">
            <Select value={settings.language || "English"} onValueChange={(v) => setField("language", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="English">English</SelectItem><SelectItem value="Greek">{t("Greek (Ελληνικά)")}</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        {/* Default checklist */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-4">
          <h3 className="font-medium text-sm mb-3">{t("Default Inspection Checklist")}</h3>
          <div className="flex gap-2 mb-3">
            <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={t("Add checklist item…")} onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} />
            <Button onClick={addChecklistItem} size="icon"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(settings.default_checklist || []).map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-sm bg-muted px-2.5 py-1 rounded-full">
                {item}
                <button onClick={() => removeChecklistItem(i)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {(!settings.default_checklist || !settings.default_checklist.length) && <p className="text-sm text-muted-foreground">{t("No items yet. Add sections like Gates, Pool, Roof…")}</p>}
          </div>
        </div>

        {/* Data export */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-4">
          <h3 className="font-medium text-sm mb-1">{t("Data Export")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("Download your business records as CSV for backup.")}</p>
          <div className="flex flex-wrap gap-2">
            {["Client", "Property", "Task", "Inspection", "MaintenanceIssue", "Expense", "Invoice", "Contractor", "Key"].map((e) => (
              <button key={e} onClick={() => exportEntityCsv(e)} className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-muted hover:border-primary/30 transition">{t(e)}</button>
            ))}
          </div>
        </div>

        {/* Reminder preferences */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-4">
          <h3 className="font-medium text-sm mb-1">{t("Notifications & Reminders")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("Choose when and where you receive reminders. Email and push are coming soon.")}</p>

          <Label className="text-xs font-medium text-muted-foreground mb-2 block">{t("Remind me")}</Label>
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { v: "due", l: "At due time" },
              { v: "1h", l: "1 hour before" },
              { v: "1d", l: "1 day before" },
              { v: "3d", l: "3 days before" },
              { v: "7d", l: "7 days before" },
            ].map((o) => {
              const arr = settings.reminder_offsets || [];
              const on = arr.includes(o.v);
              return (
                <button key={o.v} onClick={() => setField("reminder_offsets", on ? arr.filter((x) => x !== o.v) : [...arr, o.v])}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${on ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  {t(o.l)}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {["Tasks", "Inspections", "Maintenance", "Contractors", "Expenses", "Keys", "Reports", "Visits"].map((cat) => {
              const arr = settings.notif_categories || ["Tasks", "Inspections", "Maintenance", "Contractors", "Expenses", "Keys", "Reports", "Visits"];
              const on = arr.includes(cat);
              return (
                <div key={cat} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm">{t(cat)}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${on ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{t("In-app")}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground/60">{t("Email · Soon")}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground/60">{t("Push · Soon")}</span>
                    <Switch checked={on} onCheckedChange={(v) => setField("notif_categories", v ? [...arr, cat] : arr.filter((x) => x !== cat))} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Future features */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-primary" /><h3 className="font-medium text-sm">{t("Coming Soon")}</h3></div>
          <p className="text-xs text-muted-foreground mb-4">{t("Planned for future versions.")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FUTURE_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2 rounded-lg bg-muted/50">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" /> {t(f)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}