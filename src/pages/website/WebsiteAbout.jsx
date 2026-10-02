import React from "react";
import { Button } from "@/components/ui/button";
import WebsiteHashLink from "@/components/website/WebsiteHashLink";
import WebsiteHeader from "@/components/website/WebsiteHeader";
import WebsiteFooter from "@/components/website/WebsiteFooter";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import usePageMeta from "@/lib/seo";

// Public About page — static, bilingual copy describing the service,
// who it is for, and who owns/operates it.
export default function WebsiteAbout() {
  const { lang } = useLanguage();
  const el = lang === "el";
  usePageMeta({
    title: "About | Property Care Crete",
    description:
      "Property Care Crete is a locally owned property care and home watch service in Chania, Western Crete — scheduled visits, arrival preparation and local support for owners who are away.",
  });

  return (
    <div className="website-theme min-h-screen bg-background">
      <WebsiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {el ? "Ποιοι είμαστε" : "Who we are"}
        </p>
        <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold text-foreground">
          {el ? "Σχετικά με το Property Care Crete" : "About Property Care Crete"}
        </h1>

        <div className="mt-8 space-y-5 text-muted-foreground leading-relaxed">
          <p>
            {el
              ? "Το Property Care Crete είναι μια τοπική επιχείρηση φροντίδας και επιτήρησης κατοικιών με έδρα τα Χανιά, στη Δυτική Κρήτη. Φροντίζουμε σπίτια όσο οι ιδιοκτήτες τους λείπουν — με προγραμματισμένες επισκέψεις επιτήρησης, προετοιμασία άφιξης ιδιοκτητών και επισκεπτών, φύλαξη κλειδιών, παραλαβή και τοποθέτηση παντοπωλείου, καθώς και συντονισμό εγκεκριμένων επαγγελματιών όταν κάτι χρειάζεται προσοχή, τεκμηριώνοντας πάντα όσα παρατηρούμε. Κάθε προγραμματισμένη επίσκεψη γίνεται με αναλυτική λίστα ελέγχου και καταγράφεται σε αναφορά επίσκεψης — το σύνηθες φωτογραφικό υλικό και η αναφορά πελάτη περιλαμβάνονται στις υπηρεσίες Property Care και Complete Care, όχι στο σύντομο Quick Check — ώστε να γνωρίζετε πάντα ακριβώς σε τι κατάσταση βρίσκεται το ακίνητό σας."
              : "Property Care Crete is a locally owned property care and home watch service based in Chania, Western Crete. We look after homes while their owners are away — with scheduled home watch visits, owner and guest arrival preparation, key holding, grocery stocking, and coordination of approved professionals when something needs attention, always documenting what we observe rather than supervising construction. Every scheduled visit is carried out against a detailed checklist and recorded in a visit report — routine photos and the customer-facing report are included with our Property Care and Complete Care services, not with the brief Quick Check — so you always know exactly what condition your property is in."}
          </p>
          <p>
            {el
              ? "Η υπηρεσία μας απευθύνεται σε ιδιοκτήτες βιλών, διαμερισμάτων και εξοχικών κατοικιών που περνούν μεγάλα διαστήματα του χρόνου στο εξωτερικό. Είτε επισκέπτεστε την Κρήτη λίγες φορές τον χρόνο, είτε νοικιάζετε το σπίτι σας σε ταξιδιώτες, είτε απλώς θέλετε κάποιον έμπιστο να το ελέγχει ανά τακτά διαστήματα, εμείς είμαστε η τοπική σας παρουσία — αυτός που ανοίγει την πόρτα σας, εντοπίζει την υγρασία πριν γίνει διαρροή και κρατά τα μικρά προβλήματα μικρά."
              : "Our service is designed for owners of villas, apartments, and holiday homes who spend much of the year abroad. Whether you visit Crete a few times a year, rent your home to guests, or simply want someone trustworthy to check on it between visits, we act as your local presence — the person who walks through your door, notices the damp patch before it becomes a leak, and keeps small problems small."}
          </p>
          <p>
            {el
              ? "Η επιχείρηση ανήκει και λειτουργεί από μια μικρή τοπική ομάδα στα Χανιά. Η πλατφόρμα αυτή — ο ίδιος ο ιστότοπος που διαβάζετε και το λειτουργικό σύστημα που χρησιμοποιεί το προσωπικό μας επί τόπου — έχει κατασκευαστεί και συντηρείται από την ίδια ομάδα, ώστε όσα βλέπετε εδώ να αντικατοπτρίζουν τον τρόπο που δουλεύουμε στην πράξη."
              : "The business is owned and operated by a small local team in Chania. This platform — the very website you are reading and the operational system our staff use on site — was built and is maintained by that same team, so everything you see here reflects the way we actually work."}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full">
            <WebsiteHashLink href="#assessment">
              {el ? "Ζητήστε Αξιολόγηση Ακινήτου" : "Request a Property Assessment"}
            </WebsiteHashLink>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <WebsiteHashLink href="#services">
              {el ? "Δείτε τις Υπηρεσίες & Τιμές" : "See Services & Pricing"}
            </WebsiteHashLink>
          </Button>
        </div>
      </main>
      <WebsiteFooter />
    </div>
  );
}