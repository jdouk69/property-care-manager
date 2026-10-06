import React from "react";
import { Package, AlertTriangle, SlidersHorizontal, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import AgreementCollapse from "@/components/agreements/wizard/AgreementCollapse";
import EmergencyAuthSection from "@/components/agreements/EmergencyAuthSection";
import IntakeReferenceCard from "@/components/agreements/IntakeReferenceCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const BILLING_TYPES = ["One-time", "Monthly", "Quarterly", "Annual"];
// Pending is the default for NEW agreements. Legacy agreements keep their stored status.
const STATUSES = ["Pending", "Active", "Paused", "Ended", "Cancelled"];
const FREQUENCY_OPTS = ["Weekly", "Twice Weekly", "Monthly", "As Needed"];

// Screen 2 of 3 — Service & Price.
// Core commercial terms up top (package, price, billing, frequency, dates,
// emergency authorization). Package reference details, the customer-intake
// reference, advanced agreement status and additional details are collapsed
// by default but all remain accessible. Selecting a package prefills its
// standard price, billing type and visit frequency for NEW agreements; an
// EXISTING agreement keeps its locked price (handled in onPackageChange).
// A frequency that differs from the package frequency shows a clear warning;
// the staff decision (package frequency OR documented customer-specific
// service changes) is enforced before creating a signing link.
export default function AgreementStepServicePrice({
  values, set, setEmergency,
  packages, selectedPackage, onPackageChange,
  onBillingTypeChange, onStartDateChange,
  isFrozen, isEdit, freqMismatch,
  latestIntake, intakePrefill,
  emergencyFieldsComplete, emergencyConfirmedEffective,
  pkgRefOpen, intakeRefOpen, advancedOpen, additionalOpen, hasExtra,
  togglePkgRef, toggleIntakeRef, toggleAdvanced, toggleAdditional,
  openPriceChange,
}) {
  const { t, tEnum } = useLanguage();

  return (
    <div className="space-y-4">
      {/* Service Package */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Service Package")}</Label>
        <Select value={values.service_package_id} onValueChange={onPackageChange} disabled={isFrozen}>
          <SelectTrigger><SelectValue placeholder={t("Select a package")} /></SelectTrigger>
          <SelectContent>
            {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Frequency mismatch warning — informational here; blocking at send. */}
      {freqMismatch && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            {t("The visit frequency differs from the selected package's frequency ({pkg}). Before creating the signing link, either set the package frequency or record the agreed customer-specific service changes. The agreed changes take precedence over the package defaults in the customer agreement. The price is not changed automatically.", { pkg: selectedPackage?.inspection_frequency || "" })}
          </p>
        </div>
      )}

      {/* Agreement terms (customer-specific) */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Agreement terms (customer-specific)")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Agreed Price (€)")}</Label>
            {isEdit ? (
              <>
                <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm flex items-center justify-between gap-2 min-h-[44px]">
                  <span className="font-medium truncate">€{(Number(values.agreed_price) || 0).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">+ VAT</span></span>
                  {!isFrozen && (
                    <button type="button" onClick={openPriceChange} className="text-xs text-primary font-medium shrink-0 hover:underline">
                      {t("Change Price")}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("Locked at approval — changing the package never changes this price.")}</p>
              </>
            ) : (
              <>
                <Input type="number" step="0.01" value={values.agreed_price ?? ""} onChange={(e) => set("agreed_price", e.target.value)} disabled={isFrozen} />
                <p className="text-xs text-muted-foreground mt-1">{t("Base price before VAT. Prefilled from the selected package.")}</p>
              </>
            )}
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Billing Type")}</Label>
            <Select value={values.billing_type} onValueChange={onBillingTypeChange} disabled={isFrozen}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BILLING_TYPES.map((o) => <SelectItem key={o} value={o}>{tEnum(o)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Visit Frequency")}</Label>
          <Input value={values.inspection_frequency || ""} onChange={(e) => set("inspection_frequency", e.target.value)} placeholder={t("e.g. Weekly")} list="freq-opts" disabled={isFrozen} />
          <datalist id="freq-opts">{FREQUENCY_OPTS.map((o) => <option key={o} value={o} />)}</datalist>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Start Date")}</Label>
            <Input type="date" className="min-w-0 w-full" value={values.start_date || ""} onChange={(e) => onStartDateChange(e.target.value)} disabled={isFrozen} />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Renewal Date")}</Label>
            <Input type="date" className="min-w-0 w-full" value={values.renewal_date || ""} onChange={(e) => set("renewal_date", e.target.value)} disabled={isFrozen} />
          </div>
        </div>
      </div>

      {/* Emergency authorization — unchanged staff-confirmation requirement. */}
      <EmergencyAuthSection
        values={values}
        set={setEmergency}
        frozen={isFrozen}
        confirmed={!!values.emergency_authorization_confirmed}
        canConfirm={emergencyFieldsComplete}
        prefilled={intakePrefill}
        setConfirmed={(v) => set("emergency_authorization_confirmed", v)}
      />

      {/* Collapsed-by-default sections — all fields remain accessible. */}
      <AgreementCollapse
        open={pkgRefOpen} onToggle={togglePkgRef}
        label="Package reference details" icon={Package}
        indicator={selectedPackage ? selectedPackage.name : null}
      >
        {selectedPackage ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">{selectedPackage.name}</p>
            {selectedPackage.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{selectedPackage.description}</p>}
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>{t("Standard price:")} <span className="text-foreground">€{(selectedPackage.standard_price || 0).toFixed(2)} + VAT</span></div>
              <div>{t("Billing:")} <span className="text-foreground">{tEnum(selectedPackage.billing_type)}</span></div>
              <div>{t("Visit duration:")} <span className="text-foreground">{selectedPackage.visit_duration || "—"}</span></div>
              <div>{t("Frequency:")} <span className="text-foreground">{selectedPackage.inspection_frequency ? t(selectedPackage.inspection_frequency) : "—"}</span></div>
              <div className="sm:col-span-2">{t("VAT:")} <span className="text-foreground">{tEnum(selectedPackage.vat_setting)}</span></div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("Select a package to see its reference details.")}
          </div>
        )}
      </AgreementCollapse>

      <AgreementCollapse
        open={intakeRefOpen} onToggle={toggleIntakeRef}
        label="Customer intake reference" icon={Info}
      >
        <IntakeReferenceCard intake={latestIntake} />
        {!latestIntake && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            {t("No customer intake on file. Intake stays available in the Client Hub.")}
          </div>
        )}
      </AgreementCollapse>

      <AgreementCollapse
        open={advancedOpen} onToggle={toggleAdvanced}
        label="Advanced — agreement status" icon={SlidersHorizontal}
        indicator={isFrozen ? values.signing_status : null}
      >
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <Label className="text-xs font-medium text-muted-foreground block">{t("Status")}</Label>
          <Select value={values.status} onValueChange={(v) => set("status", v)} disabled={isFrozen}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.filter((o) => o !== "Active" || values.status === "Active").map((o) => <SelectItem key={o} value={o}>{tEnum(o, "agreement")}</SelectItem>)}</SelectContent>
          </Select>
          {values.status === "Pending" && (
            <p className="text-xs text-muted-foreground">{t("Pending agreements are drafts awaiting activation. They do not count as active service.")}</p>
          )}
        </div>
      </AgreementCollapse>

      <AgreementCollapse
        open={additionalOpen} onToggle={toggleAdditional}
        label="Additional Details (optional)" icon={Package}
        indicator={hasExtra && !additionalOpen ? t("has data") : null}
      >
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Custom Services / Changes")}</Label>
            <Textarea value={values.included_services_override || ""} onChange={(e) => set("included_services_override", e.target.value)} rows={2} placeholder={t("Override or add to the package's included services")} disabled={isFrozen} />
            <p className="text-xs text-muted-foreground mt-1">{t("Only use this if this customer's services differ from the selected package. Any changes recorded here are agreed with the customer and take precedence over the package defaults in the customer agreement.")}</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Additional Terms")}</Label>
            <Textarea value={values.additional_terms || ""} onChange={(e) => set("additional_terms", e.target.value)} rows={2} disabled={isFrozen} />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Notes")}</Label>
            <Textarea value={values.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Next Invoice Date")}</Label>
            <Input type="date" className="min-w-0 w-full" value={values.next_invoice_date || ""} onChange={(e) => set("next_invoice_date", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">{t("Auto-calculated from Start Date for recurring billing. You can adjust it manually.")}</p>
          </div>
        </div>
      </AgreementCollapse>
    </div>
  );
}