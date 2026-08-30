import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { snapshotHash } from '../../shared/agreementTerms.js';
import { generateSignedAgreementPdf, scanForSecrets } from '../../shared/agreementPdf.js';

// Public (unauthenticated) agreement endpoint — the ONLY data interface the
// anonymous customer page uses. Authenticity = the public_token. The function
// never exposes live Client/Property/ServicePackage/BusinessSettings records,
// agreement IDs, or access secrets; the page renders exclusively from the
// frozen sent_snapshot.
const SAFE_ERROR = "This agreement link is invalid or no longer available.";
const SIGN_BLOCKED = "This agreement cannot currently be signed. Please contact the service provider.";
const INTEGRITY_ERROR = "This agreement cannot currently be opened. Please contact the service provider.";

function isValidToken(t) {
  return typeof t === "string" && /^[0-9a-f]{64}$/.test(t);
}

// Exact intent-based consent wording, resolved from the FROZEN snapshot.
// The customer page builds the same string; the backend re-resolves and
// requires an exact match, so a tampered/altered consent is rejected.
function expectedConsentText(snapshot) {
  const av = snapshot && snapshot.agreement_version != null ? String(snapshot.agreement_version) : "";
  const tv = snapshot && snapshot.terms_version != null ? String(snapshot.terms_version) : "";
  return `I confirm that I have read and understood this Service Agreement, Version ${av} (Terms Version ${tv}), and I agree to its terms. I consent to completing and signing this Agreement electronically, and I intend my electronic signature to indicate my acceptance of and agreement to be bound by these terms.`;
}

// Decode a PNG data URL to raw bytes. Validates format before any work.
function decodeDataUrlPng(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const m = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  try {
    const bin = atob(m[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch (e) { return null; }
}

function clientIp(req) {
  const h = req.headers;
  const cf = h.get('cf-connecting-ip');
  if (cf) return cf.split(',')[0].trim();
  const xf = h.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return null;
}

// Internal-only audit when a valid token points to an agreement whose frozen
// snapshot fails integrity. Deduped per agreement so repeated GETs of a broken
// link don't spam the log. Safe fields only: agreement id (internal reference),
// property id, timestamp, attempted action. No token, no snapshot contents,
// no hashes, no secrets are logged.
async function logIntegrityFailure(base44, agreement, action) {
  try {
    const propId = agreement.property_id || "";
    const existing = await base44.asServiceRole.entities.AutomationLog.filter({
      related_property_id: propId,
      automation_type: "Agreement snapshot integrity check failed",
    });
    const already = (existing || []).some((l) => (l.record_created || "").includes(agreement.id));
    if (already) return;
    await base44.asServiceRole.entities.AutomationLog.create({
      date_time: new Date().toISOString(),
      automation_type: "Agreement snapshot integrity check failed",
      record_created: `Agreement ${agreement.id} integrity check failed (${action})`,
      related_property_id: propId,
      status: "failure",
      error_details: "",
    });
  } catch (e) {}
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { const text = await req.text(); if (text) body = JSON.parse(text); } catch (e) { body = {}; }
    const { action, token } = body || {};

    if (!["get", "sign", "decline", "download"].includes(action)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    if (!isValidToken(token)) {
      return Response.json({ error: SAFE_ERROR }, { status: 400 });
    }

    const found = await base44.asServiceRole.entities.PropertyServiceAgreement.filter({ public_token: token });
    const agreement = found && found[0];
    if (!agreement || agreement.archived) {
      return Response.json({ error: SAFE_ERROR }, { status: 404 });
    }

    // --- Integrity verification (frozen snapshot) ---
    // Order: validate token -> load agreement -> validate record -> verify
    // snapshot exists -> verify hash exists -> recompute + compare. Only after
    // all pass may the snapshot be displayed or a Viewed transition occur.
    let hashValid = true;
    try {
      if (!agreement.sent_snapshot || !agreement.sent_snapshot_hash) hashValid = false;
      else {
        const recomputed = await snapshotHash(agreement.sent_snapshot);
        if (recomputed !== agreement.sent_snapshot_hash) hashValid = false;
      }
    } catch (e) { hashValid = false; }

    // --- Integrity gate: a corrupted/missing snapshot must NEVER be shown and
    // must NEVER trigger a Viewed transition. Return a safe public error and
    // record an internal audit (deduped). Applies to get / sign / decline.
    if (!hashValid) {
      await logIntegrityFailure(base44, agreement, action);
      return Response.json({ error: INTEGRITY_ERROR }, { status: 400 });
    }

    // --- GET ---
    if (action === "get") {
      // Idempotent Viewed transition (only Sent -> Viewed), performed ONLY
      // after integrity has been verified above.
      if (agreement.signing_status === "Sent") {
        const now = new Date().toISOString();
        await base44.asServiceRole.entities.PropertyServiceAgreement.update(agreement.id, {
          signing_status: "Viewed", viewed_at: now,
        });
        try {
          await base44.asServiceRole.entities.AutomationLog.create({
            date_time: now, automation_type: "Agreement viewed",
            record_created: `Agreement v${agreement.agreement_version ?? 1} viewed`,
            related_property_id: agreement.property_id || "", status: "success", error_details: "",
          });
        } catch (e) {}
        return Response.json({
          sent_snapshot: agreement.sent_snapshot,
          signing_status: "Viewed",
          sent_at: agreement.sent_at || null,
          viewed_at: now,
          signed_at: agreement.signed_at || null,
          declined_at: agreement.declined_at || null,
          decline_reason: agreement.decline_reason || null,
          signed_pdf_available: !!agreement.signed_pdf_url,
          hash_valid: true,
          signable: true,
        });
      }
      // No mutation for Viewed/Signed/Declined
      const signable = ["Sent", "Viewed"].includes(agreement.signing_status);
      return Response.json({
        sent_snapshot: agreement.sent_snapshot,
        signing_status: agreement.signing_status || null,
        sent_at: agreement.sent_at || null,
        viewed_at: agreement.viewed_at || null,
        signed_at: agreement.signed_at || null,
        declined_at: agreement.declined_at || null,
        decline_reason: agreement.decline_reason || null,
        signed_pdf_available: !!agreement.signed_pdf_url,
        hash_valid: true,
        signable,
        });
        }

        // --- DOWNLOAD (token-gated binary PDF delivery) ---
        // The customer/staff never receive the raw private storage reference; the
        // PDF is streamed through this function only after the secure token is
        // validated, the Signed state and snapshot integrity are verified, and a
        // private file reference exists. Returns binary PDF on success, JSON error
        // on failure. Integrity was already verified above (hashValid gate).
        if (action === "download") {
        if (agreement.signing_status !== "Signed") {
        return Response.json({ error: "This agreement is not yet signed." }, { status: 400 });
        }
        if (!agreement.signed_pdf_url) {
        return Response.json({ error: "The signed PDF is not available." }, { status: 404 });
        }
        let pdfBytes = null;
        try {
        const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
          file_uri: agreement.signed_pdf_url, expires_in: 60,
        });
        if (!signed || !signed.signed_url) throw new Error("no signed url");
        const fr = await fetch(signed.signed_url);
        if (!fr.ok) throw new Error("fetch failed");
        pdfBytes = await fr.arrayBuffer();
        } catch (e) {
        try { await base44.asServiceRole.entities.AutomationLog.create({
          date_time: new Date().toISOString(), automation_type: "Agreement signed PDF download failed",
          record_created: `Agreement ${agreement.id} PDF download retrieval failed`,
          related_property_id: agreement.property_id || "", status: "failure", error_details: "",
        }); } catch (ee) {}
        return Response.json({ error: "The signed PDF could not be retrieved. Please try again or contact the service provider." }, { status: 500 });
        }
        const av = (agreement.sent_snapshot && agreement.sent_snapshot.agreement_version) || agreement.agreement_version || 1;
        return new Response(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Service-Agreement-v${av}-Signed.pdf"`,
          "Cache-Control": "private, max-age=0, no-store",
        },
        });
        }

        // --- sign / decline require an open signing state (integrity already gated) ---
    if (!["Sent", "Viewed"].includes(agreement.signing_status)) {
      if (agreement.signing_status === "Signed") return Response.json({ error: "This agreement has already been signed." }, { status: 409 });
      if (agreement.signing_status === "Declined") return Response.json({ error: "This agreement has been declined and can no longer be signed." }, { status: 409 });
      return Response.json({ error: SAFE_ERROR }, { status: 400 });
    }

    // --- SIGN ---
    if (action === "sign") {
      const { signer_name, signer_email, consent_accepted, consent_text, signature } = body || {};
      const expected = expectedConsentText(agreement.sent_snapshot);
      if (consent_accepted !== true) {
        return Response.json({ error: "You must agree to the consent statement to sign." }, { status: 400 });
      }
      if (typeof consent_text !== "string" || consent_text !== expected) {
        return Response.json({ error: "Consent text mismatch. Please reload the agreement and try again." }, { status: 400 });
      }
      if (!signer_name || typeof signer_name !== "string" || signer_name.trim().length < 2) {
        return Response.json({ error: "Please enter your full legal name." }, { status: 400 });
      }
      const email = typeof signer_email === "string" ? signer_email.trim().toLowerCase() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      const sigBytes = decodeDataUrlPng(signature);
      if (!sigBytes || sigBytes.length < 500) {
        return Response.json({ error: "Please draw your signature." }, { status: 400 });
      }
      if (sigBytes.length > 200000) {
        return Response.json({ error: "Signature image is too large. Please simplify your signature." }, { status: 400 });
      }

      // signature_hash = SHA-256 over the raw decoded PNG bytes (server-side)
      const sigHashBuf = await crypto.subtle.digest("SHA-256", sigBytes);
      const signature_hash = Array.from(new Uint8Array(sigHashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

      // Store signature via service-role upload (anonymous browser never uploads directly)
      let signature_url = "";
      try {
        // File (with a name) is required by the storage endpoint; a bare Blob
        // or Uint8Array is rejected server-side.
        const sigFile = new File([sigBytes], "signature.png", { type: "image/png" });
        const up = await base44.asServiceRole.integrations.Core.UploadFile({ file: sigFile });
        signature_url = (up && up.file_url) || "";
      } catch (e) { signature_url = ""; }

      // If the signature could not be stored we cannot produce a complete
      // signed record (the PDF embeds the stored signature). Fail safely
      // without mutating the agreement.
      if (!signature_url) {
        try { await base44.asServiceRole.entities.AutomationLog.create({
          date_time: new Date().toISOString(), automation_type: "Agreement signature upload failed",
          record_created: `Agreement ${agreement.id} signature upload failed`,
          related_property_id: agreement.property_id || "", status: "failure", error_details: "",
        }); } catch (e) {}
        return Response.json({ error: "Signing could not be completed. Please try again or contact the service provider." }, { status: 500 });
      }

      const signed_at = new Date().toISOString();
      const signer_user_agent = req.headers.get("user-agent") || null;
      const signer_ip = clientIp(req);

      // --- Pre-PDF integrity/security checks: re-verify snapshot hash,
      // signature hash (over the prepared bytes), exact consent, version
      // consistency, and a defensive secret scan. Any mismatch aborts the
      // whole sign transaction (no evidence persisted) so a retry does not
      // create duplicate signature evidence.
      const snap = agreement.sent_snapshot || {};
      const reSnapHash = await snapshotHash(snap);
      const reSigHashBuf = await crypto.subtle.digest("SHA-256", sigBytes);
      const reSigHash = Array.from(new Uint8Array(reSigHashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const snapHashOk = reSnapHash === agreement.sent_snapshot_hash;
      const sigHashOk = reSigHash === signature_hash;
      const consentOk = expected === consent_text;
      const versionOk = String(snap.agreement_version) === String(agreement.agreement_version ?? 1)
        && String(snap.terms_version) === String(agreement.terms_version || "");
      const secretLeak = scanForSecrets({ snapshot: snap, evidence: { signer_name, signer_email, consent_text } });
      if (!snapHashOk || !sigHashOk || !consentOk || !versionOk || secretLeak.length) {
        try { await base44.asServiceRole.entities.AutomationLog.create({
          date_time: signed_at, automation_type: "Agreement signed PDF generation failed",
          record_created: `Agreement ${agreement.id} pre-PDF integrity check failed`,
          related_property_id: agreement.property_id || "", status: "failure", error_details: "",
        }); } catch (e) {}
        return Response.json({ error: "Signing could not be completed. Please contact the service provider." }, { status: 500 });
      }

      // --- Verify the prepared signature bytes are a decodable PNG before
      // building the PDF. The helper also fails-closed on decode/embed, but
      // this explicit magic-byte check aborts earlier with a clear audit.
      const PNG_MAGIC = [137, 80, 78, 71, 13, 10, 26, 10];
      const pngMagicOk = sigBytes.length >= 24 && PNG_MAGIC.every((b, i) => sigBytes[i] === b);
      if (!pngMagicOk) {
        try { await base44.asServiceRole.entities.AutomationLog.create({
          date_time: signed_at, automation_type: "Agreement signed PDF generation failed",
          record_created: `Agreement ${agreement.id} signature bytes not a valid PNG`,
          related_property_id: agreement.property_id || "", status: "failure", error_details: "",
        }); } catch (e) {}
        return Response.json({ error: "Signing could not be completed. Please try again or contact the service provider." }, { status: 500 });
      }

      // --- Generate the signed PDF from the FROZEN snapshot + prepared evidence ---
      let signed_pdf_url = "";
      try {
        let bin = ""; for (let i = 0; i < sigBytes.length; i++) bin += String.fromCharCode(sigBytes[i]);
        const signatureDataUrl = "data:image/png;base64," + btoa(bin);
        const pdfBytes = await generateSignedAgreementPdf(snap, {
          signer_name: signer_name.trim(),
          signer_email: email,
          signed_at,
          agreement_version: String(snap.agreement_version),
          terms_version: String(snap.terms_version),
          consent_text: expected,
          signature_data_url: signatureDataUrl,
          signature_hash,
          snapshot_hash: agreement.sent_snapshot_hash,
          signer_ip,
          signer_user_agent,
        });
        const pdfFile = new File([pdfBytes], `Service-Agreement-v${snap.agreement_version}-Signed.pdf`, { type: "application/pdf" });
        // Store the signed PDF in PRIVATE storage (never a public URL). The
        // returned file_uri is only ever read back through the token-gated
        // download action via a short-lived signed URL.
        const pdfUp = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: pdfFile });
        signed_pdf_url = (pdfUp && pdfUp.file_uri) || "";
      } catch (e) { signed_pdf_url = ""; }

      if (!signed_pdf_url) {
        try { await base44.asServiceRole.entities.AutomationLog.create({
          date_time: signed_at, automation_type: "Agreement signed PDF generation failed",
          record_created: `Agreement ${agreement.id} PDF generation/upload failed`,
          related_property_id: agreement.property_id || "", status: "failure", error_details: "",
        }); } catch (e) {}
        // Signature was stored but the sign transaction did not complete: the
        // agreement stays in its pre-sign state (Sent/Viewed) with NO signature
        // evidence persisted on the record, so a retry creates no duplicate
        // evidence. The orphan signature file in storage is harmless. Base44
        // does not provide a transaction across file uploads + entity update.
        return Response.json({ error: "Signing could not be completed. Please try again or contact the service provider." }, { status: 500 });
      }

      // --- Persist Signed evidence + signed_pdf_url in a single update ---
      await base44.asServiceRole.entities.PropertyServiceAgreement.update(agreement.id, {
        signer_name: signer_name.trim(),
        signer_email: email,
        consent_text: expected,
        consent_accepted: true,
        signed_at,
        signer_ip,
        signer_user_agent,
        signature_url,
        signature_hash,
        signed_pdf_url,
        signing_status: "Signed",
      });

      try {
        await base44.asServiceRole.entities.AutomationLog.create({
          date_time: signed_at, automation_type: "Agreement signed",
          record_created: `Agreement v${agreement.agreement_version ?? 1} signed`,
          related_property_id: agreement.property_id || "", status: "success", error_details: "",
        });
      } catch (e) {}
      try {
        await base44.asServiceRole.entities.AutomationLog.create({
          date_time: signed_at, automation_type: "Agreement signed PDF generated",
          record_created: `Agreement ${agreement.id} signed PDF generated`,
          related_property_id: agreement.property_id || "", status: "success", error_details: "",
        });
      } catch (e) {}

      return Response.json({
        ok: true,
        signing_status: "Signed",
        signed_at,
        signed_pdf_available: true,
        signer_name: signer_name.trim(),
        agreement_version: snap.agreement_version,
        terms_version: snap.terms_version,
      });
    }

    // --- DECLINE ---
    if (action === "decline") {
      const { decline_reason, confirm } = body || {};
      if (confirm !== true) {
        return Response.json({ error: "Please confirm you want to decline." }, { status: 400 });
      }
      const declined_at = new Date().toISOString();
      await base44.asServiceRole.entities.PropertyServiceAgreement.update(agreement.id, {
        signing_status: "Declined",
        declined_at,
        decline_reason: typeof decline_reason === "string" ? decline_reason.slice(0, 1000) : "",
      });
      try {
        await base44.asServiceRole.entities.AutomationLog.create({
          date_time: declined_at, automation_type: "Agreement declined",
          record_created: `Agreement v${agreement.agreement_version ?? 1} declined`,
          related_property_id: agreement.property_id || "", status: "success", error_details: "",
        });
      } catch (e) {}
      return Response.json({ ok: true, signing_status: "Declined", declined_at });
    }

    return Response.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: "Something went wrong. Please try again or contact the service provider." }, { status: 500 });
  }
}