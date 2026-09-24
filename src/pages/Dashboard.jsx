import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  AlertTriangle, Home, ArrowRight, CheckCircle2, MapPin, Wrench, Plane,
  StickyNote, Euro, HardHat, Zap,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import AppLayout from "@/components/layout/AppLayout";
import StatCard from "@/components/ui/StatCard";
import TodayAgenda from "@/components/dashboard/TodayAgenda";
import QuickActions from "@/components/dashboard/QuickActions";
import CancelVisitMenu from "@/components/visits/CancelVisitMenu";
import ReportIssueSheet from "@/components/maintenance/ReportIssueSheet";
import { generateTimeBasedNotifications } from "@/lib/notifications";
import { loadDraft } from "@/lib/visitDraft";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { unsentReports } from "@/lib/todayAgenda";
import { athensToday, TZ } from "@/lib/timezone";
import { qaPropertyIds, isQaProperty } from "@/lib/qaGuard";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/AuthContext";

const today = athensToday;
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

function QuickNotes({ initial }) {
  const { t: tr } = useLanguage();
  const [val, setVal] = useState(initial || "");
  const [saved, setSaved] = useState(false);
  // Shared staff scratchpad — its own entity so BusinessSettings configuration
  // stays admin-only without breaking this staff feature. The legacy
  // BusinessSettings quick_notes value (still readable) only seeds the display
  // until the first save creates the StaffNotes record.
  const noteIdRef = useRef(null);
  const dirtyRef = useRef(false);
  useEffect(() => {
    base44.entities.StaffNotes.list("-created_date", 1).then((l) => {
      const rec = (l || [])[0];
      if (rec) { noteIdRef.current = rec.id; if (!dirtyRef.current) setVal(rec.notes || ""); }
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!dirtyRef.current) return;
    const t = setTimeout(async () => {
      try {
        if (noteIdRef.current) await base44.entities.StaffNotes.update(noteIdRef.current, { notes: val });
        else { const created = await base44.entities.StaffNotes.create({ notes: val }); noteIdRef.current = created.id; }
        setSaved(true); setTimeout(() => setSaved(false), 1200);
      } catch (e) {}
    }, 900);
    return () => clearTimeout(t);
  }, [val]);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-medium text-sm"><StickyNote className="w-4 h-4 text-muted-foreground" /> {tr("Quick Notes")}</div>
        {saved && <span className="text-xs text-emerald-600">{tr("Saved")}</span>}
      </div>
      <Textarea value={val} onChange={(e) => { dirtyRef.current = true; setVal(e.target.value); }} placeholder={tr("Jot down anything important…")} rows={3} className="resize-none" />
    </div>
  );
}

// Draft visit banner — the ONLY thing this still handles is a started-but-
// unsaved local draft (localStorage), which is not a PropertyVisit record yet
// and therefore can't appear in the unified TODAY section. Draft-aware record
// states (In Progress visits, open issues, prep tasks) now surface in TODAY.
function NextActionCard({ draft, propName, onCancelDone }) {
  const { t: tr } = useLanguage();
  if (!draft || !draft.propertyId) return null;
  return (
    <div className="relative rounded-2xl bg-primary text-primary-foreground p-4 mb-5 shadow-sm overflow-hidden">
      <Link to="/visits?continue=1" className="block pr-12 hover:opacity-95 transition">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide opacity-80">{tr("Continue working — visit in progress")}</p>
              <p className="font-semibold truncate">{tr("Continue Visit — {property}", { property: propName(draft.propertyId) })}</p>
              <p className="text-xs opacity-80 truncate">{visitTypeLabel(draft.visitType) || "Monthly Property Watch"}</p>
            </div>
          </div>
          <span className="text-sm font-medium shrink-0 flex items-center gap-1">{tr("Continue")} <ArrowRight className="w-4 h-4" /></span>
        </div>
      </Link>
      <div className="absolute top-2 right-2">
        <CancelVisitMenu
          draft={draft}
          onDone={onCancelDone}
          triggerClassName="text-primary-foreground hover:bg-primary-foreground/15"
        />
      </div>
    </div>
  );
}

function ManageCard({ to, label, icon: Icon, color }) {
  const { t } = useLanguage();
  return (
    <Link to={to} className="block">
      <div className="flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl border border-border bg-card px-2 hover:border-primary/30 hover:shadow-md transition">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-xs font-medium text-center leading-tight">{t(label)}</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ tasks: [], inspections: [], maintenance: [], properties: [], clients: [], contractors: [], expenses: [], keys: [], invoices: [], visits: [], agreements: [], intakes: [], servicePackages: [], repReports: [], billing: [] });
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  // NOTE: aliased as `tr` because `t` is the Athens "today" date in this component.
  const { t: tr, lang } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    (async () => {
      try {
        const [tasks, inspections, maintenance, properties, clients, contractors, expenses, keys, invoices, visits, agreements, intakes, servicePackages, repReports, billingCharges, sList] = await Promise.all([
          base44.entities.Task.list("-date", 200),
          base44.entities.Inspection.list("-date", 200),
          base44.entities.MaintenanceIssue.list("-created_date", 200),
          base44.entities.Property.list("-created_date", 200),
          base44.entities.Client.list("-created_date", 200),
          base44.entities.Contractor.list("-created_date", 200),
          base44.entities.Expense.list("-date", 200),
          base44.entities.Key.list("-created_date", 200),
          base44.entities.Invoice.list("-created_date", 200),
          base44.entities.PropertyVisit.list("-start_time", 200),
          base44.entities.PropertyServiceAgreement.list("-created_date", 200),
          base44.entities.CustomerIntake.list("-created_date", 200),
          base44.entities.ServicePackage.list("-created_date", 200),
          base44.entities.OwnerRepReport.list("-created_date", 200),
          base44.entities.BillingCharge.list("-created_date", 200),
          base44.entities.BusinessSettings.list("-created_date", 1),
        ]);
        setData({ tasks, inspections, maintenance, properties, clients, contractors, expenses, keys, invoices, visits, agreements, intakes, servicePackages, repReports, billing: billingCharges });
        if (sList && sList[0]) setSettings(sList[0]);
      } catch (e) {}
      setLoading(false);
      setDraft(loadDraft());
      generateTimeBasedNotifications().catch(() => {});
    })();
  }, []);

  const t = today();
  // QA test property stays out of operational counts, queues and the agenda.
  const qaIds = qaPropertyIds(data.properties);
  const opVisits = data.visits.filter((v) => !qaIds.has(v.property_id));
  const ownerName = settings?.owner_name || "Jim";
  const propName = (id) => data.properties.find((p) => p.id === id)?.name || tr("Property");

  // Reports waiting to be sent — same rule as the unified TODAY section
  // (single source of truth: unsentReports in lib/todayAgenda).
  const reportsWaiting = unsentReports(opVisits).length;

  // Billing ledger totals. "Overdue" is derived (Due + past due date), never stored.
  const billingOutstanding = data.billing
    .filter((c) => c.status === "Due" && !c.archived)
    .reduce((s, c) => s + (c.amount || 0), 0);
  const billingOverdue = data.billing
    .filter((c) => c.status === "Due" && !c.archived && c.due_date && c.due_date < t)
    .reduce((s, c) => s + (c.amount || 0), 0);
  const billingPaidMonth = data.billing
    .filter((c) => c.status === "Paid" && !c.archived && String(c.paid_date || "").slice(0, 7) === t.slice(0, 7))
    .reduce((s, c) => s + (c.amount || 0), 0);

  const startVisitTo = draft && draft.propertyId && !qaIds.has(draft.propertyId) ? "/visits?continue=1" : "/visits?start=1";
  const startVisitLabel = draft && draft.propertyId && !qaIds.has(draft.propertyId)
    ? tr("Continue Visit — {property}", { property: propName(draft.propertyId) })
    : tr("Start Visit");
  const draftDisplay = draft && draft.propertyId && !qaIds.has(draft.propertyId) ? draft : null;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
        <div className="mb-5">
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(lang === "el" ? "el-GR" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TZ })}</p>
          <h1 className="text-2xl font-semibold tracking-tight mt-0.5">{tr(greeting())}, {ownerName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{tr("Open the app, see what needs to be done, tap it, do the work.")}</p>
        </div>

        {/* TODAY — one unified source of truth for actionable work */}
        <TodayAgenda data={{ ...data, visits: opVisits }} />

        {/* Local draft visit (started, not yet saved) — Continue banner */}
        <NextActionCard draft={draftDisplay} propName={propName} onCancelDone={() => setDraft(null)} />

        {/* QUICK ACTIONS — large touch-friendly entry points into existing workflows */}
        <QuickActions
          startVisitTo={startVisitTo}
          startVisitLabel={startVisitLabel}
          onReportIssue={() => setReportOpen(true)}
          reportsWaiting={reportsWaiting}
        />

        {/* MANAGE — business records, never buried in More */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">{tr("MANAGE")}</p>
          <div className="grid grid-cols-3 gap-2">
            <ManageCard to="/clients" label="Clients" icon={HardHat} color="bg-rose-500" />
            <ManageCard to="/properties" label="Properties" icon={Home} color="bg-indigo-500" />
            <ManageCard to="/one-time" label="One-Time Services" icon={Zap} color="bg-cyan-500" />
          </div>
        </div>

        {/* BUSINESS OVERVIEW — secondary, informational */}
        <div className="rounded-2xl border border-border bg-card p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{tr("BUSINESS OVERVIEW")}</p>
            {isAdmin && (
              <Link to="/billing" className="text-xs text-primary flex items-center gap-1 hover:underline">
                {tr("View Details")} <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Euro} label={tr("Outstanding")} value={`€${billingOutstanding.toFixed(2)}`} tone={billingOutstanding ? "warning" : "success"} />
            <StatCard icon={AlertTriangle} label={tr("Overdue")} value={`€${billingOverdue.toFixed(2)}`} tone={billingOverdue ? "danger" : "success"} />
            <StatCard icon={CheckCircle2} label={tr("Paid this month")} value={`€${billingPaidMonth.toFixed(2)}`} tone="success" />
            <StatCard icon={Home} label={tr("Properties")} value={data.properties.filter((p) => !isQaProperty(p)).length} tone="primary" />
          </div>
        </div>

        {/* Staff scratchpad */}
        <QuickNotes initial={settings?.quick_notes} />

        {/* Report Issue sheet — saves into the existing Maintenance Issue entity */}
        <ReportIssueSheet
          open={reportOpen}
          onOpenChange={setReportOpen}
          properties={data.properties.filter((p) => !p.archived)}
          onCreated={(m) => navigate(`/maintenance/${m.id}`)}
        />
      </div>
    </AppLayout>
  );
}