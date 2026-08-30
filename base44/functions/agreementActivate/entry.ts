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
        record_created: `Agreement ${agreement_id} v${agreement.agreement_version ?? 1} activated`,
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
    // 1) Activate the replacement FIRST. 2) Then end the prior Active version(s).
    // This guarantees the property is never left with zero Active agreements because
    // of a failed second update. If the end fails (retried once), the property briefly
    // has two Active agreements in the same group; the replacement is the intended one
    // and the conflict guard surfaces the stale one for manual resolution. We never
    // end before activating, and never end on an unsigned replacement.
    await base44.asServiceRole.entities.PropertyServiceAgreement.update(agreement_id, {
      status: 'Active',
      activated_at: now,
      activated_by,
    });
    await auditAgreementEvent(base44, {
      automation_type: 'Agreement activated',
      record_created: `Agreement ${agreement_id} v${agreement.agreement_version ?? 1} activated (replacement)`,
      property_id: agreement.property_id || '',
      status: 'success',
    });

    let endWarning = '';
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
        endWarning = 'The replacement was activated, but the previous active agreement could not be ended automatically. Resolve it manually from the agreement page.';
        await auditAgreementEvent(base44, {
          automation_type: 'Agreement replaced / previous version ended',
          record_created: `Agreement ${a.id} v${a.agreement_version ?? 1} end failed — manual resolution required`,
          property_id: a.property_id || '',
          status: 'failure',
        });
      }
    }

    return Response.json({
      ok: true,
      status: 'Active',
      activated_at: now,
      activated_by,
      prior_ended: priorActive.map((a) => a.id),
      warning: endWarning || undefined,
    });
  } catch (error) {
    return Response.json({ error: error && error.message ? error.message : String(error) }, { status: 500 });
  }
}