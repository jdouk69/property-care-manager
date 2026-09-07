import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildVisitReminders } from '../../shared/visitReminders.js';
import { buildCoverageAlerts } from '../../shared/visitCoverage.js';
import { resolveReminderOffsets } from '../../shared/reminderOffsets.js';
import { athensToday, athensTime } from '../../shared/timezone.js';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  try {
    const [visits, settingsList, properties, clients, existingNotifs, agreements, packages] = await Promise.all([
      base44.asServiceRole.entities.PropertyVisit.list("-start_time", 500),
      base44.asServiceRole.entities.BusinessSettings.list("-created_date", 1),
      base44.asServiceRole.entities.Property.list("-created_date", 500),
      base44.asServiceRole.entities.Client.list("-created_date", 500),
      base44.asServiceRole.entities.Notification.list("-created_date", 500),
      base44.asServiceRole.entities.PropertyServiceAgreement.list("-created_date", 500),
      base44.asServiceRole.entities.ServicePackage.list("-created_date", 500),
    ]);

    const settings = (settingsList && settingsList[0]) || {};
    // Per-category timing: the Visits category uses its own stored offsets when
    // present, otherwise falls back to the global default (backward compat).
    // Recurring coverage alerts (10th/22nd) are independent of these offsets.
    const offsets = resolveReminderOffsets(settings, "Visits");
    const categories = settings.notif_categories || [];

    if (!categories.includes("Visits")) {
      return Response.json({ ok: true, generated: 0, reason: "Visits category off" });
    }

    const propMap = {};
    (properties || []).forEach((p) => (propMap[p.id] = p));
    const clientMap = {};
    (clients || []).forEach((c) => (clientMap[c.id] = c));

    const enriched = (visits || [])
      .filter((v) => !v.archived && v.status === "Scheduled")
      .map((v) => {
        const prop = propMap[v.property_id];
        const client = clientMap[prop && prop.owner_id];
        const st = v.scheduled_time || v.start_time;
        return {
          id: v.id,
          propertyId: v.property_id,
          status: v.status,
          archived: v.archived,
          visitType: v.visit_type,
          scheduledTime: st,
          scheduledMs: st ? new Date(st).getTime() : null,
          propertyName: (prop && prop.name) || "Property",
          clientName: (client && client.name) || "Client",
        };
      });

    const desired = buildVisitReminders({ visits: enriched, offsets, nowMs: Date.now() });

    // ADDITIONAL warning-only check: recurring packages whose expected
    // included visit for the current service period was never scheduled.
    // Uses the RAW visit list — coverage counts Completed / In Progress /
    // Scheduled visits, not just the Scheduled ones reminders use.
    // Never creates or modifies visits (see base44/shared/visitCoverage.js).
    const coverageAlerts = buildCoverageAlerts({
      agreements: agreements || [],
      visits: visits || [],
      packages: packages || [],
      properties: properties || [],
      clients: clients || [],
      todayStr: athensToday(),
    });

    const existingKeys = new Set((existingNotifs || []).map((n) => n.dedup_key).filter(Boolean));
    const toCreate = [...desired, ...coverageAlerts].filter((d) => d.dedup_key && !existingKeys.has(d.dedup_key));

    let created = 0;
    for (const d of toCreate) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          title: d.title,
          message: d.message,
          type: d.type,
          priority: d.priority,
          related_entity: d.related_entity,
          related_record_id: d.related_record_id,
          related_property_id: d.related_property_id,
          related_path: d.related_path,
          dedup_key: d.dedup_key,
          read: false,
          date: athensToday(),
          time: athensTime(),
        });
        created++;
      } catch (e) {
        // continue creating the rest; log the failure below
      }
    }

    if (created > 0) await log(base44, "Visit reminders: generated", created, "success");
    return Response.json({ ok: true, generated: created, scanned: enriched.length, coverage: coverageAlerts.length });
  } catch (error) {
    try {
      await log(base44, "Visit reminders: failed", 0, "failure", String(error && error.message ? error.message : error));
    } catch (e) {}
    return Response.json({ error: error && error.message ? error.message : String(error) }, { status: 500 });
  }
}

async function log(base44, automationType, count, status, err) {
  try {
    await base44.asServiceRole.entities.AutomationLog.create({
      date_time: new Date().toISOString(),
      automation_type: automationType,
      record_created: `${count} notification(s)`,
      related_property_id: "",
      status: status || "success",
      error_details: err || "",
    });
  } catch (e) {}
}