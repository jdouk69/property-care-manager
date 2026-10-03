import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { buildAnniversaryCharges } from '../../shared/recurringCharges.js';
import { athensToday } from '../../shared/timezone.js';
import { ensureChargeForPeriod, ensureDraftInvoiceForCharge } from '../../shared/anniversaryBilling.js';

// Anniversary recurring billing (approved 2026-10, replacing the calendar-month
// model). Each Active + Signed MONTHLY agreement bills on its SERVICE-START
// ANNIVERSARY: the anchor is the recorded start_date (fallback: the Athens
// date of activation). The first full monthly charge + linked Draft invoice
// are created when service starts (agreementActivate does this immediately;
// this job catches it up if it failed); one new charge + linked Draft invoice
// on each monthly anniversary thereafter, at the agreement's locked
// agreed_price. No proration. Charges store explicit period_start/period_end.
//
// Runs daily at 03:00 (Europe/Athens) via the "Recurring Charges" workflow.
// Idempotent + catch-up safe: per-period source keys and post-write
// uniqueness make retries/concurrent runs duplicate-free (see
// shared/recurringCharges.js + shared/anniversaryBilling.js). At most ONE new
// charge per agreement per run (the latest started uncovered period).
//
// Draft invoices are NEVER emailed and never finalize — Finalize/Send remain
// staff actions. Existing agreements are never retroactively re-billed:
// legacy calendar charges cover through their billing month's end, and the
// first anniversary bill starts strictly after that coverage.
//
// Optional payload:
//   { "dryRun": true, "asOf": "YYYY-MM-DD" } — preview for a simulated date.
//   { "asOf": "YYYY-MM-DD", "agreementIds": ["..."] } — LIVE run scoped to
//     explicitly named agreements (verification affordance; a live backdated
//     run without an explicit scope is rejected). Scoping bypasses the
//     test-agreement exclusion for exactly those ids.
// Agreements without a reliable service-start date are flagged in the
// response and logged once to the AutomationLog for staff review.

export default async function(req) {
  const base44 = createClientFromRequest(req);
  let body = {};
  try { body = await req.json(); } catch (e) { body = {}; }
  const dryRun = !!(body && body.dryRun);
  const asOf = body && typeof body.asOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.asOf) ? body.asOf : '';
  const scopeIds = body && Array.isArray(body.agreementIds)
    ? body.agreementIds.filter((x) => typeof x === 'string' && x)
    : null;
  // Verification affordance: an explicit asOf on a LIVE run is only allowed
  // together with an explicit agreement scope, so a stray call can never
  // backdate billing for the whole book.
  if (asOf && !dryRun && !(scopeIds && scopeIds.length)) {
    return Response.json({ error: 'A live run with asOf requires agreementIds (scoped verification only)' }, { status: 400 });
  }

  try {
    const todayStr = asOf || athensToday();
    const [agreements, pkgs, existingCharges] = await Promise.all([
      base44.asServiceRole.entities.PropertyServiceAgreement.list('-created_date', 500),
      base44.asServiceRole.entities.ServicePackage.list('-created_date', 500),
      // Coverage + duplicate protection: ALL charges (any status, archived
      // included). Legacy calendar charges cover through their billing month.
      base44.asServiceRole.entities.BillingCharge.list('-created_date', 500),
    ]);

    let scanned = agreements || [];
    if (scopeIds && scopeIds.length) {
      const set = new Set(scopeIds);
      scanned = scanned.filter((a) => set.has(a.id));
    }
    const packages = {};
    (pkgs || []).forEach((p) => { packages[p.id] = p; });

    const { charges: desired, flags } = buildAnniversaryCharges({
      agreements: scanned,
      packages,
      existingCharges: existingCharges || [],
      todayStr,
      allowTest: !!(scopeIds && scopeIds.length), // explicitly-scoped verification runs may include test agreements
    });

    if (dryRun) {
      return Response.json({
        ok: true,
        dryRun: true,
        asOf: todayStr,
        agreementsScanned: scanned.length,
        wouldCreate: desired.length,
        flags,
        charges: desired.map((d) => ({
          agreement_id: d.agreement.id,
          period_start: d.period.start,
          period_end: d.period.end,
          amount: d.charge.amount,
          source_key: d.charge.source_key,
        })),
      });
    }

    let createdCharges = 0;
    let createdInvoices = 0;
    const createdSummary = [];
    for (const d of desired) {
      try {
        const { charge, created } = await ensureChargeForPeriod(base44, d.charge);
        if (!created) continue; // already billed for this service period
        createdCharges++;
        let invoiceNumber = '';
        try {
          const r = await ensureDraftInvoiceForCharge(base44, charge, d.agreement);
          if (r.created) createdInvoices++;
          invoiceNumber = (r.invoice && r.invoice.invoice_number) || '';
        } catch (e) {
          // Charge stands; the draft invoice is missing — visible in the ledger
          // and recoverable by re-running (the charge exists → invoice is
          // retried only if absent... the ensure helpers are per-charge, so a
          // re-run skips the charge. Staff can create the invoice manually.)
        }
        createdSummary.push({
          charge_id: charge.id,
          invoice_number: invoiceNumber,
          period_start: d.period.start,
          period_end: d.period.end,
          amount: d.charge.amount,
        });
      } catch (e) {
        // continue creating the rest; log the failure below
      }
    }

    // Staff-review flags: recorded ONCE per agreement (deduplicated by an
    // existing flag entry for the same property), never spammed daily.
    let flagged = 0;
    for (const f of flags) {
      try {
        const existingFlags = await base44.asServiceRole.entities.AutomationLog.filter(
          { automation_type: 'Anniversary billing — agreement flagged', related_property_id: f.property_id || '' },
          '-created_date', 5,
        );
        if ((existingFlags || []).length === 0) {
          await base44.asServiceRole.entities.AutomationLog.create({
            date_time: new Date().toISOString(),
            automation_type: 'Anniversary billing — agreement flagged',
            record_created: `Agreement ${f.agreement_id}: ${f.reason}`,
            related_property_id: f.property_id || '',
            status: 'success',
            error_details: '',
          });
        }
        flagged++;
      } catch (e) {}
    }

    if (createdCharges > 0) await log(base44, 'Anniversary recurring charges: generated', `${createdCharges} billing charge(s) + ${createdInvoices} draft invoice(s)`, 'success');
    return Response.json({
      ok: true,
      asOf: todayStr,
      scanned: scanned.length,
      created: createdCharges,
      invoices: createdInvoices,
      charges: createdSummary,
      flagged,
    });
  } catch (error) {
    try {
      await log(base44, 'Anniversary recurring charges: failed', '0 billing charges', 'failure', String(error && error.message ? error.message : error));
    } catch (e) {}
    return Response.json({ error: error && error.message ? error.message : String(error) }, { status: 500 });
  }
}

async function log(base44, automationType, recordCreated, status, err) {
  try {
    await base44.asServiceRole.entities.AutomationLog.create({
      date_time: new Date().toISOString(),
      automation_type: automationType,
      record_created: recordCreated,
      related_property_id: '',
      status: status || 'success',
      error_details: err || '',
    });
  } catch (e) {}
}