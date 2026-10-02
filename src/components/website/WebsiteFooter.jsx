import React from "react";
import { Link } from "react-router-dom";
import { House, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LOGIN_URL } from "@/components/website/WebsiteHeader";
import WebsiteHashLink from "@/components/website/WebsiteHashLink";
import ArchMotif from "@/components/website/ArchMotif";

export default function WebsiteFooter() {
  const { lang } = useLanguage();
  const el = lang === "el";

  return (
    <footer className="website-navy border-t border-white/10 py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center text-center">
          <ArchMotif className="w-32 text-primary" />
          <Button
            asChild
            size="lg"
            className="mt-6 w-full max-w-md rounded-lg h-12 px-7 sm:w-auto"
          >
            <WebsiteHashLink href="#assessment">
              {el ? "Ζητήστε Αξιολόγηση Ακινήτου" : "Request a Property Assessment"}
            </WebsiteHashLink>
          </Button>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <House className="w-4 h-4" />
            </span>
            <div>
              <p className="font-heading font-bold text-white">Property Care Crete</p>
              <p className="text-xs text-white/60">
                {el ? "Φροντίδα ακινήτων · Χανιά, Δυτική Κρήτη" : "Property care · Chania, Western Crete"}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/70">
            <WebsiteHashLink href="#services" className="hover:text-white">{el ? "Υπηρεσίες & Τιμές" : "Services & Pricing"}</WebsiteHashLink>
            <WebsiteHashLink href="#how-it-works" className="hover:text-white">{el ? "Πώς Λειτουργεί" : "How It Works"}</WebsiteHashLink>
            <WebsiteHashLink href="#faq" className="hover:text-white">FAQ</WebsiteHashLink>
            <WebsiteHashLink href="#assessment" className="hover:text-white">{el ? "Αξιολόγηση" : "Assessment"}</WebsiteHashLink>
            <Link to="/about" className="hover:text-white">{el ? "Σχετικά" : "About"}</Link>
            <Link to="/contact" className="hover:text-white">{el ? "Επικοινωνία" : "Contact"}</Link>
            <a href={LOGIN_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white">
              <LockKeyhole className="w-3.5 h-3.5" />
              {el ? "Σύνδεση" : "Login"}
            </a>
          </nav>
        </div>
        <div className="mt-6 border-t border-white/10 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Property Care Crete. {el ? "Με επιφύλαξη κάθε δικαιώματος." : "All rights reserved."}</p>
          <p>{el ? "Όλες οι τιμές και οι εργασίες συμφωνούνται γραπτώς μαζί σας πριν ξεκινήσουμε." : "All prices and work are agreed with you in writing before we start."}</p>
        </div>
      </div>
    </footer>
  );
}