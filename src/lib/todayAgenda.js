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

  // Formatting helpers for the NEEDS ATTENTION / overdue display. Dates come
  // straight from the underlying records — never invented, never a dashboard-only
  // date. "X days overdue" is computed from the record's real due/scheduled date.
  const fmtDateShort = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  };
  const fmtTime12h = (raw) => {
    if (!raw) return "";
    if (typeof raw === "string" && raw.includes("T")) return athensTime(raw);
    const m = /^(\d{1,2}):(\d{2})/.exec(raw);
    if (!m) return raw;
    let h = parseInt(m[1], 10);
    const mm = m[2];
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${mm} ${ap}`;
  };
  const daysOverdue = (dateIso, todayIso) => {
    if (!dateIso) return 0;
    const a = new Date(dateIso + "T12:00:00Z");
    const b = new Date(todayIso + "T12:00:00Z");
    return Math.round((b - a) / 86400000);
  };

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
    // Correction #15 — Property Assistance jobs open in their own lightweight
    // flow (not the checklist wizard). "continue-visit" simply navigates to
    // item.to, so it never triggers the wizard's startScheduledVisit.
    const isAssistance = v.visit_type === "Property Assistance" || v.visit_type === "On-Demand Property Assistance";
    const visitTo = isAssistance ? `/property-assistance/${v.id}` : `/visits/${v.id}`;
    const assistanceStart = { actionKind: "continue-visit", actionLabel: "Start" };
    const normalStart = { actionKind: "start-visit", actionLabel: "Start Visit" };
    const startAction = isAssistance ? assistanceStart : normalStart;
    if (!isToday && !completedVisit) {
      // also detect overdue scheduled visits (past, still scheduled)
      if (v.status === "Scheduled" && st && new Date(st).getTime() < Date.now() - 3600000) {
        overdue.push({
          id: v.id, kind: "visit", time: st, timeLabel: athensTime(st),
          propertyId: v.property_id, propertyName: propName(v.property_id), clientName: clientFor(v.property_id),
          typeLabel: visitTypeLabel(v.visit_type), status: v.status, date: day,
          to: visitTo, ...startAction,
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
      to: visitTo,
    };
    if (completedVisit) {
      // Completed visits never expose a Start/Continue action — not under Due
      // Today, not overdue, never restartable from the Dashboard. Only a visit
      // completed TODAY appears (under Completed Today) with the report/view
      // action. An unsent report flags reportUnsent so the agenda surfaces the
      // report follow-up instead of Start.
      if (isToday) {
        push({
          ...base,
          actionLabel: isAssistance ? "View" : "View Report", actionKind: "view-report",
          completed: true, overdue: false,
          reportUnsent: !isAssistance && !v.report_sent && v.report_status !== "Sent",
        }, "completed");
      }
      return;
    }
    if (v.status === "In Progress") {
      push({ ...base, actionLabel: isAssistance ? "Continue" : "Continue Visit", actionKind: "continue-visit", to: isAssistance ? visitTo : `/visits?resume=${v.id}`, completed: false, overdue: false }, "today");
    } else {
      push({ ...base, ...startAction, completed: false, overdue: false }, "today");
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
        time: task.time || "", timeLabel: fmtTime12h(task.time),
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
        id: task.id, kind: "task", time: task.time || "", timeLabel: fmtTime12h(task.time),
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
    const apptToday = appt === t, fupToday = fup === t;
    const apptPast = appt && appt < t, fupPast = fup && fup < t;
    const dueToday = apptToday || fupToday;
    const pastDue = apptPast || fupPast;
    if (!dueToday && !pastDue) return;
    // Pick the date that matches the bucket so an item can never appear as both
    // overdue and due today, and the displayed date matches its section.
    const dueDate = dueToday ? (apptToday ? appt : fup) : (apptPast ? appt : fup);
    const base = {
      id: m.id, kind: "maintenance", time: "", timeLabel: "",
      propertyId: m.property_id, propertyName: propName(m.property_id), clientName: clientFor(m.property_id),
      typeLabel: dueToday ? "Maintenance Coordination" : "Follow-up",
      status: m.status, date: dueDate,
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

  // TODAY: sort by scheduled time. COMPLETED TODAY: by time.
  const byTime = (a, b) => (a.timeLabel || "").localeCompare(b.timeLabel || "");
  items.sort(byTime);
  completed.sort(byTime);

  // NEEDS ATTENTION: stamp each overdue item with its real due date and
  // "X days overdue" (computed from the underlying record's date), then sort by
  // oldest / most-overdue first. A bare old scheduled time is never shown here —
  // only the original due date (with time, if any) so it can't look like today.
  overdue.forEach((it) => {
    const days = daysOverdue(it.date, t);
    it.daysOverdue = days;
    const datePart = fmtDateShort(it.date);
    const timePart = it.timeLabel ? ` at ${it.timeLabel}` : "";
    it.overdueLabel = `Due ${datePart}${timePart} · ${days} day${days === 1 ? "" : "s"} overdue`;
  });
  overdue.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return { today: items, overdue, completed };
}