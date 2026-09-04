import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image as UIImage } from "@/components/ui/image";
import { Loader2, Camera, CheckCircle2, X, Play, Pencil } from "lucide-react";
import { athensMediumDateTime } from "@/lib/timezone";
import { assistanceChargeBreakdown, assistanceHourlyRate, assistanceServiceName, ON_DEMAND_ASSISTANCE_TYPE } from "@/lib/propertyAssistance";
import { ensureOnDemandAssistanceCharge } from "@/lib/visitBilling";
import AdjustChargesSheet from "./AdjustChargesSheet";
import ChargeReviewDialog from "./ChargeReviewDialog";

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function ChargesCard({ visit, vatRate, onAdjust }) {
  const base = Number(visit.agreed_price) || 0;
  const minutes = Number(visit.additional_minutes) || 0;
  const additionalLabor = Number(visit.additional_labor_charge) || 0;
  const travel = Number(visit.travel_charge) || 0;
  const materials = Number(visit.materials_charge) || 0;
  const { subtotal, vat, total } = assistanceChargeBreakdown({ base, additionalLabor, travel, materials, vatRate });
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">CHARGES</p>
        <button
          type="button"
          onClick={onAdjust}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline min-h-[36px] touch-manipulation"
        >
          <Pencil className="w-3.5 h-3.5" /> Adjust
        </button>
      </div>
      <Row label="Base service" value={`€${base.toFixed(2)}`} />
      {minutes > 0 || additionalLabor > 0 ? (
        <Row label={`Additional labor (${minutes} min)`} value={`€${additionalLabor.toFixed(2)}`} />
      ) : null}
      <Row label="Travel" value={`€${travel.toFixed(2)}`} />
      <Row label="Materials" value={`€${materials.toFixed(2)}`} />
      <div className="border-t border-border pt-2">
        <Row label="Subtotal" value={`€${subtotal.toFixed(2)}`} />
        {vatRate ? <Row label={`VAT (${vatRate}%)`} value={`€${vat.toFixed(2)}`} /> : null}
        {vatRate ? <Row label="Total" value={`€${total.toFixed(2)}`} bold /> : null}
      </div>
    </div>
  );
}

export default function AssistancePerformer({ visit, property, client, business, onVisitUpdated, onCompleted }) {
  const [notes, setNotes] = useState(visit.summary || "");
  const [internalNotes, setInternalNotes] = useState(visit.internal_notes || "");
  const [photos, setPhotos] = useState(visit.photos || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const vatRate = business?.vat_rate || 0;

  const startNow = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.PropertyVisit.update(visit.id, {
        status: "In Progress",
        start_time: new Date().toISOString(),
      });
      onVisitUpdated(updated);
    } catch (e) {
      alert("Could not start: " + (e?.message || e));
    }
    setSaving(false);
  };

  const upload = async (files) => {
    if (!files || !files.length) return;
    setUploading(true);
    const urls = [];
    for (const f of Array.from(files)) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        urls.push(file_url);
      } catch (e) {}
    }
    setUploading(false);
    setPhotos((arr) => [...arr, ...urls]);
  };

  const removePhoto = (i) => setPhotos((arr) => arr.filter((_, x) => x !== i));

  // Freeze final charge values on completion so historical jobs are never
  // recalculated if package pricing or VAT config changes later.
  const confirmComplete = async () => {
    setSaving(true);
    try {
      const base = Number(visit.agreed_price) || 0;
      const minutes = Number(visit.additional_minutes) || 0;
      const additionalLabor = Number(visit.additional_labor_charge) || 0;
      const travel = Number(visit.travel_charge) || 0;
      const materials = Number(visit.materials_charge) || 0;
      const { subtotal, vat, total } = assistanceChargeBreakdown({ base, additionalLabor, travel, materials, vatRate });
      const updated = await base44.entities.PropertyVisit.update(visit.id, {
        status: "Completed",
        end_time: new Date().toISOString(),
        summary: notes.trim(),
        internal_notes: internalNotes.trim(),
        photos,
        additional_minutes: minutes,
        additional_labor_charge: additionalLabor,
        materials_charge: materials,
        vat_amount: vat,
        vat_rate_snapshot: vatRate,
        final_total: total,
      });
      setReviewOpen(false);
      // Consolidated On-Demand Property Assistance: exactly ONE Due ledger
      // charge on completion (duplicate-protected — re-completion never
      // creates a second charge). Historical "Property Assistance" jobs keep
      // their existing manual-ledger behavior.
      try {
        if (visit.visit_type === ON_DEMAND_ASSISTANCE_TYPE) {
          await ensureOnDemandAssistanceCharge(updated, { clientId: client?.id || property?.owner_id || "" });
        }
      } catch (e) {
        alert("Job completed, but the ledger charge could not be created: " + (e?.message || e));
      }
      onCompleted(updated);
    } catch (e) {
      alert("Could not complete: " + (e?.message || e));
    }
    setSaving(false);
  };

  const RequestCard = (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">REQUEST</p>
      <p className="text-sm font-medium whitespace-pre-wrap">{visit.request_description || "—"}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Property: </span>{property?.name || "—"}</div>
        <div><span className="text-muted-foreground">Owner: </span>{client?.name || "—"}</div>
      </div>
      {visit.scheduled_time && (
        <p className="text-xs text-muted-foreground mt-2">Scheduled: {athensMediumDateTime(visit.scheduled_time)}</p>
      )}
    </div>
  );

  const adjustSheet = (
    <AdjustChargesSheet
      open={adjustOpen}
      onOpenChange={setAdjustOpen}
      visit={visit}
      vatRate={vatRate}
      hourlyRate={assistanceHourlyRate(visit.visit_type)}
      onSaved={onVisitUpdated}
    />
  );

  if (visit.status === "Scheduled") {
    return (
      <>
        <div className="space-y-4">
          {RequestCard}
          <ChargesCard visit={visit} vatRate={vatRate} onAdjust={() => setAdjustOpen(true)} />
          <Button onClick={startNow} disabled={saving} className="w-full h-12 rounded-2xl gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Start Now
          </Button>
        </div>
        {adjustSheet}
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {RequestCard}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <Label>Findings &amp; actions <span className="text-xs font-normal text-muted-foreground">(owner update)</span></Label>
          <Textarea
            placeholder="What you found and what you did…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <Label>Internal notes <span className="text-xs font-normal text-muted-foreground">(staff only)</span></Label>
          <Textarea
            placeholder="Anything worth recording for staff records…"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <Label>Photos (optional)</Label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                  <UIImage src={url} className="w-full h-full" fittingType="fill" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:bg-muted/50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {uploading ? "Uploading…" : "Add photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => upload(e.target.files)}
            />
          </label>
        </div>
        <ChargesCard visit={visit} vatRate={vatRate} onAdjust={() => setAdjustOpen(true)} />
        <Button onClick={() => setReviewOpen(true)} disabled={saving} className="w-full h-12 rounded-2xl gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Complete Job
        </Button>
      </div>
      {adjustSheet}
      <ChargeReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        visit={visit}
        serviceLabel={assistanceServiceName(visit.visit_type)}
        vatRate={vatRate}
        onConfirm={confirmComplete}
        onAdjust={() => {
          setReviewOpen(false);
          setAdjustOpen(true);
        }}
        saving={saving}
      />
    </>
  );
}