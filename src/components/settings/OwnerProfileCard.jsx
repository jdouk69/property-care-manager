import React, { useState } from "react";
import { Loader2, Check, User, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Owner Profile — the name, photo, introduction and contact details shown in
// the public landing page's 'Meet your local contact' section. Explicit Save
// (no silent autosave on this administrative form).
const FIELDS = [
  "owner_profile_name",
  "owner_profile_photo",
  "owner_profile_intro_en",
  "owner_profile_intro_el",
  "owner_profile_phone",
  "owner_profile_email",
  "owner_profile_whatsapp",
  "owner_profile_viber",
  "owner_profile_local_photo",
];

function PhotoField({ id, label, value, onChange, uploading, onPick, Icon, t }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="w-20 h-20 shrink-0 overflow-hidden rounded-xl border border-border">
            <Image src={value} alt={label} className="w-full h-full" fittingType="fill" />
          </div>
        ) : (
          <div className="flex w-20 h-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted text-muted-foreground">
            <Icon className="w-7 h-7" />
          </div>
        )}
        <div className="flex flex-col items-start gap-1.5">
          <input
            id={id}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files && e.target.files[0], e)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!uploading}
            onClick={() => document.getElementById(id).click()}
          >
            {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("Uploading…")}</> : t("Upload photo")}
          </Button>
          {value && (
            <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => onChange("")}>
              {t("Remove photo")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OwnerProfileCard({ settings, applyFields }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(() => {
    const d = {};
    FIELDS.forEach((f) => { d[f] = settings[f] || ""; });
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState(null);

  const set = (k, v) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setSaved(false);
    setError(null);
  };

  const uploadPhoto = async (file, key, e) => {
    if (e) e.target.value = "";
    if (!file) return;
    setUploading(key);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      set(key, file_url);
    } catch (err) {
      setError(t("Photo upload failed — please try again."));
    }
    setUploading(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.BusinessSettings.update(settings.id, draft);
      applyFields(draft);
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
        <h3 className="font-medium text-sm">{t("Owner Profile")}</h3>
        {saving && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("Saving…")}</span>}
        {saved && !saving && !error && <span className="flex items-center gap-1.5 text-xs text-emerald-600"><Check className="w-3.5 h-3.5" /> {t("Saved")}</span>}
      </div>
      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground mb-4">
        {t("Shown in the 'Meet your local contact' section of the public landing page. Empty fields keep the placeholder look.")}
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="owner-name">{t("Name")}</Label>
          <Input id="owner-name" value={draft.owner_profile_name} onChange={(e) => set("owner_profile_name", e.target.value)} placeholder={t("Your full name")} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PhotoField
            id="owner-photo-input"
            label={t("Profile Photo")}
            value={draft.owner_profile_photo}
            onChange={(v) => set("owner_profile_photo", v)}
            uploading={uploading === "owner_profile_photo"}
            onPick={(f, e) => uploadPhoto(f, "owner_profile_photo", e)}
            Icon={User}
            t={t}
          />
          <PhotoField
            id="owner-local-photo-input"
            label={t("Local / Property Photo")}
            value={draft.owner_profile_local_photo}
            onChange={(v) => set("owner_profile_local_photo", v)}
            uploading={uploading === "owner_profile_local_photo"}
            onPick={(f, e) => uploadPhoto(f, "owner_profile_local_photo", e)}
            Icon={ImageIcon}
            t={t}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner-intro-en">{t("Introduction (English)")}</Label>
          <Textarea id="owner-intro-en" rows={3} value={draft.owner_profile_intro_en} onChange={(e) => set("owner_profile_intro_en", e.target.value)} placeholder={t("A short personal introduction — who you are and why you care for properties.")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner-intro-el">{t("Introduction (Greek)")}</Label>
          <Textarea id="owner-intro-el" rows={3} value={draft.owner_profile_intro_el} onChange={(e) => set("owner_profile_intro_el", e.target.value)} placeholder="Σύντομη προσωπική παρουσίαση — ποιος είστε και γιατί φροντίζετε ακίνητα." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="owner-phone">{t("Phone")}</Label>
            <Input id="owner-phone" value={draft.owner_profile_phone} onChange={(e) => set("owner_profile_phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-email">{t("Email")}</Label>
            <Input id="owner-email" type="email" value={draft.owner_profile_email} onChange={(e) => set("owner_profile_email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-whatsapp">WhatsApp</Label>
            <Input id="owner-whatsapp" value={draft.owner_profile_whatsapp} onChange={(e) => set("owner_profile_whatsapp", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-viber">Viber</Label>
            <Input id="owner-viber" value={draft.owner_profile_viber} onChange={(e) => set("owner_profile_viber", e.target.value)} />
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