import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  activationEligibilityErrors,
  staffUserRef,
  auditAgreementEvent,
} from '../../shared/agreementActivation.js';

// Authenticated STAFF-ONLY endpoint for activating signed service agreements.
// Two actions:
//   - activate            : activate a Pending/Signed agreement (conflict-guarded).
//   - activateReplacement : activate a Pending/Signed replacement version and end
//                           the prior Active version in the same agreement group.
//
// Activation changes ONLY operational state + activation evidence (activated_at,
// activated_by, and ended_at on the prior version). Signed snapshot, hash,
// public_token, and all signing evidence are never modified here.
// Identity/authorization comes from base44.auth.me(); the browser only identifies
// the agreement (agreement_id). No browser-supplied staff identity is trusted.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { const text = await req.text(); if (text) body = JSON.parse(text); } catch (e) { body = {}; }
    const { action, agreement_id } = body || {};
    if (!['activate', 'activateReplacement'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    if (!agreement_id || typeof agreement_id !== 'string') {
      return Response.json({ error: 'Missing agreement_id' }, { status: 400 });
    }

    let agreement;
    try {
      agreement = await base44.asServiceRole.entities.PropertyServiceAgreement.get(agreement_id);
    } catch (e) {
      return Response.json({ error: 'Agreement not found' }, { status: 404 });
    }
    if (!agreement) return Response.json({ error: 'Agreement not found' }, { status: 404 });

    // --- Server-authoritative eligibility (shared, includes snapshot hash verify) ---
    const errs = await activationEligibilityErrors(agreement);
    if (errs.length) {
      return Response.json({ error: 'Agreement cannot be activated.', details: errs }, { status: 400 });
    }

    const now = new Date().toISOString();
    const activated_by = staffUserRef(user);
    const groupId = agreement.agreement_group_id || '';

    if (action === 'activate') {
      // --- Conflict guard: no other non-archived Active agreement for the same property ---
      let existing = [];
      try {
        existing = await base44.asServiceRole.entities.PropertyServiceAgreement.filter(
          { property_id: agreement.property_id, status: 'Active' },
          '-created_date', 500,
        );
      } catch (e) { existing = []; }
      const otherActive = (existing || []).filter((a) => a.id !== agreement.id && !a.archived);
      if (otherActive.length) {
        return Response.json({
          error: 'This property already has an active service agreement.',
          status: 'conflict',
          active_agreement_id: otherActive[0].id,
          next_step: 'Open the active agreement and use “Create Replacement Version”, or end it first.',
        }, { status: 409 });
      }

      // Idempotent: already Active (safely rejected as no-op success).
      if (agreement.status === 'Active') {
        return Response.json({
          ok: true, status: 'Active', activated_at: agreement.activated_at || now, already_active: true,
        });
      }

      await base44.asServiceRole.entities.PropertyServiceAgreement.update(agreement_id, {
        status: 'Active',
        activated_at: now,
        activated_by,
      });
      await auditAgreementEvent(base44, {
        automation_type: 'Agreement activated',
        record_created: `Agreement ${agreement_id} v${agreement.agreement_version ?? 1} activated${agreement.is_test_agreement === true ? ' (TEST)' : ''}`,
        property_id: agreement.property_id || '',
        status: 'success',
      });
      return Response.json({ ok: true, status: 'Active', activated_at: now, activated_by });
    }

    // --- activateReplacement ---
    if (!groupId) {
      return Response.json({
        error: 'This agreement is not part of a version group. Use Activate Service instead.',
      }, { status: 400 });
    }

    // Find the current Active version(s) in the same group (exclude self).
    let groupAgs = [];
    try {
      groupAgs = await base44.asServiceRole.entities.PropertyServiceAgreement.filter(
        { agreement_group_id: groupId },
        '-agreement_version', 500,
      );
    } catch (e) { groupAgs = []; }
    const priorActive = (groupAgs || []).filter(
      (a) => a.id !== agreement.id && a.status === 'Active' && !a.archived,
    );
    // Same property/client relationship for any prior active.
    for (const a of priorActive) {
      if (a.property_id !== agreement.property_id) {
        return Response.json({ error: 'Replacement and the active agreement do not match the same property.' }, { status: 400 });
      }
    }

    // Guard: no OTHER active agreement for the same property OUTSIDE this group.
    let propActive = [];
    try {
      propActive = await base44.asServiceRole.entities.PropertyServiceAgreement.filter(
        { property_id: agreement.property_id, status: 'Active' },
        '-created_date', 500,
      );
    } catch (e) { propActive = []; }
    const outsideGroup = (propActive || []).filter(
      (a) => a.id !== agreement.id && a.agreement_group_id !== groupId && !a.archived,
    );
    if (outsideGroup.length) {
      return Response.json({
        error: 'This property already has an active service agreement from a different group.',
        status: 'conflict',
      }, { status: 409 });
    }

    // --- Recovery-safe multi-record ordering (Base44 has no cross-record transactions) ---
    // A) fully validate eligibility (done above). B) identify prior Active (done above).
    // C) activate the replacement FIRST. D) attempt to End the prior Active (retry once).
    // E) if End succeeds -> transaction complete. F) if End fails after retry ->
    // compensating rollback: replacement -> Pending/Signed and clear only the failed
    // activation evidence (activated_at, activated_by); ALL signing evidence is preserved,
    // so the property keeps exactly one Active (the old one). G) if rollback also fails
    // -> critical conflict (possible dual Active), explicitly reported and logged, never
    // reported as success. The old Active is never ended before the replacement has
    // successfully become Active, so a failure can never leave the property with zero
    // Active agreements. Signed evidence is never deleted or altered at any step.

    // C. Activate the replacement first.
    try {
      await base44.asServiceRole.entities.PropertyServiceAgreement.update(agreement_id, {
        status: 'Active',
        activated_at: now,
        activated_by,
      });
    } catch (e) {
      await auditAgreementEvent(base44, {
        automation_type: 'Replacement activation failed',
        record_created: `Agreement ${agreement_id} v${agreement.agreement_version ?? 1} activation update failed`,
        property_id: agreement.property_id || '',
        status: 'failure',
      });
      return Response.json({
        error: 'The replacement could not be activated. The original agreement remains active.',
      }, { status: 500 });
    }

    // D. Attempt to End each prior Active version (retry once per record).
    const endFailed = [];
    for (const a of priorActive) {
      let ok = false;
      try {
        await base44.asServiceRole.entities.PropertyServiceAgreement.update(a.id, {
          status: 'Ended', ended_at: now,
        });
        ok = true;
      } catch (e1) {
        try {
          await base44.asServiceRole.entities.PropertyServiceAgreement.update(a.id, {
            status: 'Ended', ended_at: now,
          });
          ok = true;
        } catch (e2) {}
      }
      if (ok) {
        await auditAgreementEvent(base44, {
          automation_type: 'Agreement replaced / previous version ended',
          record_created: `Agreement ${a.id} v${a.agreement_version ?? 1} ended (replaced by v${agreement.agreement_version ?? 1})`,
          property_id: a.property_id || '',
          status: 'success',
        });
      } else {
        endFailed.push(a);
      }
    }

    // E. Normal success: every prior Active ended.
    if (endFailed.length === 0) {
      await auditAgreementEvent(base44, {
        automation_type: 'Agreement activated',
        record_created: `Agreement ${agreement_id} v${agreement.agreement_version ?? 1} activated (replacement)${agreement.is_test_agreement === true ? ' (TEST)' : ''}`,
        property_id: agreement.property_id || '',
        status: 'success',
      });
      return Response.json({
        ok: true,
        status: 'Active',
        activated_at: now,
        activated_by,
        prior_ended: priorActive.map((a) => a.id),
      });
    }

    // F. End failed -> compensating rollback. Restore the replacement to Pending/Signed
    // and clear only the failed activation evidence (activated_at, activated_by). All
    // signing evidence (signed_at, signer_*, signature_hash, signature_url, signed_pdf_url,
    // consent_*, sent_snapshot, sent_snapshot_hash) is preserved unchanged.
    await auditAgreementEvent(base44, {
      automation_type: 'Replacement activation failed',
      record_created: `Agreement ${agreement_id} v${agreement.agreement_version ?? 1} prior-end failed (prior ids: ${endFailed.map((a) => a.id).join(', ')})`,
      property_id: agreement.property_id || '',
      status: 'failure',
    });

    let rollbackOk = false;
    try {
      await base44.asServiceRole.entities.PropertyServiceAgreement.update(agreement_id, {
        status: 'Pending',
        activated_at: '',
        activated_by: '',
      });
      rollbackOk = true;
    } catch (e1) {
      try {
        await base44.asServiceRole.entities.PropertyServiceAgreement.update(agreement_id, {
          status: 'Pending',
          activated_at: '',
          activated_by: '',
        });
        rollbackOk = true;
      } catch (e2) {}
    }

    if (rollbackOk) {
      await auditAgreementEvent(base44, {
        automation_type: 'Replacement activation rolled back',
        record_created: `Agreement ${agreement_id} v${agreement.agreement_version ?? 1} rolled back to Pending/Signed`,
        property_id: agreement.property_id || '',
        status: 'success',
      });
      return Response.json({
        status: 'rollback_complete',
        message: 'The replacement could not be activated because the previous agreement could not be ended. The original agreement remains active.',
        agreement_id,
        prior_active: endFailed.map((a) => a.id),
      }, { status: 409 });
    }

    // G. Rollback failed too -> critical conflict. Possible dual Active. Never report
    // success; do not alter any signed evidence. Staff must resolve manually.
    await auditAgreementEvent(base44, {
      automation_type: 'Replacement activation recovery failed',
      record_created: `Agreement ${agreement_id} v${agreement.agreement_version ?? 1} rollback failed — possible dual active (prior ids: ${endFailed.map((a) => a.id).join(', ')})`,
      property_id: agreement.property_id || '',
      status: 'failure',
    });
    return Response.json({
      status: 'critical_conflict',
      message: 'Replacement activation could not be completed cleanly. More than one active agreement may require administrative resolution.',
      agreement_id,
      prior_active: endFailed.map((a) => a.id),
    }, { status: 500 });
  } catch (error) {
    return Response.json({ error: error && error.message ? error.message : String(error) }, { status: 500 });
  }
}