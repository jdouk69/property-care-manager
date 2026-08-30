import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import PageBackButton from "@/components/ui/PageBackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Check, ArrowRight, Plus, Home, Package } from "lucide-react";
import { INTAKE_SECTIONS, MAPPED_FIELDS } from "@/lib/intakeSchema";

const STATUS_TONE = {
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  Sent: "bg-blue-50 text-blue-600 border-blue-200",
  Received: "bg-amber-50 text-amber-600 border-amber-200",
  Reviewed: "bg-purple-50 text-purple-600 border-purple-200",
  Applied: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Archived: "bg-slate-100 text-slate-400 border-slate-200",
};

export default function IntakeReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [properties, setProperties] = useState([]);
  const [packages, setPackages] = useState({});
  const [intake, setIntake] = useState(null);
  const [propertyMode, setPropertyMode] = useState("existing"); // "existing" | "create"
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [apply, setApply] = useState({}); // { [fieldName]: true }
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [c, allProps, allPkgs, allIntakes] = await Promise.all([
          base44.entities.Client.get(id),
          base44.entities.Property.list("-created_date", 500),
          base44.entities.ServicePackage.list("-created_date", 200),
          base44.entities.CustomerIntake.list("-created_date", 200),
        ]);
        const clientProps = (allProps || []).filter((p) => p.owner_id === id && !p.archived);
        const pkgMap = {};
        (allPkgs || []).forEach((p) => { pkgMap[p.id] = p; });
        const clientIntakes = (allIntakes || [])
          .filter((i) => i.client_id === id && !i.archived)
          .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
        // Prefer a Received/Reviewed intake; fall back to latest.
        const pending = clientIntakes.find((i) => i.status === "Received" || i.status === "Reviewed");
        const chosen = pending || clientIntakes[0];
        if (!mounted) return;
        setClient(c);
        setProperties(clientProps);
        setPackages(pkgMap);
        setIntake(chosen);
        if (clientProps.length === 1) { setSelectedPropertyId(clientProps[0].id); setPropertyMode("existing"); }
        else if (clientProps.length === 0) { setPropertyMode("create"); }
        // Mark Reviewed if currently Received.
        if (chosen && chosen.status === "Received") {
          try {
            const upd = await base44.entities.CustomerIntake.update(chosen.id, { status: "Reviewed", reviewed_at: new Date().toISOString() });
            setIntake({ ...chosen, status: "Reviewed", reviewed_at: upd.reviewed_at });
          } catch (e) { /* non-critical */ }
        }
        // No fields are pre-selected. Staff must explicitly choose each field so
        // "Apply Approved Information" is always intentional and ONLY the fields
        // they select are written to the Client/Property record.
        setApply({});
      } catch (e) {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const payload = (intake && intake.payload) || {};
  const propForReview = properties.find((p) => p.id === selectedPropertyId) || (properties.length === 1 ? properties[0] : null);

  const currentValue = (f, c, p) => {
    if (!f.map) return undefined;
    if (f.map.entity === "Client") return c ? c[f.map.field] : "";
    if (f.map.entity === "Property") return p ? p[f.map.field] : "";
    return "";
  };

  const toggleApply = (name) => setApply((s) => ({ ...s, [name]: !s[name] }));

  const doApply = async () => {
    if (!intake) return;
    setApplying(true);
    try {
      const clientUpdate = {};
      const propertyUpdate = {};
      MAPPED_FIELDS.forEach((f) => {
        if (!apply[f.name]) return;
        const sub = payload[f.name];
        if (sub == null || sub === "") return;
        if (f.map.entity === "Client") clientUpdate[f.map.field] = sub;
        else if (f.map.entity === "Property") propertyUpdate[f.map.field] = sub;
      });

      let targetPropertyId = "";
      if (Object.keys(propertyUpdate).length > 0) {
        if (propertyMode === "create") {
          const created = await base44.entities.Property.create({
            owner_id: client.id,
            status: "Vacant",
            condition: "Good",
            ...propertyUpdate,
          });
          targetPropertyId = created.id;
        } else if (selectedPropertyId) {
          await base44.entities.Property.update(selectedPropertyId, propertyUpdate);
          targetPropertyId = selectedPropertyId;
        }
      }

      if (Object.keys(clientUpdate).length > 0) {
        await base44.entities.Client.update(client.id, clientUpdate);
      }

      const intakeUpdate = { status: "Applied", applied_at: new Date().toISOString() };
      if (targetPropertyId) intakeUpdate.property_id = targetPropertyId;
      await base44.entities.CustomerIntake.update(intake.id, intakeUpdate);

      setDone(true);
    } catch (e) {
      setApplying(false);
    }
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!client) return <AppLayout><div className="p-6">Client not found.</div></AppLayout>;
  if (!intake) return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <PageBackButton fallback={`/clients/${id}`} className="mb-3" />
        <p className="text-sm text-muted-foreground">No intake submission found for this client.</p>
      </div>
    </AppLayout>
  );

  if (done) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 max-w-md mx-auto text-center pt-12">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3"><Check className="w-8 h-8 text-emerald-600" /></div>
          <h1 className="text-lg font-semibold">Approved information applied</h1>
          <p className="text-sm text-muted-foreground mt-1">The selected fields have been updated on the Client and/or Property record. The intake is retained for reference.</p>
          <Button onClick={() => navigate(`/clients/${id}`)} className="mt-5 gap-1.5">Back to Client Hub <ArrowRight className="w-4 h-4" /></Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
        <PageBackButton fallback={`/clients/${id}`} className="mb-1" />
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-xl font-semibold">Review Intake</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_TONE[intake.status] || ""}`}>{intake.status}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {client.name} · Submitted {intake.submitted_at ? new Date(intake.submitted_at).toLocaleString() : "—"}
        </p>

        {/* Property target */}
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Apply property data to</p>
          {properties.length === 0 ? (
            <div className="flex items-center gap-2 text-sm"><Plus className="w-4 h-4 text-primary" /> A new property will be created from the approved property fields.</div>
          ) : properties.length === 1 ? (
            <div className="flex items-center gap-2 text-sm"><Home className="w-4 h-4 text-muted-foreground" /> {properties[0].name}</div>
          ) : (
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger><SelectValue placeholder="Select which property this intake applies to" /></SelectTrigger>
              <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-4">
          {INTAKE_SECTIONS.map((sec) => {
            const mappedFields = (sec.fields || []).filter((f) => f.map);
            const refFields = (sec.fields || []).filter((f) => !f.map);
            return (
              <section key={sec.id} className="rounded-2xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold mb-3">{sec.title}</h2>

                {mappedFields.length > 0 && (
                  <div className="space-y-2.5">
                    {mappedFields.map((f) => {
                      const cur = currentValue(f, client, propForReview);
                      const sub = payload[f.name];
                      const checked = !!apply[f.name];
                      const diff = (cur || "") !== (sub || "");
                      return (
                        <div key={f.name} className="rounded-xl border border-border p-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                            <button type="button" onClick={() => toggleApply(f.name)}
                              className={`text-xs px-3 py-1.5 min-h-[40px] inline-flex items-center rounded-full border transition ${checked ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                              {checked ? <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Apply</span> : "Apply submitted"}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg bg-muted/40 px-3 py-2">
                              <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Current</p>
                              <p className={diff ? "text-foreground" : "text-muted-foreground"}>{cur || <span className="text-muted-foreground/60">—</span>}</p>
                            </div>
                            <div className={`rounded-lg px-3 py-2 ${diff ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-muted/40"}`}>
                              <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Submitted</p>
                              <p>{sub || <span className="text-muted-foreground/60">—</span>}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {refFields.length > 0 && (
                  <div className={`mt-${mappedFields.length > 0 ? "3" : "0"} space-y-2`}>
                    {mappedFields.length > 0 && <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">For reference (not applied)</p>}
                    {refFields.map((f) => (
                      <div key={f.name} className="text-sm">
                        <span className="text-muted-foreground">{f.label}: </span>
                        <span className="text-foreground whitespace-pre-wrap">{payload[f.name] || <span className="text-muted-foreground/60">—</span>}</span>
                      </div>
                    ))}
                  </div>
                )}

                {sec.repeatable === "contractors" && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">For reference (not applied)</p>
                    {(payload.contractors || []).length === 0
                      ? <p className="text-sm text-muted-foreground/60">None provided.</p>
                      : (payload.contractors || []).map((c, i) => (
                        <div key={i} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                          <p className="font-medium">{c.name || "—"}{c.service_type ? ` · ${c.service_type}` : ""}</p>
                          <p className="text-xs text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" · ") || ""}</p>
                          {c.notes && <p className="text-xs text-muted-foreground mt-0.5">{c.notes}</p>}
                        </div>
                      ))}
                  </div>
                )}

                {sec.special === "service-packages" && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">For reference (not assigned)</p>
                    {(payload.service_interest || []).length === 0
                      ? <p className="text-sm text-muted-foreground/60">No services selected.</p>
                      : (payload.service_interest || []).map((s) => (
                        <div key={s.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40 mr-1.5 mb-1.5">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" /> {s.name}
                        </div>
                      ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Link to={`/clients/${id}`}><Button variant="outline">Cancel</Button></Link>
          <Button onClick={doApply} disabled={applying} className="gap-1.5">
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Apply Approved Information
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}