import React from "react";
import { hasEligibleTerms, termsTemplateIssue } from "@/lib/termsReadiness";
import { Eye, ChevronDown, ChevronRight, Send, Loader2, Save, FlaskConical, CheckCircle2, FileSignature, RefreshCw, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  sending, sendError, handleSend, handleOpenSignOnTablet, sendDisabledReason,
  testingOpen, setTestingOpen, handleToggleTestMode,
  isFrozen, busy, snapshotReloading, onReloadSnapshot,
  templateProblem, templateChoices, onChooseTemplate,
  onDownloadSigned, downloadingSigned, signedDownloadError,
}) {
  const { t, tEnum } = useLanguage();
  const isDraft = (values.signing_status || "Draft") === "Draft";
  const termsIssue = termsTemplateIssue(selectedTemplate, values.terms_template_id, values.is_test_agreement);
  const eligibleTermsAvailable = hasEligibleTerms(templateChoices);
  const attentionReason = termsIssue ? t(termsIssue) : sendDisabledReason;


  const vatWording =
    (previewSnapshot && previewSnapshot.fees && previewSnapshot.fees.vat_wording) ||
    (business?.vat_rate != null ? t("Applicable VAT will be added to the stated price at the current rate ({rate}%).", { rate: business.vat_rate }) : "—");

  const summary = [
    [t("Customer"), client?.name || "—"],
    [t("Property"), selectedProperty ? `${selectedProperty.name}${selectedProperty.address ? ` — ${selectedProperty.address}` : ""}` : "—"],
    [t("Package"), selectedPackage?.name || "—"],
    [t("Agreed price"), `€${(Number(values.agreed_price) || 0).toFixed(2)}`],
    [t("Billing type"), tEnum(values.billing_type)],
    [t("Visit frequency"), values.inspection_frequency || "—"],
    [t("Start date"), values.start_date || "—"],
    [t("VAT"), vatWording],
  ];

  return (
    <div className="space-y-4">
      {values.signing_status === "Signed" && values.signed_pdf_url && values.public_token && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-2">
          <p className="text-sm font-medium">{t("Your signed agreement")}</p>
          <Button type="button" onClick={onDownloadSigned} disabled={downloadingSigned} className="w-full min-h-[48px] h-auto py-3 whitespace-normal gap-2">
            {downloadingSigned ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Download className="w-4 h-4 shrink-0" />}
            {t("View / Download Signed Agreement")}
          </Button>
          {signedDownloadError && <p role="alert" className="text-sm text-destructive">{signedDownloadError}</p>}
        </div>
      )}
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

      {/* Linked-template problem: explicit staff choice required before a
          different template can be linked. Draft-only; sent/signed versions
          are never changed. */}
      {isDraft && (attentionReason || templateProblem) && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t("What needs attention before signing")}</h3>
          <p className="text-sm text-amber-700">{attentionReason || templateProblem}</p>
          {termsIssue && <>
            <p className="text-sm">{t(eligibleTermsAvailable ? "An approved active template is available. Select it below after confirming it contains the terms you intend to use." : "No active, approved terms template is available. Review the terms in Agreement Terms setup before preparing this agreement for customer signing.")}</p>
            <p className="text-xs text-muted-foreground">{t("Save this draft before opening terms setup. Approval should be recorded only after the terms have actually been reviewed and approved for customer use.")}</p>
            <a href="/agreement-terms" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center rounded-md border border-input px-3 text-sm font-medium">{t("Open Agreement Terms setup")}</a>
          </>}
          <Label className="text-xs">{t("Terms template for this draft and preview")}</Label>
          <Select value={values.terms_template_id || undefined} onValueChange={onChooseTemplate}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder={t("Choose a terms template")} />
            </SelectTrigger>
            <SelectContent>
              {templateChoices.map((tp) => (
                <SelectItem key={tp.id} value={tp.id}>
                  {tp.name} · v{tp.version}{tp.active === true && tp.legal_approved === true ? "" : ` · ${t("Draft — preview only")}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("Choosing here links the selected template to this draft when you save. Already sent or signed versions are never changed.")}
          </p>
        </div>
      )}

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
          <button type="button" className="text-sm underline mb-2" onClick={() => setShowPreview(false)}>{t("Close preview and return to signing controls")}</button>
          {isFrozen && !previewSnapshot ? (
            /* Frozen agreement whose stored snapshot could not be loaded:
               clear message + reload action. Never a live rebuild, never a
               resend — link creation and preview loading are separate things. */
            <div className="rounded-2xl border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-2">
              <p className="text-sm font-medium text-amber-700">
                {t("The frozen agreement content could not be loaded. The signing link was still created — nothing was sent again.")}
              </p>
              <Button size="sm" variant="outline" onClick={onReloadSnapshot} disabled={snapshotReloading} className="gap-1.5">
                {snapshotReloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {t("Reload")}
              </Button>
            </div>
          ) : !isFrozen && (!selectedPackage || !selectedProperty) ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              {t("Select a property and service package to preview the agreement.")}
            </div>
          ) : !isFrozen && !selectedTemplate ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              {t("Choose a terms template in the section below to see the draft preview. Selecting a draft template does not approve it for customer use.")}
            </div>
          ) : (
            <AgreementPreview
              snapshot={previewSnapshot}
              template={selectedTemplate}
              property={selectedProperty}
              emergencyConfirmed={emergencyConfirmedEffective}
              frozen={isFrozen}
            />
          )}
          <button type="button" className="text-sm underline mt-2" onClick={() => setShowPreview(false)}>{t("Close preview and return to signing controls")}</button>
        </div>
      )}

      {/* Save draft — stays in the review/signing flow. */}
      {isDraft && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button onClick={onSaveDraft} disabled={busy || saving} variant="outline" className="gap-1.5 w-full sm:w-auto">
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
      {/* Send for signature — saves the reviewed edits FIRST, then freezes. */}
      {isDraft && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">{t("Signing")}</p>
          </div>
          <p className="text-sm">{t("When the agreement is ready, create a signing link to share with the customer, or open it for in-person signing.")}</p>
          <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{t("How signing works")}</summary><div className="mt-2">          <p className="text-xs text-muted-foreground">
            {t("Your latest edits are saved first, then this agreement version is frozen and a secure customer signing link is created. No email is sent automatically — deliver the link yourself (Copy Link / Copy Message). After this, customer-facing terms cannot be changed without a replacement version.")}
          </p>
</div></details>
          {values.is_test_agreement && (
            <p className="text-xs text-amber-600 font-medium">{t("TEST mode active — legal-approval gate bypassed for this test draft only. Customer-facing surfaces and PDF are watermarked.")}</p>
          )}
          {sendDisabledReason && <p className="text-sm text-amber-700">{t("Signing is unavailable until the items in What needs attention are resolved. You can save the draft now.")}</p>}
          {sendError && (
            <p className="text-xs text-destructive">{sendError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSend} disabled={busy || sending || !!sendDisabledReason} className="gap-1.5 w-full sm:w-auto">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("Create Signing Link")}
            </Button>
            <Button onClick={handleOpenSignOnTablet} disabled={busy || sending || !!sendDisabledReason} variant="outline" className="gap-1.5 w-full sm:w-auto">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} {t("Create Link & Open for In-Person Signing")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("For an in-person signing, this opens the secure customer signing page in a new tab on this device. Hand your phone or tablet to the customer. If the browser blocks the tab, use Copy Link after the link is created.")}
          </p>
        </div>
      )}

      {isDraft && <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">{t("Advanced options")}{values.is_test_agreement && <span className="ml-2 text-amber-700">TEST</span>}</summary>
        <div className="mt-3 space-y-3">
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

        </div>
      </details>}
    </div>
  );
}
