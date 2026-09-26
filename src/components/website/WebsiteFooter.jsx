import React from "react";
import { House, LockKeyhole } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LOGIN_URL } from "@/components/website/WebsiteHeader";

export default function WebsiteFooter() {
  const { lang } = useLanguage();
  const el = lang === "el";

  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <House className="w-4 h-4" />
            </span>
            <div>
              <p className="font-heading font-bold text-foreground">Property Care Crete</p>
              <p className="text-xs text-muted-foreground">
                {el ? "Φροντίδα ακινήτων · Χανιά, Δυτική Κρήτη" : "Property care · Chania, Western Crete"}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a href="#services" className="hover:text-foreground">{el ? "Υπηρεσίες & Τιμές" : "Services & Pricing"}</a>
            <a href="#how-it-works" className="hover:text-foreground">{el ? "Πώς Λειτουργεί" : "How It Works"}</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <a href="#assessment" className="hover:text-foreground">{el ? "Αξιολόγηση" : "Assessment"}</a>
            <a href={LOGIN_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
              <LockKeyhole className="w-3.5 h-3.5" />
              {el ? "Σύνδεση" : "Login"}
            </a>
          </nav>
        </div>
        <div className="mt-6 border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Property Care Crete. {el ? "Με επιφύλαξη κάθε δικαιώματος." : "All rights reserved."}</p>
          <p>{el ? "Οι τιμές συγχρονίζονται ζωντανά από τα αρχεία υπηρεσιών μας." : "Prices are synchronized live from our service records."}</p>
        </div>
      </div>
    </footer>
  );
}