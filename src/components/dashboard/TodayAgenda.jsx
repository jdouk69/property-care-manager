import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarClock, AlertTriangle, CheckCircle2, MapPin, ListChecks, Wrench,
  ClipboardList, ClipboardCheck, ChevronDown, ChevronRight, Play, Navigation, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildTodayAgenda } from "@/lib/todayAgenda";
import { startScheduledVisit } from "@/lib/visitStart";
import { athensToday } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const KIND_ICON = {
  visit: MapPin, "arrival-prep": CalendarClock, task: ListChecks,
  maintenance: Wrench, "owner-rep": ClipboardList, inspection: ClipboardCheck,
};

function AgendaCard({ item, onAction }) {
  const { t, lang } = useLanguage();
  // Overdue chip is re-composed here from the structured fields (daysOverdue,
  // date, timeLabel) so the wording follows the interface language. The
  // agenda-building logic and its own overdueLabel stay untouched.
  const odLabel = item.overdue
    ? (() => {
        const days = item.daysOverdue || 0;
        const dateStr = new Date(item.date + "T12:00:00Z").toLocaleDateString(lang === "el" ? "el-GR" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        return item.timeLabel
          ? t(days === 1 ? "Due {date} at {time} · 1 day overdue" : "Due {date} at {time} · {days} days overdue", { date: dateStr, time: item.timeLabel, days })
          : t(days === 1 ? "Due {date} · 1 day overdue" : "Due {date} · {days} days overdue", { date: dateStr, days });
      })()
    : "";
  const Icon = KIND_ICON[item.kind] || ListChecks;
  const actionIcon = item.actionKind === "start-visit" ? Play
    : item.actionKind === "continue-visit" ? Navigation
    : item.actionKind === "start-service" ? Play
    : ArrowRight;
  const actionPrimary = item.actionKind === "start-visit" || item.actionKind === "continue-visit" || item.actionKind === "start-service";
  return (
    <div className="flex items-stretch gap-3 px-4 py-3 hover:bg-muted/40 transition">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.overdue ? "bg-rose-500/10 text-rose-600" : "bg-primary/10 text-primary"}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        {item.overdue ? (
          <>
            <div className="text-sm font-medium text-foreground truncate">{item.propertyName || t(item.typeLabel)}</div>
            <p className="text-xs text-muted-foreground truncate">
              {item.propertyName ? t(item.typeLabel) : t("Overdue")}
              {item.clientName ? ` · ${t("Owner")}: ${item.clientName}` : ""}
            </p>
            <div className="mt-1">
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-medium">
                {odLabel}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {item.timeLabel && <span className="text-sm font-semibold text-foreground">{item.timeLabel}</span>}
              <span className="text-sm font-medium text-foreground truncate">{item.propertyName || t(item.typeLabel)}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {t(item.typeLabel)}
              {item.clientName ? ` · ${t("Owner")}: ${item.clientName}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${item.status === "In Progress" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : item.status === "Scheduled" ? "bg-sky-500/10 text-sky-600 border-sky-500/20" : "bg-muted text-muted-foreground border-border"}`}>{t(item.status)}</span>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center shrink-0">
        {actionPrimary ? (
          <Button size="sm" onClick={() => onAction(item)} className="rounded-xl gap-1.5 h-9 px-3">
            {actionIcon && React.createElement(actionIcon, { className: "w-4 h-4" })} {t(item.actionLabel)}
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 h-9 px-3">
            <Link to={item.to}>{t(item.actionLabel)} <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function TodayAgenda({ data }) {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [showCompleted, setShowCompleted] = useState(false);
  const { today, overdue, completed } = useMemo(() => buildTodayAgenda(data), [data]);

  const handleAction = (item) => {
    if (item.actionKind === "start-visit") {
      startScheduledVisit(item.id, navigate);
    } else if (item.actionKind === "continue-visit") {
      navigate(item.to);
    } else if (item.actionKind === "start-service") {
      navigate(item.to);
    } else {
      navigate(item.to);
    }
  };

  const empty = today.length === 0 && overdue.length === 0 && completed.length === 0;

  // Header date follows the interface language, formatted from the SAME Athens
  // calendar date (UTC-noon anchor) — pure formatting, no timezone conversion.
  const todayIso = athensToday();
  const header = `${t("TODAY")} — ${new Date(todayIso + "T12:00:00Z").toLocaleDateString(lang === "el" ? "el-GR" : "en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}`;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold tracking-tight">{header}</h2>
      </div>

      {empty ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">{t("You're all caught up — nothing scheduled today.")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Needs attention */}
          {overdue.length > 0 && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-rose-500/20 bg-rose-500/10">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{t("NEEDS ATTENTION")}</p>
                <span className="text-xs text-rose-600/80 ml-auto">{t("{count} overdue", { count: overdue.length })}</span>
              </div>
              <div className="divide-y divide-border">
                {overdue.map((it) => <AgendaCard key={`${it.kind}-${it.id}`} item={it} onAction={handleAction} />)}
              </div>
            </div>
          )}

          {/* Today's work */}
          {today.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-primary/5">
                <CalendarClock className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">{t("Due Today")}</p>
                <span className="text-xs text-muted-foreground ml-auto">{today.length}</span>
              </div>
              <div className="divide-y divide-border">
                {today.map((it) => <AgendaCard key={`${it.kind}-${it.id}`} item={it} onAction={handleAction} />)}
              </div>
            </div>
          )}

          {/* Completed today */}
          {completed.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCompleted((s) => !s)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/40 transition"
              >
                {showCompleted ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-foreground">{t("Completed Today")}</p>
                <span className="text-xs text-muted-foreground ml-auto">{completed.length}</span>
              </button>
              {showCompleted && (
                <div className="divide-y divide-border border-t border-border">
                  {completed.map((it) => (
                    <div key={`${it.kind}-${it.id}`} className="flex items-center gap-3 px-4 py-3 opacity-70">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{it.propertyName || it.typeLabel}</p>
                        <p className="text-xs text-muted-foreground truncate">{t(it.typeLabel)}{it.clientName ? ` · ${it.clientName}` : ""}</p>
                      </div>
                      <Button asChild size="sm" variant="ghost" className="shrink-0">
                        <Link to={it.to}>{it.reportUnsent ? t("Review & Send") : t("View")} <ArrowRight className="w-3.5 h-3.5" /></Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}