import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import PageBackButton from "@/components/ui/PageBackButton";
import { badgeTone } from "@/components/resource/ResourceListPage";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { athensDate, athensTime, athensToday } from "@/lib/timezone";
import { visitTypeLabel } from "@/lib/visitTypeLabels";

const TYPE_COLORS = {
  Inspection: "bg-sky-500",
  "Contractor Meeting": "bg-violet-500",
  Delivery: "bg-emerald-500",
  Shopping: "bg-amber-500",
  "Owner Request": "bg-rose-500",
  Maintenance: "bg-orange-500",
  Custom: "bg-primary",
  "Property Visit": "bg-cyan-500",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["M","T","W","T","F","S","S"];

export default function Calendar() {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(athensToday());

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-calendar"],
    queryFn: () => base44.entities.Task.list("-date", 500),
  });
  const { data: visits = [] } = useQuery({
    queryKey: ["visits-calendar"],
    queryFn: () => base44.entities.PropertyVisit.list("-start_time", 500),
  });

  const byDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => { if (t.date) { (map[t.date] = map[t.date] || []).push({ ...t, _kind: "task" }); } });
    (visits || []).forEach((v) => {
      if (v.archived || v.status === "Cancelled") return;
      const st = v.scheduled_time || v.start_time;
      if (!st) return;
      const ds = athensDate(st);
      (map[ds] = map[ds] || []).push({
        ...v, _kind: "visit", type: "Property Visit",
        title: visitTypeLabel(v.visit_type) || "Property Visit",
        time: athensTime(st),
        to: `/visits/${v.id}`,
      });
    });
    return map;
  }, [tasks, visits]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const selectedTasks = byDate[selected] || [];

  const move = (delta) => setCursor(new Date(year, month + delta, 1));

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
        <PageBackButton className="mb-3" />
        <PageHeader title="Calendar" subtitle="Your schedule at a glance" icon={CalendarDays}
          actions={<Link to="/tasks"><Button size="sm" className="rounded-full gap-1.5 h-9 px-4"><Plus className="w-4 h-4" /> Add Task</Button></Link>}
        />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => move(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => { setCursor(new Date()); setSelected(athensToday()); }}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => move(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DOW.map((d, i) => <div key={i} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const dayTasks = byDate[ds] || [];
            const isToday = ds === athensToday();
            const isSelected = ds === selected;
            return (
              <button key={i} onClick={() => setSelected(ds)}
                className={`aspect-square sm:aspect-auto sm:min-h-[64px] rounded-lg p-1 flex flex-col items-center sm:items-start border transition ${
                  isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/60"
                } ${isToday ? "ring-1 ring-primary" : ""}`}>
                <span className={`text-xs ${isToday ? "font-bold text-primary" : "text-foreground"}`}>{date.getDate()}</span>
                <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center sm:justify-start">
                  {dayTasks.slice(0, 4).map((t) => (
                    <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[t.type] || "bg-primary"}`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 mb-6">
          {Object.entries(TYPE_COLORS).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={`w-2 h-2 rounded-full ${c}`} /> {k}</div>
          ))}
        </div>

        {/* Selected day */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-medium text-sm">
            {new Date(selected + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <div className="divide-y divide-border">
            {selectedTasks.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No tasks scheduled.</div>
            ) : (
              selectedTasks.map((t) => (
                <Link to={t.to || "/tasks"} key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${TYPE_COLORS[t.type] || "bg-primary"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.time ? `${t.time} · ` : ""}{t.type}{t._kind === "visit" && t.status ? ` · ${t.status}` : ""}</p>
                    </div>
                  </div>
                  {t._kind === "visit" && t.status
                    ? <span className="text-xs px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-600 border-sky-500/20">{t.status}</span>
                    : (t.priority && <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(t.priority)}`}>{t.priority}</span>)}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}