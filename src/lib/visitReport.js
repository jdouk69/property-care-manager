import jsPDF from "jspdf";

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

/**
 * ctx: { business, property, client, issues: [{title, priority, status}], tasks: [{title, status}] }
 */
export async function generateVisitReportPdf(visit, ctx = {}) {
  const { business = {}, property = {}, client = {}, issues = [], tasks = [] } = ctx;
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
  doc.text(`Visit type: ${visit.visit_type || "—"}`, margin, y); y += 5;
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
      if (it.notes) { doc.splitTextToSize(it.notes, maxWidth - 6).forEach((l) => { ensure(5); doc.text(l, margin + 6, y); y += 4; }); }
    });
  };

  renderGroup("Emergency", groups.Emergency, "!");
  renderGroup("Important", groups.Important, "▲");
  renderGroup("Normal", groups.Normal, "✓");
  renderGroup("Not Checked", groups["Not Checked"], "–");
  y += 3;

  // Photos (Important + Emergency)
  const photoItems = [...groups.Emergency, ...groups.Important].filter((i) => i.photos && i.photos.length);
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

  // Summary
  ensure(12);
  doc.setFont(undefined, "bold"); doc.text("Summary & Recommendations", margin, y); y += 5; doc.setFont(undefined, "normal");
  doc.splitTextToSize(visit.summary || "No summary provided.", maxWidth).forEach((l) => { ensure(5); doc.text(l, margin, y); y += 4; });
  y += 6;

  // Disclaimer
  ensure(16);
  doc.setFontSize(8); doc.setTextColor(120);
  doc.splitTextToSize("This report reflects visual observations only and does not constitute a professional inspection, engineering certification, or construction supervision.", maxWidth).forEach((l) => { doc.text(l, margin, y); y += 4; });
  doc.setTextColor(0);

  // Footer: page numbers + generation date on every page
  const pages = doc.internal.getNumberOfPages();
  const genDate = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text(`Generated ${genDate}`, margin, pageH - 8);
    doc.text(`Page ${p} of ${pages}`, pageW - margin - 30, pageH - 8);
    doc.setTextColor(0);
  }

  doc.save(`visit-report-${(property.name || "property").replace(/\s+/g, "-").toLowerCase()}.pdf`);
}