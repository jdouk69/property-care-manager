import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const CLOSED_STATUSES = new Set(["Completed", "Cancelled"]);

export default function useOpenIssueCount(enabled) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return undefined;
    }

    let active = true;
    const load = async () => {
      try {
        const issues = await base44.entities.MaintenanceIssue.list("-created_date", 5000);
        if (!active) return;
        setCount((issues || []).filter((issue) =>
          !issue.archived && !CLOSED_STATUSES.has(issue.status)
        ).length);
      } catch {
        // Keep the last known count visible if a refresh fails temporarily.
      }
    };

    load();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") load();
    };
    const onIssuesChanged = () => load();
    window.addEventListener("focus", load);
    window.addEventListener("pcc:maintenance-issues-changed", onIssuesChanged);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(load, 60_000);

    return () => {
      active = false;
      window.removeEventListener("focus", load);
      window.removeEventListener("pcc:maintenance-issues-changed", onIssuesChanged);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(timer);
    };
  }, [enabled]);

  return count;
}
