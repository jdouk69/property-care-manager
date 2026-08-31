import React from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ArrowRight, User, Building2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { buildScheduleFirstVisitPath } from "@/lib/onboardingHandoff";

// Prominent operational primary action shown on the Client Hub once a
// recurring customer is Ready for Regular Service and the first regular
// visit has not yet been scheduled/completed. Routes to the existing visit
// scheduling wizard with the recurring visit type preselected (never the
// onboarding visit type). Does NOT auto-create a visit — staff choose
// schedule date/time or start now.
export default function ScheduleFirstVisitCard({ handoff }) {
  const navigate = useNavigate();
  if (!handoff) return null;
  const go = () => navigate(buildScheduleFirstVisitPath(handoff));
  return (
    <div className="rounded-2xl bg-primary text-primary-foreground p-4 mb-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock className="w-4 h-4" />
        <p className="text-[11px] uppercase tracking-wide opacity-80">Ready for Regular Service</p>
      </div>
      <p className="font-semibold text-base mb-3">Schedule the first regular visit</p>
      <div className="space-y-1 text-sm opacity-90 mb-3">
        <div className="flex items-center gap-2"><User className="w-4 h-4 shrink-0" /> <span className="truncate">{handoff.clientName}</span></div>
        <div className="flex items-center gap-2"><Building2 className="w-4 h-4 shrink-0" /> <span className="truncate">{handoff.propertyName}</span></div>
        <div className="flex items-center gap-2"><Package className="w-4 h-4 shrink-0" /> <span className="truncate">{handoff.packageName}{handoff.frequency ? ` · ${handoff.frequency}` : ""}</span></div>
        <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 shrink-0" /> <span className="truncate">{visitTypeLabel(handoff.visitType)}</span></div>
      </div>
      <Button onClick={go} variant="secondary" className="w-full h-11 rounded-xl gap-2 font-semibold">
        Schedule First Regular Visit <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}