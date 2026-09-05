import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import PhotoPicker from "@/components/maintenance/PhotoPicker";
import DictateButton from "@/components/dictation/DictateButton";
import DictateFormDialog from "@/components/dictation/DictateFormDialog";

const CATEGORIES = [
  "Plumbing", "Electrical", "Pool", "Irrigation", "Garden", "Air conditioning",
  "Heating", "Appliance", "Internet", "Security", "Locksmith", "Cleaning",
  "Painting", "Building repair", "Pest control", "Storm damage", "Other",
];
const PRIORITIES = ["Routine", "Medium", "High", "Emergency"];

// Voice may propose values ONLY for these existing Report Issue fields.
const DICTATE_FIELDS = [
  { key: "title", label: "What is the problem?", kind: "text" },
  { key: "priority", label: "Priority", kind: "enum", options: PRIORITIES },
  { key: "category", label: "Category", kind: "enum", options: CATEGORIES },
  { key: "description", label: "What was observed or reported?", kind: "textarea" },
];

// Fast field entry point for reporting a new problem — creates ONE normal
// Maintenance Issue on the EXISTING entity (no second system). No source visit
// is linked: the issue was reported independently. After save the caller
// navigates to the new Maintenance Issue Detail.
export default function ReportIssueSheet({ open, onOpenChange, properties, onCreated }) {
  const [propertyId, setPropertyId] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState("");
  const [dictateOpen, setDictateOpen] = useState(false);

  // Dictation may propose values only — the worker reviews in the shared dialog.
  const applyDictation = (patch) => {
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.priority !== undefined) setPriority(patch.priority);
    if (patch.category !== undefined) setCategory(patch.category);
    if (patch.description !== undefined) setDescription(patch.description);
  };

  useEffect(() => {
    if (open) {
      base44.auth.me().then((u) => setStaff(u?.full_name || u?.email || "Staff")).catch(() => setStaff("Staff"));
    }
  }, [open]);

  const reset = () => {
    setPropertyId(""); setTitle(""); setPriority("Medium");
    setDescription(""); setCategory("Other"); setPhotos([]); setSaving(false);
  };

  const save = async () => {
    if (!propertyId || !title.trim()) return;
    setSaving(true);
    try {
      const created = await base44.entities.MaintenanceIssue.create({
        title: title.trim(),
        property_id: propertyId,
        priority,
        category,
        description: description.trim(),
        before_photos: photos,
        status: "Reported",   // normal initial/open status for Maintenance Issues
        reported_by: staff,    // staff identity; created/reported date is automatic
        // Intentionally NO source_visit_id — reported independently, not from a visit
      });
      reset();
      onOpenChange(false);
      onCreated(created);
    } catch (e) {
      alert("Could not save the issue: " + (e?.message || e));
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <SheetContent side="bottom" className="p-4 pb-6 rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left pr-10">
          <SheetTitle>Report Issue</SheetTitle>
          <SheetDescription>Record a new problem or concern for a property.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 mt-2">
          {/* Dictate — optional voice entry for this Report Issue form */}
          <DictateButton label="Dictate" onClick={() => setDictateOpen(true)} />
          <div>
            <Label className="mb-1.5 block">Property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="h-12 rounded-xl text-base"><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>
                {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">What is the problem?</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Broken gate at the driveway" className="h-12 rounded-xl text-base" />
          </div>
          <div>
            <Label className="mb-1.5 block">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-12 rounded-xl text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">What was observed or reported? (optional)</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Anything else staff should know…" className="rounded-xl resize-none" />
          </div>
          <div>
            <Label className="mb-1.5 block">Category (optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-12 rounded-xl text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Photos (optional)</Label>
            <PhotoPicker photos={photos} onChange={setPhotos} />
          </div>
          <Button onClick={save} disabled={saving || !propertyId || !title.trim()} className="w-full rounded-2xl h-14 text-base">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </Button>

          {/* Shared dictation service — operates only on this open form; the
              property is already chosen in the form, never inferred from speech. */}
          <DictateFormDialog
            open={dictateOpen}
            onOpenChange={setDictateOpen}
            context={{
              propertyId,
              propertyName: properties.find((p) => p.id === propertyId)?.name || "",
              recordLabel: "Report Issue",
            }}
            fields={DICTATE_FIELDS}
            values={{ title, priority, category, description }}
            onApply={applyDictation}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}