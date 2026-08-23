import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, CheckCircle2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Image as UIImage } from "@/components/ui/image";

export default function PropertyInlineAdd({ entity, propertyId, fields, defaultValues = {}, submitLabel = "Add", onCreated, moreLabel, moreLink }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => { setValues({}); setDone(false); setOpen(false); };
  const setField = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); return file_url; } catch (e) {}
    setUploading(false);
  };

  const submit = async () => {
    const missing = fields.find((f) => f.required && !(values[f.name] ?? defaultValues[f.name]));
    if (missing) { alert(`${missing.label} is required`); return; }
    setSaving(true);
    try {
      const payload = { ...defaultValues, ...values, property_id: propertyId };
      await base44.entities[entity].create(payload);
      setSaving(false);
      setDone(true);
      setValues({});
      if (onCreated) onCreated();
      setTimeout(() => { setDone(false); setOpen(false); }, 900);
    } catch (e) { setSaving(false); alert("Could not save: " + (e?.message || e)); }
  };

  const renderField = (f) => {
    const val = values[f.name] ?? defaultValues[f.name] ?? "";
    switch (f.type) {
      case "textarea":
        return <Textarea value={val} onChange={(e) => setField(f.name, e.target.value)} placeholder={f.placeholder} rows={2} />;
      case "select":
      case "entity-select":
        return (
          <Select value={val || ""} onValueChange={(v) => setField(f.name, v)}>
            <SelectTrigger><SelectValue placeholder={f.placeholder || "Select…"} /></SelectTrigger>
            <SelectContent>
              {(f.options || []).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "date":
        return <Input type="date" value={val} onChange={(e) => setField(f.name, e.target.value)} />;
      case "number":
        return <Input type="number" step="0.01" value={val} onChange={(e) => setField(f.name, parseFloat(e.target.value) || 0)} />;
      case "image":
        return (
          <div className="space-y-2">
            {val && <UIImage src={val} className="w-full h-28 rounded-lg" fittingType="fill" />}
            <label className="inline-flex items-center gap-1.5 text-xs text-primary cursor-pointer">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{val ? "Replace" : "Upload"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const u = await upload(e.target.files?.[0]); setField(f.name, u); setUploading(false); }} />
            </label>
          </div>
        );
      default:
        return <Input value={val} onChange={(e) => setField(f.name, e.target.value)} placeholder={f.placeholder} />;
    }
  };

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="rounded-full gap-1.5">
          <Plus className="w-4 h-4" /> {submitLabel}
        </Button>
        {moreLink && (
          <a href={moreLink} className="text-xs text-primary hover:underline flex items-center gap-1">
            {moreLabel || "Full page"} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2.5 bg-muted/40">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{submitLabel}</p>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={reset}><X className="w-4 h-4" /></Button>
      </div>
      {fields.map((f) => (
        <div key={f.name}>
          {f.label && <Label className="text-xs text-muted-foreground mb-1 block">{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</Label>}
          {renderField(f)}
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={submit} disabled={saving} className="rounded-full gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {done ? "Saved" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} className="rounded-full">Cancel</Button>
        {moreLink && (
          <a href={moreLink} className="text-xs text-primary hover:underline flex items-center gap-1 ml-auto">
            More details <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}