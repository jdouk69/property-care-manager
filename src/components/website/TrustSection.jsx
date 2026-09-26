import React from "react";
import { FileCheck, Camera, BadgeEuro, UserCheck, ShieldCheck, KeySquare } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function TrustSection() {
  const { lang } = useLanguage();
  const el = lang === "el";

  const items = [
    {
      icon: FileCheck,
      title: el ? "Καταγεγραμμένες επισκέψεις" : "Documented visits",
      text: el
        ? "Κάθε επίσκεψη καταγράφεται με ημερομηνία, ώρα, λίστα ελέγχου και παρατηρήσεις."
        : "Every visit is recorded with date, time, checklist, and observations.",
    },
    {
      icon: Camera,
      title: el ? "Φωτογραφίες & αναφορές" : "Photos & reports",
      text: el
        ? "Τα πακέτα Φροντίδας και Πλήρους Φροντίδας περιλαμβάνουν φωτογραφίες και αναφορά μετά από κάθε επίσκεψη."
        : "Property Care and Complete Care plans include photos and a report after every visit.",
    },
    {
      icon: BadgeEuro,
      title: el ? "Διαφανείς σταθερές τιμές" : "Transparent fixed prices",
      text: el
        ? "Οι τιμές αυτής της σελίδας συγχρονίζονται απευθείας από τα αρχεία υπηρεσιών μας — όχι παλιοί αριθμοί."
        : "The prices on this page are synchronized live from our service records — never stale numbers.",
    },
    {
      icon: UserCheck,
      title: el ? "Ένας τοπικός επαφής" : "One local point of contact",
      text: el
        ? "Γνωρίζετε ποιος μπαίνει στο σπίτι σας — πάντα ο ίδιος αξιόπιστος τοπικός επαγγελματίας."
        : "You know who enters your home — always the same trusted local professional.",
    },
    {
      icon: KeySquare,
      title: el ? "Ασφαλής διαχείριση κλειδιών" : "Careful key handling",
      text: el
        ? "Τα κλειδιά και οι κωδικοί πρόσβασης φυλάσσονται με ασφάλεια και καταγράφονται σε κάθε χρήση."
        : "Keys and access codes are stored securely, and every use is logged.",
    },
    {
      icon: ShieldCheck,
      title: el ? "Σαφή όρια ρόλου" : "Clear role limits",
      text: el
        ? "Λέμε καθαρά τι κάνουμε και τι δεν κάνουμε — χωρίς υπερβολές ή ασαφείς υποσχέσεις."
        : "We state plainly what we do and what we do not do — no exaggeration, no vague promises.",
    },
  ];

  return (
    <section id="trust" className="scroll-mt-20 border-y border-border bg-secondary/40 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {el ? "Πώς κερδίζουμε την εμπιστοσύνη σας" : "How we earn your trust"}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {el ? "Τεκμηρίωση, όχι υποσχέσεις." : "Documentation, not promises."}
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div key={i.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
              <i.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground text-sm">{i.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{i.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}