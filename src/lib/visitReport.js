import jsPDF from "jspdf";
import { visitTypeLabel, QUICK_CHECK_TYPE } from "@/lib/visitTypeLabels";
import { athensMediumDateTime } from "@/lib/timezone";
import { reportLangFromClient, reportLabelsFor } from "@/lib/reportLabels";
import { CHECKLIST_ITEM_EL } from "@/lib/i18n/checklistItemDisplay";

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

async function getImageForPdf(url, maxW, quality, bg = null) {
  const key = `${url}|${maxW}|${quality}|${bg || ""}`;
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
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", quality);
  const entry = { dataUrl: out, w, h, alias: `rptimg${imgAliasSeq++}` };
  imgCache.set(key, entry);
  return entry;
}

// Finding photos carry the important detail -> slightly higher resolution/quality.
const FINDING_IMG_MAXW = 560;
const FINDING_IMG_QUALITY = 0.78;
const ROUTINE_IMG_MAXW = 640;
const ROUTINE_IMG_QUALITY = 0.70;

function fmtDate(iso) {
  return athensMediumDateTime(iso);
}

// --- Text safety ------------------------------------------------------------------
// Legacy ASCII-only sanitizer (standard PDF fonts cannot render non-ASCII).
const SAFE_MAP = {
  "\u20AC": "EUR", "\u00A3": "GBP", "\u00B7": "-", "\u2022": "-",
  "\u2013": "-", "\u2014": "-", "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"',
  "\u2026": "...", "\u00B2": " sq", "\u00B3": " cb", "\u00B0": " deg", "\u00B1": "+/-",
  "\u00D7": "x", "\u00F7": "/", "\u00A9": "(c)", "\u00AE": "(R)", "\u2122": "(TM)",
};
const asciiClean = (s) => {
  if (s == null) return "";
  let out = String(s);
  out = out.replace(/[\u20AC\u00A3\u00B7\u2022\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u00B2\u00B3\u00B0\u00B1\u00D7\u00F7\u00A9\u00AE\u2122]/g, (m) => SAFE_MAP[m] ?? "");
  out = out.replace(/[^\x20-\x7E\n\r]/g, "");
  return out;
};
// Unicode sanitizer for the embedded Greek-capable fonts: only control
// characters are removed — Greek text, €, ·, em dashes etc. all render.
const uniClean = (s) => {
  if (s == null) return "";
  return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
};

// --- Greek-capable PDF fonts --------------------------------------------------------
// jsPDF's built-in fonts are WinAnsi-only. Greek text in reports (checklist
// names, observations, full EL label set) needs an embedded TrueType font.
// DejaVu Sans/Serif ship as static TTFs with full Greek coverage and are
// fetched once from jsDelivr (CORS *) and cached for the session. If the fetch
// fails, the report falls back to the standard fonts + ASCII sanitizer (English
// reports are unaffected; Greek text degrades to today's pre-fix behavior
// rather than failing the whole report).
const FONT_FILES = [
  ["PCCSans", "normal", "DejaVuSans.ttf", "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf"],
  ["PCCSans", "bold", "DejaVuSans-Bold.ttf", "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf"],
  ["PCCSerif", "normal", "DejaVuSerif.ttf", "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSerif.ttf"],
  ["PCCSerif", "bold", "DejaVuSerif-Bold.ttf", "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSerif-Bold.ttf"],
];
let fontCache = null; // array of base64 strings, or false after a failed load
async function loadReportFonts() {
  if (fontCache !== null) return fontCache;
  try {
    fontCache = await Promise.all(
      FONT_FILES.map(async ([, , file, url]) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`font fetch ${res.status}`);
        const dataUrl = await blobToDataUrl(await res.blob());
        // jsPDF's VFS expects raw base64 — strip the data-URL prefix.
        const idx = dataUrl.indexOf(";base64,");
        return idx >= 0 ? dataUrl.slice(idx + 8) : dataUrl;
      })
    );
  } catch (e) {
    // Do NOT cache the failure — a transient network problem must not
    // permanently downgrade later reports to ASCII-only text. The next call
    // retries the fetch.
    fontCache = null;
    console.warn("Report PDF fonts unavailable.", e);
    return null;
  }
  return fontCache;
}
function installFonts(doc, fonts) {
  FONT_FILES.forEach(([family, style, file], i) => {
    doc.addFileToVFS(file, fonts[i]);
    doc.addFont(file, family, style);
  });
}

// Owner-facing display rewording only. Underlying checklist item names and
// stored data are untouched; this is a presentation-level clarification.
const DISPLAY_LABELS = {
  "Immediate follow-up items identified": "Immediate follow-up needs reviewed",
};

// Owner-facing findings are ONLY explicit concern statuses (Important /
// Emergency). A Normal item with a note is a completed routine check with an
// owner-visible observation — never a concern and never duplicated as one.
const isOwnerFinding = (it) => !!it && (it.status === "Important" || it.status === "Emergency");

const sevFromChecklistStatus = (st) => (st === "Emergency" ? "urgent" : st === "Important" ? "attention" : "monitor");

const nextStepFromStatus = (st) => ({
  "Awaiting Owner Approval": "Awaiting your approval to proceed.",
  "Contractor Contacted": "We have contacted a contractor and will schedule the work.",
  "Scheduled": "A contractor visit is scheduled.",
  "In Progress": "Repair work is in progress.",
  "Waiting for Parts": "Waiting for parts to arrive.",
  "Waiting for Payment": "Awaiting payment to complete the work.",
  "Completed": "This has been resolved.",
}[st] || "");

/**
 * Build a structured, customer-facing report model from the raw visit + context.
 * Internal notes and non-owner-visible item notes/photos are excluded here so the
 * Review screen and the PDF render exactly what the owner receives.
 * Report language follows the client's preferred language (EN/EL).
 */
export function buildOwnerReportModel(visit, ctx = {}) {
  const { business = {}, property = {}, client = {}, issues = [], tasks = [], nextVisit = null } = ctx;
  const lang = reportLangFromClient(client);
  const L = reportLabelsFor(lang);
  const cl = visit?.checklist || [];

  // Quick Check visits do not include routine photos or a customer-facing
  // visit report (per the published service terms). No report model is built.
  if (visit?.visit_type === QUICK_CHECK_TYPE) {
    return { reportExcluded: true, language: lang, labels: L };
  }

  // Staff-authored text written in the other script (e.g. Greek notes on an
  // English report, English notes on a Greek report). It is shown exactly as
  // recorded — never auto-translated — but flagged so staff can add a
  // translation before the report is sent.
  const GREEK_RE = /[\u0370-\u03FF\u1F00-\u1FFF]/;
  const langMismatch = (s) => {
    const t = String(s || "");
    if (!t.trim()) return false;
    if (lang === "el") return /[A-Za-z]/.test(t) && !GREEK_RE.test(t);
    return GREEK_RE.test(t);
  };

  // Greek display names for KNOWN built-in checklist items (exact match only —
  // custom item names always fall back to the stored original text).
  const itemName = (name) => {
    const base = String(name || "").trim().replace(/^\s*[A-Z]{2,}\s*[\u00B7·]\s*/, "").trim();
    const mapped = DISPLAY_LABELS[base] || base;
    return lang === "el" && CHECKLIST_ITEM_EL[base] ? CHECKLIST_ITEM_EL[base] : mapped;
  };

  // Findings: ONLY Important / Emergency items. The owner-visible flag gates
  // the recorded detail (note, recommendation, action taken, photos) — the
  // item and its priority always appear so a staff-recorded concern is never
  // silently omitted. Normal items with notes are routine checks (below),
  // never findings. Unable to Check / N/A are surfaced in their own report
  // sections — never as concern findings and never as completed checks.
  const checklistFindings = cl.filter((it) => isOwnerFinding(it)).map((it) => {
    const sk = sevFromChecklistStatus(it.status);
    const visible = !!it.owner_visible;
    return {
      title: itemName(it.name),
      severityKey: sk,
      priorityLabel: L.priorityLabels[sk],
      area: "",
      observed: visible ? (it.notes || "").trim() : "",
      recommendation: visible ? (it.recommendation || "").trim() : "",
      actionTaken: visible ? (it.action_taken || "").trim() : "",
      photos: visible ? it.photos || [] : [],
      langMismatch: visible
        ? langMismatch(it.notes) || langMismatch(it.recommendation) || langMismatch(it.action_taken)
        : false,
      source: "checklist",
    };
  });

  const issueFindings = (issues || [])
    .filter((i) => i && i.status !== "Cancelled")
    .map((i) => {
      const sk = i.priority === "Emergency" ? "urgent" : i.priority === "High" ? "attention" : "monitor";
      return {
        title: i.title || L.maintenanceItem,
        severityKey: sk,
        priorityLabel: L.priorityLabels[sk],
        area: i.category || "",
        observed: (i.description || "").trim(),
        recommendation: nextStepFromStatus(i.status),
        photos: i.before_photos || [],
        langMismatch: langMismatch(i.description),
        source: "issue",
      };
    });

  const findings = [...checklistFindings, ...issueFindings];
  const order = { urgent: 0, attention: 1, monitor: 2 };
  findings.sort((a, b) => (order[a.severityKey] ?? 2) - (order[b.severityKey] ?? 2));

  // Checklist RESULTS view: ROUTINE rows only — items completed WITHOUT a
  // concern (status Normal), plus informational Unable to Check / N-A / Not
  // Checked rows rendered gray. Attention/Emergency items are NEVER listed
  // here: they are owner-visible findings and are documented exactly once, in
  // the Visit Observations section. Private (owner_visible=false) notes are
  // never exposed. Skipped / not-checked items are ALWAYS distinguished from
  // completed checks — never inferred as "normal".
  const routineChecks = cl
    .filter((it) => !isOwnerFinding(it))
    .map((it) => {
      // The recorded note is shown ONLY when the item is owner-visible —
      // private notes never appear anywhere in the customer report. A Normal
      // item with an owner-visible note is listed here ONCE, with its note —
      // never reclassified as a concern finding.
      const visible = !!it.owner_visible;
      return {
        name: itemName(it.name),
        status: it.status || "Not Checked",
        note: visible ? (it.notes || "").trim() : "",
        langMismatch: visible ? langMismatch(it.notes) : false,
      };
    });
  // Counts derive from the ACTUAL checklist statuses — abnormal, unable, N/A
  // and not-checked items are never counted as routine/no-concern.
  const routineCount = cl.filter((it) => it.status === "Normal").length;
  const attentionCount = cl.filter((it) => it.status === "Important").length;
  const urgentCount = cl.filter((it) => it.status === "Emergency").length;
  const unableToCheck = cl
    .filter((it) => it.status === "Unable to Check")
    .map((it) => ({ name: itemName(it.name), reason: it.owner_visible ? (it.notes || "").trim() : "" }));
  const naCount = cl.filter((it) => it.status === "N/A").length;
  const naLine = naCount ? L.naLine(naCount) : "";

  // Captioned photo grid data: documentation photos attached to findings.
  const findingPhotos = findings
    .filter((f) => f.photos && f.photos.length)
    .flatMap((f) => (f.photos || []).map((url) => ({ caption: f.title, url })));

  const docPhotos = cl
    .filter((it) => !isOwnerFinding(it) && it.owner_visible && (it.photos && it.photos.length))
    .flatMap((it) => (it.photos || []).map((url) => ({ caption: itemName(it.name), url, langMismatch: langMismatch(it.name) })));

  const counts = {
    urgent: findings.filter((f) => f.severityKey === "urgent").length,
    attention: findings.filter((f) => f.severityKey === "attention").length,
    monitor: findings.filter((f) => f.severityKey === "monitor").length,
  };

  const hasMonitor = counts.monitor > 0;
  // Items left Not Checked (or Unable to Check) mean the visit was NOT a full
  // sweep — the header must never present it as fully completed.
  const incompleteCount = cl.filter((it) => !it.status || it.status === "Not Checked" || it.status === "Unable to Check").length;
  // Header status derives from the ACTUAL checklist statuses: any Emergency
  // item -> urgent, any Important item (no Emergency) -> attention. "No
  // Concerns Noted" only when NO Important/Emergency checklist item exists AND
  // every checkable item was actually checked.
  let overallStatus;
  if (urgentCount || counts.urgent) overallStatus = { key: "urgent", label: L.statusLabels.urgent };
  else if (attentionCount || counts.attention) overallStatus = { key: "attention", label: L.statusLabels.attention };
  else if (hasMonitor) overallStatus = { key: "monitor", label: L.statusLabels.monitor };
  else if (incompleteCount > 0) overallStatus = { key: "incomplete", label: L.statusLabels.incomplete };
  else overallStatus = { key: "ok", label: L.statusLabels.ok };

  const segs = [];
  if (counts.urgent) segs.push(`${counts.urgent} ${L.priorityLabels.urgent}`);
  if (counts.attention) segs.push(`${counts.attention} ${L.priorityLabels.attention}`);
  if (counts.monitor) segs.push(`${counts.monitor} ${L.priorityLabels.monitor}`);
  const priorityBreakdown = segs.join(" · ");

  // "no concerns noted" only when every applicable completed check is Normal.
  let routineLine = "";
  if (routineCount && !attentionCount && !urgentCount) {
    routineLine = L.routineNoConcernLine(routineCount);
  } else if (routineCount || attentionCount || urgentCount) {
    const rbits = [];
    if (routineCount) rbits.push(L.routineDone(routineCount));
    if (attentionCount) rbits.push(L.attentionBits(attentionCount));
    if (urgentCount) rbits.push(L.urgentBits(urgentCount));
    routineLine = rbits.join(". ") + ".";
  }

  const vtl = visitTypeLabel(visit?.visit_type) || "Property Visit";

  // Dynamic, grammar-correct owner summary. Monitor findings never imply action
  // is required, and the wording NEVER infers that the property is secure,
  // safe or problem-free from completed checks — it only states what was done
  // and points to the documented observations.
  let summaryText;
  if (findings.length === 0 && !attentionCount && !urgentCount) {
    summaryText = incompleteCount > 0 ? L.summaryIncomplete : L.summaryAllClear;
  } else {
    const parts = [L.summaryLead, L.summaryObservations];
    if (counts.urgent || counts.attention) parts.push(L.summaryReview);
    summaryText = parts.join(" ");
  }

  // Whenever any Important/Emergency checklist status exists, this states the
  // factual counts so "no concerns were noted" wording is IMPOSSIBLE while
  // abnormal items exist.
  let concernSummary = "";
  if (attentionCount || urgentCount) concernSummary = L.concernIntro(attentionCount, urgentCount);

  // Owner-selected monitoring priorities (active only).
  const monitoringPriorities = (property.monitoring_priorities || [])
    .filter((p) => p && p.active !== false && String(p.area || "").trim())
    .map((p) => String(p.area).trim());

  // Recorded visit duration — only when both timestamps exist.
  const durationMinutes = (() => {
    const s = visit?.start_time ? Date.parse(visit.start_time) : null;
    const e = visit?.end_time ? Date.parse(visit.end_time) : null;
    if (s == null || e == null || isNaN(s) || isNaN(e)) return null;
    const m = Math.round((e - s) / 60000);
    return m > 0 ? m : null;
  })();

  // Kept for backward compatibility (e.g. the delivery email).
  const detailedRecord = cl.map((it) => ({
    name: itemName(it.name),
    label: isOwnerFinding(it)
      ? (it.status === "Emergency" ? "Urgent attention" : it.status === "Important" ? "Needs attention" : "Monitor")
      : (it.status === "N/A" ? "Not applicable" : it.status === "Unable to Check" ? "Unable to check" : ((it.status === "Not Checked" || !it.status) ? "Not checked" : "Checked")),
  }));

  const result = (urgentCount || counts.urgent)
    ? L.resultUrgent
    : (attentionCount || counts.attention)
      ? L.resultAttention
      : hasMonitor
        ? L.resultObservations
        : incompleteCount > 0
          ? L.resultIncomplete
          : L.resultNoConcerns;

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
    language: lang,
    labels: L,
    visitTypeLabel: vtl,
    overallStatus,
    counts,
    priorityBreakdown,
    routineLine,
    summaryText,
    concernSummary,
    findings,
    findingPhotos,
    routineChecks,
    routineCount,
    unableToCheck,
    naCount,
    naLine,
    docPhotos,
    monitoringPriorities,
    durationMinutes,
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
// Visual direction (from the approved sample report design): navy, muted gold
// and cream; serif display headings; simple observation table; captioned photo
// grid; navy header band and footer band. Multiple pages — content flows, it
// is never shrunk to fit one page.
const NAVY = [26, 38, 46];      // #1A262E
const GOLD = [166, 137, 83];    // #A68953
const CREAM = [246, 241, 231];  // #F6F1E7
const CREAM_SOFT = [236, 229, 213];
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
  if (visit?.visit_type === QUICK_CHECK_TYPE) {
    const err = new Error("Quick Check visits do not include a customer-facing visit report.");
    err.code = "quick_check_excluded";
    throw err;
  }
  const model = buildOwnerReportModel(visit, ctx);
  const {
    business, property, client, visit: v, visitTypeLabel: vtl, labels: L,
    overallStatus, counts, priorityBreakdown, routineLine, summaryText, concernSummary,
    findings, findingPhotos, routineChecks, unableToCheck, naLine, docPhotos,
    monitoringPriorities, durationMinutes, issues, tasks, nextVisit,
  } = model;
  const sample = !!ctx.sample;
  const si = ctx.sampleInfo || {};

  const fonts = await loadReportFonts();
  // The Greek-capable fonts are REQUIRED: the standard PDF fonts cannot render
  // Greek (or €, ·, smart quotes), so a font failure STOPS report generation
  // with an actionable error instead of silently producing garbled text.
  if (!fonts) {
    const err = new Error("report fonts unavailable");
    err.code = "font_load_failed";
    throw err;
  }
  const doc = new jsPDF();
  installFonts(doc, fonts);
  const SANS = "PCCSans";
  const SERIF = "PCCSerif";
  const clean = uniClean;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageW - margin * 2;
  const BAND_H = 18;
  let y = BAND_H + 8;
  const ensure = (need) => { if (y + need > pageH - 18) { doc.addPage(); y = 16; } };
  const text = (s, x, yy) => doc.text(clean(s), x, yy);
  const wrapLines = (s, w) => doc.splitTextToSize(clean(s), w);
  const wrap = (s, w, x, lh = 5) => {
    wrapLines(s, w).forEach((l) => { ensure(lh); text(l, x, y); y += lh; });
  };
  const sectionHeading = (s) => {
    ensure(12);
    doc.setFont(SERIF, "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
    text(s, margin, y);
    const w = doc.getTextWidth(clean(s));
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.5);
    doc.line(margin + w + 3, y - 1.5, pageW - margin, y - 1.5);
    doc.setTextColor(0);
    y += 8;
  };

  // --- Header: navy band with business name (cream) + contact -----------------
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, BAND_H, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, BAND_H, pageW, 1.2, "F");
  doc.setFont(SERIF, "bold"); doc.setFontSize(14); doc.setTextColor(...CREAM);
  text(business.business_name || "Property Care Crete", margin, 11.5);
  doc.setFont(SANS, "normal"); doc.setFontSize(8); doc.setTextColor(222, 216, 204);
  const bandContact = [business.phone].filter(Boolean).join("   ·   ");
  if (bandContact) {
    const bw = doc.getTextWidth(clean(bandContact));
    text(bandContact, pageW - margin - bw, 11.5);
  }
  doc.setTextColor(0);

  // Title row (logo optional, then report title)
  let titleX = margin;
  if (business.logo) {
    try {
      const entry = await getImageForPdf(business.logo, 320, 0.85, "#ffffff");
      const r = entry.w / entry.h || 1;
      // Large enough to be readable on the page, never taller than the title row.
      let dh = 13, dw = dh * r;
      if (dw > 34) { dw = 34; dh = dw / r; }
      doc.addImage(entry.dataUrl, "JPEG", margin, y - dh / 2, dw, dh, entry.alias);
      titleX = margin + dw + 4;
    } catch (e) { /* no logo available — text-only title */ }
  }
  doc.setFont(SERIF, "bold"); doc.setFontSize(sample ? 13 : 12); doc.setTextColor(...NAVY);
  text(sample ? L.sampleTitle : L.reportTitle, titleX, y);
  y += 5.5;
  doc.setFont(SANS, "normal"); doc.setFontSize(8.5);
  if (sample) { doc.setTextColor(...GOLD); text(si.subtitle || "", margin, y); }
  else { doc.setTextColor(110); text(vtl || "Property Visit", margin, y); }
  doc.setTextColor(0);
  y += 6;

  // --- Info panel (cream) -------------------------------------------------------
  const colW = maxWidth / 2;
  const measureCell = (lbl, val) => {
    doc.setFont(SANS, "bold"); doc.setFontSize(9);
    const lblW = doc.getTextWidth(clean(lbl) + ": ");
    doc.setFont(SANS, "normal");
    return Math.max(1, doc.splitTextToSize(clean(String(val)), colW - lblW - 6).length);
  };
  const drawInfoPanel = (rows) => {
    const used = rows.map((r) => Math.max(1, ...r.filter(Boolean).map((c) => measureCell(c[0], c[1]))));
    const totalH = used.reduce((a, b) => a + b * 5, 0) + 4;
    ensure(Math.min(totalH + 4, 60));
    doc.setFillColor(...CREAM);
    doc.roundedRect(margin, y, maxWidth, totalH, 2.5, 2.5, "F");
    doc.setTextColor(...NAVY);
    let ry = y + 6;
    rows.forEach((r, ri) => {
      r.forEach((cell, ci) => {
        if (!cell) return;
        const [lbl, val] = cell;
        const x = margin + 4 + ci * colW;
        doc.setFont(SANS, "bold"); doc.setFontSize(9);
        text(lbl + ":", x, ry);
        const lblW = doc.getTextWidth(clean(lbl) + ": ");
        doc.setFont(SANS, "normal");
        doc.splitTextToSize(clean(String(val)), colW - lblW - 6).forEach((ln, li) => text(ln, x + lblW, ry + li * 5));
      });
      ry += used[ri] * 5;
    });
    doc.setTextColor(0);
    y += totalH + 5;
  };
  if (sample) {
    drawInfoPanel([
      [[L.plan, si.plan], [L.area, si.area]],
      [[L.visitShort, si.visitLabel], [L.duration, si.duration]],
    ]);
  } else {
    drawInfoPanel([
      [[L.property, property.name || "-"], [L.owner, client.name || "-"]],
      [[L.visitDate, fmtDate(v.start_time)], [L.serviceType, vtl || "-"]],
      durationMinutes != null ? [[L.duration, L.minutes(durationMinutes)], null] : null,
    ].filter(Boolean));
  }

  // Owner-selected monitoring priorities (real stored data).
  if (monitoringPriorities.length) {
    doc.setFont(SANS, "bold"); doc.setFontSize(8.5); doc.setTextColor(...NAVY);
    text(L.prioritiesHeading + ":", margin, y);
    const lblW = doc.getTextWidth(clean(L.prioritiesHeading) + ": ");
    doc.setFont(SANS, "normal"); doc.setTextColor(90);
    wrap(monitoringPriorities.join(" · "), maxWidth - lblW - 2, margin + lblW + 2, 4.5);
    y += 1;
  }

  // Overall status banner (severity colors stay semantic).
  const tone = TONE[overallStatus.key] || TONE.ok;
  ensure(12);
  doc.setFillColor(tone[0], tone[1], tone[2]);
  doc.roundedRect(margin, y, maxWidth, 11, 2, 2, "F");
  doc.setTextColor(255); doc.setFont(SANS, "bold"); doc.setFontSize(11);
  text(clean(overallStatus.label).toUpperCase(), margin + 5, y + 7.5);
  doc.setTextColor(0); y += 14;

  // Priority breakdown (each segment colored)
  if (priorityBreakdown) {
    ensure(6);
    doc.setFontSize(9.5); doc.setFont(SANS, "bold");
    const segList = [];
    if (counts.urgent) segList.push({ t: `${counts.urgent} ${L.priorityLabels.urgent}`, c: TONE.urgent });
    if (counts.attention) segList.push({ t: `${counts.attention} ${L.priorityLabels.attention}`, c: TONE.attention });
    if (counts.monitor) segList.push({ t: `${counts.monitor} ${L.priorityLabels.monitor}`, c: TONE.monitor });
    let xx = margin;
    for (let si2 = 0; si2 < segList.length; si2++) {
      const seg = segList[si2];
      const sepW = si2 > 0 ? doc.getTextWidth(" · ") : 0;
      const segW = doc.getTextWidth(clean(seg.t));
      if (xx + sepW + segW > pageW - margin) { y += 5; xx = margin; }
      else if (si2 > 0) { doc.setTextColor(170); text(" · ", xx, y); xx += sepW; }
      doc.setTextColor(seg.c[0], seg.c[1], seg.c[2]);
      text(seg.t, xx, y);
      xx += segW;
    }
    doc.setTextColor(0);
    y += 6;
  }
  if (routineLine) {
    ensure(5);
    doc.setFontSize(9); doc.setFont(SANS, "normal"); doc.setTextColor(90);
    text(routineLine, margin, y); y += 6;
  }
  y += 1;

  // Visit summary
  ensure(18);
  sectionHeading(L.visitSummary);
  doc.setFontSize(10); doc.setFont(SANS, "normal"); doc.setTextColor(45);
  wrap(summaryText, maxWidth, margin);
  doc.setTextColor(0); y += 4;

  // --- Visit Observations: simple table -----------------------------------------
  // Columns: Priority | Observation (item + recorded note) | Follow-up.
  // Follow-up comes ONLY from recorded recommendation / action taken — missing
  // data renders "No action noted", never an invented conclusion.
  const grid = async (headingOverride) => {
    if (findings.length) {
      sectionHeading(headingOverride || L.observationsHeading);
      const c1 = 32, c3 = 52, c2 = maxWidth - c1 - c3;
      const cellLines = (s, w, size = 8.5, style = "normal") => {
        doc.setFont(SANS, style); doc.setFontSize(size);
        return s ? doc.splitTextToSize(clean(s), w) : [];
      };
      // Table header (navy band, cream text)
      ensure(14);
      doc.setFillColor(...NAVY); doc.rect(margin, y, maxWidth, 8, "F");
      doc.setTextColor(...CREAM); doc.setFont(SANS, "bold"); doc.setFontSize(8.5);
      text(L.colPriority, margin + 3, y + 5.5);
      text(L.colObservation, margin + c1 + 3, y + 5.5);
      text(L.colFollowUp, margin + c1 + c2 + 3, y + 5.5);
      doc.setTextColor(0);
      y += 9;

      for (let idx = 0; idx < findings.length; idx++) {
        const f = findings[idx];
        const followUp = (f.recommendation || "").trim() || (f.actionTaken || "").trim() || L.noActionNoted;
        const pLines = cellLines(f.priorityLabel || "", c1 - 5, 7.5, "bold");
        const tLines = cellLines(f.title || "", c2 - 6, 8.5, "bold");
        const oLines = cellLines(f.observed || "", c2 - 6, 8.5, "normal");
        const fuLines = cellLines(followUp, c3 - 6, 8.5, "normal");
        const rowLines = Math.max(pLines.length, tLines.length + oLines.length, fuLines.length, 1);
        const rowH = rowLines * 4.3 + 4.5;
        if (rowH > pageH - 34) {
          // Extremely long observation: render as flowing text (still paged).
          ensure(12);
          doc.setFont(SANS, "bold"); doc.setFontSize(8); doc.setTextColor(...GOLD);
          text(f.priorityLabel || "", margin, y); y += 5;
          doc.setTextColor(30);
          if (f.title) { doc.setFont(SANS, "bold"); doc.setFontSize(9); wrap(f.title, maxWidth, margin); }
          if (f.observed) { doc.setFont(SANS, "normal"); wrap(f.observed, maxWidth - 4, margin + 3, 4.5); }
          if (followUp) wrap(followUp, maxWidth - 4, margin + 3, 4.5);
          y += 2;
        } else {
          ensure(rowH + 1);
          if (idx % 2 === 1) {
            doc.setFillColor(...CREAM);
            doc.rect(margin, y, maxWidth, rowH, "F");
          }
          doc.setFont(SANS, "bold"); doc.setFontSize(7.5); doc.setTextColor(...GOLD);
          pLines.forEach((l, li) => text(l, margin + 3, y + 5 + li * 4.3));
          let ty = y + 5;
          doc.setFont(SANS, "bold"); doc.setFontSize(8.5); doc.setTextColor(30);
          tLines.forEach((l) => { text(l, margin + c1 + 3, ty); ty += 4.3; });
          doc.setFont(SANS, "normal"); doc.setTextColor(60);
          oLines.forEach((l) => { text(l, margin + c1 + 3, ty); ty += 4.3; });
          doc.setTextColor(60);
          fuLines.forEach((l, li) => text(l, margin + c1 + c2 + 3, y + 5 + li * 4.3));
          doc.setTextColor(0);
          y += rowH;
          doc.setDrawColor(222, 216, 200); doc.setLineWidth(0.3);
          doc.line(margin, y, pageW - margin, y);
        }
      }
      y += 4;
    }
  };

  // Captioned photo grid (2 columns, aspect-ratio preserved, captioned).
  let photoFailures = 0;
  const photoGrid = async (photos) => {
    if (!photos || !photos.length) return;
    const gColW = (maxWidth - 8) / 2;
    const gBoxH = gColW * 0.72;
    let col = 0;
    for (const dp of photos) {
      try {
        const entry = await getImageForPdf(dp.url, ROUTINE_IMG_MAXW, ROUTINE_IMG_QUALITY);
        doc.setFont(SANS, "normal"); doc.setFontSize(7.5);
        const cap = wrapLines(dp.caption || "", gColW);
        const capH = cap.length * 3.5;
        if (col === 0) ensure(gBoxH + 8 + capH);
        const x = margin + col * (gColW + 8);
        drawImageFit(doc, entry, x, y, gColW, gBoxH);
        doc.setTextColor(110);
        cap.forEach((cl, ci) => text(cl, x, y + gBoxH + 4 + ci * 3.5));
        doc.setTextColor(0);
        col++;
        if (col >= 2) { col = 0; y += gBoxH + 6 + capH; }
      } catch (e) {
        photoFailures++;
        ensure(6); doc.setTextColor(150); text(L.photoUnavailable, margin, y); doc.setTextColor(0); y += 6; col = 0;
      }
    }
    if (col > 0) y += gBoxH + 12;
    y += 2;
  };

  await grid(sample ? si.observationsHeading : null);
  await photoGrid(findingPhotos);

  // Summary & Next Steps (sample mode re-labels this "Owner Update — Example").
  ensure(18);
  sectionHeading(sample ? si.summaryHeading : L.summaryNextSteps);
  doc.setFontSize(10); doc.setFont(SANS, "normal"); doc.setTextColor(40);
  if (v.summary) { wrap(v.summary, maxWidth, margin); y += 2; }
  if (concernSummary) { wrap(concernSummary, maxWidth, margin); y += 2; }
  const nextSteps = [];
  if (issues.length) nextSteps.push(L.maintenance(issues.length));
  if (tasks.length) nextSteps.push(L.followUps(tasks.length));
  if (nextVisit && nextVisit.start_time) nextSteps.push(L.nextScheduled(fmtDate(nextVisit.start_time)));
  if (!v.summary && !concernSummary && !nextSteps.length) { doc.setTextColor(120); text(L.noNextSteps, margin, y); y += 5; doc.setTextColor(0); }
  nextSteps.forEach((s) => { wrap(s, maxWidth, margin); });
  y += 4;

  // --- Sample-only explanatory blocks -------------------------------------------
  if (sample) {
    ensure(16);
    sectionHeading(si.canIncludeHeading);
    doc.setFontSize(9.5); doc.setTextColor(60);
    wrap(si.canIncludeText, maxWidth, margin);
    y += 2;
    if (findingPhotos.length) {
      ensure(6);
      doc.setFont(SANS, "normal"); doc.setFontSize(8); doc.setTextColor(...GOLD);
      wrap(si.photoNote, maxWidth, margin);
      doc.setTextColor(0); y += 2;
    }
    ensure(16);
    sectionHeading(si.photosReportsHeading);
    doc.setFontSize(9.5); doc.setTextColor(60);
    wrap(si.photosReportsText, maxWidth, margin);
    y += 2;
    ensure(16);
    sectionHeading(si.ourRoleHeading);
    doc.setFontSize(9.5); doc.setTextColor(60);
    wrap(si.ourRoleText, maxWidth, margin);
    y += 2;
  }

  // --- Routine Checks (only items completed WITHOUT a concern) -------------------
  // Attention/Emergency findings are documented once — above — and are never
  // repeated here. Gold check = checked, no concern observed. Unable to Check /
  // N/A / Not Checked render gray and are NEVER counted as passed.
  if (routineChecks.length) {
    ensure(30); // keep the heading with at least the first few checks
    sectionHeading(L.routineChecksHeading);
    const GRAY = [148, 163, 184];
    for (const rc of routineChecks) {
      doc.setFont(SANS, "bold"); doc.setFontSize(9.5);
      const nameLines = doc.splitTextToSize(clean(rc.name), maxWidth - 6);
      if (rc.status === "Normal") {
        ensure(6 + (nameLines.length - 1) * 4.8);
        drawCheck(doc, margin, y, GOLD);
        doc.setFont(SANS, "normal"); doc.setFontSize(9.5); doc.setTextColor(40);
        nameLines.forEach((l, li) => text(l, margin + 6, y + li * 4.8));
        doc.setTextColor(0);
        y += 6 + (nameLines.length - 1) * 4.8;
        continue;
      }
      const cfg = rc.status === "Unable to Check"
        ? { label: L.unableShort, lead: L.reason }
        : rc.status === "N/A"
          ? { label: L.naShort, lead: "" }
          : { label: L.notCheckedShort, lead: "" };
      // The status label follows the last name line inline when it fits;
      // otherwise it wraps to its own line — it can never overlap the name or
      // run past the right margin.
      const GAP = 2.5;
      doc.setFont(SANS, "normal"); doc.setFontSize(9.5);
      const lastLineW = doc.getTextWidth(nameLines[nameLines.length - 1] || "");
      doc.setFontSize(7.5);
      const lbl = " - " + cfg.label;
      const lblW = doc.getTextWidth(clean(lbl));
      const lblInline = lastLineW + GAP + lblW <= maxWidth - 6;
      const noteLines = rc.note ? doc.splitTextToSize(clean(rc.note), maxWidth - 12).length : 0;
      const leadH = rc.note && cfg.lead ? 4.5 : 0;
      // Keep the whole row (name, status label, note) together on one page.
      ensure(5 + (nameLines.length - 1) * 4.8 + (lblInline ? 0 : 4.8) + leadH + noteLines * 4.5 + 3);
      doc.setFont(SANS, "bold"); doc.setFontSize(10); doc.setTextColor(...GRAY);
      text("-", margin, y);
      doc.setFont(SANS, "bold"); doc.setFontSize(9.5); doc.setTextColor(40);
      nameLines.forEach((l, li) => text(l, margin + 6, y + li * 4.8));
      doc.setFont(SANS, "bold"); doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      if (lblInline) text(lbl, margin + 6 + lastLineW + GAP, y + (nameLines.length - 1) * 4.8);
      else text(lbl, margin + 6, y + nameLines.length * 4.8);
      doc.setTextColor(0); doc.setFont(SANS, "normal");
      y += 5 + (nameLines.length - 1) * 4.8 + (lblInline ? 0 : 4.8);
      // Explanation comes ONLY from this exact item's note (already blank for
      // private items in the model). Never invented, never borrowed.
      if (rc.note) {
        if (cfg.lead) {
          doc.setFont(SANS, "bold"); doc.setFontSize(8.5); doc.setTextColor(70);
          text(cfg.lead, margin + 8, y); y += 4.5;
        }
        doc.setFont(SANS, "normal"); doc.setTextColor(60); doc.setFontSize(9);
        wrap(rc.note, maxWidth - 12, margin + 10, 4.5);
      }
      y += 2.5;
    }
    y += 3;
  }

  // --- Routine Visit Photos (routine documentation; not findings) ---------------
  if (docPhotos && docPhotos.length) {
    ensure(20);
    sectionHeading(L.routinePhotos);
    doc.setFont(SANS, "normal"); doc.setFontSize(8.5); doc.setTextColor(110);
    text(L.routinePhotosSub, margin, y); y += 7;
    doc.setTextColor(0);
    await photoGrid(docPhotos);
  }

  // Scope statement (exact required wording) + gold rule. The page break is
  // measured from the actual wrapped line count — never a guessed block height.
  doc.setFont(SANS, "normal"); doc.setFontSize(8);
  const scopeLines = doc.splitTextToSize(clean(L.scopeStatement), maxWidth);
  ensure(5 + scopeLines.length * 4);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y); y += 5;
  doc.setFont(SANS, "normal"); doc.setFontSize(8); doc.setTextColor(90);
  wrap(L.scopeStatement, maxWidth, margin, 4);
  doc.setTextColor(0);

  // --- Footer: navy band + page numbers on every page ----------------------------
  const pages = doc.internal.getNumberOfPages();
  const genDate = athensMediumDateTime(new Date().toISOString());
  const FOOT_H = 9;
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - FOOT_H, pageW, FOOT_H, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, pageH - FOOT_H - 1, pageW, 0.8, "F");
    doc.setFont(SANS, "normal"); doc.setFontSize(8); doc.setTextColor(...CREAM);
    const site = clean(business.website || "propertycarecrete.com");
    text(site, margin, pageH - 3.5);
    const right = [business.phone].filter(Boolean).join("  |  ");
    if (right) {
      const rw = doc.getTextWidth(clean(right));
      text(right, pageW - margin - rw, pageH - 3.5);
    }
    doc.setFontSize(7.5); doc.setTextColor(140);
    text(L.generated(genDate), margin, pageH - FOOT_H - 2.5);
    const pg = L.pageOf(p, pages);
    text(pg, pageW - margin - doc.getTextWidth(clean(pg)), pageH - FOOT_H - 2.5);
    doc.setTextColor(0);
  }

  return { doc, photoFailures };
}

function fileSlug(property) {
  return (property?.name || "property").replace(/\s+/g, "-").toLowerCase();
}

export async function generateVisitReportPdf(visit, ctx = {}) {
  const { doc } = await buildDoc(visit, ctx);
  doc.save(ctx.sample ? "sample-visit-report.pdf" : `visit-report-${fileSlug(ctx.property)}.pdf`);
}

export async function generateVisitReportPdfBlob(visit, ctx = {}) {
  const { doc } = await buildDoc(visit, ctx);
  return doc.output("blob");
}

// Generates the PDF and stores it in PRIVATE storage. Customer reports must
// never live behind a permanent public URL: staff re-open the stored PDF via a
// short-lived signed URL, and the emailed copy travels as an email attachment.
export async function generateAndStoreReportPdf(visit, ctx = {}) {
  const { base44 } = await import("@/api/base44Client");
  const { doc, photoFailures } = await buildDoc(visit, ctx);
  const blob = doc.output("blob");
  const file = new File([blob], `visit-report-${fileSlug(ctx.property)}.pdf`, { type: "application/pdf" });
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  return { file_uri, blob, photoFailures: photoFailures || 0 };
}

// --- Report content fingerprint -------------------------------------------------
// A stable fingerprint of EVERY input that shapes the rendered report. Captured
// when staff approve the PDF; re-computed before sending. Any difference means
// the data changed since approval and the stored PDF is invalid — re-approval
// is required before delivery. Bump REPORT_TEMPLATE_VERSION whenever the
// report layout/wording changes so older approvals are invalidated too.
export const REPORT_TEMPLATE_VERSION = 2;

function stableStringify(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join("|")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value)
      .filter((k) => k !== "created_date" && k !== "updated_date" && k !== "created_by_id")
      .sort();
    return `{${keys.map((k) => `${k}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return String(value);
}

export function reportContentFingerprint(visit, ctx = {}) {
  const { business = {}, property = {}, client = {}, issues = [], tasks = [] } = ctx;
  const payload = {
    template: REPORT_TEMPLATE_VERSION,
    visit: {
      visit_type: visit?.visit_type || "",
      start_time: visit?.start_time || "",
      end_time: visit?.end_time || "",
      summary: visit?.summary || "",
      checklist: (visit?.checklist || []).map((it) => ({
        name: it?.name || "",
        status: it?.status || "",
        notes: it?.notes || "",
        recommendation: it?.recommendation || "",
        action_taken: it?.action_taken || "",
        owner_visible: !!it?.owner_visible,
        photos: it?.photos || [],
      })),
    },
    property: {
      name: property?.name || "",
      monitoring_priorities: (property?.monitoring_priorities || [])
        .filter((p) => p && p.active !== false)
        .map((p) => String(p?.area || "").trim()),
    },
    client: { name: client?.name || "", preferred_language: client?.preferred_language || "" },
    business: {
      business_name: business?.business_name || "",
      phone: business?.phone || "",
      website: business?.website || "",
      logo: business?.logo || "",
    },
    issues: (issues || []).map((i) => ({
      id: i?.id || "", title: i?.title || "", priority: i?.priority || "",
      status: i?.status || "", category: i?.category || "",
      description: i?.description || "", before_photos: i?.before_photos || [],
    })),
    tasks: (tasks || []).map((tk) => ({ id: tk?.id || "", title: tk?.title || "" })),
  };
  const s = stableStringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return `${h.toString(36)}-${s.length.toString(36)}`;
}