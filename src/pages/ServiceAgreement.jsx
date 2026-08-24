import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Package, Loader2, Save, User, Building2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import EmptyState from "@/components/ui/EmptyState";

const BILLING_TYPES = ["One-time", "Monthly", "Quarterly", "Annual"];
const STATUSES = ["Active", "Paused", "Ended", "Cancelled"];
const FREQUENCY_OPTS = ["Weekly", "Twice Weekly", "Monthly", "As Needed"];

export default function ServiceAgreement() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clientId = params.get("client");
  const propertyParam = params.get("property");
  const isEdit = !!id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState(null);
  const [properties, setProperties] = useState([]);
  const [packages, setPackages] = useState([]);
  const [values, setValues] = useState({
    client_id: clientId || "",
    property_id: propertyParam || "",
    service_package_id: "",
    agreed_price: 0,
    billing_type: "Monthly",
    inspection_frequency: "",
    start_date: "",
    renewal_date: "",
    status: "Active",
    included_services_override: "",
    additional_terms: "",
    notes: "",
    next_invoice_date: "",
    created_from_package_price: 0,
  });

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        let cid = clientId;
        let loaded = null;
        if (isEdit) {
          loaded = await base44.entities.PropertyServiceAgreement.get(id);
          cid = loaded.client_id || clientId;
        }
        const [cl, allProps, allPkgs] = await Promise.all([
          cid ? base44.entities.Client.get(cid) : Promise.resolve(null),
          base44.entities.Property.list("-created_date", 500),
          base44.entities.ServicePackage.list("-created_date", 200),
        ]);
        setClient(cl);
        const clientProps = (allProps || []).filter((p) => p.owner_id === cid && !p.archived);
        setProperties(clientProps);
        setPackages((allPkgs || []).filter((p) => p.active !== false));
        if (isEdit && loaded) {
          setValues({
            client_id: loaded.client_id || "",
            property_id: loaded.property_id || "",
            service_package_id: loaded.service_package_id || "",
            agreed_price: loaded.agreed_price ?? 0,
            billing_type: loaded.billing_type || "Monthly",
            inspection_frequency: loaded.inspection_frequency || "",
            start_date: loaded.start_date || "",
            renewal_date: loaded.renewal_date || "",
            status: loaded.status || "Active",
            included_services_override: loaded.included_services_override || "",
            additional_terms: loaded.additional_terms || "",
            notes: loaded.notes || "",
            next_invoice_date: loaded.next_invoice_date || "",
            created_from_package_price: loaded.created_from_package_price ?? 0,
          });
        } else if (propertyParam) {
          set("property_id", propertyParam);
        } else if (clientProps.length === 1) {
          set("property_id", clientProps[0].id);
        }
      } catch (e) {}
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const selectedPackage = packages.find((p) => p.id === values.service_package_id);

  const onPackageChange = (pid) => {
    const pkg = packages.find((p) => p.id === pid);
    if (!pkg) { set("service_package_id", pid); return; }
    setValues((s) => ({
      ...s,
      service_package_id: pid,
      agreed_price: pkg.standard_price ?? s.agreed_price,
      billing_type: pkg.billing_type || s.billing_type,
      created_from_package_price: pkg.standard_price ?? 0,
    }));
  };

  const save = async () => {
    if (!values.property_id || !values.service_package_id) return;
    setSaving(true);
    try {
      const payload = {
        client_id: values.client_id || client?.id || "",
        property_id: values.property_id,
        service_package_id: values.service_package_id,
        agreed_price: Number(values.agreed_price) || 0,
        billing_type: values.billing_type,
        inspection_frequency: values.inspection_frequency,
        start_date: values.start_date || null,
        renewal_date: values.renewal_date || null,
        status: values.status,
        included_services_override: values.included_services_override,
        additional_terms: values.additional_terms,
        notes: values.notes,
        next_invoice_date: values.next_invoice_date || null,
        created_from_package_price: Number(values.created_from_package_price) || 0,
      };
      if (isEdit) {
        await base44.entities.PropertyServiceAgreement.update(id, payload);
      } else {
        await base44.entities.PropertyServiceAgreement.create(payload);
      }
      const targetClient = payload.client_id || client?.id;
      navigate(`/clients/${targetClient}`);
    } catch (e) { setSaving(false); }
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;

  const backTo = client ? `/clients/${client.id}` : "/clients";

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 lg:pb-6">
        <Link to={backTo} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Client Hub
        </Link>
        <h1 className="text-xl font-semibold mb-4">{isEdit ? "Edit Service Agreement" : "New Service Agreement"}</h1>

        {!client ? (
          <EmptyState icon={User} title="No client selected" description="Open this screen from a client's hub." />
        ) : properties.length === 0 ? (
          <EmptyState icon={Building2} title="No properties for this client" description="Add a property before creating a service agreement."
            action={<Link to={`/properties?add=1&owner=${client.id}`}><Button size="sm">Add Property</Button></Link>} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Client</p>
              <p className="font-medium">{client.name}</p>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Property</Label>
              {properties.length === 1 ? (
                <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">{properties[0].name}</div>
              ) : (
                <Select value={values.property_id} onValueChange={(v) => set("property_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Service Package</Label>
              <Select value={values.service_package_id} onValueChange={onPackageChange}>
                <SelectTrigger><SelectValue placeholder="Select a package" /></SelectTrigger>
                <SelectContent>
                  {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedPackage && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Package defaults (reference)</p>
                </div>
                <p className="text-sm font-medium">{selectedPackage.name}</p>
                {selectedPackage.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{selectedPackage.description}</p>}
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Standard price: <span className="text-foreground">€{(selectedPackage.standard_price || 0).toFixed(2)}</span></div>
                  <div>Billing: <span className="text-foreground">{selectedPackage.billing_type}</span></div>
                  <div>Visit duration: <span className="text-foreground">{selectedPackage.visit_duration || "—"}</span></div>
                  <div>VAT: <span className="text-foreground">{selectedPackage.vat_setting}</span></div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Agreement terms (customer-specific)</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Agreed Price (€)</Label>
                  <Input type="number" step="0.01" value={values.agreed_price ?? ""} onChange={(e) => set("agreed_price", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Billing Type</Label>
                  <Select value={values.billing_type} onValueChange={(v) => set("billing_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BILLING_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Inspection Frequency</Label>
                <Input value={values.inspection_frequency || ""} onChange={(e) => set("inspection_frequency", e.target.value)} placeholder="e.g. Weekly" list="freq-opts" />
                <datalist id="freq-opts">{FREQUENCY_OPTS.map((o) => <option key={o} value={o} />)}</datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start Date</Label>
                  <Input type="date" value={values.start_date || ""} onChange={(e) => set("start_date", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Renewal Date</Label>
                  <Input type="date" value={values.renewal_date || ""} onChange={(e) => set("renewal_date", e.target.value)} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</Label>
                <Select value={values.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Included Services Override</Label>
                <Textarea value={values.included_services_override || ""} onChange={(e) => set("included_services_override", e.target.value)} rows={2} placeholder="Override or add to the package's included services" />
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Additional Terms</Label>
                <Textarea value={values.additional_terms || ""} onChange={(e) => set("additional_terms", e.target.value)} rows={2} />
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes</Label>
                <Textarea value={values.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Next Invoice Date (optional)</Label>
                <Input type="date" value={values.next_invoice_date || ""} onChange={(e) => set("next_invoice_date", e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Link to={backTo}><Button variant="outline">Cancel</Button></Link>
              <Button onClick={save} disabled={saving || !values.property_id || !values.service_package_id} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Agreement
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}