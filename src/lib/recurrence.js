import { base44 } from "@/api/base44Client";
import { createNotification } from "@/lib/notifications";

export const REPEAT_OPTIONS = [
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Biweekly", label: "Every 2 weeks" },
  { value: "Monthly", label: "Monthly" },
  { value: "Bimonthly", label: "Every 2 months" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Semiannual", label: "Every 6 months" },
  { value: "Yearly", label: "Yearly" },
  { value: "Custom", label: "Custom interval" },
];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LABELS = {
  Daily: "Daily", Weekly: "Weekly", Biweekly: "Every 2 weeks",
  Monthly: "Monthly", Bimonthly: "Every 2 months", Quarterly: "Quarterly",
  Semiannual: "Every 6 months", Yearly: "Yearly", Custom: "Custom",
};

export function buildRepeatLabel(rule) {
  if (!rule) return "";
  if (rule.frequency === "Custom") return `Every ${rule.interval || 1} day(s)`;
  return LABELS[rule.frequency] || rule.frequency;
}

export function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function computeNextDate(rule, fromDateStr) {
  const from = new Date((fromDateStr || isoDate()) + "T00:00:00");
  const freq = rule.frequency;
  const interval = rule.interval || 1;
  const next = new Date(from);
  switch (freq) {
    case "Daily":
      next.setDate(from.getDate() + interval);
      break;
    case "Weekly": {
      const days = rule.days_of_week || [];
      if (days.length) {
        const d = new Date(from);
        d.setDate(d.getDate() + 1);
        for (let i = 0; i < 14; i++) {
          const wd = (d.getDay() + 6) % 7; // Mon=0
          if (days.includes(wd)) break;
          d.setDate(d.getDate() + 1);
        }
        next.setTime(d.getTime());
      } else {
        next.setDate(from.getDate() + 7);
      }
      break;
    }
    case "Biweekly":
      next.setDate(from.getDate() + 14);
      break;
    case "Monthly":
      next.setMonth(from.getMonth() + 1);
      break;
    case "Bimonthly":
      next.setMonth(from.getMonth() + 2);
      break;
    case "Quarterly":
      next.setMonth(from.getMonth() + 3);
      break;
    case "Semiannual":
      next.setMonth(from.getMonth() + 6);
      break;
    case "Yearly":
      next.setFullYear(from.getFullYear() + 1);
      break;
    case "Custom":
      next.setDate(from.getDate() + interval);
      break;
    default:
      next.setDate(from.getDate() + 7);
  }
  if (rule.day_of_month && ["Monthly", "Bimonthly", "Quarterly", "Semiannual", "Yearly"].includes(freq)) {
    const dom = Math.min(rule.day_of_month, 28);
    next.setDate(dom);
  }
  return next.toISOString().slice(0, 10);
}

async function log(type, ctx, status, record) {
  try {
    await base44.entities.AutomationLog.create({
      date_time: new Date().toISOString(),
      automation_type: type,
      record_created: record ? (record.title || record.name || "—") : (ctx?.title || "—"),
      related_property_id: ctx?.property_id || "",
      status: status || "success",
      error_details: status === "failure" ? (ctx?.error || "Unknown error") : "",
    });
  } catch (e) {}
}

function templateFields(rule) {
  return {
    title: rule.title,
    type: rule.task_type,
    task_type: rule.task_type,
    priority: rule.priority || "Medium",
    assigned_to: rule.assigned_to || "",
    property_id: rule.property_id || "",
    notes: rule.notes || "",
    inspector: rule.inspector || "",
    recurrence_id: rule.id,
    is_recurring: true,
    repeat_label: buildRepeatLabel(rule),
    recurrence_status: "active",
  };
}

async function createOccurrenceOnDate(rule, date) {
  const payload = {
    ...templateFields(rule),
    date,
    occurrence_date: date,
    time: rule.reminder_time || "",
    status: rule.entity_type === "Task" ? "Pending" : "Draft",
  };
  const created = await base44.entities[rule.entity_type].create(payload);
  await base44.entities.RecurrenceRule.update(rule.id, { next_date: date });
  await log("Recurrence: next occurrence created", rule, "success", created);
  await createNotification({
    title: "Recurring task created",
    message: `${rule.title} — ${date}`,
    type: "Task",
    priority: "Medium",
    related_entity: rule.entity_type,
    related_property_id: rule.property_id,
    related_path: rule.entity_type === "Task" ? "/tasks" : "/inspections",
    dedup_key: `recur_created:${rule.id}:${date}`,
  });
  return created;
}

export async function generateNextOccurrence(ruleId, fromDateStr) {
  let rule;
  try {
    rule = await base44.entities.RecurrenceRule.get(ruleId);
  } catch (e) {
    return null;
  }
  if (rule.status !== "active") {
    await log("Recurrence: skipped (series not active)", rule, "success");
    return null;
  }
  const nextDate = computeNextDate(rule, fromDateStr);
  if (rule.end_date && nextDate > rule.end_date) {
    await base44.entities.RecurrenceRule.update(ruleId, { status: "ended", next_date: null });
    await log("Recurrence: series ended (end date reached)", rule, "success");
    return null;
  }
  // dedup: don't create if an occurrence already exists on that date
  try {
    const existing = await base44.entities[rule.entity_type].filter(
      { recurrence_id: ruleId, occurrence_date: nextDate },
      "-created_date",
      1
    );
    if (existing && existing.length) return existing[0];
  } catch (e) {}
  try {
    return await createOccurrenceOnDate(rule, nextDate);
  } catch (e) {
    await log("Recurrence: failed to create next occurrence", { ...rule, error: String(e) }, "failure");
    return null;
  }
}

export async function completeOccurrence(entityType, record) {
  if (!record || !record.recurrence_id) return null;
  return generateNextOccurrence(record.recurrence_id, record.occurrence_date || record.date);
}

export async function skipOccurrence(entityType, recordId) {
  const rec = await base44.entities[entityType].get(recordId);
  try {
    await base44.entities[entityType].update(recordId, {
      recurrence_status: "skipped",
      status: entityType === "Task" ? "Cancelled" : "Draft",
    });
  } catch (e) {}
  await log("Recurrence: occurrence skipped", { property_id: rec.property_id, title: rec.title }, "success");
  if (rec.recurrence_id) return generateNextOccurrence(rec.recurrence_id, rec.occurrence_date || rec.date);
  return null;
}

export async function pauseSeries(ruleId) {
  await base44.entities.RecurrenceRule.update(ruleId, { status: "paused" });
  await log("Recurrence: series paused", {}, "success");
}

export async function endSeries(ruleId) {
  await base44.entities.RecurrenceRule.update(ruleId, { status: "ended" });
  await log("Recurrence: series ended", {}, "success");
}

export async function updateSeriesTemplate(ruleId, fields) {
  await base44.entities.RecurrenceRule.update(ruleId, fields);
  await log("Recurrence: series template updated", { property_id: fields?.property_id }, "success");
}

export async function resumeSeries(ruleId) {
  const rule = await base44.entities.RecurrenceRule.get(ruleId);
  await base44.entities.RecurrenceRule.update(ruleId, { status: "active" });
  await log("Recurrence: series resumed", rule, "success");
  // ensure a pending occurrence exists
  try {
    const pending = await base44.entities[rule.entity_type].filter(
      { recurrence_id: ruleId, recurrence_status: "active" },
      "-created_date",
      50
    );
    const hasPending = (pending || []).some((r) => r.status !== "Completed" && r.status !== "Cancelled");
    if (!hasPending) {
      let d = rule.next_date || isoDate();
      if (d < isoDate()) d = isoDate();
      await createOccurrenceOnDate(rule, d);
    }
  } catch (e) {}
}

export async function createRuleFromOccurrence(entityType, values, record) {
  const startDate = values.occurrence_date || values.date;
  const rulePayload = {
    entity_type: entityType,
    title: values.title || record?.title || "Recurring task",
    task_type: values.type,
    inspector: values.inspector,
    priority: values.priority,
    assigned_to: values.assigned_to,
    property_id: values.property_id,
    notes: values.notes,
    frequency: values.frequency || "Weekly",
    interval: values.interval || 1,
    days_of_week: values.days_of_week || [],
    day_of_month: values.day_of_month,
    start_date: startDate,
    end_date: values.end_date || null,
    reminder_time: values.reminder_time || values.time || "",
    status: "active",
    next_date: startDate,
  };
  const rule = await base44.entities.RecurrenceRule.create(rulePayload);
  try {
    await base44.entities[entityType].update(record.id, {
      recurrence_id: rule.id,
      is_recurring: true,
      occurrence_date: startDate,
      repeat_label: buildRepeatLabel(rulePayload),
      recurrence_status: "active",
    });
  } catch (e) {}
  await log("Recurrence: series created", rulePayload, "success", record);
  await createNotification({
    title: "Recurring series created",
    message: `${rulePayload.title} (${buildRepeatLabel(rulePayload)})`,
    type: "Task",
    priority: "Medium",
    related_entity: entityType,
    related_property_id: rulePayload.property_id,
    related_path: entityType === "Task" ? "/tasks" : "/inspections",
    dedup_key: `recur_series:${rule.id}`,
  });
  return rule;
}