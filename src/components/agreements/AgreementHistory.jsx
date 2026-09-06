import React from "react";
import { Link } from "react-router-dom";
import { History } from "lucide-react";
import { badgeTone } from "@/components/resource/ResourceListPage";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { athensMediumDate } from "@/lib/timezone";

// Compact version-history section. Lists every version in the agreement group,
// newest first, with its operational + signing state. Older versions are never
// hidden or overwritten; staff can open any historical version.
export default function AgreementHistory({ versions, currentId }) {
  const { t, tEnum, lang } = useLanguage();
  if (!versions || versions.length === 0) return null;
  const sorted = [...versions].sort((a, b) => (b.agreement_version || 0) - (a.agreement_version || 0));
  const fmtDate = (iso) => (iso ? athensMediumDate(iso, lang) : "");
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border font-medium text-sm">
        <History className="w-4 h-4 text-muted-foreground" /> {t("Agreement History")}
      </div>
      <div className="divide-y divide-border">
        {sorted.map((v) => {
          const isCurrent = v.id === currentId;
          const sub =
            v.status === "Active" && v.signing_status === "Signed"
              ? t("Activated {date}", { date: fmtDate(v.activated_at) })
              : v.signing_status === "Signed" ? t("Signed {date}", { date: fmtDate(v.signed_at) })
              : v.signing_status === "Declined" ? t("Declined {date}", { date: fmtDate(v.declined_at) })
              : v.signing_status === "Sent" || v.signing_status === "Viewed" ? t("Awaiting signature")
              : t("Draft");
          return (
            <Link key={v.id} to={`/agreements/${v.id}`} className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition ${isCurrent ? "bg-primary/5" : ""}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium">{t("Version {version}", { version: v.agreement_version || 1 })}{isCurrent && <span className="text-xs text-primary"> · {t("viewing")}</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{sub}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {v.signing_status && <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(v.signing_status)}`}>{tEnum(v.signing_status, "agreement")}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeTone(v.status)}`}>{tEnum(v.status, "agreement")}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}