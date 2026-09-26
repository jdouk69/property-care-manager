import React from "react";
import { Check, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function RoleAndLimits() {
  const { lang } = useLanguage();
  const el = lang === "el";

  const doItems = el
    ? [
        "Κάνουμε οπτικές επισκέψεις φροντίδας και καταγράφουμε τις παρατηρήσεις μας.",
        "Σας ενημερώνουμε για οτιδήποτε ορατό χρειάζεται προσοχή.",
        "Εκτελούμε συμφωνημένες εργασίες: αερισμός, προμήθεια ειδών, παραλαβές με εντολή.",
        "Επικοινωνούμε με τεχνικούς ή εργολάβους μόνο με τη δική σας έγκριση.",
      ]
    : [
        "We perform visual property-care visits and record what we observe.",
        "We alert you to anything visibly needing attention.",
        "We carry out agreed tasks: airing, stocking, receiving deliveries on instruction.",
        "We contact tradespeople or contractors only with your approval.",
      ];

  const dontItems = el
    ? [
        "Δεν είμαστε επιθεωρητές κτιρίων ή μηχανικοί.",
        "Δεν παρέχουμε μηχανική αξιολόγηση, έλεγχο ειδικότητας ή πιστοποίηση.",
        "Δεν επιβλέπουμε ή διαχειριζόμαστε κατασκευαστικά έργα.",
        "Δεν εγκρίνουμε δαπάνες εκτός από τις περιπτώσεις που έχετε εξουσιοδοτήσει γραπτώς.",
      ]
    : [
        "We are not building surveyors or engineers.",
        "We do not provide engineering evaluations, trade inspections, or certification.",
        "We do not supervise or manage construction projects.",
        "We do not approve spending beyond what you have authorized in writing.",
      ];

  return (
    <section id="role" className="scroll-mt-20 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {el ? "Ο ρόλος μας και τα όριά μας" : "Our role and limits"}
          </p>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-bold text-foreground">
            {el ? "Τι είμαστε — και τι δεν είμαστε." : "What we are — and what we are not."}
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground">{el ? "Τι κάνουμε" : "What we do"}</h3>
            <ul className="mt-4 space-y-2.5">
              {doItems.map((x) => (
                <li key={x} className="flex items-start gap-2 text-sm text-foreground/90">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground">{el ? "Τι δεν κάνουμε" : "What we do not do"}</h3>
            <ul className="mt-4 space-y-2.5">
              {dontItems.map((x) => (
                <li key={x} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 rounded-2xl border border-border bg-secondary/50 p-5 text-sm leading-relaxed text-muted-foreground">
          {el
            ? "Οι αναφορές μας τεκμηριώνουν οπτικές παρατηρήσεις που έγιναν κατά την επίσκεψη φροντίδας ακινήτου. Δεν αποτελούν επαγγελματική επιθεώρηση κτιρίου, μηχανική αξιολόγηση, έλεγχο ειδικότητας ή πιστοποίηση."
            : "Our reports document visual observations made during a property care visit. They are not a professional home or building inspection, engineering evaluation, trade inspection, or certification."}
        </p>
      </div>
    </section>
  );
}