import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, hint, tone = "default", onClick }) {
  const tones = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-rose-500/10 text-rose-600",
    info: "bg-sky-500/10 text-sky-600",
  };
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 flex items-center gap-3 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.99]"
      )}
    >
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", tones[tone])}>
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  );
}