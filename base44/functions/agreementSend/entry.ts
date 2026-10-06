import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  buildSentSnapshot,
  snapshotHash,
  scanSnapshotForSecrets,
  generatePublicToken,
  businessIdentityHasQAMarker,
} from '../../shared/agreementTerms.js';

// Authenticated staff-only "Send for Signature" endpoint.
// Loads the authoritative records itself, builds the frozen sent_snapshot
// server-side, never trusts the browser to supply snapshot/hash/token.
// Write-once: a Sent/Viewed/Signed version cannot be re-frozen.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch (e) { body = {}; }
    const { action, agreement_id } = body || {};
    if (action !== 'send') return Response.json({ error: 'Invalid action' }, { status: 400 });
    if (!agreement_id || typeof agreement_id !== 'string') {
      return Response.json({ error: 'Missing agreement_id' }, { status: 400 });
    }

    const safeGet = (entity, idVal) =>
      idVal ? entity.get(idVal).catch(() => null) : Promise.resolve(null);

    // --- Authoritative load ---
    let agreement;
    try {
      agreement = await base44.asServiceRole.entities.PropertyServiceAgreement.get(agreement_id);
    } catch (e) {
      return Response.json({ error: 'Agreement not found' }, { status: 404 });
    }
    if (!agreement) return Response.json({ error: 'Agreement not found' }, { status: 404 });
    if (agreement.archived) return Response.json({ error: 'Agreement is archived' }, { status: 400 });

    // --- Write-once / resend guard ---
    if (agreement.signing_status && agreement.signing_status !== 'Draft') {
      return Response.json({
        error: 'This agreement version has already been sent and is frozen. A replacement version is required to change terms.',
        status: 'already_sent',
      }, { status: 409 });
    }
    if (agreement.status !== 'Pending') {
      return Response.json({ error: 'Only Pending agreements can be sent for signature.' }, { status: 400 });
    }

    const [client, property, servicePackage, bizList, template] = await Promise.all([
      safeGet(base44.asServiceRole.entities.Client, agreement.client_id),
      safeGet(base44.asServiceRole.entities.Property, agreement.property_id),
      safeGet(base44.asServiceRole.entities.ServicePackage, agreement.service_package_id),
      base44.asServiceRole.entities.BusinessSettings.list('-created_date', 1),
      safeGet(base44.asServiceRole.entities.AgreementTermsTemplate, agreement.terms_template_id),
    ]);
    const business = (bizList && bizList[0]) || {};

    // --- Eligibility validation (server-authoritative) ---
    const errs = [];
    if (!client) errs.push('Linked client not found.');
    else {
      if (!client.name) errs.push('Customer name is missing.');
      if (!client.email) errs.push('Customer email is missing.');
    }
    if (!property) errs.push('Linked property not found.');
    else {
      if (!property.name) errs.push('Property name is required for the customer agreement.');
      if (!property.address) errs.push('Property address is required for the customer agreement.');
    }
    if (!servicePackage) errs.push('Service package not found.');
    else {
      if (!(typeof agreement.agreed_price === 'number' && agreement.agreed_price > 0)) errs.push('Agreed price is missing.');
      if (!agreement.billing_type) errs.push('Billing type is missing.');
      if (servicePackage.recurring !== 'One-time' && !agreement.inspection_frequency) {
        errs.push('Visit frequency is required for recurring service.');
      }
      // Frequency-mismatch gate (server-authoritative): when the agreement's
      // frequency differs from the package's frequency, staff must either use
      // the package frequency or record the agreed customer-specific service
      // changes (which take precedence over package defaults in the snapshot).
      // The price is never changed automatically by this rule.
      if (
        servicePackage.recurring !== 'One-time' &&
        agreement.inspection_frequency &&
        servicePackage.inspection_frequency &&
        String(agreement.inspection_frequency).trim().toLowerCase() !==
          String(servicePackage.inspection_frequency).trim().toLowerCase()
      ) {
        const changes = String(agreement.included_services_override || '').trim();
        if (!changes) {
          errs.push('Visit frequency differs from the package frequency. Use the package frequency, or record the agreed customer-specific service changes first.');
        }
      }
    }
    if (!template) {
      // Production agreements: same message as before. A TEST agreement still
      // needs a template to build the snapshot, but the legal-approval gate
      // below is bypassed for it.
      errs.push(agreement.is_test_agreement === true
        ? 'No agreement terms template is linked to this test agreement.'
        : 'No active legally-approved agreement terms template is available.');
    } else {
      if (template.archived) errs.push('The selected terms template is archived.');
      // Production legal-approval gate — bypassed ONLY for an explicitly-marked
      // TEST agreement (QA workflow). The template itself is never modified.
      if (agreement.is_test_agreement !== true) {
        if (template.active !== true) errs.push('No active legally-approved agreement terms template is available.');
        else if (template.legal_approved !== true) errs.push('The selected agreement terms have not been legally approved for customer use.');
      }
      if (!template.language) errs.push('Terms template language is invalid.');
      if (typeof template.version !== 'number') errs.push('Terms template version is invalid.');
    }
    if (agreement.emergency_authorization_confirmed !== true) {
      errs.push('Emergency authorization has not been confirmed by staff.');
    } else {
      if (!agreement.emergency_authorization) errs.push('Emergency authorization text is missing.');
      if (!(typeof agreement.emergency_max_amount === 'number' && !isNaN(agreement.emergency_max_amount))) {
        errs.push('Emergency spending limit is missing.');
      }
      if (!agreement.emergency_unreachable_instructions) errs.push('Emergency unreachable instructions are missing.');
    }
    if (errs.length) {
      return Response.json({ error: 'Agreement is not ready to send.', details: errs }, { status: 400 });
    }

    // --- Build authoritative frozen snapshot (server-side) ---
    const snapshot = buildSentSnapshot({
      business,
      client: client || {},
      property: property || {},
      servicePackage: servicePackage || {},
      agreement,
      template,
      vatRate: business.vat_rate,
    });

    // --- Legal-readiness: unresolved placeholders block production send ---
    const resolvedText = JSON.stringify(snapshot.sections || []);
    if (resolvedText.includes('{{')) {
      return Response.json({
        error: 'Unresolved terms placeholders remain — legal review required before sending.',
        status: 'legal_review',
      }, { status: 400 });
    }

    // --- Defensive secret scan (abort on any leak; do NOT freeze) ---
    const leaked = scanSnapshotForSecrets(snapshot, property || {});
    if (leaked && leaked.length) {
      return Response.json({
        error: 'Secret scan failed: a property access secret was found in the agreement content. Send aborted.',
        leaked,
      }, { status: 500 });
    }

    // --- QA/test business-identity guard (abort; do NOT freeze a contaminated snapshot) ---
    if (businessIdentityHasQAMarker(snapshot)) {
      return Response.json({
        error: 'Business identity contains test/QA data. Send aborted — restore the legitimate business configuration before sending.',
        status: 'qa_contamination',
      }, { status: 500 });
    }

    // --- Canonical SHA-256 hash (server-side, frontend cannot override) ---
    const hash = await snapshotHash(snapshot);

    // --- Cryptographically strong, unique public token ---
    let token = generatePublicToken();
    for (let i = 0; i < 5; i++) {
      let clash;
      try {
        clash = await base44.asServiceRole.entities.PropertyServiceAgreement.filter({ public_token: token });
      } catch (e) { clash = []; }
      if (!clash || clash.length === 0) break;
      token = generatePublicToken();
    }

    const sent_at = new Date().toISOString();

    // --- Freeze (operational status stays Pending) ---
    await base44.asServiceRole.entities.PropertyServiceAgreement.update(agreement_id, {
      sent_snapshot: snapshot,
      sent_snapshot_hash: hash,
      terms_template_id: template.id,
      terms_version: String(template.version),
      public_token: token,
      sent_at,
      signing_status: 'Sent',
    });

    // --- Automation log (no token in plaintext, no access secrets) ---
    try {
      await base44.asServiceRole.entities.AutomationLog.create({
        date_time: sent_at,
        automation_type: 'Agreement sent for signature',
        record_created: `Agreement ${agreement_id} v${agreement.agreement_version ?? 1} → Sent`,
        related_property_id: agreement.property_id || '',
        status: 'success',
        error_details: '',
      });
    } catch (e) {}

    // --- Public customer link: always the verified custom domain ---
    const origin = 'https://propertycarecrete.com';
    const public_link = `${origin}/agreement/${token}`;

    return Response.json({
      ok: true,
      agreement_id,
      signing_status: 'Sent',
      sent_at,
      public_link,
      terms_version: String(template.version),
    });
  } catch (error) {
    return Response.json({ error: error && error.message ? error.message : String(error) }, { status: 500 });
  }
}