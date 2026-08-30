import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertTriangle, Plus, Trash2, Home } from "lucide-react";
import { INTAKE_SECTIONS, MONITORING_AREAS, emptyPayload } from "@/lib/intakeSchema";

const SAVE_DEBOUNCE = 1500;

// Normalized invoke: returns { data, status } whether the SDK returns or throws
// on non-2xx (the function uses 409 to signal "already submitted").
async function invokeIntake(token, action, payload) {
  try {
    const res = await base44.functions.invoke("intakePublic", { token, action, payload });
    return { data: res?.data || res, status: res?.status || 200 };
  } catch (e) {
    const data = e?.response?.data || e?.data || {};
    const status = e?.response?.status || e?.status || 500;
    return { data, status };
  }
}

export default function IntakeForm() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [intakeStatus, setIntakeStatus] = useState(null);
  const [values, setValues] = useState(emptyPayload());
  const [packages, setPackages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const debounceRef = useRef(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // Load intake + service packages on mount.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, status } = await invokeIntake(token, "get");
        if (data?.error === "Not found" || status === 404) {
          if (mounted) setError("This intake link is no longer valid. Please contact us for a new link.");
          setLoading(false);
          return;
        }
        if (data?.error) {
          if (mounted) setError(data.error);
          setLoading(false);
          return;
        }
        const st = data.status;
        if (st === "Received" || st === "Reviewed" || st === "Applied") {
          if (mounted) { setIntakeStatus(st); setSubmitted(true); }
          setLoading(false);
          return;
        }
        if (mounted) {
          setIntakeStatus(st || "Sent");
          const loaded = data.payload || {};
          setValues({ ...emptyPayload(), ...loaded });
        }
      } catch (e) {
        if (mounted) setError("We could not load your intake form. Please try again or contact us.");
      }
      if (mounted) setLoading(false);
    })();
    // Service packages are public catalog info; fetched read-only for display.
    try {
      base44.entities.ServicePackage.list().then((p) => setPackages((p || []).filter((x) => x.active !== false))).catch(() => {});
    } catch (e) {}
    return () => { mounted = false; if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced autosave of payload.
  const scheduleSave = (next) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaving(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data: d } = await invokeIntake(token, "save", next);
        if (d?.error === "already_submitted") {
          setIntakeStatus(d.status); setSubmitted(true);
        } else if (!d?.error) {
          setSavedAt(Date.now());
        }
      } catch (e) { /* leave dirty; next change retries */ }
      setSaving(false);
    }, SAVE_DEBOUNCE);
  };

  const setField = (name, v) => {
    const next = { ...values, [name]: v };
    setValues(next);
    scheduleSave(next);
  };

  const addContractor = () => {
    const next = { ...values, contractors: [...(values.contractors || []), { name: "", service_type: "", phone: "", email: "", notes: "" }] };
    setValues(next); scheduleSave(next);
  };
  const setContractor = (i, k, v) => {
    const arr = [...(values.contractors || [])];
    arr[i] = { ...arr[i], [k]: v };
    const next = { ...values, contractors: arr };
    setValues(next); scheduleSave(next);
  };
  const removeContractor = (i) => {
    const arr = (values.contractors || []).filter((_, idx) => idx !== i);
    const next = { ...values, contractors: arr };
    setValues(next); scheduleSave(next);
  };

  const togglePackage = (pkg) => {
    const cur = values.service_interest || [];
    const exists = cur.find((c) => c.id === pkg.id);
    const nextArr = exists ? cur.filter((c) => c.id !== pkg.id) : [...cur, { id: pkg.id, name: pkg.name }];
    const next = { ...values, service_interest: nextArr };
    setValues(next); scheduleSave(next);
  };

  const toggleMonitoringArea = (area) => {
    const cur = values.monitoring_areas || [];
    const nextArr = cur.includes(area) ? cur.filter((a) => a !== area) : [...cur, area];
    const next = { ...values, monitoring_areas: nextArr };
    setValues(next); scheduleSave(next);
  };

  const submit = async () => {
    if (!values.full_name || !values.full_name.trim()) {
      setError("Please enter your full name before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (debounceRef.current) { clearTimeout(debounceRef.current); setSaving(false); }
      const { data: d } = await invokeIntake(token, "submit", values);
      if (d?.error === "already_submitted") {
        setIntakeStatus(d.status); setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (d?.error) {
        setError(d.error);
      } else {
        setIntakeStatus(d.status || "Received");
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (e) {
      setError("Submission failed. Please try again.");
    }
    setSubmitting(false);
  };

  const fieldVal = (name) => (values[name] == null ? "" : values[name]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !submitted && intakeStatus !== "Received" && intakeStatus !== "Reviewed" && intakeStatus !== "Applied") {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-16">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-base font-medium text-slate-800">{error}</p>
          <p className="text-sm text-slate-500 mt-2">If the problem continues, please contact us directly.</p>
        </div>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Thank you — your information has been received.</h1>
          <p className="text-sm text-slate-600 mt-3">We will review your property information and contact you regarding the next steps. No further action is needed from you right now.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-28">
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Home className="w-4 h-4 text-primary-foreground" /></div>
            <span className="font-semibold text-slate-900">Property Care Intake</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 leading-tight">Welcome — let's get your property set up.</h1>
          <p className="text-sm text-slate-500 mt-1">Please complete the sections below. Your progress is saved automatically. You can close this page and return later using the same link.</p>
          <SaveIndicator saving={saving} savedAt={savedAt} />
        </header>

        <div className="space-y-5">
          {INTAKE_SECTIONS.map((sec) => (
            <section key={sec.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-base font-semibold text-slate-900">{sec.title}</h2>
              {sec.intro && <p className="text-xs text-slate-500 mt-1 mb-4">{sec.intro}</p>}
              {!sec.intro && <div className="h-3" />}

              {sec.fields && (
                <div className="space-y-3.5">
                  {sec.fields.map((f) => (
                    <div key={f.name}>
                      <Label className="text-sm font-medium text-slate-700 mb-1 block">
                        {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                      </Label>
                      {f.type === "textarea"
                        ? <Textarea value={fieldVal(f.name)} onChange={(e) => setField(f.name, e.target.value)} rows={3} className="bg-white" />
                        : f.type === "select"
                          ? (
                            <select value={fieldVal(f.name)} onChange={(e) => setField(f.name, e.target.value)}
                              className="w-full min-w-0 h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                              <option value="">Select…</option>
                              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          )
                          : <Input value={fieldVal(f.name)} onChange={(e) => setField(f.name, e.target.value)} className="bg-white" />
                      }
                    </div>
                  ))}
                </div>
              )}

              {sec.repeatable === "contractors" && (
                <div className="space-y-3">
                  {(values.contractors || []).map((c, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-3 relative">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sec.itemFields.map((f) => (
                          <div key={f.name} className={f.name === "notes" ? "sm:col-span-2" : ""}>
                            <Label className="text-xs font-medium text-slate-600 mb-1 block">{f.label}</Label>
                            <Input value={c[f.name] || ""} onChange={(e) => setContractor(i, f.name, e.target.value)} className="bg-white" />
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => removeContractor(i)} className="absolute top-2 right-2 text-slate-400 hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addContractor} className="gap-1.5"><Plus className="w-4 h-4" /> Add contractor</Button>
                </div>
              )}

              {sec.special === "service-packages" && (
                <div className="space-y-2">
                  {packages.length === 0 && <p className="text-sm text-slate-500">Loading available services…</p>}
                  {packages.map((pkg) => {
                    const checked = (values.service_interest || []).some((c) => c.id === pkg.id);
                    return (
                      <label key={pkg.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${checked ? "border-primary bg-primary/5" : "border-slate-200 bg-white"}`}>
                        <input type="checkbox" checked={checked} onChange={() => togglePackage(pkg)} className="mt-0.5 w-5 h-5 accent-[hsl(var(--primary))]" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">{pkg.name}</p>
                          {pkg.description && <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>}
                        </div>
                      </label>
                    );
                  })}
                  <p className="text-xs text-slate-400 mt-1">Indicating interest only — not a commitment or assignment.</p>
                </div>
              )}

              {sec.special === "monitoring-areas" && (
                <div className="space-y-3 mt-1">
                  <div className="flex flex-wrap gap-2">
                    {MONITORING_AREAS.map((area) => {
                      const checked = (values.monitoring_areas || []).includes(area);
                      return (
                        <button type="button" key={area} onClick={() => toggleMonitoringArea(area)}
                          className={`min-h-[44px] px-3.5 py-2.5 rounded-full border text-sm transition touch-manipulation ${checked ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-700 hover:border-primary/40"}`}>
                          {area}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-1 block">Is there anything specific you would like us to keep an eye on?</Label>
                    <Textarea value={fieldVal("monitoring_notes")} onChange={(e) => setField("monitoring_notes", e.target.value)} rows={3} className="bg-white" placeholder="Examples: humidity in a downstairs room, a pool pump that has caused problems, shutters you want kept closed, an irrigation area that often leaks, or repair work you want monitored." />
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="fixed bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur border-t border-slate-200">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <SaveIndicator saving={saving} savedAt={savedAt} />
            <Button onClick={submit} disabled={submitting} className="gap-2 h-11 px-6">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Submit
            </Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function SaveIndicator({ saving, savedAt }) {
  if (saving) return <span className="text-xs text-slate-400 inline-flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>;
  if (savedAt) return <span className="text-xs text-emerald-600 inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</span>;
  return <span className="text-xs text-slate-300">Autosaved</span>;
}

function Shell({ children }) {
  return <div className="min-h-screen bg-slate-50 text-slate-900">{children}</div>;
}