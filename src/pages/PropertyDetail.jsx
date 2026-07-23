import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Home, ListChecks, ClipboardCheck, Wrench, Wallet, Clock,
  MapPin, KeyRound, Wifi, AlertCircle, Image as ImageIcon, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Image as UIImage } from "@/components/ui/image";
import AppLayout from "@/components/layout/AppLayout";
import { base44 } from "@/api/base44Client";
import { badgeTone } from "@/components/resource/ResourceListPage";
import EmptyState from "@/components/ui/EmptyState";
import { Loader2 } from "lucide-react";

export default function PropertyDetail() {
  const { id } = useParams();
  const [prop, setProp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [owner, setOwner] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await base44.entities.Property.get(id);
        setProp(p);
        const [t, i, m, e] = await Promise.all([
          base44.entities.Task.list("-date", 200),
          base44.entities.Inspection.list("-date", 200),
          base44.entities.MaintenanceIssue.list("-created_date", 200),
          base44.entities.Expense.list("-date", 200),
        ]);
        setTasks((t || []).filter((x) => x.property_id === id));
        setInspections((i || []).filter((x) => x.property_id === id));
        setMaintenance((m || []).filter((x) => x.property_id === id));
        setExpenses((e || []).filter((x) => x.property_id === id));
        if (p.owner_id) {
          try { setOwner(await base44.entities.Client.get(p.owner_id)); } catch {}
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!prop) return <AppLayout><EmptyState icon={Home} title="Property not found" action={<Link to="/properties"><Button>Back to properties</Button></Link>} /></AppLayout>;

  const timeline = [
    ...inspections.map((i) => ({ date: i.date, type: "Inspection", title: `Inspection — ${i.status}`, icon: ClipboardCheck, detail: i.inspector })),
    ...maintenance.map((m) => ({ date: m.date || "", type: "Maintenance", title: m.title, icon: Wrench, detail: m.status })),
    ...tasks.map((t) => ({ date: t.date, type: t.type, title: t.title, icon: ListChecks, detail: t.status })),
    ...expenses.map((e) => ({ date: e.date, type: "Expense", title: `${e.vendor} — €${(e.amount || 0).toFixed(2)}`, icon: Wallet, detail: e.reimbursed ? "Reimbursed" : "" })),
  ].filter((x) => x.date).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
        <Link to="/properties" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Properties
        </Link>

        <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Home className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{prop.name}</h1>
              {prop.address && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {prop.address}</p>}
            </div>
          </div>
          <Badge variant="outline" className={badgeTone(prop.status)}>{prop.status}</Badge>
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <InfoCard icon={Home} label="Owner" value={owner?.name || "—"} />
          <InfoCard icon={KeyRound} label="Gate Code" value={prop.gate_code || "—"} />
          <InfoCard icon={Wifi} label="Wi-Fi" value={prop.wifi_ssid || "—"} />
          <InfoCard icon={Clock} label="Last Inspection" value={inspections[0]?.date || "—"} />
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start overflow-x-auto mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="inspections">Inspections</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Section title="Property Details">
              <Detail label="Alarm Instructions" value={prop.alarm_instructions} />
              <Detail label="Wi-Fi Password" value={prop.wifi_password} />
              <Detail label="Utility Info" value={prop.utility_info} />
              <Detail label="Pool Details" value={prop.pool_details} />
              <Detail label="Garden Details" value={prop.garden_details} />
              <Detail label="Special Notes" value={prop.special_notes} />
            </Section>
            {(prop.photos || []).length > 0 && (
              <Section title="Photos">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
                  {prop.photos.map((url, i) => <UIImage key={i} src={url} className="aspect-square rounded-lg" fittingType="fill" />)}
                </div>
              </Section>
            )}
          </TabsContent>

          <TabsContent value="tasks">
            <SimpleList items={tasks} title={ListChecks} render={(t) => ({ primary: t.title, sub: `${t.date} · ${t.type}`, badge: t.status })} empty="No tasks for this property" to="/tasks" />
          </TabsContent>
          <TabsContent value="inspections">
            <SimpleList items={inspections} title={ClipboardCheck} render={(i) => ({ primary: `Inspection — ${i.date}`, sub: i.inspector, badge: i.status })} empty="No inspections yet" to="/inspections" />
          </TabsContent>
          <TabsContent value="maintenance">
            <SimpleList items={maintenance} title={Wrench} render={(m) => ({ primary: m.title, sub: m.description, badge: m.priority })} empty="No maintenance issues" to="/maintenance" />
          </TabsContent>
          <TabsContent value="expenses">
            <SimpleList items={expenses} title={Wallet} render={(e) => ({ primary: `${e.vendor} — €${(e.amount || 0).toFixed(2)}`, sub: e.date, badge: e.reimbursed ? "reimbursed" : "pending" })} empty="No expenses recorded" to="/expenses" />
          </TabsContent>

          <TabsContent value="timeline">
            <div className="rounded-2xl border border-border bg-card p-4">
              {timeline.length === 0 ? (
                <EmptyState icon={Clock} title="No history yet" description="Inspections, maintenance and expenses will appear here." />
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                  {timeline.map((ev, i) => (
                    <div key={i} className="relative pb-5 last:pb-0">
                      <div className="absolute -left-[18px] w-4 h-4 rounded-full bg-primary/15 border-2 border-primary flex items-center justify-center">
                        <ev.icon className="w-2 h-2 text-primary" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{ev.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(ev.badge || ev.type)}`}>{ev.badge || ev.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.date}{ev.detail ? ` · ${ev.detail}` : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><Icon className="w-4 h-4 text-muted-foreground" /></div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border font-medium text-sm">{title}</div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function SimpleList({ items, title: Icon, render, empty, to }) {
  if (!items.length) return <EmptyState icon={Icon} title={empty} action={<Link to={to}><Button variant="outline" size="sm">Add</Button></Link>} />;
  return (
    <div className="rounded-2xl border border-border bg-card divide-y divide-border">
      {items.map((it) => {
        const r = render(it);
        return (
          <Link to={to} key={it.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{r.primary}</p>
              {r.sub && <p className="text-xs text-muted-foreground truncate">{r.sub}</p>}
            </div>
            {r.badge && <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(r.badge)}`}>{r.badge}</span>}
          </Link>
        );
      })}
    </div>
  );
}