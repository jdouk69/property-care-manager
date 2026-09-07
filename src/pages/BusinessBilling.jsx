import React, { useState, useEffect, useRef } from "react";
import { Briefcase, Loader2, Check, ImagePlus, Settings as SettingsIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image as UIImage } from "@/components/ui/image";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import PageBackButton from "@/components/ui/PageBackButton";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Admin-only business configuration. Reads and writes the SAME single
// BusinessSettings record used by the invoice generator — no second copy.
export default function BusinessBilling() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.BusinessSettings.list("-created_date", 10);
        if (list && list.length) setSettings(list[0]);
        else {
          const created = await base44.entities.BusinessSettings.create({ business_name: "Property Care Manager", default_checklist: [], language: "English" });
          setSettings(created);
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const setField = (k, v) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setSaved(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await base44.entities.BusinessSettings.update(settings.id, { [k]: v });
        setSaving(false); setSaved(true);
      } catch (e) { setSaving(false); }
    }, 900);
  };

  const uploadLogo = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setField("logo", file_url);
    } finally { setUploading(false); }
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!settings) return <AppLayout><div className="p-6">{t("Failed to load settings.")}</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
        <PageBackButton className="mb-3" />
        <PageHeader title={t("Business & Billing")} subtitle={t("Business, tax and payment settings")} icon={Briefcase} />

        {/* Business profile */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm">{t("Business Profile")}</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {saving && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("Saving…")}</>}
              {saved && !saving && <><Check className="w-3.5 h-3.5 text-emerald-500" /> {t("Saved")}</>}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl border border-border bg-muted flex items-center justify-center overflow-hidden">
              {settings.logo ? <UIImage src={settings.logo} className="w-full h-full" fittingType="fill" /> : <SettingsIcon className="w-6 h-6 text-muted-foreground" />}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer">
              <ImagePlus className="w-4 h-4" /> {uploading ? t("Uploading…") : t("Upload logo")}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1.5 block">{t("Business Name")}</Label><Input value={settings.business_name || ""} onChange={(e) => setField("business_name", e.target.value)} /></div>
            <div><Label className="text-xs mb-1.5 block">{t("Legal Business Name")}</Label><Input value={settings.legal_business_name || ""} onChange={(e) => setField("legal_business_name", e.target.value)} placeholder={t("Only if different from the business name")} /></div>
            <div><Label className="text-xs mb-1.5 block">{t("Website (optional)")}</Label><Input value={settings.website || ""} onChange={(e) => setField("website", e.target.value)} placeholder="https://" /></div>
            <div><Label className="text-xs mb-1.5 block">{t("Owner Name (that's you)")}</Label><Input value={settings.owner_name || ""} onChange={(e) => setField("owner_name", e.target.value)} placeholder="Jim" /></div>
            <div><Label className="text-xs mb-1.5 block">{t("Phone")}</Label><Input value={settings.phone || ""} onChange={(e) => setField("phone", e.target.value)} /></div>
            <div><Label className="text-xs mb-1.5 block">WhatsApp</Label><Input value={settings.whatsapp || ""} onChange={(e) => setField("whatsapp", e.target.value)} /></div>
            <div><Label className="text-xs mb-1.5 block">{t("Email")}</Label><Input value={settings.email || ""} onChange={(e) => setField("email", e.target.value)} /></div>
            <div><Label className="text-xs mb-1.5 block">{t("Default Currency")}</Label><Input value={settings.currency || "EUR"} onChange={(e) => setField("currency", e.target.value)} /></div>
            <div><Label className="text-xs mb-1.5 block">{t("VAT Rate (%)")}</Label><Input type="number" value={settings.vat_rate ?? 24} onChange={(e) => setField("vat_rate", parseFloat(e.target.value) || 0)} /></div>
            <div className="sm:col-span-2"><Label className="text-xs mb-1.5 block">{t("Address")}</Label><Textarea rows={2} value={settings.address || ""} onChange={(e) => setField("address", e.target.value)} /></div>
          </div>
        </div>

        {/* Tax details */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-4">
          <h3 className="font-medium text-sm mb-1">{t("Tax Details")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("Greek tax information shown on customer invoices. Nothing is printed for empty fields.")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1.5 block">{t("AFM / VAT Number")}</Label><Input value={settings.vat_number || ""} onChange={(e) => setField("vat_number", e.target.value)} placeholder="e.g. 123456789" /></div>
            <div><Label className="text-xs mb-1.5 block">{t("Tax Office (DOY)")}</Label><Input value={settings.tax_office || ""} onChange={(e) => setField("tax_office", e.target.value)} placeholder={t("Optional")} /></div>
            <div className="sm:col-span-2"><Label className="text-xs mb-1.5 block">{t("Business Activity")}</Label><Input value={settings.business_activity || ""} onChange={(e) => setField("business_activity", e.target.value)} placeholder={t("Optional — e.g. Property management services")} /></div>
          </div>
        </div>

        {/* Payment details */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-medium text-sm mb-1">{t("Payment Details")}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t("Shown in the Payment Information section of customer invoices. If left empty, the section is omitted from invoices entirely.")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs mb-1.5 block">{t("Bank Name")}</Label><Input value={settings.bank_name || ""} onChange={(e) => setField("bank_name", e.target.value)} /></div>
            <div><Label className="text-xs mb-1.5 block">{t("Beneficiary / Account Holder")}</Label><Input value={settings.bank_beneficiary || ""} onChange={(e) => setField("bank_beneficiary", e.target.value)} /></div>
            <div><Label className="text-xs mb-1.5 block">{t("IBAN")}</Label><Input value={settings.bank_iban || ""} onChange={(e) => setField("bank_iban", e.target.value)} placeholder="GR.." /></div>
            <div><Label className="text-xs mb-1.5 block">{t("BIC / SWIFT (optional)")}</Label><Input value={settings.bank_bic || ""} onChange={(e) => setField("bank_bic", e.target.value)} /></div>
            <div className="sm:col-span-2">
              <Label className="text-xs mb-1.5 block">{t("Payment Instructions (optional)")}</Label>
              <Textarea rows={2} value={settings.payment_instructions || ""} onChange={(e) => setField("payment_instructions", e.target.value)} placeholder={t("e.g. Please include the invoice number with your payment.")} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}