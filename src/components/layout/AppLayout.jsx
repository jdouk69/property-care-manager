import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Users, Home, ListChecks, ClipboardCheck, Wrench, HardHat,
  Wallet, KeyRound, CalendarDays, FileText, Search, Settings as SettingsIcon,
  Menu, X, Bell, Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ThemeToggle from "@/components/ui/ThemeToggle";

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/properties", label: "Properties", icon: Home },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/inspections", label: "Inspections", icon: ClipboardCheck },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/contractors", label: "Contractors", icon: HardHat },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/keys", label: "Keys", icon: KeyRound },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/reports", label: "Reports", icon: FileText },
];

const MOBILE_NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/search", label: "Search", icon: Search },
  { to: "/settings", label: "More", icon: Menu },
];

function SidebarContent({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => (
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
          {item.label}
        </NavLink>
      ))}
      <div className="px-3 pt-4 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">System</div>
      <NavLink to="/search" onClick={onNavigate} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-sidebar-accent"}`}>
        <Search className="w-[18px] h-[18px]" /> Search
      </NavLink>
      <NavLink to="/settings" onClick={onNavigate} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-sidebar-accent"}`}>
        <SettingsIcon className="w-[18px] h-[18px]" /> Settings
      </NavLink>
    </nav>
  );
}

export default function AppLayout({ businessName = "Property Care Manager", children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <Link to="/" className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Home className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm leading-tight">{businessName}</span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-background/80 backdrop-blur-md border-b border-border">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Home className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">{businessName}</span>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Home className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Property Care</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="lg:pl-64 min-h-screen">
        <div className="hidden lg:flex items-center justify-end h-14 px-6 border-b border-border">
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
        <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch justify-around h-16 bg-background/90 backdrop-blur-md border-t border-border">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}