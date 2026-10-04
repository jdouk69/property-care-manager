import React, { useState, useEffect } from "react";
import { Loader2, Check, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { resolveQrSrc } from "@/lib/paymentQr";

// Payment Details — the bank-issued IRIS QR (main option) and IBAN transfer
// (alternative) shown on customer payment documents. Explicit Save (no
// silent autosave on this administrative form). The QR image is stored
// PRIVATELY — no public URL; documents fetch it via short-lived signed URLs.
// Changes apply to documents issued after saving; issued documents keep the
// payment details they were issued with.
const FIELDS = [
  "bank_name",
  "bank_beneficiary",
  "bank_iban",
  "bank_bic",
  "iris_qr_image",
  "show_iris_qr",
  "show_iban_details",
];

export default function PaymentDetailsCard({ settings, applyFields }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(() => {
    const d = {};
    FIELDS.forEach((f) => {
      if (f === "show_iban_details") d[f] = settings[f] !== false;
      else if (f === "show_iris_qr") d[f] = !!settings[f];
      else d[f] = settings[f] || "";
    });
    return d;
  });
  const [qrPreview, setQrPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Preview via a short-lived signed URL (the stored URI is private).
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!draft.iris_qr_image) { setQrPreview(""); return; }
      try {
        const src = await resolveQrSrc(draft.iris_qr_image);
        if (alive) setQrPreview(src);
      } catch (e) { /* preview unavailable — saved value untouched */ }
    })();
    return () => { alive = false; };
  }, [draft.iris_qr_image]);

  const set = (k, v) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setSaved(false);
    setError(null);
  };

  const uploadQr = async (file, e) => {
    if (e) e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      set("iris_qr_image", file_uri);
    } catch (err) {
      setError(t("Upload failed — please try again."));
    }
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    // Trim text fields on save — pasted values often carry stray spaces that
    // would otherwise appear on customer documents.
    const clean = {
      ...draft,
      bank_name: (draft.bank_name || "").trim(),
      bank_beneficiary: (draft.bank_beneficiary || "").trim(),
      bank_iban: (draft.bank_iban || "").trim(),
      bank_bic: (draft.bank_bic || "").trim(),
    };
    try {
      await base44.entities.BusinessSettings.update(settings.id, clean);
      setDraft(clean);
      applyFields(clean);
      setSaving(false);
      setSaved(true);
      setError(null);
    } catch (err) {
      setSaving(false);
      setError(t("Save failed — your changes were NOT saved. Please try again."));
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="font-medium text-sm">{t("Payment Details")}</h3>
        {saving && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("Saving…")}</span>}
        {saved && !saving && !error && <span className="flex items-center gap-1.5 text-xs text-emerald-600"><Check className="w-3.5 h-3.5" /> {t("Saved")}</span>}
      </div>
      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground mb-4">
        {t("Bank payment details shown on customer payment documents. Applies to documents issued after you save — issued documents keep the details they were issued with.")}
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="iris-qr">{t("IRIS QR Code (from your bank)")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("Upload the official IRIS QR image supplied by your bank — never a self-generated QR code.")}
          </p>
          <div className="flex items-center gap-3">
            {qrPreview ? (
              <div className="w-28 h-28 shrink-0 overflow-hidden rounded-xl border border-border bg-white p-1">
                <img src={qrPreview} alt="IRIS QR" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="flex w-28 h-28 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted text-muted-foreground">
                <QrCode className="w-8 h-8" />
              </div>
            )}
            <div className="flex flex-col items-start gap-1.5">
              <input
                id="iris-qr-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => uploadQr(e.target.files && e.target.files[0], e)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById("iris-qr-input").click()}
              >
                {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("Uploading…")}</> : (draft.iris_qr_image ? t("Replace image") : t("Upload QR image"))}
              </Button>
              {draft.iris_qr_image && (
                <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => set("iris_qr_image", "")}>
                  {t("Remove image")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pay-beneficiary">{t("Beneficiary / Account Holder")}</Label>
            <Input id="pay-beneficiary" value={draft.bank_beneficiary} onChange={(e) => set("bank_beneficiary", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-bank">{t("Bank Name")}</Label>
            <Input id="pay-bank" value={draft.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-iban">IBAN</Label>
            <Input id="pay-iban" value={draft.bank_iban} onChange={(e) => set("bank_iban", e.target.value)} placeholder="GR.." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-bic">{t("BIC / SWIFT (optional)")}</Label>
            <Input id="pay-bic" value={draft.bank_bic} onChange={(e) => set("bank_bic", e.target.value)} />
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
            <div>
              <p className="text-sm">{t("Show IRIS QR on unpaid documents")}</p>
              <p className="text-xs text-muted-foreground">{t("The main payment option — with the amount due and payment reference.")}</p>
            </div>
            <Switch checked={!!draft.show_iris_qr} onCheckedChange={(v) => set("show_iris_qr", v)} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
            <div>
              <p className="text-sm">{t("Show IBAN transfer details")}</p>
              <p className="text-xs text-muted-foreground">{t("Alternative for customers who cannot use IRIS.")}</p>
            </div>
            <Switch checked={draft.show_iban_details !== false} onCheckedChange={(v) => set("show_iban_details", v)} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("Saving…")}</> : t("Save")}
        </Button>
      </div>
    </div>
  );
}