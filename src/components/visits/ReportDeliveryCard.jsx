import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  FileText, Send, Download, Loader2, CheckCircle2, AlertTriangle, Save, RotateCw, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReportReviewModal from "@/components/visits/ReportReviewModal";
import { buildOwnerReportModel, generateVisitReportPdf } from "@/lib/visitReport";
import { approveReport, dispatchReportEmail, reviewStateFor, reportGenerationError } from "@/lib/reportDelivery";
import { isQuickCheckVisit } from "@/lib/visitTypeLabels";
import { athensMediumDateTime } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const STATUS_TONE = {
  Draft: "bg-muted text-muted-foreground border-border",
  "Ready to Send": "bg-sky-500/10 text-sky-600 border-sky-500/20",
  Sent: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Delivery Failed": "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

/**
 * Reusable owner-report delivery workflow: Review (read-only) → Approve & Save
 * PDF → Send to Owner. Shared by the Visit Wizard completion screen
 * (variant="done") and the Visit Detail page (variant="detail") so there is
 * one delivery path. The approval gate lives in reportDelivery.js: sending
 * requires an approved PDF whose content fingerprint still matches the current
 * data — any change forces re-approval before delivery.
 *
 * Quick Check visits do not include routine photos or a customer-facing visit
 * report — they show an explanatory note instead of delivery actions.
 *
 * props: { visit, property, client, issues, tasks, business, nextVisit?,
 *          onUpdate(updatedVisit), onBackToEdit, variant, onDone }
 */
export default function ReportDeliveryCard({ visit, property, client, issues, tasks, business, nextVisit, onUpdate, onBackToEdit, variant = "detail", onDone }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [model, setModel] = useState(null);
  const [photoWarn, setPhotoWarn] = useState(0);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    base44.auth.me().then((u) => setUserName(u?.full_name || u?.email || "")).catch(() => {});
  }, []);

  if (!visit) return null;
  const status = visit.report_status || (visit.report_sent ? "Sent" : "Draft");
  const ctx = { business, property, client, issues, tasks, nextVisit };
  const quickCheck = isQuickCheckVisit(visit);
  const reviewState = quickCheck ? null : reviewStateFor(visit, ctx);
  const sent = status === "Sent";

  const patch = async (patchObj) => {
    try {
      await base44.entities.PropertyVisit.update(visit.id, patchObj);
      const updated = { ...visit, ...patchObj };
      onUpdate && onUpdate(updated);
      return updated;
    } catch (e) {
      setError(t("Could not save report status: {message}", { message: e?.message || e }));
      return visit;
    }
  };

  // Opening the review modal is READ-ONLY: it builds the model from the
  // current data and never writes or sends anything. Approval is explicit.
  const openReview = async () => {
    setError("");
    setReviewOpen(true);
    setGenerating(true);
    try {
      setModel(buildOwnerReportModel(visit, ctx));
    } catch (e) {
      setError(reportGenerationError(e, t));
      setReviewOpen(false);
    }
    setGenerating(false);
  };

  const approve = async () => {
    setError("");
    setPhotoWarn(0);
    setApproving(true);
    try {
      const { updated, model: m, photoFailures } = await approveReport(visit, ctx, userName);
      onUpdate && onUpdate(updated);
      setModel(m);
      setPhotoWarn(photoFailures);
    } catch (e) {
      setError(reportGenerationError(e, t));
    }
    setApproving(false);
  };

  const doSend = async (isResend) => {
    setError("");
    if (!reviewState.approved || !reviewState.hashMatches) {
      // Require the report to be approved (and still current) first.
      openReview();
      return;
    }
    if (isResend && !window.confirm(t("Resend this report to the owner?"))) return;
    setSending(true);
    try {
      const res = await dispatchReportEmail({ visit, ctx, sentBy: userName });
      if (res.ok) {
        await patch({
          report_status: "Sent",
          report_sent: true,
          report_sent_at: new Date().toISOString(),
          report_sent_to: res.to,
          report_sent_by: userName,
          report_delivery_method: "Email",
        });
        setReviewOpen(false);
      } else {
        await patch({ report_status: "Delivery Failed" });
        setError(t("Email delivery failed: {message}. You can still download/share the report manually below.", { message: res.error || "unknown error" }));
      }
    } catch (e) {
      await patch({ report_status: "Delivery Failed" });
      setError(t("Email delivery failed: {message}. You can still download/share the report manually below.", { message: e?.message || e }));
    }
    setSending(false);
  };

  const download = async () => {
    setDownloading(true);
    try { await generateVisitReportPdf(visit, ctx); } catch (e) { setError(reportGenerationError(e, t)); }
    setDownloading(false);
  };

  if (quickCheck) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">{t("Owner Report Delivery")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("Quick Check visits do not include routine photos or a customer-facing visit report.")}</p>
          </div>
        </div>
      </div>
    );
  }

  const sendable = reviewState.approved && reviewState.hashMatches;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{t("Owner Report Delivery")}</p>
          <p className="text-xs text-muted-foreground">{t("Review the customer report before sending to the owner.")}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_TONE[status] || STATUS_TONE.Draft}`}>{t(status)}</span>
      </div>

      {/* Approval state — always visible, derived from the stored fingerprint. */}
      {sendable && (
        <p className="text-xs text-emerald-600">
          {t("Approved for sending")}
          {reviewState.reviewedBy ? ` · ${t("by {name}", { name: reviewState.reviewedBy })}` : ""}
          {reviewState.reviewedAt ? ` · ${athensMediumDateTime(reviewState.reviewedAt)}` : ""}
        </p>
      )}
      {reviewState.approved && !reviewState.hashMatches && (
        <p className="text-xs text-amber-600">{t("Data changed since approval — approve again before sending.")}</p>
      )}

      {/* Delivery history shows ONLY for a report that has actually been sent
          (status "Sent") — legacy/stale fields from an earlier report cycle of
          the same record must never appear on a freshly completed report. */}
      {sent && visit.report_sent_at && (
        <p className="text-xs text-muted-foreground">
          {t("Sent {date}", { date: athensMediumDateTime(visit.report_sent_at) })}
          {visit.report_sent_to ? ` · ${visit.report_sent_to}` : ""}
          {visit.report_delivery_method ? ` · ${visit.report_delivery_method}` : ""}
          {visit.report_sent_by ? ` · ${t("by {name}", { name: visit.report_sent_by })}` : ""}
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-500">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
        <Button onClick={openReview} disabled={generating} className="rounded-xl gap-1.5">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} {t("Review Report")}
        </Button>
        {sent ? (
          <Button onClick={() => doSend(true)} disabled={sending || !sendable} variant="outline" className="rounded-xl gap-1.5">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />} {t("Resend Report")}
          </Button>
        ) : (
          <Button onClick={() => doSend(false)} disabled={sending || !sendable} className="rounded-xl gap-1.5">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("Send to Owner")}
          </Button>
        )}
        <Button onClick={download} disabled={downloading} variant="outline" className="rounded-xl gap-1.5">
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {t("Download PDF")}
        </Button>
        {variant === "done" && onDone && (
          <Button onClick={onDone} variant="ghost" className="rounded-xl gap-1.5 ml-auto">
            <Save className="w-4 h-4" /> {t("Save Without Sending")}
          </Button>
        )}
      </div>

      <ReportReviewModal
        open={reviewOpen}
        model={model}
        generating={generating}
        sending={sending}
        approving={approving}
        reviewState={reviewState}
        error={error}
        photoWarn={photoWarn}
        onClose={() => setReviewOpen(false)}
        onSend={() => doSend(false)}
        onApprove={approve}
        onBackToEdit={() => { setReviewOpen(false); onBackToEdit && onBackToEdit(); }}
      />
    </div>
  );
}