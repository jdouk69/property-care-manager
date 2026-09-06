import React from "react";
import { Repeat } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { REPEAT_OPTIONS, WEEKDAYS } from "@/lib/recurrence";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function RecurrenceFields({ values, setField }) {
  const { t } = useLanguage();
  const rec = !!values.is_recurring;
  const freq = values.frequency || "Weekly";
  const monthlyish = ["Monthly", "Bimonthly", "Quarterly", "Semiannual", "Yearly"].includes(freq);
  const days = values.days_of_week || [];

  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Repeat className="w-4 h-4 text-primary" /> {t("Repeat")}
        </div>
        <Switch checked={rec} onCheckedChange={(v) => setField("is_recurring", v)} />
      </div>
      {rec && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">{t("Frequency")}</Label>
            <Select value={freq} onValueChange={(v) => setField("frequency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPEAT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{t(o.label)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {freq === "Custom" && (
            <div>
              <Label className="text-xs mb-1.5 block">{t("Every (days)")}</Label>
              <Input type="number" min={1} value={values.interval || 1} onChange={(e) => setField("interval", parseInt(e.target.value) || 1)} />
            </div>
          )}
          {freq === "Weekly" && (
            <div>
              <Label className="text-xs mb-1.5 block">{t("Days of week")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d, i) => {
                  const on = days.includes(i);
                  return (
                    <button key={d} type="button" onClick={() => setField("days_of_week", on ? days.filter((x) => x !== i) : [...days, i])}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${on ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {t(d)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {monthlyish && (
            <div>
              <Label className="text-xs mb-1.5 block">{t("Day of month (1–28)")}</Label>
              <Input type="number" min={1} max={28} value={values.day_of_month || ""} onChange={(e) => setField("day_of_month", parseInt(e.target.value) || undefined)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">{t("End date (optional)")}</Label>
              <Input type="date" value={values.end_date || ""} onChange={(e) => setField("end_date", e.target.value || null)} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{t("Reminder time")}</Label>
              <Input type="time" value={values.reminder_time || ""} onChange={(e) => setField("reminder_time", e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}