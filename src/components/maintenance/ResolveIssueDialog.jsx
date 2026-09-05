import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import PhotoPicker from "@/components/maintenance/PhotoPicker";

// Explicit resolution flow: never auto-resolves by opening. Status is only set
// to the existing "Completed" status when staff confirm, together with the
// resolution note, automatic timestamp and staff identity. The original issue
// record is updated in place — no second record is created.
export default function ResolveIssueDialog({ open, onOpenChange, issue, staff, onResolved }) {
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);

  const reset = () => { setNote(""); setPhotos([]); setSaving(false); };

  const confirm = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.MaintenanceIssue.update(issue.id, {
        status: "Completed",
        resolution_note: note.trim(),
        resolved_at: new Date().toISOString(),
        resolved_by: staff,
        after_photos: [...(issue.after_photos || []), ...photos],
      });
      onResolved(updated);
      reset();
      onOpenChange(false);
    } catch (e) {
      alert("Could not resolve issue: " + (e?.message || e));
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Resolved</DialogTitle>
          <DialogDescription className="text-left truncate">{issue?.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block">What was done / how was this resolved?</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Replaced the gate hinge and re-secured the fence panel…"
              className="resize-none"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Resolution photos (optional)</Label>
            <PhotoPicker photos={photos} onChange={setPhotos} />
          </div>
          <p className="text-xs text-muted-foreground">
            Resolution date/time and your name are recorded automatically when you confirm.
          </p>
        </div>
        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="flex-1 rounded-xl h-12">
            Cancel
          </Button>
          <Button onClick={confirm} disabled={saving || !note.trim()} className="flex-1 rounded-xl h-12 gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm Resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}