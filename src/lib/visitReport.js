import jsPDF from "jspdf";
import { visitTypeLabel } from "@/lib/visitTypeLabels";

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.crossOrigin = "anonymous";
    i.src = src;
  });
}

async function fetchCompressedDataUrl(url, maxW = 900, quality = 0.6) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("fetch failed");
  const blob = await res.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxW / (img.width || maxW));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return iso; }
}
function fmtTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }); } catch (e) { return iso.slice(11, 16); }
}
function fmtDay(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" }); } catch (e) { return iso; }
}

// A checklist item's notes/photos are owner-visible ONLY when explicitly marked.
// Historical items (no owner_visible field) default to private — never shown in the report.
const isOwnerVisible = (it) => !!it && !!it.owner_visible;

/**
 * Build a structured, customer-facing report model from the raw visit + context.
 * Internal notes and non-owner-visible item notes/photos are excluded here so
 * the Review screen and the PDF render exactly what the owner will receive.
 * ctx: { business, property, client, issues, tasks, nextVisit }
 */
export function buildOwnerReportModel(visit, ctx = {}) {
  const { business = {}, property = {}, client = {}, issues = [], tasks = [], nextVisit = null } = ctx;
  const cl = visit?.checklist || [];
  const groups = [
    { key: "Emergency", label: "Emergency", tone: "text-rose-600 bg-rose-500/10 border-rose-500/20", items: cl.filter((i) => i.status === "Emergency") },
    { key: "Important", label: "Important", tone: "text-amber-600 bg-amber-500/10 border-amber-500/20", items: cl.filter((i) => i.status === "Important") },
    { key: "Normal", label: "Normal", tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", items: cl.filter((i) => i.status === "Normal") },
    { key: "Not Checked", label: "Not Checked", tone: "text-muted-foreground bg-muted border-border", items: cl.filter((i) => (i.status || "Not Checked") === "Not Checked") },
  ].map((g) => ({
    ...g,
    items: g.items.map((it) => ({
      name: it.name,
      status: it.status,
      notes: isOwnerVisible(it) ? (it.notes || "") : "",
      photos: isOwnerVisible(it) ? (it.photos || []) : [],
      owner_visible: isOwnerVisible(it),
    })),
  }));

  const flaggedCount = groups[0].items.length + groups[1].items.length;
  const result = flaggedCount === 0 ? "All clear — no items requiring attention." : `${flaggedCount} item(s) require attention.`;

  const meterReadings = (visit?.meter_readings || []).filter((m) => m.label || m.value);

  return {
    business,
    property,
    client,
    visit: {
      visit_type: visit?.visit_type,
      start_time: visit?.start_time,
      end_time: visit?.end_time,
      gps_location: visit?.gps_location,
      summary: visit?.summary || "",
    },
    visitTypeLabel: visitTypeLabel(visit?.visit_type) || "—",
    groups,
    flaggedCount,
    result,
    meterReadings,
    issues: (issues || []).map((i) => ({ title: i.title, priority: i.priority, status: i.status })),
    tasks: (tasks || []).map((t) => ({ title: t.title })),
    nextVisit,
    // Flag for the UI to confirm internal notes were excluded.
    internalNotesExcluded: true,
  };
}

/**
 * Internal: render the customer-facing PDF into a jsPDF doc (not saved).
 * Owner-visible filtering is applied: item notes/photos only when owner_visible.
 */
async function buildDoc(visit, ctx = {}) {
  const { business = {}, property = {}, client = {}, issues = [], tasks = [], nextVisit = null } = ctx;
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageW - margin * 2;
  let y = 18;
  const ensure = (need) => { if (y + need > pageH - 14) { doc.addPage(); y = 18; } };

  // Header
  doc.setFontSize(16); doc.setFont(undefined, "bold");
  doc.text(business.business_name || "Property Care", margin, y); y += 7;
  doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(110);
  const bizContact = [business.phone, business.whatsapp, business.email].filter(Boolean).join("  ·  ");
  if (bizContact) { doc.text(bizContact, margin, y); y += 5; }
  if (business.address) { doc.splitTextToSize(business.address, maxWidth).forEach((l) => { doc.text(l, margin, y); y += 4; }); }
  doc.setTextColor(0); y += 2;

  doc.setFontSize(14); doc.setFont(undefined, "bold");
  doc.text("Property Visit Report", margin, y); y += 7;
  doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 5;

  // Property & owner block
  doc.setFontSize(10); doc.setFont(undefined, "normal");
  doc.text(`Property: ${property.name || "—"}`, margin, y); y += 5;
  if (property.address) { doc.splitTextToSize(`Address: ${property.address}`, maxWidth).forEach((l) => { doc.text(l, margin, y); y += 4; }); }
  if (client.name) { doc.text(`Owner: ${client.name}`, margin, y); y += 5; }
  doc.text(`Visit type: ${visitTypeLabel(visit.visit_type) || "—"}`, margin, y); y += 5;
  doc.text(`Visit date: ${fmtDate(visit.start_time)}`, margin, y); y += 5;
  doc.text(`Arrival: ${fmtTime(visit.start_time)}    Completion: ${fmtTime(visit.end_time)}`, margin, y); y += 5;
  if (visit.gps_location) { doc.text(`GPS: ${visit.gps_location}`, margin, y); y += 5; }
  y += 3;

  // Overall result
  const cl = visit.checklist || [];
  const groups = {
    Normal: cl.filter((i) => i.status === "Normal"),
    Important: cl.filter((i) => i.status === "Important"),
    Emergency: cl.filter((i) => i.status === "Emergency"),
    "Not Checked": cl.filter((i) => i.status === "Not Checked" || !i.status),
  };
  const flaggedCount = groups.Important.length + groups.Emergency.length;
  const result = flaggedCount === 0 ? "All clear — no items requiring attention." : `${flaggedCount} item(s) require attention.`;
  doc.setFont(undefined, "bold"); doc.text("Overall result:", margin, y);
  doc.setFont(undefined, "normal"); doc.splitTextToSize(result, maxWidth - 45).forEach((l) => { doc.text(l, margin + 45, y); y += 5; });
  y += 3;

  const sectionHeader = (title) => { ensure(10); doc.setFont(undefined, "bold"); doc.text(title, margin, y); y += 5; doc.setFont(undefined, "normal"); };
  const renderGroup = (title, items, color) => {
    if (!items.length) return;
    sectionHeader(`${title} (${items.length})`);
    items.forEach((it) => {
      ensure(10);
      const bullet = color || "•";
      doc.text(`${bullet} ${it.name}`, margin + 2, y); y += 5;
      // Owner-visible notes only
      if (isOwnerVisible(it) && it.notes) {
        doc.splitTextToSize(it.notes, maxWidth - 6).forEach((l) => { ensure(5); doc.text(l, margin + 6, y); y += 4; });
      }
    });
  };

  renderGroup("Emergency", groups.Emergency, "!");
  renderGroup("Important", groups.Important, "▲");
  renderGroup("Normal", groups.Normal, "✓");
  renderGroup("Not Checked", groups["Not Checked"], "–");
  y += 3;

  // Photos (findings) — only owner-visible items
  const photoItems = [...groups.Emergency, ...groups.Important].filter((i) => isOwnerVisible(i) && i.photos && i.photos.length);
  ensure(10);
  doc.setFont(undefined, "bold"); doc.text("Photos (findings)", margin, y); y += 5; doc.setFont(undefined, "normal");
  if (!photoItems.length) {
    doc.setTextColor(120); doc.text("No photos were captured for this report.", margin, y); y += 5; doc.setTextColor(0);
  } else {
    for (const it of photoItems) {
      for (const url of it.photos) {
        try {
          const dataUrl = await fetchCompressedDataUrl(url);
          const imgW = 80; const imgH = 55;
          ensure(imgH + 8);
          doc.addImage(dataUrl, "JPEG", margin, y, imgW, imgH);
          doc.setFontSize(8); doc.setTextColor(110);
          doc.text(it.name, margin + imgW + 4, y + 6);
          doc.setTextColor(0); doc.setFontSize(10);
          y += imgH + 6;
        } catch (e) {
          ensure(8);
          doc.setTextColor(120); doc.text(`[Photo unavailable: ${it.name}]`, margin, y); doc.setTextColor(0); y += 5;
        }
      }
    }
  }
  y += 3;

  // Meter readings
  if (visit.meter_readings && visit.meter_readings.filter((m) => m.label || m.value).length) {
    sectionHeader("Meter Readings");
    visit.meter_readings.filter((m) => m.label || m.value).forEach((m) => { ensure(5); doc.text(`${m.label || "—"}: ${m.value || "—"}`, margin + 2, y); y += 5; });
    y += 3;
  }

  // Maintenance issues
  if (issues.length) {
    sectionHeader(`Maintenance Issues Created (${issues.length})`);
    issues.forEach((iss) => { ensure(6); doc.text(`• ${iss.title}${iss.priority ? ` [${iss.priority}]` : ""}`, margin + 2, y); y += 5; });
    y += 3;
  }
  // Follow-up tasks
  if (tasks.length) {
    sectionHeader(`Follow-up Tasks Created (${tasks.length})`);
    tasks.forEach((t) => { ensure(6); doc.text(`• ${t.title}`, margin + 2, y); y += 5; });
    y += 3;
  }

  // Next scheduled visit
  if (nextVisit && nextVisit.start_time) {
    sectionHeader("Next Scheduled Visit");
    ensure(8);
    doc.text(`${visitTypeLabel(nextVisit.visit_type) || "Visit"} — ${fmtDate(nextVisit.start_time)}`, margin + 2, y); y += 5;
    y += 3;
  }

  // Summary (owner-visible)
  ensure(12);
  doc.setFont(undefined, "bold"); doc.text("Summary & Recommendations", margin, y); y += 5; doc.setFont(undefined, "normal");
  doc.splitTextToSize(visit.summary || "No summary provided.", maxWidth).forEach((l) => { ensure(5); doc.text(l, margin, y); y += 4; });
  y += 6;

  // Disclaimer
  ensure(16);
  doc.setFontSize(8); doc.setTextColor(120);
  doc.splitTextToSize("This report reflects visual observations only and does not constitute a professional home inspection, building inspection, engineering inspection, electrical inspection, plumbing inspection, code inspection, or certification.", maxWidth).forEach((l) => { doc.text(l, margin, y); y += 4; });
  doc.setTextColor(0);

  // Footer
  const pages = doc.internal.getNumberOfPages();
  const genDate = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(`Generated ${genDate}`, margin, pageH - 8);
    doc.text(`Page ${p} of ${pages}`, pageW - margin - 30, pageH - 8);
    doc.setTextColor(0);
  }

  return doc;
}

function fileSlug(property) {
  return (property?.name || "property").replace(/\s+/g, "-").toLowerCase();
}

/** Existing behavior preserved: generate and immediately download the PDF. */
export async function generateVisitReportPdf(visit, ctx = {}) {
  const doc = await buildDoc(visit, ctx);
  doc.save(`visit-report-${fileSlug(ctx.property)}.pdf`);
}

/** Generate the PDF and return it as a Blob (for upload / manual share). */
export async function generateVisitReportPdfBlob(visit, ctx = {}) {
  const doc = await buildDoc(visit, ctx);
  return doc.output("blob");
}

/**
 * Generate the customer-facing PDF, upload it to app storage, and return its
 * { file_url }. Used to persist a report artifact the owner can be linked to.
 */
export async function generateAndStoreReportPdf(visit, ctx = {}) {
  const { base44 } = await import("@/api/base44Client");
  const blob = await generateVisitReportPdfBlob(visit, ctx);
  const file = new File([blob], `visit-report-${fileSlug(ctx.property)}.pdf`, { type: "application/pdf" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return { file_url };
}