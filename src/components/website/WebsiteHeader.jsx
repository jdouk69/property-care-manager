import React, { useState } from "react";
import { Menu, X, LockKeyhole, House } from "lucide-react";
import LanguageToggle from "@/components/ui/LanguageToggle";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

// Staff login — same-app relative path, so it always opens the sign-in screen
// on whichever address the visitor is on (https://propertycarecrete.com/login
// on the live site). Never hardcode a hostname here.
export const LOGIN_URL = "/login";

export default function WebsiteHeader() {
  const { lang } = useLanguage();
  const el = lang === "el";
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#services", label: el ? "Υπηρεσίες & Τιμές" : "Services & Pricing" },
    { href: "#how-it-works", label: el ? "Πώς Λειτουργεί" : "How It Works" },
    { href: "#role", label: el ? "Ο Ρόλος μας" : "Our Role" },
    { href: "#faq", label: "FAQ" },
    { href: "/about", label: el ? "Σχετικά" : "About" },
    { href: "/contact", label: el ? "Επικοινωνία" : "Contact" },
  ];

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-2 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
              <House className="w-5 h-5" />
            </span>
            <span className="font-heading font-bold text-foreground truncate">
              Property Care Crete
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-muted-foreground">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            <Button asChild size="sm" className="hidden md:inline-flex rounded-full">
              <a href="#assessment">
                <span className="hidden lg:inline">{el ? "Ζητήστε Αξιολόγηση Ακινήτου" : "Request a Property Assessment"}</span>
                <span className="lg:hidden">{el ? "Ζητήστε Αξιολόγηση" : "Request Assessment"}</span>
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex rounded-full">
              <a href={LOGIN_URL} target="_blank" rel="noopener noreferrer">
                <LockKeyhole className="w-3.5 h-3.5" />
                {el ? "Είσοδος Προσωπικού" : "Staff Login"}
              </a>
            </Button>
            <button
              type="button"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-accent"
              aria-label={el ? "Μενού" : "Menu"}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={close}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#assessment"
              onClick={close}
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-accent"
            >
              {el ? "Ζητήστε Αξιολόγηση Ακινήτου" : "Request a Property Assessment"}
            </a>
            <a
              href={LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              <LockKeyhole className="w-4 h-4" />
              {el ? "Είσοδος Προσωπικού" : "Staff Login"}
            </a>
          </div>
        )}
      </div>
    </header>
  );
}