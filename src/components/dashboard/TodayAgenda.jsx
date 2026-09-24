import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarClock, AlertTriangle, CheckCircle2, MapPin, ListChecks, Wrench,
  ClipboardList, ClipboardCheck, ChevronDown, ChevronRight, Play, Navigation, ArrowRight,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildTodayAgenda, unsentReports } from "@/lib/todayAgenda";
import { startScheduledVisit } from "@/lib/visitStart";
import { athensToday } from "@/lib/timezone";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const OVERDUE_LIMIT = 6;
const TODAY_LIMIT = 8;
const ISSUE_LIMIT = 2;
const ISSUE_RANK = { Emergency: 0, High: 1, Medium: 2, Routine: 3 };

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
  const actionPrimary = ["start-visit", "continue-visit", "start-service", "view-report"].includes(item.actionKind);
  // Overdue (Needs Attention) card — MOBILE: plain block layout so all text
  // gets full card width and the action button sits on its OWN row underneath
  // (never beside the text). At sm+ it becomes the original side-by-side row.
  if (item.overdue) {
    return (
      <div className="px-4 py-3 hover:bg-muted/40 transition sm:flex sm:items-stretch sm:gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-600">
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground sm:truncate">{item.propertyName || t(item.typeLabel)}</div>
            <p className="text-xs text-muted-foreground sm:truncate">
              {item.propertyName ? t(item.typeLabel) : t("Overdue")}
              {item.clientName ? ` · ${t("Owner")}: ${item.clientName}` : ""}
            </p>
            <div className="mt-1">
              <span className="block text-[11px] px-2 py-1 rounded-md border bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-medium sm:inline-block sm:rounded-full sm:py-0.5">
                {odLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 w-full shrink-0 sm:mt-0 sm:w-auto sm:flex sm:items-center">
          {actionPrimary ? (
            <Button size="sm" onClick={() => onAction(item)} className="rounded-xl gap-1.5 h-9 px-3 w-full sm:w-auto">
              {actionIcon && React.createElement(actionIcon, { className: "w-4 h-4" })} {t(item.actionLabel)}
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 h-9 px-3 w-full sm:w-auto">
              <Link to={item.to}>{t(item.actionLabel)} <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          )}
        </div>
      </div>
    );
  }
  // Due Today / report / issue card — MOBILE: block layout, info gets the full
  // card width (wraps naturally), action button on its own row underneath.
  // At sm+ it renders exactly as the original side-by-side row.
  return (
    <div className="px-4 py-3 hover:bg-muted/40 transition sm:flex sm:items-stretch sm:gap-3">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            {item.timeLabel && <span className="text-sm font-semibold text-foreground shrink-0">{item.timeLabel}</span>}
            <span className="text-sm font-medium text-foreground sm:truncate">{item.propertyName || t(item.typeLabel)}</span>
          </div>
          <p className="text-xs text-muted-foreground sm:truncate">
            {t(item.typeLabel)}
            {item.clientName ? ` · ${t("Owner")}: ${item.clientName}` : ""}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${item.status === "In Progress" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : item.status === "Scheduled" ? "bg-sky-500/10 text-sky-600 border-sky-500/20" : "bg-muted text-muted-foreground border-border"}`}>{t(item.status)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 w-full shrink-0 sm:mt-0 sm:w-auto sm:flex sm:items-center">
        {actionPrimary ? (
          <Button size="sm" onClick={() => onAction(item)} className="rounded-xl gap-1.5 h-9 px-3 w-full sm:w-auto">
            {actionIcon && React.createElement(actionIcon, { className: "w-4 h-4" })} {t(item.actionLabel)}
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="rounded-xl gap-1.5 h-9 px-3 w-full sm:w-auto">
            <Link to={item.to}>{t(item.actionLabel)} <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Subsection({ label, count, to, viewAllLabel, tone, children }) {
  const { t } = useLanguage();
  return (
    <div>
      <div className={`flex items-center gap-2 px-4 py-2 ${tone === "danger" ? "bg-rose-500/10" : "bg-muted/40"}`}>
        {tone === "danger" && <AlertTriangle className="w-4 h-4 text-rose-600" />}
        <p className={`text-xs font-semibold tracking-wide ${tone === "danger" ? "text-rose-700 dark:text-rose-400" : "text-foreground"}`}>{t(label)}</p>
        {!!count && <span className="text-xs text-muted-foreground">{count}</span>}
        {to && <Link to={to} className="ml-auto text-xs text-primary flex items-center gap-1 hover:underline">{t(viewAllLabel || "View all")} <ArrowRight className="w-3 h-3" /></Link>}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

/**
 * Unified TODAY section — the single Home source of truth for actionable
 * work. Aggregates the EXISTING agenda builder (visits, tasks, maintenance
 * coordination, owner-rep reports, inspections — no duplicate records or
 * logic), unsent visit reports (unsentReports), and open maintenance issues,
 * and takes staff directly to the existing destination for each item.
 * Empty categories are omitted entirely.
 */
export default function TodayAgenda({ data }) {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [showCompleted, setShowCompleted] = useState(false);
  const { today: dueToday, overdue, completed } = useMemo(() => buildTodayAgenda(data), [data]);

  const properties = data.properties || [];
  const clients = data.clients || [];
  const propName = (id) => properties.find((p) => p.id === id)?.name || t("Property");
  const clientFor = (propId) => clients.find((c) => c.id === properties.find((x) => x.id === propId)?.owner_id)?.name || "";

  // Reports waiting to be reviewed/sent — existing report workflow (/reports?open=<id>).
  const reports = useMemo(() => unsentReports(data.visits || []), [data.visits]);
  const reportItems = reports.map((v) => ({
    id: v.id, kind: "visit", overdue: false,
    propertyName: propName(v.property_id), clientName: clientFor(v.property_id),
    typeLabel: `${visitTypeLabel(v.visit_type)} · ${t("Visit Report")}`,
    status: v.report_status || "Draft",
    to: `/reports?open=${v.id}`, actionLabel: "Review & Send", actionKind: "view-report",
  }));

  // Open issues requiring follow-up (existing status model: not Completed,
  // not Cancelled, not archived). Issues already surfaced by the agenda via a
  // today/past appointment or follow-up date are excluded to avoid duplicates.
  const surfacedIssueIds = useMemo(
    () => new Set([...dueToday, ...overdue].filter((i) => i.kind === "maintenance").map((i) => i.id)),
    [dueToday, overdue]
  );
  const issueItems = useMemo(() => (data.maintenance || [])
    .filter((m) => !m.archived && m.status !== "Completed" && m.status !== "Cancelled" && !surfacedIssueIds.has(m.id))
    .sort((a, b) => (ISSUE_RANK[a.priority] ?? 2) - (ISSUE_RANK[b.priority] ?? 2) || (b.created_date || "").localeCompare(a.created_date || ""))
    .map((m) => ({
      id: m.id, kind: "maintenance", overdue: false,
      propertyName: propName(m.property_id), clientName: clientFor(m.property_id),
      typeLabel: m.title || m.category || "Issue", status: m.status,
      to: `/maintenance/${m.id}`, actionLabel: "View Issue", actionKind: "view-issue",
    })),
    [data.maintenance, surfacedIssueIds]
  );

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

  const empty = dueToday.length === 0 && overdue.length === 0 && completed.length === 0
    && reportItems.length === 0 && issueItems.length === 0;

  // Header date follows the interface language, formatted from the SAME Athens
  // calendar date (UTC-noon anchor) — pure formatting, no timezone conversion.
  const todayIso = athensToday();
  const header = `${t("TODAY")} — ${new Date(todayIso + "T12:00:00Z").toLocaleDateString(lang === "el" ? "el-GR" : "en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}`;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold tracking-tight">{header}</h2>
      </div>

      {empty ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-foreground">{t("You're caught up — nothing needs attention right now.")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {/* Overdue / In-Progress work — most urgent, first */}
          {overdue.length > 0 && (
            <Subsection tone="danger" label="NEEDS ATTENTION" count={overdue.length} to={overdue.length > OVERDUE_LIMIT ? "/visits" : null} viewAllLabel="View all visits">
              {overdue.slice(0, OVERDUE_LIMIT).map((it) => <AgendaCard key={`od-${it.id}`} item={it} onAction={handleAction} />)}
            </Subsection>
          )}

          {/* Work due today */}
          {dueToday.length > 0 && (
            <Subsection label="DUE TODAY" count={dueToday.length} to={dueToday.length > TODAY_LIMIT ? "/calendar" : null} viewAllLabel="View Full Calendar">
              {dueToday.slice(0, TODAY_LIMIT).map((it) => <AgendaCard key={`td-${it.kind}-${it.id}`} item={it} onAction={handleAction} />)}
            </Subsection>
          )}

          {/* Reports waiting to be reviewed/sent — ONE compact summary row, not a
              list of cards. The existing Reports page is the full queue. */}
          {reportItems.length > 0 && (
            <Link to="/reports" className="block px-4 py-3 hover:bg-muted/40 transition sm:flex sm:items-center sm:gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600">
                  <FileText className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t("REPORTS TO SEND")}</p>
                  <p className="text-xs text-muted-foreground">{t("{count} waiting", { count: reportItems.length })} · {t("Completed visit reports waiting to be reviewed or sent")}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm font-medium text-primary shrink-0 sm:mt-0">
                {t("Review Reports")} <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          )}

          {/* Open issues requiring follow-up — at most the 2 highest-priority
              cards on Home; View All Issues routes to the existing list. */}
          {issueItems.length > 0 && (
            <Subsection label="OPEN ISSUES" count={issueItems.length} to={issueItems.length > ISSUE_LIMIT ? "/maintenance" : null} viewAllLabel="View All Issues">
              {issueItems.slice(0, ISSUE_LIMIT).map((it) => <AgendaCard key={`is-${it.id}`} item={it} onAction={handleAction} />)}
            </Subsection>
          )}

          {/* Completed today — collapsed by default */}
          {completed.length > 0 && (
            <div>
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
                    <div key={`cp-${it.kind}-${it.id}`} className="flex items-center gap-3 px-4 py-3 opacity-70">
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