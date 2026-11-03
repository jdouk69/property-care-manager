import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { athensToday } from '../../shared/timezone.js';
import { addDays } from '../../shared/servicePeriods.js';
import { coveredThrough } from '../../shared/recurringCharges.js';

// Owner/Admin action for pausing a signed, active agreement and resuming it
// without billing for months spent paused. Existing charges are left intact.
export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Owner/Admin access is required.' }, { status: 403 });

  let body: any = {};
  try { body = await req.json(); } catch (e) {}
  const action = body?.action;
  const agreementId = body?.agreement_id;
  if (!['pause', 'resume'].includes(action) || typeof agreementId !== 'string' || !agreementId) {
    return Response.json({ error: 'Choose pause or resume and provide an agreement.' }, { status: 400 });
  }

  const agreements = base44.asServiceRole.entities.PropertyServiceAgreement;
  let agreement;
  try { agreement = await agreements.get(agreementId); } catch (e) { agreement = null; }
  if (!agreement || agreement.archived) return Response.json({ error: 'Agreement not found.' }, { status: 404 });
  if (agreement.signing_status !== 'Signed') return Response.json({ error: 'Only signed agreements can be paused or resumed.' }, { status: 409 });

  const now = new Date().toISOString();
  let changes;
  let message;
  if (action === 'pause') {
    if (agreement.status !== 'Active') return Response.json({ error: 'Only an active agreement can be paused.' }, { status: 409 });
    const pauseUntil = String(body?.pause_until || '').trim();
    if (pauseUntil && (!/^\d{4}-\d{2}-\d{2}$/.test(pauseUntil) || pauseUntil <= athensToday())) {
      return Response.json({ error: 'Choose a future resume date, or leave it blank to resume manually.' }, { status: 400 });
    }
    changes = { status: 'Paused', paused_at: now, pause_until: pauseUntil, last_paused_at: now };
    message = pauseUntil ? `Agreement paused until ${pauseUntil}.` : 'Agreement paused; resume it manually when service restarts.';
  } else {
    if (agreement.status !== 'Paused') return Response.json({ error: 'Only a paused agreement can be resumed.' }, { status: 409 });
    const charges = await base44.asServiceRole.entities.BillingCharge.list('-created_date', 500).catch(() => []);
    const covered = coveredThrough(agreement.property_id, charges || []);
    const today = athensToday();
    const nextBillingAnchor = covered && addDays(covered, 1) > today ? addDays(covered, 1) : today;
    changes = {
      status: 'Active',
      paused_at: '',
      pause_until: '',
      billing_anchor_date: nextBillingAnchor,
      last_resumed_at: now,
    };
    message = `Agreement resumed. Billing restarts ${nextBillingAnchor}; paused months will not be billed later.`;
  }

  try {
    await agreements.update(agreementId, changes);
    try {
      await base44.asServiceRole.entities.AutomationLog.create({
        date_time: now,
        automation_type: action === 'pause' ? 'Agreement paused' : 'Agreement resumed',
        record_created: `Agreement ${agreementId}: ${message}`,
        related_property_id: agreement.property_id || '',
        status: 'success',
      });
    } catch (e) {}
    return Response.json({ ok: true, action, status: changes.status, billing_anchor_date: changes.billing_anchor_date || agreement.billing_anchor_date || '', pause_until: changes.pause_until || '', message });
  } catch (error) {
    return Response.json({ error: error?.message || 'Could not update this agreement.' }, { status: 500 });
  }
}
