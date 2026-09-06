import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { eur, outstandingTotal, overdueTotal } from "@/lib/billing";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const STATUS_FILTERS = ["All", "Due", "Overdue", "Paid", "Waived"];

// Simple filter row for the Billing list: status chips + client/property
// selects, plus the live outstanding/overdue totals.
export default function BillingFilterBar({
  items, statusFilter, onStatusFilter,
  clientFilter, onClientFilter, clientOptions,
  propertyFilter, onPropertyFilter, propertyOptions,
}) {
  const { t } = useLanguage();
  const live = (items || []).filter((i) => !i.archived);
  const outstanding = outstandingTotal(live);
  const overdue = overdueTotal(live);
  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatusFilter(s)}
            className={`text-xs px-3 min-h-10 rounded-full border transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t(s)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={clientFilter || "all"} onValueChange={onClientFilter}>
          <SelectTrigger className="h-10 w-[150px] text-sm rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All clients")}</SelectItem>
            {(clientOptions || []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={propertyFilter || "all"} onValueChange={onPropertyFilter}>
          <SelectTrigger className="h-10 w-[150px] text-sm rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All properties")}</SelectItem>
            {(propertyOptions || []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm font-medium">
          {overdue > 0 && <span className="text-rose-600 mr-3">{t("Overdue {amount}", { amount: eur(overdue) })}</span>}
          <span>{t("Outstanding {amount}", { amount: eur(outstanding) })}</span>
        </div>
      </div>
    </div>
  );
}