import React from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Account control for authenticated admin/staff users. Reuses the existing
// AuthContext logout(); shows no administrative functionality.
const ROLE_LABELS = { admin: "Owner/Admin", staff: "Staff" };

function initials(name, email) {
  const src = (name || email || "").trim();
  return src ? src.slice(0, 1).toUpperCase() : "?";
}

export default function AccountMenu({ variant = "dropdown" }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const name = user?.full_name || user?.email || t("Signed In");
  const email = user?.email;
  const rawRoleLabel = ROLE_LABELS[user?.role] ||
    (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "");
  const roleLabel = rawRoleLabel ? t(rawRoleLabel) : "";

  if (variant === "block") {
    // Flat account row used in the mobile "More" sheet.
    return (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
          {initials(name, email)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          {roleLabel && <div className="text-xs text-muted-foreground">{roleLabel}</div>}
        </div>
        <Button variant="outline" size="sm" onClick={() => logout()} className="gap-1.5 shrink-0">
          <LogOut className="w-3.5 h-3.5" /> {t("Sign Out")}
        </Button>
      </div>
    );
  }

  // Dropdown used in the desktop top bar.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("Account")}
          className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-accent text-foreground transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
            {initials(name, email)}
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium truncate">{name}</div>
          {email && email !== name && <div className="text-xs text-muted-foreground truncate">{email}</div>}
          {roleLabel && <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-primary">{roleLabel}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> {t("Sign Out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}