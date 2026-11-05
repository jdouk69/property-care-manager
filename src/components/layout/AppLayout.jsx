import React, { useEffect, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Users, Home, ListChecks, Wrench, HardHat, CircleAlert,
  Wallet, KeyRound, CalendarDays, FileText, Search, Settings as SettingsIcon,
  Menu, X, Bell, History, Receipt, Package, MessageSquare, Truck, Sun, Moon,
  MapPin, FolderOpen, ClipboardList, ScrollText, Euro, ChevronLeft, UserCog,
  Briefcase, Inbox, Globe
} from "lucide-react";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { useAuth } from "@/lib/AuthContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/layout/NotificationBell";
import AccountMenu from "@/components/layout/AccountMenu";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import useNewAssessmentCount from "@/hooks/useNewAssessmentCount";
import useOpenIssueCount from "@/hooks/useOpenIssueCount";

export const NAV_ITEMS = [
  { to: "/assessment-requests", label: "Assessment Requests", icon: Inbox },
  { to: "/automation", label: "Automation Log", icon: History },
  { to: "/billing", label: "Billing", icon: Euro },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/checklist-templates", label: "Checklist Templates", icon: ScrollText },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/communications", label: "Communications", icon: MessageSquare },
  { to: "/contractors", label: "Contractors", icon: HardHat },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/deliveries", label: "Deliveries", icon: Truck },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/keys", label: "Keys", icon: KeyRound },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/open-issues", label: "Open Issues", icon: CircleAlert },
  { to: "/rep-reports", label: "Owner-Rep Reports", icon: ClipboardList },
  { to: "/properties", label: "Properties", icon: Home },
  { to: "/visits", label: "Property Visits", icon: MapPin },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/services", label: "Service Packages", icon: Package },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
];

// Owner/Admin-only navigation entries. Hidden for staff, and also while the
// user role is still loading (no privileged items flash for partial loads).
const ADMIN_ONLY_NAV = new Set(["/services", "/checklist-templates", "/billing", "/invoices", "/automation", "/assessment-requests"]);

const MOBILE_NAV = [
  { key: "home", to: "/dashboard", label: "Home", icon: LayoutDashboard, end: true },
  { key: "tasks", to: "/tasks", label: "Tasks", icon: ListChecks },
  { key: "calendar", to: "/calendar", label: "Calendar", icon: CalendarDays },
  { key: "search", to: "/search", label: "Search", icon: Search },
  { key: "more", to: "__more__", label: "More", icon: Menu },
];

const MOBILE_TAB_STORAGE_KEY = "pcc-mobile-tab-routes-v1";
const MOBILE_TAB_ROOTS = {
  home: "/dashboard",
  tasks: "/tasks",
  calendar: "/calendar",
  search: "/search",
};

function mobileTabForPath(pathname) {
  return Object.entries(MOBILE_TAB_ROOTS).find(([, root]) => pathname === root || pathname.startsWith(`${root}/`))?.[0] || null;
}

function readMobileTabRoutes() {
  const defaults = Object.fromEntries(Object.entries(MOBILE_TAB_ROOTS).map(([key, path]) => [key, { path, scrollY: 0 }]));
  if (typeof window === "undefined") return defaults;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(MOBILE_TAB_STORAGE_KEY) || "{}");
    for (const [key, root] of Object.entries(MOBILE_TAB_ROOTS)) {
      const candidate = stored[key];
      const pathname = typeof candidate?.path === "string" ? candidate.path.split(/[?#]/, 1)[0] : "";
      if (pathname === root || pathname.startsWith(`${root}/`)) {
        defaults[key] = { path: candidate.path, scrollY: Math.max(0, Number(candidate.scrollY) || 0) };
      }
    }
  } catch {}
  return defaults;
}

function SidebarContent({ onNavigate, isAdmin = false, canReadIssues = false, mobile = false }) {
  const { t } = useLanguage();
  const newRequests = useNewAssessmentCount(isAdmin);
  const openIssues = useOpenIssueCount(canReadIssues);
  const itemSizing = mobile
    ? "px-4 py-4 rounded-2xl text-base"
    : "px-3 py-2.5 rounded-xl text-sm";
  const iconSizing = mobile ? "w-5 h-5" : "w-[18px] h-[18px]";
  const itemClass = (isActive) =>
    `flex items-center gap-3 ${itemSizing} font-medium transition-colors ${
      isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;
  return (
    <nav className={`flex flex-col ${mobile ? "gap-2 px-4 py-5" : "gap-1 px-3 py-4"}`}>
      {NAV_ITEMS.filter((item) => isAdmin || !ADMIN_ONLY_NAV.has(item.to)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) => itemClass(isActive)}
        >
          <item.icon className={`${iconSizing} shrink-0`} />
          {t(item.label)}
          {item.to === "/assessment-requests" && newRequests > 0 && (
            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
              {newRequests}
            </span>
          )}
          {item.to === "/open-issues" && openIssues > 0 && (
            <span aria-label={`${openIssues} open issues`} title={`${openIssues} open issues`} className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
              {openIssues}
            </span>
          )}
        </NavLink>
      ))}
      {isAdmin && (
        <>
          <div className="px-3 pt-4 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">{t("Admin")}</div>
          <NavLink
            to="/business-billing"
            onClick={onNavigate}
            className={({ isActive }) => itemClass(isActive)}
          >
            <Briefcase className={`${iconSizing} shrink-0`} />
            {t("Business & Billing")}
          </NavLink>
          <NavLink
            to="/website-editor"
            onClick={onNavigate}
            className={({ isActive }) => itemClass(isActive)}
          >
            <Globe className={`${iconSizing} shrink-0`} />
            {t("Edit Website")}
          </NavLink>
          <NavLink
            to="/admin/users"
            onClick={onNavigate}
            className={({ isActive }) => itemClass(isActive)}
          >
            <UserCog className={`${iconSizing} shrink-0`} />
            {t("Users & Staff")}
          </NavLink>
        </>
      )}
      <div className="px-3 pt-4 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">{t("System")}</div>
      <NavLink to="/search" onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
        <Search className={iconSizing} /> {t("Search")}
      </NavLink>
      {isAdmin && (
        <NavLink to="/settings" onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
          <SettingsIcon className={iconSizing} /> {t("Settings")}
        </NavLink>
      )}
    </nav>
  );
}

export default function AppLayout({ businessName = "Property Care Manager", children, defaultCollapsed = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileTabRoutes, setMobileTabRoutes] = useState(readMobileTabRoutes);
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";
  const canReadIssues = isAdmin || user?.role === "staff";
  // Session-level sidebar collapse (lg+ only — below lg the sidebar never shows
  // and mobile sheet navigation is untouched).
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = () => setCollapsed((c) => !c);
  const currentTab = mobileTabForPath(location.pathname);
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  const saveTabRoute = (key, path, scrollY) => {
    if (!key || !MOBILE_TAB_ROOTS[key]) return;
    const next = { ...mobileTabRoutes, [key]: { path, scrollY: Math.max(0, Number(scrollY) || 0) } };
    setMobileTabRoutes(next);
    try { window.sessionStorage.setItem(MOBILE_TAB_STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  useEffect(() => {
    if (!currentTab) return;
    const restoredY = location.state?.mobileTabRestore?.scrollY;
    const next = {
      ...readMobileTabRoutes(),
      [currentTab]: { path: currentPath, scrollY: Math.max(0, Number(restoredY) || 0) },
    };
    setMobileTabRoutes(next);
    try { window.sessionStorage.setItem(MOBILE_TAB_STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, [currentTab, currentPath, location.key]);

  const openMore = () => {
    if (currentTab) saveTabRoute(currentTab, currentPath, window.scrollY);
    setMobileOpen(true);
  };

  const openMobileTab = (event, item) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const resetSelectedTab = currentTab === item.key;
    if (currentTab) {
      saveTabRoute(currentTab, resetSelectedTab ? item.to : currentPath, resetSelectedTab ? 0 : window.scrollY);
    }
    const target = currentTab === item.key
      ? { path: item.to, scrollY: 0 }
      : mobileTabRoutes[item.key] || { path: item.to, scrollY: 0 };
    navigate(target.path, {
      replace: resetSelectedTab,
      state: { mobileTabRestore: { scrollY: target.scrollY, tab: item.key } },
    });
  };
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
          <Link to="/dashboard" className="flex items-center gap-2.5 flex-1 min-w-0 px-5">
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
          <SidebarContent isAdmin={isAdmin} canReadIssues={canReadIssues} />
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] px-4 bg-background/80 backdrop-blur-md border-b border-border">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] flex flex-col">
            <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Home className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">{businessName}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <SidebarContent mobile isAdmin={isAdmin} canReadIssues={canReadIssues} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-sidebar-border p-4">
              <AccountMenu variant="block" />
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/dashboard" className="flex items-center gap-2">
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
      <main className={`min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] transition-[padding] duration-300 ease-in-out lg:pb-0 ${collapsed ? "lg:pl-0" : "lg:pl-64"}`}>
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
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-background/90 backdrop-blur-md border-t border-border">
        {MOBILE_NAV.map((item) =>
          item.to === "__more__" ? (
            <button
              key={item.to}
              onClick={openMore}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] md:text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <item.icon className="w-5 h-5 md:w-6 md:h-6" />
              {t(item.label)}
            </button>
          ) : (
            <NavLink
              key={item.to}
              to={mobileTabRoutes[item.key]?.path || item.to}
              end={item.end}
              onClick={(event) => openMobileTab(event, item)}
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
