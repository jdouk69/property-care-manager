// Presentation-time line-item normalization for DRAFT invoices (PDF only).
// Drafts created before the recurring-description enhancement (e.g. INV-2026-001)
// snapshot the old short text ("Standard property care"); their PDFs now show
// the improved recurring description with the billing month.
//
// SAFETY RULES:
// - Draft invoices ONLY. Issued snapshots (Sent / Partially Paid / Paid /
//   Overdue / Cancelled) are never rewritten — historical records stay intact.
// - Pure function: the stored Invoice, BillingCharge, agreement and package
//   records are never modified — only the in-memory copy passed to the PDF.
// - The billing month is rebuilt from the month-stripped charge description, so
//   it can never be appended twice (an item that already ends with the month
//   normalizes to itself).
// - Only standard recurring service labels are normalized (charge linked to a
//   service agreement); one-time / additional / reimbursement descriptions keep
//   their exact stored text.
// - Casing uses the configured package display name only when the charge
//   description IS that label (case-insensitive) — arbitrary custom text is
//   never title-cased or replaced.
import { monthLabel, stripMonthSuffix } from "@/lib/billing";

const PROP_SUFFIX = /^(.*?)\s*\(([^()]*)\)\s*$/; // trailing "(Property Name)" on All-Properties invoices

const byId = (list) => new Map((list || []).map((x) => [x.id, x]));

export function presentInvoiceLineItems(invoice, { charges = [], agreements = [], packages = [] } = {}) {
  const items = Array.isArray(invoice?.line_items) ? invoice.line_items : [];
  const ids = Array.isArray(invoice?.charge_ids) ? invoice.charge_ids : null;
  if (invoice?.status !== "Draft" || !ids || ids.length !== items.length) return items;

  const label = monthLabel(invoice.billing_period);
  if (!label) return items;

  const chargeById = byId(charges);
  const agreementById = byId(agreements);
  const packageById = byId(packages);

  return items.map((it, i) => {
    const ch = chargeById.get(ids[i]);
    if (!ch || ch.charge_type !== "Service" || !ch.property_service_agreement_id) return it;

    // Charge description minus any trailing month ("Standard Property Care").
    const chargeBase = stripMonthSuffix(ch.description || "", label).trim();
    if (!chargeBase) return it;

    // The stored snapshot must be this same charge's label (case-insensitive)
    // before we touch it — genuinely different text is left alone.
    const m = typeof it.description === "string" ? it.description.match(PROP_SUFFIX) : null;
    const head = (m ? m[1] : it.description || "").trim();
    if (head.toLowerCase() !== chargeBase.toLowerCase()) return it;

    // Configured/display package name casing when the label is the package name.
    const agreement = agreementById.get(ch.property_service_agreement_id);
    const pkgName = String(packageById.get(agreement?.service_package_id)?.name || "").trim();
    const base = (pkgName && pkgName.toLowerCase() === chargeBase.toLowerCase() ? pkgName : chargeBase).trim();

    const desired = `${base} — ${label}${m ? ` (${m[2]})` : ""}`;
    if (desired === it.description) return it; // already correct — never append twice
    return { ...it, description: desired };
  });
}