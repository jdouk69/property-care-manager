import { base44 } from "@/api/base44Client";
import { buildVisitReminders } from "@/lib/visitReminders";
import { resolveReminderOffsets } from "@/lib/reminderOffsets";

export async function createNotification(n) {
  try {
    if (n.dedup_key) {
      const existing = await base44.entities.Notification.filter(
        { dedup_key: n.dedup_key },
        "-created_date",
        1
      );
      if (existing && existing.length) return null;
    }
    return await base44.entities.Notification.create({
      title: n.title,
      message: n.message || "",
      type: n.type || "System",
      priority: n.priority || "Medium",
      related_entity: n.related_entity || "",
      related_record_id: n.related_record_id || "",
      related_property_id: n.related_property_id || "",
      related_path: n.related_path || "",
      dedup_key: n.dedup_key || "",
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      read: false,
    });
  } catch (e) {
    return null;
  }
}

function push(arr, n) {
  arr.push(n);
}

export async function generateTimeBasedNotifications() {
  // The user's saved Settings are the source of truth. An intentionally empty array
  // means "off" — never silently replaced with defaults. Defaults apply only when no
  // BusinessSettings record/field exists at all.
  let prefs = { reminder_offsets: [], reminder_offsets_by_category: null, notif_categories: [] };
  try {
    const list = await base44.entities.BusinessSettings.list("-created_date", 1);
    if (list && list[0]) {
      prefs.reminder_offsets = list[0].reminder_offsets || [];
      prefs.reminder_offsets_by_category = list[0].reminder_offsets_by_category || null;
      prefs.notif_categories = list[0].notif_categories || [];
    }
  } catch (e) {}

  const cat = (c) => prefs.notif_categories.includes(c);
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const daysAhead = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  // "Due soon" horizon for tasks now uses the Tasks category's own timing
  // (falls back to the global default timing when none is stored).
  const taskOffsets = resolveReminderOffsets(prefs, "Tasks");
  const soonMax = taskOffsets.includes("7d")
    ? 7
    : taskOffsets.includes("3d")
    ? 3
    : taskOffsets.includes("1d")
    ? 1
    : 0;

  let tasks = [], maintenance = [], expenses = [], keys = [], props = [], visits = [], clients = [];
  try {
    [tasks, maintenance, expenses, keys, props, visits, clients] = await Promise.all([
      base44.entities.Task.list("-date", 500),
      base44.entities.MaintenanceIssue.list("-created_date", 500),
      base44.entities.Expense.list("-date", 500),
      base44.entities.Key.list("-created_date", 500),
      base44.entities.Property.list("-created_date", 500),
      base44.entities.PropertyVisit.list("-start_time", 500),
      base44.entities.Client.list("-created_date", 500),
    ]);
  } catch (e) {
    return;
  }

  const desired = [];
  const active = (t) =>
    t.status !== "Completed" && t.status !== "Cancelled" && t.recurrence_status !== "skipped";

  if (cat("Tasks")) {
    tasks
      .filter((t) => active(t) && t.date === today)
      .forEach((t) =>
        push(desired, {
          title: "Task due today", message: t.title, type: "Task", priority: t.priority,
          related_entity: "Task", related_record_id: t.id, related_property_id: t.property_id,
          related_path: "/tasks", dedup_key: `task_due_today:${t.id}:${today}`,
        })
      );
    if (soonMax > 0) {
      tasks
        .filter((t) => active(t) && t.date && t.date > today && t.date <= daysAhead(soonMax))
        .forEach((t) =>
          push(desired, {
            title: "Task due soon", message: `${t.title} — ${t.date}`, type: "Task", priority: t.priority,
            related_entity: "Task", related_record_id: t.id, related_property_id: t.property_id,
            related_path: "/tasks", dedup_key: `task_due_soon:${t.id}:${t.date}`,
          })
        );
    }
    tasks
      .filter((t) => active(t) && t.date && t.date < today)
      .forEach((t) =>
        push(desired, {
          title: "Overdue task", message: t.title, type: "Task", priority: "Urgent",
          related_entity: "Task", related_record_id: t.id, related_property_id: t.property_id,
          related_path: "/tasks", dedup_key: `task_overdue:${t.id}:${t.date}`,
        })
      );
  }

  // Standalone Inspection notifications retired (Phase 3) — field work now runs
  // exclusively through Property Visits, which have their own reminders above.

  if (cat("Contractors")) {
    tasks
      .filter((t) => active(t) && t.type === "Contractor Meeting" && t.date === today)
      .forEach((t) =>
        push(desired, {
          title: "Contractor appointment today", message: t.title, type: "Contractor", priority: "High",
          related_entity: "Task", related_record_id: t.id, related_property_id: t.property_id,
          related_path: "/tasks", dedup_key: `contractor_today:${t.id}:${today}`,
        })
      );
  }

  if (cat("Maintenance")) {
    maintenance
      .filter((m) => m.priority === "Urgent" && m.status !== "Completed" && m.status !== "Cancelled")
      .forEach((m) =>
        push(desired, {
          title: "Emergency maintenance issue", message: m.title, type: "Maintenance", priority: "Urgent",
          related_entity: "MaintenanceIssue", related_record_id: m.id, related_property_id: m.property_id,
          related_path: "/maintenance", dedup_key: `maint_urgent:${m.id}`,
        })
      );
    maintenance
      .filter((m) => m.priority === "High" && m.status !== "Completed" && m.status !== "Cancelled")
      .forEach((m) =>
        push(desired, {
          title: "High-priority maintenance issue", message: m.title, type: "Maintenance", priority: "High",
          related_entity: "MaintenanceIssue", related_record_id: m.id, related_property_id: m.property_id,
          related_path: "/maintenance", dedup_key: `maint_high:${m.id}`,
        })
      );
  }

  if (cat("Expenses")) {
    expenses
      .filter((e) => e.awaiting_reimbursement && !e.reimbursed && e.date && e.date < daysAhead(-14))
      .forEach((e) =>
        push(desired, {
          title: "Reimbursement overdue", message: `${e.vendor} — €${(e.amount || 0).toFixed(2)}`,
          type: "System", priority: "Medium",
          related_entity: "Expense", related_record_id: e.id, related_property_id: e.property_id,
          related_path: "/expenses", dedup_key: `reimb_overdue:${e.id}`,
        })
      );
  }

  if (cat("Keys")) {
    keys
      .filter((k) => k.date_issued && !k.date_returned)
      .forEach((k) =>
        push(desired, {
          title: "Key not returned", message: `Key ${k.key_number}`, type: "System", priority: "Medium",
          related_entity: "Key", related_record_id: k.id, related_property_id: k.property_id,
          related_path: "/keys", dedup_key: `key_unreturned:${k.id}`,
        })
      );
  }

  if (cat("Visits")) {
    const propMap = {}; (props || []).forEach((p) => (propMap[p.id] = p));
    const clientMap = {}; (clients || []).forEach((c) => (clientMap[c.id] = c));
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
    buildVisitReminders({ visits: enriched, offsets: resolveReminderOffsets(prefs, "Visits"), nowMs: Date.now() }).forEach((n) => push(desired, n));
  }

  if (!desired.length) return;

  // dedup against existing
  let existing = new Set();
  try {
    const all = await base44.entities.Notification.list("-created_date", 500);
    (all || []).forEach((n) => existing.add(n.dedup_key));
  } catch (e) {}

  const toCreate = desired.filter((d) => d.dedup_key && !existing.has(d.dedup_key));
  if (!toCreate.length) return;

  await Promise.all(toCreate.map((d) => createNotification(d)));

  try {
    await base44.entities.AutomationLog.create({
      date_time: new Date().toISOString(),
      automation_type: "Notifications: generated",
      record_created: `${toCreate.length} notification(s)`,
      related_property_id: "",
      status: "success",
      error_details: "",
    });
  } catch (e) {}
}