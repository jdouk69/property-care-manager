import { visitTypeLabelFor } from "@/lib/visitTypeLabels";
import { athensLongDate } from "@/lib/timezone";
import { reportLangFromClient } from "@/lib/reportLabels";

function fmtDay(iso, lang) {
  return athensLongDate(iso, lang);
}

/**
 * Send the customer-facing visit report to the owner by email.
 *
 * The email follows the CLIENT's preferred language (EN/EL) — the same
 * language as the report. The PDF travels as an ATTACHMENT of a privately
 * stored file; customers are never sent a permanent public URL.
 *
 * NOTE on delivery: the SendEmail integration always reaches registered app
 * users, but reaching an address that is NOT a registered app user requires a
 * paid plan + a connected custom domain and is subject to content/recipient
 * screening. We do NOT fake success — if the integration throws, we return
 * { ok: false, error } so the caller marks the report "Delivery Failed" and
 * offers a manual download/share instead.
 *
 * opts: { visit, property, client, business, result, sentBy, pdfAttachment }
 *   pdfAttachment: { filename, file_url } | null — file_url is this app's own
 *   privately stored report PDF (storage URI or URL).
 */
export async function sendOwnerReportEmail(opts) {
  const { visit, property = {}, client = {}, business = {}, pdfAttachment = null, result = "", sentBy = "" } = opts;
  const { base44 } = await import("@/api/base44Client");
  const to = client.email;
  if (!to) return { ok: false, error: "No email address on the client record." };

  const el = reportLangFromClient(client) === "el";
  const dateStr = fmtDay(visit?.start_time, el ? "el" : "en");
  const prop = property?.name || (el ? "το ακίνητό σας" : "your property");

  const subject = el
    ? `Αναφορά Επίσκεψης — ${prop} — ${dateStr}`
    : `Visit Report — ${prop} — ${dateStr}`;

  const lines = [];
  lines.push(el ? `Γεια σας ${client.name || ""},` : `Hello ${client.name || "there"},`);
  lines.push("");
  lines.push(
    pdfAttachment
      ? el
        ? `Σας επισυνάπτουμε την αναφορά επίσκεψης για το ${prop} (${dateStr}).`
        : `Please find attached the visit report for ${prop} (${dateStr}).`
      : el
        ? `Ακολουθεί η αναφορά επίσκεψης για το ${prop} (${dateStr}).`
        : `Please find the visit report for ${prop} (${dateStr}) below.`
  );
  lines.push("");
  lines.push(`${el ? "Τύπος επίσκεψης" : "Visit type"}: ${visitTypeLabelFor(visit?.visit_type, el ? "el" : "en") || "—"}`);
  if (result) lines.push(`${el ? "Συνολικό αποτέλεσμα" : "Overall result"}: ${result}`);
  if (visit?.summary) {
    lines.push("");
    lines.push(el ? "Σύνοψη & επόμενα βήματα:" : "Summary & next steps:");
    lines.push(visit.summary);
  }
  lines.push("");
  lines.push(el ? "Με εκτίμηση," : "Kind regards,");
  lines.push(business.business_name || "Property Care Crete");
  if (sentBy) lines.push(el ? `Απεστάλη από ${sentBy}` : `Sent by ${sentBy}`);
  const body = lines.join("\n");

  try {
    await base44.integrations.Core.SendEmail({
      to,
      subject,
      body,
      from_name: business.business_name || "Property Care Crete",
      attachments: pdfAttachment ? [pdfAttachment] : undefined,
    });
    return { ok: true, to, subject };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}