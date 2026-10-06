import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Compact collapsible row used by the agreement wizard screens to keep
// secondary content collapsed by default while keeping every field reachable.
export default function AgreementCollapse({ open, onToggle, label, icon: Icon, indicator, children }) {
  const { t } = useLanguage();
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/40 transition min-h-[44px]"
      >
        <span className="flex items-center gap-2 text-sm font-medium min-w-0">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
          <span className="truncate">{t(label)}</span>
          {indicator && <span className="text-xs font-normal text-primary shrink-0">{indicator}</span>}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}