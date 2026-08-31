import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  FileText, Send, Download, Loader2, AlertTriangle, RotateCw, ExternalLink, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ReportReviewModal from "@/components/visits/ReportReviewModal";
import MarkSentExternallyDialog from "@/components/reports/MarkSentExternallyDialog";
import { buildOwnerReportModel, generateAndStoreReportPdf, generateVisitReportPdf } from "@/lib/visitReport";
import { sendOwnerReportEmail } from "@/lib/visitReportSend";
import { visitTypeLabel } from "@/lib/visitTypeLabels";

const STATUS_TONE = {
  Draft: "bg-muted text-muted-foreground border-border",
  "Ready to Send": "bg-sky-500/10 text-sky-600 border-sky-500/20",
  Sent: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Delivery Failed": "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const FILTERS = [
  { key: "needs", label: "Needs Sending" },
  { key: "sent", label: "Sent" },
  { key: "failed", label: "Failed" },
  { key: "all", label: "All" },
];

const statusOf = (v) => (v && (v.report_status || (v.report_sent ? "Sent" : "Draft"))) || "Draft";
const bucketOf = (v) => {
  const s = statusOf(v);
  if (s === "Sent") return "sent";
  if (s === "Delivery Failed") return "failed";
  return "needs";
};
const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

/**
 * Centralized customer-report delivery queue. Reuses the SAME delivery
 * functions as the Visit Detail ReportDeliveryCard (sendOwnerReportEmail,
 * buildOwnerReportModel, generateAndStoreReportPdf, generateVisitReportPdf)
 * and updates the SAME PropertyVisit.report_* fields, so there is one report
 * record and one delivery path. Completing a visit never emails the customer;
 * the employee decides when to send.
 */
export default function ReportDeliveryQueue() {
  const [searchParams] = useSearchParams();
  const autoOpenId = searchParams.get("open");

  const [visits, setVisits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [business, setBusiness] = useState({});
  const [allIssues, setAllIssues] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("needs");
  const [reviewVisit, setReviewVisit] = useState(null);
  const [model, setModel] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [markExtFor, setMarkExtFor] = useState(null);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const autoOpenDone = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const [vs, props, cls, bss, issues, tasks] = await Promise.all([
        base44.entities.PropertyVisit.list("-start_time", 500),
        base44.entities.Property.list("-created_date", 500),
        base44.entities.Client.list("-created_date", 500),
        base44.entities.BusinessSettings.list("-created_date", 1),
        base44.entities.MaintenanceIssue.list("-created_date", 500),
        base44.entities.Task.list("-created_date", 500),
      ]);
      setVisits((vs || []).filter((v) => v.status === "Completed" && !v.archived));
      setProperties(props || []);
      setClients(cls || []);
      setBusiness((bss && bss[0]) || {});
      setAllIssues(issues || []);
      setAllTasks(tasks || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    base44.auth.me().then((u) => {
      setUserName(u?.full_name || u?.email || "");
      setIsAdmin(u?.role === "admin");
    }).catch(() => {});
  }, []);

  const propFor = (id) => properties.find((p) => p.id === id) || {};
  const clientFor = (id) => clients.find((c) => c.id === propFor(id).owner_id) || {};
  const ctxFor = (v) => ({
    business, property: propFor(v.property_id), client: clientFor(v.property_id),
    issues: v.maintenance_issue_ids?.length ? allIssues.filter((m) => v.maintenance_issue_ids.includes(m.id)) : [],
    tasks: v.follow_up_task_ids?.length ? allTasks.filter((t) => v.follow_up_task_ids.includes(t.id)) : [],
    nextVisit: null,
  });
  const applyUpdate = (id, patch) => setVisits((arr) => arr.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const openReview = async (v) => {
    setError("");
    setReviewVisit(v);
    setModel(null);
    setGenerating(true);
    try {
      const ctx = ctxFor(v);
      let pdfUrl = v.report_pdf_url;
      if (!pdfUrl || statusOf(v) === "Draft") {
        const { file_url } = await generateAndStoreReportPdf(v, ctx);
        await base44.entities.PropertyVisit.update(v.id, { report_pdf_url: file_url, report_status: "Ready to Send" });
        pdfUrl = file_url;
        applyUpdate(v.id, { report_pdf_url: file_url, report_status: "Ready to Send" });
      }
      setModel(buildOwnerReportModel({ ...v, report_pdf_url: pdfUrl }, ctx));
    } catch (e) { setError("Could not generate report: " + (e?.message || e)); }
    setGenerating(false);
  };

  // Deep-link from Dashboard "Reports to Send": /reports?open=<visitId>
  useEffect(() => {
    if (!autoOpenId || loading || visits.length === 0 || autoOpenDone.current) return;
    const v = visits.find((x) => x.id === autoOpenId);
    if (v) { autoOpenDone.current = true; setFilter(bucketOf(v)); openReview(v); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenId, loading, visits]);

  const doSend = async (v, isResend) => {
    setError("");
    const client = clientFor(v.property_id);
    if (!client?.email) { setError("No email on the client record. Use Mark Sent Externally or Download PDF."); return; }
    if (isResend && !window.confirm("Resend this report to the owner?")) return;
    setSendingId(v.id);
    try {
      let pdfUrl = v.report_pdf_url;
      if (!pdfUrl) {
        const { file_url } = await generateAndStoreReportPdf(v, ctxFor(v));
        await base44.entities.PropertyVisit.update(v.id, { report_pdf_url: file_url, report_status: "Ready to Send" });
        pdfUrl = file_url;
        applyUpdate(v.id, { report_pdf_url: file_url, report_status: "Ready to Send" });
      }
      const res = await sendOwnerReportEmail({
        visit: v, property: propFor(v.property_id), client, business,
        pdfUrl, result: (reviewVisit?.id === v.id ? model?.result : "") || "", sentBy: userName,
      });
      if (res.ok) {
        const patch = {
          report_status: "Sent", report_sent: true, report_sent_at: new Date().toISOString(),
          report_sent_to: res.to, report_sent_by: userName, report_delivery_method: "Email", report_pdf_url: pdfUrl,
        };
        await base44.entities.PropertyVisit.update(v.id, patch);
        applyUpdate(v.id, patch);
        if (reviewVisit?.id === v.id) setReviewVisit(null);
      } else {
        await base44.entities.PropertyVisit.update(v.id, { report_status: "Delivery Failed" });
        applyUpdate(v.id, { report_status: "Delivery Failed" });
        setError("Email delivery failed: " + (res.error || "unknown error") + ". You can download/share manually or mark sent externally.");
      }
    } catch (e) {
      await base44.entities.PropertyVisit.update(v.id, { report_status: "Delivery Failed" });
      applyUpdate(v.id, { report_status: "Delivery Failed" });
      setError("Email delivery failed: " + (e?.message || e));
    }
    setSendingId(null);
  };

  const download = async (v) => {
    setDownloadingId(v.id);
    try { await generateVisitReportPdf(v, ctxFor(v)); }
    catch (e) { setError("Could not generate PDF: " + (e?.message || e)); }
    setDownloadingId(null);
  };

  const confirmMarkExt = async ({ method, recipient }) => {
    const v = markExtFor;
    if (!v) return;
    const patch = {
      report_status: "Sent", report_sent: true, report_sent_at: new Date().toISOString(),
      report_sent_by: userName, report_delivery_method: method,
    };
    if (recipient) patch.report_sent_to = recipient;
    try {
      await base44.entities.PropertyVisit.update(v.id, patch);
      applyUpdate(v.id, patch);
      setMarkExtFor(null);
    } catch (e) { setError("Could not mark sent: " + (e?.message || e)); }
  };

  const counts = useMemo(() => {
    const c = { needs: 0, sent: 0, failed: 0, all: visits.length };
    visits.forEach((v) => { c[bucketOf(v)]++; });
    return c;
  }, [visits]);

  const filtered = useMemo(() => {
    if (filter === "all") return visits;
    return visits.filter((v) => bucketOf(v) === filter);
  }, [visits, filter]);

  const canDispatch = isAdmin;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Customer report delivery queue — review and send completed visit reports to owners."
        icon={FileText}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-500">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => {
          const activeTab = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-sm px-3.5 py-2 rounded-full border transition ${activeTab ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted/50"}`}
            >
              {f.label} <span className={activeTab ? "opacity-90" : "text-muted-foreground/70"}>({counts[f.key]})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={filter === "needs" ? CheckCircle2 : FileText}
          title={filter === "needs" ? "Nothing to send" : filter === "sent" ? "No sent reports" : filter === "failed" ? "No failed deliveries" : "No reports yet"}
          description={filter === "needs" ? "All completed visit reports have been delivered." : "Reports will appear here as visits are completed."}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const status = statusOf(v);
            const sent = status === "Sent";
            const failed = status === "Delivery Failed";
            const prop = propFor(v.property_id);
            const client = clientFor(v.property_id);
            const external = sent && v.report_delivery_method && v.report_delivery_method !== "Email";
            return (
              <div key={v.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{prop.name || "Property"}{client.name ? ` · ${client.name}` : ""}</p>
                    <p className="text-xs text-muted-foreground truncate">{visitTypeLabel(v.visit_type)} · Visit {fmtDate(v.start_time)}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${STATUS_TONE[status] || STATUS_TONE.Draft}`}>{status}</span>
                </div>

                {sent ? (
                  <p className="text-xs text-muted-foreground">
                    {external ? `Marked externally · ${v.report_delivery_method}` : "Sent via Email"}
                    {" on " + fmtDateTime(v.report_sent_at)}
                    {v.report_sent_to ? ` · to ${v.report_sent_to}` : ""}
                    {v.report_sent_by ? ` · by ${v.report_sent_by}` : ""}
                  </p>
                ) : (
                  client.email
                    ? <p className="text-xs text-muted-foreground">Recipient: {client.email}</p>
                    : <p className="text-xs text-amber-600">No email on client record — mark sent externally or download PDF.</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                  <Button onClick={() => openReview(v)} disabled={generating && reviewVisit?.id === v.id} variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                    {generating && reviewVisit?.id === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Review Report
                  </Button>
                  {canDispatch && !sent && (
                    <Button onClick={() => doSend(v, false)} disabled={sendingId === v.id} size="sm" className="rounded-xl gap-1.5 h-9">
                      {sendingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : failed ? <RotateCw className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      {failed ? "Retry Delivery" : "Send to Owner"}
                    </Button>
                  )}
                  {canDispatch && sent && (
                    <Button onClick={() => doSend(v, true)} disabled={sendingId === v.id} variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                      {sendingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />} Resend Report
                    </Button>
                  )}
                  <Button onClick={() => download(v)} disabled={downloadingId === v.id} variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                    {downloadingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
                  </Button>
                  {canDispatch && !sent && (
                    <Button onClick={() => setMarkExtFor(v)} variant="ghost" size="sm" className="rounded-xl gap-1.5 h-9">
                      <ExternalLink className="w-4 h-4" /> Mark Sent Externally
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!canDispatch && !loading && (
        <p className="text-xs text-muted-foreground mt-4">
          You can review and download reports. Sending, resending and marking sent externally are restricted to administrators.
        </p>
      )}

      <ReportReviewModal
        open={!!reviewVisit}
        model={model}
        generating={generating}
        sending={!!sendingId && sendingId === reviewVisit?.id}
        canSend={canDispatch && !!reviewVisit && (!!reviewVisit.report_pdf_url || statusOf(reviewVisit) === "Ready to Send")}
        onClose={() => setReviewVisit(null)}
        onSend={() => reviewVisit && doSend(reviewVisit, false)}
        onBackToEdit={() => setReviewVisit(null)}
      />

      <MarkSentExternallyDialog
        open={!!markExtFor}
        onClose={() => setMarkExtFor(null)}
        onConfirm={confirmMarkExt}
      />
    </div>
  );
}