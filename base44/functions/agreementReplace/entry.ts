import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateGroupId, auditAgreementEvent } from '../../shared/agreementActivation.js';

// Authenticated STAFF-ONLY endpoint for creating a replacement / revised
// agreement version. A Sent/Viewed/Signed/Declined/Active agreement is NEVER
// edited in place: this creates a NEW PropertyServiceAgreement record in the
// same agreement_group_id, with version = (max in group) + 1, status Pending /
// signing_status Draft, and NO carried-over signing/token/snapshot evidence.
//
// emergency_authorization_confirmed is reset to false (staff must reconfirm).
// terms_template_id is carried forward only as a starting selection, and only
// if that template still exists; Send eligibility still re-validates active +
// legal_approved at send time. The browser only identifies the source
// agreement; all version/group logic is server-authoritative.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { const text = await req.text(); if (text) body = JSON.parse(text); } catch (e) { body = {}; }
    const { action, agreement_id } = body || {};
    if (action !== 'create') return Response.json({ error: 'Invalid action' }, { status: 400 });
    if (!agreement_id || typeof agreement_id !== 'string') {
      return Response.json({ error: 'Missing agreement_id' }, { status: 400 });
    }

    let original;
    try {
      original = await base44.asServiceRole.entities.PropertyServiceAgreement.get(agreement_id);
    } catch (e) {
      return Response.json({ error: 'Agreement not found' }, { status: 404 });
    }
    if (!original) return Response.json({ error: 'Agreement not found' }, { status: 404 });
    if (original.archived) return Response.json({ error: 'Agreement is archived.' }, { status: 400 });

    // Replacement allowed from frozen signing states or an Active agreement.
    // Draft agreements are edited in place (no replacement).
    const allowedSigning = ['Sent', 'Viewed', 'Signed', 'Declined'];
    if (!allowedSigning.includes(original.signing_status) && original.status !== 'Active') {
      return Response.json({
        error: 'A replacement version can only be created from a sent, viewed, signed, declined, or active agreement.',
      }, { status: 400 });
    }

    // --- Establish a stable group identifier across all versions ---
    let groupId = original.agreement_group_id || '';
    if (!groupId) {
      groupId = generateGroupId();
      // agreement_group_id is version metadata, NOT signed evidence, so setting it
      // on a frozen original is safe and does not alter customer-facing content.
      try {
        await base44.asServiceRole.entities.PropertyServiceAgreement.update(original.id, {
          agreement_group_id: groupId,
        });
      } catch (e) {}
    }

    // --- Server-authoritative version numbering: max version in group + 1 ---
    let groupAgs = [];
    try {
      groupAgs = await base44.asServiceRole.entities.PropertyServiceAgreement.filter(
        { agreement_group_id: groupId },
        '-agreement_version', 500,
      );
    } catch (e) { groupAgs = []; }
    let maxVersion = typeof original.agreement_version === 'number' ? original.agreement_version : 1;
    for (const a of (groupAgs || [])) {
      if (typeof a.agreement_version === 'number' && a.agreement_version > maxVersion) {
        maxVersion = a.agreement_version;
      }
    }
    // Best-effort duplicate guard (Base44 does not provide concurrency locking).
    let newVersion = maxVersion + 1;
    while ((groupAgs || []).some((a) => a.agreement_version === newVersion)) newVersion++;

    // --- Carry forward editable business fields; carry terms_template_id only if it still exists ---
    let carryTemplateId = '';
    if (original.terms_template_id) {
      try {
        const t = await base44.asServiceRole.entities.AgreementTermsTemplate.get(original.terms_template_id);
        if (t && !t.archived) carryTemplateId = t.id;
      } catch (e) {}
    }

    // NOTE: signing/token/snapshot/activation evidence is intentionally NOT in this
    // payload — a fresh create starts with empty defaults, so nothing carries over.
    const created = await base44.asServiceRole.entities.PropertyServiceAgreement.create({
      client_id: original.client_id || '',
      property_id: original.property_id || '',
      service_package_id: original.service_package_id || '',
      agreed_price: original.agreed_price ?? 0,
      billing_type: original.billing_type || 'Monthly',
      inspection_frequency: original.inspection_frequency || '',
      start_date: original.start_date || null,
      renewal_date: original.renewal_date || null,
      included_services_override: original.included_services_override || '',
      additional_terms: original.additional_terms || '',
      notes: original.notes || '',
      emergency_authorization: original.emergency_authorization || '',
      emergency_max_amount: original.emergency_max_amount ?? null,
      emergency_unreachable_instructions: original.emergency_unreachable_instructions || '',
      emergency_authorization_confirmed: false,
      is_test_agreement: original.is_test_agreement === true,
      status: 'Pending',
      signing_status: 'Draft',
      agreement_group_id: groupId,
      agreement_version: newVersion,
      terms_template_id: carryTemplateId,
      archived: false,
    });

    await auditAgreementEvent(base44, {
      automation_type: 'Agreement replacement created',
      record_created: `Agreement v${newVersion} created (replaces v${original.agreement_version ?? 1})`,
      property_id: original.property_id || '',
      status: 'success',
    });

    return Response.json({
      ok: true,
      agreement_id: created.id,
      agreement_version: newVersion,
      agreement_group_id: groupId,
    });
  } catch (error) {
    return Response.json({ error: error && error.message ? error.message : String(error) }, { status: 500 });
  }
}