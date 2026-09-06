import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Loader2, CheckCircle2, MessageSquarePlus, Pencil, Wrench, X, MapPin,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { Button } from "@/components/ui/button";
import { Image as UIImage } from "@/components/ui/image";
import { badgeTone } from "@/components/resource/ResourceListPage";
import ResolveIssueDialog from "@/components/maintenance/ResolveIssueDialog";
import AddFollowUpDialog from "@/components/maintenance/AddFollowUpDialog";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { athensMediumDateTime } from "@/lib/timezone";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground shrink-0 pt-1">{label}</span>
      <span className="text-sm text-foreground text-right min-w-0 break-words">{value}</span>
    </div>
  );
}

function PhotoGrid({ photos }) {
  if (!photos?.length) return null;
  return (
    <div className="grid grid-cols-4 gap-2 mt-2">
      {photos.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden">
          <UIImage src={url} className="w-full h-full" fittingType="fill" />
        </a>
      ))}
    </div>
  );
}

// Field-focused Maintenance Issue Detail: view what was reported, add
// follow-ups, resolve explicitly — administrative edits stay in the existing
// Edit Maintenance form, reachable via "Edit Details".
export default function MaintenanceIssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, tEnum, lang } = useLanguage();
  const [issue, setIssue] = useState(null);
  const [property, setProperty] = useState({});
  const [contractor, setContractor] = useState(null);
  const [sourceVisit, setSourceVisit] = useState(null);
  const [staff, setStaff] = useState("Staff");
  const [loading, setLoading] = useState(true);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const m = await base44.entities.MaintenanceIssue.get(id);
        setIssue(m);
        const loads = [];
        if (m.property_id) loads.push(base44.entities.Property.get(m.property_id).then(setProperty).catch(() => {}));
        if (m.contractor_id) loads.push(base44.entities.Contractor.get(m.contractor_id).then(setContractor).catch(() => {}));
        if (m.source_visit_id) loads.push(base44.entities.PropertyVisit.get(m.source_visit_id).then(setSourceVisit).catch(() => {}));
        await Promise.all(loads);
      } catch (e) {}
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    base44.auth.me().then((u) => setStaff(u?.full_name || u?.email || "Staff")).catch(() => {});
  }, []);

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!issue) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-muted-foreground">{t("Issue not found.")}</p>
          <Link to="/maintenance"><Button variant="outline" className="mt-3">{t("Back to Maintenance")}</Button></Link>
        </div>
      </AppLayout>
    );
  }

  const unresolved = issue.status !== "Completed" && issue.status !== "Cancelled" && !issue.archived;
  const resolved = issue.status === "Completed";
  const followUps = issue.follow_ups || [];

  const coordRows = (
    <>
      <Row label={t("Assigned contractor")} value={contractor?.company} />
      <Row label={t("Quotation")} value={issue.contractor_quotation != null ? `€${Number(issue.contractor_quotation).toFixed(2)}` : ""} />
      <Row label={t("Scheduled appointment")} value={issue.scheduled_appointment} />
      <Row label={t("Follow-up date")} value={issue.follow_up_date} />
      <Row label={t("Cost estimate")} value={issue.cost_estimate != null ? `€${Number(issue.cost_estimate).toFixed(2)}` : ""} />
      <Row label={t("Final cost")} value={issue.final_cost != null ? `€${Number(issue.final_cost).toFixed(2)}` : ""} />
      <Row label={t("Payment status")} value={issue.payment_status && issue.payment_status !== "Unpaid" ? tEnum(issue.payment_status, "payment") : ""} />
    </>
  );

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback="/maintenance" className="mb-2" />

        {/* Header: title / property / status / priority — visible first */}
        <div className="rounded-2xl border border-border bg-card p-4 mb-3">
          <h1 className="text-xl font-semibold leading-tight break-words">{issue.title}</h1>
          {property.name && (
            <p className="text-sm text-muted-foreground mt-1">
              {property.name}{property.address ? ` · ${property.address}` : ""}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${badgeTone(issue.status)}`}>{tEnum(issue.status, "issue")}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${badgeTone(issue.priority)}`}>{tEnum(issue.priority, "priority")}</span>
            {issue.category && <span className="text-xs px-2.5 py-1 rounded-full border bg-muted text-muted-foreground border-border">{t(issue.category)}</span>}
            {issue.archived && <span className="text-xs px-2.5 py-1 rounded-full border bg-muted text-muted-foreground border-border">{t("Archived")}</span>}
          </div>
        </div>

        {/* Primary actions — immediately under the header, no scrolling */}
        {unresolved ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <Button onClick={() => setResolveOpen(true)} className="rounded-2xl h-14 text-base gap-2">
                <CheckCircle2 className="w-5 h-5" /> {t("Mark Resolved")}
              </Button>
              <Button variant="outline" onClick={() => setFollowUpOpen(true)} className="rounded-2xl h-14 text-base gap-2">
                <MessageSquarePlus className="w-5 h-5" /> {t("Add Update")}
              </Button>
            </div>
            <Button variant="ghost" onClick={() => navigate(`/maintenance?open=${issue.id}&edit=1`)} className="rounded-xl gap-1.5 h-11 text-muted-foreground">
              <Pencil className="w-4 h-4" /> {t("Edit Details")}
            </Button>
          </>
        ) : (
          <div className={`rounded-2xl border p-4 mb-4 ${resolved ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/30"}`}>
            <div className="flex items-center gap-2">
              {resolved ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-muted-foreground" />}
              <p className="text-sm font-semibold text-foreground">{resolved ? t("Resolved") : t("Cancelled")}</p>
            </div>
            {resolved && issue.resolved_at && (
              <p className="text-xs text-muted-foreground mt-1">
                {athensMediumDateTime(issue.resolved_at, lang)}{issue.resolved_by ? ` · ${t("by {name}", { name: issue.resolved_by })}` : ""}
              </p>
            )}
            {resolved && issue.resolution_note && (
              <>
                <p className="text-xs text-muted-foreground mt-2 mb-0.5">{t("Resolution note")}</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{issue.resolution_note}</p>
              </>
            )}
            <PhotoGrid photos={resolved ? issue.after_photos : issue.during_photos} />
            <Button variant="ghost" onClick={() => navigate(`/maintenance?open=${issue.id}&edit=1`)} className="rounded-xl gap-1.5 h-11 mt-2 text-muted-foreground">
              <Pencil className="w-4 h-4" /> {t("Edit Details")}
            </Button>
          </div>
        )}

        {/* Issue details — only what was actually recorded */}
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t("Issue Details")}</h2>
          </div>
          {issue.description ? (
            <div className="mb-2">
              <p className="text-xs text-muted-foreground mb-1">{t("What was reported / observed")}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{issue.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-2">{t("No description recorded.")}</p>
          )}
          <Row label={t("Reported")} value={issue.created_date ? athensMediumDateTime(issue.created_date, lang) : ""} />
          <Row label={t("Reported by")} value={issue.reported_by} />
          {sourceVisit && (
            <Row
              label={t("Source visit")}
              value={`${t(visitTypeLabel(sourceVisit.visit_type))} · ${athensMediumDateTime(sourceVisit.start_time || sourceVisit.scheduled_time, lang)}`}
            />
          )}
          {sourceVisit && (
            <Link to={`/visits/${sourceVisit.id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {t("View source visit")}
            </Link>
          )}
          <PhotoGrid photos={issue.before_photos} />
        </div>

        {/* Follow-up */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquarePlus className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t("Updates")}</h2>
          </div>
          {coordRows}
          {followUps.length > 0 ? (
            <div className="mt-3 space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("History")}</p>
              {followUps.map((f, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{f.note}</p>
                  <PhotoGrid photos={f.photos} />
                  <p className="text-xs text-muted-foreground mt-1.5">{f.by}{f.at ? ` · ${athensMediumDateTime(f.at, lang)}` : ""}</p>
                </div>
              ))}
            </div>
          ) : (
            !contractor?.company && !issue.scheduled_appointment && !issue.follow_up_date && (
              <p className="text-sm text-muted-foreground">{t("No follow-up activity yet.")}</p>
            )
          )}
          {unresolved && issue.during_photos?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-0.5">{t("Update photos")}</p>
              <PhotoGrid photos={issue.during_photos} />
            </div>
          )}
          {issue.completion_notes && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-0.5">{t("Completion notes")}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{issue.completion_notes}</p>
            </div>
          )}
        </div>
      </div>

      <ResolveIssueDialog open={resolveOpen} onOpenChange={setResolveOpen} issue={issue} staff={staff} onResolved={setIssue} />
      <AddFollowUpDialog open={followUpOpen} onOpenChange={setFollowUpOpen} issue={issue} staff={staff} onAdded={setIssue} />
    </AppLayout>
  );
}