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
        ? "Κάθε προγραμματισμένη επίσκεψη καταγράφεται εσωτερικά με ημερομηνία, ώρα, λίστα ελέγχου και παρατηρήσεις."
        : "Every scheduled visit is recorded internally with date, time, checklist, and observations.",
    },
    {
      icon: Camera,
      title: el ? "Φωτογραφίες & αναφορές" : "Photos & reports",
      text: el
        ? "Οι τακτικές φωτογραφίες και η αναφορά προς τον ιδιοκτήτη περιλαμβάνονται μόνο στα πακέτα Φροντίδας και Πλήρους Φροντίδας — όχι στον Γρήγορο Έλεγχο."
        : "Routine photos and a customer-facing visit report are included only with Property Care and Complete Care — not with Quick Check.",
    },
    {
      icon: BadgeEuro,
      title: el ? "Ξεκάθαρες τιμές, συμφωνημένη εργασία" : "Clear prices, agreed work",
      text: el
        ? "Βλέπετε τις τρέχουσες τιμές μας εκ των προτέρων και συμφωνούμε την εργασία και την τιμή γραπτώς πριν ξεκινήσουμε."
        : "You see our current prices up front, and we agree the work and the price with you in writing before we start.",
    },
    {
      icon: UserCheck,
      title: el ? "Ένας τοπικός επαφής" : "One local point of contact",
      text: el
        ? "Γνωρίζετε εξ ονόματος τον τοπικό σας επαφή — και κάθε επίσκεψη καταγράφει ποιος παρευρέθηκε στο ακίνητο."
        : "You know your local point of contact by name — and every visit record shows who attended.",
    },
    {
      icon: KeySquare,
      title: el ? "Ασφαλής διαχείριση κλειδιών" : "Careful key handling",
      text: el
        ? "Τα κλειδιά και τα στοιχεία πρόσβασης φυλάσσονται στα προστατευμένα αρχεία μας και χρησιμοποιούνται μόνο για επισκέψεις που έχετε συμφωνήσει."
        : "Keys and access details are kept in our protected records and used only for visits you have agreed to.",
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
    <section id="trust" className="scroll-mt-20 border-y border-border bg-secondary/40 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {el ? "Πώς κερδίζουμε την εμπιστοσύνη σας" : "How we earn your trust"}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {el ? "Τεκμηρίωση, όχι υποσχέσεις." : "Documentation, not promises."}
          </h2>
        </div>
        <div className="mt-6 sm:mt-10 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div key={i.title} className="flex gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
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