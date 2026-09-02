import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Plus, CalendarClock, AlertTriangle, ClipboardCheck, Wrench, Home, ListChecks,
  Truck, HardHat, ArrowRight, CheckCircle2, KeyRound, Wallet, Receipt, Package,
  MessageSquare, MapPin, StickyNote, TrendingUp, Plane, Zap, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AppLayout from "@/components/layout/AppLayout";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { badgeTone } from "@/components/resource/ResourceListPage";
import { generateTimeBasedNotifications } from "@/lib/notifications";
import { loadDraft } from "@/lib/visitDraft";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { athensToday, athensDate, athensTime, athensDateOffset, athensDayLabel, TZ } from "@/lib/timezone";
import CancelVisitMenu from "@/components/visits/CancelVisitMenu";
import ActionCard from "@/components/dashboard/ActionCard";
import TodayAgenda from "@/components/dashboard/TodayAgenda";
import ReportsToSendReminder from "@/components/dashboard/ReportsToSendReminder";
import { getActionableCounts } from "@/lib/onboardingHandoff";

const today = athensToday;
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const ACTION_GROUPS = [
  {
    label: "Manage",
    items: [
      { label: "Clients", to: "/clients", icon: HardHat, color: "bg-rose-500" },
      { label: "Properties", to: "/properties", icon: Home, color: "bg-indigo-500" },
    ],
  },
  {
    label: "Plan",
    items: [
      { label: "Add Task", to: "/tasks?add=1", icon: Plus, color: "bg-violet-500" },
      { label: "Prep Arrival", to: "/visits?schedule=1&visit_type=Owner%20Arrival%20Preparation", icon: Plane, color: "bg-fuchsia-500" },
      { label: "One-Time", to: "/one-time", icon: Zap, color: "bg-cyan-500" },
      { label: "Visits", to: "/visits", icon: History, color: "bg-blue-500" },
    ],
  },
  {
    label: "Property Visit",
    items: [
      { label: "New Inspection", to: "/inspections", icon: ClipboardCheck, color: "bg-sky-500" },
      { label: "Visits", to: "/visits", icon: MapPin, color: "bg-blue-500" },
      { label: "Key Activity", to: "/keys", icon: KeyRound, color: "bg-cyan-500" },
    ],
  },
  {
    label: "Follow-Up",
    items: [
      { label: "Log Issue", to: "/maintenance?add=1", icon: Wrench, color: "bg-amber-500" },
      { label: "Contractor Visit", to: "/deliveries", icon: Truck, color: "bg-orange-500" },
      { label: "Add Expense", to: "/expenses?add=1", icon: Wallet, color: "bg-emerald-500" },
      { label: "Add Receipt", to: "/expenses?add=1", icon: Receipt, color: "bg-teal-500" },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Owner Update", to: "/communications?add=1", icon: MessageSquare, color: "bg-blue-500" },
    ],
  },
];

function AlertRow({ to, title, subtitle, tone, badge }) {
  const dot = { danger: "bg-rose-500", warning: "bg-amber-500", info: "bg-sky-500", success: "bg-emerald-500" };
  return (
    <Link to={to} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/50 transition text-left">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot[tone] || "bg-muted-foreground"}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      {badge && <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${badgeTone(badge)}`}>{badge}</span>}
    </Link>
  );
}

function Section({ title, icon: Icon, to, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
          <Icon className="w-4 h-4 text-muted-foreground" /> {title}
        </div>
        {to && <Link to={to} className="text-xs text-primary flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></Link>}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ title, subtitle, badge }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {badge && <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${badgeTone(badge)}`}>{badge}</span>}
    </div>
  );
}

function Next3Days({ visits, properties, clients }) {
  const days = [
    { idx: 0, date: athensToday() },
    { idx: 1, date: athensDateOffset(1) },
    { idx: 2, date: athensDateOffset(2) },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
          <CalendarClock className="w-4 h-4 text-muted-foreground" /> NEXT 3 DAYS
        </div>
        <Link to="/calendar" className="text-xs text-primary flex items-center gap-1 hover:underline">View Full Calendar <ArrowRight className="w-3 h-3" /></Link>
      </div>
      {days.map((d, i) => {
        const dayVisits = (visits || [])
          .filter((v) => v.status === "Scheduled" && !v.archived && athensDate(v.scheduled_time || v.start_time) === d.date)
          .sort((a, b) => (a.scheduled_time || a.start_time || "").localeCompare(b.scheduled_time || b.start_time || ""));
        const heading = i === 0 ? `TODAY — ${athensDayLabel(d.date)}` : i === 1 ? `TOMORROW — ${athensDayLabel(d.date)}` : athensDayLabel(d.date);
        return (
          <div key={d.date} className={i > 0 ? "border-t border-border" : ""}>
            <div className="px-4 py-2 bg-muted/40">
              <p className="text-xs font-semibold tracking-wide text-foreground">{heading}</p>
            </div>
            {dayVisits.length === 0 ? (
              <div className="px-4 py-3"><p className="text-sm text-muted-foreground">No visits scheduled</p></div>
            ) : (
              <div className="divide-y divide-border">
                {dayVisits.map((v) => {
                  const prop = properties.find((p) => p.id === v.property_id);
                  const client = clients.find((c) => c.id === prop?.owner_id);
                  const st = v.scheduled_time || v.start_time;
                  return (
                    <Link key={v.id} to={`/visits/${v.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition">
                      <span className="text-base font-semibold text-foreground shrink-0 w-12">{athensTime(st)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{client?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{prop?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{visitTypeLabel(v.visit_type)}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-600 border-sky-500/20 shrink-0 mt-0.5">{v.status}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuickNotes({ settingsId, initial }) {
  const [val, setVal] = useState(initial || "");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!settingsId) return;
      try { await base44.entities.BusinessSettings.update(settingsId, { quick_notes: val }); setSaved(true); setTimeout(() => setSaved(false), 1200); } catch (e) {}
    }, 900);
    return () => clearTimeout(t);
  }, [val]);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-medium text-sm"><StickyNote className="w-4 h-4 text-muted-foreground" /> Quick Notes</div>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
      <Textarea value={val} onChange={(e) => setVal(e.target.value)} placeholder="Jot down anything important…" rows={3} className="resize-none" />
    </div>
  );
}

function NextActionCard({ draft, propName, openIssuesByProp, prepTask, onCancelDone }) {
  if (draft && draft.propertyId) {
    return (
      <div className="relative rounded-2xl bg-primary text-primary-foreground p-4 mb-5 shadow-sm overflow-hidden">
        <Link to="/visits?continue=1" className="block pr-12 hover:opacity-95 transition">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide opacity-80">Continue working — visit in progress</p>
                <p className="font-semibold truncate">Continue Visit — {propName(draft.propertyId)}</p>
                <p className="text-xs opacity-80 truncate">{visitTypeLabel(draft.visitType) || "Monthly Property Watch"}</p>
              </div>
            </div>
            <span className="text-sm font-medium shrink-0 flex items-center gap-1">Continue <ArrowRight className="w-4 h-4" /></span>
          </div>
        </Link>
        <div className="absolute top-2 right-2">
          <CancelVisitMenu
            draft={draft}
            onDone={onCancelDone}
            triggerClassName="text-primary-foreground hover:bg-primary-foreground/15"
          />
        </div>
      </div>
    );
  }
  if (openIssuesByProp) {
    return (
      <Link to="/maintenance" className="block rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-5 hover:bg-amber-500/10 transition">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0"><Wrench className="w-5 h-5" /></span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-amber-600">Next action</p>
              <p className="font-semibold truncate">{propName(openIssuesByProp.propertyId)}</p>
              <p className="text-xs text-muted-foreground truncate">{openIssuesByProp.count} open issue{openIssuesByProp.count !== 1 ? "s" : ""} need follow-up</p>
            </div>
          </div>
          <span className="text-sm font-medium text-amber-700 dark:text-amber-500 shrink-0 flex items-center gap-1">View Issues <ArrowRight className="w-4 h-4" /></span>
        </div>
      </Link>
    );
  }
  if (prepTask) {
    return (
      <Link to="/tasks" className="block rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 mb-5 hover:bg-sky-500/10 transition">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0"><Plane className="w-5 h-5" /></span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-sky-600">Next action</p>
              <p className="font-semibold truncate">Arrival {prepTask.when} — {propName(prepTask.propertyId)}</p>
              <p className="text-xs text-muted-foreground truncate">Preparation checklist incomplete</p>
            </div>
          </div>
          <span className="text-sm font-medium text-sky-700 dark:text-sky-500 shrink-0 flex items-center gap-1">Continue Prep <ArrowRight className="w-4 h-4" /></span>
        </div>
      </Link>
    );
  }
  return null;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ tasks: [], inspections: [], maintenance: [], properties: [], clients: [], contractors: [], expenses: [], keys: [], invoices: [], visits: [], agreements: [], intakes: [], servicePackages: [], repReports: [] });
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [tasks, inspections, maintenance, properties, clients, contractors, expenses, keys, invoices, visits, agreements, intakes, servicePackages, repReports, sList] = await Promise.all([
          base44.entities.Task.list("-date", 200),
          base44.entities.Inspection.list("-date", 200),
          base44.entities.MaintenanceIssue.list("-created_date", 200),
          base44.entities.Property.list("-created_date", 200),
          base44.entities.Client.list("-created_date", 200),
          base44.entities.Contractor.list("-created_date", 200),
          base44.entities.Expense.list("-date", 200),
          base44.entities.Key.list("-created_date", 200),
          base44.entities.Invoice.list("-created_date", 200),
          base44.entities.PropertyVisit.list("-start_time", 200),
          base44.entities.PropertyServiceAgreement.list("-created_date", 200),
          base44.entities.CustomerIntake.list("-created_date", 200),
          base44.entities.ServicePackage.list("-created_date", 200),
          base44.entities.OwnerRepReport.list("-created_date", 200),
          base44.entities.BusinessSettings.list("-created_date", 1),
        ]);
        setData({ tasks, inspections, maintenance, properties, clients, contractors, expenses, keys, invoices, visits, agreements, intakes, servicePackages, repReports });
        if (sList && sList[0]) setSettings(sList[0]);
      } catch (e) {}
      setLoading(false);
      setDraft(loadDraft());
      generateTimeBasedNotifications().catch(() => {});
    })();
  }, []);

  const t = today();
  const ownerName = settings?.owner_name || "Jim";
  const propName = (id) => data.properties.find((p) => p.id === id)?.name || "Property";
  const active = (x) => x.status !== "Completed" && x.status !== "Cancelled" && x.recurrence_status !== "skipped";
  const todaysTasks = data.tasks.filter((x) => x.date === t);
  const nextAppointment = todaysTasks.filter((x) => x.time).sort((a, b) => a.time.localeCompare(b.time))[0];
  const overdue = data.tasks.filter((x) => x.date && x.date < t && active(x));
  const inspToday = data.inspections.filter((x) => x.date === t && x.recurrence_status !== "skipped");
  const overdueInspections = data.inspections.filter((x) => x.status === "Draft" && x.date && x.date < t && x.recurrence_status !== "skipped");
  const upcomingInspections = data.inspections.filter((x) => x.date >= t).slice(0, 5);
  const contractorsToday = data.tasks.filter((x) => x.type === "Contractor Meeting" && x.date === t && active(x));
  const deliveries = data.tasks.filter((x) => x.type === "Delivery" && x.date === t && active(x));
  const arrivals = data.tasks.filter((x) => (x.type === "Arrival preparation" || x.type === "Departure inspection") && x.date >= t).slice(0, 6);
  const openMaintenance = data.maintenance.filter((x) => x.status !== "Completed" && x.status !== "Cancelled");
  const emergency = openMaintenance.filter((x) => x.priority === "Emergency");
  const unreturnedKeys = data.keys.filter((k) => k.date_issued && !k.date_returned);
  const awaitingReimb = data.expenses.filter((e) => e.awaiting_reimbursement && !e.reimbursed);
  const propsNeedingAttention = data.properties.filter((p) => ["Needs Attention", "Poor"].includes(p.condition) || ["Emergency", "Under Maintenance", "Preparing for Arrival"].includes(p.status));
  // Missed scheduled visits: scheduled time passed (by >1h grace) and still Scheduled.
  const missedVisits = (data.visits || []).filter((v) => v.status === "Scheduled" && !v.archived && (v.scheduled_time || v.start_time) && new Date(v.scheduled_time || v.start_time).getTime() < Date.now() - 3600000);

  // Next Action computation
  const followUpStatuses = ["Reported", "Awaiting Owner Approval", "Contractor Contacted", "Approved"];
  const followUpIssues = openMaintenance.filter((x) => followUpStatuses.includes(x.status));
  const issueCounts = {};
  followUpIssues.forEach((m) => { if (m.property_id) issueCounts[m.property_id] = (issueCounts[m.property_id] || 0) + 1; });
  const topIssueProp = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0];
  const openIssuesByProp = topIssueProp ? { propertyId: topIssueProp[0], count: topIssueProp[1] } : null;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const prepTasks = data.tasks.filter((x) => x.type === "Arrival preparation" && (x.date === t || x.date === tomorrow) && x.status !== "Completed");
  const prepTask = prepTasks.length ? { propertyId: prepTasks[0].property_id, when: prepTasks[0].date === t ? "today" : "tomorrow" } : null;
  const nextAction = { draft: draft && draft.propertyId ? draft : null, openIssuesByProp, prepTask };

  const monthNow = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = data.invoices
    .filter((i) => (i.payment_date || "").slice(0, 7) === monthNow)
    .reduce((s, i) => s + (i.amount_paid || 0), 0);
  const outstandingInvoices = data.invoices
    .filter((i) => !["Paid", "Cancelled"].includes(i.status))
    .reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);
  const outstandingReimb = awaitingReimb.reduce((s, e) => s + (e.amount || 0), 0);

  const alertCount = emergency.length + overdue.length + inspToday.length + contractorsToday.length + unreturnedKeys.length + awaitingReimb.length + overdueInspections.length + missedVisits.length;

  // Correction #14 — actionable Home counts (single source of truth). Only
  // "clients" is wired: recurring customers Ready for Regular Service with no
  // first regular visit scheduled. Other categories stay 0 (no invented logic).
  const spMap = {};
  (data.servicePackages || []).forEach((p) => { spMap[p.id] = p; });
  const actionable = getActionableCounts({ clients: data.clients, properties: data.properties, intakes: data.intakes, agreements: data.agreements, visits: data.visits, servicePackages: spMap });
  const badgeFor = (label) => (label === "Clients" ? actionable.clients : 0);

  const startVisitTo = draft && draft.propertyId ? "/visits?continue=1" : "/visits?start=1";
  const startVisitLabel = draft && draft.propertyId ? `Continue Visit — ${propName(draft.propertyId)}` : "Start Visit";

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
        <div className="mb-5">
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TZ })}</p>
          <h1 className="text-2xl font-semibold tracking-tight mt-0.5">{greeting()}, {ownerName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's your command center for today.</p>
        </div>

        {/* TODAY agenda — what do I have to do today? */}
        <TodayAgenda data={data} />

        {/* Reports waiting to be sent — operational reminder, distinct from property work */}
        <ReportsToSendReminder visits={data.visits} properties={data.properties} clients={data.clients} />

        {/* Next action / continue working */}
        <NextActionCard draft={nextAction.draft} propName={propName} openIssuesByProp={nextAction.openIssuesByProp} prepTask={nextAction.prepTask} onCancelDone={() => setDraft(null)} />

        {/* Quick actions grouped */}
        <div className="space-y-3 mb-5">
          {ACTION_GROUPS.map((group) => {
            if (group.label === "Property Visit") {
               return (
                 <div key={group.label}>
                   <p className="text-xs font-semibold uppercase tracking-wider text-foreground px-1 mb-2 flex items-center gap-2">{group.label}<span className="h-px flex-1 bg-border" /></p>
                   <Link to="/visits?schedule=1" className="block mb-2">
                     <div className="flex items-center gap-3 h-16 rounded-xl bg-primary text-primary-foreground px-3.5 hover:bg-primary/90 shadow-sm transition">
                       <span className="w-11 h-11 rounded-lg bg-primary-foreground/15 flex items-center justify-center shrink-0"><CalendarClock className="w-5 h-5" /></span>
                       <span className="font-semibold text-sm truncate">Schedule Visit</span>
                       <ArrowRight className="w-5 h-5 ml-auto shrink-0" />
                     </div>
                   </Link>
                   <Link to={startVisitTo} className="block mb-2">
                     <div className="flex items-center gap-3 h-14 rounded-xl border border-primary/30 bg-primary/5 text-primary px-3.5 hover:bg-primary/10 transition">
                       <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></span>
                       <span className="font-semibold text-sm truncate">{startVisitLabel}</span>
                       <ArrowRight className="w-5 h-5 ml-auto shrink-0" />
                     </div>
                   </Link>
                   <div className="grid grid-cols-2 gap-2">
                     {group.items.map((a) => (
                       <ActionCard key={a.label} to={a.to} label={a.label} icon={a.icon} color={a.color} badge={badgeFor(a.label)} />
                     ))}
                   </div>
                 </div>
               );
             }
            if (group.label === "Follow-Up") {
              return (
                <div key={group.label}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground px-1 mb-2 flex items-center gap-2">{group.label}<span className="h-px flex-1 bg-border" /></p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {group.items.map((a) => (
                      <ActionCard key={a.label} to={a.to} label={a.label} icon={a.icon} color={a.color} badge={badgeFor(a.label)} />
                    ))}
                  </div>
                </div>
              );
            }
            if (group.label === "Communication") {
              return (
                <div key={group.label}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground px-1 mb-2 flex items-center gap-2">{group.label}<span className="h-px flex-1 bg-border" /></p>
                  {group.items.map((a) => (
                    <ActionCard key={a.label} to={a.to} label={a.label} icon={a.icon} color={a.color} badge={badgeFor(a.label)} />
                  ))}
                </div>
              );
            }
            return (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground px-1 mb-2 flex items-center gap-2">{group.label}<span className="h-px flex-1 bg-border" /></p>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((a) => (
                    <ActionCard key={a.label} to={a.to} label={a.label} icon={a.icon} color={a.color} badge={badgeFor(a.label)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Next 3 days schedule */}
        <Next3Days visits={data.visits} properties={data.properties} clients={data.clients} />

        {/* Financial summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard icon={TrendingUp} label="Revenue this month" value={`€${monthlyRevenue.toFixed(2)}`} tone="success" />
          <StatCard icon={Receipt} label="Outstanding invoices" value={`€${outstandingInvoices.toFixed(2)}`} tone={outstandingInvoices ? "warning" : "success"} />
          <StatCard icon={Wallet} label="Awaiting reimbursement" value={`€${outstandingReimb.toFixed(2)}`} tone={outstandingReimb ? "warning" : "success"} />
          <StatCard icon={Home} label="Properties" value={data.properties.length} tone="primary" />
        </div>

        {/* Alerts */}
        {alertCount > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-sm text-amber-700 dark:text-amber-500">Attention needed ({alertCount})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {emergency.length > 0 && <AlertGroup label="Emergency issues">{emergency.slice(0, 4).map((m) => <AlertRow key={m.id} to="/maintenance" title={m.title} subtitle={m.description} tone="danger" badge={m.priority} />)}</AlertGroup>}
              {overdue.length > 0 && <AlertGroup label="Overdue tasks">{overdue.slice(0, 4).map((task) => <AlertRow key={task.id} to="/tasks" title={task.title} subtitle={task.date} tone="danger" badge={task.priority} />)}</AlertGroup>}
              {inspToday.length > 0 && <AlertGroup label="Inspections due today">{inspToday.slice(0, 4).map((i) => <AlertRow key={i.id} to="/inspections" title={`Inspection — ${i.date}`} subtitle={i.inspector} tone="info" badge={i.status} />)}</AlertGroup>}
              {overdueInspections.length > 0 && <AlertGroup label="Overdue inspections">{overdueInspections.slice(0, 4).map((i) => <AlertRow key={i.id} to="/inspections" title={`Inspection — ${i.date}`} subtitle="Draft not completed" tone="danger" badge="Overdue" />)}</AlertGroup>}
              {contractorsToday.length > 0 && <AlertGroup label="Contractor appointments today">{contractorsToday.slice(0, 4).map((c) => <AlertRow key={c.id} to="/tasks" title={c.title} subtitle={c.time} tone="info" badge="High" />)}</AlertGroup>}
              {unreturnedKeys.length > 0 && <AlertGroup label="Unreturned keys">{unreturnedKeys.slice(0, 4).map((k) => <AlertRow key={k.id} to="/keys" title={`Key ${k.key_number}`} subtitle={`Issued ${k.date_issued} · ${k.current_holder || "—"}`} tone="warning" />)}</AlertGroup>}
              {awaitingReimb.length > 0 && <AlertGroup label="Expenses awaiting reimbursement">{awaitingReimb.slice(0, 4).map((e) => <AlertRow key={e.id} to="/expenses" title={`${e.vendor} — €${(e.amount || 0).toFixed(2)}`} subtitle={e.date} tone="warning" />)}</AlertGroup>}
              {missedVisits.length > 0 && <AlertGroup label="Missed scheduled visits">{missedVisits.slice(0, 4).map((v) => <AlertRow key={v.id} to={`/visits/${v.id}`} title={`${propName(v.property_id)} · ${visitTypeLabel(v.visit_type)}`} subtitle={`Scheduled for ${athensTime(v.scheduled_time || v.start_time)}`} tone="danger" badge="Missed" />)}</AlertGroup>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Today's Schedule" icon={CalendarClock} to="/tasks">
            {todaysTasks.length === 0 ? <EmptyState icon={CheckCircle2} title="Nothing scheduled today" /> : todaysTasks.slice(0, 6).map((task) => (
              <Row key={task.id} title={task.title} subtitle={`${task.time || ""} ${task.assigned_to ? "· " + task.assigned_to : ""}`.trim()} badge={task.priority} />
            ))}
          </Section>

          <Section title={nextAppointment ? "Next Appointment" : "Upcoming Inspections"} icon={nextAppointment ? CalendarClock : ClipboardCheck} to={nextAppointment ? "/tasks" : "/inspections"}>
            {nextAppointment ? (
              <Row title={nextAppointment.title} subtitle={`${nextAppointment.time} · ${nextAppointment.type}`} badge={nextAppointment.priority} />
            ) : upcomingInspections.length === 0 ? <EmptyState icon={ClipboardCheck} title="No inspections scheduled" /> : upcomingInspections.map((i) => (
              <Row key={i.id} title={`Inspection · ${i.date}`} subtitle={i.inspector} badge={i.status} />
            ))}
          </Section>

          <Section title="Properties Requiring Attention" icon={Home} to="/properties">
            {propsNeedingAttention.length === 0 ? <EmptyState icon={CheckCircle2} title="All properties in good shape" /> : propsNeedingAttention.slice(0, 6).map((p) => (
              <Row key={p.id} title={p.name} subtitle={p.address} badge={p.condition} />
            ))}
          </Section>

          <Section title="Open Maintenance" icon={Wrench} to="/maintenance">
            {openMaintenance.length === 0 ? <EmptyState icon={CheckCircle2} title="No open issues" /> : openMaintenance.slice(0, 6).map((m) => (
              <Row key={m.id} title={m.title} subtitle={m.category} badge={m.priority} />
            ))}
          </Section>

          <Section title="Deliveries & Arrivals" icon={Plane} to="/tasks">
            {deliveries.length === 0 && arrivals.length === 0 ? <EmptyState icon={Truck} title="Nothing scheduled" /> : (
              <>
                {deliveries.slice(0, 3).map((d) => <Row key={d.id} title={d.title} subtitle={`${d.time || ""} Delivery`} />)}
                {arrivals.slice(0, 3).map((a) => <Row key={a.id} title={a.title} subtitle={`${a.date} · ${a.type}`} badge={a.priority} />)}
              </>
            )}
          </Section>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <QuickNotes settingsId={settings?.id} initial={settings?.quick_notes} />
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={ListChecks} label="Today's tasks" value={todaysTasks.length} tone="info" />
            <StatCard icon={AlertTriangle} label="Overdue tasks" value={overdue.length} tone={overdue.length ? "danger" : "success"} />
            <StatCard icon={KeyRound} label="Keys checked out" value={unreturnedKeys.length} tone="default" />
            <StatCard icon={HardHat} label="Open issues" value={openMaintenance.length} tone="warning" />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function AlertGroup({ label, children }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-1 mb-1">{label}</p>
      {children}
    </div>
  );
}