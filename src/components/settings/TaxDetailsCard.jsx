import React, { useState } from "react";
import { Loader2, Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Greek Tax Number (AFM) — the SAME BusinessSettings field (vat_number) the
// invoice PDFs print ("AFM / VAT No"). No second tax-number source.
// Explicit Save only (no autosave): nothing is stored until the admin presses
// Save, and the saved value is trimmed of accidental leading/trailing spaces.
export default function TaxDetailsCard({ settings, applyFields }) {
  const { lang } = useLanguage();
  const el = lang === "el";
  const [value, setValue] = useState(String(settings.vat_number || ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const savedRaw = String(settings.vat_number || "");
  const hasSpaces = savedRaw !== savedRaw.trim();

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const trimmed = value.trim();
      await base44.entities.BusinessSettings.update(settings.id, { vat_number: trimmed });
      applyFields({ vat_number: trimmed });
      setValue(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(el ? "Η αποθήκευση απέτυχε. Δοκιμάστε ξανά." : "Save failed. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-4">
      <h3 className="font-medium text-sm mb-1">
        {el ? "ΑΦΜ (Αριθμός Φορολογικού Μητρώου)" : "Greek Tax Number (AFM / ΑΦΜ)"}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {el
          ? "Εμφανίζεται στα τιμολόγια πελατών και στα PDF. Η αλλαγή ισχύει για τιμολόγια που εκδίδονται μετά την αποθήκευση."
          : "Shown on customer invoices and PDFs. A change applies to invoices issued after saving."}
      </p>
      {hasSpaces && (
        <p className="mb-3 flex items-start gap-1.5 text-xs text-amber-600">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {el
            ? "Η αποθηκευμένη τιμή περιέχει επιπλέον κενά στην αρχή/το τέλος — η αποθήκευση θα τα αφαιρέσει."
            : "The saved value contains extra spaces at the start/end — saving will remove them."}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); setError(""); }}
          placeholder="123456789"
          inputMode="numeric"
          className="font-mono sm:max-w-xs"
          aria-label={el ? "ΑΦΜ" : "Greek Tax Number (AFM / ΑΦΜ)"}
        />
        <Button onClick={save} disabled={saving || value.trim() === savedRaw.trim()} className="shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
          {saving ? (el ? "Αποθήκευση…" : "Saving…") : saved ? (el ? "Αποθηκεύτηκε" : "Saved") : (el ? "Αποθήκευση" : "Save")}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}