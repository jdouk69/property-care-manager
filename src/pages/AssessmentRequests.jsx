import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Mail, Phone, MapPin, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import PageBackButton from "@/components/ui/PageBackButton";

// Admin-only inbox for website "Request a Property Assessment" submissions.
// The AssessmentRequest entity's row-level security allows ONLY admins to
// read or change these records.
export default function AssessmentRequests() {
  const { lang } = useLanguage();
  const el = lang === "el";
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await base44.entities.AssessmentRequest.list("-created_date", 100);
      setItems(res || []);
    } catch (e) {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id, status) => {
    setBusy(id);
    try {
      await base44.entities.AssessmentRequest.update(id, { status });
      setItems((list) => (list || []).map((r) => (r.id === id ? { ...r, status } : r)));
      toast({ title: el ? "Ενημερώθηκε" : "Updated" });
    } catch (e) {
      toast({ title: el ? "Απέτυχε η ενημέρωση" : "Update failed", variant: "destructive" });
    }
    setBusy(null);
  };

  const tone = (s) =>
    s === "New"
      ? "bg-primary/10 text-primary border-primary/20"
      : s === "Contacted"
      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
      : "bg-muted text-muted-foreground border-border";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageBackButton />
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {el ? "Αιτήσεις Αξιολόγησης (Ιστότοπος)" : "Assessment Requests (Website)"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {el
            ? "Υποβολές από τη φόρμα «Ζητήστε Αξιολόγηση Ακινήτου» του δημόσιου ιστότοπου. Ορατές μόνο στους διαχειριστές."
            : "Submissions from the public website's Request a Property Assessment form. Visible to administrators only."}
        </p>

        {!items && (
          <div className="mt-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {items && items.length === 0 && (
          <p className="mt-10 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {el ? "Δεν έχουν υποβληθεί αιτήσεις ακόμη." : "No assessment requests yet."}
          </p>
        )}

        <div className="mt-6 space-y-4">
          {(items || []).map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_date).toLocaleString()} · {r.language || "English"}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone(r.status)}`}>
                  {r.status}
                </span>
              </div>
              <div className="mt-3 grid gap-1.5 text-sm text-foreground/90">
                <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary shrink-0" /> {r.email}</p>
                {r.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary shrink-0" /> {r.phone}</p>}
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary shrink-0" /> {r.property_location}{r.property_type ? ` · ${r.property_type}` : ""}</p>
                {r.notes && (
                  <p className="flex items-start gap-2">
                    <StickyNote className="w-4 h-4 text-primary shrink-0 mt-1" />
                    <span className="whitespace-pre-wrap">{r.notes}</span>
                  </p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["New", "Contacted", "Archived"].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={r.status === s ? "default" : "outline"}
                    disabled={busy === r.id}
                    onClick={() => setStatus(r.id, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}