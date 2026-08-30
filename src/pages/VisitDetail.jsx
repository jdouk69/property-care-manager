import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ChevronLeft, Clock, MapPin, Gauge, Wrench, ListChecks, Download,
  Loader2, Archive, CheckCircle2, AlertTriangle, Trash2, X, Package, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { Image as UIImage } from "@/components/ui/image";
import { generateVisitReportPdf } from "@/lib/visitReport";
import { visitTypeLabel } from "@/lib/visitTypeLabels";

const GROUPS = [
  { key: "Emergency", tone: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
  { key: "Important", tone: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  { key: "Normal", tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { key: "Not Checked", tone: "text-muted-foreground bg-muted border-border" },
];

export default function VisitDetail() {
  const { id } = useParams();
  const [visit, setVisit] = useState(null);
  const [property, setProperty] = useState({});
  const [client, setClient] = useState({});
  const [issues, setIssues] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [business, setBusiness] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [agreement, setAgreement] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const v = await base44.entities.PropertyVisit.get(id);
        setVisit(v);
        const [props, bss] = await Promise.all([
          base44.entities.Property.list("-created_date", 500),
          base44.entities.BusinessSettings.list("-created_date", 1),
        ]);
        const p = (props || []).find((x) => x.id === v.property_id) || {};
        setProperty(p);
        setBusiness((bss && bss[0]) || {});
        if (p.owner_id) { try { setClient(await base44.entities.Client.get(p.owner_id)); } catch (e) {} }
        if (v.property_service_agreement_id) {
          try {
            const ag = await base44.entities.PropertyServiceAgreement.get(v.property_service_agreement_id);
            setAgreement(ag);
            if (ag?.service_package_id) { try { setPkg(await base44.entities.ServicePackage.get(ag.service_package_id)); } catch (e) {} }
          } catch (e) {}
        }
        if (v.maintenance_issue_ids?.length) {
          try {
            const all = await base44.entities.MaintenanceIssue.list("-created_date", 500);
            setIssues((all || []).filter((m) => v.maintenance_issue_ids.includes(m.id)));
          } catch (e) {}
        }
        if (v.follow_up_task_ids?.length) {
          try {
            const all = await base44.entities.Task.list("-created_date", 500);
            setTasks((all || []).filter((t) => v.follow_up_task_ids.includes(t.id)));
          } catch (e) {}
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const fmt = (iso) => iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

  const toggleReportSent = async (val) => {
    const updated = { ...visit, report_sent: val };
    setVisit(updated);
    try { await base44.entities.PropertyVisit.update(visit.id, { report_sent: val }); } catch (e) {}
  };

  const startScheduledVisit = async () => {
    if (!confirm("Start this visit now? It will move to In Progress and open the checklist.")) return;
    setStarting(true);
    try {
      await base44.entities.PropertyVisit.update(visit.id, { status: "In Progress", start_time: new Date().toISOString() });
      navigate(`/visits?resume=${visit.id}`);
    } catch (e) { alert("Could not start visit: " + (e?.message || e)); }
    setStarting(false);
  };

  const cancelScheduledVisit = async () => {
    if (!confirm("Cancel this scheduled visit?")) return;
    setCancelling(true);
    try { await base44.entities.PropertyVisit.update(visit.id, { status: "Cancelled" }); setVisit((v) => ({ ...v, status: "Cancelled" })); } catch (e) { alert("Could not cancel visit: " + (e?.message || e)); }
    setCancelling(false);
  };

  const archive = async () => {
    if (!confirm("Archive this visit? It will be hidden from the list but not deleted.")) return;
    setArchiving(true);
    try { await base44.entities.PropertyVisit.update(visit.id, { archived: true }); setVisit((v) => ({ ...v, archived: true })); } catch (e) {}
    setArchiving(false);
  };

  const deletePermanently = async () => {
    setDeleting(true);
    try {
      await base44.entities.PropertyVisit.delete(visit.id);
      navigate("/visits");
    } catch (e) {
      alert("Could not delete visit: " + (e?.message || e));
    }
    setDeleting(false);
  };

  const downloadReport = async () => {
    setGenerating(true);
    try {
      await generateVisitReportPdf(visit, { business, property, client, issues, tasks });
    } catch (e) { alert("Could not generate report: " + (e?.message || e)); }
    setGenerating(false);
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!visit) return <AppLayout><div className="p-6"><p className="text-muted-foreground">Visit not found.</p><Link to="/visits"><Button variant="outline" className="mt-3">Back to Visits</Button></Link></div></AppLayout>;

  const checklist = visit.checklist || [];
  const grouped = GROUPS.map((g) => ({ ...g, items: checklist.filter((i) => (i.status || "Not Checked") === g.key) }));

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback="/visits" className="mb-2" />

        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <h1 className="text-xl font-semibold">{property.name || "Property"}</h1>
          {property.address && <p className="text-sm text-muted-foreground">{property.address}</p>}
          {client.name && <p className="text-sm text-muted-foreground">Owner: {client.name}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">{visitTypeLabel(visit.visit_type)}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${visit.status === "Completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : visit.status === "Cancelled" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : visit.status === "Scheduled" ? "bg-sky-500/10 text-sky-600 border-sky-500/20" : visit.status === "In Progress" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-muted text-muted-foreground border-border"}`}>{visit.status}</span>
            {visit.report_sent && <span className="text-xs px-2.5 py-1 rounded-full border bg-sky-500/10 text-sky-600 border-sky-500/20">Report Sent</span>}
          </div>
        </div>

        {visit.property_service_agreement_id && agreement && (
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-muted-foreground" /><h3 className="font-medium text-sm">Service Agreement</h3></div>
            <div className="text-sm space-y-0.5">
              <p><span className="text-muted-foreground">Package:</span> <span className="text-foreground font-medium">{pkg?.name || "—"}</span></p>
              <p><span className="text-muted-foreground">Client / Property:</span> <span className="text-foreground">{client.name || "—"} · {property.name || "—"}</span></p>
              <p><span className="text-muted-foreground">Agreed service:</span> <span className="text-foreground">{agreement.billing_type || "—"}{agreement.inspection_frequency ? ` · ${agreement.inspection_frequency}` : ""}</span></p>
              {pkg?.visit_duration && <p><span className="text-muted-foreground">Expected visit time:</span> <span className="text-foreground">{pkg.visit_duration}</span></p>}
            </div>
          </div>
        )}

        {visit.status === "Scheduled" && (
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 mb-4 flex flex-col sm:flex-row gap-2">
            <Button onClick={startScheduledVisit} disabled={starting} className="rounded-2xl gap-1.5"><Play className="w-4 h-4" /> {starting ? "Starting…" : "Start Visit"}</Button>
            <Button variant="outline" onClick={cancelScheduledVisit} disabled={cancelling} className="rounded-2xl gap-1.5"><X className="w-4 h-4" /> Cancel Visit</Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-2xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {visit.status === "Scheduled" ? "Scheduled" : "Arrival"}</p><p className="text-sm font-medium mt-1">{fmt(visit.scheduled_time || visit.start_time)}</p></div>
          <div className="rounded-2xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Completion</p><p className="text-sm font-medium mt-1">{fmt(visit.end_time)}</p></div>
        </div>

        {visit.gps_location && (
          <div className="rounded-2xl border border-border bg-card p-3 mb-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS Location</p><p className="text-sm font-medium mt-1">{visit.gps_location}</p></div>
        )}

        {/* Checklist grouped */}
        <h2 className="text-sm font-semibold mb-2">Checklist</h2>
        <div className="space-y-3 mb-4">
          {grouped.map((g) => (
            <div key={g.key} className="rounded-2xl border border-border bg-card p-3">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${g.tone}`}>{g.key} ({g.items.length})</span>
              <div className="mt-2 space-y-3">
                {g.items.map((it, i) => (
                  <div key={i} className="border-l-2 border-border pl-3">
                    <p className="text-sm font-medium">{it.name}</p>
                    {it.notes && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{it.notes}</p>}
                    {it.photos?.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {it.photos.map((url, pi) => (
                          <a key={pi} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden">
                            <UIImage src={url} className="w-full h-full" fittingType="fill" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {g.items.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Meter readings */}
        {visit.meter_readings?.filter((m) => m.label || m.value).length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-2"><Gauge className="w-4 h-4 text-muted-foreground" /><h3 className="font-medium text-sm">Meter Readings</h3></div>
            <div className="space-y-1">
              {visit.meter_readings.filter((m) => m.label || m.value).map((m, i) => (
                <p key={i} className="text-sm">{m.label || "—"}: <span className="font-medium">{m.value || "—"}</span></p>
              ))}
            </div>
          </div>
        )}

        {/* Linked issues */}
        {issues.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-2"><Wrench className="w-4 h-4 text-muted-foreground" /><h3 className="font-medium text-sm">Maintenance Issues ({issues.length})</h3></div>
            <div className="space-y-1">
              {issues.map((iss) => (
                <Link key={iss.id} to="/maintenance" className="block text-sm text-primary hover:underline">{iss.title} <span className="text-muted-foreground">[{iss.priority}]</span></Link>
              ))}
            </div>
          </div>
        )}

        {/* Linked tasks */}
        {tasks.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-2"><ListChecks className="w-4 h-4 text-muted-foreground" /><h3 className="font-medium text-sm">Follow-up Tasks ({tasks.length})</h3></div>
            <div className="space-y-1">
              {tasks.map((t) => (
                <Link key={t.id} to="/tasks" className="block text-sm text-primary hover:underline">{t.title}</Link>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {visit.summary && (
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <h3 className="font-medium text-sm mb-1">Summary & Recommendations</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.summary}</p>
          </div>
        )}

        {/* Actions */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Owner report</p><p className="text-xs text-muted-foreground">Mark as sent to the owner</p></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{visit.report_sent ? "Sent" : "Not sent"}</span>
              <Switch checked={!!visit.report_sent} onCheckedChange={toggleReportSent} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button onClick={downloadReport} disabled={generating} className="rounded-2xl gap-1.5">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download Owner Report (PDF)
            </Button>
            <Button variant="outline" onClick={archive} disabled={archiving} className="rounded-2xl gap-1.5"><Archive className="w-4 h-4" /> Archive</Button>
            {isAdmin && (
              <Button variant="destructive" onClick={() => setDeleteStep(1)} className="rounded-2xl gap-1.5 ml-auto"><Trash2 className="w-4 h-4" /> Delete Permanently</Button>
            )}
          </div>
        </div>

        {deleteStep > 0 && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border max-w-sm w-full p-5 shadow-xl">
              {deleteStep === 1 ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <h3 className="font-semibold">Delete this visit permanently?</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">This will permanently delete the visit record, including its checklist answers, notes, photos, meter readings, and summary.</p>
                  <div className="rounded-xl border border-border bg-muted/40 p-3 mb-4 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Related data that will be affected:</p>
                    <p>• Issues, tasks, expenses, receipts, contractor activity, and owner updates created during this visit will <span className="font-medium">remain</span> in their modules, but will no longer be linked to this visit.</p>
                    <p>• This action <span className="font-medium">cannot be undone</span>.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={() => setDeleteStep(0)} className="rounded-2xl h-11">Keep Visit</Button>
                    <Button variant="destructive" onClick={() => setDeleteStep(2)} className="rounded-2xl h-11">Continue</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <h3 className="font-semibold">Are you absolutely sure?</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">This cannot be undone. The visit record and all its recorded details will be permanently removed.</p>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={() => setDeleteStep(1)} disabled={deleting} className="rounded-2xl h-11">Back</Button>
                    <Button variant="destructive" onClick={deletePermanently} disabled={deleting} className="rounded-2xl h-11">
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1.5" /> Yes, delete permanently</>}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}