import React from "react";
import { Eye, ChevronDown, ChevronRight, Send, Loader2, Save, FlaskConical, CheckCircle2, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import AgreementPreview from "@/components/agreements/AgreementPreview";
import TestAgreementControl from "@/components/agreements/TestAgreementControl";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Screen 3 of 3 — Review & Sign.
// Concise summary (customer, property, package, agreed price, billing type,
// visit frequency, start date, VAT), the full customer agreement preview, a
// Save Draft action that stays in the flow, and the send action that first
// saves the latest reviewed edits server-side so the customer receives
// exactly what staff reviewed. Testing options are collapsed by default with
// a visible indicator when TEST mode is on.
export default function AgreementStepReviewSign({
  values, client, selectedProperty, selectedPackage, business,
  previewSnapshot, selectedTemplate, emergencyConfirmedEffective,
  showPreview, setShowPreview,
  saving, saveError, draftSaved, onSaveDraft,
  sending, sendError, handleSend, sendDisabledReason,
  testingOpen, setTestingOpen, handleToggleTestMode,
}) {
  const { t, tEnum } = useLanguage();
  const isDraft = (values.signing_status || "Draft") === "Draft";

  const vatWording =
    (previewSnapshot && previewSnapshot.fees && previewSnapshot.fees.vat_wording) ||
    (business?.vat_rate != null ? t("Applicable VAT will be added to the stated price at the current rate ({rate}%).", { rate: business.vat_rate }) : "—");

  const summary = [
    [t("Customer"), client?.name || "—"],
    [t("Property"), selectedProperty ? `${selectedProperty.name}${selectedProperty.address ? ` — ${selectedProperty.address}` : ""}` : "—"],
    [t("Package"), selectedPackage?.name || "—"],
    [t("Agreed price"), `€${(Number(values.agreed_price) || 0).toFixed(2)} + VAT`],
    [t("Billing type"), tEnum(values.billing_type)],
    [t("Visit frequency"), values.inspection_frequency || "—"],
    [t("Start date"), values.start_date || "—"],
    [t("VAT"), vatWording],
  ];

  return (
    <div className="space-y-4">
      {/* Concise summary */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileSignature className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Review summary")}</p>
        </div>
        <div className="space-y-2">
          {summary.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-muted-foreground shrink-0">{label}</span>
              <span className="text-right font-medium min-w-0 break-words">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full customer agreement preview (frozen snapshot for sent/signed) */}
      <button
        type="button"
        onClick={() => setShowPreview((o) => !o)}
        className="w-full flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-left hover:bg-primary/10 transition min-h-[44px]"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Eye className="w-4 h-4 text-primary" />
          {t("Preview Customer Agreement")}
        </span>
        {showPreview ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-primary" />}
      </button>

      {showPreview && (
        <div className="-mt-1">
          {!selectedPackage || !selectedProperty ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              {t("Select a property and service package to preview the agreement.")}
            </div>
          ) : !selectedTemplate ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              {t("No terms template available to preview.")}
            </div>
          ) : (
            <AgreementPreview
              snapshot={previewSnapshot}
              template={selectedTemplate}
              property={selectedProperty}
              emergencyConfirmed={emergencyConfirmedEffective}
              frozen={!(values.signing_status === "Draft" || !values.signing_status)}
            />
          )}
        </div>
      )}

      {/* Testing options — collapsed by default; visible TEST indicator when on. */}
      {isDraft && (
        <div>
          <button
            type="button"
            onClick={() => setTestingOpen((o) => !o)}
            className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition min-h-[44px] ${
              values.is_test_agreement
                ? "border-amber-400/70 bg-amber-50/60 dark:bg-amber-950/20"
                : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium min-w-0">
              <FlaskConical className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">{t("Testing options")}</span>
              {values.is_test_agreement && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300 font-bold shrink-0">TEST</span>
              )}
            </span>
            {testingOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          </button>
          {testingOpen && (
            <div className="mt-2">
              <TestAgreementControl
                value={!!values.is_test_agreement}
                onToggle={handleToggleTestMode}
              />
            </div>
          )}
        </div>
      )}

      {/* Send for signature — saves the reviewed edits FIRST, then freezes. */}
      {isDraft && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">{t("Create Signing Link")}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Your latest edits are saved first, then this agreement version is frozen and a secure customer signing link is created. No email is sent automatically — deliver the link yourself (Copy Link / Copy Message). After this, customer-facing terms cannot be changed without a replacement version.")}
          </p>
          {selectedTemplate && (
            <p className="text-xs text-muted-foreground">
              {t("Terms template: {name} · Version {version} · {state}", {
                name: selectedTemplate.name,
                version: selectedTemplate.version,
                state: selectedTemplate.active !== true
                  ? t("Draft / inactive")
                  : selectedTemplate.legal_approved !== true
                    ? t("Active — legal approval pending")
                    : t("Active + legally approved"),
              })}
            </p>
          )}
          {values.is_test_agreement && (
            <p className="text-xs text-amber-600 font-medium">{t("TEST mode active — legal-approval gate bypassed for this test draft only. Customer-facing surfaces and PDF are watermarked.")}</p>
          )}
          {sendDisabledReason && (
            <p className="text-xs text-amber-600">{sendDisabledReason}</p>
          )}
          {sendError && (
            <p className="text-xs text-destructive">{sendError}</p>
          )}
          <Button onClick={handleSend} disabled={sending || !!sendDisabledReason} className="gap-1.5 w-full sm:w-auto">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("Create Signing Link")}
          </Button>
        </div>
      )}

      {/* Save draft — stays in the review/signing flow. */}
      {isDraft && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button onClick={onSaveDraft} disabled={saving} variant="outline" className="gap-1.5 w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("Save Draft")}
            </Button>
            {draftSaved && !saveError && (
              <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t("Draft saved")}
              </span>
            )}
          </div>
          {saveError && <p className="text-xs text-destructive">{saveError}</p>}
          <p className="text-xs text-muted-foreground">{t("Saving keeps you in the review & signing flow — nothing is sent.")}</p>
        </div>
      )}
    </div>
  );
}