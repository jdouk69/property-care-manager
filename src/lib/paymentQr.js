// Shared payment-document helpers for the bank-issued IRIS QR and IBAN
// payment details. Payment details are customer-facing payment instructions
// and appear ONLY on invoices — never on public or internal surfaces.
// The QR is always the OFFICIAL image supplied by the business's bank;
// the app never generates its own IRIS QR.

// Settings fields frozen onto an invoice at finalization, so already-issued
// documents keep exactly the payment details they were issued with.
export const PAYMENT_SNAPSHOT_FIELDS = [
  "iris_qr_image",
  "show_iris_qr",
  "show_iban_details",
  "bank_name",
  "bank_beneficiary",
  "bank_iban",
  "bank_bic",
  "payment_instructions",
];

// Money can still arrive. Paid and Cancelled documents never re-render
// payment QR / transfer instructions.
export const isUnpaidInvoice = (inv) =>
  !!inv && !["Paid", "Cancelled"].includes(inv.status);

// Effective payment details for ONE document:
// - Finalized (issued) documents use the details frozen at finalization.
// - A legacy issued document (finalized before the IRIS feature existed) keeps
//   its issued look — no IRIS QR appears on it.
// - Unfinalized drafts always use the current settings (future documents).
export function paymentDetailsFor(invoice, business = {}) {
  const snap = invoice?.finalized_at ? invoice.payment_details_snapshot : null;
  if (snap && typeof snap === "object" && Object.keys(snap).length) {
    return { ...business, ...snap };
  }
  if (invoice?.finalized_at) return { ...business, show_iris_qr: false };
  return business;
}

// Amount still owed on an unpaid document (partially paid shows the remainder;
// Paid/Cancelled never reach this branch in the PDF/email paths).
export function amountDue(invoice) {
  const total = Number(invoice?.total) || 0;
  const paid = Number(invoice?.amount_paid) || 0;
  const remaining = total - paid;
  return paid > 0 && remaining > 0 ? remaining : total;
}

// Resolve the stored QR reference to a fetchable URL: direct URLs pass
// through; private storage URIs get a short-lived signed URL (never a
// permanent public URL).
export async function resolveQrSrc(fileUri) {
  if (!fileUri) return "";
  if (/^https?:/i.test(fileUri)) return fileUri;
  const { base44 } = await import("@/api/base44Client");
  const su = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 600 });
  return su?.signed_url || "";
}