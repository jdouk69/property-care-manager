import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildRecurringCharges } from '../../shared/recurringCharges.js';
import { athensToday } from '../../shared/timezone.js';

// Generates the current month's recurring billing charges from Active + Signed
// service agreements. Idempotent: one charge per agreement per billing period,
// protected by source_key (`agreement:<id>:<YYYY-MM>`), so it can safely run daily.
// Optional payload { "dryRun": true } computes and returns the charges WITHOUT creating them.

export default async function(req) {
  const base44 = createClientFromRequest(req);
  let body = {};
  try { body = await req.json(); } catch (e) { body = {}; }
  const dryRun = !!(body && body.dryRun);

  try {
    const todayStr = athensToday();
    const period = todayStr.slice(0, 7);

    const [agreements, pkgs, existingCharges] = await Promise.all([
      base44.asServiceRole.entities.PropertyServiceAgreement.list("-created_date", 500),
      base44.asServiceRole.entities.ServicePackage.list("-created_date", 500),
      // Duplicate protection: charges already created for THIS billing period.
      // Only automation sets billing_period, so this set stays small and precise.
      base44.asServiceRole.entities.BillingCharge.filter({ billing_period: period }, "-created_date", 500),
    ]);

    const packages = {};
    (pkgs || []).forEach((p) => { packages[p.id] = p; });
    const existingSourceKeys = new Set((existingCharges || []).map((c) => c.source_key).filter(Boolean));

    const desired = buildRecurringCharges({
      agreements: agreements || [],
      packages,
      existingSourceKeys,
      todayStr,
    });

    if (dryRun) {
      return Response.json({
        ok: true,
        dryRun: true,
        period,
        agreementsScanned: (agreements || []).length,
        wouldCreate: desired.length,
        charges: desired,
      });
    }

    let created = 0;
    const createdSummary = [];
    for (const d of desired) {
      try {
        const rec = await base44.asServiceRole.entities.BillingCharge.create(d);
        created++;
        createdSummary.push({ id: rec.id, description: d.description, amount: d.amount, client_id: d.client_id, property_id: d.property_id });
      } catch (e) {
        // continue creating the rest; log the failure below
      }
    }

    if (created > 0) await log(base44, "Recurring charges: generated", created, "success");
    return Response.json({ ok: true, period, scanned: (agreements || []).length, created, charges: createdSummary });
  } catch (error) {
    try {
      await log(base44, "Recurring charges: failed", 0, "failure", String(error && error.message ? error.message : error));
    } catch (e) {}
    return Response.json({ error: error && error.message ? error.message : String(error) }, { status: 500 });
  }
}

async function log(base44, automationType, count, status, err) {
  try {
    await base44.asServiceRole.entities.AutomationLog.create({
      date_time: new Date().toISOString(),
      automation_type: automationType,
      record_created: `${count} billing charge(s)`,
      related_property_id: "",
      status: status || "success",
      error_details: err || "",
    });
  } catch (e) {}
}