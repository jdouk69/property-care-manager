import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function HowItWorks() {
  const { lang } = useLanguage();
  const el = lang === "el";

  const steps = [
    el ? "Ζητάτε αξιολόγηση ακινήτου και μας λέτε λίγα λόγια για το σπίτι σας." : "You request a property assessment and tell us a little about your home.",
    el ? "Επιθεωρούμε το ακίνητο και συμφωνούμε το πλάνο φροντίδας και την τιμή μαζί σας." : "We assess the property and agree the care plan and price with you.",
    el ? "Εκτελούμε προγραμματισμένες επισκέψεις με λεπτομερή λίστα ελέγχου για κάθε τύπο επίσκεψης." : "We carry out scheduled visits, using a detailed checklist for each visit type.",
    el ? "Λαμβάνετε φωτογραφίες και αναφορά επίσκεψης μετά από κάθε επίσκεψη (πακέτα Φροντίδας και Πλήρους Φροντίδας)." : "You receive photos and a visit report after each visit (Property Care and Complete Care plans).",
    el ? "Εάν κάτι χρειάζεται προσοχή, σας ενημερώνουμε και προχωράμε μόνο με την έγκρισή σας." : "If anything needs attention, we let you know and proceed only with your approval.",
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-secondary/40 py-10 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {el ? "Πώς λειτουργεί" : "How it works"}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {el ? "Απλά βήματα, πλήρης διαφάνεια." : "Simple steps, full transparency."}
          </h2>
        </div>
        <ol className="mt-6 sm:mt-10 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{s}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}