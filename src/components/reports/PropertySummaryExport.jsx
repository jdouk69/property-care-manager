import React, { useState } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import jsPDF from "jspdf";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createNotification } from "@/lib/notifications";

/**
 * Secondary tool on the Reports page: a one-off property summary PDF export
 * (inspections / maintenance / expenses). Kept distinct from the customer
 * report delivery queue above.
 */
export default function PropertySummaryExport() {
  const [propId, setPropId] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: properties = [] } = useQuery({ queryKey: ["rep-props"], queryFn: () => base44.entities.Property.list("-created_date", 500) });
  const { data: inspections = [] } = useQuery({ queryKey: ["rep-insp"], queryFn: () => base44.entities.Inspection.list("-date", 500) });
  const { data: maintenance = [] } = useQuery({ queryKey: ["rep-maint"], queryFn: () => base44.entities.MaintenanceIssue.list("-created_date", 500) });
  const { data: expenses = [] } = useQuery({ queryKey: ["rep-exp"], queryFn: () => base44.entities.Expense.list("-date", 500) });

  const propInspections = propId ? inspections.filter((i) => i.property_id === propId) : inspections;
  const propMaintenance = propId ? maintenance.filter((m) => m.property_id === propId) : maintenance;
  const propExpenses = propId ? expenses.filter((e) => e.property_id === propId) : expenses;
  const propName = properties.find((p) => p.id === propId)?.name || "All Properties";

  const generatePDF = () => {
    setGenerating(true);
    setTimeout(() => {
      const doc = new jsPDF();
      const margin = 14;
      let y = 20;
      doc.setFontSize(18); doc.setFont(undefined, "bold");
      doc.text("Property Care Report", margin, y); y += 8;
      doc.setFontSize(11); doc.setFont(undefined, "normal");
      doc.text(`Property: ${propName}`, margin, y); y += 6;
      doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, margin, y); y += 10;
      doc.setFontSize(13); doc.setFont(undefined, "bold");
      doc.text(`Inspections (${propInspections.length})`, margin, y); y += 7;
      doc.setFontSize(10); doc.setFont(undefined, "normal");
      propInspections.slice(0, 20).forEach((i) => {
        const issues = (i.checklist || []).filter((c) => c.status === "Needs Attention" || c.status === "Critical").length;
        doc.text(`• ${i.date} — ${i.inspector || "—"} — ${i.status} (${issues} issues)`, margin, y); y += 5;
      });
      y += 4;
      doc.setFontSize(13); doc.setFont(undefined, "bold");
      doc.text(`Maintenance (${propMaintenance.length})`, margin, y); y += 7;
      doc.setFontSize(10); doc.setFont(undefined, "normal");
      propMaintenance.slice(0, 20).forEach((m) => { doc.text(`• ${m.title} — ${m.status} — ${m.priority}`, margin, y); y += 5; });
      y += 4;
      const total = propExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      doc.setFontSize(13); doc.setFont(undefined, "bold");
      doc.text(`Expenses (${propExpenses.length}) — Total €${total.toFixed(2)}`, margin, y); y += 7;
      doc.setFontSize(10); doc.setFont(undefined, "normal");
      propExpenses.slice(0, 20).forEach((e) => { doc.text(`• ${e.date} — ${e.vendor} — €${(e.amount || 0).toFixed(2)}`, margin, y); y += 5; });
      doc.save(`report-${propName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      createNotification({
        title: "Report ready",
        message: `Property report — ${propName}`,
        type: "System", priority: "Low", related_path: "/reports",
        dedup_key: `report_ready:${propId || "all"}:${new Date().toISOString().slice(0, 10)}`,
      });
      setGenerating(false);
    }, 400);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><FileText className="w-4 h-4" /></div>
        <div>
          <h3 className="font-medium text-sm">Property Summary Export</h3>
          <p className="text-xs text-muted-foreground">One-off PDF of inspections, maintenance and expenses.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs mb-1.5 block">Property</Label>
          <Select value={propId} onValueChange={setPropId}>
            <SelectTrigger><SelectValue placeholder="All properties" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All properties</SelectItem>
              {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={generatePDF} disabled={generating} className="w-full rounded-xl gap-2 h-11">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {generating ? "Generating…" : "Download PDF Report"}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-5">
        <Stat label="Inspections" value={propInspections.length} />
        <Stat label="Maintenance" value={propMaintenance.length} />
        <Stat label="Expenses" value={`€${propExpenses.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)}`} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}