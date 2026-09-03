import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildRecurringCharges } from '../../shared/recurringCharges.js';
import { athensToday } from '../../shared/timezone.js';

// Generates the current month's recurring billing charges from Active + Signed
// service agreements. Policies (approved 2026-09):
//   - Net 14: due_date = billing_date + 14 days (matches signed agreement terms).
//   - Duplicate protection: at most ONE charge per agreement per billing month.
//     ALL existing charges (manual or automatic, Due/Paid/Waived, archived
//     included) block regeneration — see shared/recurringCharges.js.
//   - Mid-month starts (start day > 1) are never auto-billed for the start month.
// Idempotent, so it can safely run daily.
// Optional payload { "dryRun": true } computes and returns the charges WITHOUT
// creating them; a dry run may also pass { "period": "YYYY-MM" } to target a
// specific billing month for verification (live runs always use the current month).

export default async function(req) {
  const base44 = createClientFromRequest(req);
  let body = {};
  try { body = await req.json(); } catch (e) { body = {}; }
  const dryRun = !!(body && body.dryRun);
  // Verification affordance: a dry run may target a specific billing period (YYYY-MM).
  // Live runs ALWAYS use the current Athens month — the override is dry-run only.
  const overridePeriod =
    dryRun && typeof (body && body.period) === "string" && /^\d{4}-\d{2}$/.test(body.period)
      ? body.period
      : "";

  try {
    const todayStr = overridePeriod ? `${overridePeriod}-01` : athensToday();
    const period = todayStr.slice(0, 7);

    const [agreements, pkgs, existingCharges] = await Promise.all([
      base44.asServiceRole.entities.PropertyServiceAgreement.list("-created_date", 500),
      base44.asServiceRole.entities.ServicePackage.list("-created_date", 500),
      // Duplicate protection: ALL charges, not just this period's. The shared
      // builder derives each charge's billing month (billing_period, else
      // billing_date) and blocks regeneration for any agreement+month that
      // already has a charge — manual or automatic, any status, archived included.
      base44.asServiceRole.entities.BillingCharge.list("-created_date", 500),
    ]);

    const packages = {};
    (pkgs || []).forEach((p) => { packages[p.id] = p; });

    const desired = buildRecurringCharges({
      agreements: agreements || [],
      packages,
      existingCharges: existingCharges || [],
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