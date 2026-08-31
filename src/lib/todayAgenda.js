import { athensToday, athensDate, athensTime } from "@/lib/timezone";
import { visitTypeLabel } from "@/lib/visitTypeLabels";

/**
 * Build the TODAY agenda from existing dashboard data — no duplicate records.
 * Collects actionable items scheduled for today across visits, tasks,
 * maintenance, owner-rep reports, and inspections, plus an overdue
 * (needs-attention) subsection and a completed-today list.
 *
 * Each item: { id, kind, time, timeLabel, propertyId, propertyName, clientName,
 *   typeLabel, status, to, actionLabel, actionKind, date, completed, overdue }
 *
 * actionKind: 'start-visit' | 'continue-visit' | 'view-task' | 'start-service' |
 *             'view-issue' | 'view-report' | 'view-inspection'
 */
export function buildTodayAgenda(data = {}) {
  const t = athensToday();
  const properties = data.properties || [];
  const clients = data.clients || [];
  const propName = (id) => properties.find((p) => p.id === id)?.name || "Property";
  const clientFor = (propId) => {
    const p = properties.find((x) => x.id === propId);
    return clients.find((c) => c.id === p?.owner_id)?.name || "";
  };
  const isCompleted = (s) => s === "Completed" || s === "Cancelled";
  const active = (x) => x.status !== "Completed" && x.status !== "Cancelled" && x.recurrence_status !== "skipped";

  const items = [];
  const completed = [];
  const overdue = [];

  const push = (it, bucket) => {
    if (bucket === "completed") completed.push(it);
    else if (bucket === "overdue") overdue.push(it);
    else items.push(it);
  };

  // Property visits
  (data.visits || []).forEach((v) => {
    if (v.archived) return;
    const st = v.scheduled_time || v.start_time;
    const day = st ? athensDate(st) : "";
    const isToday = day === t;
    const completedVisit = v.status === "Completed";
    const cancelled = v.status === "Cancelled";
    if (!isToday && !completedVisit) {
      // also detect overdue scheduled visits (past, still scheduled)
      if (v.status === "Scheduled" && st && new Date(st).getTime() < Date.now() - 3600000) {
        overdue.push({
          id: v.id, kind: "visit", time: st, timeLabel: athensTime(st),
          propertyId: v.property_id, propertyName: propName(v.property_id), clientName: clientFor(v.property_id),
          typeLabel: visitTypeLabel(v.visit_type), status: v.status, date: day,
          to: `/visits/${v.id}`, actionLabel: "Start Visit", actionKind: "start-visit",
          completed: false, overdue: true,
        });
      }
      return;
    }
    if (cancelled) return;
    const base = {
      id: v.id, kind: "visit", time: st, timeLabel: athensTime(st),
      propertyId: v.property_id, propertyName: propName(v.property_id), clientName: clientFor(v.property_id),
      typeLabel: visitTypeLabel(v.visit_type), status: v.status, date: day,
      to: `/visits/${v.id}`,
    };
    if (completedVisit && isToday) {
      push({ ...base, actionLabel: "View Report", actionKind: "view-report", completed: true, overdue: false }, "completed");
    } else if (v.status === "In Progress") {
      push({ ...base, actionLabel: "Continue Visit", actionKind: "continue-visit", to: `/visits?resume=${v.id}`, completed: false, overdue: false }, "today");
    } else {
      push({ ...base, actionLabel: "Start Visit", actionKind: "start-visit", completed: false, overdue: false }, "today");
    }
  });

  // Tasks (incl. arrival prep, contractor meeting, delivery, follow-ups)
  (data.tasks || []).forEach((task) => {
    if (!active(task) && task.status !== "Completed") return;
    if (task.date === t) {
      const isArrival = task.type === "Arrival preparation" || task.type === "Departure inspection";
      const done = task.status === "Completed";
      const base = {
        id: task.id, kind: isArrival ? "arrival-prep" : "task",
        time: task.time || "", timeLabel: task.time || "",
        propertyId: task.property_id, propertyName: propName(task.property_id), clientName: clientFor(task.property_id),
        typeLabel: isArrival ? (task.type === "Departure inspection" ? "Departure Inspection" : "Arrival Preparation") : (task.title || task.type || "Task"),
        status: task.status, date: task.date,
        to: `/tasks?open=${task.id}`,
      };
      if (done) {
        push({ ...base, actionLabel: "View Task", actionKind: "view-task", completed: true, overdue: false }, "completed");
      } else {
        push({
          ...base,
          actionLabel: isArrival ? "Start Service" : "View Task",
          actionKind: isArrival ? "start-service" : "view-task",
          completed: false, overdue: false,
        }, "today");
      }
    } else if (task.date && task.date < t && active(task)) {
      overdue.push({
        id: task.id, kind: "task", time: task.time || "", timeLabel: task.time || "",
        propertyId: task.property_id, propertyName: propName(task.property_id), clientName: clientFor(task.property_id),
        typeLabel: task.title || task.type || "Task", status: task.status, date: task.date,
        to: `/tasks?open=${task.id}`, actionLabel: "View Task", actionKind: "view-task", completed: false, overdue: true,
      });
    }
  });

  // Maintenance coordination appointments + follow-ups
  (data.maintenance || []).forEach((m) => {
    if (m.status === "Completed" || m.status === "Cancelled") return;
    const appt = m.scheduled_appointment;
    const fup = m.follow_up_date;
    const dueToday = (appt && appt === t) || (fup && fup === t);
    const pastDue = ((appt && appt < t) || (fup && fup < t));
    if (!dueToday && !pastDue) return;
    const base = {
      id: m.id, kind: "maintenance", time: "", timeLabel: "",
      propertyId: m.property_id, propertyName: propName(m.property_id), clientName: clientFor(m.property_id),
      typeLabel: appt && appt === t ? "Maintenance Coordination" : "Follow-up",
      status: m.status, date: appt || fup,
      to: `/maintenance?open=${m.id}`, actionLabel: "View Issue", actionKind: "view-issue",
    };
    if (dueToday) push({ ...base, completed: false, overdue: false }, "today");
    else push({ ...base, completed: false, overdue: true }, "overdue");
  });

  // Owner-rep reports (site/visit date today)
  (data.repReports || []).forEach((r) => {
    if (r.archived) return;
    if (r.visit_date === t) {
      push({
        id: r.id, kind: "owner-rep", time: "", timeLabel: "",
        propertyId: r.property_id, propertyName: propName(r.property_id), clientName: clientFor(r.property_id),
        typeLabel: "Owner-Rep Site Visit", status: r.status, date: r.visit_date,
        to: `/rep-reports?open=${r.id}`, actionLabel: "View Report", actionKind: "view-report",
        completed: false, overdue: false,
      }, "today");
    }
  });

  // Inspections. TODAY reads the real Inspection status — no separate
  // dashboard completion flag. "Completed Today" uses completed_date (set by
  // the Finish Inspection action) so an overdue inspection finished today still
  // surfaces under Completed Today even when its scheduled date is in the past.
  (data.inspections || []).forEach((i) => {
    if (i.recurrence_status === "skipped") return;
    const done = i.status === "Completed";
    const completedToday = done && (i.completed_date === t || i.date === t);
    const base = {
      id: i.id, kind: "inspection", time: "", timeLabel: "",
      propertyId: "", propertyName: "", clientName: "",
      typeLabel: "Inspection", status: i.status, date: i.date,
      to: `/inspections?open=${i.id}`, actionLabel: "View Inspection", actionKind: "view-inspection",
    };
    if (completedToday) {
      push({ ...base, completed: true, overdue: false }, "completed");
    } else if (i.date === t && !done) {
      push({ ...base, completed: false, overdue: false }, "today");
    } else if (i.date && i.date < t && !done) {
      overdue.push({ ...base, completed: false, overdue: true });
    }
  });

  const byTime = (a, b) => (a.timeLabel || "").localeCompare(b.timeLabel || "");
  items.sort(byTime);
  overdue.sort(byTime);
  completed.sort(byTime);

  return { today: items, overdue, completed };
}