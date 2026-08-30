import { snapshotHash } from "./agreementTerms.js";

// Opaque, internally-generated group identifier (never derived from public_token).
export function generateGroupId() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// A safe, human-readable reference to the authenticated staff user. Used only for
// audit/display on the record; never trusted for authorization (auth is enforced
// server-side via base44.auth.me()).
export function staffUserRef(user) {
  if (!user) return "";
  return user.full_name || user.email || user.id || "";
}

// Server-authoritative activation eligibility. Every requirement must hold; the
// frontend cannot bypass this. Returns an array of human-readable error strings
// (empty array = eligible). Includes a live snapshot-hash recompute + compare.
export async function activationEligibilityErrors(agreement) {
  const errs = [];
  if (!agreement) return ["Agreement not found."];
  if (agreement.archived) errs.push("Agreement is archived.");
  if (agreement.status !== "Pending") errs.push("Only Pending agreements can be activated.");
  if (agreement.signing_status !== "Signed") errs.push("Agreement must be signed before activation.");
  if (!agreement.sent_snapshot) errs.push("Agreement snapshot is missing.");
  if (!agreement.sent_snapshot_hash) errs.push("Agreement snapshot hash is missing.");
  if (!agreement.signed_at) errs.push("Signed timestamp is missing.");
  if (!agreement.signer_name) errs.push("Signer name is missing.");
  if (!agreement.signer_email) errs.push("Signer email is missing.");
  if (agreement.consent_accepted !== true) errs.push("Consent was not accepted.");
  if (!agreement.consent_text) errs.push("Consent text is missing.");
  if (!agreement.signature_hash) errs.push("Signature evidence is missing.");
  if (!agreement.signature_url) errs.push("Signature evidence is missing.");
  if (!agreement.signed_pdf_url) errs.push("Signed PDF has not been generated.");
  if (agreement.sent_snapshot && agreement.sent_snapshot_hash) {
    try {
      const recomputed = await snapshotHash(agreement.sent_snapshot);
      if (recomputed !== agreement.sent_snapshot_hash) {
        errs.push("Agreement snapshot failed integrity verification.");
      }
    } catch (e) {
      errs.push("Agreement snapshot failed integrity verification.");
    }
  }
  return errs;
}

// Safe audit helper. Logs only safe references: automation type, a short
// record_created string (agreement id / version), property id, status. Never
// logs public token, signature bytes, signed PDF bytes, access secrets, or
// full consent text.
export async function auditAgreementEvent(base44, { automation_type, record_created, property_id, status }) {
  try {
    await base44.asServiceRole.entities.AutomationLog.create({
      date_time: new Date().toISOString(),
      automation_type,
      record_created,
      related_property_id: property_id || "",
      status: status || "success",
      error_details: "",
    });
  } catch (e) {}
}