// Professional invoice PDF — visual/technical reference: visitReport.js.
// One compact page for normal invoices; safe pagination for long ones.
// No sending, no storage: the caller downloads the file. Legacy invoices
// without line_items fall back to the stored `services` text and stored totals.
//
// Business identity, Greek tax details (AFM/DOY) and payment information come
// ONLY from BusinessSettings — never hard-coded. Payment details are
// customer-facing payment instructions and appear on this document only,
// never on public intake/agreement pages or visit reports. Optional fields
// print nothing when unconfigured (no blank labels).
import jsPDF from "jspdf";
import { athensLongDate } from "@/lib/timezone";
import { round2, resolveVatRate } from "@/lib/invoiceGeneration";

// --- ASCII-safe text (matches the visit-report PDF conventions) ---
const SAFE_MAP = {
  "\u00A3": "GBP", "\u00B7": "-", "\u2022": "-", "\u2013": "-", "\u2014": "-",
  "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"', "\u2026": "...",
};
const clean = (s) => {
  if (s == null) return "";
  let out = String(s);
  out = out.replace(/[\u00A3\u00B7\u2022\u2013\u2014\u2018\u2019\u201C\u201D\u2026]/g, (m) => SAFE_MAP[m] ?? "");
  return out;
};
const eur = (n) => `\u20AC${(Number(n) || 0).toFixed(2)}`;

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.crossOrigin = "anonymous";
    i.src = src;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Flatten transparent logo pixels onto white (JPEG has no alpha).
async function getLogo(url) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("fetch failed");
  const dataUrl = await blobToDataUrl(await res.blob());
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, 320 / (img.width || 320));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), w, h };
}

const nameOf = (v) => (typeof v === "string" ? v : v?.name || "");

// Customer address → normal invoice lines. Uses only stored structured client
// fields (billing_address, country) — nothing invented. A lone short numeric
// fragment stored on its own line (e.g. a postal number after the street)
// joins the previous line instead of printing as a stray "253" line; the
// country is appended as its own line when configured and not already present.
function clientAddressLines(client) {
  if (!client || typeof client !== "object") return [];
  const parts = String(client.billing_address || "")
    .split(/\r?\n/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const merged = [];
  parts.forEach((p) => {
    if (merged.length && /^\d[\d\s-]{0,5}$/.test(p)) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}, ${p}`;
    } else {
      merged.push(p);
    }
  });
  const country = String(client.country || "").trim();
  if (country && !merged.some((l) => l.toLowerCase().includes(country.toLowerCase()))) {
    merged.push(country);
  }
  return merged;
}

export async function generateInvoicePdf(invoice, ctx = {}) {
  const { business = {}, client, property } = ctx;
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxWidth = pageW - margin * 2;
  const FLOOR = 26; // keep content clear of the subtle footer
  let y = 18;
  const text = (s, x, yy) => doc.text(clean(s), x, yy);
  // Page break when the next block would reach the footer zone.
  const ensure = (needed) => {
    if (y + needed > pageH - FLOOR) { doc.addPage(); y = 20; return true; }
    return false;
  };

  // --- Header: logo + business identity + contact + tax details ---
  // Logo modestly enlarged (aspect ratio preserved, capped width) so it reads
  // clearly on the iPhone-generated PDF without overwhelming the page.
  let nameX = margin;
  let headerBottom = y;
  if (business.logo) {
    try {
      const logo = await getLogo(business.logo);
      const r = logo.w / logo.h;
      let dh = 16, dw = dh * r;
      if (dw > 46) { dw = 46; dh = dw / r; }
      doc.addImage(logo.dataUrl, "JPEG", margin, y - 4, dw, dh);
      nameX = margin + dw + 5;
      headerBottom = Math.max(headerBottom, y - 4 + dh);
    } catch (e) { /* no logo — text-only header */ }
  }
  const tradingName = String(business.business_name || "Property Care").trim();
  const legalName = String(business.legal_business_name || "").trim();
  doc.setFontSize(14); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text(tradingName, nameX, y); y += 4.5;
  if (legalName && legalName !== tradingName) {
    doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(120);
    text(legalName, nameX, y); y += 4;
  }
  doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(110);
  const contact = [business.phone, business.email, business.website].filter(Boolean).join("   \u00B7   ");
  if (contact) { text(contact, nameX, y); y += 4; }
  if (business.address) { text(business.address, nameX, y); y += 4; }
  // Greek tax details — only the configured ones; no blank labels.
  const taxParts = [];
  if (business.vat_number) taxParts.push(`AFM / VAT No: ${business.vat_number}`);
  if (business.tax_office) taxParts.push(`DOY: ${business.tax_office}`);
  if (taxParts.length) { text(taxParts.join("   \u00B7   "), nameX, y); y += 4; }
  y = Math.max(y + 2, headerBottom + 2);
  doc.setDrawColor(210); doc.line(margin, y, pageW - margin, y); y += 11;
  doc.setTextColor(0);

  // --- Invoice identity: title + key facts (existing INV numbering untouched) ---
  doc.setFontSize(16); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text("INVOICE", margin, y); y += 7.5;
  doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(60);
  const facts = [
    ["Invoice No.", invoice.invoice_number || "-"],
    ["Invoice Date", invoice.invoice_date ? athensLongDate(invoice.invoice_date) : "-"],
    ["Due Date", invoice.due_date ? athensLongDate(invoice.due_date) : "-"],
  ];
  const valueX = margin + 34;
  facts.forEach(([k, v]) => {
    doc.setFont(undefined, "bold"); doc.setTextColor(110);
    text(`${k}:`, margin, y);
    doc.setFont(undefined, "normal"); doc.setTextColor(30);
    text(v, valueX, y);
    y += 5.5;
  });
  y += 4;

  // --- Bill To ---
  const addrLines = clientAddressLines(client);
  const addrHeight = addrLines.reduce((s, l) => s + doc.splitTextToSize(clean(l), maxWidth).length * 4.3, 0);
  ensure(16 + addrHeight + (nameOf(property) ? 5 : 0));
  doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(120);
  text("BILL TO", margin, y); y += 5;
  doc.setFontSize(11); doc.setTextColor(20);
  text(nameOf(client) || "-", margin, y); y += 5.5;
  doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(80);
  addrLines.forEach((l) => {
    doc.splitTextToSize(clean(l), maxWidth).forEach((w) => { text(w, margin, y); y += 4.3; });
  });
  // Specific-property invoices identify the property; All Properties invoices
  // have no property and never attribute the first charge's property.
  if (nameOf(property)) { text(`Property: ${nameOf(property)}`, margin, y); y += 5; }
  y += 5;

  // --- Line items ---
  const hasItems = Array.isArray(invoice.line_items) && invoice.line_items.length > 0;
  const items = hasItems
    ? invoice.line_items
    : String(invoice.services || "").split("\n").filter(Boolean).map((s) => ({ description: s, amount: null }));

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, maxWidth, 7, 1, 1, "F");
    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(60);
    text("Description", margin + 3, y + 4.8);
    text("Amount", pageW - margin - 22, y + 4.8);
    y += 10;
    doc.setFont(undefined, "normal"); doc.setTextColor(30);
  };
  drawTableHeader();
  for (const it of items) {
    const lines = doc.splitTextToSize(clean(it.description || ""), maxWidth - 28);
    if (y + lines.length * 4.8 + 3 > pageH - FLOOR) { doc.addPage(); y = 20; drawTableHeader(); }
    lines.forEach((l, li) => {
      text(l, margin + 3, y);
      if (li === 0 && it.amount != null) text(eur(it.amount), pageW - margin - 22, y);
      y += 4.8;
    });
    doc.setDrawColor(235); doc.line(margin, y - 2.5, pageW - margin, y - 2.5); y += 1.5;
  }
  y += 4;

  // --- Totals (existing calculations; rate from BusinessSettings utilities) ---
  const subtotal = hasItems ? round2(invoice.line_items.reduce((s, it) => s + (it.amount || 0), 0)) : null;
  const vat = Number(invoice.vat) || 0;
  const total = Number(invoice.total) || 0;
  const rate = resolveVatRate(business);
  ensure(32);
  const rightCol = pageW - margin - 70;
  const totRow = (label, value, bold = false) => {
    doc.setFontSize(9.5);
    doc.setFont(undefined, bold ? "bold" : "normal");
    doc.setTextColor(bold ? 15 : 80);
    text(label, rightCol, y);
    doc.setFont(undefined, bold ? "bold" : "normal");
    doc.setTextColor(bold ? 15 : 30);
    text(eur(value), pageW - margin - 3, y, { align: "right" });
    y += bold ? 6.5 : 5.5;
  };
  if (subtotal != null) totRow("Subtotal", subtotal);
  totRow(`VAT ${rate}%`, vat);
  doc.setDrawColor(180); doc.line(rightCol, y - 3.5, pageW - margin, y - 3.5); y += 2.5;
  doc.setFontSize(11);
  totRow("TOTAL DUE", total, true);
  doc.setTextColor(0);
  y += 4;

  // --- Notes ---
  if (invoice.notes) {
    const noteLines = doc.splitTextToSize(clean(invoice.notes), maxWidth);
    ensure(noteLines.length * 4.5 + 14);
    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(110);
    text("Notes", margin, y); y += 5;
    doc.setFont(undefined, "normal"); doc.setTextColor(60);
    noteLines.forEach((l) => { text(l, margin, y); y += 4.5; });
    y += 2;
  }

  // --- Payment information (customer-facing instructions; only when configured) ---
  const payRows = [
    business.bank_name ? ["Bank", business.bank_name] : null,
    business.bank_beneficiary ? ["Beneficiary", business.bank_beneficiary] : null,
    business.bank_iban ? ["IBAN", business.bank_iban] : null,
    business.bank_bic ? ["BIC/SWIFT", business.bank_bic] : null,
  ].filter(Boolean);
  if (payRows.length) {
    const instrLines = business.payment_instructions ? doc.splitTextToSize(clean(business.payment_instructions), maxWidth) : [];
    ensure((payRows.length + 1) * 5 + 10 + instrLines.length * 4.3 + 6);
    y += 2;
    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(110);
    text("PAYMENT INFORMATION", margin, y); y += 6.5;
    doc.setFontSize(9);
    const payRow = (label, value) => {
      doc.setFont(undefined, "bold"); doc.setTextColor(110);
      text(`${label}:`, margin, y);
      doc.setFont(undefined, "normal"); doc.setTextColor(40);
      text(value, margin + 28, y);
      y += 5;
    };
    payRows.forEach(([l, v]) => payRow(l, v));
    // Payment reference always follows the current invoice number.
    payRow("Payment Reference", invoice.invoice_number || "-");
    if (instrLines.length) {
      doc.setFontSize(8.5); doc.setTextColor(90);
      instrLines.forEach((l) => { text(l, margin, y); y += 4.3; });
    }
    doc.setTextColor(0);
  }

  // --- Subtle footer (kept clear of totals / payment information by FLOOR) ---
  doc.setDrawColor(210); doc.line(margin, pageH - 18, pageW - margin, pageH - 18);
  doc.setFontSize(8); doc.setTextColor(150);
  text(`Generated ${athensLongDate(new Date().toISOString())}`, margin, pageH - 12);
  doc.setTextColor(0);

  doc.save(`${invoice.invoice_number || "invoice"}.pdf`);
}