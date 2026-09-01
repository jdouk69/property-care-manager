import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, Plus, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import RecurrenceFields from "@/components/recurrence/RecurrenceFields";
import { createRuleFromOccurrence, isoDate } from "@/lib/recurrence";

const TASK_TYPES = [
  "Inspection", "Maintenance", "Maintenance follow-up", "Contractor Meeting", "Delivery",
  "Owner Request", "Arrival preparation", "Departure inspection", "Shopping", "Utility payment",
  "Report", "Key return", "Phone call", "Owner-representative visit", "Custom",
];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];

/**
 * Simplified quick-task entry. Property + Task + (optional) due date + (optional)
 * advanced options. Reuses the existing Task schema (title) and the recurrence
 * engine; no new fields or entities. Editing existing tasks stays in the resource
 * engine, which preserves all advanced values.
 */
export default function QuickTaskSheet({ open, onOpenChange, onCreated, preProperty = "" }) {
  const isMobile = useIsMobile();

  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [propertyId, setPropertyId] = useState(preProperty || "");
  const [task, setTask] = useState("");

  const [showDue, setShowDue] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [more, setMore] = useState(false);
  const [type, setType] = useState("Custom");
  const [priority, setPriority] = useState("Medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");

  // Recurrence state (mirrors the fields RecurrenceFields reads/writes).
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("Weekly");
  const [intervalN, setIntervalN] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [dayOfMonth, setDayOfMonth] = useState(undefined);
  const [endDate, setEndDate] = useState(null);
  const [reminderTime, setReminderTime] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => { setPropertyId(preProperty || ""); }, [preProperty]);

  // When opening, load properties + reset to a clean quick form.
  useEffect(() => {
    if (!open) return;
    setTask("");
    setShowDue(false); setDate(""); setTime("");
    setMore(false);
    setType("Custom"); setPriority("Medium"); setAssignedTo(""); setStatus("Pending"); setNotes("");
    setIsRecurring(false); setFrequency("Weekly"); setIntervalN(1); setDaysOfWeek([]);
    setDayOfMonth(undefined); setEndDate(null); setReminderTime("");
    setPropertyId(preProperty || "");
    setLoadingProps(true);
    (async () => {
      try {
        const list = await base44.entities.Property.list("-created_date", 500);
        setProperties((list || []).filter((p) => !p.archived));
      } catch (e) { setProperties([]); }
      setLoadingProps(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSave = task.trim().length > 0 && !!propertyId && !saving;

  const recValues = useMemo(
    () => ({ is_recurring: isRecurring, frequency, interval: intervalN, days_of_week: daysOfWeek, day_of_month: dayOfMonth, end_date: endDate, reminder_time: reminderTime }),
    [isRecurring, frequency, intervalN, daysOfWeek, dayOfMonth, endDate, reminderTime]
  );
  const recSetField = (name, val) => {
    switch (name) {
      case "is_recurring": setIsRecurring(val); break;
      case "frequency": setFrequency(val); break;
      case "interval": setIntervalN(val); break;
      case "days_of_week": setDaysOfWeek(val); break;
      case "day_of_month": setDayOfMonth(val); break;
      case "end_date": setEndDate(val); break;
      case "reminder_time": setReminderTime(val); break;
      default: break;
    }
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const occurrenceDate = date || (isRecurring ? isoDate() : "");
      const payload = {
        title: task.trim(),
        property_id: propertyId,
        type,
        priority,
        assigned_to: assignedTo,
        status,
        notes,
        date: date || "",
        time: time || "",
        is_recurring: isRecurring,
        frequency,
        interval: intervalN,
        days_of_week: daysOfWeek,
        day_of_month: dayOfMonth,
        end_date: endDate,
        reminder_time: reminderTime,
        occurrence_date: occurrenceDate,
        recurrence_status: "active",
      };
      const created = await base44.entities.Task.create(payload);
      if (isRecurring) {
        try { await createRuleFromOccurrence("Task", { ...payload, occurrence_date: occurrenceDate }, created); } catch (e) {}
      }
      onCreated && onCreated(created);
      onOpenChange(false);
    } catch (e) {
      window.alert("Could not save task: " + (e?.message || e));
    }
    setSaving(false);
  };

  const form = (
    <div className="space-y-5">
      {/* Property first */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-2 block">Property <span className="text-destructive">*</span></Label>
        <Select value={propertyId} onValueChange={setPropertyId}>
          <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Select property…" /></SelectTrigger>
          <SelectContent>
            {loadingProps ? (
              <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : (
              properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Task (maps to existing title) */}
      <div>
        <Label htmlFor="qt-task" className="text-sm font-medium text-foreground mb-2 block">Task <span className="text-destructive">*</span></Label>
        <Textarea
          id="qt-task"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="What needs to be done?"
          rows={3}
          className="text-base min-h-[88px] resize-none"
          autoFocus
        />
      </div>

      {/* Optional due date */}
      {showDue ? (
        <div className="rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Due date</span>
            <button
              type="button"
              onClick={() => { setShowDue(false); setDate(""); setTime(""); }}
              className="text-xs text-muted-foreground hover:text-foreground min-h-[36px] touch-manipulation"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 text-base" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Time (optional)</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 text-base" />
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDue(true)}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline min-h-[40px] touch-manipulation"
        >
          <Plus className="w-4 h-4" /> Add due date
        </button>
      )}

      {/* More options */}
      <div>
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[40px] touch-manipulation"
        >
          {more ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          More options
        </button>
        {more && (
          <div className="mt-3 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Assigned To</Label>
              <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="e.g. Jim" className="h-12 text-base" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-base resize-none" />
            </div>
            <RecurrenceFields values={recValues} setField={recSetField} />
          </div>
        )}
      </div>
    </div>
  );

  const footer = (
    <div className="flex gap-2 w-full sm:w-auto">
      <Button variant="outline" className="h-12 flex-1 sm:flex-none sm:px-5" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
      <Button className="h-12 flex-1 sm:flex-none sm:px-6" onClick={save} disabled={!canSave}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} Save Task
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full h-full flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle>New Task</SheetTitle>
            <SheetDescription className="sr-only">Quick task entry</SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-1 py-4">{form}</div>
          <SheetFooter className="flex-row gap-2 border-t pt-4 pb-[env(safe-area-inset-bottom)]">{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] md:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription className="sr-only">Quick task entry</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{form}</div>
        <DialogFooter className="flex-row gap-2">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}