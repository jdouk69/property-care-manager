import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function ActionCard({ to, label, icon: Icon, color, className, badge }) {
  return (
    <Link to={to} className={cn("block", className)}>
      <div className="relative flex items-center gap-2.5 h-14 rounded-xl border border-border bg-card px-3 hover:shadow-md hover:border-primary/30 transition">
        <span className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0", color)}>
          <Icon className="w-5 h-5" />
        </span>
        <span className="text-sm font-medium leading-tight truncate">{label}</span>
        {!!badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center ring-2 ring-card">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
    </Link>
  );
}