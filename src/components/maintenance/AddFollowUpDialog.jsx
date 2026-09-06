import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquarePlus } from "lucide-react";
import PhotoPicker from "@/components/maintenance/PhotoPicker";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Simple follow-up entry: note + optional photos, with automatic timestamp and
// staff identity. Appends to the issue's follow-up history (nothing is
// overwritten) and NEVER changes the issue status by itself.
export default function AddFollowUpDialog({ open, onOpenChange, issue, staff, onAdded }) {
  const { t } = useLanguage();
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);

  const reset = () => { setNote(""); setPhotos([]); setSaving(false); };

  const confirm = async () => {
    setSaving(true);
    try {
      const entry = { note: note.trim(), photos, by: staff, at: new Date().toISOString() };
      const updated = await base44.entities.MaintenanceIssue.update(issue.id, {
        follow_ups: [...(issue.follow_ups || []), entry],
      });
      onAdded(updated);
      reset();
      onOpenChange(false);
    } catch (e) {
      alert(t("Could not save update: {message}", { message: e?.message || e }));
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Add Update")}</DialogTitle>
          <DialogDescription className="text-left truncate">{issue?.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block">{t("Update note")}</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("e.g. Called locksmith — waiting for a quote…")}
              className="resize-none"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">{t("Photos (optional)")}</Label>
            <PhotoPicker photos={photos} onChange={setPhotos} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Date/time and your name are recorded automatically. The issue stays open — its status does not change.")}
          </p>
        </div>
        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="flex-1 rounded-xl h-12">
            {t("Cancel")}
          </Button>
          <Button onClick={confirm} disabled={saving || !note.trim()} className="flex-1 rounded-xl h-12 gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquarePlus className="w-4 h-4" />} {t("Save Update")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}