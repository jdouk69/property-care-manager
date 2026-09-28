import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const LANG_LABELS = { en: "English", el: "Ελληνικά" };
const list = (v) => (Array.isArray(v) ? v : []);

function LangColumns({ field, content, onChange, renderBlock }) {
  const set = (lng, value) =>
    onChange({ ...content, [lng]: { ...(content[lng] || {}), [field.key]: value } });
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{field.label}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {["en", "el"].map((lng) => (
          <div key={lng} className="space-y-1.5 rounded-xl border border-border bg-card p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {LANG_LABELS[lng]}
            </span>
            {renderBlock(list((content[lng] || {})[field.key]), (next) => set(lng, next))}
          </div>
        ))}
      </div>
    </div>
  );
}

const removeBtn = (onRemove, label) => (
  <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={label}>
    <Trash2 className="w-4 h-4" />
  </Button>
);

// Editable list of plain strings (service-area chips, how-it-works steps).
export function StringListField({ field, content, onChange }) {
  return (
    <LangColumns
      field={field}
      content={content}
      onChange={onChange}
      renderBlock={(items, setItems) => (
        <>
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <Input
                value={item}
                onChange={(e) => setItems(items.map((v, j) => (j === i ? e.target.value : v)))}
              />
              {removeBtn(() => setItems(items.filter((_, j) => j !== i)), "Remove")}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, ""])}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </>
      )}
    />
  );
}

// Editable list of { title, text } trust cards.
export function TrustItemsField({ field, content, onChange }) {
  return (
    <LangColumns
      field={field}
      content={content}
      onChange={onChange}
      renderBlock={(items, setItems) => (
        <>
          {items.map((item, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-border p-2.5">
              <div className="flex items-start gap-1.5">
                <Input
                  value={item?.title || ""}
                  placeholder="Title"
                  onChange={(e) =>
                    setItems(items.map((v, j) => (j === i ? { ...v, title: e.target.value } : v)))
                  }
                />
                {removeBtn(() => setItems(items.filter((_, j) => j !== i)), "Remove")}
              </div>
              <Textarea
                value={item?.text || ""}
                placeholder="Text"
                rows={3}
                onChange={(e) =>
                  setItems(items.map((v, j) => (j === i ? { ...v, text: e.target.value } : v)))
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems([...items, { title: "", text: "" }])}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </>
      )}
    />
  );
}

// Editable list of { q, a } FAQ entries.
export function FaqsField({ field, content, onChange }) {
  return (
    <LangColumns
      field={field}
      content={content}
      onChange={onChange}
      renderBlock={(items, setItems) => (
        <>
          {items.map((item, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-border p-2.5">
              <div className="flex items-start gap-1.5">
                <Input
                  value={item?.q || ""}
                  placeholder="Question"
                  onChange={(e) =>
                    setItems(items.map((v, j) => (j === i ? { ...v, q: e.target.value } : v)))
                  }
                />
                {removeBtn(() => setItems(items.filter((_, j) => j !== i)), "Remove")}
              </div>
              <Textarea
                value={item?.a || ""}
                placeholder="Answer"
                rows={3}
                onChange={(e) =>
                  setItems(items.map((v, j) => (j === i ? { ...v, a: e.target.value } : v)))
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems([...items, { q: "", a: "" }])}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </>
      )}
    />
  );
}