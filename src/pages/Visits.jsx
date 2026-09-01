import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Plus, Clock, Loader2, AlertTriangle, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/layout/AppLayout";
import EmptyState from "@/components/ui/EmptyState";
import { badgeTone } from "@/components/resource/ResourceListPage";
import VisitWizard from "@/components/visits/VisitWizard";
import PageBackButton from "@/components/ui/PageBackButton";
import { loadDraft, clearDraft } from "@/lib/visitDraft";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { athensMediumDateTime, athensMediumDate } from "@/lib/timezone";

const FILTERS = ["ALL", "UPCOMING", "IN PROGRESS", "COMPLETED", "CANCELLED"];

const statusForFilter = (f) => {
  if (f === "UPCOMING") return "Scheduled";
  if (f === "IN PROGRESS") return "In Progress";
  if (f === "COMPLETED") return "Completed";
  if (f === "CANCELLED") return "Cancelled";
  return null;
};

export default function Visits() {
  const [mode, setMode] = useState("list");
  const [visits, setVisits] = useState([]);
  const [props, setProps] = useState({});
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [autoResume, setAutoResume] = useState(false);
  const [ctx, setCtx] = useState({});
  const [resumeId, setResumeId] = useState(null);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [v, p, c] = await Promise.all([
        base44.entities.PropertyVisit.list("-start_time", 200),
        base44.entities.Property.list("-created_date", 500),
        base44.entities.Client.list("-created_date", 500),
      ]);
      setVisits((v || []).filter((x) => !x.archived));
      const pmap = {};
      (p || []).forEach((x) => (pmap[x.id] = x));
      setProps(pmap);
      const cmap = {};
      (c || []).forEach((x) => (cmap[x.id] = x));
      setClients(cmap);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    const d = loadDraft();
    setDraft(d);
    const params = new URLSearchParams(window.location.search);
    const property = params.get("property");
    const agreement = params.get("agreement");
    const client = params.get("client");
    const visitType = params.get("visit_type");
    const resume = params.get("resume");
    if (property) setCtx((c) => ({ ...c, property }));
    if (agreement) setCtx((c) => ({ ...c, agreement }));
    if (client) setCtx((c) => ({ ...c, client }));
    if (visitType) setCtx((c) => ({ ...c, visitType }));
    if (resume) setResumeId(resume);
    const schedule = params.get("schedule") === "1";
    if (schedule) setScheduleMode(true);
    if (resume) {
      setMode("wizard");
    } else if (schedule) {
      setMode("wizard");
    } else if (params.get("start") === "1") {
      setMode("wizard");
    } else if (params.get("continue") === "1" && d) {
      setAutoResume(true);
      setMode("wizard");
    }
  }, []);

  const propName = (id) => props[id]?.name || "Property";
  const clientName = (v) => {
    const p = props[v.property_id];
    const cid = p?.owner_id;
    return cid ? clients[cid]?.name || "" : "";
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const statusVal = statusForFilter(filter);
    let list = visits;
    if (statusVal) list = list.filter((v) => v.status === statusVal);
    if (q) {
      list = list.filter((v) => {
        const p = propName(v.property_id).toLowerCase();
        const c = (clientName(v) || "").toLowerCase();
        const vt = (visitTypeLabel(v.visit_type) || "").toLowerCase();
        const rd = (v.request_description || "").toLowerCase();
        const sm = (v.summary || "").toLowerCase();
        return p.includes(q) || c.includes(q) || vt.includes(q) || rd.includes(q) || sm.includes(q);
      });
    }
    const when = (v) => v.scheduled_time || v.start_time || "";
    const sorted = [...list];
    if (filter === "COMPLETED") {
      sorted.sort((a, b) =>
        (b.end_time || b.updated_date || "").localeCompare(a.end_time || a.updated_date || "")
      );
    } else if (filter === "UPCOMING") {
      sorted.sort((a, b) => when(a).localeCompare(when(b)));
    } else if (filter === "IN PROGRESS") {
      sorted.sort((a, b) => when(b).localeCompare(when(a)));
    } else {
      sorted.sort((a, b) => when(b).localeCompare(when(a)));
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits, props, clients, filter, query]);

  if (mode === "wizard") {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
          <VisitWizard
            autoResume={autoResume}
            ctxProperty={ctx.property}
            ctxAgreement={ctx.agreement}
            ctxClient={ctx.client}
            ctxVisitType={ctx.visitType}
            resumeVisitId={resumeId}
            scheduleMode={scheduleMode}
            onDone={() => { setMode("list"); setAutoResume(false); setCtx({}); setResumeId(null); setScheduleMode(false); load(); setDraft(loadDraft()); }}
          />
        </div>
      </AppLayout>
    );
  }

  const countFor = (f) =>
    f === "ALL" ? visits.length : visits.filter((v) => v.status === statusForFilter(f)).length;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-6">
        <PageBackButton className="mb-3" />
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Property Visits</h1>
            <p className="text-sm text-muted-foreground">View past and upcoming visits, or start a new one.</p>
          </div>
          <Button onClick={() => setMode("wizard")} className="rounded-full gap-1.5 h-10 px-4"><Plus className="w-4 h-4" /> Start Visit</Button>
        </div>

        {draft && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-500">Unfinished visit in progress</p>
              <p className="text-xs text-muted-foreground truncate">{props[draft.propertyId]?.name || "Property"} · {visitTypeLabel(draft.visitType)}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => setMode("wizard")} className="rounded-full">Resume</Button>
              <Button size="sm" variant="outline" onClick={() => { clearDraft(); setDraft(null); }} className="rounded-full">Discard</Button>
            </div>
          </div>
        )}

        {/* Status filters */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3 -mx-1 px-1">
          {FILTERS.map((f) => {
            const active = filter === f;
            const count = countFor(f);
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 px-3.5 h-9 rounded-full text-xs font-medium border transition min-h-[36px] touch-manipulation ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
              >
                {f}{count > 0 && <span className="ml-1 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search visits..." className="pl-9 rounded-full bg-muted/50 border-0 focus-visible:ring-1" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={query || filter !== "ALL" ? "No matching visits" : "No visits yet"}
            description={query || filter !== "ALL" ? "Try a different filter or search." : "Start your first guided property visit."}
            action={!query && filter === "ALL" ? <Button onClick={() => setMode("wizard")} className="rounded-full gap-1.5"><Plus className="w-4 h-4" /> Start Visit</Button> : null}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((v) => {
              const flagged = (v.checklist || []).filter((i) => i.status === "Important" || i.status === "Emergency").length;
              const isAssistance = v.visit_type === "Property Assistance";
              const cn = clientName(v);
              const dateLabel = v.status === "Completed"
                ? athensMediumDate(v.end_time || v.start_time)
                : athensMediumDateTime(v.scheduled_time || v.start_time);
              const price = isAssistance && v.agreed_price != null ? Number(v.agreed_price || 0).toFixed(0) : null;
              return (
                <Link key={v.id} to={isAssistance ? `/property-assistance/${v.id}` : `/visits/${v.id}`}
                  className="block rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{propName(v.property_id)}</p>
                      {cn && <p className="text-xs text-muted-foreground truncate">{cn}</p>}
                      <p className="text-xs text-muted-foreground truncate">{visitTypeLabel(v.visit_type)}</p>
                      {isAssistance && v.request_description && (
                        <p className="text-xs text-muted-foreground/80 truncate italic">“{v.request_description}”</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {dateLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {price && <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">€{price}</span>}
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