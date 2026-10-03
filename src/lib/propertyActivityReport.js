// Staff property activity report — operational summary of visits, maintenance
// and expenses for one property or across all properties. Deliberately separate
// from the approved customer visit-report workflow: never sent to owners, no
// approval gate, and customer-report exclusions (e.g. Quick Check reports) are
// NOT applied — Quick Check visits are still part of the staff activity data.
//
// Data sources (audited): PropertyVisit is the operational visit record (the
// legacy Inspection entity is empty and is NOT read). MaintenanceIssue and
// Expense are read directly. Records are only ever reported as recorded —
// missing dates, results, categories or follow-ups render as "—"/"None
// recorded", never as invented values or inferred "normal" checks.
import jsPDF from "jspdf";
import { NAVY, GOLD, CREAM, loadReportFonts, installFonts, uniClean } from "@/lib/visitReport";
import { isQaProperty } from "@/lib/qaGuard";
import { visitTypeLabelFor, isQuickCheckVisit } from "@/lib/visitTypeLabels";
import { athensDate, athensMediumDateTime } from "@/lib/timezone";

// --- Labels (en / el) -----------------------------------------------------------
export function activityLabels(lang) {
  if (lang === "el") {
    return {
      title: "Αναφορά Δραστηριότητας Ακινήτων",
      property: "Ακίνητο",
      allProperties: "Όλα τα ακίνητα",
      period: "Περίοδος",
      allDates: "Όλες οι ημερομηνίες",
      rangeJoin: " – ",
      generated: "Δημιουργήθηκε",
      includeTest: "Συμπεριλήφθηκαν δοκιμαστικές εγγραφές.",
      testExcludedNote: "Τα δοκιμαστικά ακίνητα εξαιρέθηκαν.",
      qaHint: "Δοκιμαστικό ακίνητο — ενεργοποιήστε «Include test records» για να συμπεριληφθούν οι εγγραφές του.",
      overview: "Επισκόπηση",
      visits: "Επισκέψεις",
      maintenance: "Συντήρηση",
      expenses: "Έξοδα",
      outstanding: "Εκκρεμή ζητήματα συντήρησης",
      recordedExpenses: "Καταγεγραμμένα έξοδα",
      visitsByStatus: "Επισκέψεις ανά κατάσταση",
      colDate: "Ημερομηνία",
      colService: "Τύπος υπηρεσίας",
      colStatus: "Κατάσταση",
      colResult: "Αποτέλεσμα",
      colIssue: "Ζήτημα",
      colPriority: "Προτεραιότητα",
      colReported: "Αναφέρθηκε",
      colFollowUp: "Παρακολούθηση",
      colDescription: "Περιγραφή",
      colCategory: "Κατηγορία",
      colAmount: "Ποσό",
      total: "Σύνολο",
      statusLabels: { Scheduled: "Προγραμματισμένη", "In Progress": "Σε εξέλιξη", Completed: "Ολοκληρώθηκε", Cancelled: "Ακυρώθηκε" },
      priorityLabels: { Routine: "Τακτική", Medium: "Μεσαία", High: "Υψηλή", Emergency: "Επείγουσα" },
      resultUrgent: "Απαιτεί άμεση προσοχή",
      resultAttention: "Χρειάζεται προσοχή",
      resultIncomplete: "Μερικός έλεγχος",
      resultNoConcerns: "Χωρίς παρατηρήσεις",
      resultNoChecklist: "Χωρίς καταγεγραμμένους ελέγχους",
      resultQuickCheck: "Γρήγορος έλεγχος (χωρίς αναφορά πελάτη)",
      noVisits: "Καμία επίσκεψη σε αυτή την περίοδο.",
      noMaintenance: "Κανένα ζήτημα συντήρησης σε αυτή την περίοδο.",
      noExpenses: "Κανένα έξοδο σε αυτή την περίοδο.",
      noFollowUp: "Χωρίς καταγεγραμμένη παρακολούθηση",
      unassignedProperty: "Χωρίς ορισμένο ακίνητο",
      unassignedSection: "Εγγραφές χωρίς αντιστοίχιση ακινήτου",
    };
  }
  return {
    title: "Property Activity Report",
    property: "Property",
    allProperties: "All Properties",
    period: "Period",
    allDates: "All dates",
    rangeJoin: " – ",
    generated: "Generated",
    includeTest: "Includes test records.",
    testExcludedNote: "Test properties were excluded.",
    qaHint: "This is a test property — enable \"Include test records\" to include its records.",
    overview: "Overview",
    visits: "Visits",
    maintenance: "Maintenance",
    expenses: "Expenses",
    outstanding: "Outstanding maintenance",
    recordedExpenses: "Recorded expenses",
    visitsByStatus: "Visits by status",
    colDate: "Date",
    colService: "Service type",
    colStatus: "Status",
    colResult: "Result",
    colIssue: "Issue",
    colPriority: "Priority",
    colReported: "Reported",
    colFollowUp: "Follow-up",
    colDescription: "Description",
    colCategory: "Category",
    colAmount: "Amount",
    total: "Total",
    statusLabels: { Scheduled: "Scheduled", "In Progress": "In Progress", Completed: "Completed", Cancelled: "Cancelled" },
    priorityLabels: { Routine: "Routine", Medium: "Medium", High: "High", Emergency: "Emergency" },
    resultUrgent: "Urgent attention",
    resultAttention: "Needs attention",
    resultIncomplete: "Partially checked",
    resultNoConcerns: "No concerns noted",
    resultNoChecklist: "No checks recorded",
    resultQuickCheck: "Quick check (no customer report)",
    noVisits: "No visits in this period.",
    noMaintenance: "No maintenance issues in this period.",
    noExpenses: "No expenses in this period.",
    noFollowUp: "None recorded",
    unassignedProperty: "Property not set",
    unassignedSection: "Records without a property",
  };
}

// --- Report model ---------------------------------------------------------------
export function buildActivityReportModel(input = {}) {
  const {
    propertyId = "", startDate = "", endDate = "", includeTest = false,
    properties = [], visits = [], issues = [], expenses = [], business = {},
  } = input;
  const lang = business?.language === "Greek" ? "el" : "en";
  const L = activityLabels(lang);
  const propMap = new Map(properties.map((p) => [p.id, p]));
  const propName = (id) => (propMap.get(id)?.name || "").trim() || L.unassignedProperty;

  const isQaRec = (rec) => {
    const p = propMap.get(rec?.property_id);
    return !!p && isQaProperty(p);
  };
  const inScope = (rec) => {
    if (!rec || rec.archived) return false;
    const pid = rec.property_id || "";
    if (propertyId && pid !== propertyId) return false;
    // QA/test properties are excluded by default in All Properties scope.
    if (!propertyId && !includeTest && isQaRec(rec)) return false;
    return true;
  };
  const hasRange = !!(startDate || endDate);
  // Undated records are never silently dropped from totals; the date filter
  // applies only to records that actually carry a date.
  const inRange = (iso) => {
    if (!hasRange) return true;
    if (!iso) return true;
    const d = athensDate(iso);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  const vis = visits.filter(inScope).filter((r) => inRange(r.start_time));
  const mnt = issues.filter(inScope).filter((r) => inRange(r.created_date));
  const exp = expenses.filter(inScope).filter((r) => inRange(r.date));
  const sortDesc = (f) => (a, b) => String(b[f] || "").localeCompare(String(a[f] || ""));
  vis.sort(sortDesc("start_time"));
  mnt.sort(sortDesc("created_date"));
  exp.sort(sortDesc("date"));

  // Recorded result — computed ONLY from recorded checklist statuses. Non-
  // completed visits show "—" (nothing was recorded); a Quick Check visit says
  // so explicitly; missing/unchecked items are never counted as "normal".
  const visitRows = vis.map((v) => {
    const cl = v.checklist || [];
    let resultKey = "dash";
    if (v.status === "Completed") {
      if (isQuickCheckVisit(v)) resultKey = "quickCheck";
      else if (cl.length === 0) resultKey = "noChecklist";
      else if (cl.some((c) => c.status === "Emergency")) resultKey = "urgent";
      else if (cl.some((c) => c.status === "Important")) resultKey = "attention";
      else if (cl.some((c) => !c.status || c.status === "Not Checked" || c.status === "Unable to Check")) resultKey = "incomplete";
      else resultKey = "noConcerns";
    }
    return {
      date: v.start_time || "",
      serviceType: visitTypeLabelFor(v.visit_type, lang) || v.visit_type || "—",
      status: L.statusLabels[v.status] || v.status || "—",
      resultKey,
      summary: (v.summary || "").trim(),
      property_id: v.property_id || "",
    };
  });

  const maintRows = mnt.map((m) => {
    const fus = m.follow_ups || [];
    const lastFu = fus.length ? fus[fus.length - 1] : null;
    const followUp = (lastFu?.note || "").trim() || (m.resolution_note || "").trim() || "";
    return {
      title: m.title || "—",
      priority: L.priorityLabels[m.priority] || m.priority || "—",
      status: m.status || "—",
      reported: m.created_date || "",
      followUp,
      property_id: m.property_id || "",
    };
  });

  const expenseRows = exp.map((e) => ({
    date: e.date || "",
    description: (e.vendor || "").trim(),
    category: (e.category || "").trim(),
    amount: Number(e.amount || 0),
    property_id: e.property_id || "",
  }));
  const expensesTotal = expenseRows.reduce((s, e) => s + e.amount, 0);

  const visitsByStatus = {};
  vis.forEach((v) => {
    const s = v.status || "—";
    visitsByStatus[s] = (visitsByStatus[s] || 0) + 1;
  });
  const outstanding = mnt.filter((m) => m.status !== "Completed" && m.status !== "Cancelled").length;

  // Property grouping. One property → a single section. All Properties → one
  // section per property (name-sorted) plus a clearly labeled section for
  // records whose property association is missing or unresolved.
  // Records with no property_id, or a property_id whose Property record is not
  // loaded/unresolved, are grouped under the labeled unassigned section — they
  // are never dropped from per-property groupings or totals.
  const matchesGroup = (r, id) => (id ? r.property_id === id : (!r.property_id || !propMap.has(r.property_id)));
  const groupFor = (id) => ({
    id,
    name: id ? propName(id) : L.unassignedSection,
    visits: visitRows.filter((r) => matchesGroup(r, id)),
    maintenance: maintRows.filter((r) => matchesGroup(r, id)),
    expenses: expenseRows.filter((r) => matchesGroup(r, id)),
  });
  const groupTotal = (g) => g.expenses.reduce((s, e) => s + e.amount, 0);
  let grouped = [];
  if (propertyId) {
    const g = groupFor(propertyId);
    grouped = [{ ...g, expensesTotal: groupTotal(g) }];
  } else {
    const idSet = new Set([...visitRows, ...maintRows, ...expenseRows].map((r) => r.property_id || ""));
    const known = [...idSet].filter((id) => id && propMap.has(id))
      .sort((a, b) => propName(a).localeCompare(propName(b), lang === "el" ? "el" : "en"));
    grouped = known.map((id) => ({ ...groupFor(id), expensesTotal: groupTotal(groupFor(id)) }));
    const unassignedRows = visitRows.filter((r) => !r.property_id || !propMap.has(r.property_id)).length
      + maintRows.filter((r) => !r.property_id || !propMap.has(r.property_id)).length
      + expenseRows.filter((r) => !r.property_id || !propMap.has(r.property_id)).length;
    if (unassignedRows > 0) {
      const g = groupFor("");
      grouped.push({ ...g, expensesTotal: groupTotal(g) });
    }
  }

  const selectedProp = propertyId ? propMap.get(propertyId) : null;
  return {
    lang,
    labels: L,
    propertyId,
    hasRange,
    startDate,
    endDate,
    includeTest,
    scopeName: propertyId ? propName(propertyId) : L.allProperties,
    isQaSelection: !!selectedProp && isQaProperty(selectedProp),
    overview: { visitsByStatus, visitTotal: vis.length, outstanding, maintenanceTotal: mnt.length, expensesCount: exp.length, expensesTotal },
    visitRows,
    maintRows,
    expenseRows,
    expensesTotal,
    grouped,
  };
}

// --- PDF rendering ---------------------------------------------------------------
// Navy/gold/cream branding matching the customer report, Greek-capable embedded
// fonts, wrapped table text (nothing clipped), page numbers and page breaks.
const TONE_ATTENTION = [245, 158, 11];
const TONE_URGENT = [239, 68, 68];
const GRAY = [110, 110, 110];

function money(n) {
  return `€${Number(n || 0).toFixed(2)}`;
}

export async function generateActivityReportPdf(input) {
  const model = buildActivityReportModel(input);
  const { business = {} } = input;
  const { lang, labels: L } = model;
  const fonts = await loadReportFonts();
  // Greek text requires the embedded fonts; a failed download stops generation
  // with an actionable error (same behavior as the customer report).
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
  let y = BAND_H + 10;
  const ensure = (need) => { if (y + need > pageH - 22) { doc.addPage(); y = 18; } };
  const text = (s, x, yy) => doc.text(clean(s), x, yy);
  const wrapLines = (s, w) => (s ? doc.splitTextToSize(clean(s), w) : []);
  const wrap = (s, w, x, lh = 5, color = null) => {
    if (color) doc.setTextColor(...color);
    wrapLines(s, w).forEach((l) => { ensure(lh); text(l, x, y); y += lh; });
    if (color) doc.setTextColor(0);
  };
  const fmtDay = (iso) => (iso ? athensDate(iso) : "—");
  const RESULT_TEXT = {
    urgent: L.resultUrgent, attention: L.resultAttention, incomplete: L.resultIncomplete,
    noConcerns: L.resultNoConcerns, noChecklist: L.resultNoChecklist, quickCheck: L.resultQuickCheck, dash: "—",
  };
  const resultColor = (key) => (key === "urgent" ? TONE_URGENT : key === "attention" ? TONE_ATTENTION : null);

  // Header band (navy + gold) with business name.
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, BAND_H, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, BAND_H, pageW, 1.2, "F");
  doc.setFont(SERIF, "bold"); doc.setFontSize(14); doc.setTextColor(...CREAM);
  text(business.business_name || "Property Care Crete", margin, 11.5);
  doc.setFont(SANS, "normal"); doc.setFontSize(8); doc.setTextColor(222, 216, 204);
  if (business.phone) {
    const bw = doc.getTextWidth(clean(business.phone));
    text(business.phone, pageW - margin - bw, 11.5);
  }
  doc.setTextColor(0);

  // Title + prominent property name.
  doc.setFont(SERIF, "bold"); doc.setFontSize(15); doc.setTextColor(...NAVY);
  text(L.title, margin, y);
  y += 8;
  doc.setFont(SERIF, "bold"); doc.setFontSize(model.propertyId ? 17 : 13); doc.setTextColor(...NAVY);
  text(model.scopeName, margin, y);
  y += 7;
  doc.setFont(SANS, "normal"); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
  text(`${L.generated}: ${athensMediumDateTime(new Date().toISOString(), lang)}`, margin, y);
  doc.setTextColor(0);
  y += 6;

  // Scope notes (test-record handling) — shown honestly, never silently.
  const notes = [];
  if (model.isQaSelection && !model.includeTest) notes.push(L.qaHint);
  else if (model.includeTest) notes.push(L.includeTest);
  else if (!model.propertyId) notes.push(L.testExcludedNote);
  const periodText = model.hasRange
    ? `${model.startDate || "…"}${L.rangeJoin}${model.endDate || "…"}`
    : L.allDates;

  // Info panel (cream): property + period.
  const infoRows = model.propertyId ? [[L.period, periodText]] : [[L.property, L.allProperties], [L.period, periodText]];
  const colW = maxWidth / 2;
  doc.setFillColor(...CREAM);
  const panelH = infoRows.length * 5 + 4;
  ensure(panelH + 4);
  doc.roundedRect(margin, y, maxWidth, panelH, 2.5, 2.5, "F");
  doc.setTextColor(...NAVY);
  let ry = y + 6;
  infoRows.forEach((r, ri) => {
    r.forEach((cell, ci) => {
      if (!cell) return;
      doc.setFont(SANS, "bold"); doc.setFontSize(9);
      text(cell + ":", margin + 4 + ci * colW, ry);
      doc.setFont(SANS, "normal");
      doc.splitTextToSize(clean(String(r[ci + 1] || "")), colW - doc.getTextWidth(clean(cell) + ": ") - 8)
        .forEach((ln, li) => text(ln, margin + 4 + ci * colW + doc.getTextWidth(clean(cell) + ": "), ry + li * 5));
    });
    ry += 5;
  });
  doc.setTextColor(0);
  y += panelH + 4;
  notes.forEach((n) => { doc.setFont(SANS, "normal"); doc.setFontSize(8); wrap(n, maxWidth, margin, 4, [150, 100, 20]); y += 1; });
  y += 2;

  // Overview block (cream): visits by status, outstanding maintenance, expenses.
  sectionOverview();
  function sectionOverview() {
    const statusSegs = Object.entries(model.overview.visitsByStatus)
      .map(([s, n]) => `${n} ${L.statusLabels[s] || s}`);
    const lines = [
      `${L.visitsByStatus}: ${statusSegs.length ? statusSegs.join(" · ") : "0"}`,
      `${L.outstanding}: ${model.overview.outstanding}`,
      `${L.recordedExpenses}: ${money(model.overview.expensesTotal)} (${model.overview.expensesCount})`,
    ];
    const h = lines.length * 5 + 8;
    ensure(h + 4);
    doc.setFillColor(...CREAM);
    doc.roundedRect(margin, y, maxWidth, h, 2.5, 2.5, "F");
    doc.setTextColor(...NAVY);
    doc.setFont(SANS, "bold"); doc.setFontSize(9);
    let oy = y + 6;
    lines.forEach((l) => { text(l, margin + 4, oy); oy += 5; });
    doc.setTextColor(0);
    y += h + 6;
  }

  // Generic wrapped-text table. Rows never clipped: every cell is measured and
  // wrapped, the row height derives from the actual line counts, and the whole
  // row is kept together on one page.
  const renderTable = (cols, rows, emptyMsg) => {
    if (!rows.length) {
      ensure(8);
      doc.setFont(SANS, "normal"); doc.setFontSize(8.5); doc.setTextColor(130);
      text(emptyMsg, margin, y);
      doc.setTextColor(0);
      y += 8;
      return;
    }
    const scale = maxWidth / cols.reduce((s, c) => s + c.w, 0);
    cols = cols.map((c) => ({ ...c, w: c.w * scale }));
    const xs = [];
    let xx = margin;
    cols.forEach((c) => { xs.push(xx); xx += c.w; });
    ensure(16);
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, maxWidth, 7.5, "F");
    doc.setTextColor(...CREAM); doc.setFont(SANS, "bold"); doc.setFontSize(8);
    cols.forEach((c, i) => {
      const lw = doc.getTextWidth(clean(c.label));
      const x = c.align === "right" ? xs[i] + c.w - 3 - lw : xs[i] + 3;
      text(c.label, x, y + 5.2);
    });
    doc.setTextColor(0);
    y += 9.5;
    rows.forEach((row, ri) => {
      const cellLineArrs = row.cells.map((cell, ci) => {
        doc.setFont(SANS, row.bold ? "bold" : "normal"); doc.setFontSize(8.5);
        return wrapLines(cell, cols[ci].w - 6);
      });
      const extraLines = row.extra ? wrapLines(row.extra, maxWidth - 14) : [];
      const mainH = Math.max(1, ...cellLineArrs.map((a) => a.length)) * 4.4;
      const rowH = mainH + extraLines.length * 4.2 + 3;
      ensure(rowH + 1);
      if (ri % 2 === 1) { doc.setFillColor(...CREAM); doc.rect(margin, y, maxWidth, rowH, "F"); }
      cellLineArrs.forEach((lines, ci) => {
        doc.setFont(SANS, row.bold ? "bold" : "normal"); doc.setFontSize(8.5);
        doc.setTextColor(row.colors?.[ci] || (row.bold ? 30 : 60));
        lines.forEach((l, li) => {
          const lw = doc.getTextWidth(l);
          const x = cols[ci].align === "right" ? xs[ci] + cols[ci].w - 3 - lw : xs[ci] + 3;
          text(l, x, y + 5 + li * 4.4);
        });
      });
      doc.setTextColor(0);
      if (extraLines.length) {
        doc.setFont(SANS, "normal"); doc.setFontSize(7.8); doc.setTextColor(...GRAY);
        extraLines.forEach((l, li) => text(l, margin + 8, y + mainH + 2 + li * 4.2));
        doc.setTextColor(0);
      }
      y += rowH;
      doc.setDrawColor(222, 216, 200); doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
    });
    y += 4;
  };

  const subHeading = (s) => {
    ensure(10);
    doc.setFont(SANS, "bold"); doc.setFontSize(9.5); doc.setTextColor(...NAVY);
    text(s, margin, y);
    doc.setTextColor(0);
    y += 5.5;
  };

  const renderSections = (sec) => {
    // Visits
    subHeading(L.visits);
    renderTable(
      [
        { w: 22, label: L.colDate },
        { w: 50, label: L.colService },
        { w: 22, label: L.colStatus },
        { w: 44, label: L.colResult },
      ],
      sec.visits.map((r) => ({
        cells: [fmtDay(r.date), r.serviceType, r.status, RESULT_TEXT[r.resultKey] || "—"],
        colors: [null, null, null, resultColor(r.resultKey)],
        extra: r.summary || null,
      })),
      L.noVisits
    );
    // Maintenance
    subHeading(L.maintenance);
    renderTable(
      [
        { w: 44, label: L.colIssue },
        { w: 20, label: L.colPriority },
        { w: 24, label: L.colStatus },
        { w: 20, label: L.colReported },
        { w: 44, label: L.colFollowUp },
      ],
      sec.maintenance.map((r) => ({
        cells: [r.title, r.priority, r.status, fmtDay(r.reported), r.followUp || L.noFollowUp],
      })),
      L.noMaintenance
    );
    // Expenses
    subHeading(L.expenses);
    const expRows = sec.expenses.map((r) => ({
      cells: [fmtDay(r.date), r.description || "—", r.category || "—", money(r.amount)],
    }));
    if (sec.expenses.length) {
      expRows.push({ cells: ["", "", L.total, money(sec.expensesTotal)], bold: true });
    }
    renderTable(
      [
        { w: 20, label: L.colDate },
        { w: 52, label: L.colDescription },
        { w: 30, label: L.colCategory },
        { w: 24, label: L.colAmount, align: "right" },
      ],
      expRows,
      L.noExpenses
    );
  };

  if (model.propertyId) {
    // The property name is already prominent at the top — sections directly.
    renderSections(model.grouped[0]);
  } else {
    model.grouped.forEach((sec) => {
      sectionHeading(sec.name, sec.id !== "__unassigned__");
      renderSections(sec);
      y += 3;
    });
  }

  // Footer: navy band + page numbers on every page.
  const pages = doc.internal.getNumberOfPages();
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
    if (business.phone) {
      const rw = doc.getTextWidth(clean(business.phone));
      text(business.phone, pageW - margin - rw, pageH - 3.5);
    }
    doc.setFontSize(7.5); doc.setTextColor(140);
    text(`${L.generated}: ${athensMediumDateTime(new Date().toISOString(), lang)}`, margin, pageH - FOOT_H - 2.5);
    const pg = `${p} / ${pages}`;
    text(pg, pageW - margin - doc.getTextWidth(clean(pg)), pageH - FOOT_H - 2.5);
    doc.setTextColor(0);
  }

  return { doc, model };
}

export async function saveActivityReportPdf(input) {
  const { doc, model } = await generateActivityReportPdf(input);
  const scope = (input.propertyId ? model.scopeName : "all-properties")
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").toLowerCase() || "report";
  doc.save(`activity-report-${scope}.pdf`);
  return model;
}