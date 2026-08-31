import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, CalendarClock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { visitTypeLabel } from "@/lib/visitTypeLabels";
import { buildScheduleFirstVisitPath } from "@/lib/onboardingHandoff";

// One-time onboarding-completion confirmation. Shown only when a recurring
// customer has reached Ready for Regular Service AND the internal "Ready"
// notification is still unread. The notification's server-side `read` flag is
// the persisted acknowledgement, so the dialog does not reappear on another
// device after dismissal and does not depend on localStorage. Dismissing via
// either action marks the notification read (handled by the caller's
// onDismiss). The Ready state itself is derived independently and never
// depends on dismissing this dialog. Does NOT auto-schedule a visit.
export default function OnboardingCompleteDialog({ handoff, notification, onDismiss }) {
  const navigate = useNavigate();
  if (!handoff || !notification || notification.read) return null;
  const schedule = () => {
    onDismiss?.();
    navigate(buildScheduleFirstVisitPath(handoff));
  };
  const done = () => { onDismiss?.(); };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border max-w-sm md:max-w-md w-full p-5 shadow-xl">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold">Customer Setup Complete</h2>
          <p className="text-sm text-muted-foreground mt-1">{handoff.clientName} · {handoff.propertyName}</p>
          <p className="text-sm text-muted-foreground">{handoff.packageName}{handoff.frequency ? ` · ${handoff.frequency} service` : ""}</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-3 mb-4 text-sm text-center">
          <p className="text-foreground">All onboarding stages are complete. This property is ready for regular service.</p>
          <p className="text-xs text-muted-foreground mt-1">Next visit type: {visitTypeLabel(handoff.visitType)}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={schedule} className="h-11 rounded-xl gap-2"><CalendarClock className="w-4 h-4" /> Schedule First Regular Visit <ArrowRight className="w-4 h-4" /></Button>
          <Button variant="outline" onClick={done} className="h-11 rounded-xl">Done / Return to Client Hub</Button>
        </div>
      </div>
    </div>
  );
}