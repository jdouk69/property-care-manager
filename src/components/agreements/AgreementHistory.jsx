import React from "react";
import { Link } from "react-router-dom";
import { History } from "lucide-react";
import { badgeTone } from "@/components/resource/ResourceListPage";

const fmtDate = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch (e) { return iso; }
};

// Compact version-history section. Lists every version in the agreement group,
// newest first, with its operational + signing state. Older versions are never
// hidden or overwritten; staff can open any historical version.
export default function AgreementHistory({ versions, currentId }) {
  if (!versions || versions.length === 0) return null;
  const sorted = [...versions].sort((a, b) => (b.agreement_version || 0) - (a.agreement_version || 0));
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border font-medium text-sm">
        <History className="w-4 h-4 text-muted-foreground" /> Agreement History
      </div>
      <div className="divide-y divide-border">
        {sorted.map((v) => {
          const isCurrent = v.id === currentId;
          const sub =
            v.status === "Active" && v.signing_status === "Signed"
              ? `Activated ${fmtDate(v.activated_at)}`
              : v.signing_status === "Signed" ? `Signed ${fmtDate(v.signed_at)}`
              : v.signing_status === "Declined" ? `Declined ${fmtDate(v.declined_at)}`
              : v.signing_status === "Sent" || v.signing_status === "Viewed" ? "Awaiting signature"
              : "Draft";
          return (
            <Link key={v.id} to={`/agreements/${v.id}`} className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition ${isCurrent ? "bg-primary/5" : ""}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium">Version {v.agreement_version || 1}{isCurrent && <span className="text-xs text-primary"> · viewing</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{sub}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {v.signing_status && <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(v.signing_status)}`}>{v.signing_status}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(v.status)}`}>{v.status}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}