// Professional invoice PDF — visual/technical reference: visitReport.js.
// One compact page for normal invoices. No sending, no storage: the caller
// downloads the file. Legacy invoices without line_items fall back to the
// stored `services` text and stored totals.
import jsPDF from "jspdf";
import { athensLongDate } from "@/lib/timezone";
import { round2 } from "@/lib/invoiceGeneration";

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

export async function generateInvoicePdf(invoice, ctx = {}) {
  const { business = {}, client, property } = ctx;
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxWidth = pageW - margin * 2;
  let y = 20;
  const text = (s, x, yy) => doc.text(clean(s), x, yy);

  // --- Header: logo + business name + contact ---
  let nameX = margin;
  if (business.logo) {
    try {
      const logo = await getLogo(business.logo);
      const r = logo.w / logo.h;
      let dh = 9, dw = dh * r;
      if (dw > 24) { dw = 24; dh = dw / r; }
      doc.addImage(logo.dataUrl, "JPEG", margin, y - 2 - dh / 2, dw, dh);
      nameX = margin + dw + 4;
    } catch (e) { /* no logo — text-only header */ }
  }
  doc.setFontSize(14); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text(business.business_name || "Property Care", nameX, y); y += 5;
  doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(110);
  const contact = [business.phone, business.email, business.address].filter(Boolean).join("   \u00B7   ");
  if (contact) { text(contact.replace(/\u00B7/g, "-"), margin, y); y += 4; }
  doc.setDrawColor(210); doc.line(margin, y, pageW - margin, y); y += 9;
  doc.setTextColor(0);

  // --- Invoice title + key facts ---
  doc.setFontSize(16); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text("INVOICE", margin, y); y += 7;
  doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(60);
  const facts = [
    ["Invoice No", invoice.invoice_number || "-"],
    ["Invoice Date", invoice.invoice_date ? athensLongDate(invoice.invoice_date) : "-"],
    ["Due Date", invoice.due_date ? athensLongDate(invoice.due_date) : "-"],
  ];
  const kvW = maxWidth / 2;
  facts.forEach(([k, v], i) => {
    const x = margin + (i % 2) * kvW;
    const yy = y + Math.floor(i / 2) * 5;
    doc.setFont(undefined, "bold"); doc.setTextColor(110);
    text(`${k}:`, x, yy);
    doc.setFont(undefined, "normal"); doc.setTextColor(30);
    text(v, x + 30, yy);
  });
  y += Math.ceil(facts.length / 2) * 5 + 5;
  doc.setTextColor(0);

  // --- Bill To ---
  doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(120);
  text("BILL TO", margin, y); y += 5;
  doc.setFontSize(11); doc.setTextColor(20);
  text(nameOf(client) || "-", margin, y); y += 5;
  doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(80);
  if (!nameOf(client) && client?.billing_address) { text(client.billing_address, margin, y); y += 5; }
  if (typeof client === "object" && client?.billing_address) { text(client.billing_address, margin, y); y += 5; }
  if (nameOf(property)) { text(`Property: ${nameOf(property)}`, margin, y); y += 5; }
  y += 4;

  // --- Line items ---
  const hasItems = Array.isArray(invoice.line_items) && invoice.line_items.length > 0;
  const items = hasItems
    ? invoice.line_items
    : String(invoice.services || "").split("\n").filter(Boolean).map((s) => ({ description: s, amount: null }));

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, maxWidth, 7, 1, 1, "F");
  doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(60);
  text("Description", margin + 3, y + 4.8);
  text("Amount", pageW - margin - 22, y + 4.8);
  y += 10;
  doc.setFont(undefined, "normal"); doc.setTextColor(30);

  for (const it of items) {
    const lines = doc.splitTextToSize(clean(it.description || ""), maxWidth - 28);
    for (let li = 0; li < lines.length; li++) {
      text(lines[li], margin + 3, y);
      if (li === 0 && it.amount != null) text(eur(it.amount), pageW - margin - 22, y);
      y += 5;
    }
    doc.setDrawColor(235); doc.line(margin, y - 3, pageW - margin, y - 3);
  }
  y += 4;

  // --- Totals ---
  const subtotal = hasItems ? round2(invoice.line_items.reduce((s, it) => s + (it.amount || 0), 0)) : null;
  const vat = Number(invoice.vat) || 0;
  const total = Number(invoice.total) || 0;
  const rate = subtotal ? Math.round((vat / subtotal) * 100) : 24;
  const rightCol = pageW - margin - 70;
  const totRow = (label, value, bold = false) => {
    doc.setFontSize(9.5);
    doc.setFont(undefined, bold ? "bold" : "normal");
    doc.setTextColor(bold ? 15 : 80);
    text(label, rightCol, y);
    doc.setFont(undefined, bold ? "bold" : "normal");
    doc.setTextColor(bold ? 15 : 30);
    text(eur(value), pageW - margin - 3, y, { align: "right" });
    y += bold ? 6 : 5;
  };
  if (subtotal != null) totRow("Subtotal", subtotal);
  totRow(`VAT ${rate}%`, vat);
  doc.setDrawColor(180); doc.line(rightCol, y - 3, pageW - margin, y - 3); y += 2;
  doc.setFontSize(11);
  totRow("TOTAL DUE", total, true);
  doc.setTextColor(0);
  y += 3;

  // --- Notes ---
  if (invoice.notes) {
    doc.setFontSize(9); doc.setFont(undefined, "bold"); doc.setTextColor(110);
    text("Notes", margin, y); y += 5;
    doc.setFont(undefined, "normal"); doc.setTextColor(60);
    doc.splitTextToSize(clean(invoice.notes), maxWidth).forEach((l) => { text(l, margin, y); y += 4.5; });
  }

  // --- Footer ---
  doc.setDrawColor(210); doc.line(margin, pageH - 18, pageW - margin, pageH - 18);
  doc.setFontSize(8); doc.setTextColor(150);
  text(`Generated ${athensLongDate(new Date().toISOString())}`, margin, pageH - 12);
  doc.setTextColor(0);

  doc.save(`${invoice.invoice_number || "invoice"}.pdf`);
}