import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ListChecks, Repeat } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";
import RecurrenceFields from "@/components/recurrence/RecurrenceFields";
import RecurrencePanel from "@/components/recurrence/RecurrencePanel";
import QuickTaskSheet from "@/components/tasks/QuickTaskSheet";
import TaskCard from "@/components/tasks/TaskCard";
import { createRuleFromOccurrence, generateNextOccurrence } from "@/lib/recurrence";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const fields = [
  { name: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Weekly pool check" },
  { name: "type", label: "Type", type: "select", options: ["Inspection", "Maintenance", "Maintenance follow-up", "Contractor Meeting", "Delivery", "Owner Request", "Arrival preparation", "Departure inspection", "Shopping", "Utility payment", "Report", "Key return", "Phone call", "Owner-representative visit", "Custom"] },
  { name: "date", label: "Date", type: "date" },
  { name: "time", label: "Time", type: "time" },
  { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"] },
  { name: "assigned_to", label: "Assigned To", type: "text" },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "status", label: "Status", type: "select", options: ["Pending", "In Progress", "Completed", "Cancelled"] },
  { name: "recurring", label: "Recurring (legacy label)", type: "text", showIf: () => false },
  { name: "recurrence", label: "", type: "custom", render: (values, setField) => <RecurrenceFields values={values} setField={setField} /> },
  { name: "notes", label: "Notes", type: "textarea" },
];

const columns = [
  { key: "title", label: "Task", primary: true },
  { key: "date", label: "Date" },
  { key: "type", label: "Type", badge: true },
  { key: "priority", label: "Priority", badge: true },
  { key: "status", label: "Status", badge: true },
];

export default function Tasks() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const openId = searchParams.get("open") || undefined;
  const preProperty = searchParams.get("property") || "";

  // Quick-task entry (Add). Editing existing tasks stays in the resource engine.
  // Phase 1: /tasks?add=1 (Home "Add Task") opens the quick-task sheet immediately.
  const autoAdd = searchParams.get("add") === "1";
  const [addOpen, setAddOpen] = useState(autoAdd);
  const [reloadSignal, setReloadSignal] = useState(0);

  const handleCreated = async (values, created) => {
    if (values.is_recurring) {
      const rule = await createRuleFromOccurrence("Task", values, created);
      return {
        is_recurring: true,
        recurrence_id: rule?.id,
        occurrence_date: values.date,
        repeat_label: rule ? undefined : undefined,
      };
    }
    return null;
  };

  const handleUpdated = (prev, next) => {
    if (prev.status !== "Completed" && next.status === "Completed" && next.recurrence_id) {
      generateNextOccurrence(next.recurrence_id, next.occurrence_date || next.date).catch(() => {});
    }
  };

  return (
    <AppLayout>
      <ResourceListPage
        entityName="Task"
        title="Tasks"
        subtitle="Daily operations and to-dos"
        icon={ListChecks}
        fields={fields}
        columns={columns}
        searchKeys={["title", "assigned_to", "notes"]}
        renderCard={(item, lookups, helpers) => <TaskCard item={item} lookups={lookups} helpers={helpers} />}
        addItemLabel="Add Task"
        defaultValues={{ status: "Pending", priority: "Medium", type: "Custom", is_recurring: false, frequency: "Weekly", interval: 1, days_of_week: [] }}
        autoOpenEditId={openId}
        onAdd={() => setAddOpen(true)}
        reloadSignal={reloadSignal}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        dictation={{ label: "Dictate", fields: ["title", "type", "priority", "assigned_to", "notes"] }}
        extraDrawerContent={(record, helpers) =>
          record.is_recurring ? <RecurrencePanel entityType="Task" record={record} reload={helpers.reload} /> : null
        }
        cardExtra={(item) =>
          item.is_recurring ? (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1">
              <Repeat className="w-3 h-3" /> {item.repeat_label || t("Recurring")}
            </span>
          ) : null
        }
      />
      <QuickTaskSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        preProperty={preProperty}
        onCreated={() => setReloadSignal((n) => n + 1)}
      />
    </AppLayout>
  );
}