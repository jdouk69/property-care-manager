// Shared owner-report delivery pipeline (review → approve → send). Used by
// BOTH the Visit Detail ReportDeliveryCard and the Reports delivery queue so
// the preview, the downloadable PDF and the emailed PDF always come from ONE
// data model and one lifecycle:
//
//   1. Review (read-only): buildOwnerReportModel from the CURRENT data — never
//      writes anything. Internal notes and private (owner_visible=false)
//      detail are never part of the model.
//   2. Approve & Save PDF (explicit): generates the PDF from the current data,
//      stores it PRIVATELY (no permanent public URL), and stamps
//      report_content_hash + reviewer. Status → "Ready to Send".
//   3. Send: requires an approved PDF whose fingerprint still matches the
//      current data. Any data change (visit, checklist, property, client,
//      business, linked issues/tasks) or a report-template change invalidates
//      the approval — staff must approve again before delivery.

import { base44 } from "@/api/base44Client";
import { buildOwnerReportModel, generateAndStoreReportPdf, reportContentFingerprint } from "@/lib/visitReport";
import { sendOwnerReportEmail } from "@/lib/visitReportSend";

/**
 * Approval state of a visit's report against the current data.
 * approved: a PDF has been approved and stored.
 * hashMatches: that PDF's fingerprint still matches the current data
 * (requires a stored fingerprint — legacy PDFs count as NOT approved, since
 * they were never reviewed under the current pipeline).
 */
export function reviewStateFor(visit, ctx = {}) {
  const approved = !!visit?.report_pdf_url;
  const hashMatches =
    approved && !!visit.report_content_hash
      ? visit.report_content_hash === reportContentFingerprint(visit, ctx)
      : false;
  return {
    approved,
    hashMatches,
    reviewedAt: visit?.report_reviewed_at || "",
    reviewedBy: visit?.report_reviewed_by || "",
  };
}

/**
 * Approve the report: generate the PDF from the current data, store it
 * PRIVATELY and stamp the review metadata. Returns the updated visit, the
 * freshly built model (what the owner will receive) and the count of photos
 * that could not be included (if any).
 */
export async function approveReport(visit, ctx, userName) {
  const { file_uri, blob, photoFailures } = await generateAndStoreReportPdf(visit, ctx);
  const reviewedAt = new Date().toISOString();
  const patch = {
    report_pdf_url: file_uri,
    report_status: "Ready to Send",
    report_content_hash: reportContentFingerprint(visit, ctx),
    report_reviewed_at: reviewedAt,
    report_reviewed_by: userName || "",
  };
  await base44.entities.PropertyVisit.update(visit.id, patch);
  const updated = { ...visit, ...patch };
  return {
    updated,
    model: buildOwnerReportModel(updated, ctx),
    photoFailures: photoFailures || 0,
    blob,
  };
}

/**
 * Email the approved report to the owner, attaching the stored PDF. Never
 * exposes a permanent public URL.
 */
export async function dispatchReportEmail({ visit, property, client, business, result, sentBy }) {
  const slug = (property?.name || "property").replace(/\s+/g, "-").toLowerCase();
  const attachment = visit?.report_pdf_url
    ? { filename: `visit-report-${slug}.pdf`, file_url: visit.report_pdf_url }
    : null;
  return sendOwnerReportEmail({ visit, property, client, business, result, sentBy, pdfAttachment: attachment });
}

/** Actionable, localized error text for report generation failures. */
export function reportGenerationError(e, t) {
  if (e?.code === "font_load_failed") {
    return t("The report fonts could not be loaded — the report was not generated. Check the connection and try again.");
  }
  if (e?.code === "quick_check_excluded") {
    return t("Quick Check visits do not include a customer-facing visit report.");
  }
  return t("Could not generate report: {message}", { message: e?.message || e });
}