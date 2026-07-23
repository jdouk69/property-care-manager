import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Plus, CalendarClock, AlertTriangle, ClipboardCheck, Wrench, Home, ListChecks,
  Truck, HardHat, ArrowRight, CheckCircle2, KeyRound, Wallet, Receipt, Package,
  MessageSquare, MapPin, StickyNote, TrendingUp, FileWarning, Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AppLayout from "@/components/layout/AppLayout";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { badgeTone } from "@/components/resource/ResourceListPage";
import { generateTimeBasedNotifications } from "@/lib/notifications";

const today = () => new Date().toISOString().slice(0, 10);
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const QUICK_ACTIONS = [
  { to: "/visits", label: "Start Visit", icon: MapPin, color: "bg-primary" },
  { to: "/inspections", label: "New Inspection", icon: ClipboardCheck, color: "bg-sky-500" },
  { to: "/maintenance", label: "Log Issue", icon: Wrench, color: "bg-amber-500" },
  { to: "/tasks", label: "Add Task", icon: Plus, color: "bg-violet-500" },
  { to: "/expenses", label: "Add Expense", icon: Wallet, color: "bg-emerald-500" },
  { to: "/expenses", label: "Add Receipt", icon: Receipt, color: "bg-teal-500" },
  { to: "/properties", label: "Add Property", icon: Home, color: "bg-indigo-500" },
  { to: "/clients", label: "Add Client", icon: HardHat, color: "bg-rose-500" },
  { to: "/deliveries", label: "Contractor Visit", icon: Truck, color: "bg-orange-500" },
  { to: "/keys", label: "Key Activity", icon: KeyRound, color: "bg-cyan-500" },
  { to: "/properties", label: "Prep Arrival", icon: Plane, color: "bg-fuchsia-500" },
  { to: "/communications", label: "Owner Update", icon: MessageSquare, color: "bg-blue-500" },
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

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ tasks: [], inspections: [], maintenance: [], properties: [], clients: [], contractors: [], expenses: [], keys: [], invoices: [] });
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [tasks, inspections, maintenance, properties, clients, contractors, expenses, keys, invoices, sList] = await Promise.all([
          base44.entities.Task.list("-date", 200),
          base44.entities.Inspection.list("-date", 200),
          base44.entities.MaintenanceIssue.list("-created_date", 200),
          base44.entities.Property.list("-created_date", 200),
          base44.entities.Client.list("-created_date", 200),
          base44.entities.Contractor.list("-created_date", 200),
          base44.entities.Expense.list("-date", 200),
          base44.entities.Key.list("-created_date", 200),
          base44.entities.Invoice.list("-created_date", 200),
          base44.entities.BusinessSettings.list("-created_date", 1),
        ]);
        setData({ tasks, inspections, maintenance, properties, clients, contractors, expenses, keys, invoices });
        if (sList && sList[0]) setSettings(sList[0]);
      } catch (e) {}
      setLoading(false);
      generateTimeBasedNotifications().catch(() => {});
    })();
  }, []);

  const t = today();
  const ownerName = settings?.owner_name || "Jim";
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
  const reportsWaiting = data.inspections.filter((x) => x.status === "Draft");
  const unreturnedKeys = data.keys.filter((k) => k.date_issued && !k.date_returned);
  const awaitingReimb = data.expenses.filter((e) => e.awaiting_reimbursement && !e.reimbursed);
  const propsNeedingAttention = data.properties.filter((p) => ["Needs Attention", "Poor"].includes(p.condition) || ["Emergency", "Under Maintenance", "Preparing for Arrival"].includes(p.status));

  const monthNow = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = data.invoices
    .filter((i) => (i.payment_date || "").slice(0, 7) === monthNow)
    .reduce((s, i) => s + (i.amount_paid || 0), 0);
  const outstandingInvoices = data.invoices
    .filter((i) => !["Paid", "Cancelled"].includes(i.status))
    .reduce((s, i) => s + ((i.total || 0) - (i.amount_paid || 0)), 0);
  const outstandingReimb = awaitingReimb.reduce((s, e) => s + (e.amount || 0), 0);

  const alertCount = emergency.length + overdue.length + inspToday.length + contractorsToday.length + unreturnedKeys.length + awaitingReimb.length + overdueInspections.length;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-semibold tracking-tight mt-0.5">{greeting()}, {ownerName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's your command center for today.</p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.label} to={a.to}>
              <Button variant="outline" className="w-full h-auto py-2.5 rounded-2xl flex-col gap-1.5 hover:shadow-md hover:border-primary/30">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${a.color}`}><a.icon className="w-4 h-4" /></span>
                <span className="text-[11px] font-medium text-center leading-tight">{a.label}</span>
              </Button>
            </Link>
          ))}
        </div>

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

          <Section title="Reports Waiting to Send" icon={FileWarning} to="/inspections">
            {reportsWaiting.length === 0 ? <EmptyState icon={CheckCircle2} title="No pending reports" /> : reportsWaiting.slice(0, 6).map((i) => (
              <Row key={i.id} title={`Inspection — ${i.date}`} subtitle={i.inspector} badge={i.status} />
            ))}
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