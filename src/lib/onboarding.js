import { visitTypeLabel } from "@/lib/visitTypeLabels";

// Step 7 — Client onboarding progress derivation. Reads existing records only;
// writes nothing. Stages derive from real statuses (CustomerIntake,
// PropertyServiceAgreement, PropertyVisit, Property monitoring-plan fields).

const ONBOARDING_VISIT_TYPE = "Initial Property Onboarding Inspection";

// Resolve a property's current active agreement + default visit type. Mirrors
// the Step 6C.1 safety rule: requires a single Active, non-archived agreement;
// never falls back to Property.service_package_id.
export function resolvePropertyService(property, agreements, servicePackages) {
  if (!property) return { status: "no_agreement", visitType: "", agreement: null, package: null, isOneTime: false };
  const active = (agreements || []).filter(
    (a) => a.property_id === property.id && a.status === "Active" && !a.archived
  );
  if (active.length === 0) return { status: "no_agreement", visitType: "", agreement: null, package: null, isOneTime: false };
  if (active.length > 1) return { status: "conflict", visitType: "", agreement: null, package: null, isOneTime: false };
  const agreement = active[0];
  const pkg = agreement.service_package_id ? servicePackages?.[agreement.service_package_id] : null;
  const visitType = pkg?.default_visit_type || "";
  const isOneTime = pkg?.recurring === "One-time" || agreement?.billing_type === "One-time";
  if (!visitType) return { status: "no_visit_type", visitType: "", agreement, package: pkg, isOneTime };
  return { status: "ok", visitType, agreement, package: pkg, isOneTime };
}

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ownerCheckCount(property, visitType) {
  if (!property || !visitType) return 0;
  return (property.monitoring_priorities || []).filter(
    (p) =>
      p &&
      p.active !== false &&
      p.include_in_recurring === true &&
      (p.recurring_check_text || "").trim() &&
      (!p.recurring_visit_type || p.recurring_visit_type === visitType)
  ).length;
}

export function deriveOnboarding({ client, properties, selectedProperty, intakes, agreements, visits, servicePackages }) {
  const clientId = client?.id;
  const intakeRecords = (intakes || []).filter((i) => !i.archived);
  const latest = intakeRecords.slice().sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0] || null;

  // Stage 1 — Customer Intake (client-level)
  let s1;
  if (intakeRecords.length === 0) {
    if ((properties || []).length > 0) {
      // Legacy / manually created client — no intake on file; do not block.
      s1 = { key: "intake", name: "Customer Intake", complete: true, status: "Not used (manual)", detail: "No intake on file", action: null };
    } else {
      s1 = { key: "intake", name: "Customer Intake", complete: false, status: "Not Sent", detail: "Send the secure intake form", action: { label: "Send Intake Form", scroll: "client-intake" } };
    }
  } else {
    const status = latest.status || "Draft";
    let action = null;
    if (status === "Sent") action = { label: "Copy / Resend Link", scroll: "client-intake" };
    else if (status === "Received") action = { label: "Review Intake", to: `/clients/${clientId}/intake` };
    else if (status === "Reviewed") action = { label: "Apply Intake", to: `/clients/${clientId}/intake` };
    s1 = { key: "intake", name: "Customer Intake", complete: status === "Applied", status, detail: status, action };
  }

  // Stage 2 — Property Setup (per selected property)
  const s2 = selectedProperty
    ? { key: "property", name: "Property Setup", complete: true, status: selectedProperty.property_type || "Property", detail: selectedProperty.name, action: null }
    : { key: "property", name: "Property Setup", complete: false, status: "No property", detail: "Add the client's first property", action: { label: "Add Property", to: `/properties?add=1&owner=${clientId}` } };

  // Agreements for the selected property
  const propAgs = (agreements || []).filter((a) => a.property_id === selectedProperty?.id && !a.archived);
  const latestAg = propAgs.slice().sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))[0] || null;
  const signedAg = propAgs.find((a) => a.signing_status === "Signed");
  const svc = resolvePropertyService(selectedProperty, agreements, servicePackages);
  const conflict = svc.status === "conflict";
  const singleActive = svc.status === "ok" ? svc.agreement : null;

  // Stage 3 — Service Agreement (complete when signed)
  let s3;
  if (!latestAg) {
    s3 = { key: "agreement", name: "Service Agreement", complete: false, status: "No agreement", detail: "Assign a service package", action: selectedProperty ? { label: "Create Service Agreement", to: `/agreements/new?client=${clientId}&property=${selectedProperty.id}` } : null };
  } else {
    const ss = latestAg.signing_status || "Draft";
    const complete = ss === "Signed";
    let action = null;
    if (ss === "Draft") action = { label: "Continue Agreement", to: `/agreements/${latestAg.id}` };
    else if (ss === "Sent" || ss === "Viewed") action = { label: "View Agreement", to: `/agreements/${latestAg.id}` };
    else if (ss === "Declined" || ss === "Expired") action = { label: "Create Replacement", to: `/agreements/new?client=${clientId}&property=${selectedProperty.id}` };
    s3 = { key: "agreement", name: "Service Agreement", complete, status: singleActive ? "Signed" : ss, detail: singleActive ? "Active" : ss, action };
  }

  // Stage 4 — Service Activation (complete when Active; blocked on conflict)
  let s4;
  if (conflict) {
    s4 = { key: "activation", name: "Service Activation", complete: false, status: "Agreement conflict", detail: "Multiple active agreements — resolve first", action: null };
  } else if (singleActive) {
    s4 = { key: "activation", name: "Service Activation", complete: true, status: "Active", detail: "Service active", action: null };
  } else if (signedAg) {
    s4 = { key: "activation", name: "Service Activation", complete: false, status: "Signed — not active", detail: "Activate the signed agreement", action: { label: "Activate Service", to: `/agreements/${signedAg.id}` } };
  } else {
    s4 = { key: "activation", name: "Service Activation", complete: false, status: "Waiting on agreement", detail: "Complete the service agreement first", action: null };
  }

  // One-time / on-demand service: no recurring onboarding pipeline. The active
  // agreement is a one-time service (package.recurring === "One-time" or
  // agreement.billing_type === "One-time"), so the onboarding visit, monitoring
  // plan and "Ready for Regular Service" stages do not apply. This prevents an
  // on-demand-only customer from looking like an incomplete recurring customer.
  if (svc.isOneTime && singleActive) {
    const intakeReadyOT = intakeRecords.length === 0 ? true : latest?.status === "Applied";
    const s5ot = { key: "onboarding_visit", name: "Initial Property Onboarding Visit", complete: true, status: "Not applicable (one-time service)", detail: "One-time service — no recurring onboarding", action: null };
    const s6ot = { key: "monitoring", name: "Monitoring Plan", complete: true, status: "Not applicable (one-time service)", detail: "One-time service — no monitoring plan", action: null };
    const s7ot = { key: "ready", name: "Service Active", complete: true, status: "Ready", detail: "On-demand service active", action: null };
    const stagesOT = [s1, s2, s3, s4, s5ot, s6ot, s7ot];
    const primaryActionOT = [s1, s2, s3, s4].find((s) => !s.complete && s.action) || null;
    return { stages: stagesOT, primaryAction: primaryActionOT, ready: !!(selectedProperty && intakeReadyOT), serviceConflict: false, isOneTime: true };
  }

  // Stage 5 — Initial Property Onboarding Visit
  const onboardVisits = (visits || []).filter((v) => v.property_id === selectedProperty?.id && v.visit_type === ONBOARDING_VISIT_TYPE && !v.archived);
  const completedVisit = onboardVisits.find((v) => v.status === "Completed");
  const inProgressVisit = onboardVisits.find((v) => v.status === "In Progress");
  const scheduledVisit = onboardVisits.find((v) => v.status === "Scheduled");
  let s5;
  if (completedVisit) {
    s5 = { key: "onboarding_visit", name: "Initial Property Onboarding Visit", complete: true, status: "Completed", detail: fmtDate(completedVisit.start_time || completedVisit.end_time), action: { label: "View Visit", to: `/visits/${completedVisit.id}` } };
  } else if (inProgressVisit) {
    s5 = { key: "onboarding_visit", name: "Initial Property Onboarding Visit", complete: false, status: "In Progress", detail: "Onboarding visit in progress", action: { label: "Continue Onboarding Visit", to: `/visits/${inProgressVisit.id}` } };
  } else if (scheduledVisit) {
    s5 = { key: "onboarding_visit", name: "Initial Property Onboarding Visit", complete: false, status: "Scheduled", detail: fmtDate(scheduledVisit.start_time || scheduledVisit.scheduled_time), action: { label: "View Scheduled Visit", to: `/visits/${scheduledVisit.id}` } };
  } else if (conflict) {
    s5 = { key: "onboarding_visit", name: "Initial Property Onboarding Visit", complete: false, status: "Agreement conflict", detail: "Resolve agreement conflict first", action: null };
  } else if (singleActive && selectedProperty) {
    s5 = { key: "onboarding_visit", name: "Initial Property Onboarding Visit", complete: false, status: "Not scheduled", detail: "Start the initial onboarding visit", action: { label: "Start Initial Onboarding Visit", to: `/visits?start=1&property=${selectedProperty.id}&agreement=${singleActive.id}&client=${clientId}` } };
  } else {
    s5 = { key: "onboarding_visit", name: "Initial Property Onboarding Visit", complete: false, status: "Waiting for active service", detail: "Activate service first", action: null };
  }

  // Stage 6 — Monitoring Plan
  const planConfirmed = !!(
    selectedProperty?.monitoring_plan_confirmed_at &&
    selectedProperty?.monitoring_plan_visit_type &&
    selectedProperty.monitoring_plan_visit_type === svc.visitType &&
    svc.status === "ok"
  );
  let s6;
  if (conflict) {
    s6 = { key: "monitoring", name: "Monitoring Plan", complete: false, status: "Agreement conflict", detail: "Multiple active agreements — resolve first", action: null };
  } else if (!s5.complete) {
    s6 = { key: "monitoring", name: "Monitoring Plan", complete: false, status: "Waiting for onboarding visit", detail: "Complete the onboarding visit first", action: null };
  } else if (svc.status !== "ok") {
    s6 = { key: "monitoring", name: "Monitoring Plan", complete: false, status: "Waiting for active service", detail: "No active agreement for current service", action: null };
  } else if (planConfirmed) {
    const count = ownerCheckCount(selectedProperty, svc.visitType);
    s6 = { key: "monitoring", name: "Monitoring Plan", complete: true, status: "Confirmed", detail: `${count} owner check${count === 1 ? "" : "s"} · ${visitTypeLabel(svc.visitType)}`, action: { label: "Review Monitoring Plan", to: `/properties/${selectedProperty.id}` } };
  } else {
    s6 = { key: "monitoring", name: "Monitoring Plan", complete: false, status: "Not confirmed", detail: "Confirm the recurring monitoring plan", action: { label: "Review Monitoring Plan", to: `/properties/${selectedProperty.id}` } };
  }

  // Stage 7 — Ready for Regular Service
  const intakeReady = intakeRecords.length === 0 ? true : latest?.status === "Applied";
  const ready = !!(selectedProperty && signedAg && singleActive && s5.complete && planConfirmed && intakeReady);
  const s7 = { key: "ready", name: "Ready for Regular Service", complete: ready, status: ready ? "Ready" : "In progress", detail: ready ? "All onboarding stages complete" : "Complete the remaining stages", action: null };

  const stages = [s1, s2, s3, s4, s5, s6, s7];
  const primaryAction = conflict ? null : [s1, s2, s3, s4, s5, s6].find((s) => !s.complete && s.action) || null;

  return { stages, primaryAction, ready, serviceConflict: conflict };
}