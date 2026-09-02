import React, { useState } from "react";
import { MessageSquare, Copy, Check, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
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
  // Only one template expanded at a time (index or null).
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState("");
  const copy = (t) => {
    navigator.clipboard?.writeText(t);
    setCopied(t);
    setTimeout(() => setCopied(""), 1500);
  };
  const toggle = (i) => setExpanded((cur) => (cur === i ? null : i));
  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-4">
      <h3 className="font-medium text-sm mb-2">Message Templates</h3>
      <p className="text-xs text-muted-foreground mb-3">Tap a template to read the full message, then copy.</p>
      <div className="flex flex-col gap-2">
        {TEMPLATES.map((t, i) => {
          const isOpen = expanded === i;
          const isCopied = copied === t;
          return (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  className="flex-1 flex items-center gap-2 px-3 py-3 text-left min-w-0 hover:bg-muted/60 transition-colors"
                >
                  <span className="text-xs leading-snug flex-1 min-w-0 truncate">{t}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {/* Quick-copy for users who already know the message — does not expand. */}
                <button
                  type="button"
                  onClick={() => copy(t)}
                  aria-label="Copy template"
                  className="px-3 py-3 shrink-0 text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {isOpen && (
                <div className="px-3 pb-3 pt-3 border-t border-border bg-muted/30">
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">{t}</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => copy(t)}
                    className="mt-3 rounded-lg gap-1.5 h-9 min-h-[44px]"
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? "Copied" : "Copy Message"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OwnerCommunications() {
  // Phase 1: /communications?add=1 (Home "Owner Update") opens the log form immediately.
  const [params] = useSearchParams();
  const autoOpen = params.get("add") === "1";
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
        autoOpen={autoOpen}
        addItemLabel="Log Communication"
        defaultValues={{ communication_type: "WhatsApp", follow_up_required: false, date: new Date().toISOString().slice(0, 10) }}
        renderSummary={() => <TemplatesBar />}
      />
    </AppLayout>
  );
}