import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image as UIImage } from "@/components/ui/image";
import { Loader2, Camera, CheckCircle2, X, Play } from "lucide-react";
import { athensMediumDateTime } from "@/lib/timezone";
import { assistanceTotalBeforeVat } from "@/lib/propertyAssistance";

export default function AssistancePerformer({ visit, property, client, business, onVisitUpdated, onCompleted }) {
  const [notes, setNotes] = useState(visit.summary || "");
  const [photos, setPhotos] = useState(visit.photos || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const complete = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.PropertyVisit.update(visit.id, {
        status: "Completed",
        end_time: new Date().toISOString(),
        summary: notes.trim(),
        photos,
      });
      onCompleted(updated);
    } catch (e) {
      alert("Could not complete: " + (e?.message || e));
    }
    setSaving(false);
  };

  const total = assistanceTotalBeforeVat(visit.agreed_price, visit.travel_charge);
  const vatRate = business?.vat_rate || 0;
  const vat = vatRate ? (total * vatRate) / 100 : 0;

  const RequestCard = (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">REQUEST</p>
      <p className="text-sm font-medium whitespace-pre-wrap">{visit.request_description || "—"}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Property: </span>{property?.name || "—"}</div>
        <div><span className="text-muted-foreground">Owner: </span>{client?.name || "—"}</div>
        <div><span className="text-muted-foreground">Service: </span>€{(visit.agreed_price || 0).toFixed(2)}</div>
        <div><span className="text-muted-foreground">Travel: </span>€{(visit.travel_charge || 0).toFixed(2)}</div>
      </div>
      {visit.scheduled_time && (
        <p className="text-xs text-muted-foreground mt-2">Scheduled: {athensMediumDateTime(visit.scheduled_time)}</p>
      )}
    </div>
  );

  if (visit.status === "Scheduled") {
    return (
      <div className="space-y-4">
        {RequestCard}
        <Button onClick={startNow} disabled={saving} className="w-full h-12 rounded-2xl gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Start Now
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {RequestCard}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          placeholder="What you did / anything the owner should know…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
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
      <Button onClick={complete} disabled={saving} className="w-full h-12 rounded-2xl gap-1.5">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Complete Job
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Total before VAT €{total.toFixed(2)}
        {vatRate ? ` · +VAT €${vat.toFixed(2)} · €${(total + vat).toFixed(2)}` : ""}
      </p>
    </div>
  );
}