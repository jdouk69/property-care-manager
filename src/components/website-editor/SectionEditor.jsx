import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Info, Plus, Trash2 } from "lucide-react";
import { EDITOR_SCHEMA } from "@/lib/website/contentModel";
import { StringListField, TrustItemsField, FaqsField } from "./ListFields";

const LANG_LABELS = { en: "English", el: "Ελληνικά" };

function BilingualText({ field, content, onChange }) {
  const Comp = field.type === "textarea" ? Textarea : Input;
  const langs = field.elOnly ? ["el"] : ["en", "el"];
  const set = (lng, value) =>
    onChange({ ...content, [lng]: { ...(content[lng] || {}), [field.key]: value } });
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{field.label}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {langs.map((lng) => (
          <div key={lng} className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {LANG_LABELS[lng]}
            </span>
            <Comp
              value={(content[lng] || {})[field.key] || ""}
              rows={field.rows || 4}
              onChange={(e) => set(lng, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Renders the schema-driven editor for one homepage section.
export default function SectionEditor({ sectionKey, content, onChange }) {
  const schema = EDITOR_SCHEMA[sectionKey];
  if (!schema) return null;
  return (
    <div className="space-y-6">
      {schema.info && (
        <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed text-foreground/90">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <p>{schema.info}</p>
        </div>
      )}
      {schema.fields.map((f) => {
        if (f.type === "text" || f.type === "textarea")
          return <BilingualText key={f.key} field={f} content={content} onChange={onChange} />;
        if (f.type === "stringList" || f.type === "steps")
          return <StringListField key={f.key} field={f} content={content} onChange={onChange} />;
        if (f.type === "trustItems")
          return <TrustItemsField key={f.key} field={f} content={content} onChange={onChange} />;
        if (f.type === "faqs")
          return <FaqsField key={f.key} field={f} content={content} onChange={onChange} />;
        return null;
      })}
    </div>
  );
}