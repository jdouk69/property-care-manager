import React, { useMemo } from "react";
import { AlertTriangle, Lock, FileWarning, ShieldAlert } from "lucide-react";

// Renders the customer-facing agreement preview from a built snapshot.
// SECURITY: the snapshot is built by buildSentSnapshot (Phase A), which never
// emits property access secrets. As a defense-in-depth, this component also
// re-checks that none of the property's secret field values leaked into the
// rendered text — if any do, it shows a hard error instead of the document.
const SECRET_FIELDS = [
  "gate_code",
  "lockbox_code",
  "alarm_instructions",
  "key_location",
  "wifi_password",
  "security_camera",
  "security_system",
];

export default function AgreementPreview({ snapshot, template, property, emergencyConfirmed }) {
  const sections = (snapshot && snapshot.sections) || [];

  const leakedSecret = useMemo(() => {
    if (!property) return null;
    const text = JSON.stringify(snapshot || {});
    for (const key of SECRET_FIELDS) {
      const val = property[key];
      if (val && String(val).trim() && text.includes(String(val).trim())) {
        return { key, val };
      }
    }
    return null;
  }, [snapshot, property]);

  const templateIsDraft = !template || template.active !== true;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Draft banner */}
      <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 flex-wrap">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm font-medium text-amber-700">DRAFT PREVIEW — NOT SENT</p>
      </div>

      {templateIsDraft && (
        <div className="px-4 py-2.5 bg-rose-500/5 border-b border-rose-500/15 flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="text-xs font-medium text-rose-700">DRAFT TERMS — LEGAL REVIEW REQUIRED. This template is not yet active and cannot be sent for signature.</p>
        </div>
      )}

      {emergencyConfirmed === false && (
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs font-medium text-amber-700">Internal notice: Emergency authorization requires staff confirmation before this agreement can be sent.</p>
        </div>
      )}

      {leakedSecret ? (
        <div className="px-4 py-6">
          <div className="flex items-start gap-2 text-rose-700">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Preview redaction failed</p>
              <p className="text-sm text-rose-600 mt-1">
                A property access secret ({leakedSecret.key}) was found in the preview output. Do not send this agreement. Report this issue.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Summary header */}
          {snapshot && (
            <div className="border-b border-border pb-4">
              <p className="text-lg font-semibold">
                Service Agreement{snapshot.agreement_version ? ` — Version ${snapshot.agreement_version}` : ""}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {snapshot.business_identity?.name || "—"} · {snapshot.customer?.full_name || "—"} · {snapshot.property?.name || "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Terms version {snapshot.terms_version || "—"} · {snapshot.language || "English"}
              </p>
            </div>
          )}

          {/* 19 sections */}
          {sections.map((s) => (
            <section key={s.id}>
              <h3 className="text-sm font-semibold mb-1.5">{s.heading}</h3>
              {(s.paragraphs || []).map((p, i) => (
                <p key={i} className="text-sm text-foreground/90 leading-relaxed mb-1.5 whitespace-pre-wrap">{p}</p>
              ))}
            </section>
          ))}

          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground">No terms template selected. Select a service package and property to preview the agreement.</p>
          )}
        </div>
      )}
    </div>
  );
}