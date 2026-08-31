// SERVER-SIDE signed-agreement PDF builder. Renders ONLY from the immutable
// sent_snapshot + stored signing evidence. Never re-joins live Client /
// Property / ServicePackage / BusinessSettings / AgreementTermsTemplate.
//
// Imported by the agreementPublic backend function (base44/functions/...).
// The jsPDF dependency is loaded dynamically inside generateSignedAgreementPdf
// so a load failure only affects PDF generation, not the whole module (and not
// the sign transaction's other paths).
import { SECRET_FIELDS } from './agreementTerms.js';

function val(s) {
  return s === undefined || s === null ? "" : String(s);
}
function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch (e) {
    return String(iso);
  }
}
function abbr(h, n = 12) {
  return h ? String(h).slice(0, n) : "";
}

/**
 * Defensive secret scan over the serialized payload. The frozen snapshot is
 * built secret-free, so this is a defense-in-depth guard against a future
 * leak of any known access-secret field key. Returns [] when clean.
 * @param {object} payload
 * @returns {string[]}
 */
export function scanForSecrets(payload) {
  const text = JSON.stringify(payload || {});
  return SECRET_FIELDS.filter((k) => text.includes(`"${k}"`));
}

/**
 * Build the signed-agreement PDF from the frozen snapshot + evidence.
 * @param {object} snapshot - the immutable sent_snapshot
 * @param {object} evidence - { signer_name, signer_email, signed_at, agreement_version,
 *   terms_version, consent_text, signature_data_url, signature_hash, snapshot_hash,
 *   signer_ip, signer_user_agent }
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function generateSignedAgreementPdf(snapshot, evidence) {
  const { default: jsPDF } = await import('npm:jspdf@4.2.1');
  const ev = evidence || {};
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  // Fail-fast: decode/validate the signature image BEFORE building the doc.
  // If the prepared bytes are not a decodable PNG, throw now — the caller
  // aborts and NO signed PDF is persisted (no fallback placeholder).
  const sigProps = ev.signature_data_url ? doc.getImageProperties(ev.signature_data_url) : null;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageW - margin * 2;
  let y = 48;
  const ensure = (need) => {
    if (y + need > pageH - 44) { doc.addPage(); y = 48; }
  };

  const biz = (snapshot && snapshot.business_identity) || {};
  const customer = (snapshot && snapshot.customer) || {};
  const property = (snapshot && snapshot.property) || {};
  const service = (snapshot && snapshot.service) || {};
  const fees = (snapshot && snapshot.fees) || {};
  const schedule = (snapshot && snapshot.schedule) || {};
  const emergency = (snapshot && snapshot.emergency_authorization) || {};
  const sections = Array.isArray(snapshot && snapshot.sections) ? snapshot.sections : [];

  // --- Header / business identity ---
  doc.setFontSize(16); doc.setFont(undefined, "bold");
  doc.text(val(biz.name) || "Service Provider", margin, y); y += 16;
  doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(110);
  const bizContact = [biz.phone, biz.whatsapp, biz.email].filter(Boolean).join("   ·   ");
  if (bizContact) { doc.text(bizContact, margin, y); y += 11; }
  if (biz.address) { doc.splitTextToSize(val(biz.address), maxWidth).forEach((l) => { doc.text(l, margin, y); y += 11; }); }
  if (biz.owner_name) { doc.text(`Owner: ${val(biz.owner_name)}`, margin, y); y += 11; }
  doc.setTextColor(0); y += 6;

  // --- Title + versions ---
  doc.setFontSize(15); doc.setFont(undefined, "bold");
  doc.text("Service Agreement", margin, y); y += 16;
  doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(90);
  doc.text(
    `Agreement Version ${val(snapshot.agreement_version)}   ·   Terms Version ${val(snapshot.terms_version)}   ·   ${val(snapshot.language) || "English"}`,
    margin, y
  );
  y += 11; doc.setTextColor(0);
  doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 14;

  // --- Summary block ---
  const kv = (label, value) => {
    if (!value) return;
    ensure(12);
    doc.setFont(undefined, "bold"); doc.text(`${label}:`, margin, y);
    doc.setFont(undefined, "normal");
    const lines = doc.splitTextToSize(value, maxWidth - 120);
    lines.forEach((l, i) => { if (i > 0) ensure(12); doc.text(l, margin + 120, y); y += 12; });
  };
  doc.setFontSize(10);
  kv("Customer", val(customer.full_name) + (customer.email ? `   ·   ${val(customer.email)}` : ""));
  kv("Property", [val(property.name), val(property.address)].filter(Boolean).join("   ·   "));
  kv("Service", val(service.package_name));
  if (service.description) kv("Description", val(service.description));
  if (service.included_services) kv("Included services", val(service.included_services));
  kv("Visit frequency", val(service.inspection_frequency));
  if (service.visit_duration) kv("Visit duration", val(service.visit_duration));
  kv("Agreed price", fees.agreed_price ? `€${val(fees.agreed_price)}` : "—");
  kv("Billing", val(fees.billing_frequency));
  kv("VAT", val(fees.vat_wording));
  if (fees.hourly_charge) kv("Hourly charge", val(fees.hourly_charge));
  if (fees.travel_charge) kv("Travel charge", val(fees.travel_charge));
  if (fees.emergency_surcharge) kv("Emergency surcharge", val(fees.emergency_surcharge));
  kv("Start date", val(schedule.start_date) || "—");
  kv("Renewal date", val(schedule.renewal_date) || "—");
  if (schedule.next_invoice_date) kv("Next invoice", val(schedule.next_invoice_date));
  y += 6;

  // --- Emergency authorization (confirmed) ---
  if (emergency.text) {
    ensure(20);
    doc.setFont(undefined, "bold"); doc.text("Emergency Authorization", margin, y); y += 14; doc.setFont(undefined, "normal");
    doc.splitTextToSize(val(emergency.text), maxWidth).forEach((l) => { ensure(12); doc.text(l, margin, y); y += 12; });
    if (emergency.max_amount) { ensure(12); doc.text(`Pre-approved spending limit: ${val(emergency.max_amount)}`, margin, y); y += 12; }
    if (emergency.unreachable_instructions) {
      ensure(12);
      doc.splitTextToSize(`If the owner is unreachable: ${val(emergency.unreachable_instructions)}`, maxWidth).forEach((l) => { doc.text(l, margin, y); y += 12; });
    }
    y += 6;
  }

  // --- All frozen sections ---
  sections.forEach((s, i) => {
    ensure(20);
    doc.setFont(undefined, "bold"); doc.text(`${i + 1}. ${val(s.heading)}`, margin, y); y += 14; doc.setFont(undefined, "normal");
    (s.paragraphs || []).forEach((p) => {
      doc.splitTextToSize(val(p), maxWidth).forEach((l) => { ensure(12); doc.text(l, margin, y); y += 12; });
    });
    y += 4;
  });

  // --- Additional terms ---
  if (snapshot.additional_terms) {
    ensure(20);
    doc.setFont(undefined, "bold"); doc.text("Additional Terms", margin, y); y += 14; doc.setFont(undefined, "normal");
    doc.splitTextToSize(val(snapshot.additional_terms), maxWidth).forEach((l) => { ensure(12); doc.text(l, margin, y); y += 12; });
    y += 6;
  }

  // --- Signature / evidence section ---
  ensure(24);
  doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 16;
  doc.setFontSize(12); doc.setFont(undefined, "bold");
  doc.text("SIGNED ELECTRONICALLY", margin, y); y += 16;
  doc.setFontSize(10); doc.setFont(undefined, "normal");
  kv("Signer", val(ev.signer_name));
  kv("Signer email", val(ev.signer_email));
  kv("Signed", fmtDate(ev.signed_at));
  kv("Agreement Version", val(ev.agreement_version));
  kv("Terms Version", val(ev.terms_version));
  y += 4;

  // Consent (EXACT stored text accepted by the signer)
  ensure(16);
  doc.setFont(undefined, "bold"); doc.text("Consent:", margin, y); y += 12; doc.setFont(undefined, "normal");
  doc.splitTextToSize(val(ev.consent_text), maxWidth).forEach((l) => { ensure(12); doc.text(l, margin, y); y += 12; });
  y += 8;

  // Stored signature image — the EXACT prepared bytes that correspond to
  // signature_hash. Decode + embed with NO fallback: if the image cannot be
  // decoded or embedded, this throws and the caller aborts the entire PDF
  // (no signed document is persisted, no placeholder is rendered).
  if (sigProps) {
    const imgW = Math.min(180, sigProps.width);
    const imgH = (imgW * sigProps.height) / sigProps.width;
    ensure(imgH + 16);
    doc.addImage(ev.signature_data_url, "PNG", margin, y, imgW, imgH);
    y += imgH + 8;
  }
  y += 6;

  // --- Technical evidence (small; hashes abbreviated) ---
  ensure(20);
  doc.setFontSize(8); doc.setTextColor(130);
  const tech = [
    `Snapshot ref: ${abbr(ev.snapshot_hash)}`,
    `Signature ref: ${abbr(ev.signature_hash)}`,
  ];
  if (ev.signer_ip) tech.push(`Signer IP: ${val(ev.signer_ip)}`);
  if (ev.signer_user_agent) tech.push(`Recorded request user-agent: ${val(ev.signer_user_agent)}`);
  tech.forEach((l) => {
    doc.splitTextToSize(l, maxWidth).forEach((ln) => { ensure(10); doc.text(ln, margin, y); y += 10; });
  });
  doc.setTextColor(0); doc.setFontSize(10);

  // --- Footer on every page ---
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text("This document is a copy of the signed agreement. The canonical legal record is held by the service provider.", margin, pageH - 24);
    doc.text(`Page ${p} of ${pages}`, pageW - margin - 60, pageH - 24);
    doc.setTextColor(0);
  }

  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}