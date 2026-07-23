import React, { useState } from "react";
import { FileText, Download, Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function Reports() {
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

      // Inspections
      doc.setFontSize(13); doc.setFont(undefined, "bold");
      doc.text(`Inspections (${propInspections.length})`, margin, y); y += 7;
      doc.setFontSize(10); doc.setFont(undefined, "normal");
      propInspections.slice(0, 20).forEach((i) => {
        const issues = (i.checklist || []).filter((c) => c.status === "Needs Attention" || c.status === "Critical").length;
        doc.text(`• ${i.date} — ${i.inspector || "—"} — ${i.status} (${issues} issues)`, margin, y); y += 5;
      });
      y += 4;

      // Maintenance
      doc.setFontSize(13); doc.setFont(undefined, "bold");
      doc.text(`Maintenance (${propMaintenance.length})`, margin, y); y += 7;
      doc.setFontSize(10); doc.setFont(undefined, "normal");
      propMaintenance.slice(0, 20).forEach((m) => {
        doc.text(`• ${m.title} — ${m.status} — ${m.priority}`, margin, y); y += 5;
      });
      y += 4;

      // Expenses
      const total = propExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      doc.setFontSize(13); doc.setFont(undefined, "bold");
      doc.text(`Expenses (${propExpenses.length}) — Total €${total.toFixed(2)}`, margin, y); y += 7;
      doc.setFontSize(10); doc.setFont(undefined, "normal");
      propExpenses.slice(0, 20).forEach((e) => {
        doc.text(`• ${e.date} — ${e.vendor} — €${(e.amount || 0).toFixed(2)}`, margin, y); y += 5;
      });

      doc.save(`report-${propName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      setGenerating(false);
    }, 400);
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24 lg:pb-6">
        <PageHeader title="Reports" subtitle="Generate and export professional reports" icon={FileText} />

        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <h3 className="font-medium text-sm mb-4">Generate Property Report (PDF)</h3>
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

        <div className="space-y-4">
          <ReportCard title="Inspection Reports" count={propInspections.length} description="Detailed checklist results with photos and notes." />
          <ReportCard title="Monthly Property Reports" count={properties.length} description="Overview of visits, tasks and status per property." />
          <ReportCard title="Maintenance Reports" count={propMaintenance.length} description="Open, scheduled and completed issues." />
          <ReportCard title="Expense Reports" count={propExpenses.length} description="Itemised expenses with reimbursement status." />
        </div>
      </div>
    </AppLayout>
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

function ReportCard({ title, count, description }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><FileText className="w-5 h-5" /></div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <span className="text-sm font-semibold text-muted-foreground">{count}</span>
    </div>
  );
}