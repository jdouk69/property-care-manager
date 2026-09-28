import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Eye, Rocket, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import PageBackButton from "@/components/ui/PageBackButton";
import { DEFAULT_CONTENT, SECTION_META, mergeSection } from "@/lib/website/contentModel";
import SectionEditor from "@/components/website-editor/SectionEditor";
import PreviewOverlay from "@/components/website-editor/PreviewOverlay";

const clone = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Effective editor value for a section: the stored draft (or, failing that,
// the published content) merged OVER the built-in default copy. Untouched
// fields always show the current effective public wording in both languages —
// a stored draft that predates a newer field (e.g. the service-card wording)
// can no longer render blank. Saved values always win; nothing is overwritten.
const effectiveDraft = (k, rec) =>
  mergeSection(DEFAULT_CONTENT[k], rec?.draft || rec?.published || null);
const effectiveLive = (k, rec) => mergeSection(DEFAULT_CONTENT[k], rec?.published || null);

// Admin-only editor for the public homepage copy (EN/EL). Draft → preview →
// publish: editing only ever changes the DRAFT; visitors keep seeing the last
// PUBLISHED version until an admin clicks Publish, which copies draft →
// published. Prices, durations and package details are intentionally absent —
// they come live from ServicePackage records via the secure pricing feed.
export default function WebsiteEditor() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [records, setRecords] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [activeKey, setActiveKey] = useState("hero");
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.WebsiteSection.list();
      const recs = {};
      (list || []).forEach((r) => {
        if (r.section_key) recs[r.section_key] = r;
      });
      setRecords(recs);
      setDrafts((prev) => {
        if (prev) return prev; // keep any unsaved edits across refreshes
        const d = {};
        SECTION_META.forEach((m) => {
          d[m.key] = clone(effectiveDraft(m.key, recs[m.key]));
        });
        return d;
      });
    } catch (e) {
      setRecords({});
      setDrafts(clone(Object.fromEntries(SECTION_META.map((m) => [m.key, DEFAULT_CONTENT[m.key]]))));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // What is saved as draft vs what the public currently sees.
  const savedDraft = (k) => effectiveDraft(k, records?.[k]);
  const liveVersion = (k) => effectiveLive(k, records?.[k]);
  const isDirty = (k) => !!drafts && !same(drafts[k], savedDraft(k));
  const isUnpublished = (k) => !!drafts && !same(drafts[k], liveVersion(k));
  const publishCount = SECTION_META.filter((m) => isUnpublished(m.key)).length;

  async function saveDraft(k) {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const by = user?.full_name || "Admin";
      const rec = records[k];
      if (rec) {
        await base44.entities.WebsiteSection.update(rec.id, {
          draft: drafts[k],
          draft_updated_at: now,
          draft_updated_by: by,
        });
      } else {
        await base44.entities.WebsiteSection.create({
          section_key: k,
          draft: drafts[k],
          draft_updated_at: now,
          draft_updated_by: by,
        });
      }
      await load();
      toast({ title: "Draft saved — not visible to visitors until you publish." });
    } catch (e) {
      toast({ title: "Could not save the draft.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function publishAll() {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const by = user?.full_name || "Admin";
      let n = 0;
      for (const m of SECTION_META) {
        if (!isUnpublished(m.key)) continue;
        n++;
        const rec = records[m.key];
        const payload = {
          draft: drafts[m.key],
          published: drafts[m.key],
          published_at: now,
          published_by: by,
          draft_updated_at: now,
          draft_updated_by: by,
        };
        if (rec) {
          await base44.entities.WebsiteSection.update(rec.id, payload);
        } else {
          const created = await base44.entities.WebsiteSection.create({
            section_key: m.key,
            ...payload,
          });
          records[m.key] = created;
        }
      }
      await load();
      toast({
        title: n
          ? `Published ${n} section${n > 1 ? "s" : ""} — the public site now shows them.`
          : "Nothing to publish — drafts already match the public version.",
      });
    } catch (e) {
      toast({ title: "Publish failed.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  if (!drafts || !records) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const active = SECTION_META.find((m) => m.key === activeKey);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageBackButton />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Edit Website</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Text for the public homepage, in English and Greek. Visitors keep seeing the last
              published version while you edit a draft.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="w-4 h-4" /> Preview
            </Button>
            <Button onClick={publishAll} disabled={busy || publishCount === 0}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Publish{publishCount ? ` (${publishCount})` : ""}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {SECTION_META.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setActiveKey(m.key)}
              className={`relative shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeKey === m.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
              {isUnpublished(m.key) && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500"
                  title="Unpublished changes"
                />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{active.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isUnpublished(activeKey) ? "Unpublished changes" : "Matches the public version"}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveDraft(activeKey)}
                disabled={busy || !isDirty(activeKey)}
              >
                <Save className="w-3.5 h-3.5" /> Save draft
              </Button>
            </div>
          </div>
          <SectionEditor
            sectionKey={activeKey}
            content={drafts[activeKey]}
            onChange={(next) => setDrafts((d) => ({ ...d, [activeKey]: next }))}
          />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Service prices, time allowances and package details are not edited here — they come live
          from your Service Package records via the secure pricing feed.
        </p>
      </div>
      <PreviewOverlay open={previewOpen} onClose={() => setPreviewOpen(false)} drafts={drafts} />
    </div>
  );
}