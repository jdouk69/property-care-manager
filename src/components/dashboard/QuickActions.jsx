import React from "react";
import { Link } from "react-router-dom";
import { MapPin, CalendarClock, AlertTriangle, Plus, Plane, FileText, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function ActionTile({ to, onClick, icon: Icon, label, sub, tone, className }) {
  const inner = (
    <div className={`flex items-center gap-3 h-14 rounded-xl border px-3.5 transition ${tone}`}>
      <span className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{label}</p>
        {sub && <p className="text-xs opacity-70 truncate">{sub}</p>}
      </div>
      <ArrowRight className="w-4 h-4 ml-auto shrink-0 opacity-60" />
    </div>
  );
  if (to) return <Link to={to} className={className}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={`w-full text-left ${className || ""}`}>{inner}</button>;
}

/**
 * Home QUICK ACTIONS — every tile routes into an EXISTING workflow:
 * Start/Continue Visit → visit wizard, Schedule Visit → visit scheduler,
 * Report Issue → ReportIssueSheet (MaintenanceIssue entity), Add Task →
 * simplified Quick Task form, Prep Arrival → visit scheduler pre-filled with
 * Owner Arrival Preparation, Send Reports → existing report review/send queue.
 * No functionality is duplicated here.
 */
export default function QuickActions({ startVisitTo, startVisitLabel, onReportIssue, reportsWaiting }) {
  const { t } = useLanguage();
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">{t("QUICK ACTIONS")}</p>
      <Link to={startVisitTo} className="block mb-2">
        <div className="flex items-center gap-3 h-16 rounded-xl bg-primary text-primary-foreground px-3.5 hover:bg-primary/90 shadow-sm transition">
          <span className="w-11 h-11 rounded-lg bg-primary-foreground/15 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{startVisitLabel}</p>
            <p className="text-[11px] opacity-80 truncate">{t("Open the visit workflow for a property")}</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto shrink-0" />
        </div>
      </Link>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
        <ActionTile to="/visits?schedule=1" icon={CalendarClock} label={t("Schedule Visit")} tone="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10" />
        <ActionTile onClick={onReportIssue} icon={AlertTriangle} label={t("Report Issue")} tone="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-500 hover:bg-amber-500/20" />
        <ActionTile to="/tasks?add=1" icon={Plus} label={t("Add Task")} tone="border-border bg-card hover:border-primary/30 hover:shadow-md" />
        <ActionTile to="/visits?schedule=1&visit_type=Owner%20Arrival%20Preparation" icon={Plane} label={t("Prep Arrival")} tone="border-border bg-card hover:border-primary/30 hover:shadow-md" />
      </div>
      <ActionTile
        to="/reports"
        icon={FileText}
        label={t("Send Reports")}
        sub={reportsWaiting ? t("{count} waiting", { count: reportsWaiting }) : null}
        tone={reportsWaiting ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-500 hover:bg-amber-500/20" : "border-border bg-card hover:border-primary/30 hover:shadow-md"}
      />
    </div>
  );
}