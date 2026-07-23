import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Plus, Clock, Loader2, AlertTriangle, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import EmptyState from "@/components/ui/EmptyState";
import { badgeTone } from "@/components/resource/ResourceListPage";
import VisitWizard from "@/components/visits/VisitWizard";
import { loadDraft, clearDraft } from "@/lib/visitDraft";

export default function Visits() {
  const [mode, setMode] = useState("list");
  const [visits, setVisits] = useState([]);
  const [props, setProps] = useState({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [v, p] = await Promise.all([
        base44.entities.PropertyVisit.list("-start_time", 200),
        base44.entities.Property.list("-created_date", 500),
      ]);
      setVisits((v || []).filter((x) => !x.archived));
      const map = {};
      (p || []).forEach((x) => (map[x.id] = x.name));
      setProps(map);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); setDraft(loadDraft()); }, []);

  if (mode === "wizard") {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
          <VisitWizard onDone={() => { setMode("list"); load(); setDraft(loadDraft()); }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Property Visits</h1>
            <p className="text-sm text-muted-foreground">Start a guided visit or review past reports.</p>
          </div>
          <Button onClick={() => setMode("wizard")} className="rounded-full gap-1.5 h-10 px-4"><Plus className="w-4 h-4" /> Start Visit</Button>
        </div>

        {draft && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-500">Unfinished visit in progress</p>
              <p className="text-xs text-muted-foreground truncate">{props[draft.propertyId] || "Property"} · {draft.visitType}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => setMode("wizard")} className="rounded-full">Resume</Button>
              <Button size="sm" variant="outline" onClick={() => { clearDraft(); setDraft(null); }} className="rounded-full">Discard</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : visits.length === 0 ? (
          <EmptyState icon={MapPin} title="No visits yet" description="Start your first guided property visit."
            action={<Button onClick={() => setMode("wizard")} className="rounded-full gap-1.5"><Plus className="w-4 h-4" /> Start Visit</Button>} />
        ) : (
          <div className="space-y-2">
            {visits.map((v) => {
              const flagged = (v.checklist || []).filter((i) => i.status === "Important" || i.status === "Emergency").length;
              return (
                <Link key={v.id} to={`/visits/${v.id}`}
                  className="block rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{props[v.property_id] || "Property"}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.visit_type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {(v.start_time || "").slice(0, 16).replace("T", " ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {flagged > 0 && <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {flagged}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(v.status)}`}>{v.status}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}