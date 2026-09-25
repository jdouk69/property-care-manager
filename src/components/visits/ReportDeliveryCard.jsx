import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Send, Download, Loader2, CheckCircle2, AlertTriangle, Save, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReportReviewModal from "@/components/visits/ReportReviewModal";
import { buildOwnerReportModel, generateAndStoreReportPdf, generateVisitReportPdf } from "@/lib/visitReport";
import { sendOwnerReportEmail } from "@/lib/visitReportSend";
import { athensMediumDateTime } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const STATUS_TONE = {
  Draft: "bg-muted text-muted-foreground border-border",
  "Ready to Send": "bg-sky-500/10 text-sky-600 border-sky-500/20",
  Sent: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Delivery Failed": "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

/**
 * Reusable owner-report delivery workflow: Review → Send to Owner → Save.
 * Shared by the Visit Wizard completion screen (variant="done") and the
 * Visit Detail page (variant="detail") so there is one delivery path.
 *
 * props: { visit, property, client, issues, tasks, business, nextVisit?,
 *          onUpdate(updatedVisit), onBackToEdit, variant, onDone }
 */
export default function ReportDeliveryCard({ visit, property, client, issues, tasks, business, nextVisit, onUpdate, onBackToEdit, variant = "detail", onDone }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [model, setModel] = useState(null);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    base44.auth.me().then((u) => setUserName(u?.full_name || u?.email || "")).catch(() => {});
  }, []);

  if (!visit) return null;
  const status = visit.report_status || (visit.report_sent ? "Sent" : "Draft");
  const ctx = { business, property, client, issues, tasks, nextVisit };

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

  const openReview = async () => {
    setError("");
    setReviewOpen(true);
    if (!model) {
      setGenerating(true);
      try {
        const m = buildOwnerReportModel(visit, ctx);
        setModel(m);
        // Persist a report artifact so the owner can be linked to it.
        if (!visit.report_pdf_url || visit.report_status === "Draft") {
          const { file_url } = await generateAndStoreReportPdf(visit, ctx);
          await patch({ report_pdf_url: file_url, report_status: "Ready to Send" });
          setModel(buildOwnerReportModel({ ...visit, report_pdf_url: file_url }, ctx));
        }
      } catch (e) {
        setError(t("Could not generate report: {message}", { message: e?.message || e }));
      }
      setGenerating(false);
    }
  };

  const doSend = async (isResend) => {
    setError("");
    if (status !== "Ready to Send" && !visit.report_pdf_url) {
      // Require the report to be generated/reviewed first.
      openReview();
      return;
    }
    if (isResend && !window.confirm(t("Resend this report to the owner?"))) return;
    setSending(true);
    try {
      const res = await sendOwnerReportEmail({
        visit, property, client, business,
        pdfUrl: visit.report_pdf_url || "",
        result: model?.result || "",
        sentBy: userName,
      });
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
    try { await generateVisitReportPdf(visit, ctx); } catch (e) { setError(t("Could not generate PDF: {message}", { message: e?.message || e })); }
    setDownloading(false);
  };

  const sent = status === "Sent";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{t("Owner Report Delivery")}</p>
          <p className="text-xs text-muted-foreground">{t("Review the customer report before sending to the owner.")}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_TONE[status] || STATUS_TONE.Draft}`}>{t(status)}</span>
      </div>

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
          <Button onClick={() => doSend(true)} disabled={sending} variant="outline" className="rounded-xl gap-1.5">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />} {t("Resend Report")}
          </Button>
        ) : (
          <Button onClick={() => doSend(false)} disabled={sending} className="rounded-xl gap-1.5">
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
        canSend={status === "Ready to Send" || !!visit.report_pdf_url}
        onClose={() => setReviewOpen(false)}
        onSend={() => doSend(false)}
        onBackToEdit={() => { setReviewOpen(false); onBackToEdit && onBackToEdit(); }}
      />
    </div>
  );
}