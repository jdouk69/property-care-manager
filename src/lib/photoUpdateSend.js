import { visitTypeLabelFor } from "@/lib/visitTypeLabels";
import { athensLongDate } from "@/lib/timezone";
import { reportLangFromClient } from "@/lib/reportLabels";

function extFrom(uri) {
  try {
    const m = String(uri).split("?")[0].match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : "jpg";
  } catch {
    return "jpg";
  }
}

/**
 * Send the Complete Care follow-up photo update to the owner by email.
 *
 * A lightweight companion to the full visit-report email: 1–3 photos the
 * staff member explicitly selected, an optional short note, and the visit
 * date — in the CLIENT's preferred language (EN/EL). Photos travel as
 * ATTACHMENTS of files this app uploaded; the owner is never sent a permanent
 * public URL (same rule as the report PDF).
 *
 * opts: { visit, property, client, business, photos: [uri], note, sentBy }
 * Returns { ok, to, subject } or { ok: false, error } — never fakes success.
 */
export async function sendOwnerPhotoUpdateEmail(opts) {
  const { visit, property = {}, client = {}, business = {}, photos = [], note = "", sentBy = "" } = opts;
  const { base44 } = await import("@/api/base44Client");
  const to = client.email;
  if (!to) return { ok: false, error: "No email address on the client record." };
  if (!photos.length) return { ok: false, error: "No photos selected." };

  const el = reportLangFromClient(client) === "el";
  const dateStr = athensLongDate(visit?.start_time, el ? "el" : "en");
  const prop = property?.name || (el ? "το ακίνητό σας" : "your property");

  const subject = el
    ? `Φωτογραφική Ενημέρωση — ${prop} — ${dateStr}`
    : `Photo Update — ${prop} — ${dateStr}`;

  const lines = [];
  lines.push(el ? `Γεια σας ${client.name || ""},` : `Hello ${client.name || "there"},`);
  lines.push("");
  lines.push(
    el
      ? `Πραγματοποιήσαμε τη σύντομη συμπληρωματική επίσκεψη στο ${prop} (${dateStr}). Σας αποστέλλουμε συνημμένες τις φωτογραφίες που τραβήχτηκαν κατά την επίσκεψη.`
      : `We completed the brief follow-up visit at ${prop} (${dateStr}). Attached are the photos taken during this visit.`
  );
  lines.push("");
  lines.push(`${el ? "Ημερομηνία επίσκεψης" : "Visit date"}: ${dateStr}`);
  lines.push(`${el ? "Τύπος επίσκεψης" : "Visit type"}: ${visitTypeLabelFor(visit?.visit_type, el ? "el" : "en") || "—"}`);
  if (String(note || "").trim()) {
    lines.push("");
    lines.push(String(note).trim());
  }
  lines.push("");
  lines.push(el ? "Με εκτίμηση," : "Kind regards,");
  lines.push(business.business_name || "Property Care Crete");
  if (sentBy) lines.push(el ? `Απεστάλη από ${sentBy}` : `Sent by ${sentBy}`);
  const body = lines.join("\n");

  const attachments = photos.map((uri, i) => ({
    filename: `photo-${i + 1}.${extFrom(uri)}`,
    file_url: uri,
  }));

  try {
    await base44.integrations.Core.SendEmail({
      to,
      subject,
      text: body,
      from_name: business.business_name || "Property Care Crete",
      attachments,
    });
    return { ok: true, to, subject };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}