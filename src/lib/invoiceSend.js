// Invoice finalize + email-send service.
// Lifecycle: Create -> Draft -> Finalize (finalized_at) -> Sent -> Paid.
// Presentation/lifecycle only: no BillingCharge creation or eligibility, no
// monthly/recurring logic, no VAT math, no invoice numbering, no visit billing.
//
// Delivery note: the SendEmail integration has no attachment parameter, so the
// generated PDF is uploaded with UploadFile (the established visit-report
// pattern) and delivered as a download link in the email body — we never claim
// an "attachment" we cannot produce, and we never fake success.
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { presentInvoiceLineItems } from "@/lib/invoicePresentation";
import { athensLongDate } from "@/lib/timezone";
import { eur } from "@/lib/billing";
import { PAYMENT_SNAPSHOT_FIELDS, isUnpaidInvoice, paymentDetailsFor, resolveQrSrc } from "@/lib/paymentQr";

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const idx = s.indexOf(";base64,");
      resolve(idx >= 0 ? s.slice(idx + 8) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

// Locked once finalized (or no longer a Draft) — the UI edit-lock predicate.
export const invoiceIsLocked = (inv) =>
  !!inv?.finalized_at || (!!inv && inv.status !== "Draft");

// Same Draft presentation context the Invoices PDF download path uses.
async function loadPresentationContext() {
  const { base44 } = await import("@/api/base44Client");
  const [charges, agreements, packages] = await Promise.all([
    base44.entities.BillingCharge.list("-created_date", 500),
    base44.entities.PropertyServiceAgreement.list("-created_date", 500),
    base44.entities.ServicePackage.list("-created_date", 500),
  ]);
  return { charges, agreements, packages };
}

/**
 * Finalize a Draft invoice for issuance.
 * - records finalized_at (status stays Draft until it is actually emailed)
 * - freezes the presented line-item text so what the admin reviewed is exactly
 *   what gets issued; amounts and all other financial fields are untouched
 * Idempotent: an already-finalized invoice is returned unchanged.
 */
export async function finalizeInvoice(invoice) {
  if (!invoice || invoice.status !== "Draft" || invoice.finalized_at) return invoice;
  const { base44 } = await import("@/api/base44Client");
  const patch = { finalized_at: new Date().toISOString() };
  // Freeze the payment details (bank-issued IRIS QR + bank transfer settings)
  // so the issued document keeps exactly what it was issued with, even if
  // Settings change later. Best-effort: finalization must not fail if the
  // settings record cannot be read — the document then falls back to current
  // settings at render time.
  try {
    const bs = await base44.entities.BusinessSettings.list("-created_date", 10);
    const b = (bs || [])[0] || {};
    const snap = {};
    PAYMENT_SNAPSHOT_FIELDS.forEach((f) => {
      if (b[f] !== undefined && b[f] !== null) snap[f] = b[f];
    });
    patch.payment_details_snapshot = snap;
  } catch (e) { /* snapshot unavailable — see note above */ }
  if (Array.isArray(invoice.charge_ids) && invoice.charge_ids.length) {
    const ctx = await loadPresentationContext();
    patch.line_items = presentInvoiceLineItems(invoice, ctx);
  }
  return await base44.entities.Invoice.update(invoice.id, patch);
}

/** Simple, professional invoice email — subject + body, no internal terms. */
export function buildInvoiceEmail({ invoice, client = {}, business = {}, pdfUrl = "" }) {
  const number = invoice.invoice_number || "";
  const name = String(business.business_name || "Property Care").trim();
  const subject = `Invoice ${number} — ${name}`;
  const lines = [];
  lines.push(`Hello ${client.name || "there"},`);
  lines.push("");
  lines.push(`Please find your invoice ${number} for your property care services below.`);
  lines.push("");
  lines.push(`Total due: ${eur(invoice.total ?? 0)}`);
  if (invoice.due_date) lines.push(`Due date: ${athensLongDate(invoice.due_date)}`);
  lines.push("");
  // Unpaid documents carry the payment options (issued-and-paid never do, and
  // a legacy issued document keeps its pre-IRIS look via paymentDetailsFor).
  if (isUnpaidInvoice(invoice)) {
    const pay = paymentDetailsFor(invoice, business);
    if (pay.show_iris_qr && pay.iris_qr_image) {
      lines.push("Pay by IRIS — scan the QR code on the invoice with your banking app.");
      lines.push("Σκανάρετε τον κωδικό QR στο τιμολόγιο με την τραπεζική σας εφαρμογή.");
    }
    if (pay.show_iban_details !== false && pay.bank_iban) {
      lines.push(`Or by bank transfer — IBAN: ${pay.bank_iban}` + (pay.bank_beneficiary ? ` (${pay.bank_beneficiary})` : ""));
    }
    lines.push(`Payment reference: ${number}`);
    lines.push("");
  }
  if (pdfUrl) {
    lines.push("Your invoice (PDF):");
    lines.push(pdfUrl);
    lines.push("");
  }
  lines.push("Payment details are included on the invoice.");
  lines.push("");
  lines.push("Thank you,");
  lines.push(name);
  return { subject, body: lines.join("\n") };
}

/**
 * Generate the invoice PDF from the exact snapshot being issued, upload it
 * (visit-report storage pattern) and email the customer the download link.
 * Returns { ok, to, pdfUrl } or { ok: false, error }. Never fakes success: any
 * integration throw becomes an error result and the caller must NOT mark Sent.
 */
export async function sendInvoiceEmail({ invoice, client = {}, business = {}, property = {} }) {
  const { base44 } = await import("@/api/base44Client");
  const to = String(client.email || "").trim();
  if (!to) return { ok: false, error: "No customer email address is available for this invoice." };
  let pdfUrl = "";
  try {
    const blob = await generateInvoicePdf(invoice, { business, client, property }, { returnBlob: true });
    const file = new File([blob], `${invoice.invoice_number || "invoice"}.pdf`, { type: "application/pdf" });
    const up = await base44.integrations.Core.UploadFile({ file });
    pdfUrl = up?.file_url || "";
    if (!pdfUrl) return { ok: false, error: "Could not store the invoice PDF." };
  } catch (e) {
    return { ok: false, error: `Could not generate the invoice PDF: ${e?.message || e}` };
  }
  const { subject, body } = buildInvoiceEmail({ invoice, client, business, pdfUrl });
  // Attach the bank-issued IRIS QR image (when enabled) so the email itself
  // carries the main payment option, not only the linked PDF. Best-effort: a
  // failed QR fetch sends the email without the image rather than failing the
  // whole send.
  let attachments;
  try {
    const pay = paymentDetailsFor(invoice, business);
    if (isUnpaidInvoice(invoice) && pay.show_iris_qr && pay.iris_qr_image) {
      const res = await fetch(await resolveQrSrc(pay.iris_qr_image), { mode: "cors" });
      if (res.ok) {
        const blob = await res.blob();
        const b64 = await blobToBase64(blob);
        if (blob.type && b64) {
          const ext = blob.type.includes("jpeg") ? "jpg" : blob.type.includes("webp") ? "webp" : "png";
          attachments = [{ filename: `IRIS-QR-${invoice.invoice_number || "payment"}.${ext}`, content: b64 }];
        }
      }
    }
  } catch (e) { attachments = undefined; }
  try {
    await base44.integrations.Core.SendEmail({
      to,
      subject,
      body,
      attachments,
      from_name: String(business.business_name || "Property Care").trim(),
    });
    return { ok: true, to, pdfUrl };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), pdfUrl };
  }
}