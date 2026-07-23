import { base44 } from "@/api/base44Client";

export function exportCsv(rows, columns, filename) {
  if (!rows || !rows.length) {
    alert("No records to export");
    return;
  }
  const headers = columns.map((c) => c.label || c.key);
  const esc = (v) => {
    let s = (v ?? "").toString();
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    lines.push(
      columns
        .map((c) => esc(c.render ? c.render(r, {}) : r[c.key]))
        .join(",")
    );
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const SKIP_KEYS = ["checklist", "photos", "before_photos", "during_photos", "after_photos", "photos_attached", "primary_photo", "receipt_photo", "logo"];

export async function exportEntityCsv(entityName, filename) {
  try {
    const rows = await base44.entities[entityName].list("-created_date", 1000);
    if (!rows || !rows.length) {
      alert(`No ${entityName} records to export`);
      return;
    }
    const keySet = new Set();
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => keySet.add(k)));
    const cols = [...keySet]
      .filter((k) => !SKIP_KEYS.includes(k))
      .map((k) => ({ key: k, label: k }));
    exportCsv(rows, cols, filename || `${entityName}.csv`);
  } catch (e) {
    alert("Export failed: " + (e?.message || e));
  }
}