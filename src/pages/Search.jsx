import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, Users, Home, HardHat, ListChecks, Wrench, FileText, ArrowRight, MapPin, ClipboardCheck, Wallet, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import PageBackButton from "@/components/ui/PageBackButton";
import EmptyState from "@/components/ui/EmptyState";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { visitTypeLabel } from "@/lib/visitTypeLabels";

// renderKey/renderSub (when present) are display-only overrides that map a raw
// stored enum to its localized label via the central display architecture.
// Search behavior (indexing, matching, ranking, navigation) is untouched.
const SOURCES = [
  { entity: "Client", label: "Clients", icon: Users, key: "name", sub: "email", to: "/clients" },
  { entity: "Property", label: "Properties", icon: Home, key: "name", sub: "address", to: "/properties" },
  { entity: "PropertyVisit", label: "Property Visits", icon: MapPin, key: "visit_type", sub: "summary", to: "/visits",
    renderKey: (it, t) => t(visitTypeLabel(it.visit_type || "")) },
  { entity: "Inspection", label: "Inspections", icon: ClipboardCheck, key: "summary_notes", sub: "inspector", to: "/inspections" },
  { entity: "MaintenanceIssue", label: "Issues", icon: Wrench, key: "title", sub: "description", to: "/maintenance" },
  { entity: "Task", label: "Tasks", icon: ListChecks, key: "title", sub: "notes", to: "/tasks" },
  { entity: "Contractor", label: "Contractors", icon: HardHat, key: "company", sub: "trade", to: "/contractors",
    renderSub: (it, t) => t(it.trade || "") },
  { entity: "Expense", label: "Expenses & Receipts", icon: Wallet, key: "vendor", sub: "notes", to: "/expenses" },
  { entity: "OwnerCommunication", label: "Owner Updates", icon: MessageSquare, key: "subject", sub: "message", to: "/communications" },
];

export default function Search() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const q = query.toLowerCase();
    setLoading(true);
    Promise.all(
      SOURCES.map(async (s) => {
        try {
          const list = await base44.entities[s.entity].list("-created_date", 200);
          const filtered = (list || []).filter((it) =>
            (it[s.key] || "").toLowerCase().includes(q) || (it[s.sub] || "").toString().toLowerCase().includes(q)
          ).slice(0, 5);
          return { ...s, items: filtered };
        } catch { return { ...s, items: [] }; }
      })
    ).then((r) => { setResults(r); setLoading(false); });
  }, [query]);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
        <PageBackButton className="mb-3" />
        <PageHeader title={t("Search")} subtitle={t("Find anything across your business")} icon={SearchIcon} />
        <div className="relative">
          <SearchIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search clients, properties, contractors…")} className="pl-12 h-12 rounded-2xl text-base bg-muted/50 border-0 focus-visible:ring-1" />
        </div>

        <div className="mt-6 space-y-6">
          {results?.map((s) => s.items.length > 0 && (
            <div key={s.entity}>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <s.icon className="w-3.5 h-3.5" /> {t(s.label)}
                </div>
                <button onClick={() => navigate(s.to)} className="text-xs text-primary flex items-center gap-1 hover:underline">{t("View all")} <ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-1.5">
                {s.items.map((it) => (
                  <button key={it.id} onClick={() => navigate(s.to)} className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.renderKey ? s.renderKey(it, t) : it[s.key]}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.renderSub ? s.renderSub(it, t) : it[s.sub] || "—"}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {results && results.every((r) => r.items.length === 0) && !loading && (
            <EmptyState icon={SearchIcon} title={t("No results found")} description={t("Nothing matched \"{query}\".", { query })} />
          )}
          {!results && <EmptyState icon={SearchIcon} title={t("Start typing to search")} description={t("Search across clients, properties, visits, inspections, issues, tasks, contractors, expenses, receipts and owner updates.")} />}
        </div>
      </div>
    </AppLayout>
  );
}