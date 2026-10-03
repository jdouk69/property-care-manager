// Invoice numbering — backend twin of nextInvoiceNumber/isActiveInvoice in
// src/lib/invoiceGeneration.js. The two copies MUST stay identical.
// INV-<year>-001, INV-<year>-002, … — next unused sequence for the year.
// Scans every known invoice (any status) so numbers are never reused.
export function nextInvoiceNumber(invoices = [], year) {
  const prefix = `INV-${year}-`;
  let max = 0;
  for (const inv of invoices || []) {
    const n = String(inv?.invoice_number || "");
    if (!n.startsWith(prefix)) continue;
    const seq = Number(n.slice(prefix.length));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

// An invoice that "counts" for duplicate protection: not Cancelled, not archived.
export const isActiveInvoice = (inv) => !!inv && inv.status !== "Cancelled" && !inv.archived;