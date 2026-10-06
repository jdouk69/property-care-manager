import React from "react";
import { Link } from "react-router-dom";
import { User, Building2, Mail, MapPin, Pencil, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Screen 1 of 3 — Customer & Property.
// A read-only identity summary of the selected customer (name, email) and the
// property (name, address), with links to edit whatever is missing. The
// customer-intake flow itself is NOT duplicated here — it stays in the Client
// Hub, and the existing manual-entry path and started-intake rules are
// unchanged.
export default function AgreementStepCustomerProperty({ client, properties, values, set, isFrozen }) {
  const { t } = useLanguage();
  const selected = properties.find((p) => p.id === values.property_id) || null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <User className="w-3.5 h-3.5" /> {t("Customer")}
          </p>
          <p className="font-medium mt-1 truncate">{client?.name || "—"}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 min-w-0">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            {client?.email ? <span className="truncate">{client.email}</span> : <span className="text-amber-600 font-medium">{t("No email on file")}</span>}
          </p>
        </div>
        <Link to={`/clients?edit=${client?.id || ""}`} className="shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5"><Pencil className="w-3.5 h-3.5" /> {t("Edit Customer")}</Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" /> {t("Property")}
          </p>
          {selected ? (
            <Link to={`/properties/${selected.id}`} className="shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5"><Pencil className="w-3.5 h-3.5" /> {t("Edit Property")}</Button>
            </Link>
          ) : (
            <Link to={`/properties?add=1&owner=${client?.id || ""}`} className="shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> {t("Add Property")}</Button>
            </Link>
          )}
        </div>
        {properties.length === 1 ? (
          <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">{properties[0].name}</div>
        ) : (
          <Select value={values.property_id} onValueChange={(v) => set("property_id", v)} disabled={isFrozen}>
            <SelectTrigger><SelectValue placeholder={t("Select property")} /></SelectTrigger>
            <SelectContent>
              {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {selected && (
          <p className="text-sm text-muted-foreground flex items-start gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {selected.address ? <span className="min-w-0">{selected.address}</span> : <span className="text-amber-600 font-medium">{t("No address on file — add it before sending for signature")}</span>}
          </p>
        )}
        {!selected && properties.length === 0 && (
          <Label className="text-xs text-muted-foreground">{t("Add a property before creating a service agreement.")}</Label>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          {t("Customer intake stays available in the Client Hub. Existing intake rules are unchanged.")}
        </p>
      </div>
    </div>
  );
}