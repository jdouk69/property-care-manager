import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Count of AssessmentRequest records with status "New", kept live via the
// realtime subscription. Enabled only for admins (entity read is admin-only).
export default function useNewAssessmentCount(enabled) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;

    const load = async () => {
      try {
        const items = await base44.entities.AssessmentRequest.filter({ status: "New" });
        if (active) setCount(items.length);
      } catch (error) {
        // Non-admins can't read the entity; keep the badge hidden.
        if (active) setCount(0);
      }
    };

    load();
    const unsubscribe = base44.entities.AssessmentRequest.subscribe(() => load());
    return () => {
      active = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [enabled]);

  return count;
}