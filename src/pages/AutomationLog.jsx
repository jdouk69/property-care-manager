import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { History, Loader2, CheckCircle2, XCircle } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export default function AutomationLog() {
  const [logs, setLogs] = useState([]);
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const debounceRef = useRef(null);

  const load = async () => {
    try {
      const [list, props] = await Promise.all([
        base44.entities.AutomationLog.list("-created_date", 200),
        base44.entities.Property.list("-created_date", 500),
      ]);
      setLogs(list || []);
      const map = {};
      (props || []).forEach((p) => (map[p.id] = p.name));
      setProperties(map);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
    let unsub = () => {};
    try { unsub = base44.entities.AutomationLog.subscribe(() => load()); } catch (e) {}
    return unsub;
  }, []);

  const types = ["all", ...Array.from(new Set(logs.map((l) => l.automation_type)))];
  const filtered = typeFilter === "all" ? logs : logs.filter((l) => l.automation_type === typeFilter);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24 lg:pb-6">
        <PageHeader title="Automation Log" subtitle="History of recurring tasks and notifications" icon={History} />

        <div className="flex flex-wrap gap-1.5 mb-4">
          {types.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${typeFilter === t ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={History} title="No automation activity yet" description="Recurring task completions and notification generation will be logged here." />
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => {
              const ok = log.status !== "failure";
              const dt = log.date_time ? new Date(log.date_time) : null;
              return (
                <div key={log.id} className="rounded-xl border border-border bg-card p-3 flex gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ok ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                    {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{log.automation_type}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${ok ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}>{log.status || "success"}</span>
                    </div>
                    {log.record_created && log.record_created !== "—" && <p className="text-xs text-muted-foreground truncate">{log.record_created}</p>}
                    {log.related_property_id && properties[log.related_property_id] && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Property: {properties[log.related_property_id]}</p>
                    )}
                    {log.error_details && <p className="text-[11px] text-rose-600 mt-1">{log.error_details}</p>}
                    {dt && <p className="text-[11px] text-muted-foreground mt-0.5">{dt.toLocaleString("en-GB")}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}