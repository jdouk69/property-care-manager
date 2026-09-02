import jsPDF from "jspdf";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { athensMediumDateTime } from "@/lib/timezone";

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

// --- Image pipeline -------------------------------------------------------------
// Each owner-photo is resized to the maximum dimensions the PDF layout actually
// needs (never upscaled), re-encoded once as JPEG at a documentation-appropriate
// quality, and cached. jsPDF reuses the embedded bytes via `alias` when the same
// URL appears more than once, so duplicate binary copies are not written. Original
// stored photos are never touched — this only affects the generated PDF.
const imgCache = new Map();
let imgAliasSeq = 0;

// maxW in px at the photo's final displayed size (~150-180 DPI target).
async function getImageForPdf(url, maxW, quality) {
  const key = `${url}|${maxW}|${quality}`;
  const cached = imgCache.get(key);
  if (cached) return cached;
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("fetch failed");
  const blob = await res.blob();
  const dataUrl = await blobToDataUrl(blob);
  const img = await loadImage(dataUrl);
  // Never upscale; only downscale to the target width.
  const scale = Math.min(1, maxW / (img.width || maxW));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", quality);
  const entry = { dataUrl: out, w, h, alias: `rptimg${imgAliasSeq++}` };
  imgCache.set(key, entry);
  return entry;
}

// Finding photos carry the important detail -> slightly higher resolution/quality.
// Routine documentation photos can be a touch more aggressive.
const FINDING_IMG_MAXW = 560;
const FINDING_IMG_QUALITY = 0.78;
const ROUTINE_IMG_MAXW = 640;
const ROUTINE_IMG_QUALITY = 0.70;

function fmtDate(iso) {
  return athensMediumDateTime(iso);
}

// --- Customer-facing text safety ------------------------------------------------
const SAFE_MAP = {
  "\u20AC": "EUR", "\u00A3": "GBP", "\u00B7": "-", "\u2022": "-",
  "\u2013": "-", "\u2014": "-", "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"',
  "\u2026": "...", "\u00B2": " sq", "\u00B3": " cb", "\u00B0": " deg", "\u00B1": "+/-",
  "\u00D7": "x", "\u00F7": "/", "\u00A9": "(c)", "\u00AE": "(R)", "\u2122": "(TM)",
};
const clean = (s) => {
  if (s == null) return "";
  let out = String(s);
  out = out.replace(/[\u20AC\u00A3\u00B7\u2022\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u00B2\u00B3\u00B0\u00B1\u00D7\u00F7\u00A9\u00AE\u2122]/g, (m) => SAFE_MAP[m] ?? "");
  out = out.replace(/[^\x20-\x7E\n\r]/g, "");
  return out;
};

// Owner-facing display rewording only. Underlying checklist item names and
// stored data are untouched; this is a presentation-level clarification.
const DISPLAY_LABELS = {
  "Immediate follow-up items identified": "Immediate follow-up needs reviewed",
};

const cleanLabel = (name) => {
  let s = String(name || "").trim();
  s = s.replace(/^\s*[A-Z]{2,}\s*[\u00B7·]\s*/, "");
  s = s.trim();
  return DISPLAY_LABELS[s] || s;
};

const isOwnerFinding = (it) => !!it && !!it.owner_visible && (it.notes && String(it.notes).trim());

const sevFromChecklistStatus = (st) => (st === "Emergency" ? "urgent" : st === "Important" ? "attention" : "monitor");
const priorityLabelFor = (k) => (k === "urgent" ? "Urgent" : k === "attention" ? "Attention Recommended" : "Monitor");

const nextStepFromStatus = (st) => ({
  "Awaiting Owner Approval": "Awaiting your approval to proceed.",
  "Contractor Contacted": "We have contacted a contractor and will schedule the work.",
  "Scheduled": "A contractor visit is scheduled.",
  "In Progress": "Repair work is in progress.",
  "Waiting for Parts": "Waiting for parts to arrive.",
  "Waiting for Payment": "Awaiting payment to complete the work.",
  "Completed": "This has been resolved.",
}[st] || "");

// Dynamic, grammar-correct owner summary. Monitor findings never imply action is
// required; an all-clear visit gets a single positive sentence.
function buildSummaryText({ findings, counts, routineCount }) {
  const n = findings.length;
  const u = counts.urgent, a = counts.attention, m = counts.monitor;
  if (n === 0) {
    return "All routine checks were completed with no concerns noted during this visit.";
  }
  const parts = ["Overall, the property appeared secure and generally well maintained."];
  parts.push(`${n} observation${n === 1 ? "" : "s"} ${n === 1 ? "was" : "were"} documented during this visit.`);
  const clauses = [];
  if (u) clauses.push(`${u} ${u === 1 ? "requires" : "require"} prompt attention`);
  if (a) clauses.push(`${a} ${a === 1 ? "has" : "have"} recommended follow-up`);
  if (m) clauses.push(`${m} will be monitored`);
  if (clauses.length === 1) parts.push(clauses[0] + ".");
  else if (clauses.length > 1) parts.push(clauses.slice(0, -1).join(", ") + ", and " + clauses[clauses.length - 1] + ".");
  if (routineCount) parts.push(`${routineCount} routine check${routineCount === 1 ? "" : "s"} completed with no concerns noted.`);
  return parts.join(" ");
}

/**
 * Build a structured, customer-facing report model from the raw visit + context.
 * Internal notes and non-owner-visible item notes/photos are excluded here so the
 * Review screen and the PDF render exactly what the owner receives.
 */
export function buildOwnerReportModel(visit, ctx = {}) {
  const { business = {}, property = {}, client = {}, issues = [], tasks = [], nextVisit = null } = ctx;
  const cl = visit?.checklist || [];

  const checklistFindings = cl.filter(isOwnerFinding).map((it) => {
    const sk = sevFromChecklistStatus(it.status);
    return {
      title: cleanLabel(it.name),
      severityKey: sk,
      priorityLabel: priorityLabelFor(sk),
      area: "",
      observed: (it.notes || "").trim(),
      recommendation: (it.recommendation || "").trim(),
      actionTaken: (it.action_taken || "").trim(),
      photos: it.photos || [],
      source: "checklist",
    };
  });

  const issueFindings = (issues || [])
    .filter((i) => i && i.status !== "Cancelled")
    .map((i) => {
      const sk = i.priority === "Emergency" ? "urgent" : i.priority === "High" ? "attention" : "monitor";
      return {
        title: i.title || "Maintenance item",
        severityKey: sk,
        priorityLabel: priorityLabelFor(sk),
        area: i.category || "",
        observed: (i.description || "").trim(),
        recommendation: nextStepFromStatus(i.status),
        photos: i.before_photos || [],
        source: "issue",
      };
    });

  const findings = [...checklistFindings, ...issueFindings];
  const order = { urgent: 0, attention: 1, monitor: 2 };
  findings.sort((a, b) => (order[a.severityKey] ?? 2) - (order[b.severityKey] ?? 2));

  const routineChecks = cl.filter((it) => !isOwnerFinding(it)).map((it) => ({ name: cleanLabel(it.name) }));
  const routineCount = routineChecks.length;

  const docPhotos = cl
    .filter((it) => !isOwnerFinding(it) && it.owner_visible && (it.photos && it.photos.length))
    .flatMap((it) => (it.photos || []).map((url) => ({ caption: cleanLabel(it.name), url })));

  const counts = {
    urgent: findings.filter((f) => f.severityKey === "urgent").length,
    attention: findings.filter((f) => f.severityKey === "attention").length,
    monitor: findings.filter((f) => f.severityKey === "monitor").length,
  };

  const hasUrgent = counts.urgent > 0;
  const hasAttention = counts.attention > 0;
  const hasMonitor = counts.monitor > 0;
  let overallStatus;
  if (hasUrgent) overallStatus = { key: "urgent", label: "Attention Required" };
  else if (hasAttention) overallStatus = { key: "attention", label: "Attention Required" };
  else if (hasMonitor) overallStatus = { key: "monitor", label: "Observations Noted" };
  else overallStatus = { key: "ok", label: "No Concerns Noted" };

  const segs = [];
  if (counts.urgent) segs.push(`${counts.urgent} Urgent`);
  if (counts.attention) segs.push(`${counts.attention} Attention Recommended`);
  if (counts.monitor) segs.push(`${counts.monitor} Monitor`);
  const priorityBreakdown = segs.join(" \u00B7 ");
  const routineLine = routineCount ? `${routineCount} routine check${routineCount === 1 ? "" : "s"} completed - no concerns noted` : "";

  const vtl = visitTypeLabel(visit?.visit_type) || "Property Visit";
  const summaryText = buildSummaryText({ findings, counts, routineCount });

  // Compact appendix: routine check names + observations (priority - title). No
  // descriptions/photos repeated here.
  const visitChecklist = {
    routineChecks: routineChecks.map((r) => r.name),
    observations: findings.map((f) => ({ priorityLabel: f.priorityLabel, severityKey: f.severityKey, title: f.title })),
  };

  // Kept for backward compatibility (e.g. the delivery email).
  const detailedRecord = cl.map((it) => ({
    name: cleanLabel(it.name),
    label: isOwnerFinding(it)
      ? (it.status === "Emergency" ? "Urgent attention" : it.status === "Important" ? "Needs attention" : "Monitor")
      : ((it.status === "Not Checked" || !it.status) ? "Not checked" : "Checked"),
  }));

  const result = hasUrgent
    ? "Urgent attention recommended."
    : hasAttention
      ? "Attention required."
      : hasMonitor
        ? "Observations noted."
        : "No concerns noted.";

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
    visitTypeLabel: vtl,
    overallStatus,
    counts,
    priorityBreakdown,
    routineLine,
    summaryText,
    findings,
    routineChecks,
    routineCount,
    docPhotos,
    visitChecklist,
    detailedRecord,
    issues: (issues || []).filter((i) => i && i.status !== "Cancelled").map((i) => ({
      title: i.title, priority: i.priority, status: i.status, category: i.category,
    })),
    tasks: (tasks || []).map((t) => ({ title: t.title })),
    nextVisit,
    result,
    internalNotesExcluded: true,
  };
}

// --- PDF rendering ---------------------------------------------------------------
const TONE = {
  urgent: [239, 68, 68],
  attention: [245, 158, 11],
  monitor: [100, 116, 139],
  ok: [16, 185, 129],
};

function drawCheck(doc, x, y, rgb) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.7);
  doc.line(x, y - 1, x + 1.2, y + 0.5);
  doc.line(x + 1.2, y + 0.5, x + 3.6, y - 2.2);
}

// Draw an image preserving aspect ratio inside a box (centered, never stretched).
function drawImageFit(doc, entry, x, y, boxW, boxH) {
  const r = entry.w / entry.h;
  let dw = boxW;
  let dh = boxW / r;
  if (dh > boxH) { dh = boxH; dw = boxH * r; }
  const dx = x + (boxW - dw) / 2;
  const dy = y + (boxH - dh) / 2;
  doc.addImage(entry.dataUrl, "JPEG", dx, dy, dw, dh, entry.alias);
  return boxH;
}

async function buildDoc(visit, ctx = {}) {
  const model = buildOwnerReportModel(visit, ctx);
  const { business, property, client, visit: v, visitTypeLabel: vtl, overallStatus, counts, priorityBreakdown, routineLine, summaryText, findings, routineChecks, routineCount, docPhotos, issues, tasks, nextVisit } = model;

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageW - margin * 2;
  let y = 16;
  const ensure = (need) => { if (y + need > pageH - 16) { doc.addPage(); y = 16; } };
  const text = (s, x, yy) => doc.text(clean(s), x, yy);
  const wrapLines = (s, w) => doc.splitTextToSize(clean(s), w);
  const wrap = (s, w, x, lh = 5) => {
    wrapLines(s, w).forEach((l) => { ensure(lh); text(l, x, y); y += lh; });
  };

  // --- Header (compact) ---
  doc.setFontSize(14); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text(business.business_name || "Property Care", margin, y); y += 5;
  doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(110);
  const contact = [business.phone, business.email].filter(Boolean).join("   -   ");
  if (contact) { text(contact, margin, y); y += 4; }
  doc.setDrawColor(210); doc.line(margin, y, pageW - margin, y); y += 5;
  doc.setTextColor(0);

  // Title
  doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text("PROPERTY CARE VISIT REPORT", margin, y); y += 5;
  doc.setFontSize(8.5); doc.setFont(undefined, "normal"); doc.setTextColor(110);
  text(vtl || "Property Visit", margin, y); y += 5;
  doc.setTextColor(0);

  // Compact property info (2 columns)
  doc.setFontSize(9);
  const colW = maxWidth / 2;
  const drawKV = (k, val, x) => {
    doc.setFont(undefined, "bold"); doc.setTextColor(90);
    text(k + ":", x, y);
    const lblW = doc.getTextWidth(k + ": ");
    doc.setFont(undefined, "normal"); doc.setTextColor(30);
    const lines = doc.splitTextToSize(clean(String(val)), colW - lblW - 2);
    text(lines[0] || "", x + lblW, y);
    return lines.length;
  };
  drawKV("Property", property.name || "-", margin);
  drawKV("Owner", client.name || "-", margin + colW);
  y += 5;
  drawKV("Visit date", fmtDate(v.start_time), margin);
  drawKV("Service type", vtl || "-", margin + colW);
  y += 6;

  // Overall status banner
  const tone = TONE[overallStatus.key] || TONE.ok;
  ensure(12);
  doc.setFillColor(tone[0], tone[1], tone[2]); doc.roundedRect(margin, y, maxWidth, 11, 2, 2, "F");
  doc.setTextColor(255); doc.setFontSize(11); doc.setFont(undefined, "bold");
  text(overallStatus.label.toUpperCase(), margin + 5, y + 7.5);
  doc.setTextColor(0); y += 14;

  // Priority breakdown (each segment colored)
  if (priorityBreakdown) {
    ensure(6);
    doc.setFontSize(9.5); doc.setFont(undefined, "bold");
    const segList = [];
    if (counts.urgent) segList.push({ t: `${counts.urgent} Urgent`, c: TONE.urgent });
    if (counts.attention) segList.push({ t: `${counts.attention} Attention Recommended`, c: TONE.attention });
    if (counts.monitor) segList.push({ t: `${counts.monitor} Monitor`, c: TONE.monitor });
    let xx = margin;
    for (let si = 0; si < segList.length; si++) {
      if (si > 0) { doc.setTextColor(170); text(" - ", xx, y); xx += doc.getTextWidth(" - "); }
      const seg = segList[si];
      doc.setTextColor(seg.c[0], seg.c[1], seg.c[2]);
      text(seg.t, xx, y);
      xx += doc.getTextWidth(seg.t);
    }
    doc.setTextColor(0);
    y += 6;
  }
  if (routineLine) {
    ensure(5);
    doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(90);
    text(routineLine, margin, y); y += 6;
  }
  y += 1;

  // Visit summary
  ensure(18);
  doc.setFontSize(10.5); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text("Visit Summary", margin, y); y += 5.5;
  doc.setFontSize(10); doc.setFont(undefined, "normal"); doc.setTextColor(45);
  wrap(summaryText, maxWidth, margin);
  doc.setTextColor(0); y += 4;

  // Visit Observations (findings) — keep each finding together on one page.
  if (findings.length) {
    ensure(18);
    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
    text("Visit Observations", margin, y); y += 8;

    const fColW = (maxWidth - 6) / 2;
    const fBoxH = fColW * 0.72;
    const measure = (s, w) => s ? doc.splitTextToSize(clean(s), w).length : 0;
    const estFinding = (f) => {
      let h = 9;
      if (f.area) h += 5;
      if (f.observed) h += 5 + measure(f.observed, maxWidth - 4) * 5 + 2;
      if (f.actionTaken) h += 5 + measure(f.actionTaken, maxWidth - 4) * 5 + 2;
      if (f.recommendation) h += 5 + measure(f.recommendation, maxWidth - 4) * 5 + 2;
      if (f.photos && f.photos.length) {
        const rows = Math.ceil(f.photos.length / 2);
        h += rows * (fBoxH + 4) + 2;
      }
      return h + 4;
    };

    for (let idx = 0; idx < findings.length; idx++) {
      const f = findings[idx];
      // Move the whole finding to the next page if it won't fit (keeps badge,
      // title, observed, action, recommendation and first photo together).
      if (y + estFinding(f) > pageH - 18) { doc.addPage(); y = 16; }

      const ft = TONE[f.severityKey] || TONE.monitor;
      doc.setFillColor(ft[0], ft[1], ft[2]); doc.roundedRect(margin, y, 64, 7, 1.5, 1.5, "F");
      doc.setTextColor(255); doc.setFontSize(7.5); doc.setFont(undefined, "bold");
      text(f.priorityLabel.toUpperCase(), margin + 3, y + 5);
      doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.setFont(undefined, "bold");
      text(f.title, margin + 70, y + 5);
      y += 9;
      if (f.area) {
        doc.setFont(undefined, "normal"); doc.setFontSize(8.5); doc.setTextColor(110);
        text("Area: " + f.area, margin + 2, y); y += 5;
      }
      if (f.observed) {
        doc.setFont(undefined, "bold"); doc.setFontSize(9); doc.setTextColor(70); text("What we observed:", margin + 2, y); y += 5;
        doc.setFont(undefined, "normal"); doc.setTextColor(40);
        wrap(f.observed, maxWidth - 4, margin + 4);
      }
      if (f.actionTaken) {
        doc.setFont(undefined, "bold"); doc.setFontSize(9); doc.setTextColor(70); text("Action taken:", margin + 2, y); y += 5;
        doc.setFont(undefined, "normal"); doc.setTextColor(40);
        wrap(f.actionTaken, maxWidth - 4, margin + 4);
      }
      if (f.recommendation) {
        doc.setFont(undefined, "bold"); doc.setFontSize(9); doc.setTextColor(70); text("Recommended next step:", margin + 2, y); y += 5;
        doc.setFont(undefined, "normal"); doc.setTextColor(40);
        wrap(f.recommendation, maxWidth - 4, margin + 4);
      }
      if (f.photos && f.photos.length) {
        let col = 0;
        for (const url of f.photos) {
          try {
            const entry = await getImageForPdf(url, FINDING_IMG_MAXW, FINDING_IMG_QUALITY);
            if (col === 0) ensure(fBoxH + 6);
            const x = margin + 2 + col * (fColW + 6);
            drawImageFit(doc, entry, x, y, fColW, fBoxH);
            col++;
            if (col >= 2) { col = 0; y += fBoxH + 4; }
          } catch (e) {
            ensure(5); doc.setTextColor(150); text("[photo unavailable]", margin + 2, y); doc.setTextColor(0); y += 5;
          }
        }
        if (col > 0) y += fBoxH + 4;
      }
      y += 3;
      if (idx < findings.length - 1) { doc.setDrawColor(225); doc.line(margin, y, pageW - margin, y); y += 5; }
    }
    y += 2;
  }

  // Summary & Next Steps
  ensure(18);
  doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text("Summary & Next Steps", margin, y); y += 6;
  doc.setFontSize(10); doc.setFont(undefined, "normal"); doc.setTextColor(40);
  if (v.summary) { wrap(v.summary, maxWidth, margin); y += 2; }
  const nextSteps = [];
  if (issues.length) nextSteps.push(`${issues.length} maintenance item${issues.length === 1 ? "" : "s"} recorded - we will coordinate as agreed.`);
  if (tasks.length) nextSteps.push(`${tasks.length} follow-up task${tasks.length === 1 ? "" : "s"} scheduled.`);
  if (nextVisit && nextVisit.start_time) nextSteps.push(`Next scheduled visit: ${fmtDate(nextVisit.start_time)}.`);
  if (!v.summary && !nextSteps.length) { doc.setTextColor(120); text("No additional next steps recorded.", margin, y); y += 5; doc.setTextColor(0); }
  nextSteps.forEach((s) => { wrap(s, maxWidth, margin); });
  y += 4;

  // --- Routine Checks (each completed check appears exactly once) ---
  // The banner above already states the overall status and the routine-check
  // count, so the section is a single clean list with no repeated summary line.
  if (routineCount) {
    ensure(30); // keep the heading with at least the first few checks
    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
    text("Routine Checks", margin, y); y += 6.5;
    for (const rc of routineChecks) {
      ensure(6);
      drawCheck(doc, margin, y, TONE.ok);
      doc.setTextColor(40); doc.setFontSize(9.5); doc.setFont(undefined, "normal");
      text(rc.name, margin + 6, y);
      y += 6;
    }
    y += 3;
  }

  // --- Routine Visit Photos (routine documentation; not findings) ---
  if (docPhotos && docPhotos.length) {
    ensure(20);
    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
    text("Routine Visit Photos", margin, y); y += 5;
    doc.setFontSize(8.5); doc.setFont(undefined, "normal"); doc.setTextColor(110);
    text("Documentation photos showing general property conditions during this visit.", margin, y); y += 7;
    const gColW = (maxWidth - 8) / 2;
    const gBoxH = gColW * 0.72;
    let col = 0;
    for (const dp of docPhotos) {
      try {
        const entry = await getImageForPdf(dp.url, ROUTINE_IMG_MAXW, ROUTINE_IMG_QUALITY);
        if (col === 0) ensure(gBoxH + 12);
        const x = margin + col * (gColW + 8);
        drawImageFit(doc, entry, x, y, gColW, gBoxH);
        doc.setFontSize(7.5); doc.setTextColor(110);
        const cap = wrapLines(dp.caption, gColW);
        text(cap[0] || "", x, y + gBoxH + 4);
        doc.setTextColor(0);
        col++;
        if (col >= 2) { col = 0; y += gBoxH + 12; }
      } catch (e) {
        ensure(6); doc.setTextColor(150); text("[photo unavailable]", margin, y); doc.setTextColor(0); y += 6;
      }
    }
    if (col > 0) y += gBoxH + 12;
    y += 3;
  }

  // Scope footer
  ensure(18);
  doc.setDrawColor(210); doc.line(margin, y, pageW - margin, y); y += 5;
  doc.setFontSize(8); doc.setTextColor(120);
  wrap("This Property Care Visit Report documents visual observations made during a routine property-care visit. It is not a professional home/building inspection, engineering evaluation, trade inspection, or certification.", maxWidth, margin, 4);
  doc.setTextColor(0);

  // Footer (page numbers)
  const pages = doc.internal.getNumberOfPages();
  const genDate = athensMediumDateTime(new Date().toISOString());
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8); doc.setTextColor(150);
    text(`Generated ${genDate}`, margin, pageH - 8);
    text(`Page ${p} of ${pages}`, pageW - margin - 26, pageH - 8);
    doc.setTextColor(0);
  }

  return doc;
}

function fileSlug(property) {
  return (property?.name || "property").replace(/\s+/g, "-").toLowerCase();
}

export async function generateVisitReportPdf(visit, ctx = {}) {
  const doc = await buildDoc(visit, ctx);
  doc.save(`visit-report-${fileSlug(ctx.property)}.pdf`);
}

export async function generateVisitReportPdfBlob(visit, ctx = {}) {
  const doc = await buildDoc(visit, ctx);
  return doc.output("blob");
}

export async function generateAndStoreReportPdf(visit, ctx = {}) {
  const { base44 } = await import("@/api/base44Client");
  const blob = await generateVisitReportPdfBlob(visit, ctx);
  const file = new File([blob], `visit-report-${fileSlug(ctx.property)}.pdf`, { type: "application/pdf" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return { file_url };
}