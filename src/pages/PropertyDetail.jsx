import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Home, ListChecks, ClipboardCheck, Wrench, Wallet, Clock,
  MapPin, KeyRound, Wifi, Image as ImageIcon, Calendar, Truck, MessageSquare,
  FileText, FolderOpen, Receipt, Plus, CheckCircle2, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Image as UIImage } from "@/components/ui/image";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { base44 } from "@/api/base44Client";
import { badgeTone } from "@/components/resource/ResourceListPage";
import EmptyState from "@/components/ui/EmptyState";
import PropertyInlineAdd from "@/components/properties/PropertyInlineAdd";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { athensMediumDateTime, athensMediumDate } from "@/lib/timezone";
import MonitoringPrioritiesEditor from "@/components/properties/MonitoringPrioritiesEditor";

const ISSUE_CATEGORIES = ["Plumbing", "Electrical", "Pool", "Irrigation", "Garden", "Air conditioning", "Heating", "Appliance", "Internet", "Security", "Locksmith", "Cleaning", "Painting", "Building repair", "Pest control", "Storm damage", "Other"];
const ISSUE_PRIORITIES = ["Routine", "Medium", "High", "Emergency"];
const TASK_TYPES = ["Inspection", "Maintenance", "Maintenance follow-up", "Contractor Meeting", "Delivery", "Owner Request", "Arrival preparation", "Departure inspection", "Shopping", "Utility payment", "Report", "Key return", "Phone call", "Owner-representative visit", "Custom"];
const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const DELIVERY_PURPOSES = ["Furniture", "Appliance", "Parcel", "Building materials", "Contractor access", "Utility technician", "Internet technician", "Cleaning"];

export default function PropertyDetail() {
  const { id } = useParams();
  const [prop, setProp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [visits, setVisits] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [comms, setComms] = useState([]);
  const [keys, setKeys] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [repReports, setRepReports] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [pkgMap, setPkgMap] = useState({});
  const [tick, setTick] = useState(0);

  const reload = () => setTick((x) => x + 1);

  useEffect(() => {
    (async () => {
      try {
        const p = await base44.entities.Property.get(id);
        setProp(p);
        const [t, i, m, e, v, c, cm, k, d, docs, rep, pkgs, ags] = await Promise.all([
          base44.entities.Task.list("-date", 200),
          base44.entities.Inspection.list("-date", 200),
          base44.entities.MaintenanceIssue.list("-created_date", 200),
          base44.entities.Expense.list("-date", 200),
          base44.entities.PropertyVisit.list("-start_time", 200),
          base44.entities.Contractor.list("-created_date", 500),
          base44.entities.OwnerCommunication.list("-created_date", 200),
          base44.entities.Key.list("-created_date", 200),
          base44.entities.Delivery.list("-created_date", 200),
          base44.entities.PropertyDocument.list("-created_date", 200),
          base44.entities.OwnerRepReport.list("-created_date", 200),
          base44.entities.ServicePackage.list("-created_date", 200),
          base44.entities.PropertyServiceAgreement.list("-created_date", 200),
        ]);
        const byProp = (arr) => (arr || []).filter((x) => x.property_id === id && !x.archived);
        setTasks(byProp(t));
        setInspections(byProp(i));
        setMaintenance(byProp(m));
        setExpenses(byProp(e));
        setVisits(byProp(v));
        setContractors((c || []).filter((x) => !x.archived));
        setComms(byProp(cm));
        setKeys(byProp(k));
        setDeliveries(byProp(d));
        setDocuments(byProp(docs));
        setRepReports(byProp(rep));
        setAgreements((ags || []).filter((x) => x.property_id === id && !x.archived));
        const pm = {};
        (pkgs || []).forEach((p) => { pm[p.id] = p; });
        setPkgMap(pm);
        if (p.owner_id) { try { setOwner(await base44.entities.Client.get(p.owner_id)); } catch {} }
      } catch (e) {}
      setLoading(false);
    })();
  }, [id, tick]);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!prop) return <AppLayout><EmptyState icon={Home} title="Property not found" action={<Link to="/properties"><Button>Back to properties</Button></Link>} /></AppLayout>;

  const timeline = [
    ...inspections.map((i) => ({ date: i.date, type: "Inspection", title: `Inspection — ${i.status}`, icon: ClipboardCheck, detail: i.inspector })),
    ...maintenance.map((m) => ({ date: m.date || m.created_date?.slice(0, 10) || "", type: "Maintenance", title: m.title, icon: Wrench, detail: m.status })),
    ...tasks.map((t) => ({ date: t.date, type: t.type, title: t.title, icon: ListChecks, detail: t.status })),
    ...expenses.map((e) => ({ date: e.date, type: "Expense", title: `${e.vendor} — €${(e.amount || 0).toFixed(2)}`, icon: Wallet, detail: e.reimbursed ? "Reimbursed" : "" })),
  ].filter((x) => x.date).sort((a, b) => (a.date < b.date ? 1 : -1));

  const receipts = expenses.filter((e) => e.receipt_photo);
  const visitReports = visits.filter((v) => v.status !== "Cancelled");
  const visitOpts = visits.map((v) => ({ value: v.id, label: `Visit — ${v.start_time ? athensMediumDate(v.start_time) : ""} · ${visitTypeLabel(v.visit_type) || ""}` }));
  const issueOpts = maintenance.map((m) => ({ value: m.id, label: m.title }));
  const contractorOpts = contractors.map((c) => ({ value: c.id, label: c.company }));

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback="/properties" className="mb-3" />

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
          <InfoCard icon={Home} label="Owner" value={owner?.name || "—"} to={owner?.id ? `/clients/${owner.id}` : undefined} />
          <InfoCard icon={KeyRound} label="Gate Code" value={prop.gate_code || "—"} />
          <InfoCard icon={Wifi} label="Wi-Fi" value={prop.wifi_ssid || "—"} />
          <InfoCard icon={Clock} label="Last Inspection" value={inspections[0]?.date || "—"} />
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start overflow-x-auto mb-4 md:h-auto 2xl:h-9">
            <TabsTrigger value="overview" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Overview</TabsTrigger>
            <TabsTrigger value="visits" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Visits</TabsTrigger>
            <TabsTrigger value="inspections" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Inspections</TabsTrigger>
            <TabsTrigger value="issues" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Issues</TabsTrigger>
            <TabsTrigger value="tasks" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Tasks</TabsTrigger>
            <TabsTrigger value="contractors" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Contractors</TabsTrigger>
            <TabsTrigger value="expenses" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Expenses</TabsTrigger>
            <TabsTrigger value="receipts" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Receipts</TabsTrigger>
            <TabsTrigger value="keys" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Key Activity</TabsTrigger>
            <TabsTrigger value="updates" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Owner Updates</TabsTrigger>
            <TabsTrigger value="documents" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Documents</TabsTrigger>
            <TabsTrigger value="reports" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Reports</TabsTrigger>
            <TabsTrigger value="timeline" className="md:py-2.5 md:px-4 2xl:py-1 2xl:px-3">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Section title="Service Agreement">
              {agreements.length > 0 ? [...agreements].sort((a, b) => (a.status === "Active" ? 0 : 1) - (b.status === "Active" ? 0 : 1)).map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{pkgMap[a.service_package_id]?.name || "Service package"}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {a.signing_status && <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(a.signing_status)}`}>{a.signing_status}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(a.status)}`}>{a.status}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">€{(a.agreed_price || 0).toFixed(2)} · {a.billing_type}{a.inspection_frequency ? ` · ${a.inspection_frequency}` : ""}{a.start_date ? ` · Start ${a.start_date}` : ""}{a.renewal_date ? ` · Renew ${a.renewal_date}` : ""}</p>
                  {a.status === "Active" && a.signing_status === "Signed"
                    ? <p className="text-xs text-emerald-700 font-medium mt-1">Current operational service agreement</p>
                    : <Link to={`/agreements/${a.id}`} className="text-xs text-primary hover:underline mt-1 inline-block">Open Agreement</Link>}
                </div>
              )) : (
                <div className="px-4 py-4">
                  <p className="text-sm text-muted-foreground mb-2">No active service agreement for this property.</p>
                  <Link to={`/agreements/new?client=${prop.owner_id || ""}&property=${id}`}><Button size="sm" variant="outline" className="gap-1.5"><Plus className="w-4 h-4" /> Assign Service Package</Button></Link>
                </div>
              )}
            </Section>
            <Section title="Property Details">
              <Detail label="Alarm Instructions" value={prop.alarm_instructions} />
              <Detail label="Wi-Fi Password" value={prop.wifi_password} />
              <Detail label="Utility Info" value={prop.utility_info} />
              <Detail label="Pool Details" value={prop.pool_details} />
              <Detail label="Garden Details" value={prop.garden_details} />
              <Detail label="Special Notes" value={prop.special_notes} />
            </Section>
            <Section title="Monitoring Priorities">
              <MonitoringPrioritiesEditor
                propertyId={id}
                initial={prop.monitoring_priorities}
                onChanged={(cleaned) => setProp((p) => ({ ...p, monitoring_priorities: cleaned }))}
              />
            </Section>
            {(prop.photos || []).length > 0 && (
              <Section title="Photos">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
                  {prop.photos.map((url, i) => <UIImage key={i} src={url} className="aspect-square rounded-lg" fittingType="fill" />)}
                </div>
              </Section>
            )}
          </TabsContent>

          <TabsContent value="visits">
            <RecordSection title="Visits" icon={MapPin} empty="No visits recorded" moduleLink="/visits"
              items={visits} render={(v) => ({ primary: visitTypeLabel(v.visit_type), sub: athensMediumDateTime(v.start_time), badge: v.status, to: `/visits/${v.id}` })}
              addNode={<>
                <LinkLink label="Property Assistance" to={`/property-assistance?client=${prop.owner_id || ""}&property=${id}`} />
                <LinkLink label="Start a new visit" to="/visits?start=1" />
              </>} />
          </TabsContent>

          <TabsContent value="inspections">
            <RecordSection title="Inspections" icon={ClipboardCheck} empty="No inspections yet" moduleLink="/inspections"
              items={inspections} render={(i) => ({ primary: `Inspection — ${i.date}`, sub: i.inspector, badge: i.status, to: `/inspections?open=${i.id}` })} />
          </TabsContent>

          <TabsContent value="issues">
            <RecordSection title="Issues" icon={Wrench} empty="No maintenance issues" moduleLink="/maintenance"
              items={maintenance} render={(m) => ({ primary: m.title, sub: m.description, badge: m.priority, to: "/maintenance" })}
              addNode={
                <PropertyInlineAdd entity="MaintenanceIssue" propertyId={id} submitLabel="Add Issue" onCreated={reload} moreLink="/maintenance"
                  defaultValues={{ status: "Reported", priority: "Medium", category: "Other", owner_approval_status: "Pending", payment_status: "Unpaid" }}
                  fields={[
                    { name: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Leaking pool pump" },
                    { name: "category", label: "Category", type: "select", options: ISSUE_CATEGORIES.map((o) => ({ value: o, label: o })) },
                    { name: "priority", label: "Priority", type: "select", options: ISSUE_PRIORITIES.map((o) => ({ value: o, label: o })) },
                    { name: "description", label: "Description", type: "textarea", placeholder: "What did you observe?" },
                  ]} />
              } />
          </TabsContent>

          <TabsContent value="tasks">
            <RecordSection title="Tasks" icon={ListChecks} empty="No tasks for this property" moduleLink="/tasks"
              items={tasks} render={(t) => ({ primary: t.title, sub: `${t.date} · ${t.type}`, badge: t.status, to: "/tasks" })}
              addNode={
                <PropertyInlineAdd entity="Task" propertyId={id} submitLabel="Add Task" onCreated={reload} moreLink="/tasks"
                  defaultValues={{ status: "Pending", priority: "Medium", type: "Custom", date: new Date().toISOString().slice(0, 10) }}
                  fields={[
                    { name: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Check irrigation timer" },
                    { name: "type", label: "Type", type: "select", options: TASK_TYPES.map((o) => ({ value: o, label: o })) },
                    { name: "date", label: "Date", type: "date" },
                    { name: "priority", label: "Priority", type: "select", options: TASK_PRIORITIES.map((o) => ({ value: o, label: o })) },
                  ]} />
              } />
          </TabsContent>

          <TabsContent value="contractors">
            <RecordSection title="Contractor Visits" icon={Truck} empty="No contractor visits logged" moduleLink="/contractors"
              items={deliveries} render={(d) => ({ primary: d.company, sub: `${d.date || ""} · ${d.purpose}`, badge: d.completion_status, to: "/deliveries" })}
              addNode={
                <PropertyInlineAdd entity="Delivery" propertyId={id} submitLabel="Add Contractor Visit" onCreated={reload} moreLink="/deliveries"
                  defaultValues={{ completion_status: "Pending", purpose: "Contractor access", date: new Date().toISOString().slice(0, 10) }}
                  fields={[
                    { name: "company", label: "Company / Contractor", type: "text", required: true },
                    { name: "purpose", label: "Purpose", type: "select", options: DELIVERY_PURPOSES.map((o) => ({ value: o, label: o })) },
                    { name: "date", label: "Date", type: "date" },
                    { name: "contact_person", label: "Contact", type: "text" },
                    { name: "access_instructions", label: "Access instructions", type: "textarea" },
                  ]} />
              } />
            <div className="mt-3"><LinkLink label="Browse all contractors" to="/contractors" /></div>
          </TabsContent>

          <TabsContent value="expenses">
            <RecordSection title="Expenses" icon={Wallet} empty="No expenses recorded" moduleLink="/expenses"
              items={expenses} render={(e) => ({ primary: `${e.vendor} — €${(e.amount || 0).toFixed(2)}`, sub: e.date, badge: e.reimbursed ? "reimbursed" : "pending", to: "/expenses" })}
              addNode={
                <PropertyInlineAdd entity="Expense" propertyId={id} submitLabel="Add Expense" onCreated={reload} moreLink="/expenses"
                  defaultValues={{ date: new Date().toISOString().slice(0, 10), amount: 0, awaiting_reimbursement: true, reimbursed: false }}
                  fields={[
                    { name: "vendor", label: "Vendor", type: "text", required: true },
                    { name: "amount", label: "Amount (€)", type: "number" },
                    { name: "date", label: "Date", type: "date" },
                    { name: "paid_by", label: "Paid by", type: "text" },
                    { name: "visit_id", label: "Linked visit", type: "entity-select", options: visitOpts, placeholder: "Optional" },
                    { name: "maintenance_issue_id", label: "Linked issue", type: "entity-select", options: issueOpts, placeholder: "Optional" },
                    { name: "contractor_id", label: "Linked contractor", type: "entity-select", options: contractorOpts, placeholder: "Optional" },
                    { name: "receipt_photo", label: "Receipt photo", type: "image" },
                    { name: "notes", label: "Notes", type: "textarea" },
                  ]} />
              } />
          </TabsContent>

          <TabsContent value="receipts">
            <RecordSection title="Receipts" icon={Receipt} empty="No receipts attached" moduleLink="/expenses"
              items={receipts} render={(e) => ({ primary: `${e.vendor} — €${(e.amount || 0).toFixed(2)}`, sub: e.date, badge: e.reimbursed ? "reimbursed" : "pending", to: "/expenses" })}
              addNode={
                <PropertyInlineAdd entity="Expense" propertyId={id} submitLabel="Add Receipt" onCreated={reload} moreLink="/expenses"
                  defaultValues={{ date: new Date().toISOString().slice(0, 10), amount: 0, awaiting_reimbursement: true, reimbursed: false }}
                  fields={[
                    { name: "vendor", label: "Vendor", type: "text", required: true },
                    { name: "amount", label: "Amount (€)", type: "number" },
                    { name: "date", label: "Date", type: "date" },
                    { name: "visit_id", label: "Linked visit", type: "entity-select", options: visitOpts, placeholder: "Optional" },
                    { name: "maintenance_issue_id", label: "Linked issue", type: "entity-select", options: issueOpts, placeholder: "Optional" },
                    { name: "contractor_id", label: "Linked contractor", type: "entity-select", options: contractorOpts, placeholder: "Optional" },
                    { name: "receipt_photo", label: "Receipt photo", type: "image" },
                  ]} />
              } />
          </TabsContent>

          <TabsContent value="keys">
            <RecordSection title="Key Activity" icon={KeyRound} empty="No key activity recorded" moduleLink="/keys"
              items={keys} render={(k) => ({ primary: `Key ${k.key_number}`, sub: `${k.date_issued || ""} · ${k.current_holder || "—"}`, badge: k.date_returned ? "returned" : "out", to: "/keys" })}
              addNode={
                <PropertyInlineAdd entity="Key" propertyId={id} submitLabel="Log Key Activity" onCreated={reload} moreLink="/keys"
                  defaultValues={{ date_issued: new Date().toISOString().slice(0, 10) }}
                  fields={[
                    { name: "key_number", label: "Key number", type: "text", required: true },
                    { name: "current_holder", label: "Holder", type: "text" },
                    { name: "date_issued", label: "Date issued", type: "date" },
                    { name: "notes", label: "Notes", type: "textarea" },
                  ]} />
              } />
          </TabsContent>

          <TabsContent value="updates">
            <RecordSection title="Owner Updates" icon={MessageSquare} empty="No owner updates logged" moduleLink="/communications"
              items={comms} render={(c) => ({ primary: c.subject, sub: `${c.date} · ${c.communication_type}`, to: "/communications" })}
              addNode={
                <PropertyInlineAdd entity="OwnerCommunication" propertyId={id} submitLabel="Add Owner Update" onCreated={reload} moreLink="/communications"
                  defaultValues={{ date: new Date().toISOString().slice(0, 10), communication_type: "WhatsApp", client_id: prop.owner_id || "" }}
                  fields={[
                    { name: "subject", label: "Subject", type: "text", required: true },
                    { name: "communication_type", label: "Channel", type: "select", options: ["WhatsApp", "Email", "Phone", "SMS", "In-person"].map((o) => ({ value: o, label: o })) },
                    { name: "message", label: "Message", type: "textarea" },
                  ]} />
              } />
          </TabsContent>

          <TabsContent value="documents">
            <RecordSection title="Documents & Photos" icon={FolderOpen} empty="No documents uploaded" moduleLink="/documents"
              items={documents} render={(d) => ({ primary: d.name, sub: d.category, to: "/documents" })}
              addNode={<LinkLink label="Upload document" to="/documents" />} />
          </TabsContent>

          <TabsContent value="reports">
            <RecordSection title="Owner-Rep Reports" icon={FileText} empty="No reports yet" moduleLink="/rep-reports"
              items={repReports} render={(r) => ({ primary: r.project_name, sub: r.visit_date, badge: r.status, to: "/rep-reports" })}
              addNode={<LinkLink label="New report" to="/rep-reports" />} />
            <div className="mt-3">
              <Section title="Visit Reports">
                {visitReports.length === 0 ? <EmptyState icon={FileText} title="No visit reports" /> : visitReports.slice(0, 6).map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{visitTypeLabel(v.visit_type)}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.start_time ? athensMediumDate(v.start_time) : ""}</p>
                    </div>
                    <Link to={`/visits/${v.id}`} className="text-xs text-primary hover:underline">Open</Link>
                  </div>
                ))}
              </Section>
            </div>
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

function LinkLink({ label, to }) {
  return (
    <div className="px-4 py-3">
      <Link to={to}><Button size="sm" variant="outline" className="rounded-full gap-1.5"><Plus className="w-4 h-4" /> {label}</Button></Link>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, to }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><Icon className="w-4 h-4 text-muted-foreground" /></div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {to ? (
          <Link to={to} className="text-sm font-medium truncate text-primary hover:underline block">{value}</Link>
        ) : (
          <p className="text-sm font-medium truncate">{value}</p>
        )}
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

function RecordSection({ title, icon: Icon, items, render, empty, moduleLink, addNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-medium text-sm"><Icon className="w-4 h-4 text-muted-foreground" /> {title}</div>
        {moduleLink && <Link to={moduleLink} className="text-xs text-primary flex items-center gap-1 hover:underline">View all</Link>}
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-border">
          {items.map((it) => {
            const r = render(it);
            return (
              <Link to={r.to || moduleLink || "#"} key={it.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.primary}</p>
                  {r.sub && <p className="text-xs text-muted-foreground truncate">{r.sub}</p>}
                </div>
                {r.badge && <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(r.badge)}`}>{r.badge}</span>}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-6"><EmptyState icon={Icon} title={empty} /></div>
      )}
      {addNode}
    </div>
  );
}