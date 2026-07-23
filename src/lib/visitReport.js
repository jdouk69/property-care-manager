import jsPDF from "jspdf";

export function generateVisitReportPdf(visit, propertyName, visitType) {
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(16); doc.setFont(undefined, "bold");
  doc.text("Property Visit Report", 14, y); y += 8;
  doc.setFontSize(10); doc.setFont(undefined, "normal");
  doc.text(`Property: ${propertyName || "—"}`, 14, y); y += 6;
  doc.text(`Visit type: ${visitType || "—"}`, 14, y); y += 6;
  doc.text(`Date: ${(visit.start_time || "").slice(0, 10)}`, 14, y); y += 6;
  doc.text(`Start: ${(visit.start_time || "").slice(11, 16)}   End: ${(visit.end_time || "").slice(11, 16)}`, 14, y); y += 6;
  if (visit.gps_location) { doc.text(`GPS: ${visit.gps_location}`, 14, y); y += 6; }
  y += 4;

  doc.setFont(undefined, "bold"); doc.text("Checklist Findings", 14, y); y += 6; doc.setFont(undefined, "normal");
  (visit.checklist || []).forEach((it) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const mark = it.status === "Normal" ? "OK" : it.status === "Not Checked" ? "--" : "!";
    doc.text(`[${mark}] ${it.name}  (${it.status || "Not Checked"})`, 14, y); y += 5;
    if (it.notes) { doc.splitTextToSize(`Notes: ${it.notes}`, 180).forEach((l) => { doc.text(l, 18, y); y += 5; }); }
    if (it.photos && it.photos.length) { doc.text(`Photos: ${it.photos.length} attached`, 18, y); y += 5; }
  });
  y += 4;

  if (visit.meter_readings && visit.meter_readings.length) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont(undefined, "bold"); doc.text("Meter Readings", 14, y); y += 6; doc.setFont(undefined, "normal");
    visit.meter_readings.forEach((m) => { doc.text(`${m.label}: ${m.value}`, 14, y); y += 5; });
    y += 4;
  }

  if (visit.maintenance_issue_ids && visit.maintenance_issue_ids.length) {
    doc.setFont(undefined, "bold"); doc.text(`Maintenance issues created: ${visit.maintenance_issue_ids.length}`, 14, y); y += 6; doc.setFont(undefined, "normal");
  }
  if (visit.follow_up_task_ids && visit.follow_up_task_ids.length) {
    doc.text(`Follow-up tasks created: ${visit.follow_up_task_ids.length}`, 14, y); y += 6;
  }
  y += 4;

  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFont(undefined, "bold"); doc.text("Summary & Recommendations", 14, y); y += 6; doc.setFont(undefined, "normal");
  doc.splitTextToSize(visit.summary || "No summary provided.", 180).forEach((l) => { doc.text(l, 14, y); y += 5; });
  y += 6;
  doc.setFontSize(8); doc.setTextColor(120);
  doc.splitTextToSize("This report reflects visual observations only and does not constitute a professional inspection, engineering certification, or construction supervision.", 180).forEach((l) => { doc.text(l, 14, y); y += 4; });

  doc.save(`visit-report-${(propertyName || "property").replace(/\s+/g, "-").toLowerCase()}.pdf`);
}