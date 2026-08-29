import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Sensible parent fallback per route, used when there is no navigation history.
function defaultFallback(pathname) {
  if (pathname.startsWith("/clients/")) return "/clients";
  if (pathname.startsWith("/properties/")) return "/properties";
  if (pathname.startsWith("/visits/")) return "/visits";
  if (pathname.startsWith("/agreements/")) return "/clients";
  return "/";
}

// Shared, history-aware Back control.
// Primary: navigate(-1) when usable history exists.
// Fallback: the explicit `fallback` prop, or a sensible default derived from the route.
export default function PageBackButton({ fallback, label = "Back", className }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const onClick = () => {
    const st = window.history.state;
    const hasHistory = st && typeof st.idx === "number" && st.idx > 0;
    if (hasHistory) navigate(-1);
    else navigate(fallback || defaultFallback(pathname));
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg px-2.5 py-1.5 -ml-1 transition-colors min-h-[36px] touch-manipulation",
        className
      )}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" /> {label}
    </button>
  );
}