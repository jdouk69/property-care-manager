import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Plus, CalendarClock, AlertTriangle, ClipboardCheck, Wrench, Users, Home, ListChecks,
  Truck, HardHat, ArrowRight, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { badgeTone } from "@/components/resource/ResourceListPage";

const today = () => new Date().toISOString().slice(0, 10);
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const QUICK_ACTIONS = [
  { to: "/inspections", label: "New Inspection", icon: ClipboardCheck, color: "bg-sky-500" },
  { to: "/tasks", label: "New Task", icon: Plus, color: "bg-primary" },
  { to: "/maintenance", label: "Log Issue", icon: Wrench, color: "bg-amber-500" },
  { to: "/expenses", label: "Add Expense", icon: Truck, color: "bg-emerald-500" },
];

function Section({ title, icon: Icon, to, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
          <Icon className="w-4 h-4 text-muted-foreground" /> {title}
        </div>
        {to && (
          <Link to={to} className="text-xs text-primary flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ title, subtitle, badge, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition text-left">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {badge && <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${badgeTone(badge)}`}>{badge}</span>}
    </button>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ tasks: [], inspections: [], maintenance: [], properties: [], clients: [], contractors: [] });

  useEffect(() => {
    (async () => {
      try {
        const [tasks, inspections, maintenance, properties, clients, contractors] = await Promise.all([
          base44.entities.Task.list("-date", 200),
          base44.entities.Inspection.list("-date", 200),
          base44.entities.MaintenanceIssue.list("-created_date", 200),
          base44.entities.Property.list("-created_date", 200),
          base44.entities.Client.list("-created_date", 200),
          base44.entities.Contractor.list("-created_date", 200),
        ]);
        setData({ tasks, inspections, maintenance, properties, clients, contractors });
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const t = today();
  const todaysTasks = data.tasks.filter((x) => x.date === t);
  const overdue = data.tasks.filter((x) => x.date && x.date < t && x.status !== "Completed" && x.status !== "Cancelled");
  const upcomingInspections = data.inspections.filter((x) => x.date >= t).slice(0, 5);
  const urgent = data.maintenance.filter((x) => x.priority === "Urgent" || x.priority === "High").filter((x) => x.status !== "Completed" && x.status !== "Cancelled").slice(0, 5);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-semibold tracking-tight mt-0.5">{greeting()} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening across your properties today.</p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.label} to={a.to}>
              <Button variant="outline" className="w-full h-auto py-3 rounded-2xl justify-start gap-3 hover:shadow-md hover:border-primary/30">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${a.color}`}><a.icon className="w-4 h-4" /></span>
                <span className="text-xs font-medium text-left leading-tight">{a.label}</span>
              </Button>
            </Link>
          ))}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard icon={ListChecks} label="Today's tasks" value={todaysTasks.length} tone="info" />
          <StatCard icon={AlertTriangle} label="Overdue" value={overdue.length} tone={overdue.length ? "danger" : "success"} />
          <StatCard icon={Wrench} label="Open issues" value={data.maintenance.filter((x) => !["Completed", "Cancelled"].includes(x.status)).length} tone="warning" />
          <StatCard icon={Home} label="Properties" value={data.properties.length} tone="primary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Today's Schedule" icon={CalendarClock} to="/tasks">
            {todaysTasks.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing scheduled today" description="Enjoy the breather or add a task." />
            ) : (
              todaysTasks.slice(0, 6).map((task) => (
                <Row key={task.id} title={task.title} subtitle={`${task.time || ""} ${task.assigned_to ? "· " + task.assigned_to : ""}`.trim()} badge={task.priority} />
              ))
            )}
          </Section>

          <Section title="Upcoming Inspections" icon={ClipboardCheck} to="/inspections">
            {upcomingInspections.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="No inspections scheduled" />
            ) : (
              upcomingInspections.map((insp) => (
                <Row key={insp.id} title={`Inspection · ${insp.date}`} subtitle={insp.inspector} badge={insp.status} />
              ))
            )}
          </Section>

          <Section title="Urgent Maintenance" icon={AlertTriangle} to="/maintenance">
            {urgent.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No urgent issues" description="All clear." />
            ) : (
              urgent.map((m) => (
                <Row key={m.id} title={m.title} subtitle={m.description} badge={m.priority} />
              ))
            )}
          </Section>

          <Section title="Overdue Tasks" icon={AlertTriangle} to="/tasks">
            {overdue.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing overdue" description="You're all caught up." />
            ) : (
              overdue.slice(0, 6).map((task) => (
                <Row key={task.id} title={task.title} subtitle={task.date} badge={task.priority} />
              ))
            )}
          </Section>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Clients" value={data.clients.length} tone="default" />
          <StatCard icon={HardHat} label="Contractors" value={data.contractors.length} tone="default" />
          <StatCard icon={Truck} label="Deliveries today" value={todaysTasks.filter((x) => x.type === "Delivery").length} tone="default" />
          <StatCard icon={ClipboardCheck} label="Inspections (total)" value={data.inspections.length} tone="default" />
        </div>
      </div>
    </AppLayout>
  );
}