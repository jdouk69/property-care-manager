import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { athensLongDate } from "@/lib/timezone";

function fmtDay(iso) {
  return athensLongDate(iso);
}

/**
 * Send the customer-facing visit report to the owner by email.
 *
 * NOTE on delivery: the SendEmail integration always reaches registered app
 * users, but reaching an address that is NOT a registered app user requires a
 * paid plan + a connected custom domain and is subject to content/recipient
 * screening. We do NOT fake success — if the integration throws, we return
 * { ok: false, error } so the caller marks the report "Delivery Failed" and
 * offers a manual download/share instead.
 *
 * opts: { visit, property, client, business, pdfUrl, result, sentBy }
 */
export async function sendOwnerReportEmail(opts) {
  const { visit, property = {}, client = {}, business = {}, pdfUrl = "", result = "", sentBy = "" } = opts;
  const { base44 } = await import("@/api/base44Client");
  const to = client.email;
  if (!to) return { ok: false, error: "No email address on the client record." };

  const dateStr = fmtDay(visit?.start_time);
  const subject = `Property Care Visit Report — ${property.name || "Property"} — ${dateStr}`;
  const lines = [];
  lines.push(`Hello ${client.name || "Owner"},`);
  lines.push("");
  lines.push(`Here is the visit report for ${property.name || "your property"} on ${dateStr}.`);
  lines.push("");
  lines.push(`Visit type: ${visitTypeLabel(visit?.visit_type) || "—"}`);
  if (result) lines.push(`Overall result: ${result}`);
  lines.push("");
  lines.push("Summary & Recommendations:");
  lines.push(visit?.summary || "No summary provided.");
  lines.push("");
  if (pdfUrl) {
    lines.push("View the full report (PDF):");
    lines.push(pdfUrl);
    lines.push("");
  }
  lines.push("Kind regards,");
  lines.push(business.business_name || "Property Care");
  if (sentBy) lines.push(`Sent by ${sentBy}`);
  const body = lines.join("\n");

  try {
    await base44.integrations.Core.SendEmail({ to, subject, body, from_name: business.business_name || "Property Care" });
    return { ok: true, to, subject };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}