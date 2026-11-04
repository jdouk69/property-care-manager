import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  FileText, Send, Download, Loader2, AlertTriangle, RotateCw, ExternalLink, CheckCircle2, Trash2, Archive, ArchiveRestore,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ReportReviewModal from "@/components/visits/ReportReviewModal";
import MarkSentExternallyDialog from "@/components/reports/MarkSentExternallyDialog";
import { buildOwnerReportModel, generateVisitReportPdf } from "@/lib/visitReport";
import { approveReport, dispatchReportEmail, reviewStateFor, reportGenerationError } from "@/lib/reportDelivery";
import { isReportExcludedVisit } from "@/lib/visitTypeLabels";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { athensMediumDateTime, athensMediumDate } from "@/lib/timezone";
import { qaPropertyIds } from "@/lib/qaGuard";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SHORT_TERM_RENTAL_VILLA, propertyScopeError } from "../../../server/shared/propertyScope.js";

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
  { key: "archived", label: "Archived" },
];

const statusOf = (v) => (v && (v.report_status || (v.report_sent ? "Sent" : "Draft"))) || "Draft";
// Display-only localized date formatting (stored timestamps untouched).
const tDate = (iso, lang) => (iso ? athensMediumDate(iso, lang) : "—");
const tDateTime = (iso, lang) => (iso ? athensMediumDateTime(iso, lang) : "—");
const bucketOf = (v) => {
  const s = statusOf(v);
  if (s === "Sent") return "sent";
  if (s === "Delivery Failed") return "failed";
  return "needs";
};


/**
 * Centralized customer-report delivery queue. Reuses the SAME delivery
 * pipeline as the Visit Detail ReportDeliveryCard (buildOwnerReportModel,
 * reviewStateFor, approveReport, dispatchReportEmail via reportDelivery.js)
 * and updates the SAME PropertyVisit.report_* fields, so there is one report
 * record and one delivery path. Completing a visit never emails the customer;
 * the employee decides when to send.
 */
export default function ReportDeliveryQueue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, tEnum, lang } = useLanguage();
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
  const [approving, setApproving] = useState(false);
  const [photoWarn, setPhotoWarn] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);
  const [confirmingOccupancy, setConfirmingOccupancy] = useState(false);
  const [markExtFor, setMarkExtFor] = useState(null);
  const [propertyLinkVisit, setPropertyLinkVisit] = useState(null);
  const [propertyLinkId, setPropertyLinkId] = useState("");
  const [linkingProperty, setLinkingProperty] = useState(false);
  const [propertyLinkError, setPropertyLinkError] = useState("");
  const [deleteConfirmFor, setDeleteConfirmFor] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [notice, setNotice] = useState("");
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
      // QA test property's synthetic visits stay out of the real delivery queue.
      const qaIds = qaPropertyIds(props || []);
      // Follow-up visits use a photo update; Quick Check reports remain in the queue.
      setVisits((vs || []).filter((v) => v.status === "Completed" && !v.archived && !v.report_deleted && !qaIds.has(v.property_id) && !isReportExcludedVisit(v)));
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
  const fixPropertyForVisit = (visit, focusField, returnTo) => {
    if (!visit) return;
    const property = propFor(visit.property_id);
    const back = returnTo || `/reports?open=${encodeURIComponent(visit.id)}`;
    if (property?.id) {
      navigate(`/properties?edit=${encodeURIComponent(property.id)}&focus=${encodeURIComponent(focusField)}&returnTo=${encodeURIComponent(back)}`);
    } else {
      navigate(`/properties?add=1&repairVisit=${encodeURIComponent(visit.id)}&focus=owner_id&returnTo=${encodeURIComponent(back)}`);
    }
  };
  const openPropertyLink = (visit) => {
    setPropertyLinkVisit(visit);
    setPropertyLinkId("");
    setPropertyLinkError("");
  };
  const linkVisitToProperty = async () => {
    if (!propertyLinkVisit || !propertyLinkId) return;
    const property = properties.find((p) => p.id === propertyLinkId);
    if (!property) return;
    const scopeError = propertyScopeError(property, propertyLinkVisit.visit_type, propertyLinkVisit.status, propertyLinkVisit.exterior_only === true);
    if (scopeError) {
      setPropertyLinkError(t("This visit cannot be linked to the selected property: {error}", { error: t(scopeError) }));
      return;
    }
    setLinkingProperty(true);
    setPropertyLinkError("");
    try {
      await base44.entities.PropertyVisit.update(propertyLinkVisit.id, { property_id: property.id });
      const updated = { ...propertyLinkVisit, property_id: property.id };
      applyUpdate(propertyLinkVisit.id, { property_id: property.id });
      if (reviewVisit?.id === updated.id) {
        setReviewVisit(updated);
        setModel(buildOwnerReportModel(updated, { ...ctxFor(updated), property, client: clients.find((c) => c.id === property.owner_id) || {} }));
      }
      setPropertyLinkVisit(null);
    } catch (e) {
      setPropertyLinkError(t("Could not link this visit to the property: {error}", { error: e?.message || e }));
    } finally {
      setLinkingProperty(false);
    }
  };
  const ctxFor = (v) => ({
    business, property: propFor(v.property_id), client: clientFor(v.property_id),
    issues: v.maintenance_issue_ids?.length ? allIssues.filter((m) => v.maintenance_issue_ids.includes(m.id)) : [],
    tasks: v.follow_up_task_ids?.length ? allTasks.filter((t) => v.follow_up_task_ids.includes(t.id)) : [],
    nextVisit: null,
  });
  const applyUpdate = (id, patch) => setVisits((arr) => arr.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  // Opening the review modal is read-only: it builds the model from the
  // CURRENT data and never writes or sends anything. Approval is explicit.
  const openReview = async (v) => {
    setError("");
    setReviewVisit(v);
    setModel(null);
    setGenerating(true);
    try {
      setModel(buildOwnerReportModel(v, ctxFor(v)));
    } catch (e) { setError(reportGenerationError(e, t)); }
    setGenerating(false);
  };

  const approveReview = async (durationDecision) => {
    const v = reviewVisit;
    if (!v) return;
    setApproving(true);
    try {
      const { updated, model: m, photoFailures } = await approveReport(v, ctxFor(v), userName, durationDecision);
      applyUpdate(v.id, updated);
      setReviewVisit(updated);
      setModel(m);
      setPhotoWarn(photoFailures || 0);
    } catch (e) { setError(reportGenerationError(e, t)); }
    setApproving(false);
  };

  const confirmOccupancyForReport = async () => {
    const v = reviewVisit;
    if (!v) return;
    const confirmed = window.confirm(t("Confirm that this short-term-rental property was vacant when this completed interior visit took place? Only continue if no owner, guest, tenant, or other person was staying there. If you are unsure, cancel."));
    if (!confirmed) return;
    setConfirmingOccupancy(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const patch = {
        occupancy_confirmed_vacant: true,
        occupancy_confirmed_at: new Date().toISOString(),
        occupancy_confirmed_by: me?.full_name || me?.email || userName || "",
      };
      const updated = await base44.entities.PropertyVisit.update(v.id, patch);
      applyUpdate(v.id, patch);
      setReviewVisit({ ...updated, ...patch });
      setError("");
    } catch (e) {
      setError(t("Could not save the vacancy confirmation: {error}", { error: e?.message || e }));
    } finally {
      setConfirmingOccupancy(false);
    }
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
    if (!String(client?.email || "").trim()) {
      const returnTo = `/reports?open=${encodeURIComponent(v.id)}`;
      if (client?.id) {
        navigate(`/clients?edit=${encodeURIComponent(client.id)}&focus=email&returnTo=${encodeURIComponent(returnTo)}`);
      } else {
        fixPropertyForVisit(v, "owner_id", returnTo);
      }
      return;
    }
    // Delivery requires an APPROVED report whose fingerprint still matches the
    // current data — stale approvals force re-approval first.
    const st = reviewStateFor(v, ctxFor(v));
    if (!st.approved || !st.hashMatches) { openReview(v); return; }
    if (isResend && !window.confirm(t("Resend this report to the owner?"))) return;
    setSendingId(v.id);
    try {
      const res = await dispatchReportEmail({ visit: v, ctx: ctxFor(v), sentBy: userName });
      if (res.ok) {
        const patch = {
          report_status: "Sent", report_sent: true, report_sent_at: new Date().toISOString(),
          report_sent_to: res.to, report_sent_by: userName, report_delivery_method: "Email",
        };
        await base44.entities.PropertyVisit.update(v.id, patch);
        applyUpdate(v.id, patch);
        if (reviewVisit?.id === v.id) setReviewVisit(null);
      } else {
        await base44.entities.PropertyVisit.update(v.id, { report_status: "Delivery Failed" });
        applyUpdate(v.id, { report_status: "Delivery Failed" });
        setError(t("Email delivery failed: {error}. You can download/share manually or mark sent externally.", { error: res.error || "unknown error" }));
      }
    } catch (e) {
      await base44.entities.PropertyVisit.update(v.id, { report_status: "Delivery Failed" });
      applyUpdate(v.id, { report_status: "Delivery Failed" });
      setError(t("Email delivery failed: {error}. You can download/share manually or mark sent externally.", { error: e?.message || e }));
    }
    setSendingId(null);
  };

  const download = async (v) => {
    setDownloadingId(v.id);
    try { await generateVisitReportPdf(v, ctxFor(v)); }
    catch (e) { setError(reportGenerationError(e, t)); }
    setDownloadingId(null);
  };

  const requestDeleteReport = (v) => {
    setError("");
    setNotice("");
    setDeleteConfirmFor(v);
  };

  const deleteReport = async () => {
    const v = deleteConfirmFor;
    if (!v) return;
    setDeletingId(v.id);
    setError("");
    try {
      // Base44 stores customer reports on PropertyVisit; soft-delete only the report queue entry.
      await base44.entities.PropertyVisit.update(v.id, { report_deleted: true });
      setVisits((items) => items.filter((item) => item.id !== v.id));
      if (reviewVisit?.id === v.id) setReviewVisit(null);
      setDeleteConfirmFor(null);
      setNotice(t("Report deleted. The completed visit remains in Property Visits."));
    } catch (e) {
      if (e?.status === 404) {
        // Refresh from the server before deciding whether a missing record may
        // disappear from this device's queue; never fake a successful deletion.
        await load();
        setError(t("The server could not find this visit. The Reports list was refreshed; if the report is still shown, it was not deleted."));
      } else {
        setError(t("Could not delete the report: {error}", { error: e?.message || e }));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const archiveReport = async (v) => {
    const propName = propFor(v.property_id).name || t("Property");
    if (!window.confirm(t("Archive the sent report for {property}? It will leave the active Reports list and remain available in Archived.", { property: propName }))) return;
    try {
      const patch = { report_archived: true };
      await base44.entities.PropertyVisit.update(v.id, patch);
      applyUpdate(v.id, patch);
    } catch (e) {
      setError(t("Could not archive the report: {error}", { error: e?.message || e }));
    }
  };

  const restoreReport = async (v) => {
    try {
      const patch = { report_archived: false };
      await base44.entities.PropertyVisit.update(v.id, patch);
      applyUpdate(v.id, patch);
    } catch (e) {
      setError(t("Could not restore the report: {error}", { error: e?.message || e }));
    }
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
    } catch (e) { setError(t("Could not mark sent: {error}", { error: e?.message || e })); }
  };

  const counts = useMemo(() => {
    const c = { needs: 0, sent: 0, failed: 0, all: 0, archived: 0 };
    visits.forEach((v) => {
      if (v.report_archived) c.archived++;
      else { c[bucketOf(v)]++; c.all++; }
    });
    return c;
  }, [visits]);

  const filtered = useMemo(() => {
    if (filter === "archived") return visits.filter((v) => v.report_archived);
    const active = visits.filter((v) => !v.report_archived);
    if (filter === "all") return active;
    return active.filter((v) => bucketOf(v) === filter);
  }, [visits, filter]);

  const canDispatch = isAdmin;

  return (
    <div>
      <PageHeader
        title={t("Reports")}
        subtitle={t("Customer report delivery queue — review and send completed visit reports to owners.")}
        icon={FileText}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-500">{error}</p>
        </div>
      )}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 mb-3 text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => {
          const activeTab = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-sm px-3.5 py-2 rounded-full border transition ${activeTab ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted/50"}`}
            >
              {f.key === "all" ? t("All") : f.key === "archived" ? t("Archived") : f.key === "sent" ? tEnum("Sent", "report") : f.key === "failed" ? t("Failed") : t("Needs Sending")} <span className={activeTab ? "opacity-90" : "text-muted-foreground/70"}>({counts[f.key]})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={filter === "needs" ? CheckCircle2 : FileText}
          title={filter === "needs" ? t("Nothing to send") : filter === "sent" ? t("No sent reports") : filter === "failed" ? t("No failed deliveries") : filter === "archived" ? t("No archived reports") : t("No reports yet")}
          description={filter === "needs" ? t("All completed visit reports have been delivered.") : filter === "archived" ? t("Archived reports will appear here.") : t("Reports will appear here as visits are completed.")}
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
                    <p className="text-sm font-semibold truncate">{prop.name || t("Property")}{client.name ? ` · ${client.name}` : ""}</p>
                    <p className="text-xs text-muted-foreground truncate">{t(visitTypeLabel(v.visit_type))} · {t("Visit {date}", { date: tDate(v.start_time, lang) })}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${STATUS_TONE[status] || STATUS_TONE.Draft}`}>{tEnum(status, "report")}</span>
                </div>

                {sent ? (
                  <p className="text-xs text-muted-foreground">
                    {external ? t("Marked externally · {method}", { method: t(v.report_delivery_method) }) : t("Sent via Email")}
                    {" " + t("on {date}", { date: tDateTime(v.report_sent_at, lang) })}
                    {v.report_sent_to ? ` · ${t("to {recipient}", { recipient: v.report_sent_to })}` : ""}
                    {v.report_sent_by ? ` · ${t("by {name}", { name: v.report_sent_by })}` : ""}
                  </p>
                ) : (
                  client.email
                    ? <p className="text-xs text-muted-foreground">{t("Recipient: {email}", { email: client.email })}</p>
                    : <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs text-amber-600">{t("No email on client record — mark sent externally or download PDF.")}</p>
                        <Button onClick={() => {
                          const returnTo = `/reports?open=${encodeURIComponent(v.id)}`;
                          if (client.id) navigate(`/clients?edit=${encodeURIComponent(client.id)}&focus=email&returnTo=${encodeURIComponent(returnTo)}`);
                          else if (prop.id) fixPropertyForVisit(v, "owner_id", returnTo);
                          else openPropertyLink(v);
                        }} variant="outline" size="sm" className="min-h-9 rounded-xl">{t(client.id ? "Fix owner email" : prop.id ? "Choose owner for this property" : "Choose property and owner")}</Button>
                      </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                  <Button onClick={() => openReview(v)} disabled={generating && reviewVisit?.id === v.id} variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                    {generating && reviewVisit?.id === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} {t("Review Report")}
                  </Button>
                  {canDispatch && !sent && (
                    <Button onClick={() => doSend(v, false)} disabled={sendingId === v.id} size="sm" className="rounded-xl gap-1.5 h-9">
                      {sendingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : failed ? <RotateCw className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      {failed ? t("Retry Delivery") : t("Send to Owner")}
                    </Button>
                  )}
                  {canDispatch && (
                    <Button onClick={() => requestDeleteReport(v)} disabled={deletingId === v.id} variant="destructive" size="sm" className="rounded-xl gap-1.5 h-9">
                      <Trash2 className="w-4 h-4" /> {t("Delete Report")}
                    </Button>
                  )}
                  {canDispatch && sent && !v.report_archived && (
                    <Button onClick={() => archiveReport(v)} variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                      <Archive className="w-4 h-4" /> {t("Archive")}
                    </Button>
                  )}
                  {canDispatch && v.report_archived && (
                    <Button onClick={() => restoreReport(v)} variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                      <ArchiveRestore className="w-4 h-4" /> {t("Restore to Reports")}
                    </Button>
                  )}
                  {canDispatch && sent && (
                    <Button onClick={() => doSend(v, true)} disabled={sendingId === v.id} variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                      {sendingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />} {t("Resend Report")}
                    </Button>
                  )}
                  <Button onClick={() => download(v)} disabled={downloadingId === v.id} variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                    {downloadingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {t("Download PDF")}
                  </Button>
                  {canDispatch && !sent && (
                    <Button onClick={() => setMarkExtFor(v)} variant="ghost" size="sm" className="rounded-xl gap-1.5 h-9">
                      <ExternalLink className="w-4 h-4" /> {t("Mark Sent Externally")}
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
          {t("You can review and download reports. Sending, resending and marking sent externally are restricted to administrators.")}
        </p>
      )}

      <ReportReviewModal
        open={!!reviewVisit}
        model={model}
        generating={generating}
        sending={!!sendingId && sendingId === reviewVisit?.id}
        approving={approving}
        confirmingOccupancy={confirmingOccupancy}
        occupancyIssue={!!reviewVisit && ctxFor(reviewVisit).property.service_scope === SHORT_TERM_RENTAL_VILLA && reviewVisit.occupancy_confirmed_vacant !== true}
        propertyMissing={!!reviewVisit && !ctxFor(reviewVisit).property.id}
        photoWarn={photoWarn}
        error={error}
        reviewState={reviewVisit ? reviewStateFor(reviewVisit, ctxFor(reviewVisit)) : null}
        onClose={() => setReviewVisit(null)}
        onSend={() => reviewVisit && doSend(reviewVisit, false)}
        onApprove={approveReview}
        onConfirmOccupancy={confirmOccupancyForReport}
        onFixOwnerDetails={() => {
          const client = reviewVisit ? clientFor(reviewVisit.property_id) : null;
          if (!reviewVisit) return;
          const returnTo = `/reports?open=${encodeURIComponent(reviewVisit.id)}`;
          if (client?.id) navigate(`/clients?edit=${encodeURIComponent(client.id)}&focus=email&returnTo=${encodeURIComponent(returnTo)}`);
          else if (propFor(reviewVisit.property_id)?.id) fixPropertyForVisit(reviewVisit, "owner_id", returnTo);
          else openPropertyLink(reviewVisit);
        }}
        onFixProperty={() => {
          if (!reviewVisit) return;
          const returnTo = `/reports?open=${encodeURIComponent(reviewVisit.id)}`;
          fixPropertyForVisit(reviewVisit, "service_scope", returnTo);
        }}
        onRetry={() => reviewVisit && openReview(reviewVisit)}
        onBackToEdit={() => setReviewVisit(null)}
      />

      <Dialog open={!!deleteConfirmFor} onOpenChange={(open) => { if (!open && !deletingId) setDeleteConfirmFor(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Delete report?")}</DialogTitle>
          </DialogHeader>
          {deleteConfirmFor && (
            <p className="text-sm text-muted-foreground">
              {t("Delete the {property} report from {date}? This removes it from the Reports list and clears its saved PDF link and delivery details. The completed visit stays in Visits. Copies already emailed or downloaded cannot be recalled.", {
                property: propFor(deleteConfirmFor.property_id).name || t("Property"),
                date: tDate(deleteConfirmFor.start_time, lang),
              })}
            </p>
          )}
          <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:space-x-0">
            <Button variant="outline" disabled={!!deletingId} onClick={() => setDeleteConfirmFor(null)} className="w-full">{t("Cancel")}</Button>
            <Button variant="destructive" disabled={!deleteConfirmFor || !!deletingId} onClick={deleteReport} className="w-full">
              {deletingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deletingId ? t("Deleting…") : t("Delete Report")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!propertyLinkVisit} onOpenChange={(open) => { if (!open && !linkingProperty) setPropertyLinkVisit(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-x-hidden overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Choose the property and owner")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("Select the existing property this visit belongs to. Its linked owner will be used for report delivery. If the property is not listed, close this window and use Create and link property in the report review.")}</p>
            <Select value={propertyLinkId} onValueChange={(value) => { setPropertyLinkId(value); setPropertyLinkError(""); }}>
              <SelectTrigger className="w-full min-w-0 max-w-full"><SelectValue placeholder={t("Select a property")} /></SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-3rem)]">
                {properties.filter((property) => !property.archived).map((property) => {
                  const owner = clients.find((client) => client.id === property.owner_id);
                  return <SelectItem key={property.id} value={property.id}>{property.name || t("Unnamed property")} · {owner?.name || t("No owner linked")}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            {propertyLinkId && (() => {
              const property = properties.find((item) => item.id === propertyLinkId);
              const scopeError = property && propertyScopeError(property, propertyLinkVisit?.visit_type, propertyLinkVisit?.status, propertyLinkVisit?.exterior_only === true);
              const owner = clients.find((client) => client.id === property?.owner_id);
              return (
                <div className={`rounded-xl border p-3 text-sm ${scopeError ? "border-amber-500/40 bg-amber-500/5 text-amber-700" : "border-border bg-muted/40"}`}>
                  <p><strong>{t("Owner:")}</strong> {owner?.name || t("No owner linked")}</p>
                  <p><strong>{t("Email:")}</strong> {owner?.email || t("No email on file")}</p>
                  <p><strong>{t("Service Scope:")}</strong> {t(property?.service_scope || t("Not set"))}</p>
                  {scopeError && <p className="mt-2">{t("This visit cannot be linked to the selected property: {error}", { error: t(scopeError) })}</p>}
                </div>
              );
            })()}
            {propertyLinkError && <p role="alert" className="text-sm text-amber-700">{propertyLinkError}</p>}
          </div>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:space-x-0">
            <Button variant="ghost" onClick={() => {
              if (!propertyLinkVisit) return;
              const visit = propertyLinkVisit;
              setPropertyLinkVisit(null);
              fixPropertyForVisit(visit, "owner_id", `/reports?open=${encodeURIComponent(visit.id)}`);
            }} disabled={linkingProperty} className="w-full whitespace-normal text-center leading-snug sm:col-span-2">{t("Create new property and link visit")}</Button>
            <Button variant="outline" onClick={() => setPropertyLinkVisit(null)} disabled={linkingProperty} className="w-full">{t("Cancel")}</Button>
            <Button className="w-full whitespace-normal" onClick={linkVisitToProperty} disabled={!propertyLinkId || linkingProperty || !!propertyScopeError(properties.find((item) => item.id === propertyLinkId), propertyLinkVisit?.visit_type, propertyLinkVisit?.status, propertyLinkVisit?.exterior_only === true)}>
              {linkingProperty ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("Link property")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarkSentExternallyDialog
        open={!!markExtFor}
        onClose={() => setMarkExtFor(null)}
        onConfirm={confirmMarkExt}
      />
    </div>
  );
}
