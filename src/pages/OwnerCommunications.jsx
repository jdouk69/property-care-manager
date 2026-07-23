import React, { useState } from "react";
import { MessageSquare, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AppLayout from "@/components/layout/AppLayout";
import ResourceListPage from "@/components/resource/ResourceListPage";

const TEMPLATES = [
  "Property checked — everything is secure.",
  "Inspection completed — an issue was found and needs attention.",
  "A contractor has been scheduled for the maintenance issue.",
  "The work has been completed. Photos attached.",
  "Owner approval requested for a maintenance quotation.",
  "Expense reimbursement requested. See attached receipt.",
  "Storm inspection completed — no damage found.",
  "Your property is ready for arrival.",
  "A delivery was received on your behalf.",
  "Emergency update: please contact me as soon as possible.",
];

const fields = [
  { name: "subject", label: "Subject", type: "text", required: true },
  { name: "client_id", label: "Client", type: "entity-select", entity: "Client" },
  { name: "property_id", label: "Property", type: "entity-select", entity: "Property" },
  { name: "date", label: "Date", type: "date" },
  { name: "communication_type", label: "Type", type: "select", options: ["WhatsApp", "Email", "Phone", "SMS", "In-person"] },
  { name: "message", label: "Message", type: "textarea" },
  { name: "related_maintenance_id", label: "Related Maintenance Issue", type: "entity-select", entity: "MaintenanceIssue" },
  { name: "owner_response", label: "Owner Response", type: "textarea" },
  { name: "follow_up_required", label: "Follow-up Required", type: "boolean" },
  { name: "template_used", label: "Template Used", type: "text" },
  { name: "photos_attached", label: "Attached Photos", type: "images" },
];

const columns = [
  { key: "subject", label: "Subject", primary: true },
  { key: "client_id", label: "Client" },
  { key: "communication_type", label: "Type", badge: true },
  { key: "follow_up_required", label: "Follow-up", badge: true, render: (it) => (it.follow_up_required ? "Yes" : "No") },
];

function TemplatesBar({ onUse }) {
  const [copied, setCopied] = useState("");
  const copy = (t) => {
    navigator.clipboard?.writeText(t);
    setCopied(t);
    setTimeout(() => setCopied(""), 1500);
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-4">
      <h3 className="font-medium text-sm mb-2">Message Templates</h3>
      <p className="text-xs text-muted-foreground mb-3">Tap to copy, then paste into WhatsApp / Email / SMS.</p>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button key={t} onClick={() => copy(t)} className="text-xs px-2.5 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-muted hover:border-primary/30 transition inline-flex items-center gap-1 max-w-full">
            {copied === t ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span className="truncate max-w-[200px]">{t}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OwnerCommunications() {
  return (
    <AppLayout>
      <ResourceListPage
        entityName="OwnerCommunication"
        title="Communications"
        subtitle="Owner communication log and message templates"
        icon={MessageSquare}
        fields={fields}
        columns={columns}
        searchKeys={["subject", "message", "owner_response"]}
        addItemLabel="Log Communication"
        defaultValues={{ communication_type: "WhatsApp", follow_up_required: false, date: new Date().toISOString().slice(0, 10) }}
        renderSummary={() => <TemplatesBar />}
      />
    </AppLayout>
  );
}