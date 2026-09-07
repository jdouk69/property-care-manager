import React, { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Users, Home, ListChecks, Wrench, HardHat,
  Wallet, KeyRound, CalendarDays, FileText, Search, Settings as SettingsIcon,
  Menu, X, Bell, History, Receipt, Package, MessageSquare, Truck, Sun, Moon,
  MapPin, FolderOpen, ClipboardList, ScrollText, Euro, ChevronLeft, UserCog,
  Briefcase
} from "lucide-react";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/layout/NotificationBell";
import AccountMenu from "@/components/layout/AccountMenu";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/properties", label: "Properties", icon: Home },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/visits", label: "Property Visits", icon: MapPin },
  { to: "/checklist-templates", label: "Checklist Templates", icon: ScrollText },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/contractors", label: "Contractors", icon: HardHat },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/keys", label: "Keys", icon: KeyRound },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/billing", label: "Billing", icon: Euro },
  { to: "/services", label: "Service Packages", icon: Package },
  { to: "/communications", label: "Communications", icon: MessageSquare },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/rep-reports", label: "Owner-Rep Reports", icon: ClipboardList },
  { to: "/deliveries", label: "Deliveries", icon: Truck },
  { to: "/automation", label: "Automation Log", icon: History },
];

// Owner/Admin-only navigation entries. Hidden for staff, and also while the
// user role is still loading (no privileged items flash for partial loads).
const ADMIN_ONLY_NAV = new Set(["/services", "/checklist-templates", "/billing", "/invoices", "/automation"]);

const MOBILE_NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/search", label: "Search", icon: Search },
  { to: "__more__", label: "More", icon: Menu },
];

function SidebarContent({ onNavigate, isAdmin = false }) {
  const { t } = useLanguage();
  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.filter((item) => isAdmin || !ADMIN_ONLY_NAV.has(item.to)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`
          }
        >
          <item.icon className="w-[18px] h-[18px] shrink-0" />
          {t(item.label)}
        </NavLink>
      ))}
      {isAdmin && (
        <>
          <div className="px-3 pt-4 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">{t("Admin")}</div>
          <NavLink
            to="/admin/users"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`
            }
          >
            <UserCog className="w-[18px] h-[18px] shrink-0" />
            {t("Users & Staff")}
          </NavLink>
          <NavLink
            to="/business-billing"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`
            }
          >
            <Briefcase className="w-[18px] h-[18px] shrink-0" />
            {t("Business & Billing")}
          </NavLink>
        </>
      )}
      <div className="px-3 pt-4 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">{t("System")}</div>
      <NavLink to="/search" onClick={onNavigate} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-sidebar-accent"}`}>
        <Search className="w-[18px] h-[18px]" /> {t("Search")}
      </NavLink>
      {isAdmin && (
        <NavLink to="/settings" onClick={onNavigate} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-sidebar-accent"}`}>
          <SettingsIcon className="w-[18px] h-[18px]" /> {t("Settings")}
        </NavLink>
      )}
    </nav>
  );
}

export default function AppLayout({ businessName = "Property Care Manager", children, defaultCollapsed = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";
  // Session-level sidebar collapse (lg+ only — below lg the sidebar never shows
  // and mobile sheet navigation is untouched).
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = () => setCollapsed((c) => !c);
  // Reset the collapse only when the page context changes (e.g. entering or
  // leaving an active visit). While the context stays the same, manual
  // toggles by the staff member persist.
  useEffect(() => { setCollapsed(!!defaultCollapsed); }, [defaultCollapsed]);

  return (
    <SidebarProvider value={{ collapsed, toggleCollapsed }}>
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out ${collapsed ? "-translate-x-full" : ""}`}>
        <div className="flex items-center h-16 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5 flex-1 min-w-0 px-5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Home className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm leading-tight truncate">{businessName}</span>
          </Link>
          <button type="button" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" title="Collapse sidebar"
            className="w-8 h-8 mr-3 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent isAdmin={isAdmin} />
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-background/80 backdrop-blur-md border-b border-border">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Home className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">{businessName}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-sidebar-border p-4">
              <AccountMenu variant="block" />
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Home className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Property Care</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* Compact restore control while the sidebar is collapsed (lg+ only) */}
      {collapsed && (
        <button type="button" onClick={() => setCollapsed(false)} aria-label="Open sidebar" title="Open sidebar"
          className="hidden lg:flex fixed top-2 left-2 z-30 w-9 h-9 items-center justify-center rounded-lg border border-border bg-background/90 backdrop-blur text-muted-foreground hover:text-foreground hover:bg-muted transition">
          <Menu className="w-4 h-4" />
        </button>
      )}
      {/* Main */}
      <main className={`min-h-screen transition-[padding] duration-300 ease-in-out ${collapsed ? "lg:pl-0" : "lg:pl-64"}`}>
        <div className="hidden lg:flex items-center justify-end h-14 px-6 border-b border-border">
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <LanguageToggle />
            <AccountMenu />
          </div>
        </div>
        <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around h-16 bg-background/90 backdrop-blur-md border-t border-border">
        {MOBILE_NAV.map((item) =>
          item.to === "__more__" ? (
            <button
              key={item.to}
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] md:text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <item.icon className="w-5 h-5 md:w-6 md:h-6" />
              {t(item.label)}
            </button>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] md:text-xs font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="w-5 h-5 md:w-6 md:h-6" />
              {t(item.label)}
            </NavLink>
          )
        )}
      </nav>
    </div>
    </SidebarProvider>
  );
}