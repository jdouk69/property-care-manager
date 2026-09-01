import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search, User, Building2, Clock, Play } from "lucide-react";
import { athensLocalToIso, athensVisitWhen } from "@/lib/timezone";
import { createNotification } from "@/lib/notifications";
import {
  fetchAssistanceDefaultPrice,
  PROPERTY_ASSISTANCE_TYPE,
  DEFAULT_TRAVEL_CHARGE,
} from "@/lib/propertyAssistance";

function SelectedCard({ icon: Icon, title, subtitle, onChange }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <Button variant="ghost" size="sm" onClick={onChange} className="shrink-0">Change</Button>
    </div>
  );
}

export default function AssistanceCreateForm({ preClient, preProperty, onCreated }) {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [properties, setProperties] = useState([]);
  const [clientId, setClientId] = useState(preClient || "");
  const [propertyId, setPropertyId] = useState(preProperty || "");
  const [clientSearch, setClientSearch] = useState("");
  const [request, setRequest] = useState("");
  const [price, setPrice] = useState(40);
  const [travel, setTravel] = useState(DEFAULT_TRAVEL_CHARGE);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [ncName, setNcName] = useState("");
  const [ncPhone, setNcPhone] = useState("");
  const [showNewProp, setShowNewProp] = useState(false);
  const [npName, setNpName] = useState("");
  const [npAddress, setNpAddress] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [cls, props] = await Promise.all([
          base44.entities.Client.list("-created_date", 500),
          base44.entities.Property.list("-created_date", 500),
        ]);
        setClients((cls || []).filter((c) => !c.archived && c.status !== "Inactive"));
        setProperties((props || []).filter((p) => !p.archived));
      } catch (e) {}
      const def = await fetchAssistanceDefaultPrice(base44);
      setPrice(def);
    })();
  }, []);

  // Resolve owner from a preselected property if no client was passed.
  useEffect(() => {
    if (preProperty && !clientId) {
      const p = properties.find((x) => x.id === preProperty);
      if (p?.owner_id) setClientId(p.owner_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preProperty, properties]);

  const clientProps = properties.filter((p) => p.owner_id === clientId);
  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedProperty = properties.find((p) => p.id === propertyId);
  const filteredClients = clients.filter((c) =>
    (c.name || "").toLowerCase().includes(clientSearch.trim().toLowerCase())
  );

  const createClient = async () => {
    if (!ncName.trim()) return;
    try {
      const c = await base44.entities.Client.create({ name: ncName.trim(), phone: ncPhone.trim() });
      setClients((arr) => [c, ...arr]);
      setClientId(c.id);
      setShowNewClient(false);
      setNcName("");
      setNcPhone("");
    } catch (e) {
      alert("Could not create client: " + (e?.message || e));
    }
  };

  const createProperty = async () => {
    if (!npName.trim() || !clientId) return;
    try {
      const p = await base44.entities.Property.create({
        name: npName.trim(),
        address: npAddress.trim(),
        owner_id: clientId,
      });
      setProperties((arr) => [p, ...arr]);
      setPropertyId(p.id);
      setShowNewProp(false);
      setNpName("");
      setNpAddress("");
    } catch (e) {
      alert("Could not create property: " + (e?.message || e));
    }
  };

  const build = async (status, timeIso) => {
    if (!propertyId) {
      alert("Select a property.");
      return;
    }
    if (!request.trim()) {
      alert("Enter the request.");
      return;
    }
    setSaving(true);
    try {
      const visit = await base44.entities.PropertyVisit.create({
        property_id: propertyId,
        visit_type: PROPERTY_ASSISTANCE_TYPE,
        status,
        start_time: timeIso,
        scheduled_time: status === "Scheduled" ? timeIso : "",
        agreed_price: Number(price) || 0,
        travel_charge: Number(travel) || 0,
        request_description: request.trim(),
      });
      // One light schedule notification (respects the Visits category). No
      // notification on Start Now — keeps tiny jobs quiet.
      if (status === "Scheduled") {
        try {
          const sList = await base44.entities.BusinessSettings.list("-created_date", 1);
          const cats = (sList?.[0]?.notif_categories) || [];
          if (cats.includes("Visits")) {
            const prop = properties.find((p) => p.id === propertyId);
            await createNotification({
              title: "Property Assistance scheduled",
              message: `${selectedClient?.name || "Client"} · ${prop?.name || "Property"} · ${athensVisitWhen(timeIso)}`,
              type: "Visit",
              priority: "Medium",
              related_entity: "PropertyVisit",
              related_record_id: visit.id,
              related_property_id: propertyId,
              related_path: `/property-assistance/${visit.id}`,
              dedup_key: `assistance_scheduled:${visit.id}`,
            });
          }
        } catch (e) {}
      }
      onCreated(visit, status !== "Scheduled");
    } catch (e) {
      alert("Could not create: " + (e?.message || e));
    }
    setSaving(false);
  };

  const schedule = () => {
    if (!scheduleDate || !scheduleTime) {
      alert("Pick a date and time, or use Start Now.");
      return;
    }
    build("Scheduled", athensLocalToIso(scheduleDate, scheduleTime));
  };
  const startNow = () => build("In Progress", new Date().toISOString());

  return (
    <div className="space-y-4">
      {/* Client */}
      {clientId ? (
        <SelectedCard
          icon={User}
          title={selectedClient?.name || "Client"}
          subtitle={selectedClient?.phone || selectedClient?.email || ""}
          onChange={() => setClientId("")}
        />
      ) : showNewClient ? (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-medium">New client</p>
          <Input placeholder="Name" value={ncName} onChange={(e) => setNcName(e.target.value)} className="h-11" />
          <Input placeholder="Phone" value={ncPhone} onChange={(e) => setNcPhone(e.target.value)} className="h-11" />
          <div className="flex gap-2">
            <Button onClick={createClient} size="sm" className="rounded-xl">Add client</Button>
            <Button onClick={() => setShowNewClient(false)} variant="outline" size="sm" className="rounded-xl">Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="relative p-3 border-b border-border">
            <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Select client…"
              className="pl-9 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-border">
            {filteredClients.map((c) => (
              <button
                key={c.id}
                onClick={() => setClientId(c.id)}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3"
              >
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.phone || c.email || ""}</p>
                </div>
              </button>
            ))}
            {filteredClients.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No clients found.</p>
            )}
          </div>
          <button
            onClick={() => setShowNewClient(true)}
            className="w-full px-4 py-3 text-sm text-primary hover:bg-muted/50 flex items-center gap-2 border-t border-border"
          >
            <Plus className="w-4 h-4" /> New client
          </button>
        </div>
      )}

      {/* Property */}
      {clientId &&
        (propertyId ? (
          <SelectedCard
            icon={Building2}
            title={selectedProperty?.name || "Property"}
            subtitle={selectedProperty?.address || ""}
            onChange={() => setPropertyId("")}
          />
        ) : showNewProp ? (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-medium">New property</p>
            <Input placeholder="Name" value={npName} onChange={(e) => setNpName(e.target.value)} className="h-11" />
            <Input placeholder="Address" value={npAddress} onChange={(e) => setNpAddress(e.target.value)} className="h-11" />
            <div className="flex gap-2">
              <Button onClick={createProperty} size="sm" className="rounded-xl">Add property</Button>
              <Button onClick={() => setShowNewProp(false)} variant="outline" size="sm" className="rounded-xl">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <p className="px-4 py-2 text-xs text-muted-foreground">Select property</p>
            <div className="divide-y divide-border">
              {clientProps.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPropertyId(p.id)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3"
                >
                  <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.address || ""}</p>
                  </div>
                </button>
              ))}
              {clientProps.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">No properties for this client.</p>
              )}
            </div>
            <button
              onClick={() => setShowNewProp(true)}
              className="w-full px-4 py-3 text-sm text-primary hover:bg-muted/50 flex items-center gap-2 border-t border-border"
            >
              <Plus className="w-4 h-4" /> New property
            </button>
          </div>
        ))}

      {/* Request + pricing + schedule */}
      {propertyId && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <Label>Request</Label>
            <Textarea
              placeholder="e.g. Adjust security camera angle"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Property Care assists with simple, non-specialist tasks. For licensed trade work we coordinate a contractor.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <Label>Agreed price (€)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <Label>Travel charge (€)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={travel}
                onChange={(e) => setTravel(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <Label>Schedule (optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="h-11" />
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={schedule} disabled={saving} className="h-12 rounded-2xl gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} Schedule
            </Button>
            <Button onClick={startNow} disabled={saving} variant="outline" className="h-12 rounded-2xl gap-1.5">
              <Play className="w-4 h-4" /> Start Now
            </Button>
          </div>
        </>
      )}
    </div>
  );
}