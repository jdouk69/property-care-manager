import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Phone, MessageCircle, Mail, Pencil, Home, Plus, Package, CalendarClock,
  ClipboardCheck, Wrench, Wallet, FileText, MessageSquare, FileWarning,
  ArrowRight, ArrowLeft, Globe, Languages, Loader2, MapPin, Sparkles, CheckCircle2,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { badgeTone } from "@/components/resource/ResourceListPage";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import ClientIntakePanel from "@/components/intake/ClientIntakePanel";
import { downloadSignedAgreementPdf } from "@/lib/agreementDownload";
import ActivateServiceButton from "@/components/agreements/ActivateServiceButton";

function InfoChip({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm min-w-0">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}

function ActivitySection({ title, icon: Icon, to, count, items, emptyTitle }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Icon className="w-4 h-4 text-muted-foreground" /> {title}
          {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
        </div>
        {to && <Link to={to} className="text-xs text-primary flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></Link>}
      </div>
      <div className="divide-y divide-border">
        {count === 0 ? (
          <EmptyState icon={Icon} title={emptyTitle} />
        ) : (items || []).slice(0, 5).map((it, i) => (
          <Link key={i} to={it.to || to || "#"} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/50 transition">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{it.title}</p>
              {it.subtitle && <p className="text-xs text-muted-foreground truncate">{it.subtitle}</p>}
            </div>
            {it.badge && <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${badgeTone(it.badge)}`}>{it.badge}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ClientHub() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [properties, setProperties] = useState([]);
  const [servicePackages, setServicePackages] = useState({});
  const [visits, setVisits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [downloadingPdf, setDownloadingPdf] = useState("");

  const handleDownloadSigned = async (token) => {
    if (!token) return;
    setDownloadingPdf(token);
    try { await downloadSignedAgreementPdf(token); } catch (e) {}
    setDownloadingPdf("");
  };

  useEffect(() => {
    (async () => {
      try {
        const [c, allProps, pkgs, allVisits, allTasks, allMaint, allExp, allInv, allComm, allDocs, allAgs, allIntakes] = await Promise.all([
          base44.entities.Client.get(id),
          base44.entities.Property.list("-created_date", 500),
          base44.entities.ServicePackage.list("-created_date", 200),
          base44.entities.PropertyVisit.list("-created_date", 200),
          base44.entities.Task.list("-date", 200),
          base44.entities.MaintenanceIssue.list("-created_date", 200),
          base44.entities.Expense.list("-date", 200),
          base44.entities.Invoice.list("-created_date", 200),
          base44.entities.OwnerCommunication.list("-date", 200),
          base44.entities.PropertyDocument.list("-created_date", 200),
          base44.entities.PropertyServiceAgreement.list("-created_date", 200),
          base44.entities.CustomerIntake.list("-created_date", 200),
        ]);
        setClient(c);
        const props = (allProps || []).filter((p) => p.owner_id === id && !p.archived);
        setProperties(props);
        const pkgMap = {};
        (pkgs || []).forEach((p) => { pkgMap[p.id] = p; });
        setServicePackages(pkgMap);
        const propIds = new Set(props.map((p) => p.id));
        setVisits((allVisits || []).filter((v) => propIds.has(v.property_id)));
        setTasks((allTasks || []).filter((t) => propIds.has(t.property_id)));
        setMaintenance((allMaint || []).filter((m) => propIds.has(m.property_id)));
        setExpenses((allExp || []).filter((e) => propIds.has(e.property_id)));
        setInvoices((allInv || []).filter((i) => i.client_id === id || propIds.has(i.property_id)));
        setCommunications((allComm || []).filter((co) => co.client_id === id || propIds.has(co.property_id)));
        setDocuments((allDocs || []).filter((d) => d.client_id === id || propIds.has(d.property_id)));
        setAgreements((allAgs || []).filter((a) => (a.client_id === id || propIds.has(a.property_id)) && !a.archived));
        setIntakes((allIntakes || []).filter((i) => i.client_id === id && !i.archived));
      } catch (e) {}
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!client) return <AppLayout><div className="p-6"><EmptyState icon={Home} title="Client not found" /></div></AppLayout>;

  const reloadIntakes = async () => {
    try {
      const all = await base44.entities.CustomerIntake.list("-created_date", 200);
      setIntakes((all || []).filter((i) => i.client_id === id && !i.archived));
    } catch (e) {}
  };

  const propName = (pid) => properties.find((p) => p.id === pid)?.name || "Property";
  const activeAgreements = agreements.filter((a) => a.status === "Active");
  const pendingAgreements = agreements.filter((a) => a.status === "Pending");
  const liveVisits = visits.filter((v) => v.status === "Scheduled" || v.status === "In Progress");
  const hasStartedVisit = visits.some((v) => v.status === "In Progress" || v.status === "Completed");

  let nextStep = null;
  const latestIntake = (intakes || []).slice().sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0] || null;
  if (latestIntake && (latestIntake.status === "Received" || latestIntake.status === "Reviewed")) {
    nextStep = { label: "Review the customer's intake submission", to: `/clients/${id}/intake`, button: "Review Intake" };
  } else if (properties.length === 0) {
    nextStep = { label: "Add the client's first property", to: `/properties?add=1&owner=${id}`, button: "Add Property" };
  } else if (activeAgreements.length === 0 && pendingAgreements.length === 0) {
    nextStep = { label: "Assign a service package", to: `/agreements/new?client=${id}${properties.length === 1 ? `&property=${properties[0].id}` : ""}`, button: "Assign Service Package" };
  } else if (activeAgreements.length === 0 && pendingAgreements.length > 0) {
    const pendingSigned = pendingAgreements.find((a) => a.signing_status === "Signed");
    const pendingDeclined = pendingAgreements.find((a) => a.signing_status === "Declined");
    const pendingViewed = pendingAgreements.find((a) => a.signing_status === "Viewed");
    const pendingSent = pendingAgreements.find((a) => a.signing_status === "Sent");
    if (pendingSigned) {
      nextStep = { label: "Agreement signed — activation pending", to: `/agreements/${pendingSigned.id}`, button: "View Agreement" };
    } else if (pendingDeclined) {
      nextStep = { label: "Customer requested changes / declined the agreement", to: `/agreements/${pendingDeclined.id}`, button: "View Agreement" };
    } else if (pendingViewed) {
      nextStep = { label: "Customer viewed the agreement — awaiting signature", to: `/agreements/${pendingViewed.id}`, button: "View Agreement" };
    } else if (pendingSent) {
      nextStep = { label: "Awaiting customer signature on the service agreement", to: `/agreements/${pendingSent.id}`, button: "View Agreement" };
    } else {
      nextStep = { label: "Complete the pending service agreement draft", to: `/agreements/${pendingAgreements[0].id}`, button: "Review Agreement" };
    }
  } else if (liveVisits.length === 0 && !hasStartedVisit) {
    const ag = activeAgreements.length === 1 ? activeAgreements[0] : null;
    const to = ag
      ? `/visits?start=1&property=${ag.property_id}&agreement=${ag.id}&client=${id}`
      : `/visits?start=1&client=${id}`;
    nextStep = { label: "Schedule the first visit", to, button: "Schedule Visit" };
  } else if (liveVisits.some((v) => v.status === "Scheduled") && !hasStartedVisit) {
    const scheduled = visits.find((v) => v.status === "Scheduled");
    nextStep = { label: "First visit scheduled", to: `/visits/${scheduled.id}`, button: "View Visit" };
  }

  const upcomingVisits = visits.filter((v) => v.status !== "Completed" && v.status !== "Cancelled");
  const recentVisits = visits.filter((v) => v.status === "Completed");
  const openTasks = tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  const openIssues = maintenance.filter((m) => m.status !== "Completed" && m.status !== "Cancelled");
  const waLink = client.whatsapp ? `https://wa.me/${client.whatsapp.replace(/[^0-9]/g, "")}` : null;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback="/clients" className="mb-1" />

        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold truncate">{client.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(client.status)}`}>{client.status}</span>
              </div>
            </div>
            <Link to={`/clients?edit=${id}`}>
              <Button variant="outline" size="sm" className="gap-1.5"><Pencil className="w-4 h-4" /> Edit</Button>
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InfoChip icon={Phone} label="Phone" value={client.phone} />
            <InfoChip icon={MessageCircle} label="WhatsApp" value={client.whatsapp} />
            <InfoChip icon={Mail} label="Email" value={client.email} />
            <InfoChip icon={Globe} label="Country" value={client.country} />
            <InfoChip icon={Languages} label="Language" value={client.preferred_language} />
            <InfoChip icon={MessageSquare} label="Contact via" value={client.preferred_communication_method} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {client.phone && <a href={`tel:${client.phone}`}><Button variant="outline" size="sm" className="gap-1.5"><Phone className="w-4 h-4" /> Call</Button></a>}
            {waLink && <a href={waLink} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="gap-1.5"><MessageCircle className="w-4 h-4" /> WhatsApp</Button></a>}
            {client.email && <a href={`mailto:${client.email}`}><Button variant="outline" size="sm" className="gap-1.5"><Mail className="w-4 h-4" /> Email</Button></a>}
          </div>
        </div>

        {/* Next step */}
        {nextStep && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-primary">Next step</p>
                <p className="font-medium text-sm truncate">{nextStep.label}</p>
              </div>
            </div>
            <Link to={nextStep.to}><Button size="sm" className="gap-1.5 shrink-0">{nextStep.button} <ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
        )}

        {/* Customer intake */}
        <ClientIntakePanel client={client} intakes={intakes} onChanged={reloadIntakes} />

        {/* Properties */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 font-medium text-sm"><Home className="w-4 h-4 text-muted-foreground" /> Properties <span className="text-xs text-muted-foreground">({properties.length})</span></div>
            <Link to={`/properties?add=1&owner=${id}`}><Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add Property</Button></Link>
          </div>
          <div className="divide-y divide-border">
            {properties.length === 0 ? (
              <EmptyState icon={Home} title="No properties added yet." description="Add this client's first property to get started." />
            ) : properties.map((p) => (
              <Link key={p.id} to={`/properties/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Home className="w-4 h-4" /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.address || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.service_package_id && servicePackages[p.service_package_id] && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 truncate max-w-[120px]">{servicePackages[p.service_package_id].name}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(p.status)}`}>{p.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Service agreement */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 font-medium text-sm"><Package className="w-4 h-4 text-muted-foreground" /> Service Agreement</div>
            {properties.length > 0 && (
              <Link to={`/agreements/new?client=${id}${properties.length === 1 ? `&property=${properties[0].id}` : ""}`}>
                <Button variant="outline" size="sm" className="gap-1.5"><Package className="w-4 h-4" /> Assign Service Package</Button>
              </Link>
            )}
          </div>
          <div className="divide-y divide-border">
            {agreements.length === 0 ? (
              <div className="px-4 py-6">
                <EmptyState icon={Package} title={properties.length === 0 ? "Add a property first" : "No service agreement yet"} description={properties.length === 0 ? "Add a property, then assign a service package." : "Assign a service package to start billing and scheduling."} />
              </div>
            ) : [...agreements].sort((a, b) => (a.status === "Active" ? 0 : 1) - (b.status === "Active" ? 0 : 1)).map((a) => {
              const pkg = servicePackages[a.service_package_id];
              return (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pkg ? pkg.name : "Service package"}</p>
                      <p className="text-xs text-muted-foreground truncate">{propName(a.property_id)} · €{(a.agreed_price || 0).toFixed(2)} · {a.billing_type}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {a.signing_status && <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(a.signing_status)}`}>{a.signing_status}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(a.status)}`}>{a.status}</span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    {a.inspection_frequency && <span>Frequency: {a.inspection_frequency}</span>}
                    {a.start_date && <span>Start: {a.start_date}</span>}
                    {a.renewal_date && <span>Renewal: {a.renewal_date}</span>}
                  </div>
                  {a.status === "Pending" && a.signing_status && a.signing_status !== "Draft" ? (
                    <Link to={`/agreements/${a.id}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                      {a.signing_status === "Sent" && "Awaiting customer signature"}
                      {a.signing_status === "Viewed" && "Customer viewed agreement"}
                      {a.signing_status === "Signed" && "Agreement signed — activation pending"}
                      {a.signing_status === "Declined" && "Customer requested changes / declined"}
                    </Link>
                  ) : (
                    <Link to={`/agreements/${a.id}`} className="text-xs text-primary hover:underline mt-1 inline-block">{a.status === "Pending" ? "Review Agreement" : "Edit Agreement"}</Link>
                  )}
                  {a.status === "Pending" && a.signing_status && a.signing_status !== "Draft" && (a.sent_at || a.viewed_at || a.signed_at || a.declined_at) && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
                      {a.sent_at && <span>Sent {new Date(a.sent_at).toLocaleDateString()}</span>}
                      {a.viewed_at && <span>Viewed {new Date(a.viewed_at).toLocaleDateString()}</span>}
                      {a.signed_at && <span>Signed {new Date(a.signed_at).toLocaleDateString()}</span>}
                      {a.declined_at && <span>Declined {new Date(a.declined_at).toLocaleDateString()}</span>}
                    </div>
                  )}
                  {a.signed_pdf_url && a.public_token && (
                    <button type="button" onClick={() => handleDownloadSigned(a.public_token)} disabled={downloadingPdf === a.public_token} className="mt-0.5 text-[11px] text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-50">
                      {downloadingPdf === a.public_token ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} View Signed PDF
                    </button>
                  )}
                  {a.status === "Active" && a.signing_status === "Signed" && (
                    <p className="mt-1 text-[11px] text-emerald-700 font-medium inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Service active</p>
                  )}
                  {a.status === "Pending" && a.signing_status === "Signed" && (
                    <div className="mt-1.5">
                      <ActivateServiceButton
                        agreementId={a.id}
                        isReplacement={!!(a.agreement_group_id && agreements.some((x) => x.id !== a.id && x.status === "Active" && x.agreement_group_id === a.agreement_group_id))}
                        onActivated={() => window.location.reload()}
                        label="Activate Service"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActivitySection title="Upcoming Visits" icon={MapPin} to="/visits" count={upcomingVisits.length} emptyTitle="No upcoming visits"
            items={upcomingVisits.map((v) => ({ title: `${propName(v.property_id)} — ${v.visit_type}`, subtitle: v.start_time, badge: v.status, to: `/visits/${v.id}` }))} />
          <ActivitySection title="Recent Visits" icon={ClipboardCheck} to="/visits" count={recentVisits.length} emptyTitle="No recent visits"
            items={recentVisits.map((v) => ({ title: `${propName(v.property_id)} — ${v.visit_type}`, subtitle: v.start_time, badge: v.status, to: `/visits/${v.id}` }))} />
          <ActivitySection title="Open Tasks" icon={CalendarClock} to="/tasks" count={openTasks.length} emptyTitle="No open tasks"
            items={openTasks.map((t) => ({ title: t.title, subtitle: `${propName(t.property_id)} · ${t.date || ""}`, badge: t.priority, to: "/tasks" }))} />
          <ActivitySection title="Open Issues / Maintenance" icon={Wrench} to="/maintenance" count={openIssues.length} emptyTitle="No open issues"
            items={openIssues.map((m) => ({ title: m.title, subtitle: `${propName(m.property_id)} · ${m.category}`, badge: m.priority, to: "/maintenance" }))} />
          <ActivitySection title="Expenses / Reimbursements" icon={Wallet} to="/expenses" count={expenses.length} emptyTitle="No expenses"
            items={expenses.map((e) => ({ title: `${e.vendor} — €${(e.amount || 0).toFixed(2)}`, subtitle: `${propName(e.property_id)} · ${e.date || ""}${e.awaiting_reimbursement && !e.reimbursed ? " · Awaiting reimbursement" : ""}`, badge: e.reimbursed ? "Reimbursed" : e.awaiting_reimbursement ? "Pending" : null, to: "/expenses" }))} />
          <ActivitySection title="Invoices" icon={FileText} to="/invoices" count={invoices.length} emptyTitle="No invoices"
            items={invoices.map((i) => ({ title: i.invoice_number, subtitle: `${i.invoice_date || ""} · €${(i.total || 0).toFixed(2)}`, badge: i.status, to: "/invoices" }))} />
          <ActivitySection title="Communications" icon={MessageSquare} to="/communications" count={communications.length} emptyTitle="No communications"
            items={communications.map((co) => ({ title: co.subject, subtitle: `${co.date || ""} · ${co.communication_type}`, badge: co.follow_up_required ? "Follow-up" : null, to: "/communications" }))} />
          <ActivitySection title="Documents" icon={FileWarning} to="/documents" count={documents.length} emptyTitle="No documents"
            items={documents.map((d) => ({ title: d.name, subtitle: d.category, to: "/documents" }))} />
        </div>
      </div>
    </AppLayout>
  );
}