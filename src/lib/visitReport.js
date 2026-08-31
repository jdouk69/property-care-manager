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

// --- Customer-facing text safety -------------------------------------------------
// jsPDF's standard fonts only encode WinAnsi. Unicode glyphs like the middle-dot
// (·, U+00B7), check (✓), triangle (▲), euro (€), smart quotes, en/em dashes render
// as garbage (e.g. "%²", stray spacing) in PDF viewers. Map known ones to ASCII and
// strip anything else outside printable ASCII so the PDF is clean on every device.
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

// Strip internal prefixes/codes from checklist labels, e.g.
// "ONBOARDING · Front/general exterior starting condition..." -> "Front/general exterior starting condition..."
const cleanLabel = (name) => {
  let s = String(name || "").trim();
  s = s.replace(/^\s*[A-Z]{2,}\s*[\u00B7·]\s*/, "");
  return s.trim();
};

// Owner-visible only: a checklist item is a customer "finding" when it was explicitly
// flagged owner-visible AND has an owner-facing note or photo. A bare line marked
// Emergency/Important internally (e.g. a baseline-photo section) is NOT a finding.
// A finding requires an owner-visible OBSERVATION NOTE. Photos alone (no note) are
// routine documentation, not a concern — so a normal-condition photo never becomes
// a finding, and a bare Emergency/Important-marked line with no note never becomes one.
const isOwnerFinding = (it) => !!it && !!it.owner_visible && (it.notes && String(it.notes).trim());

const sevFromChecklistStatus = (st) => (st === "Emergency" ? "urgent" : st === "Important" ? "attention" : "monitor");
const priorityLabelFor = (k) => (k === "urgent" ? "Urgent" : k === "attention" ? "Attention Recommended" : "Monitor");

// Factual next-step from a recorded maintenance-issue status. Never a diagnosis —
// only a plain restatement of the recorded workflow state. Empty when no action yet.
const nextStepFromStatus = (st) => ({
  "Awaiting Owner Approval": "Awaiting your approval to proceed.",
  "Contractor Contacted": "We have contacted a contractor and will schedule the work.",
  "Scheduled": "A contractor visit is scheduled.",
  "In Progress": "Repair work is in progress.",
  "Waiting for Parts": "Waiting for parts to arrive.",
  "Waiting for Payment": "Awaiting payment to complete the work.",
  "Completed": "This has been resolved.",
}[st] || "");

function buildSummaryText({ visit, property, vtl, findings, routineCount }) {
  const parts = [];
  parts.push(`We completed the ${vtl || "property-care visit"} at ${property?.name || "your property"} on ${fmtDate(visit?.start_time)}.`);
  if (findings.length) {
    parts.push(findings.length === 1 ? "1 item requires your attention." : `${findings.length} items require your attention.`);
  }
  if (routineCount) {
    parts.push(routineCount === 1 ? "1 routine check completed with no concerns noted." : `${routineCount} routine checks completed with no concerns noted.`);
  }
  if (!findings.length && !routineCount) parts.push("No concerns were noted during this visit.");
  return parts.join(" ");
}

/**
 * Build a structured, customer-facing report model from the raw visit + context.
 *
 * The internal checklist is the operational record; this model TRANSLATES it into a
 * simple owner-facing report. Internal notes and non-owner-visible item notes/photos
 * are excluded here so the Review screen and the PDF render exactly what the owner
 * receives. A checklist line's internal status alone never produces a customer
 * Emergency — only an actual owner-visible finding (note/photo) or a linked
 * maintenance issue does.
 *
 * ctx: { business, property, client, issues, tasks, nextVisit }
 */
export function buildOwnerReportModel(visit, ctx = {}) {
  const { business = {}, property = {}, client = {}, issues = [], tasks = [], nextVisit = null } = ctx;
  const cl = visit?.checklist || [];

  // Findings from owner-visible checklist items.
  const checklistFindings = cl.filter(isOwnerFinding).map((it) => ({
    title: cleanLabel(it.name),
    severityKey: sevFromChecklistStatus(it.status),
    priorityLabel: priorityLabelFor(sevFromChecklistStatus(it.status)),
    area: "",
    observed: (it.notes || "").trim(),
    recommendation: (it.recommendation || "").trim(),
    actionTaken: (it.action_taken || "").trim(),
    photos: it.photos || [],
    source: "checklist",
  }));

  // Findings from linked maintenance issues (real recorded concerns).
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

  // Routine checks = checklist items that are NOT findings (no owner-facing note).
  const routineChecks = cl.filter((it) => !isOwnerFinding(it)).map((it) => ({ name: cleanLabel(it.name) }));
  const routineCount = routineChecks.length;

  // Documentation photos: owner-visible photos on items that are NOT findings (no
  // observation note). Shown in a Photo Record section, separate from concerns.
  const docPhotos = cl
    .filter((it) => !isOwnerFinding(it) && it.owner_visible && (it.photos && it.photos.length))
    .flatMap((it) => (it.photos || []).map((url) => ({ caption: cleanLabel(it.name), url })));

  const hasUrgent = findings.some((f) => f.severityKey === "urgent");
  const hasAny = findings.length > 0;
  const overallStatus = hasUrgent
    ? { key: "urgent", label: "Urgent Attention Recommended" }
    : hasAny
      ? { key: "attention", label: "Attention Needed" }
      : { key: "ok", label: "No Concerns Noted" };

  const vtl = visitTypeLabel(visit?.visit_type) || "Property Visit";
  const summaryText = buildSummaryText({ visit, property, vtl, findings, routineCount });

  // Detailed record: clean labels, no internal status jargon. Items that are findings
  // show their finding label; everything else shows Checked / Not checked.
  const detailedRecord = cl.map((it) => ({
    name: cleanLabel(it.name),
    label: isOwnerFinding(it)
      ? (it.status === "Emergency" ? "Urgent attention" : it.status === "Important" ? "Needs attention" : "Monitor")
      : ((it.status === "Not Checked" || !it.status) ? "Not checked" : "Checked"),
  }));

  const result = hasUrgent
    ? "Urgent attention recommended."
    : hasAny
      ? `${findings.length} item(s) require attention.`
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
    summaryText,
    findings,
    routineChecks,
    routineCount,
    docPhotos,
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

async function buildDoc(visit, ctx = {}) {
  const model = buildOwnerReportModel(visit, ctx);
  const { business, property, client, visit: v, visitTypeLabel: vtl, overallStatus, summaryText, findings, routineChecks, routineCount, docPhotos, detailedRecord, issues, tasks, nextVisit } = model;

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

  // --- Header ---
  doc.setFontSize(15); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text(business.business_name || "Property Care", margin, y); y += 6;
  doc.setFontSize(8); doc.setFont(undefined, "normal"); doc.setTextColor(110);
  const contact = [business.phone, business.email].filter(Boolean).join("   -   ");
  if (contact) { text(contact, margin, y); y += 4; }
  if (business.address) { wrap(business.address, maxWidth, margin, 4); }
  y += 1;
  doc.setDrawColor(210); doc.line(margin, y, pageW - margin, y); y += 6;
  doc.setTextColor(0);

  // Title
  doc.setFontSize(13); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text("PROPERTY CARE VISIT REPORT", margin, y); y += 6;
  doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(110);
  text(vtl || "Property Visit", margin, y); y += 6;
  doc.setTextColor(0);

  // Property info block
  doc.setFontSize(10);
  const infoRows = [
    ["Property", property.name || "—"],
    ["Owner", client.name || "—"],
    ["Visit date", fmtDate(v.start_time)],
    ["Service type", vtl || "—"],
  ];
  infoRows.forEach(([k, val]) => {
    doc.setFont(undefined, "bold"); doc.setTextColor(90); text(k + ":", margin, y);
    doc.setFont(undefined, "normal"); doc.setTextColor(30); text(String(val), margin + 32, y);
    y += 5;
  });
  y += 2;

  // Overall status box
  const tone = TONE[overallStatus.key] || TONE.ok;
  ensure(14);
  doc.setFillColor(tone[0], tone[1], tone[2]); doc.roundedRect(margin, y, maxWidth, 12, 2, 2, "F");
  doc.setTextColor(255); doc.setFontSize(11); doc.setFont(undefined, "bold");
  text(overallStatus.label.toUpperCase(), margin + 5, y + 8);
  doc.setTextColor(0); y += 16;

  // Visit summary
  ensure(12);
  doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
  text("Visit Summary", margin, y); y += 6;
  doc.setFontSize(10); doc.setFont(undefined, "normal"); doc.setTextColor(50);
  wrap(summaryText, maxWidth, margin);
  doc.setTextColor(0); y += 4;

  // Items requiring attention
  if (findings.length) {
    ensure(10);
    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
    text("Items Requiring Attention", margin, y); y += 8;
    for (let idx = 0; idx < findings.length; idx++) {
      const f = findings[idx];
      const ft = TONE[f.severityKey] || TONE.monitor;
      ensure(16);
      doc.setFillColor(ft[0], ft[1], ft[2]); doc.roundedRect(margin, y, 62, 7, 1.5, 1.5, "F");
      doc.setTextColor(255); doc.setFontSize(7.5); doc.setFont(undefined, "bold");
      text(f.priorityLabel.toUpperCase(), margin + 3, y + 5);
      doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.setFont(undefined, "bold");
      text(f.title, margin + 68, y + 5);
      y += 9;
      if (f.area) {
        doc.setFont(undefined, "normal"); doc.setFontSize(8.5); doc.setTextColor(110);
        text("Area: " + f.area, margin + 2, y); y += 5;
      }
      if (f.observed) {
        doc.setFont(undefined, "bold"); doc.setFontSize(9); doc.setTextColor(70); ensure(6); text("What we observed:", margin + 2, y); y += 5;
        doc.setFont(undefined, "normal"); doc.setTextColor(40);
        wrap(f.observed, maxWidth - 4, margin + 4);
      }
      if (f.actionTaken) {
        doc.setFont(undefined, "bold"); doc.setFontSize(9); doc.setTextColor(70); ensure(6); text("Action taken:", margin + 2, y); y += 5;
        doc.setFont(undefined, "normal"); doc.setTextColor(40);
        wrap(f.actionTaken, maxWidth - 4, margin + 4);
      }
      if (f.recommendation) {
        doc.setFont(undefined, "bold"); doc.setFontSize(9); doc.setTextColor(70); ensure(6); text("Recommended next step:", margin + 2, y); y += 5;
        doc.setFont(undefined, "normal"); doc.setTextColor(40);
        wrap(f.recommendation, maxWidth - 4, margin + 4);
      }
      if (f.photos && f.photos.length) {
        for (const url of f.photos) {
          try {
            const dataUrl = await fetchCompressedDataUrl(url);
            const imgW = 72, imgH = 50;
            ensure(imgH + 6);
            doc.addImage(dataUrl, "JPEG", margin + 2, y, imgW, imgH);
            doc.setFontSize(7.5); doc.setTextColor(120); text(f.title, margin + 2 + imgW + 4, y + 5);
            doc.setTextColor(0);
            y += imgH + 4;
          } catch (e) {
            ensure(5); doc.setTextColor(150); text("[photo unavailable]", margin + 2, y); doc.setTextColor(0); y += 5;
          }
        }
      }
      y += 3;
      if (idx < findings.length - 1) { doc.setDrawColor(225); doc.line(margin, y, pageW - margin, y); y += 4; }
    }
    y += 2;
  }

  // Summary & Next Steps
  ensure(12);
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
  y += 3;

  // --- Page 2+: Routine checks ---
  if (routineCount) {
    doc.addPage(); y = 16;
    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(16, 185, 129);
    text("ROUTINE CHECKS - NO CONCERNS NOTED", margin, y); y += 6;
    doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(70);
    text(`${routineCount} routine check${routineCount === 1 ? "" : "s"} completed with no concerns noted.`, margin, y); y += 7;
    for (const rc of routineChecks) {
      ensure(6);
      drawCheck(doc, margin, y, TONE.ok);
      doc.setTextColor(40); doc.setFontSize(9.5); doc.setFont(undefined, "normal");
      text(rc.name, margin + 6, y);
      y += 6;
    }
    y += 3;
  }

  // Photo Record — routine documentation photos (owner-visible, non-finding)
  if (docPhotos && docPhotos.length) {
    ensure(14);
    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
    text("Photo Record", margin, y); y += 7;
    let col = 0; const imgW = (maxWidth - 8) / 2; const imgH = imgW * 0.72; const gap = 8;
    for (const dp of docPhotos) {
      try {
        const dataUrl = await fetchCompressedDataUrl(dp.url);
        if (col === 0) ensure(imgH + 14);
        const x = margin + col * (imgW + gap);
        doc.addImage(dataUrl, "JPEG", x, y, imgW, imgH);
        doc.setFontSize(7.5); doc.setTextColor(110);
        const cap = wrapLines(dp.caption, imgW);
        text(cap[0] || "", x, y + imgH + 4);
        if (cap.length > 1) text(cap[1] + "...", x, y + imgH + 8);
        doc.setTextColor(0);
        col++;
        if (col >= 2) { col = 0; y += imgH + 14; }
      } catch (e) {
        ensure(6); doc.setTextColor(150); text("[photo unavailable]", margin, y); doc.setTextColor(0); y += 6;
      }
    }
    if (col > 0) y += imgH + 14;
    y += 3;
  }

  // Detailed visit record (transparency, clean labels, no internal status jargon)
  if (detailedRecord.length) {
    ensure(14);
    doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.setTextColor(15, 23, 42);
    text("Detailed Visit Record", margin, y); y += 7;
    doc.setFontSize(9); doc.setFont(undefined, "normal");
    for (const d of detailedRecord) {
      const nameLines = wrapLines(d.name, maxWidth - 38);
      ensure(6 + (nameLines.length - 1) * 5);
      doc.setTextColor(110); text(d.label, margin, y);
      doc.setTextColor(40);
      for (let li = 0; li < nameLines.length; li++) {
        text(nameLines[li], margin + 38, y);
        if (li < nameLines.length - 1) y += 5;
      }
      y += 6;
    }
    y += 3;
  }

  // Scope footer
  ensure(20);
  doc.setDrawColor(210); doc.line(margin, y, pageW - margin, y); y += 5;
  doc.setFontSize(8); doc.setTextColor(120);
  wrap("This Property Care Visit Report documents visual observations made during a routine property-care visit. It is not a professional home/building inspection, engineering evaluation, trade inspection, or certification.", maxWidth, margin, 4);
  doc.setTextColor(0);

  // Footer (page numbers)
  const pages = doc.internal.getNumberOfPages();
  const genDate = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
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